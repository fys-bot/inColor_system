/**
 * @file AI 模型管理页面 (AIModelManagement.tsx)
 * @description 该页面允许管理员为应用内不同的 AI 功能动态配置所使用的 Gemini 模型，并提供一个专门的测试工具来调试生图提示词。
 */
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AIModelConfig, AIModelFeature, AvailableModels, AIModelDetails, AIGenerationStyle, AIGenerationSize } from '../types';
import { useToast } from '../context/ToastContext';
// FIX: Removed 'Sparkles' as it is not an exported member of the Icons module. 'AIGenerateIcon' should be used instead.
import { AIGenerateIcon, PlusIcon } from '../components/shared/Icons';
import Spinner from '../components/shared/Spinner';

// 定义页面 props 的接口
interface AIModelManagementProps {
  aiModelConfig: AIModelConfig;
  setAiModelConfig: React.Dispatch<React.SetStateAction<AIModelConfig>>;
  availableModels: AvailableModels;
  setAvailableModels: React.Dispatch<React.SetStateAction<AvailableModels>>;
  generationStyles: AIGenerationStyle[];
}

// 定义每个 AI 功能的元数据，包括中文名称、描述和适用的模型类型
const featureMetadata: Record<AIModelFeature, { name: string; description: string; modelType: 'text' | 'image' }> = {
  imageTagging: {
    name: '图片标签分析',
    description: '在上传素材或保存生图时，分析图片内容并自动生成相关标签。',
    modelType: 'text',
  },
  imageCategorization: {
    name: '智能分类',
    description: '根据图片内容和标签，为其推荐或创建一个最合适的分类。',
    modelType: 'text',
  },
  imageGeneration: {
    name: 'AI 生图',
    description: '在“多图生成”功能中，根据提示词生成图片的核心模型。',
    modelType: 'image',
  },
  textTranslation: {
    name: '文本翻译',
    description: '在“社区管理”和“AI生图管理”中，用于将非中文内容翻译成中文。',
    modelType: 'text',
  },
};

