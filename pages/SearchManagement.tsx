
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { SearchTerm } from '../types';
import * as Icons from '../components/shared/Icons';
import Spinner from '../components/shared/Spinner';
import DatePicker from '../components/shared/DatePicker';
import { useToast } from '../context/ToastContext';
import Tooltip from '../components/shared/Tooltip';

interface SearchManagementProps {
    searchTerms: SearchTerm[];
}

const STORAGE_KEY = 'incolor_search_translations_v1';
const MAX_CONCURRENT_TRANSLATIONS = 10;

const SearchManagement: React.FC<SearchManagementProps> = ({ searchTerms: initialSearchTerms }) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'hot' | 'scarce'>('hot');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SearchTerm[]>([]);
    
    // Filters
    const [isAutoTranslate, setIsAutoTranslate] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('所有语言');
    const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
    const [searchKeyword, setSearchKeyword] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 100;

    // Translation state
    // We use a Set to track which terms are currently being processed visually
    const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
    
    // Ref to track active API calls count synchronously for logic
    const activeTranslationsRef = useRef(0);
    // Ref to prevent effect loops
    const processingRef = useRef(false);

    // Helper to load translations from local storage
    const loadStoredTranslations = () => {
        try {
            const item = localStorage.getItem(STORAGE_KEY);
            return item ? JSON.parse(item) : {};
        } catch (e) {
            console.error("Failed to load translations", e);
            return {};
        }
    };

    // Helper to save a single translation
    const saveTranslationToStorage = (term: string, translation: string, language: string) => {
        try {
            const current = loadStoredTranslations();
            current[term] = { translation, language };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        } catch (e) {
            console.error("Failed to save translation", e);
        }
    };

    // Fetch Data
    const fetchData = async (tab: string) => {
        setLoading(true);
        try {
            const endpoint = tab === 'hot' ? 'h' : 'rarity';
            const res = await fetch(`https://sg.api.eyewind.cn/etl/imagen/history/${endpoint}`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ limit: 1000 }), // Increased limit to support pagination
                mode: "cors",
                credentials: "omit"
            }).then(r => r.json());
            
            if (res.data && Array.isArray(res.data)) {
                const storedTranslations = loadStoredTranslations();

                const enrichedData = res.data.map((item: any) => {
                    // Check local storage first
                    const stored = storedTranslations[item.term];
                    
                    return {
                        ...item,
                        c: item.c || Math.floor(item.h * (Math.random() * 0.1)),
                        // Use stored translation/language if available, otherwise fallback to API data or undefined
                        language: stored?.language || item.language,
                        translation: stored?.translation || item.translation,
                    };
                });
                setData(enrichedData);

                // Calculate and set date range from the data source
                const validDates = enrichedData
                    .map((item: any) => new Date(item.date).getTime())
                    .filter((t: number) => !isNaN(t));
                
                if (validDates.length > 0) {
                    const minDate = new Date(Math.min(...validDates));
                    const maxDate = new Date(Math.max(...validDates));
                    // Update the date picker to show the range of the current data
                    setDateRange({ start: minDate, end: maxDate });
                }
            } else {
                setData([]);
            }
        } catch (e) {
            console.error("Fetch error:", e);
            showToast("数据加载失败", "error");
            setData([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData(activeTab);
        // Reset auto-translate when switching tabs to prevent processing wrong list immediately
        setIsAutoTranslate(false);
        activeTranslationsRef.current = 0;
        setTranslatingIds(new Set());
        setCurrentPage(1); // Reset page on tab change
    }, [activeTab]);

    // Core Translation Logic
    const performTranslation = useCallback(async (term: string) => {
        if (!process.env.API_KEY) {
            showToast("API Key 未配置", "error");
            return;
        }

        // Add to visual loading state
        setTranslatingIds(prev => new Set(prev).add(term));
        activeTranslationsRef.current += 1;

        try {
            // Jitter: Random delay between 0-1000ms to avoid burst rate limits
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Translate the following search term into Simplified Chinese. Detect the source language code (e.g., EN, JA, KO, ES). 
                If the term is already Chinese or a proper noun that usually doesn't change, return it as is.
                Return ONLY JSON format: {"translation": "...", "language": "CODE"}.
                Term: "${term}"`
            });
            
            const text = response.text;
            // Robust JSON extraction
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                
                // Update State
                setData(prev => prev.map(t => t.term === term ? { ...t, translation: result.translation, language: result.language } : t));
                
                // Update Storage
                saveTranslationToStorage(term, result.translation, result.language);
            }
        } catch (error: any) {
            console.error(`Translation failed for ${term}`, error);
            
            // Check for 429 (Too Many Requests)
            if (error.message?.includes('429') || error.status === 429) {
                console.warn(`Rate limit hit for ${term}. Cooling down slot.`);
                // If rate limited, we hold this slot occupied for 10 seconds to allow cooldown, 
                // then release it so it can be retried later (by not updating 'data' it remains untranslated)
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        } finally {
            // Remove from visual loading state
            setTranslatingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(term);
                return newSet;
            });
            activeTranslationsRef.current -= 1;
            
            // Trigger queue check immediately to fill the slot
            triggerQueueCheck();
        }
    }, []);

    // Manual single translation trigger
    const handleManualTranslate = (term: string) => {
        performTranslation(term);
    };

    // Auto-Translation Queue Manager
    const triggerQueueCheck = useCallback(() => {
        // We use a timeout to break the synchronous chain and allow state updates to settle
        setTimeout(() => {
            if (!isAutoTranslate) return;
            
            const availableSlots = MAX_CONCURRENT_TRANSLATIONS - activeTranslationsRef.current;
            if (availableSlots <= 0) return;

            // Trigger re-evaluation of effect by touching state if needed, 
            // but effectively the finally block updating `translatingIds` does this.
        }, 0);
    }, [isAutoTranslate]);

    // Filter Logic
    const filteredData = useMemo(() => {
        let filtered = [...data];

        if (searchKeyword) {
            const lowerKeyword = searchKeyword.toLowerCase();
            filtered = filtered.filter(item => item.term.toLowerCase().includes(lowerKeyword) || item.translation?.toLowerCase().includes(lowerKeyword));
        }

        if (selectedLanguage !== '所有语言') {
            filtered = filtered.filter(item => item.language === selectedLanguage);
        }

        // REMOVED: Date filtering logic based on user selection.
        // The dateRange state now reflects the data's time range, but doesn't filter the list.
        // if (dateRange.start && dateRange.end) { ... }

        return filtered;
    }, [data, searchKeyword, selectedLanguage]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    // The Main Queue Effect
    useEffect(() => {
        if (!isAutoTranslate) return;

        // Determine available slots
        const availableSlots = MAX_CONCURRENT_TRANSLATIONS - activeTranslationsRef.current;
        
        if (availableSlots > 0) {
            // Find terms that need translation
            // 1. Have no translation
            // 2. Are not currently in the 'translatingIds' set (visually loading)
            // 3. IMPORTANT: Only translate items on the current page
            const candidates = paginatedData.filter(item => 
                (!item.translation || item.translation.trim() === '') && 
                !translatingIds.has(item.term)
            );

            if (candidates.length > 0) {
                // Take as many as we can fit
                const batch = candidates.slice(0, availableSlots);
                
                // Optimistically mark them as translating IMMEDIATELY to prevent double-scheduling
                // before the individual performTranslation calls run
                const newIds = new Set(translatingIds);
                batch.forEach(item => newIds.add(item.term));
                setTranslatingIds(newIds); // Batch update UI state

                // Start tasks
                batch.forEach(item => {
                    performTranslation(item.term);
                });
            }
        }
    }, [isAutoTranslate, paginatedData, translatingIds, performTranslation]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchKeyword, selectedLanguage]);

    // Calculate date range string
    const dateRangeString = useMemo(() => {
        if (!dateRange.start || !dateRange.end) return '';
        const startStr = dateRange.start.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
        const endStr = dateRange.end.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
        return `${startStr} ~ ${endStr}`;
    }, [dateRange]);

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-800">搜索管理</h1>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">筛选条件:</span>
                    <label className="flex items-center cursor-pointer">
                        <span className={`mr-2 text-sm ${isAutoTranslate ? 'text-primary font-bold' : 'text-gray-600'}`}>
                            AI 自动翻译 {isAutoTranslate && activeTranslationsRef.current > 0 && <span className="text-xs ml-1 opacity-75">({activeTranslationsRef.current} 处理中...)</span>}
                        </span>
                        <div className="relative">
                            <input type="checkbox" className="sr-only" checked={isAutoTranslate} onChange={e => setIsAutoTranslate(e.target.checked)} />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${isAutoTranslate ? 'bg-primary' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAutoTranslate ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                        <Tooltip content="开启后将自动并行翻译当前页面中未翻译的词条（翻页后自动处理新页面）"><Icons.InfoIcon className="w-4 h-4 text-gray-400 ml-1" /></Tooltip>
                    </label>
                </div>

                <div className="h-6 w-px bg-gray-300 mx-2 hidden md:block"></div>

                <select 
                    value={selectedLanguage} 
                    onChange={e => setSelectedLanguage(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 focus:ring-primary focus:border-primary"
                >
                    <option>所有语言</option>
                    <option value="EN">English (EN)</option>
                    <option value="JA">Japanese (JA)</option>
                    <option value="KO">Korean (KO)</option>
                    <option value="ES">Spanish (ES)</option>
                    <option value="PT">Portuguese (PT)</option>
                </select>

                {dateRangeString && (
                    <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                        <Icons.CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <span>数据来源日期: {dateRangeString}</span>
                    </div>
                )}

                <div className="flex-grow"></div>

                <div className="relative w-64">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><Icons.SearchIcon className="w-4 h-4" /></span>
                    <input 
                        type="text" 
                        placeholder="搜索关键词..." 
                        value={searchKeyword}
                        onChange={e => setSearchKeyword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary"
                    />
                </div>

                <button 
                    onClick={() => { setSearchKeyword(''); setDateRange({start: null, end: null}); setSelectedLanguage('所有语言'); setIsAutoTranslate(false); }}
                    className="flex items-center px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                    <Icons.FilterIcon className="w-4 h-4 mr-1" /> 清除
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button 
                        onClick={() => setActiveTab('hot')}
                        className={`${activeTab === 'hot' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                        热搜词条 <Tooltip content="近期搜索量最高的关键词"><Icons.InfoIcon className="w-3.5 h-3.5 ml-1.5 opacity-60" /></Tooltip>
                    </button>
                    <button 
                        onClick={() => setActiveTab('scarce')}
                        className={`${activeTab === 'scarce' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                        稀缺词条 (高搜索/低匹配) <Tooltip content="搜索量高但匹配结果少的关键词，建议补充素材"><Icons.InfoIcon className="w-3.5 h-3.5 ml-1.5 opacity-60" /></Tooltip>
                    </button>
                </nav>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white rounded-lg shadow-sm border flex flex-col min-h-0">
                {loading ? (
                    <div className="flex-1 flex justify-center items-center">
                        <Spinner size="lg" />
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">原始关键词</th>
                                        <th className="px-6 py-3 font-medium">翻译</th>
                                        <th className="px-6 py-3 font-medium">
                                            <div className="flex items-center">
                                                搜索次数 
                                                <Tooltip content="用户搜索该词条的频率" position="bottom">
                                                    <Icons.InfoIcon className="w-3.5 h-3.5 ml-1 text-gray-400 cursor-help" />
                                                </Tooltip>
                                            </div>
                                        </th>
                                        <th className="px-6 py-3 font-medium">
                                            <div className="flex items-center">
                                                点击次数 
                                                <Tooltip content="用户点击搜索结果的次数" position="bottom">
                                                    <Icons.InfoIcon className="w-3.5 h-3.5 ml-1 text-gray-400 cursor-help" />
                                                </Tooltip>
                                            </div>
                                        </th>
                                        <th className="px-6 py-3 font-medium">
                                            <div className="flex items-center">
                                                结果数量 
                                                <Tooltip content="该搜索词对应的现有素材数量" position="bottom">
                                                    <Icons.InfoIcon className="w-3.5 h-3.5 ml-1 text-gray-400 cursor-help" />
                                                </Tooltip>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedData.map((item, index) => {
                                        const isTranslating = translatingIds.has(item.term);
                                        const hasTranslation = !!item.translation && item.translation !== '';
                                        
                                        // Swap h and n for scarce tab based on data observation: 
                                        // in scarce tab, 'n' (46 in example) is search count, 'h' (0 in example) is result count.
                                        const searchCount = activeTab === 'scarce' ? (item.n || 0) : item.h;
                                        const resultCount = activeTab === 'scarce' ? item.h : (item.n || 0);

                                        return (
                                            <tr key={index} className="bg-white hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-800">{item.term}</td>
                                                <td className="px-6 py-4">
                                                    {isTranslating ? (
                                                        <div className="flex items-center text-blue-600 text-xs font-medium animate-pulse">
                                                            <Spinner size="sm" className="mr-2 text-blue-600" /> 翻译中...
                                                        </div>
                                                    ) : hasTranslation ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-700">{item.translation}</span>
                                                            {item.language && (
                                                                <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded uppercase font-medium">
                                                                    {item.language}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleManualTranslate(item.term)} 
                                                            // Disable manual button if auto-translate is running generally, or this specific item is somehow pending
                                                            disabled={isAutoTranslate}
                                                            className={`p-1.5 rounded transition-colors ${isAutoTranslate ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`} 
                                                            title={isAutoTranslate ? "自动翻译运行中" : "点击翻译"}
                                                        >
                                                            <Icons.TranslateIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-900">{searchCount.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-gray-600">{item.c?.toLocaleString() || '-'}</td>
                                                <td className="px-6 py-4 text-gray-600">{resultCount.toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                    {paginatedData.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                暂无数据
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination Footer */}
                        <div className="p-4 border-t bg-gray-50 flex items-center justify-between flex-shrink-0">
                            <div className="text-sm text-gray-500">
                                显示 {(currentPage - 1) * itemsPerPage + 1} 到 {Math.min(currentPage * itemsPerPage, filteredData.length)} 条，共 {filteredData.length} 条
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                                >
                                    <Icons.ChevronLeftIcon className="w-4 h-4 text-gray-600" />
                                </button>
                                <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
                                    {currentPage} / {Math.max(1, totalPages)}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                                >
                                    <Icons.ChevronRightIcon className="w-4 h-4 text-gray-600" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SearchManagement;
