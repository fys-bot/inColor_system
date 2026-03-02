
import React, { useState, useMemo } from 'react';
import { useMockData } from '../hooks/useMockData';
import { Asset, Report, User, AIGeneration, AIGenerationModel, AIGenerationOS, AIGenerationSize, AIGenerationStyle } from '../types';
import { useImagePreview } from '../context/ImagePreviewContext';
import Modal from '../components/shared/Modal';

// ===== INTERNAL ASSETS TAB =====
const AssetCard: React.FC<{ asset: Asset; onToggleHide: (id: string) => void; onSelect: (id: string, isSelected: boolean) => void, isSelected: boolean }> = ({ asset, onToggleHide, onSelect, isSelected }) => {
  const { showPreview } = useImagePreview();
  return (
    <div className={`relative border rounded-lg overflow-hidden shadow-sm transition-all duration-300 ${asset.isHidden ? 'bg-gray-200' : 'bg-white'}`}>
       <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onSelect(asset.id, e.target.checked)}
        className="absolute top-2 left-2 h-5 w-5 z-10"
      />
      <img
        src={asset.imageUrl}
        alt={asset.id}
        className={`w-full h-48 object-cover cursor-pointer transition-all duration-300 ${asset.isHidden ? 'opacity-50 grayscale' : 'hover:scale-105'}`}
        onClick={() => showPreview(asset.imageUrl)}
      />
      <div className="p-4">
        <p className="text-sm text-gray-600">ID: {asset.id}</p>
        <p className="text-xs text-gray-500">Uploaded: {asset.uploadDate}</p>
        <div className="absolute top-2 right-2 flex space-x-2">
            <button onClick={() => onToggleHide(asset.id)} className="p-2 bg-white rounded-full shadow hover:bg-gray-100">
                {asset.isHidden ? '👁️' : '🙈'}
            </button>
        </div>
      </div>
    </div>
  );
};