const AIModelManagement: React.FC<AIModelManagementProps> = ({ aiModelConfig, setAiModelConfig, availableModels, setAvailableModels, generationStyles }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'config' | 'promptTest'>('config');

  // State for adding new models in the config tab
  const [newModel, setNewModel] = useState<{ feature: AIModelFeature | null, name: string }>({ feature: null, name: '' });

  // State for the prompt testing tab
  const generationSizes: AIGenerationSize[] = ['方形', '横屏', '竖屏'];
  const [testPrompt, setTestPrompt] = useState<string>('一只戴着宇航员头盔的可爱猫咪，漂浮在太空中');
  const [testStyle, setTestStyle] = useState<AIGenerationStyle>(generationStyles[0] || '卡通');
  const [testSize, setTestSize] = useState<AIGenerationSize>('方形');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ imageUrl: string | null; finalPrompt: string | null; error: string | null }>({ imageUrl: null, finalPrompt: null, error: null });

  // 处理模型配置变更的通用函数
  const handleConfigChange = (feature: AIModelFeature, updatedDetails: Partial<AIModelDetails>) => {
    setAiModelConfig(prev => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        ...updatedDetails,
      }
    }));
    showToast(`“${featureMetadata[feature].name}”的配置已更新`, 'success');
  };

  // 处理添加新模型的函数
  const handleAddNewModel = (feature: AIModelFeature, modelType: 'text' | 'image') => {
    const name = newModel.name.trim();
    if (!name) {
      showToast('模型名称不能为空', 'error');
      return;
    }
    setAvailableModels(prev => ({
      ...prev,
      [modelType]: [...new Set([...prev[modelType], name])]
    }));
    showToast(`新模型 "${name}" 已添加`, 'success');
    setNewModel({ feature: null, name: '' });
  };

  // 处理生图测试的函数
  const handleTestGeneration = async () => {
    if (!process.env.API_KEY) {
      showToast("API_KEY 环境变量未设置", 'error');
      return;
    }
    if (!testPrompt.trim()) {
      showToast("测试提示词不能为空", 'error');
      return;
    }

    setIsTesting(true);
    setTestResult({ imageUrl: null, finalPrompt: null, error: null });

    try {
        const imageGenConfig = aiModelConfig.imageGeneration;
        const activePrompt = imageGenConfig.presetPrompts?.[imageGenConfig.activePresetPromptIndex ?? 0] || '{PROMPT}';
        const finalPrompt = activePrompt
            .replace('{PROMPT}', testPrompt)
            .replace('{STYLE}', testStyle);
        
        setTestResult(prev => ({ ...prev, finalPrompt }));

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const sizeToAspectRatio = (size: AIGenerationSize): "1:1" | "16:9" | "9:16" => {
            if (size === '横屏') return '16:9';
            if (size === '竖屏') return '9:16';
            return '1:1';
        };
        
        const response = await ai.models.generateImages({
            model: aiModelConfig.imageGeneration.modelName,
            prompt: finalPrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: sizeToAspectRatio(testSize),
            },
        });
        
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/png;base64,${base64ImageBytes}`;

        setTestResult(prev => ({ ...prev, imageUrl, error: null }));
    } catch (error) {
        console.error("Test image generation failed:", error);
        const errorMessage = error instanceof Error ? error.message : "未知错误";
        setTestResult(prev => ({ ...prev, error: `生成失败: ${errorMessage}` }));
        showToast(`生成测试图失败: ${errorMessage}`, 'error');
    } finally {
        setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">AI 模型管理</h1>
        <p className="text-gray-500 mt-1">为系统内不同的 AI 功能配置所使用的模型，并测试生图效果。更改会立即生效。</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button onClick={() => setActiveTab('config')} className={`${activeTab === 'config' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                模型配置
            </button>
            <button onClick={() => setActiveTab('promptTest')} className={`${activeTab === 'promptTest' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                生图提示词测试
            </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'config' && (
            <div className="space-y-6">
                {(Object.keys(aiModelConfig) as AIModelFeature[]).map((feature) => {
                    const metadata = featureMetadata[feature];
                    const currentConfig = aiModelConfig[feature];
                    const modelOptions = availableModels[metadata.modelType];

                    return (
                        <div key={feature} className="bg-white p-6 rounded-lg shadow-sm border">
                            <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                                <div className="flex-grow">
                                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                                    <AIGenerateIcon className="w-5 h-5 mr-2 text-primary" />
                                    {metadata.name}
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">{metadata.description}</p>
                                </div>
                                <div className="flex-shrink-0 w-full md:w-64">
                                <label htmlFor={`model-select-${feature}`} className="block text-sm font-medium text-gray-700 mb-1">
                                    当前模型
                                </label>
                                <select
                                    id={`model-select-${feature}`}
                                    value={currentConfig.modelName}
                                    onChange={(e) => handleConfigChange(feature, { modelName: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-primary focus:border-primary"
                                >
                                    {modelOptions.map(modelName => (
                                    <option key={modelName} value={modelName}>{modelName}</option>
                                    ))}
                                </select>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                {newModel.feature === feature ? (
                                <div className="flex items-center gap-2">
                                    <input
                                    type="text"
                                    value={newModel.name}
                                    onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                                    placeholder="输入新模型名称"
                                    className="flex-grow p-2 border rounded-md bg-white text-gray-900"
                                    autoFocus
                                    />
                                    <button onClick={() => handleAddNewModel(feature, metadata.modelType)} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover">保存</button>
                                    <button onClick={() => setNewModel({ feature: null, name: '' })} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button>
                                </div>
                                ) : (
                                <button
                                    onClick={() => setNewModel({ feature, name: '' })}
                                    className="flex items-center gap-2 text-sm text-primary font-medium hover:underline"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    添加新模型到列表
                                </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
        {activeTab === 'promptTest' && (
           <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <label htmlFor="preset-prompt-editor" className="block text-sm font-medium text-gray-700 mb-1">
                        生图预制提示词 (Preset Prompt)
                    </label>
                    <textarea
                        id="preset-prompt-editor"
                        rows={4}
                        value={aiModelConfig.imageGeneration.presetPrompts?.[aiModelConfig.imageGeneration.activePresetPromptIndex ?? 0] || ''}
                        onChange={(e) => {
                            const newPrompts = [...(aiModelConfig.imageGeneration.presetPrompts || [])];
                            const activeIndex = aiModelConfig.imageGeneration.activePresetPromptIndex ?? 0;
                            if (newPrompts[activeIndex] !== undefined) {
                                newPrompts[activeIndex] = e.target.value;
                                handleConfigChange('imageGeneration', { presetPrompts: newPrompts });
                            }
                        }}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-primary focus:border-primary font-mono text-xs"
                        placeholder="输入预制提示词... 使用 {PROMPT} 和 {STYLE} 作为占位符。"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        这里显示的是当前激活的提示词。要管理所有提示词，请前往“批量生图工具”页面。
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800">测试参数</h3>
                        <div>
                            <label htmlFor="test-prompt" className="block text-sm font-medium text-gray-700 mb-1">用户提示词 <code>({'{PROMPT}'})</code></label>
                            <input id="test-prompt" type="text" value={testPrompt} onChange={e => setTestPrompt(e.target.value)} className="w-full p-2 border rounded-md bg-white text-gray-900" />
                        </div>
                        <div>
                            <label htmlFor="test-style" className="block text-sm font-medium text-gray-700 mb-1">风格 <code>({'{STYLE}'})</code></label>
                            <select id="test-style" value={testStyle} onChange={e => setTestStyle(e.target.value as AIGenerationStyle)} className="w-full p-2 border rounded-md bg-white">
                                {generationStyles.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="test-size" className="block text-sm font-medium text-gray-700 mb-1">尺寸</label>
                            <select id="test-size" value={testSize} onChange={e => setTestSize(e.target.value as AIGenerationSize)} className="w-full p-2 border rounded-md bg-white">
                                {generationSizes.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <button onClick={handleTestGeneration} disabled={isTesting} className="w-full px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover disabled:bg-gray-300 flex items-center justify-center space-x-2">
                            {isTesting ? <Spinner size="sm"/> : <AIGenerateIcon className="w-5 h-5"/>}
                            <span>{isTesting ? '生成中...' : '生成测试图'}</span>
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800">测试结果</h3>
                        <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border">
                            {isTesting && <Spinner size="lg" />}
                            {testResult.error && <p className="text-red-600 p-4 text-center text-sm">{testResult.error}</p>}
                            {testResult.imageUrl && !isTesting && <img src={testResult.imageUrl} alt="Test Generation" className="w-full h-full object-contain" />}
                            {!isTesting && !testResult.error && !testResult.imageUrl && <p className="text-gray-500">点击生成按钮查看结果</p>}
                        </div>
                        {testResult.finalPrompt && (
                            <div>
                                <label className="block text-xs font-medium text-gray-600">最终发送到 API 的提示词:</label>
                                <p className="text-xs text-gray-800 bg-gray-50 p-2 rounded-md mt-1 font-mono">{testResult.finalPrompt}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AIModelManagement;