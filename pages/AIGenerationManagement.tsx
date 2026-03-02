
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AIGenerationModel, AIGenerationSize, AIGenerationStyle, AIModelConfig, AIGenerationRecords } from '../types';
import { useImagePreview } from '../context/ImagePreviewContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DownloadIcon, FilterIcon, ChevronUpIcon, ChevronDownIcon, CloseIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '../components/shared/Icons';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/shared/Spinner';
import Tooltip from '../components/shared/Tooltip';


declare var JSZip: any;

const filterLabelMap: { [key: string]: string } = {
    model: '模型名称',
    ratio: '尺寸', style: '风格', uid: '用户 ID',
    prompt: '提示词内容', createdAt: '生图时间'
};

// Use literal union to avoid symbol/number key issues during mapping
type FilterableField = 'model' | 'ratio' | 'style' | 'uid' | 'prompt' | 'createdAt';
const filterFields: FilterableField[] = ['model', 'ratio', 'style', 'uid', 'prompt', 'createdAt'];

const FilterPanel: React.FC<{
    filters: { [key: string]: string },
    onFilterChange: (field: string, value: string) => void,
    onApply: () => void,
    onReset: () => void,
    filterOptionsMap: { [key: string]: (string | number)[] },
}> = ({ filters, onFilterChange, onApply, onReset, filterOptionsMap }) => (
    <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filterFields.map((field) => {
                // Ensure field is a string for indexing
                const fieldKey = field as string;
                const options = filterOptionsMap[fieldKey];
                return (
                    <div key={fieldKey}>
                        <label className="block text-sm font-medium text-gray-700 capitalize">{filterLabelMap[fieldKey] || fieldKey}</label>
                        {options ? (
                            <select className="mt-1 block w-full p-2 border rounded-md bg-white text-sm" value={filters[fieldKey] || ''} onChange={(e) => onFilterChange(fieldKey, e.target.value)}>
                                <option value="">全部</option>
                                {options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        ) : (
                            <input 
                                type={fieldKey.includes('createdAt') ? 'date' : 'text'} 
                                placeholder={`筛选 ${filterLabelMap[fieldKey] || filterLabelMap[fieldKey]}`} 
                                className="mt-1 w-full p-2 border rounded-md text-sm bg-white text-gray-900" 
                                value={filters[fieldKey] || ''} 
                                onChange={(e) => onFilterChange(fieldKey, e.target.value)} 
                            />
                        )}
                    </div>
                )
            })}
        </div>
        <div className="mt-4 flex flex-col sm:flex-row justify-end items-center gap-2">
            <button onClick={onReset} className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700">重置</button>
            <button onClick={onApply} className="w-full sm:w-auto px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary-hover">应用筛选</button>
        </div>
    </div>
);

interface AIGenerationListProps {
    loading: boolean;
    aiGenerations: AIGenerationRecords[];
    aiModelConfig: AIModelConfig;
    generationStyles: AIGenerationStyle[];
}