const InternalAssetsTab: React.FC = () => {
  const { assets } = useMockData();
  // FIX: Changed state to hold a string for the tab name, not a key of an array.
  const [currentAssetTab, setCurrentAssetTab] = useState<string>('AI 图');
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isFilterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  // FIX: The `internalAssets` state correctly holds an array of Asset objects.
  const [internalAssets, setInternalAssets] = useState(assets);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hideStatus, setHideStatus] = useState('全部');
  const [dateError, setDateError] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({ startDate: '', endDate: '', hideStatus: '全部' });

  // FIX: Defined a map from tab names to assetType IDs and derived tabs from it.
  const assetTypeMap: { [key: string]: string } = {
    '内置素材图': 'Base',
    'AI 图': 'AI',
    '主题图': 'Themed',
    '每日更新图': 'Daily',
    '活动图': 'Event',
  };
  const tabs: string[] = Object.keys(assetTypeMap);
  
  const handleSelect = (id: string, isSelected: boolean) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (isSelected) newSet.add(id); else newSet.delete(id);
      return newSet;
    });
  };

  const toggleHide = (id: string) => {
    // FIX: Correctly map over the array of assets to update an item.
    setInternalAssets(prev => prev.map(a => a.id === id ? { ...a, isHidden: !a.isHidden } : a));
  };

  const batchHide = (hide: boolean) => {
     // FIX: Correctly map over the array of assets to update multiple items.
     setInternalAssets(prev => prev.map(a => selectedAssets.has(a.id) ? { ...a, isHidden: hide } : a));
    setSelectedAssets(new Set());
  }

  const selectionStatus = useMemo(() => {
    if (selectedAssets.size === 0) return { canHide: false, canUnhide: false };
    // FIX: Correctly filter the flat array of assets to check selection status.
    const selectedList = internalAssets.filter(asset => selectedAssets.has(asset.id));
    const allHidden = selectedList.every(asset => asset.isHidden);
    const allVisible = selectedList.every(asset => !asset.isHidden);
    return { canHide: !allHidden, canUnhide: !allVisible };
  }, [selectedAssets, internalAssets]);

  const handleApplyFilter = () => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) { setDateError('所选时间不合法'); return; }
    setDateError('');
    setAppliedFilters({ startDate, endDate, hideStatus });
    setFilterModalOpen(false);
  };

  const openFilterModal = () => {
    setStartDate(appliedFilters.startDate); setEndDate(appliedFilters.endDate); setHideStatus(appliedFilters.hideStatus); setDateError('');
    setFilterModalOpen(true);
  };

  const displayedAssets = useMemo(() => {
    // FIX: Correctly filter assets based on the current tab and applied filters.
    const currentAssetTypeId = assetTypeMap[currentAssetTab];
    let filtered = internalAssets.filter(a => a.assetType === currentAssetTypeId);

    if (appliedFilters.startDate) filtered = filtered.filter(a => new Date(a.uploadDate) >= new Date(appliedFilters.startDate));
    if (appliedFilters.endDate) {
        const endOfDay = new Date(appliedFilters.endDate); endOfDay.setHours(23, 59, 59, 999);
        filtered = filtered.filter(a => new Date(a.uploadDate) <= endOfDay);
    }
    if (appliedFilters.hideStatus !== '全部') {
        const shouldBeHidden = appliedFilters.hideStatus === '已隐藏';
        filtered = filtered.filter(a => a.isHidden === shouldBeHidden);
    }
    return filtered;
  }, [internalAssets, currentAssetTab, appliedFilters]);

  const filtersAreActive = appliedFilters.startDate || appliedFilters.endDate || appliedFilters.hideStatus !== '全部';

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <div className="flex-1 flex items-center space-x-2">
                <input type="text" placeholder="搜索 ID 或文本内容..." className="w-1/3 p-2 border rounded-md bg-white text-gray-900"/>
                <button onClick={openFilterModal} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">高级筛选</button>
                <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">搜索</button>
            </div>
            <div className="space-x-2">
                <button onClick={() => batchHide(true)} disabled={!selectionStatus.canHide} className="px-4 py-2 bg-yellow-500 text-white rounded-md disabled:bg-gray-300">批量隐藏</button>
                <button onClick={() => batchHide(false)} disabled={!selectionStatus.canUnhide} className="px-4 py-2 bg-green-500 text-white rounded-md disabled:bg-gray-300">批量取消隐藏</button>
                <button onClick={() => setUploadModalOpen(true)} className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600">上传</button>
            </div>
        </div>

        <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">{tabs.map((tab) => (<button key={tab} onClick={() => setCurrentAssetTab(tab)} className={`${currentAssetTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{tab}</button>))}</nav>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {displayedAssets.length > 0 ? ( displayedAssets.map((asset) => (<AssetCard key={asset.id} asset={asset} onToggleHide={toggleHide} isSelected={selectedAssets.has(asset.id)} onSelect={handleSelect} />))) : filtersAreActive ? (<div className="col-span-full text-center py-10"><p className="text-gray-500 text-lg">该时间段内没有上传的素材</p></div>) : <div className="col-span-full text-center py-10"><p className="text-gray-500 text-lg">该分类下没有素材</p></div>}
      </div>

      <Modal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} title="批量上传">
         <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700">分类选择</label><select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white">{tabs.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md"><div className="space-y-1 text-center"><svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><div className="flex text-sm text-gray-600"><p className="pl-1">支持拖拽或点击选择</p></div></div></div>
         </div>
      </Modal>

      <Modal isOpen={isFilterModalOpen} onClose={() => setFilterModalOpen(false)} title="高级筛选">
        <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700">上传日期范围</label><div className="flex items-center space-x-2 mt-1"><input type="date" className="w-full p-2 border rounded-md bg-white text-gray-900" value={startDate} onChange={(e) => { setStartDate(e.target.value); setDateError(''); }} /><span>-</span><input type="date" className="w-full p-2 border rounded-md bg-white text-gray-900" value={endDate} onChange={(e) => { setEndDate(e.target.value); setDateError(''); }} /></div>{dateError && <p className="text-red-500 text-sm mt-1">{dateError}</p>}</div>
            <div><label className="block text-sm font-medium text-gray-700">隐藏状态</label><select className="mt-1 block w-full p-2 border rounded-md bg-white" value={hideStatus} onChange={(e) => setHideStatus(e.target.value)}><option>全部</option><option>已隐藏</option><option>未隐藏</option></select></div>
            <div className="flex justify-end pt-4"><button onClick={handleApplyFilter} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">应用筛选</button></div>
        </div>
      </Modal>
    </div>
  );
};

