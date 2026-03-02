
import React, { useState, useMemo, useEffect } from 'react';
import { Asset, ThemedBook, AIModelConfig, AssetTypeInfo, ArtistInfo, UserCreation } from '../types';
import { useImagePreview } from '../context/ImagePreviewContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/shared/Modal';
import { 
    EyeIcon, EyeOffIcon, DocumentTextIcon, TagIcon, PlusIcon, 
    FilterIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon,
    SearchIcon, PaletteIcon, BookOpenIcon, CheckIcon, TrashIcon,
    UserIcon
} from '../components/shared/Icons';
import Spinner from '../components/shared/Spinner';
import Tooltip from '../components/shared/Tooltip';
import { triggerHaptic, btnClickable, cardHover } from '../utils/ux';

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
                {asset.isAI && (
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
    const { assets, setAssets, themedBooks, categories, generationStyles, assetTypes, activeTab, isLoading } = props;
    const { showToast } = useToast();
    const { showPreview } = useImagePreview();

    // 状态
    const [singleSubTab, setSingleSubTab] = useState<string>('Categorized');
    const [bookSubTab, setBookSubTab] = useState<'normal' | 'artist'>('normal');
    const [selectedBook, setSelectedBook] = useState<ThemedBook | null>(null);
    const [searchId, setSearchId] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    
    // 筛选状态
    const [filters, setFilters] = useState({
        style: '',
        category: '',
        isAI: null as boolean | null,
        tag: ''
    });

    // 逻辑：过滤单图
    const filteredSingleAssets = useMemo(() => {
        return assets.filter((a: Asset) => {
            const matchTab = a.assetType === singleSubTab;
            const matchId = searchId ? a.id.toLowerCase().includes(searchId.toLowerCase()) : true;
            const matchStyle = filters.style ? a.style === filters.style : true;
            const matchCat = filters.category ? a.aiCategory === filters.category : true;
            const matchAI = filters.isAI !== null ? a.isAI === filters.isAI : true;
            const matchTag = filters.tag ? a.tags?.some(t => t.includes(filters.tag)) : true;
            return matchTab && matchId && matchStyle && matchCat && matchAI && matchTag;
        });
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
                
                <div className="flex items-center gap-3">
                    <select 
                        className="bg-gray-50 border-none rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-primary/20"
                        value={filters.style}
                        onChange={(e) => setFilters({...filters, style: e.target.value})}
                    >
                        <option value="">所有风格</option>
                        {generationStyles.map((s: string) => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <select 
                        className="bg-gray-50 border-none rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-primary/20"
                        value={filters.category}
                        onChange={(e) => setFilters({...filters, category: e.target.value})}
                    >
                        <option value="">所有分类</option>
                        {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <input 
                        type="text" 
                        placeholder="标签筛选..." 
                        className="bg-gray-50 border-none rounded-xl text-sm py-2 px-3 w-32 focus:ring-2 focus:ring-primary/20"
                        value={filters.tag}
                        onChange={(e) => setFilters({...filters, tag: e.target.value})}
                    />

                    {activeTab === 'single' && (
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div 
                                onClick={() => setFilters({...filters, isAI: filters.isAI === null ? true : filters.isAI === true ? false : null})}
                                className={`w-10 h-6 rounded-full transition-all relative ${filters.isAI === true ? 'bg-primary' : filters.isAI === false ? 'bg-orange-500' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${filters.isAI !== null ? 'translate-x-4' : ''}`} />
                            </div>
                            <span className="text-xs font-bold text-gray-500">
                                {filters.isAI === true ? '仅 AI' : filters.isAI === false ? '非 AI' : 'AI 不限'}
                            </span>
                        </label>
                    )}
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
            <AssetDetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
        </div>
    );
};

// --- 子组件：资产详情及用户作品模态框 ---
const AssetDetailModal: React.FC<{ asset: Asset | null; onClose: () => void }> = ({ asset, onClose }) => {
    if (!asset) return null;
    const { showPreview } = useImagePreview();

    return (
        <Modal isOpen={!!asset} onClose={onClose} title={`资产详情: ${asset.id}`} maxWidth="7xl">
            <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-10">
                {/* Left: Metadata Sidebar */}
                <div className="space-y-6">
                    <div className="aspect-square bg-white rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center relative shadow-sm group cursor-zoom-in" onClick={() => showPreview(asset.imageUrl)}>
                        <img src={asset.imageUrl} className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105" />
                        
                        {asset.isAI && (
                            <div className="absolute top-0 left-0 bg-primary/90 backdrop-blur-sm text-white px-4 py-2 rounded-br-2xl shadow-lg text-xs font-black tracking-widest z-10">
                                AI
                            </div>
                        )}
                        <div className="absolute bottom-4 right-4 bg-black/30 backdrop-blur text-white px-3 py-1 rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">点击放大预览</div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <span className="text-[10px] uppercase font-black text-gray-400 block mb-1.5 tracking-widest">图片 ID</span>
                            <span className="text-sm font-mono font-bold text-gray-800 break-all">{asset.id}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <span className="text-[10px] uppercase font-black text-gray-400 block mb-1.5 tracking-widest">风格</span>
                                <span className="text-sm font-bold text-gray-800">{asset.style || '—'}</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <span className="text-[10px] uppercase font-black text-gray-400 block mb-1.5 tracking-widest">分类</span>
                                <span className="text-sm font-bold text-gray-800">{asset.aiCategory || '—'}</span>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <span className="text-[10px] uppercase font-black text-gray-400 block mb-1.5 tracking-widest">版权/艺术家</span>
                            <span className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-gray-400" />
                                {asset.artist || '系统预设'}
                            </span>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                        <span className="text-[10px] uppercase font-black text-blue-400 block mb-3 tracking-widest">标签库 (Tags)</span>
                        <div className="flex flex-wrap gap-2">
                            {asset.tags?.map(tag => (
                                <span key={tag} className="px-2.5 py-1 bg-white border border-blue-100 rounded-lg text-[11px] font-medium text-blue-600 shadow-sm hover:shadow-md transition-shadow cursor-default">#{tag}</span>
                            )) || <span className="text-gray-300 text-xs italic">暂无标签</span>}
                        </div>
                    </div>
                </div>

                {/* Right: Scalable User Creations Wall */}
                <div className="flex flex-col h-full min-h-[600px]">
                    <div className="flex items-center justify-between mb-6">
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
                            <span className="text-2xl font-black text-primary leading-none">{asset.userCreations?.length || 0}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-bold mt-1">条记录</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-gray-50/50 rounded-3xl p-6 overflow-y-auto custom-scrollbar border border-gray-100">
                        {asset.userCreations && asset.userCreations.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                {asset.userCreations.map(uc => (
                                    <div key={uc.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 group">
                                        <div className="aspect-square relative overflow-hidden cursor-zoom-in" onClick={() => showPreview(uc.imageUrl)}>
                                            <img src={uc.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <EyeIcon className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <UserIcon className="w-3 h-3 text-gray-400" />
                                                </div>
                                                <span className="text-xs font-black text-gray-700 truncate">{uc.userName}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-gray-400 font-medium">#{uc.id.slice(-4)}</span>
                                                <span className="text-xs text-primary font-black flex items-center gap-1.5">
                                                    <CheckIcon className="w-3.5 h-3.5" /> {uc.likes}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                    
                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                        <button 
                            onClick={onClose} 
                            className="px-8 py-3 bg-gray-100 text-gray-700 rounded-2xl font-black text-sm hover:bg-gray-200 hover:shadow-lg transition-all active:scale-95"
                        >
                            关闭详情
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AssetManagement;
