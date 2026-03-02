import React, { useState, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import * as Icons from '../components/shared/Icons';
import Spinner from '../components/shared/Spinner';
import { useToast } from '../context/ToastContext';
import Tooltip from '../components/shared/Tooltip';

// Interface for each localization row
interface LocalizationItem {
    key: string;
    original: string;
    issue: '缺失' | '空值' | '翻译不准' | '语法错误' | '风格不符' | '无';
    suggestion: string;
    currentTranslation: string;
    status: 'pending' | 'loading' | 'done' | 'adopted' | 'ignored';
}

// Initial mock data
const initialData: LocalizationItem[] = [
    { key: 'quest_reward_description', original: 'Complete the quest to receive a special reward.', issue: '缺失', suggestion: '', currentTranslation: '—', status: 'pending' },
    { key: 'app_purchase_info', original: 'Optional in-game purchases are available.', issue: '空值', suggestion: '', currentTranslation: '**', status: 'pending' },
    { key: 'settings_sound_fx', original: 'Sound Effects', issue: '翻译不准', suggestion: '', currentTranslation: '*声音的效果*', status: 'pending' },
    { key: 'npc_dialogue_greeting', original: 'Hello traveler. What brings you here?', issue: '语法错误', suggestion: '', currentTranslation: '*你好旅行者。你来这里做什么？*', status: 'pending' },
    { key: 'button_exit_game', original: 'Exit Game', issue: '风格不符', suggestion: '', currentTranslation: '*终止应用程序进程*', status: 'pending' },
    { key: 'legal_privacy_policy_short', original: 'Information about how we collect and use your personal information.', issue: '无', suggestion: '无修改', currentTranslation: '关于我们如何收集和使用您的个人信息', status: 'ignored' },
];

const getIssueClass = (issue: string) => {
    switch (issue) {
        case '缺失': return 'bg-red-100 text-red-700';
        case '空值': return 'bg-yellow-100 text-yellow-700';
        case '翻译不准': return 'bg-orange-100 text-orange-700';
        case '语法错误': return 'bg-purple-100 text-purple-700';
        case '风格不符': return 'bg-blue-100 text-blue-700';
        default: return 'bg-gray-100 text-gray-700';
    }
};

const LocalizationTool: React.FC = () => {
    const [items, setItems] = useState<LocalizationItem[]>(initialData);
    const [isChecking, setIsChecking] = useState(false);
    const { showToast } = useToast();

    const handleRunAICheck = async () => {
        if (!process.env.API_KEY) {
            showToast("API_KEY 环境变量未设置", 'error');
            console.error("API_KEY environment variable is not set.");
            return;
        }
        setIsChecking(true);
        setItems(prevItems => prevItems.map(item => item.status === 'pending' ? { ...item, status: 'loading' } : item));

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const itemsToProcess = items.filter(item => item.status === 'pending' || item.status === 'loading');

        for (const item of itemsToProcess) {
            try {
                const prompt = `
                    You are a professional localization expert for mobile games. Your task is to analyze a piece of English text and its current Simplified Chinese translation.
                    
                    **Game Context:** The game is a casual, friendly, and visually artistic coloring app called "Incolor". The target audience is global, so the tone should be encouraging, simple, and positive. Avoid overly formal, technical, or literal translations.

                    **Instructions:**
                    1.  **Analyze the original English text and its current Chinese translation.**
                    2.  **Identify the specific issue type** from this list: ['缺失', '空值', '翻译不准', '语法错误', '风格不符'].
                        -   '缺失': The translation is missing (represented by '—').
                        -   '空值': The translation is an empty string or placeholder (represented by '**').
                        -   '翻译不准': The translation is factually incorrect or misinterprets the meaning.
                        -   '语法错误': The translation has grammatical errors in Chinese.
                        -   '风格不符': The translation is grammatically correct but does not fit the game's friendly and artistic tone.
                    3.  **Provide a better, corrected Chinese translation.** This suggestion should be natural, fluent, and fit the game's style.
                    4.  **Format your response as a JSON object** with exactly two keys: "issue" (the identified issue type) and "suggestion" (the new translation). Do not include any other text, explanations, or markdown formatting.

                    **Example Request:**
                    -   English: "Sound Effects"
                    -   Current Translation: "*声音的效果*"

                    **Example JSON Response:**
                    {
                        "issue": "翻译不准",
                        "suggestion": "音效"
                    }
                    
                    **Your Task:**
                    -   English: "${item.original}"
                    -   Current Translation: "${item.currentTranslation}"
                `;

                const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
                const responseText = result.text.trim();
                const jsonResponse = JSON.parse(responseText);

                setItems(prevItems => prevItems.map(i => i.key === item.key ? { ...i, status: 'done', issue: jsonResponse.issue, suggestion: jsonResponse.suggestion } : i));

            } catch (error) {
                console.error(`Error processing item ${item.key}:`, error);
                setItems(prevItems => prevItems.map(i => i.key === item.key ? { ...i, status: 'pending', suggestion: 'AI 分析失败' } : i));
            } finally {
                // Add a delay between each item to avoid rate limiting.
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        setIsChecking(false);
        showToast('AI 检查完成!', 'success');
    };

    const handleAdopt = (key: string) => {
        setItems(prevItems => prevItems.map(item => item.key === key ? { ...item, status: 'adopted', currentTranslation: item.suggestion } : item));
    };

    const handleIgnore = (key: string) => {
        setItems(prevItems => prevItems.map(item => item.key === key ? { ...item, status: 'ignored' } : item));
    };

    const handleResetItem = (key: string) => {
        const originalItem = initialData.find(i => i.key === key);
        if (originalItem) {
            setItems(prevItems => prevItems.map(item => item.key === key ? { ...originalItem } : item));
        }
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">LingoSync AI - 本地化校对工具</h1>
                <p className="text-gray-500 mt-1">利用 Gemini AI 自动检测和修正游戏内的本地化文案问题。</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between">
                <p className="text-sm text-gray-600">共找到 <span className="font-bold text-primary">{items.length}</span> 条本地化文案。点击按钮开始 AI 检查。</p>
                <button 
                    onClick={handleRunAICheck}
                    disabled={isChecking}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover disabled:bg-gray-300"
                >
                    {isChecking ? <Spinner size="sm" /> : <Icons.AIGenerateIcon className="w-5 h-5" />}
                    <span>{isChecking ? '正在检查...' : '运行 AI 检查'}</span>
                </button>
            </div>
            
             <div className="bg-white rounded-lg shadow-md overflow-hidden border">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="py-3 px-6">Key</th>
                                <th className="py-3 px-6">原文 (EN)</th>
                                <th className="py-3 px-6">当前译文 (ZH)</th>
                                <th className="py-3 px-6">AI 诊断问题</th>
                                <th className="py-3 px-6">AI 优化建议</th>
                                <th className="py-3 px-6">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.key} className="bg-white border-b hover:bg-gray-50">
                                    <td className="py-4 px-6 font-mono text-xs">{item.key}</td>
                                    <td className="py-4 px-6">{item.original}</td>
                                    <td className="py-4 px-6 font-semibold">{item.currentTranslation}</td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getIssueClass(item.issue)}`}>
                                            {item.issue}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        {item.status === 'loading' && <Spinner size="sm" />}
                                        {item.status !== 'loading' && <span className="text-blue-600 font-semibold">{item.suggestion}</span>}
                                    </td>
                                    <td className="py-4 px-6">
                                        {item.status === 'done' && (
                                            <div className="flex items-center space-x-2">
                                                <Tooltip content="采纳建议"><button onClick={() => handleAdopt(item.key)} className="p-2 text-green-600 hover:bg-green-100 rounded-full"><Icons.CheckIcon className="w-4 h-4"/></button></Tooltip>
                                                <Tooltip content="忽略建议"><button onClick={() => handleIgnore(item.key)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><Icons.CloseIcon className="w-4 h-4"/></button></Tooltip>
                                            </div>
                                        )}
                                        {(item.status === 'adopted' || item.status === 'ignored') && (
                                             <div className="flex items-center space-x-2">
                                                <span className={`text-xs font-bold ${item.status === 'adopted' ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {item.status === 'adopted' ? '已采纳' : '已忽略'}
                                                </span>
                                                <Tooltip content="重置"><button onClick={() => handleResetItem(item.key)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><Icons.RevertIcon className="w-4 h-4"/></button></Tooltip>
                                             </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LocalizationTool;