// ===== AI GENERATIONS TAB =====
const AIGenerationsTab: React.FC = () => {
    const { aiGenerations } = useMockData();
    const { showPreview } = useImagePreview();
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isFilterModalOpen, setFilterModalOpen] = useState(false);

    type Filters = { [key: string]: string; };
    const [filters, setFilters] = useState<Filters>({});
    const [appliedFilters, setAppliedFilters] = useState<Filters>({});
    
    const filterOptionsMap: { [key: string]: string[] } = {
        os: ['iOS', 'Android'] as AIGenerationOS[],
        size: ['方形', '横屏', '竖屏'] as AIGenerationSize[],
        modelName: ['Vertex AI-Imagen-4', 'Seedream通用3.0文生图模型'] as AIGenerationModel[],
        style: ['美式漫画', '卡通', '二次元', '皮克斯', '日漫', '古典主义', '中国古风', '涂鸦', '装饰艺术', '可爱风'] as AIGenerationStyle[],
        feedback: ['生产质量问题', '技术故障问题', '内容安全问题', '其它'],
    };

    const handleFilterChange = (field: string, value: string) => setFilters(prev => ({ ...prev, [field]: value }));
    const applyFilters = () => { setAppliedFilters(filters); setFilterModalOpen(false); };
    const openFilterModal = () => { setFilters(appliedFilters); setFilterModalOpen(true); };

    const filteredGenerations = useMemo(() => {
        return aiGenerations.filter(gen => {
            return Object.entries(appliedFilters).every(([key, value]) => {
                if (!value) return true;
                const genValue = gen[key as keyof AIGeneration];
                if (key === 'generationTime') return new Date(gen.generationTime).toDateString() === new Date(value as string).toDateString();
                // FIX: Safely convert genValue to string before calling string methods to avoid runtime errors with non-string types like numbers.
                if (key === 'feedback') return String(genValue).startsWith(String(value));
                // FIX: Safely convert genValue to string before calling string methods.
                return String(genValue).toLowerCase().includes(String(value).toLowerCase());
            });
        });
    }, [aiGenerations, appliedFilters]);

    const handleSelect = (id: string, checked: boolean) => { const newSelection = new Set(selectedRows); if (checked) newSelection.add(id); else newSelection.delete(id); setSelectedRows(newSelection); };
    const handleSelectAll = (checked: boolean) => setSelectedRows(checked ? new Set(filteredGenerations.map(g => g.id)) : new Set());
    const handleBatchDownload = () => alert(`Downloading ${selectedRows.size} items as a ZIP file.`);
    
    const tableHeaders = ['操作系统', '版本号', '模型名称', '尺寸', '风格', '用户 ID', '提示词内容', '生图时间', '生图时长', '生成出来的图片', '玩家反馈'];
    const filterFields: (keyof Omit<AIGeneration, 'id' | 'imageUrl'>)[] = ['os', 'version', 'modelName', 'size', 'style', 'userId', 'prompt', 'generationTime', 'duration', 'feedback'];

    return (
        <div className="space-y-6">
             <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 flex justify-between items-center border-b">
                    <button onClick={openFilterModal} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">筛选</button>
                    <button onClick={handleBatchDownload} disabled={selectedRows.size === 0} className="px-4 py-2 bg-green-500 text-white rounded-md disabled:bg-gray-300">批量下载为 ZIP 文件</button>
                </div>
                <div className="overflow-x-auto"><table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50"><tr><th scope="col" className="p-4"><input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} checked={selectedRows.size > 0 && selectedRows.size === filteredGenerations.length} /></th>{tableHeaders.map(h => <th key={h} scope="col" className="py-3 px-6 whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody>{filteredGenerations.map((gen) => (<tr key={gen.id} className="bg-white border-b hover:bg-gray-50"><td className="p-4"><input type="checkbox" checked={selectedRows.has(gen.id)} onChange={e => handleSelect(gen.id, e.target.checked)} /></td><td className="py-4 px-6">{gen.os}</td><td className="py-4 px-6">{gen.version}</td><td className="py-4 px-6">{gen.modelName}</td><td className="py-4 px-6">{gen.size}</td><td className="py-4 px-6">{gen.style}</td><td className="py-4 px-6">{gen.userId}</td><td className="py-4 px-6"><p className="max-w-xs truncate" title={gen.prompt}>{gen.prompt}</p></td><td className="py-4 px-6 whitespace-nowrap">{new Date(gen.generationTime).toLocaleDateString()}</td><td className="py-4 px-6">{gen.duration}s</td><td className="py-4 px-6"><img src={gen.imageUrl} alt="generated" className="h-16 w-16 object-cover rounded-md cursor-pointer" onClick={() => showPreview(gen.imageUrl)} /></td><td className="py-4 px-6" title={gen.feedback}>{gen.feedback.split(':')[0]}</td></tr>))}</tbody>
                </table></div>
            </div>
             <Modal isOpen={isFilterModalOpen} onClose={() => setFilterModalOpen(false)} title="全功能筛选">
                <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">{filterFields.map(field => {
                    const options = filterOptionsMap[field]; const labelMap: { [key: string]: string } = { os: '操作系统', version: '版本号', modelName: '模型名称', size: '尺寸', style: '风格', userId: '用户 ID', prompt: '提示词内容', generationTime: '生图时间', duration: '生图时长', feedback: '玩家反馈' };
                    return(<div key={field}><label className="block text-sm font-medium text-gray-700 capitalize">{labelMap[field] || field}</label>{options ? (<select className="mt-1 block w-full p-2 border rounded-md bg-white" value={filters[field] || ''} onChange={(e) => handleFilterChange(field, e.target.value)}><option value="">全部</option>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>) : (<input type={field.includes('Time') ? 'date' : 'text'} placeholder={`筛选 ${labelMap[field] || field}`} className="mt-1 w-full p-2 border rounded-md bg-white text-gray-900" value={filters[field] || ''} onChange={(e) => handleFilterChange(field, e.target.value)} />)}</div>)
                })}</div>
                 <div className="flex justify-end pt-4 mt-4 border-t"><button onClick={applyFilters} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">应用筛选</button></div>
            </Modal>
        </div>
    );
};

// ===== MAIN COMPONENT =====
type Tab = 'internal' | 'ai';

const ContentManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('internal');

    const tabs: {id: Tab, label: string}[] = [
        { id: 'internal', label: '内置素材' },
        { id: 'ai', label: 'AI 生图' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'internal': return <InternalAssetsTab />;
            case 'ai': return <AIGenerationsTab />;
            default: return null;
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">内容管理</h1>
            
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${
                            activeTab === tab.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                    {tab.label}
                    </button>
                ))}
                </nav>
            </div>

            <div>
                {renderContent()}
            </div>
        </div>
    );
}

export default ContentManagement;
