
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Asset, ThemedBook, AIModelConfig, AssetTypeInfo, ArtistInfo, UserCreation } from '../types';
import { useImagePreview } from '../context/ImagePreviewContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../utils/api';
import Modal from '../components/shared/Modal';
import { 
    EyeIcon, EyeOffIcon, DocumentTextIcon, TagIcon, PlusIcon, 
    FilterIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon,
    SearchIcon, PaletteIcon, BookOpenIcon, CheckIcon, TrashIcon,
    UserIcon, CloudUploadIcon, CloseIcon, HeartIcon, RefreshCwIcon
} from '../components/shared/Icons';
import Spinner from '../components/shared/Spinner';
import Tooltip from '../components/shared/Tooltip';
import { triggerHaptic, btnClickable, cardHover } from '../utils/ux';

// --- 上传素材类型/分类常量 ---
const UPLOAD_TYPES = [
    { value: 'normal', label: '普通素材' },
    { value: 'activity', label: '活动素材' },
    { value: 'daily', label: '每日素材' },
    { value: 'gray', label: '高级涂色' },
] as const;

const CATEGORY_OPTIONS = [
    'Animals', 'Birds', 'Blessings', 'Butterfly', 'Comics and Doodles',
    'Creative Abstract', 'Fashion', 'Flowers and Plants', 'Folk Culture',
    'Holidays and Seasons', 'Mandala', 'Ocean', 'People', 'Pop Art', 'Scenery', 'Text Message',
];

