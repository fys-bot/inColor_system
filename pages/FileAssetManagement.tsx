

import React, { useState, useMemo } from 'react';
import { FileAsset } from '../types';
import { useToast } from '../context/ToastContext';
import { useImagePreview } from '../context/ImagePreviewContext';
import Modal from '../components/shared/Modal';
import { EyeIcon, EditIcon, DeleteIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '../components/shared/Icons';

type SortConfig = { key: keyof FileAsset; direction: 'ascending' | 'descending'; } | null;

interface FileAssetManagementProps {
    fileAssets: FileAsset[];
    setFileAssets: React.Dispatch<React.SetStateAction<FileAsset[]>>;
}

const FileAssetManagement: React.FC<FileAssetManagementProps> = ({ fileAssets, setFileAssets }) => {
    const { showToast } = useToast();
    const { showPreview } = useImagePreview();

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<FileAsset | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);


    const openModal = (asset: FileAsset, editing: boolean = false) => {
        setModalContent(asset); setIsEditing(editing);
        if (asset.type === 'Image' && !editing) { showPreview(asset.path); } else { setIsModalOpen(true); }
    };
    const closeModal = () => { setIsModalOpen(false); setModalContent(null); setIsEditing(false); };
    
    const handleDelete = (id: string) => { 
        if(window.confirm('确定要删除这个文件吗？此操作不可逆。')) { 
            setFileAssets(prev => prev.filter(asset => asset.id !== id));
            setSelectedFiles(prev => { const newSet = new Set(prev); newSet.delete(id); return newSet; });
            showToast('文件已删除', 'success'); 
        } 
    };
    
    const handleSave = (updatedAsset: FileAsset) => { setFileAssets(prev => prev.map(asset => asset.id === updatedAsset.id ? updatedAsset : asset)); showToast('文件已更新', 'success'); closeModal(); }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newAssets: FileAsset[] = [];
        // FIX: Explicitly type the 'file' parameter to resolve type inference issues.
        const promises = Array.from(files).map((file: File) => {
            return new Promise<void>(resolve => {
                const reader = new FileReader();
                const assetType = file.type.startsWith('image/') ? 'Image' :
                                file.type === 'application/json' ? 'JSON' : 'Text';

                reader.onload = (e) => {
                    const newAsset: FileAsset = {
                        id: `FA_FS_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                        name: file.name,
                        type: assetType,
                        source: 'FileSystem',
                        size: file.size,
                        lastModified: new Date().toISOString(),
                        path: `/uploads/${file.name}`,
                        description: `Uploaded file`,
                        content: (assetType === 'JSON' || assetType === 'Text') ? e.target?.result as string : undefined,
                    };
                    newAssets.push(newAsset);
                    resolve();
                };
                
                if (file.type === 'application/json' || file.type.startsWith('text/')) {
                    reader.readAsText(file);
                } else {
                    const newAsset: FileAsset = {
                        id: `FA_FS_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                        name: file.name,
                        type: 'Image',
                        source: 'FileSystem',
                        size: file.size,
                        lastModified: new Date().toISOString(),
                        path: URL.createObjectURL(file),
                        description: `Uploaded file`,
                    };
                    newAssets.push(newAsset);
                    resolve();
                }
            });
        });

        Promise.all(promises).then(() => {
            setFileAssets(prev => [...prev, ...newAssets]);
            showToast(`${newAssets.length}个文件已成功上传!`, 'success');
        });

        event.target.value = '';
    };
    
    const handleCreateFile = (newAsset: Omit<FileAsset, 'id' | 'lastModified' | 'size'>) => {
        const finalAsset: FileAsset = { ...newAsset, id: `FA_FS_${Date.now()}_${Math.random().toString(16).slice(2)}`, lastModified: new Date().toISOString(), size: newAsset.content?.length || 0 };
        setFileAssets(prev => [...prev, finalAsset]);
        setIsNewFileModalOpen(false);
        showToast(`文件 "${finalAsset.name}" 已成功创建!`, 'success');
    };

    const handleBulkDelete = () => {
        if (window.confirm(`您确定要删除 ${selectedFiles.size} 个选中的文件吗?`)) {
            setFileAssets(prev => prev.filter(asset => !selectedFiles.has(asset.id)));
            showToast(`${selectedFiles.size} 个文件已删除.`, 'success');
            setSelectedFiles(new Set());
        }
    };
    
    const handleSelect = (id: string, isSelected: boolean) => { setSelectedFiles(prev => { const newSet = new Set(prev); if (isSelected) newSet.add(id); else newSet.delete(id); return newSet; }); };
    
    const filteredAssets = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();
        if (!lowercasedTerm) return fileAssets;
        return fileAssets.filter(asset => asset.name.toLowerCase().includes(lowercasedTerm) || asset.description?.toLowerCase().includes(lowercasedTerm) || asset.source.toLowerCase().includes(lowercasedTerm));
    }, [fileAssets, searchTerm]);
    
    const sortedAssets = useMemo(() => {
        let sortableItems = [...filteredAssets];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredAssets, sortConfig]);

    const paginatedAssets = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedAssets.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedAssets, currentPage, itemsPerPage]);

    const handleSelectAll = (isSelected: boolean) => {
        if (isSelected) {
            const fileSystemIds = paginatedAssets.filter(a => a.source === 'FileSystem').map(a => a.id);
            setSelectedFiles(new Set(fileSystemIds));
        } else {
            setSelectedFiles(new Set());
        }
    };
    
    const requestSort = (key: keyof FileAsset) => {
        if (sortConfig?.key !== key) { setSortConfig({ key, direction: 'ascending' }); } else if (sortConfig.direction === 'ascending') { setSortConfig({ key, direction: 'descending' }); } else { setSortConfig(null); }
    };

    const maxPage = Math.ceil(sortedAssets.length / itemsPerPage);
    const tableHeaders: { key: keyof FileAsset, label: string }[] = [ { key: 'name', label: '名称' }, { key: 'type', label: '类型' }, { key: 'source', label: '来源/分类' }, { key: 'size', label: '大小' }, { key: 'lastModified', label: '最后修改时间' } ];

    return (
        <div className="space-y-6">
            <div><h1 className="text-3xl font-bold text-gray-800">文件资源管理</h1><p className="text-gray-500 mt-1">系统内所有文件资源的统一视图，包括内置素材和文件系统资源。</p></div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="relative flex-grow"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><SearchIcon className="w-5 h-5"/></span><input type="text" placeholder="按名称、描述或来源搜索..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-md bg-white text-gray-900"/></div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <label htmlFor="file-upload" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer text-sm font-semibold flex items-center gap-2"><PlusIcon className="w-4 h-4" /> 上传文件</label>
                        <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileUpload} />
                        <button onClick={() => setIsNewFileModalOpen(true)} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold flex items-center gap-2"><PlusIcon className="w-4 h-4" /> 新建文件</button>
                    </div>
                </div>
                {selectedFiles.size > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
                        <p className="text-sm font-medium text-blue-800">{`${selectedFiles.size} 个文件已选中。`}</p>
                        <button onClick={handleBulkDelete} className="px-3 py-1 bg-danger text-white text-sm rounded-md hover:bg-danger-hover">删除选中</button>
                    </div>
                )}
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden border">
                <div className="overflow-x-auto"><table className="w-full text-sm text-left text-gray-500"><thead className="text-xs text-gray-700 uppercase bg-gray-50"><tr>
                    <th scope="col" className="p-4"><input type="checkbox" onChange={(e) => handleSelectAll(e.target.checked)} checked={selectedFiles.size > 0 && paginatedAssets.filter(a => a.source === 'FileSystem').length > 0 && paginatedAssets.filter(a => a.source === 'FileSystem').every(a => selectedFiles.has(a.id))} /></th>
                    {tableHeaders.map(h => <th key={h.key} scope="col" className="py-3 px-6 cursor-pointer whitespace-nowrap" onClick={() => requestSort(h.key)}><div className="flex items-center">{h.label}{sortConfig?.key === h.key && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</div></th>)}
                    <th scope="col" className="py-3 px-6">操作</th></tr></thead>
                    <tbody>{paginatedAssets.map(asset => (<tr key={asset.id} className={`bg-white border-b hover:bg-gray-50 ${selectedFiles.has(asset.id) ? 'bg-blue-50' : ''}`}>
                        <td className="p-4">{asset.source === 'FileSystem' && (<input type="checkbox" checked={selectedFiles.has(asset.id)} onChange={(e) => handleSelect(asset.id, e.target.checked)} />)}</td>
                        <td className="py-4 px-6 font-medium text-gray-900">{asset.name}</td><td className="py-4 px-6">{asset.type}</td><td className="py-4 px-6">{asset.source}</td><td className="py-4 px-6">{(asset.size / 1024).toFixed(2)} KB</td><td className="py-4 px-6 whitespace-nowrap">{new Date(asset.lastModified).toLocaleString()}</td><td className="py-4 px-6 space-x-2"><button onClick={() => openModal(asset)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"><EyeIcon className="w-4 h-4" /></button>{asset.source === 'FileSystem' && (<><button onClick={() => openModal(asset, true)} className="p-2 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100"><EditIcon className="w-4 h-4" /></button><button onClick={() => handleDelete(asset.id)} className="p-2 text-gray-500 hover:text-danger rounded-full hover:bg-gray-100"><DeleteIcon className="w-4 h-4" /></button></>)}</td></tr>))}</tbody>
                </table></div>
                 <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <span className="text-sm text-gray-700">共 {sortedAssets.length} 条</span>
                  <div className="flex items-center space-x-2">
                    <select value={itemsPerPage} onChange={e => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}} className="p-1 border rounded-md bg-white"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded-md disabled:opacity-50"><ChevronLeftIcon /></button>
                    <span>第 {currentPage} 页 / {maxPage}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(maxPage, p + 1))} disabled={currentPage === maxPage} className="p-1 rounded-md disabled:opacity-50"><ChevronRightIcon /></button>
                  </div>
                </div>
            </div>
            {modalContent && (<Modal isOpen={isModalOpen} onClose={closeModal} title={isEditing ? `编辑: ${modalContent.name}` : `预览: ${modalContent.name}`}>{isEditing ? (<EditForm asset={modalContent} onSave={handleSave} onCancel={closeModal} />) : (<pre className="bg-gray-100 p-4 rounded-md text-sm max-h-96 overflow-auto"><code>{modalContent.content || '无预览内容'}</code></pre>)}</Modal>)}
             <NewFileModal isOpen={isNewFileModalOpen} onClose={() => setIsNewFileModalOpen(false)} onSave={handleCreateFile} />
        </div>
    );
};