const AIGenerationList: React.FC<AIGenerationListProps> = ({ loading, aiGenerations, aiModelConfig, generationStyles }) => {
    // console.log(loading)
    // const { showPreview } = useImagePreview(); // Removed in favor of local custom preview
    const { showToast } = useToast();
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Custom Preview State
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    const [filters, setFilters] = useState<{ [key: string]: string | number }>({});
    const [appliedFilters, setAppliedFilters] = useState<{ [key: string]: string | number }>({});

    const handleFilterChange = (field: string, value: string) => setFilters(prev => ({ ...prev, [field]: value }));
    const applyFilters = () => { setAppliedFilters(filters); };
    const resetFilters = () => { setFilters({}); setAppliedFilters({}); };

    const filterOptionsMap: { [key: string]: (string | number)[] } = useMemo(() => ({
        ratio: [...new Set(aiGenerations.map(a => typeof a.ratio === 'number' ? a.ratio.toFixed(2) : '0.00'))],
        model: [...new Set(aiGenerations.map(a => a.model))],
        style: [...new Set(aiGenerations.map(a => a.style))],
    }), [aiGenerations]);

    const filteredGenerations = useMemo(() => {
        return aiGenerations.filter(gen => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                if (key === 'createdAt') return gen.createdAt === new Date(value as string).toDateString();
                const genValue = gen[key as keyof AIGenerationRecords];
                if (key === 'ratio') {
                    const r = Number(genValue);
                    const s = isNaN(r) ? '0.00' : r.toFixed(2);
                    return s.toLowerCase().includes(String(value).toLowerCase());
                }
                return String(genValue).toLowerCase().includes(String(value).toLowerCase());
            });
        });
    }, [aiGenerations, filters]);

    const handleSelect = (id: string, checked: boolean) => { const newSelection = new Set(selectedRows); if (checked) newSelection.add(id); else newSelection.delete(id); setSelectedRows(newSelection); };
    const handleSelectAll = (checked: boolean) => setSelectedRows(checked ? new Set(filteredGenerations.map(g => g.id)) : new Set());

    // Preview Logic
    const handleOpenPreview = (index: number) => setPreviewIndex(index);
    const handleClosePreview = () => setPreviewIndex(null);
    const handlePrevPreview = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setPreviewIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
    };
    const handleNextPreview = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setPreviewIndex(prev => (prev !== null && prev < filteredGenerations.length - 1 ? prev + 1 : prev));
    };
    const handleToggleCurrentPreviewSelection = () => {
        if (previewIndex !== null) {
            const currentItem = filteredGenerations[previewIndex];
            handleSelect(currentItem.id, !selectedRows.has(currentItem.id));
        }
    };

    // Keyboard support for preview navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (previewIndex === null) return;
            if (e.key === 'ArrowLeft') handlePrevPreview();
            if (e.key === 'ArrowRight') handleNextPreview();
            if (e.key === 'Escape') handleClosePreview();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [previewIndex, filteredGenerations]);

    const handleBatchDownload = async () => {
        if (selectedRows.size === 0) return;
        setIsDownloading(true);
        showToast(`正在准备 ${selectedRows.size} 个文件...`, 'info');

        try {
            const zip = new JSZip();
            const selectedGenerations = aiGenerations.filter(gen => selectedRows.has(gen.id));

            const imagePromises = selectedGenerations.map(async (gen) => {
                const response = await fetch(gen.URL);
                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${gen.URL}`);
                }
                const blob = await response.blob();
                // Since picsum URLs don't have extensions, we'll assume jpeg.
                const filename = `${gen.id}.jpg`;
                zip.file(filename, blob);
            });

            await Promise.all(imagePromises);

            const zipBlob = await zip.generateAsync({ type: 'blob' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `incolor-ai-generations-${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            showToast('文件已成功开始下载!', 'success');
            setSelectedRows(new Set());

        } catch (error) {
            console.error("Failed to create ZIP file:", error);
            showToast('创建 ZIP 文件失败，请检查控制台。', 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    const tableHeaders = ['模型名称', '尺寸', '风格', '用户 ID', '提示词内容', '提示词翻译', '生图时间', '图片'];

    return (
        <div className="bg-white rounded-lg shadow-md border flex flex-col h-full">
            <div className="flex-shrink-0">
                <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-2 border-b">
                    <button onClick={() => setIsFilterVisible(!isFilterVisible)} className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100">
                        <FilterIcon className="w-5 h-5" />
                        <span>{isFilterVisible ? '隐藏筛选' : '显示筛选'}</span>
                        {isFilterVisible ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                    </button>
                    <button onClick={handleBatchDownload} disabled={selectedRows.size === 0 || isDownloading} className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300">
                        {isDownloading ? <Spinner size="sm" /> : <DownloadIcon className="w-5 h-5" />}
                        <span>{isDownloading ? '正在打包...' : '批量下载为 ZIP 文件'}</span>
                    </button>
                </div>
                {isFilterVisible && <FilterPanel filters={filters as { [key: string]: string }} onFilterChange={handleFilterChange} onApply={applyFilters} onReset={resetFilters} filterOptionsMap={filterOptionsMap} />}
            </div>

            <div className="flex-1 overflow-auto min-h-0">
                {/* Mobile Card View */}
                <div className="lg:hidden">
                    <div className="p-4 bg-gray-50 flex items-center space-x-3 border-b">
                        <input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} checked={selectedRows.size > 0 && selectedRows.size === filteredGenerations.length} />
                        <label className="text-sm font-medium text-gray-600">选择全部</label>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {loading && <Spinner size='sm' /> || (
                            <>
                                {filteredGenerations.map((gen, index) => (
                                    <div
                                        key={gen.id}
                                        className={`p-4 space-y-3 cursor-pointer hover:bg-gray-50 ${selectedRows.has(gen.id) ? 'bg-blue-50' : ''}`}
                                        onClick={() => handleSelect(gen.id, !selectedRows.has(gen.id))}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-3">
                                                <input type="checkbox" className="mt-1 form-checkbox h-5 w-5 text-primary rounded focus:ring-primary" checked={selectedRows.has(gen.id)} onChange={e => handleSelect(gen.id, e.target.checked)} onClick={e => e.stopPropagation()} />
                                                <div
                                                    className="w-24 h-24 bg-gray-100 rounded-md flex-shrink-0"
                                                    onClick={(e) => { e.stopPropagation(); handleOpenPreview(index); }}
                                                >
                                                    <img src={gen.URL} alt="generated" className="w-full h-full object-contain rounded-md bg-white" />
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-mono text-sm text-gray-700">{gen.uid}</p>
                                                <p className="text-xs text-gray-500">{new Date(gen.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <strong className="font-medium text-gray-600">提示词:</strong>
                                            <div className="mt-1 text-sm text-gray-800 break-words">
                                                {gen.prompt}
                                            </div>
                                        </div>
                                        <div><strong className="font-medium text-gray-600">提示词翻译:</strong> <span className="text-gray-800">{gen.description_zh}</span></div>
                                        <div><strong className="font-medium text-gray-600">风格:</strong> {gen.style}</div>
                                        <div><strong className="font-medium text-gray-600">模型:</strong> {gen.model}</div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="p-4 bg-gray-50 sticky left-0 z-20">
                                    <input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} checked={selectedRows.size > 0 && selectedRows.size === filteredGenerations.length} className="form-checkbox h-4 w-4 text-primary rounded focus:ring-primary" />
                                </th>
                                {tableHeaders.map(h => <th key={h} scope="col" className="py-3 px-6 whitespace-nowrap bg-gray-50">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGenerations.map((gen, index) => (
                                <tr
                                    key={gen.id}
                                    className={`bg-white border-b hover:bg-gray-50 cursor-pointer ${selectedRows.has(gen.id) ? 'bg-blue-50' : ''}`}
                                    onClick={() => handleSelect(gen.id, !selectedRows.has(gen.id))}
                                >
                                    <td className="p-4 bg-white sticky left-0 z-10" onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={selectedRows.has(gen.id)} onChange={e => handleSelect(gen.id, e.target.checked)} className="form-checkbox h-4 w-4 text-primary rounded focus:ring-primary" />
                                    </td>
                                    <td className="py-4 px-6">{gen.model}</td>
                                    <td className="py-4 px-6">{typeof gen.ratio === 'number' ? gen.ratio.toFixed(2) : '0.00'}</td>
                                    <td className="py-4 px-6">{gen.style}</td><td className="py-4 px-6">{gen.uid}</td>
                                    <td className="py-4 px-6 max-w-sm">
                                        <p className="break-words text-gray-800" title={gen.prompt}>{gen.prompt}</p>
                                    </td>
                                    <td className="py-4 px-6 max-w-xs truncate" title={gen.description_zh}>{gen.description_zh}</td>
                                    <td className="py-4 px-6 whitespace-nowrap">{new Date(gen.createdAt).toLocaleString()}</td>
                                    <td className="py-2 px-6" onClick={e => e.stopPropagation()}>
                                        <div className="w-24 h-24 bg-gray-100 rounded-md flex items-center justify-center">
                                            <img src={gen.URL} alt="generated" className="max-h-full max-w-full object-contain rounded-md cursor-pointer bg-white" onClick={(e) => { e.stopPropagation(); handleOpenPreview(index); }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Full Screen Preview Modal */}
            {previewIndex !== null && filteredGenerations[previewIndex] && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90" onClick={handleClosePreview}>
                    
                    <div className="flex w-full h-full p-2 md:p-4 gap-4 pointer-events-none" onClick={(e) => e.stopPropagation()}>
                        {/* Image Area */}
                        <div className="flex-1 flex items-center justify-center relative pointer-events-auto min-w-0 h-full">
                            <img 
                                src={filteredGenerations[previewIndex].URL || ''} 
                                alt="Preview" 
                                className="max-w-full max-h-full object-contain shadow-2xl bg-white rounded-lg" 
                            />
                        </div>

                        {/* Details Panel */}
                        <div className="w-80 bg-white rounded-lg p-6 overflow-y-auto flex-shrink-0 shadow-xl pointer-events-auto h-fit max-h-full">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">图片详情</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">提示词 (Prompt)</label>
                                    <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded mt-1 leading-relaxed break-words max-h-32 overflow-y-auto">
                                        {filteredGenerations[previewIndex].prompt || '(无)'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">提示词翻译</label>
                                    <p className="text-sm text-gray-800 mt-1">
                                        {filteredGenerations[previewIndex].description_zh || '—'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase">风格</label>
                                        <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                            {filteredGenerations[previewIndex].style}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase">尺寸 (Ratio)</label>
                                        <p className="text-sm text-gray-800 mt-1">{typeof filteredGenerations[previewIndex].ratio === 'number' ? filteredGenerations[previewIndex].ratio.toFixed(2) : '0.00'}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">模型</label>
                                    <p className="text-sm text-gray-800 mt-1 font-mono text-xs">{filteredGenerations[previewIndex].model}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">用户 ID</label>
                                    <p className="text-sm text-gray-800 mt-1 font-mono text-xs break-all">{filteredGenerations[previewIndex].uid}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">生图时间</label>
                                    <p className="text-sm text-gray-800 mt-1">
                                        {new Date(filteredGenerations[previewIndex].createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-6 border-t">
                                 <button 
                                    onClick={handleToggleCurrentPreviewSelection}
                                    className={`w-full py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors ${selectedRows.has(filteredGenerations[previewIndex].id) ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                 >
                                    <CheckIcon className={`w-4 h-4 ${selectedRows.has(filteredGenerations[previewIndex].id) ? 'opacity-100' : 'opacity-0'}`} />
                                    {selectedRows.has(filteredGenerations[previewIndex].id) ? '已选中此图片' : '选中此图片'}
                                 </button>
                            </div>
                        </div>
                    </div>

                    <button onClick={handleClosePreview} className="absolute top-4 right-4 text-white p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full z-[70] transition-colors">
                        <CloseIcon className="w-8 h-8" />
                    </button>
                    
                    <button 
                        onClick={handlePrevPreview} 
                        disabled={previewIndex === 0}
                        className={`absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 rounded-full z-[70] bg-black/50 transition-all ${previewIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/70'}`}
                    >
                        <ChevronLeftIcon className="w-10 h-10" />
                    </button>

                    <button 
                        onClick={handleNextPreview} 
                        disabled={previewIndex === filteredGenerations.length - 1}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 rounded-full z-[70] bg-black/50 transition-all ${previewIndex === filteredGenerations.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/70'}`}
                    >
                        <ChevronRightIcon className="w-10 h-10" />
                    </button>
                </div>
            )}
        </div>
    );
};

const AIGenerationDistribution: React.FC<{
    aiGenerations: AIGenerationRecords[];
}> = ({ aiGenerations }) => {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19AF'];

    const styleData = useMemo(() => Object.entries(aiGenerations.reduce((acc: Record<string, number>, g) => {
        acc[g.style] = (acc[g.style] || 0) + 1;
        return acc;
    }, {})).map(([name, value]) => ({ name, value })), [aiGenerations]);

    const modelData = useMemo(() => Object.entries(aiGenerations.reduce((acc: Record<string, number>, g) => {
        acc[g.model] = (acc[g.model] || 0) + 1;
        return acc;
    }, {})).map(([name, value]) => ({ name, value })), [aiGenerations]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border"><h3 className="text-lg font-semibold text-gray-800 mb-4">模型分布</h3><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={modelData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#82ca9d" paddingAngle={5} label>{modelData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><RechartsTooltip /></PieChart></ResponsiveContainer></div>
            <div className="bg-white p-6 rounded-lg shadow-sm border"><h3 className="text-lg font-semibold text-gray-800 mb-4">风格分布</h3><ResponsiveContainer width="100%" height={400}><BarChart data={styleData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={80} /><RechartsTooltip /><Legend /><Bar dataKey="value" name="数量" fill="#8884d8" /></BarChart></ResponsiveContainer></div>
        </div>
    );
};

const AIGenerationManagement: React.FC<{
    aiModelConfig: AIModelConfig;
    generationStyles: AIGenerationStyle[];
}> = ({ aiModelConfig, generationStyles }) => {
    const [activeTab, setActiveTab] = useState<'list' | 'distribution'>('list');

    const [loading, setLoading] = useState(false);
    const [aiGenerationsRecords, setAiGenerationsRecords] = useState<AIGenerationRecords[]>([]);
    
    // Define getdata function properly
    const getdata = async () => {
        setLoading(true);
        try {
            const res = await fetch(`https://sg.api.eyewind.cn/etl/imagen/records/load`, {
                "headers": {
                    "accept": "*/*",
                    "accept-language": "zh-CN,zh;q=0.9",
                    "cache-control": "no-cache",
                    "content-type": "application/json",
                    "pragma": "no-cache",
                    "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"macOS\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "cross-site"
                },
                "body": "{\"limit\":1000}",
                "method": "POST",
                "mode": "cors",
                "credentials": "omit"
            }).then(r => r.json());
            return res.data;
        } catch (e) {
            console.error(e);
            return [];
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getdata();
                if (Array.isArray(data)) {
                    setAiGenerationsRecords(data);
                } else {
                    setAiGenerationsRecords([]);
                }
            } catch (error) {
                console.error("获取数据失败:", error);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-800">用户生图记录</h1>
                <p className="text-gray-500 mt-1">审查、筛选和分析所有用户生成的图片记录。</p>
            </div>
            <div className="border-b border-gray-200 flex-shrink-0">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('list')} className={`${activeTab === 'list' ? 'border-primary text-primary' : 'border-transparent text-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>生图列表</button>
                    <button onClick={() => setActiveTab('distribution')} className={`${activeTab === 'distribution' ? 'border-primary text-primary' : 'border-transparent text-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>AI 生图分布</button>
                </nav>
            </div>
            <div className="flex-1 min-h-0">
                {activeTab === 'list' ? <AIGenerationList loading={loading} aiGenerations={aiGenerationsRecords} aiModelConfig={aiModelConfig} generationStyles={generationStyles} /> : <AIGenerationDistribution aiGenerations={aiGenerationsRecords} />}
            </div>
        </div>
    );
};

export default AIGenerationManagement;
