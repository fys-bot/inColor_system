
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { API_BASE } from '../utils/api';
import { AIGenerationModel, AIGenerationSize, AIGenerationStyle, AIModelConfig, AIGenerationRecords } from '../types';
import { useImagePreview } from '../context/ImagePreviewContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Modal from '../components/shared/Modal';
import { DownloadIcon, FilterIcon, ChevronUpIcon, ChevronDownIcon, CloseIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '../components/shared/Icons';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/shared/Spinner';
import Tooltip from '../components/shared/Tooltip';


declare var JSZip: any;

const filterLabelMap: { [key: string]: string } = {
    model: '模型名称',
    ratio: '尺寸', style: '风格', uid: '用户 ID',
    prompt: '提示词内容', startDate: '开始时间', endDate: '结束时间',
    platform: '操作系统', clientVersion: '应用版本', mode: '生图类型'
};

// 将小数比例转换为易读的比例格式（如 1:1、3:4、4:3）
const formatRatioDisplay = (ratio: number): string => {
    if (!ratio || isNaN(ratio)) return '1:1';
    
    const ratioMap: { [key: string]: string } = {
        '1.00': '1:1',
        '0.75': '3:4',
        '1.33': '4:3',
        '1.34': '4:3',
        '0.56': '9:16',
        '1.78': '16:9',
        '1.77': '16:9',
        '1.43': '3:2',
        '0.67': '2:3',
        '0.80': '4:5',
        '1.25': '5:4',
    };
    
    const key = ratio.toFixed(2);
    if (ratioMap[key]) return ratioMap[key];
    
    // 如果没有匹配的预设，尝试计算最接近的整数比例
    if (ratio >= 1) {
        const height = 1;
        const width = Math.round(ratio * 10) / 10;
        if (Number.isInteger(width)) return `${width}:${height}`;
        return `${Math.round(ratio * 4)}:4`;
    } else {
        const width = 1;
        const height = Math.round((1 / ratio) * 10) / 10;
        if (Number.isInteger(height)) return `${width}:${height}`;
        return `4:${Math.round(4 / ratio)}`;
    }
};

// mode 字段中英文映射
const modeDisplayMap: { [key: string]: string } = {
    'mood': '心情生图',
    'doodle': '涂鸦生图',
    'photo': '照片生图',
};
const formatModeDisplay = (mode: string | undefined | null): string => {
    if (!mode) return '文生图';
    return modeDisplayMap[mode] || mode;
};

// Use literal union to avoid symbol/number key issues during mapping
type FilterableField = 'model' | 'ratio' | 'style' | 'uid' | 'prompt' | 'platform' | 'clientVersion' | 'mode' | 'startDate' | 'endDate';
const filterFields: FilterableField[] = ['model', 'ratio', 'style', 'platform', 'clientVersion', 'mode', 'uid', 'prompt', 'startDate', 'endDate'];

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
                                {options.map(o => <option key={o} value={o}>{fieldKey === 'mode' ? (modeDisplayMap[String(o)] || o) : o}</option>)}
                            </select>
                        ) : (
                            <input 
                                type={fieldKey.includes('Date') ? 'date' : 'text'} 
                                placeholder={`筛选 ${filterLabelMap[fieldKey] || fieldKey}`} 
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
    aiModelConfig: AIModelConfig;
    generationStyles: AIGenerationStyle[];
}