const EditForm: React.FC<{ asset: FileAsset, onSave: (asset: FileAsset) => void, onCancel: () => void }> = ({ asset, onSave, onCancel }) => {
    const [content, setContent] = useState(asset.content || '');
    const handleSaveClick = () => { onSave({ ...asset, content }); };
    return (<div className="space-y-4"><textarea value={content} onChange={e => setContent(e.target.value)} className="w-full h-64 p-2 border rounded-md font-mono text-sm bg-white text-gray-900" placeholder="文件内容..."/><div className="flex justify-end space-x-2"><button onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">取消</button><button onClick={handleSaveClick} className="px-4 py-2 bg-primary text-white rounded-md">保存</button></div></div>);
};

const NewFileModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (file: Omit<FileAsset, 'id' | 'lastModified' | 'size'>) => void }> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<'JSON' | 'Text'>('Text');
    const [content, setContent] = useState('');

    const handleSaveClick = () => {
        if (!name.trim()) { alert('文件名不能为空。'); return; }
        onSave({ name: name.trim(), type, content, source: 'FileSystem', path: `/local/${name.trim()}` });
        setName(''); setType('Text'); setContent('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="创建新文件">
            <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700">文件名</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white text-gray-900" placeholder="e.g., config.json"/></div>
                <div><label className="block text-sm font-medium text-gray-700">文件类型</label><select value={type} onChange={e => setType(e.target.value as 'JSON' | 'Text')} className="mt-1 w-full p-2 border rounded-md bg-white"><option value="Text">Text</option><option value="JSON">JSON</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700">内容</label><textarea value={content} onChange={e => setContent(e.target.value)} rows={8} className="mt-1 w-full p-2 border rounded-md font-mono text-sm bg-white text-gray-900" /></div>
                <div className="flex justify-end space-x-2 pt-4 border-t"><button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">取消</button><button onClick={handleSaveClick} className="px-4 py-2 bg-primary text-white rounded-md">创建文件</button></div>
            </div>
        </Modal>
    );
};

export default FileAssetManagement;