// --- 子组件：上传素材弹窗 ---
const UploadAssetModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadType, setUploadType] = useState<string>('normal');
    const [category, setCategory] = useState<string>('');
    const [searchTags, setSearchTags] = useState<string>('');
    const [adUnlock, setAdUnlock] = useState<boolean>(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
    const [uploadResults, setUploadResults] = useState<{ file: string; ok: boolean; msg?: string }[]>([]);

    // 重置表单
    const resetForm = useCallback(() => {
        setUploadType('normal');
        setCategory('');
        setSearchTags('');
        setAdUnlock(false);
        setSelectedFiles([]);
        setPreviews([]);
        setUploadResults([]);
        setUploadProgress({ done: 0, total: 0 });
    }, []);

    const handleClose = () => {
        if (uploading) return;
        resetForm();
        onClose();
    };

    // 自动生成文件名: yyyyMMdd-毫秒时间戳后4位-序号
    const renameFiles = (files: File[], startIndex: number): File[] => {
        return files.map((file, i) => {
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            const ms4 = String(now.getTime()).slice(-4);
            const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '.png';
            const autoName = `${dateStr}-${ms4}-${startIndex + i}${ext}`;
            return new File([file], autoName, { type: file.type });
        });
    };

    // 选择文件
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;
        const raw = Array.from(fileList) as File[];
        const files = renameFiles(raw, selectedFiles.length);
        setSelectedFiles(prev => [...prev, ...files]);
        files.forEach(f => {
            const reader = new FileReader();
            reader.onload = (ev) => setPreviews(prev => [...prev, ev.target?.result as string]);
            reader.readAsDataURL(f);
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (idx: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
        setPreviews(prev => prev.filter((_, i) => i !== idx));
    };

    // 拖拽
    const [dragOver, setDragOver] = useState(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const raw = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
        if (raw.length === 0) return;
        const files = renameFiles(raw, selectedFiles.length);
        setSelectedFiles(prev => [...prev, ...files]);
        files.forEach(f => {
            const reader = new FileReader();
            reader.onload = (ev) => setPreviews(prev => [...prev, ev.target?.result as string]);
            reader.readAsDataURL(f);
        });
    };

    // 上传
    const handleUpload = async () => {
        if (selectedFiles.length === 0) { showToast('请先选择图片', 'error'); return; }
        if (uploadType === 'normal' && !category) { showToast('普通素材需要选择分类', 'error'); return; }

        setUploading(true);
        setUploadResults([]);
        setUploadProgress({ done: 0, total: selectedFiles.length });

        const results: { file: string; ok: boolean; msg?: string }[] = [];

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const formData = new FormData();
            formData.append('type', uploadType);
            formData.append('img', file);
            if (searchTags.trim()) formData.append('searchTags', searchTags.trim());
            if (uploadType === 'normal') {
                if (category) formData.append('category', category);
                if (adUnlock) formData.append('ad', '1');
            }

            try {
                const res = await fetch(API_BASE + '/api/import-img', {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                results.push({ file: file.name, ok: data.success, msg: data.success ? '上传成功' : (data.error || '未知错误') });
            } catch (e: any) {
                results.push({ file: file.name, ok: false, msg: e.message });
            }
            setUploadProgress({ done: i + 1, total: selectedFiles.length });
            setUploadResults([...results]);
        }

        setUploading(false);
        const successCount = results.filter(r => r.ok).length;
        if (successCount > 0) {
            // 上传成功后调用 updateContentConfig 让 app 可见
            try {
                showToast('正在更新素材配置...', 'info');
                const configRes = await fetch(API_BASE + '/api/update-content-config');
                const configData = await configRes.json();
                if (configData.success) {
                    showToast(`全部上传完成，素材配置已更新 (${configData.data?.count || 0} 张)`, 'success');
                } else {
                    showToast(`上传成功但配置更新失败: ${configData.error}`, 'error');
                }
            } catch (e: any) {
                showToast(`上传成功但配置更新请求失败: ${e.message}`, 'error');
            }
        }
        if (successCount < results.length) {
            showToast(`${successCount}/${results.length} 张上传成功`, successCount > 0 ? 'success' : 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="上传素材" maxWidth="3xl">
            <div className="space-y-6">
                {/* 类型选择 */}
                <div className="grid grid-cols-4 gap-3">
                    {UPLOAD_TYPES.map(t => (
                        <button
                            key={t.value}
                            onClick={() => setUploadType(t.value)}
                            className={`py-3 px-4 rounded-xl text-sm font-bold transition-all border-2 ${
                                uploadType === t.value
                                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* normal 类型的额外选项 */}
                {uploadType === 'normal' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">分类 (必选)</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl text-sm py-2.5 px-3 focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                            >
                                <option value="">请选择分类...</option>
                                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-3 cursor-pointer select-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 w-full hover:bg-gray-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={adUnlock}
                                    onChange={(e) => setAdUnlock(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                                />
                                <span className="text-sm text-gray-600 font-medium">看广告解锁</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* 搜索标签 */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">搜索标签 (可选，英文逗号分隔)</label>
                    <input
                        type="text"
                        value={searchTags}
                        onChange={(e) => setSearchTags(e.target.value)}
                        placeholder="例如: cat, animal, cute"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl text-sm py-2.5 px-3 focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                    />
                    <p className="text-xs text-gray-400 mt-1">不填也可以，上传接口会自动解析图片生成标签</p>
                </div>

                {/* 文件选择区域 */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                        dragOver
                            ? 'border-primary bg-primary/5 scale-[1.01]'
                            : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'
                    }`}
                >
                    <CloudUploadIcon className={`w-12 h-12 mx-auto mb-3 ${dragOver ? 'text-primary' : 'text-gray-300'}`} />
                    <p className="text-sm font-bold text-gray-500">点击或拖拽图片到此处</p>
                    <p className="text-xs text-gray-400 mt-1">支持 PNG、JPG、WebP，可多选</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>

                {/* 已选文件预览 */}
                {previews.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">已选择 {selectedFiles.length} 张图片</span>
                            {!uploading && (
                                <button onClick={() => { setSelectedFiles([]); setPreviews([]); setUploadResults([]); }} className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors">
                                    清空全部
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                            {previews.map((src, idx) => {
                                const result = uploadResults[idx];
                                return (
                                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm">
                                        <img src={src} className="w-full h-full object-cover" />
                                        {/* 上传结果覆盖层 */}
                                        {result && (
                                            <div className={`absolute inset-0 flex items-center justify-center ${result.ok ? 'bg-green-500/60' : 'bg-red-500/60'}`}>
                                                {result.ok
                                                    ? <CheckIcon className="w-6 h-6 text-white" />
                                                    : <CloseIcon className="w-6 h-6 text-white" />
                                                }
                                            </div>
                                        )}
                                        {/* 删除按钮 */}
                                        {!uploading && !result && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                                            >
                                                <CloseIcon className="w-3 h-3" />
                                            </button>
                                        )}
                                        <span className="absolute bottom-1 left-1 text-[9px] bg-black/40 text-white px-1.5 py-0.5 rounded-md truncate max-w-[90%]">
                                            {selectedFiles[idx]?.name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 上传进度 */}
                {uploading && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 font-medium flex items-center gap-2"><Spinner size="sm" /> 上传中...</span>
                            <span className="text-primary font-bold">{uploadProgress.done}/{uploadProgress.total}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-primary h-full rounded-full transition-all duration-300"
                                style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* 操作按钮 */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={handleClose}
                        disabled={uploading}
                        className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                        {uploadResults.length > 0 ? '关闭' : '取消'}
                    </button>
                    {uploadResults.length === 0 && (
                        <button
                            onClick={handleUpload}
                            disabled={uploading || selectedFiles.length === 0}
                            className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
                        >
                            <CloudUploadIcon className="w-4 h-4" />
                            开始上传
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

// --- 子组件：资产卡片 ---
const AssetCard: React.FC<{ 
    asset: Asset; 
    onDetails: (asset: Asset) => void;
    index: number;
}> = ({ asset, onDetails, index }) => {
    const { showPreview } = useImagePreview();
    return (
        <div 
            className={`stagger-item bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden group shadow-sm ${cardHover}`}
            style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s` }}
        >
            <div className="aspect-square overflow-hidden relative cursor-zoom-in bg-white border-b border-gray-50" onClick={(e) => { e.stopPropagation(); showPreview(asset.imageUrl); }}>
                <img src={asset.imageUrl} alt={asset.id} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                {asset.id.toLowerCase().includes('ai') && (
                    <div className="absolute top-0 left-0 bg-primary/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-br-xl shadow-sm text-[10px] font-black tracking-wider z-10">
                        AI
                    </div>
                )}
            </div>
            <div className="p-3">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-mono font-bold text-gray-400">#{asset.id}</p>
                    <button onClick={() => onDetails(asset)} className={`p-1 text-gray-400 hover:text-primary transition-colors ${btnClickable}`}>
                        <DocumentTextIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                    {asset.style && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold">{asset.style}</span>}
                    {asset.aiCategory && <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-bold">{asset.aiCategory}</span>}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <TagIcon className="w-3 h-3" />
                    <span className="truncate">{asset.tags?.join(', ') || '无标签'}</span>
                </div>
            </div>
        </div>
    );
};

// --- 子组件：普通书本卡片 ---
const NormalBookCard: React.FC<{
    book: ThemedBook;
    onClick: () => void;
    index: number;
}> = ({ book, onClick, index }) => (
    <div 
        className={`stagger-item flex flex-col cursor-pointer group animate-fade-in-up`}
        style={{ animationDelay: `${index * 0.08}s` }}
        onClick={onClick}
    >
        <div className="relative aspect-square rounded-xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 bg-white border border-gray-100">
            {/* Updated property: cover instead of coverUrl */}
            <img src={book.cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={book.name} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                {/* Updated property: name instead of title */}
                <h3 className="text-white font-bold text-lg leading-tight">{book.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                    {/* Updated property: patterns instead of assets */}
                    <span className="text-white/60 text-xs">{book.patterns?.length || 0} 张单图</span>
                    <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                    <span className="text-white/60 text-xs">{book.category}</span>
                </div>
            </div>
        </div>
    </div>
);

// --- 子组件：艺术家书本卡片 (11:6 Banner) ---
const ArtistBookCard: React.FC<{
    book: ThemedBook;
    onClick: () => void;
    index: number;
}> = ({ book, onClick, index }) => (
    <div 
        className={`stagger-item flex flex-col cursor-pointer group animate-fade-in-up`}
        style={{ animationDelay: `${index * 0.12}s` }}
        onClick={onClick}
    >
        <div className="relative aspect-[11/6] rounded-2xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-500 bg-white">
            {/* Updated property: cover (which is mapped to banner for artists) */}
            <img src={book.cover} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={book.name} />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-6">
                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        {/* Updated property: name */}
                        <h3 className="text-white font-black text-2xl tracking-tight leading-none">{book.name}</h3>
                        <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded uppercase tracking-widest">Artist Series</span>
                            {/* Updated property: patterns */}
                            <span className="text-white/60 text-xs font-medium">{book.patterns?.length || 0} 插图作品</span>
                        </div>
                    </div>
                    
                    {/* Artist Info Box */}
                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 transition-all group-hover:bg-white/20">
                        <img src={book.artistAvatar} className="w-8 h-8 rounded-full border border-white/50 shadow-sm" alt={book.artistName} />
                        <div className="flex flex-col">
                            <span className="text-white text-xs font-bold leading-none">{book.artistName}</span>
                            <span className="text-white/40 text-[9px] mt-1 uppercase tracking-tighter">Creator</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// --- 主页面组件 ---
const AssetManagement: React.FC<any> = (props) => {
    const { assets, setAssets, themedBooks, categories, generationStyles, assetTypes, activeTab, isLoading, refreshAssets } = props;
    const { showToast } = useToast();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { showPreview } = useImagePreview();

    // 状态
    const [singleSubTab, setSingleSubTab] = useState<string>('Categorized');
    const [bookSubTab, setBookSubTab] = useState<'normal' | 'artist'>('normal');
    const [selectedBook, setSelectedBook] = useState<ThemedBook | null>(null);
    const [searchId, setSearchId] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    
    // 筛选状态
    const [filters, setFilters] = useState({
        style: '',
        category: '',
        tag: ''
    });

    // 每个 tab 的记录数
    const assetCountByType = useMemo(() => {
        const counts: Record<string, number> = {};
        assets.forEach((a: Asset) => { counts[a.assetType] = (counts[a.assetType] || 0) + 1; });
        return counts;
    }, [assets]);

    // 逻辑：过滤单图
    const filteredSingleAssets = useMemo(() => {
        return assets.filter((a: Asset) => {
            const matchTab = a.assetType === singleSubTab;
            const matchId = searchId ? a.id.toLowerCase().includes(searchId.toLowerCase()) : true;
            const matchStyle = filters.style ? a.style === filters.style : true;
            const matchCat = filters.category ? a.aiCategory === filters.category : true;
            const matchTag = filters.tag ? a.tags?.some(t => t.includes(filters.tag)) : true;
            return matchTab && matchId && matchStyle && matchCat && matchTag;
        }).sort((a, b) => b.id.localeCompare(a.id));
    }, [assets, singleSubTab, searchId, filters]);

    // 逻辑：过滤书本
    const filteredBooks = useMemo(() => {
        // Updated to use book.name and check for tags type since raw data tags can be string
        return themedBooks.filter((b: ThemedBook) => {
            const matchType = bookSubTab === 'artist' ? b.isArtistBook === true : b.isArtistBook !== true;
            const matchId = searchId ? b.id.toString().toLowerCase().includes(searchId.toLowerCase()) : true;
            // Style is not always present in raw book data, so optional check
            const matchStyle = filters.style ? (b as any).style === filters.style : true; 
            const matchCat = filters.category ? b.category === filters.category : true;
            // Handle tags as string or array
            const bookTags = Array.isArray(b.tags) ? b.tags : (typeof b.tags === 'string' ? b.tags.split(',') : []);
            const matchTag = filters.tag ? bookTags.some((t: string) => t.includes(filters.tag)) : true;
            
            return matchType && matchId && matchStyle && matchCat && matchTag;
        });
    }, [themedBooks, bookSubTab, searchId, filters]);

    const handleBackToBooks = () => {
        triggerHaptic('light');
        setSelectedBook(null);
    };

    // 如果页面的 activeTab 改变了，重置书本的选择状态
    useEffect(() => {
        setSelectedBook(null);
    }, [activeTab]);

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Spinner size="lg" />
                <p className="text-gray-500 animate-pulse">正在加载素材库数据...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header Area */}
            <div className="flex-shrink-0 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">内置素材管理 - {activeTab === 'single' ? '单图' : '主题书本'}</h1>
                    <p className="text-gray-500 mt-1">
                        {activeTab === 'single' ? '管理分类图库与每日更新的单图资源。' : '管理成套的主题线稿填色书，支持普通图集与艺术家授权作品。'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            if (!refreshAssets) return;
                            setIsRefreshing(true);
                            const result = await refreshAssets();
                            setIsRefreshing(false);
                            if (result.success) {
                                showToast(`素材数据已刷新 (${result.count} 张)`, 'success');
                            } else {
                                showToast(`刷新失败: ${result.error}`, 'error');
                            }
                        }}
                        disabled={isRefreshing}
                        className={`flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-50 ${btnClickable}`}
                    >
                        <RefreshCwIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? '刷新中...' : '刷新数据'}
                    </button>
                    <button
                        onClick={() => { setShowUploadModal(true); triggerHaptic('medium'); }}
                        className={`flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 ${btnClickable}`}
                    >
                        <CloudUploadIcon className="w-4 h-4" />
                        上传素材
                    </button>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4 animate-fade-in-up">
                <div className="relative flex-1 min-w-[200px]">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="按图片/书本 ID 搜索..." 
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0">
                {activeTab === 'single' ? (
                    <div className="h-full flex flex-col space-y-4">
                        <div className="border-b border-gray-200 flex-shrink-0">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                {assetTypes.map((type: AssetTypeInfo) => (
                                    <button 
                                        key={type.id}
                                        onClick={() => { setSingleSubTab(type.id); triggerHaptic('light'); }}
                                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all ${
                                            singleSubTab === type.id 
                                                ? 'border-primary text-primary' 
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        {type.name}
                                        <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                                            singleSubTab === type.id 
                                                ? 'bg-primary/10 text-primary' 
                                                : 'bg-gray-100 text-gray-400'
                                        }`}>{assetCountByType[type.id] || 0}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                                {filteredSingleAssets.map((asset, idx) => (
                                    <AssetCard key={asset.id} asset={asset} index={idx} onDetails={setSelectedAsset} />
                                ))}
                                {filteredSingleAssets.length === 0 && (
                                    <div className="col-span-full py-20 text-center opacity-40">
                                        <PaletteIcon className="w-16 h-16 mx-auto mb-4" />
                                        <p className="text-lg">没有找到匹配的单图</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        {selectedBook ? (
                            <div className="h-full flex flex-col space-y-6 animate-fade-in-up">
                                <div className="flex items-center gap-4">
                                    <button onClick={handleBackToBooks} className={`p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-primary ${btnClickable}`}>
                                        <ChevronLeftIcon className="w-6 h-6" />
                                    </button>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            {/* Updated to book.name */}
                                            <h2 className="text-2xl font-bold text-gray-800">{selectedBook.name}</h2>
                                            {selectedBook.isArtistBook && <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-black rounded uppercase">Artist Special</span>}
                                        </div>
                                        {/* Updated to book.patterns */}
                                        <p className="text-sm text-gray-500">书本 ID: {selectedBook.id} · 共 {selectedBook.patterns?.length || 0} 张线稿</p>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 pb-10">
                                        {/* Updated to book.patterns */}
                                        {(selectedBook.patterns || []).map((asset, idx) => (
                                            <AssetCard key={asset.id} asset={asset} index={idx} onDetails={setSelectedAsset} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col space-y-4">
                                <div className="border-b border-gray-200 flex-shrink-0">
                                    <nav className="-mb-px flex space-x-8">
                                        <button 
                                            onClick={() => { setBookSubTab('normal'); triggerHaptic('light'); }}
                                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all ${
                                                bookSubTab === 'normal' 
                                                    ? 'border-primary text-primary' 
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            普通书本
                                        </button>
                                        <button 
                                            onClick={() => { setBookSubTab('artist'); triggerHaptic('light'); }}
                                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all flex items-center gap-2 ${
                                                bookSubTab === 'artist' 
                                                    ? 'border-primary text-primary' 
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            <SparklesIcon className={`w-4 h-4 ${bookSubTab === 'artist' ? 'text-primary' : 'text-gray-400'}`} />
                                            艺术家书本
                                        </button>
                                    </nav>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    {bookSubTab === 'normal' ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 pb-10">
                                            {filteredBooks.map((book, idx) => (
                                                <NormalBookCard key={book.id} book={book} index={idx} onClick={() => { setSelectedBook(book); triggerHaptic('medium'); }} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 pb-10">
                                            {filteredBooks.map((book, idx) => (
                                                <ArtistBookCard key={book.id} book={book} index={idx} onClick={() => { setSelectedBook(book); triggerHaptic('medium'); }} />
                                            ))}
                                        </div>
                                    )}
                                    
                                    {filteredBooks.length === 0 && (
                                        <div className="col-span-full py-20 text-center opacity-40">
                                            <BookOpenIcon className="w-16 h-16 mx-auto mb-4" />
                                            <p className="text-lg">没有找到匹配的主题书本</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Asset Detail Modal */}
            <AssetDetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} assets={filteredSingleAssets} onNavigate={setSelectedAsset} />

            {/* Upload Asset Modal */}
            <UploadAssetModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} />
        </div>
    );
};

// --- 子组件：资产详情及用户作品模态框 ---
const TYPE_LABEL_MAP: Record<string, string> = {
    Homepage: '主页图', Categorized: '分类图库', Daily: '每日更新',
    Activity: '活动图', Grayscale: '灰度图',
};
const TYPE_COLOR_MAP: Record<string, string> = {
    Homepage: 'bg-indigo-100 text-indigo-700', Categorized: 'bg-blue-100 text-blue-700',
    Daily: 'bg-amber-100 text-amber-700', Activity: 'bg-pink-100 text-pink-700',
    Grayscale: 'bg-gray-200 text-gray-700',
};

const AssetDetailModal: React.FC<{
    asset: Asset | null;
    onClose: () => void;
    assets: Asset[];
    onNavigate: (asset: Asset) => void;
}> = ({ asset, onClose, assets, onNavigate }) => {
    const { showPreview } = useImagePreview();
    const { showToast } = useToast();
    const [creations, setCreations] = useState<any[]>([]);
    const [creationsLoading, setCreationsLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const lastOffsetRef = useRef<number | undefined>(undefined);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    // 排序与筛选
    const [sortBy, setSortBy] = useState<'default' | 'likes' | 'newest'>('default');
    const [filterVip, setFilterVip] = useState(false);
    const [filterTime, setFilterTime] = useState<'all' | '7d' | '30d' | '90d' | '1y'>('all');
    // 搜索标签
    const [searchTags, setSearchTags] = useState('');
    const [searchTagsId, setSearchTagsId] = useState('');
    // 弹窗内搜索
    const [modalSearch, setModalSearch] = useState('');
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const searchDropdownRef = useRef<HTMLDivElement>(null);
    // hover 预览：鼠标悬停作品时在大图区域预览
    const [hoverImageUrl, setHoverImageUrl] = useState<string | null>(null);
    const [hoverCreation, setHoverCreation] = useState<any | null>(null);

    const handleHoverCreation = (uc: any) => {
        setHoverImageUrl(uc.imageUrl);
        setHoverCreation(uc);
    };
    const handleLeaveCreation = () => {
        setHoverImageUrl(null);
        setHoverCreation(null);
    };

    // 上一张 / 下一张导航
    const currentIndex = asset ? assets.findIndex(a => a.id === asset.id) : -1;
    const prevAsset = currentIndex > 0 ? assets[currentIndex - 1] : null;
    const nextAsset = currentIndex >= 0 && currentIndex < assets.length - 1 ? assets[currentIndex + 1] : null;

    // 搜索匹配结果（最多显示 20 条）
    const searchMatches = useMemo(() => {
        if (!modalSearch.trim()) return [];
        const q = modalSearch.trim().toLowerCase();
        return assets.filter(a => a.id.toLowerCase().includes(q)).slice(0, 20);
    }, [modalSearch, assets]);

    const handleSelectSearchResult = (a: Asset) => {
        onNavigate(a);
        setModalSearch('');
        setShowSearchDropdown(false);
    };

    // 点击外部关闭下拉
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    const [searchTagsLoading, setSearchTagsLoading] = useState(false);
    const [isEditingTags, setIsEditingTags] = useState(false);
    const [editTagsValue, setEditTagsValue] = useState('');
    const [savingTags, setSavingTags] = useState(false);

    const PAGE_SIZE = 30;

    const fetchPage = useCallback(async (pname: string, offset?: number) => {
        let url = `${API_BASE}/api/inspirations?pname=${encodeURIComponent(pname)}&limit=${PAGE_SIZE}`;
        if (offset !== undefined) url += `&offset=${offset}`;
        const res = await fetch(url).then(r => r.json());
        return (res.data || []) as any[];
    }, []);

    // 首次加载
    useEffect(() => {
        if (!asset) { setCreations([]); setHasMore(true); lastOffsetRef.current = undefined; setSearchTags(''); setSearchTagsId(''); setSortBy('default'); setFilterVip(false); setFilterTime('all'); setHoverImageUrl(null); setHoverCreation(null); return; }
        
        setCreationsLoading(true);
        setCreations([]);
        setHasMore(true);
        lastOffsetRef.current = undefined;

        fetchPage(asset.id)
            .then(batch => {
                setCreations(batch);
                setHasMore(batch.length >= PAGE_SIZE);
                if (batch.length > 0) lastOffsetRef.current = batch[batch.length - 1]?.createdAt;
            })
            .catch(() => { setCreations([]); setHasMore(false); })
            .finally(() => setCreationsLoading(false));

        // 获取搜索标签
        setSearchTagsLoading(true);
        setSearchTags('');
        setSearchTagsId('');
        setIsEditingTags(false);
        fetch(`${API_BASE}/api/search-tags?name=${encodeURIComponent(asset.id)}`)
            .then(r => r.json())
            .then(res => {
                if (res.data) {
                    setSearchTags(res.data.tags || '');
                    setSearchTagsId(res.data.id || '');
                }
            })
            .catch(() => {})
            .finally(() => setSearchTagsLoading(false));
    }, [asset?.id]);

    // 加载更多
    const loadMore = useCallback(async () => {
        if (!asset || loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const batch = await fetchPage(asset.id, lastOffsetRef.current);
            setCreations(prev => [...prev, ...batch]);
            setHasMore(batch.length >= PAGE_SIZE);
            if (batch.length > 0) lastOffsetRef.current = batch[batch.length - 1]?.createdAt;
        } catch (_) {
            setHasMore(false);
        } finally {
            setLoadingMore(false);
        }
    }, [asset, loadingMore, hasMore, fetchPage]);

    // 排序和筛选后的展示列表
    const displayedCreations = useMemo(() => {
        let list = [...creations];
        if (filterVip) list = list.filter((c: any) => c.subscribe);
        if (filterTime !== 'all') {
            const now = Date.now();
            const msMap: Record<string, number> = { '7d': 7 * 86400000, '30d': 30 * 86400000, '90d': 90 * 86400000, '1y': 365 * 86400000 };
            const cutoff = now - (msMap[filterTime] || 0);
            list = list.filter((c: any) => c.createdAt && Math.abs(c.createdAt) >= cutoff);
        }
        if (sortBy === 'likes') list.sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0));
        if (sortBy === 'newest') list.sort((a: any, b: any) => Math.abs(b.createdAt || 0) - Math.abs(a.createdAt || 0));
        return list;
    }, [creations, sortBy, filterVip, filterTime]);

    // IntersectionObserver 监听哨兵元素
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
            { root: scrollContainerRef.current, threshold: 0.1 }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMore]);

    const handleSaveTags = async () => {
        if (!searchTagsId) { showToast('无法保存：缺少标签 ID', 'error'); return; }
        setSavingTags(true);
        try {
            const res = await fetch(API_BASE + '/api/search-tags', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: searchTagsId, tags: editTagsValue }),
            }).then(r => r.json());
            if (res.success) {
                setSearchTags(editTagsValue);
                setIsEditingTags(false);
                showToast('搜索标签已更新', 'success');
            } else {
                showToast('保存失败: ' + (res.error || '未知错误'), 'error');
            }
        } catch (e: any) {
            showToast('保存失败: ' + e.message, 'error');
        } finally {
            setSavingTags(false);
        }
    };

    if (!asset) return null;

    return (
        <Modal isOpen={!!asset} onClose={onClose} title={
            <div className="flex items-center gap-3 flex-wrap min-w-0">
                {/* 面包屑：类型 > ID */}
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap ${TYPE_COLOR_MAP[asset.assetType] || 'bg-gray-100 text-gray-600'}`}>
                        {TYPE_LABEL_MAP[asset.assetType] || asset.assetType}
                    </span>
                    <span className="text-gray-300">/</span>
                    <span className="text-base font-bold text-gray-800 truncate">{asset.id}</span>
                </div>
                {/* 弹窗内搜索 */}
                <div className="flex items-center gap-1 ml-auto">
                    <div className="relative" ref={searchDropdownRef}>
                        <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 z-10" />
                        <input
                            type="text"
                            value={modalSearch}
                            onChange={e => { setModalSearch(e.target.value); setShowSearchDropdown(true); }}
                            onFocus={() => { if (modalSearch.trim()) setShowSearchDropdown(true); }}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && searchMatches.length > 0) {
                                    handleSelectSearchResult(searchMatches[0]);
                                } else if (e.key === 'Escape') {
                                    setShowSearchDropdown(false);
                                }
                            }}
                            placeholder="搜索图片ID..."
                            className="pl-7 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg w-44 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                        />
                        {/* 下拉搜索结果 */}
                        {showSearchDropdown && modalSearch.trim() && (
                            <div className="absolute top-full left-0 mt-1 w-72 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                                {searchMatches.length > 0 ? searchMatches.map(a => {
                                    const q = modalSearch.trim().toLowerCase();
                                    const id = a.id;
                                    const idx = id.toLowerCase().indexOf(q);
                                    return (
                                        <button
                                            key={a.id}
                                            onClick={() => handleSelectSearchResult(a)}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-primary/5 transition-colors border-b border-gray-50 last:border-b-0"
                                        >
                                            <img src={a.imageUrl} className="w-8 h-8 rounded-md object-cover bg-gray-100 flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-mono font-bold text-gray-700 truncate">
                                                    {idx >= 0 ? (<>
                                                        {id.slice(0, idx)}
                                                        <span className="bg-yellow-200 text-yellow-900 rounded px-0.5">{id.slice(idx, idx + q.length)}</span>
                                                        {id.slice(idx + q.length)}
                                                    </>) : id}
                                                </p>
                                                <span className={`text-[10px] font-bold ${TYPE_COLOR_MAP[a.assetType]?.replace('bg-', 'text-').split(' ')[1] || 'text-gray-400'}`}>
                                                    {TYPE_LABEL_MAP[a.assetType] || a.assetType}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                }) : (
                                    <div className="px-3 py-4 text-center text-xs text-gray-400">无匹配结果</div>
                                )}
                            </div>
                        )}
                    </div>
                    {/* 上一张 / 下一张 */}
                    <button
                        onClick={() => prevAsset && onNavigate(prevAsset)}
                        disabled={!prevAsset}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                        title={prevAsset ? prevAsset.id : ''}
                    >
                        <ChevronLeftIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline max-w-[80px] truncate">{prevAsset ? prevAsset.id : '无'}</span>
                    </button>
                    <button
                        onClick={() => nextAsset && onNavigate(nextAsset)}
                        disabled={!nextAsset}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                        title={nextAsset ? nextAsset.id : ''}
                    >
                        <span className="hidden sm:inline max-w-[80px] truncate">{nextAsset ? nextAsset.id : '无'}</span>
                        <ChevronRightIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        } maxWidth="7xl">
            <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-8" style={{ height: '80vh' }}>
                {/* Left: Metadata Sidebar */}
                <div className="space-y-5 overflow-y-auto custom-scrollbar">
                    <div className="aspect-square bg-white rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center relative shadow-sm group cursor-zoom-in" onClick={() => showPreview(hoverImageUrl || asset.imageUrl)}>
                        <img
                            src={hoverImageUrl || asset.imageUrl}
                            className={`max-h-full max-w-full object-contain transition-all duration-300 ${hoverImageUrl ? 'scale-100' : 'group-hover:scale-105'}`}
                        />
                        {hoverImageUrl && (
                            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur text-white px-2.5 py-1 rounded-lg text-[10px] font-bold z-10">
                                预览中
                            </div>
                        )}
                        {asset.id.toLowerCase().includes('ai') && !hoverImageUrl && (
                            <div className="absolute top-0 left-0 bg-primary/90 backdrop-blur-sm text-white px-4 py-2 rounded-br-2xl shadow-lg text-xs font-black tracking-widest z-10">
                                AI
                            </div>
                        )}
                        <div className="absolute bottom-4 right-4 bg-black/30 backdrop-blur text-white px-3 py-1 rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">点击放大预览</div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                        {hoverCreation ? (
                            /* hover 时显示用户作品信息 */
                            <div className="bg-gradient-to-br from-primary/5 to-blue-50 p-4 rounded-xl border border-primary/20 animate-fade-in-up space-y-3">
                                <span className="text-[10px] uppercase font-black text-primary tracking-widest">用户作品信息</span>
                                <div className="flex items-center gap-3">
                                    {hoverCreation.avatarUrl ? (
                                        <img src={hoverCreation.avatarUrl} className="w-10 h-10 rounded-full object-cover bg-gray-100 border-2 border-white shadow-sm" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-white shadow-sm">
                                            <UserIcon className="w-5 h-5 text-primary" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-black text-gray-800 truncate">{hoverCreation.userName}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {hoverCreation.subscribe && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] font-bold rounded">VIP</span>}
                                            {hoverCreation.type && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded">{hoverCreation.type}</span>}
                                            <span className="text-[10px] text-gray-400 font-mono">#{typeof hoverCreation.id === 'string' ? hoverCreation.id.slice(-8) : hoverCreation.id}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white p-2.5 rounded-lg text-center">
                                        <span className="text-lg font-black text-red-400 flex items-center justify-center gap-1">
                                            <HeartIcon className="w-4 h-4 fill-red-400" /> {hoverCreation.likes || 0}
                                        </span>
                                        <p className="text-[9px] text-gray-400 font-bold mt-0.5">点赞数</p>
                                    </div>
                                    <div className="bg-white p-2.5 rounded-lg text-center">
                                        <span className="text-xs font-black text-gray-700 whitespace-nowrap">
                                            {hoverCreation.createdAt ? new Date(Math.abs(hoverCreation.createdAt)).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '—'}
                                        </span>
                                        <p className="text-[9px] text-gray-400 font-bold mt-0.5">创作日期</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* 默认显示素材元数据 */
                            <>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="text-[10px] uppercase font-black text-gray-400 block mb-1.5 tracking-widest">图片 ID</span>
                                    <span className="text-sm font-mono font-bold text-gray-800 break-all">{asset.id}</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="text-[10px] uppercase font-black text-gray-400 block mb-1.5 tracking-widest">上传日期</span>
                                    <span className="text-sm font-bold text-gray-800">{asset.uploadDate || '—'}</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <span className="text-[10px] uppercase font-black text-gray-400 block mb-1.5 tracking-widest">标签</span>
                                {asset.tags && asset.tags.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {asset.tags.map((tag: string) => (
                                            <span key={tag} className="px-2 py-0.5 bg-white border border-gray-200 rounded-md text-xs text-gray-600">{tag}</span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-400 italic">无标签</span>
                                )}
                            </div>
                            </>
                        )}
                    </div>

                    {/* 搜索标签（从接口获取，可编辑） — 合并了原标签库区域 */}
                    <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs uppercase font-black text-green-600 tracking-widest">搜索标签 (Search Tags)</span>
                            {searchTagsId && !isEditingTags && (
                                <button
                                    onClick={() => { setIsEditingTags(true); setEditTagsValue(searchTags); }}
                                    className="text-xs text-green-700 hover:text-green-900 font-bold transition-colors bg-green-100 px-3 py-1 rounded-lg hover:bg-green-200"
                                >
                                    编辑
                                </button>
                            )}
                        </div>
                        {searchTagsLoading ? (
                            <div className="flex items-center gap-2 text-gray-400 text-sm"><Spinner size="sm" /> 加载中...</div>
                        ) : isEditingTags ? (
                            <div className="space-y-3">
                                <textarea
                                    value={editTagsValue}
                                    onChange={(e) => setEditTagsValue(e.target.value)}
                                    className="w-full p-3 border border-green-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-300 focus:border-green-400 resize-none leading-relaxed"
                                    rows={3}
                                    placeholder="输入搜索标签，多个用逗号分隔"
                                />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setIsEditingTags(false)} className="px-4 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium">取消</button>
                                    <button onClick={handleSaveTags} disabled={savingTags} className="px-4 py-1.5 text-xs text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 font-medium">
                                        {savingTags && <Spinner size="sm" />} 保存
                                    </button>
                                </div>
                            </div>
                        ) : searchTags ? (
                            <div className="flex flex-wrap gap-2">
                                {searchTags.split(',').map((tag: string) => tag.trim()).filter(Boolean).map((tag: string) => (
                                    <span key={tag} className="px-3 py-1.5 bg-white border border-green-200 rounded-lg text-sm font-medium text-green-800 shadow-sm">{tag}</span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-gray-400 text-sm italic">暂无搜索标签</span>
                        )}
                    </div>

                    {/* 作品数据分析 */}
                    {creations.length > 0 && (
                        <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-slate-200">
                            <span className="text-xs uppercase font-black text-slate-500 tracking-widest block mb-4">作品数据分析</span>
                            <div className="grid grid-cols-2 gap-3">
                                {(() => {
                                    const total = creations.length;
                                    const vipCount = creations.filter((c: any) => c.subscribe).length;
                                    const likes = creations.map((c: any) => c.likes || 0);
                                    const totalLikes = likes.reduce((a: number, b: number) => a + b, 0);
                                    const avgLikes = total > 0 ? (totalLikes / total).toFixed(1) : '0';
                                    const maxLikes = Math.max(...likes, 0);
                                    const topCreator = creations.reduce((best: any, c: any) => (!best || (c.likes || 0) > (best.likes || 0)) ? c : best, null);
                                    return (<>
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                                            <p className="text-2xl font-black text-slate-800">{total}{hasMore ? '+' : ''}</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">总作品数</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                                            <p className="text-2xl font-black text-red-500">{totalLikes}</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">总点赞数</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                                            <p className="text-2xl font-black text-amber-500">{avgLikes}</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">平均点赞</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                                            <p className="text-2xl font-black text-emerald-500">{maxLikes}</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">最高点赞</p>
                                        </div>
                                        <div className="col-span-2 bg-white p-3 rounded-xl border border-slate-100">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] text-slate-400 font-bold">VIP 占比</span>
                                                <span className="text-xs font-black text-purple-600">{vipCount}/{total} ({total > 0 ? Math.round(vipCount / total * 100) : 0}%)</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500" style={{ width: `${total > 0 ? (vipCount / total * 100) : 0}%` }} />
                                            </div>
                                        </div>
                                        {topCreator && (
                                            <div
                                                className="col-span-2 bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                                                onMouseEnter={() => handleHoverCreation(topCreator)}
                                                onMouseLeave={() => handleLeaveCreation()}
                                            >
                                                <div className="flex-shrink-0">
                                                    {topCreator.avatarUrl ? (
                                                        <img src={topCreator.avatarUrl} className="w-8 h-8 rounded-full object-cover bg-gray-100" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <UserIcon className="w-4 h-4 text-primary" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] text-slate-400 font-bold">最佳创作者</p>
                                                    <p className="text-xs font-black text-slate-700 truncate">{topCreator.userName}</p>
                                                </div>
                                                <span className="text-xs text-red-400 font-black flex items-center gap-1">
                                                    <HeartIcon className="w-3 h-3 fill-red-400" /> {topCreator.likes}
                                                </span>
                                            </div>
                                        )}
                                    </>);
                                })()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Scalable User Creations Wall */}
                <div className="flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <SparklesIcon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-800 tracking-tight">用户作品墙</h3>
                                <p className="text-xs text-gray-400">汇集全球用户的高质量填色成果</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-2xl font-black text-primary leading-none">{creationsLoading ? '...' : displayedCreations.length}{hasMore && !creationsLoading ? '+' : ''}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-bold mt-1">条记录</span>
                        </div>
                    </div>
                    {/* 排序/筛选栏 */}
                    {creations.length > 0 && (
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                            <button
                                onClick={() => setSortBy(sortBy === 'likes' ? 'default' : 'likes')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    sortBy === 'likes'
                                        ? 'bg-red-50 text-red-500 border border-red-200 shadow-sm'
                                        : 'bg-gray-50 text-gray-400 border border-gray-100 hover:text-red-400 hover:border-red-100'
                                }`}
                            >
                                <HeartIcon className={`w-3.5 h-3.5 ${sortBy === 'likes' ? 'fill-red-400' : ''}`} />
                                点赞排序
                            </button>
                            <button
                                onClick={() => setSortBy(sortBy === 'newest' ? 'default' : 'newest')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    sortBy === 'newest'
                                        ? 'bg-blue-50 text-blue-500 border border-blue-200 shadow-sm'
                                        : 'bg-gray-50 text-gray-400 border border-gray-100 hover:text-blue-400 hover:border-blue-100'
                                }`}
                            >
                                <span className="text-[10px]">🕐</span>
                                时间降序
                            </button>
                            <button
                                onClick={() => setFilterVip(!filterVip)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    filterVip
                                        ? 'bg-yellow-50 text-yellow-600 border border-yellow-200 shadow-sm'
                                        : 'bg-gray-50 text-gray-400 border border-gray-100 hover:text-yellow-500 hover:border-yellow-100'
                                }`}
                            >
                                <span className="text-[10px]">👑</span>
                                仅VIP
                            </button>
                            {/* VIP 占有率 — 带迷你进度条 */}
                            {(() => {
                                const total = creations.length;
                                const vipCount = creations.filter((c: any) => c.subscribe).length;
                                const pct = total > 0 ? Math.round((vipCount / total) * 100) : 0;
                                const barColor = pct >= 50 ? 'bg-emerald-400' : pct >= 20 ? 'bg-amber-400' : 'bg-red-400';
                                return (
                                    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                                        <span className="text-[10px]">👑</span>
                                        <span className="text-gray-500 font-medium whitespace-nowrap">VIP</span>
                                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="font-bold text-gray-700 tabular-nums whitespace-nowrap">{pct}%</span>
                                        <span className="text-gray-400 tabular-nums whitespace-nowrap">({vipCount}/{total})</span>
                                    </div>
                                );
                            })()}
                            {/* 时间筛选 */}
                            <div className="flex items-center gap-0.5 bg-gray-50 border border-gray-100 rounded-lg p-0.5">
                                {([['all', '全部'], ['7d', '7天'], ['30d', '30天'], ['90d', '90天'], ['1y', '1年']] as const).map(([val, label]) => (
                                    <button
                                        key={val}
                                        onClick={() => setFilterTime(val as any)}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                                            filterTime === val
                                                ? 'bg-white text-primary shadow-sm'
                                                : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div ref={scrollContainerRef} className="flex-1 min-h-0 bg-gray-50/50 rounded-2xl p-5 overflow-y-auto custom-scrollbar border border-gray-100">
                        {creationsLoading ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                                <Spinner size="lg" />
                                <p className="text-sm">加载用户作品中...</p>
                            </div>
                        ) : creations.length > 0 ? (
                            <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                {displayedCreations.map(uc => (
                                    <div
                                        key={uc.id}
                                        className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 group"
                                        onMouseEnter={() => handleHoverCreation(uc)}
                                        onMouseLeave={() => handleLeaveCreation()}
                                    >
                                        <div className="aspect-square relative overflow-hidden cursor-zoom-in bg-gray-50" onClick={() => showPreview(uc.imageUrl)}>
                                            <img 
                                                src={uc.thumbUrl || uc.imageUrl} 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                            />
                                            {uc.type && (
                                                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-blue-500/80 backdrop-blur-sm text-white text-[9px] font-bold rounded-md">{uc.type}</span>
                                            )}
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <EyeIcon className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                {uc.avatarUrl ? (
                                                    <img src={uc.avatarUrl} className="w-5 h-5 rounded-full object-cover bg-gray-100" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                                                        <UserIcon className="w-3 h-3 text-gray-400" />
                                                    </div>
                                                )}
                                                <span className="text-xs font-black text-gray-700 truncate">{uc.userName}</span>
                                                {uc.subscribe && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] font-bold rounded">VIP</span>}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-gray-400 font-medium">#{typeof uc.id === 'string' ? uc.id.slice(-6) : uc.id}</span>
                                                <span className="text-xs text-red-400 font-black flex items-center gap-1">
                                                    <HeartIcon className="w-3.5 h-3.5 fill-red-400" /> {uc.likes}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* 触底加载哨兵 + 手动按钮 */}
                            {hasMore && (
                                <div ref={sentinelRef} className="flex items-center justify-center py-6">
                                    <button
                                        onClick={loadMore}
                                        disabled={loadingMore}
                                        className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                                    >
                                        {loadingMore ? (<><Spinner size="sm" /> 加载中...</>) : '加载更多作品'}
                                    </button>
                                </div>
                            )}
                            {!hasMore && creations.length > PAGE_SIZE && (
                                <div className="text-center py-4 text-xs text-gray-300">已加载全部 {creations.length} 条作品</div>
                            )}
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                                <div className="p-8 bg-white rounded-full shadow-inner border border-gray-50">
                                    <PaletteIcon className="w-20 h-20 opacity-10 animate-pulse" />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-gray-300">尚无创作记录</p>
                                    <p className="text-sm text-gray-300/60 mt-1">期待第一位用户的精彩分享</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AssetManagement;