const AIGenerationList: React.FC<AIGenerationListProps> = ({ aiModelConfig, generationStyles }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [aiGenerations, setAiGenerations] = useState<AIGenerationRecords[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [zipFileName, setZipFileName] = useState('');

    // 分页状态
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [jumpPage, setJumpPage] = useState('');

    // 筛选选项（从独立接口获取，打开筛选面板时懒加载）
    const [filterOptions, setFilterOptions] = useState<{
        models: string[];
        styles: string[];
        ratios: string[];
        platforms: string[];
        modes: string[];
        clientVersions: string[];
    }>({ models: [], styles: [], ratios: [], platforms: [], modes: [], clientVersions: [] });
    const [filterOptionsLoaded, setFilterOptionsLoaded] = useState(false);

    // Custom Preview State
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    const [filters, setFilters] = useState<{ [key: string]: string | number }>({});

    const handleFilterChange = (field: string, value: string) => setFilters(prev => ({ ...prev, [field]: value }));
    
    // 加载数据
    const loadData = async (page = currentPage) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/imagen/records`, {
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ 
                    page,
                    pageSize,
                    startDate: filters.startDate || undefined,
                    endDate: filters.endDate || undefined,
                }),
                method: "POST",
            }).then(r => r.json());
            
            const data = res.data || {};
            setAiGenerations(data.list || []);
            if (data.pagination) {
                setTotalRecords(data.pagination.total);
                setTotalPages(data.pagination.totalPages);
                setCurrentPage(data.pagination.page);
            }
        } catch (e) {
            console.error(e);
            setAiGenerations([]);
        } finally {
            setLoading(false);
        }
    };

    // 切换页码
    const handlePageChange = (page: number) => {
        if (page < 1 || page > totalPages || page === currentPage) return;
        setCurrentPage(page);
        setJumpPage('');
        loadData(page);
    };

    // 切换每页条数
    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setCurrentPage(1);
        setJumpPage('');
        // 重新加载数据
        setLoading(true);
        fetch(`${API_BASE}/api/imagen/records`, {
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ 
                page: 1,
                pageSize: newPageSize,
                startDate: filters.startDate || undefined,
                endDate: filters.endDate || undefined,
            }),
            method: "POST",
        }).then(r => r.json()).then(res => {
            const data = res.data || {};
            setAiGenerations(data.list || []);
            if (data.pagination) {
                setTotalRecords(data.pagination.total);
                setTotalPages(data.pagination.totalPages);
                setCurrentPage(data.pagination.page);
            }
        }).catch(e => {
            console.error(e);
            setAiGenerations([]);
        }).finally(() => {
            setLoading(false);
        });
    };

    // 应用筛选（重新加载数据，回到第一页，只传筛选字段）
    const applyFilters = async () => { 
        setLoading(true);
        setCurrentPage(1);
        try {
            const res = await fetch(`${API_BASE}/api/imagen/records`, {
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ 
                    // 只传筛选字段，不传 page/pageSize，后端默认 page=1, pageSize=20
                    startDate: filters.startDate || undefined,
                    endDate: filters.endDate || undefined,
                    model: filters.model || undefined,
                    style: filters.style || undefined,
                    ratio: filters.ratio || undefined,
                    uid: filters.uid || undefined,
                    prompt: filters.prompt || undefined,
                    platform: filters.platform || undefined,
                    clientVersion: filters.clientVersion || undefined,
                    mode: filters.mode || undefined,
                }),
                method: "POST",
            }).then(r => r.json());
            
            const data = res.data || {};
            setAiGenerations(data.list || []);
            if (data.pagination) {
                setTotalRecords(data.pagination.total);
                setTotalPages(data.pagination.totalPages);
                setCurrentPage(data.pagination.page);
                setPageSize(data.pagination.pageSize);
            }
        } catch (e) {
            console.error(e);
            setAiGenerations([]);
        } finally {
            setLoading(false);
        }
    };
    const resetFilters = async () => { 
        setFilters({}); 
        setCurrentPage(1);
        setLoading(true);
        try {
            // 重置后不传任何筛选字段
            const res = await fetch(`${API_BASE}/api/imagen/records`, {
                headers: { "content-type": "application/json" },
                body: JSON.stringify({}),
                method: "POST",
            }).then(r => r.json());
            
            const data = res.data || {};
            setAiGenerations(data.list || []);
            if (data.pagination) {
                setTotalRecords(data.pagination.total);
                setTotalPages(data.pagination.totalPages);
                setCurrentPage(data.pagination.page);
                setPageSize(data.pagination.pageSize);
            }
        } catch (e) {
            console.error(e);
            setAiGenerations([]);
        } finally {
            setLoading(false);
        }
    };

    // 懒加载筛选选项（打开筛选面板时才请求）
    const loadFilterOptions = async () => {
        if (filterOptionsLoaded) return;
        try {
            const res = await fetch(API_BASE + '/api/imagen/filter-options').then(r => r.json());
            if (res.data) {
                setFilterOptions({
                    models: res.data.models || [],
                    styles: res.data.styles || [],
                    ratios: res.data.ratios || [],
                    platforms: res.data.platforms || [],
                    modes: res.data.modes || [],
                    clientVersions: res.data.clientVersions || [],
                });
                setFilterOptionsLoaded(true);
            }
        } catch (e) {
            console.error('加载筛选选项失败:', e);
        }
    };

    // 初始加载
    useEffect(() => {
        loadData(1);
    }, []);

    const filterOptionsMap: { [key: string]: (string | number)[] } = useMemo(() => ({
        ratio: filterOptions.ratios,
        model: filterOptions.models,
        style: filterOptions.styles,
        platform: filterOptions.platforms || [],
        mode: filterOptions.modes || [],
        clientVersion: filterOptions.clientVersions || [],
    }), [filterOptions]);

    const filteredGenerations = aiGenerations;

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

    const handleOpenDownloadModal = () => {
        if (selectedRows.size === 0) return;
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const defaultName = `incolor-ai-generations-${dateStr}-${timeStr}`;
        setZipFileName(defaultName);
        setShowDownloadModal(true);
    };

    const handleBatchDownload = async () => {
        if (selectedRows.size === 0) return;
        setShowDownloadModal(false);
        setIsDownloading(true);
        showToast(`正在准备 ${selectedRows.size} 个文件...`, 'info');

        try {
            const selectedGenerations = aiGenerations.filter(gen => selectedRows.has(gen.id));
            
            // 准备下载数据
            const urls = selectedGenerations.map(gen => ({
                id: gen.id,
                url: gen.URL
            }));

            // 调用服务器端批量下载接口
            const response = await fetch(API_BASE + '/api/batch-download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    urls, 
                    filename: zipFileName || 'incolor-ai-generations' 
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            // 直接下载返回的 ZIP 文件
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${zipFileName || 'incolor-ai-generations'}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            showToast('文件已成功下载!', 'success');
            setSelectedRows(new Set());

        } catch (error: any) {
            console.error("Failed to download:", error);
            showToast(error.message || '下载失败，请确保服务器已启动', 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    const tableHeaders = ['模型名称', '尺寸', '风格', '操作系统', '应用版本', '生图类型', '用户 ID', '提示词内容', '提示词翻译', '生图时间', '图片'];

    return (
        <div className="bg-white rounded-lg shadow-md border flex flex-col h-full">
            <div className="flex-shrink-0">
                <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-2 border-b">
                    <button onClick={() => { if (!isFilterVisible) loadFilterOptions(); setIsFilterVisible(!isFilterVisible); }} className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100">
                        <FilterIcon className="w-5 h-5" />
                        <span>{isFilterVisible ? '隐藏筛选' : '显示筛选'}</span>
                        {isFilterVisible ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                    </button>
                    <button onClick={handleOpenDownloadModal} disabled={selectedRows.size === 0 || isDownloading} className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300">
                        {isDownloading ? <Spinner size="sm" /> : <DownloadIcon className="w-5 h-5" />}
                        <span>{isDownloading ? '正在打包...' : '批量下载为 ZIP 文件'}</span>
                    </button>
                </div>
                {isFilterVisible && <FilterPanel filters={filters as { [key: string]: string }} onFilterChange={handleFilterChange} onApply={applyFilters} onReset={resetFilters} filterOptionsMap={filterOptionsMap} />}
            </div>

            <div className="flex-1 overflow-auto min-h-0">
                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Spinner size="lg" />
                        <p className="mt-4 text-gray-500">正在加载数据...</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredGenerations.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-500 text-lg font-medium">暂无生图记录</p>
                        <p className="text-gray-400 text-sm mt-1">当前没有符合条件的数据</p>
                    </div>
                )}

                {/* Mobile Card View */}
                {!loading && filteredGenerations.length > 0 && (
                <div className="lg:hidden">
                    <div className="p-4 bg-gray-50 flex items-center space-x-3 border-b">
                        <input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} checked={selectedRows.size > 0 && selectedRows.size === filteredGenerations.length} />
                        <label className="text-sm font-medium text-gray-600">选择全部</label>
                    </div>
                    <div className="divide-y divide-gray-200">
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
                                        <div><strong className="font-medium text-gray-600">操作系统:</strong> {gen.platform || '-'}</div>
                                        <div><strong className="font-medium text-gray-600">应用版本:</strong> {gen.clientVersion || '-'}</div>
                                        <div><strong className="font-medium text-gray-600">生图类型:</strong> {formatModeDisplay(gen.mode)}</div>
                                    </div>
                                ))}
                    </div>
                </div>
                )}

                {/* Desktop Table View */}
                {!loading && filteredGenerations.length > 0 && (
                <div className="hidden lg:block">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="p-4 bg-gray-50 sticky left-0 z-20">
                                    <input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} checked={selectedRows.size > 0 && selectedRows.size === filteredGenerations.length} className="form-checkbox h-4 w-4 text-primary rounded focus:ring-primary" />
                                </th>
                                {tableHeaders.map(h => <th key={h} scope="col" className="py-3 px-3 whitespace-nowrap bg-gray-50 text-xs">{h}</th>)}
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
                                    <td className="py-4 px-3 text-xs whitespace-nowrap">{gen.model}</td>
                                    <td className="py-4 px-3 text-center">{typeof gen.ratio === 'number' ? formatRatioDisplay(gen.ratio) : '1:1'}</td>
                                    <td className="py-4 px-3 whitespace-nowrap">{gen.style}</td>
                                    <td className="py-4 px-3 text-center">{gen.platform || '-'}</td>
                                    <td className="py-4 px-3 text-center">{gen.clientVersion || '-'}</td>
                                    <td className="py-4 px-3 text-center">{formatModeDisplay(gen.mode)}</td>
                                    <td className="py-4 px-3 text-xs font-mono">{gen.uid}</td>
                                    <td className="py-4 px-3 max-w-[200px]">
                                        <p className="break-words text-gray-800 text-xs line-clamp-3" title={gen.prompt}>{gen.prompt}</p>
                                    </td>
                                    <td className="py-4 px-3 max-w-[160px]">
                                        <p className="truncate text-xs" title={gen.description_zh}>{gen.description_zh}</p>
                                    </td>
                                    <td className="py-4 px-3 whitespace-nowrap text-xs">{new Date(gen.createdAt).toLocaleString()}</td>
                                    <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                                        <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center">
                                            <img src={gen.URL} alt="generated" className="max-h-full max-w-full object-contain rounded-md cursor-pointer bg-white" onClick={(e) => { e.stopPropagation(); handleOpenPreview(index); }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}
            </div>

            {/* Pagination - 始终显示 */}
            {totalPages > 0 && (
                <div className={`flex-shrink-0 border-t bg-white px-4 py-3 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
                        {/* 左侧：记录信息和每页条数 */}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>
                                共 <span className="font-medium text-gray-700">{totalRecords}</span> 条记录
                            </span>
                            <div className="flex items-center gap-2">
                                <span>每页</span>
                                <select 
                                    value={pageSize} 
                                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                    className="border rounded px-2 py-1 text-sm bg-white"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span>条</span>
                            </div>
                        </div>

                        {/* 中间：分页按钮 */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handlePageChange(1)}
                                disabled={currentPage === 1}
                                className="px-2 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="首页"
                            >
                                首页
                            </button>
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-2 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            
                            {/* Page Numbers */}
                            <div className="flex items-center gap-1">
                                {(() => {
                                    const pages: (number | string)[] = [];
                                    if (totalPages <= 7) {
                                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                                    } else {
                                        if (currentPage <= 4) {
                                            pages.push(1, 2, 3, 4, 5, '...', totalPages);
                                        } else if (currentPage >= totalPages - 3) {
                                            pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                                        } else {
                                            pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                                        }
                                    }
                                    return pages.map((p, idx) => 
                                        p === '...' ? (
                                            <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">...</span>
                                        ) : (
                                            <button
                                                key={p}
                                                onClick={() => handlePageChange(p as number)}
                                                className={`min-w-[32px] h-8 text-sm rounded-md ${currentPage === p ? 'bg-primary text-white' : 'border hover:bg-gray-50'}`}
                                            >
                                                {p}
                                            </button>
                                        )
                                    );
                                })()}
                            </div>

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-2 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handlePageChange(totalPages)}
                                disabled={currentPage === totalPages}
                                className="px-2 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="末页"
                            >
                                末页
                            </button>
                        </div>

                        {/* 右侧：跳转 */}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>第 {currentPage} / {totalPages} 页</span>
                            <span className="text-gray-300">|</span>
                            <span>跳至</span>
                            <input
                                type="number"
                                min={1}
                                max={totalPages}
                                value={jumpPage}
                                onChange={(e) => setJumpPage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const page = parseInt(jumpPage, 10);
                                        if (page >= 1 && page <= totalPages) {
                                            handlePageChange(page);
                                        }
                                    }
                                }}
                                className="w-16 border rounded px-2 py-1 text-sm text-center"
                                placeholder="页码"
                            />
                            <button
                                onClick={() => {
                                    const page = parseInt(jumpPage, 10);
                                    if (page >= 1 && page <= totalPages) {
                                        handlePageChange(page);
                                    }
                                }}
                                className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                            >
                                跳转
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">图片详情</h3>
                                <button onClick={handleClosePreview} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2">
                                    <ChevronLeftIcon className="w-4 h-4" />
                                    返回列表
                                </button>
                            </div>
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
                                        <p className="text-sm text-gray-800 mt-1">{typeof filteredGenerations[previewIndex].ratio === 'number' ? formatRatioDisplay(filteredGenerations[previewIndex].ratio) : '1:1'}</p>
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
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase">系统</label>
                                        <p className="text-sm text-gray-800 mt-1">{filteredGenerations[previewIndex].platform || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase">版本</label>
                                        <p className="text-sm text-gray-800 mt-1">{filteredGenerations[previewIndex].clientVersion || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase">类型</label>
                                        <p className="text-sm text-gray-800 mt-1">{formatModeDisplay(filteredGenerations[previewIndex].mode)}</p>
                                    </div>
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

            {/* Download Modal */}
            <Modal 
                isOpen={showDownloadModal} 
                onClose={() => setShowDownloadModal(false)} 
                title="批量下载为 ZIP"
                maxWidth="md"
            >
                <div className="space-y-6">
                    <div>
                        <p className="text-gray-600 mb-4">
                            您已选择 <span className="font-bold text-primary">{selectedRows.size}</span> 个文件进行下载。
                        </p>
                        <div>
                            <label htmlFor="zipFileName" className="block text-sm font-medium text-gray-700 mb-2">
                                ZIP 文件名
                            </label>
                            <input
                                id="zipFileName"
                                type="text"
                                value={zipFileName}
                                onChange={(e) => setZipFileName(e.target.value)}
                                placeholder="请输入文件名（不含 .zip 后缀）"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                文件将保存为: <span className="font-mono font-semibold text-gray-700">{zipFileName || '(请输入文件名)'}.zip</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <button
                            onClick={() => setShowDownloadModal(false)}
                            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleBatchDownload}
                            disabled={!zipFileName.trim()}
                            className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            开始下载
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const AIGenerationManagement: React.FC<{
    aiModelConfig: AIModelConfig;
    generationStyles: AIGenerationStyle[];
}> = ({ aiModelConfig, generationStyles }) => {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19AF'];
    const [showDistribution, setShowDistribution] = useState(false);
    const [modelData, setModelData] = useState<{name: string; value: number}[]>([]);
    const [styleData, setStyleData] = useState<{name: string; value: number}[]>([]);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsLoaded, setStatsLoaded] = useState(false);

    // 加载分布数据
    const loadStats = async () => {
        setStatsLoading(true);
        try {
            const res = await fetch(API_BASE + '/api/imagen/stats').then(r => r.json());
            if (res.data) {
                setModelData(res.data.modelData || []);
                setStyleData(res.data.styleData || []);
                setStatsLoaded(true);
            }
        } catch (e) {
            console.error('加载统计数据失败:', e);
        } finally {
            setStatsLoading(false);
        }
    };

    const handleToggleDistribution = () => {
        if (!showDistribution && !statsLoaded) {
            loadStats();
        }
        setShowDistribution(!showDistribution);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">用户生图记录</h1>
                    <p className="text-gray-500 mt-1">审查、筛选和分析所有用户生成的图片记录。</p>
                </div>
                <button
                    onClick={handleToggleDistribution}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${showDistribution ? 'bg-primary text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                    {showDistribution ? '收起数据分析' : '📊 数据分析'}
                </button>
            </div>

            {/* 数据分布（可折叠） */}
            {showDistribution && (
                <div className="flex-shrink-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">模型分布</h3>
                        {statsLoading ? (
                            <div className="flex items-center justify-center h-[300px]"><Spinner size="lg" /></div>
                        ) : modelData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={modelData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#82ca9d" paddingAngle={5} label>
                                        {modelData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-gray-400">暂无数据</div>
                        )}
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">风格分布</h3>
                        {statsLoading ? (
                            <div className="flex items-center justify-center h-[300px]"><Spinner size="lg" /></div>
                        ) : styleData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={styleData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="name" width={80} />
                                    <RechartsTooltip />
                                    <Legend />
                                    <Bar dataKey="value" name="数量" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-gray-400">暂无数据</div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 min-h-0">
                <AIGenerationList aiModelConfig={aiModelConfig} generationStyles={generationStyles} />
            </div>
        </div>
    );
};

export default AIGenerationManagement;
