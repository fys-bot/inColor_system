
/**
 * @file 审核与编辑模态框组件 (ReviewAndEditModal.tsx)。
 * @description 该组件集成了 AI 处理进度展示和元数据编辑功能。
 * 允许用户在上传到素材库或下载前，对图片进行审核、编辑（命名、标签、分类等）。
 */
import React, { useState, useEffect } from 'react';
import { UploadTask, AssetType, AssetTypeInfo, ArtistInfo } from '../../types';
import { CloseIcon, DeleteIcon } from './Icons';
import Spinner from './Spinner';

// 定义组件的 props 类型
interface ReviewAndEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tasks: UploadTask[]) => void;
  tasks: UploadTask[];
  artists: ArtistInfo[];
  categories: string[];
  assetTypes: AssetTypeInfo[];
  mode?: 'upload' | 'download'; // 模式：上传到素材库 或 下载素材包
}

const ReviewAndEditModal: React.FC<ReviewAndEditModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    tasks, 
    artists, 
    categories, 
    assetTypes,
    mode = 'upload'
}) => {
  // 状态：用于批量应用的艺术家
  const [batchArtist, setBatchArtist] = useState('');
  // 状态：用于批量应用的 AI 分类
  const [batchCategory, setBatchCategory] = useState('');
  // 状态：用于批量应用的素材类别
  const [batchAssetType, setBatchAssetType] = useState<AssetType | ''>('');

  // 处理单个任务字段的变更
  const [localEdits, setLocalEdits] = useState<Record<string, Partial<UploadTask>>>({});

  const getTaskValue = (task: UploadTask, field: keyof UploadTask) => {
      return localEdits[task.id]?.[field] ?? task[field];
  };

  const updateLocalEdit = (taskId: string, field: keyof UploadTask, value: any) => {
      setLocalEdits(prev => ({
          ...prev,
          [taskId]: {
              ...prev[taskId],
              [field]: value
          }
      }));
  };

  const handleRemoveTask = (taskId: string) => {
      updateLocalEdit(taskId, 'status', 'deleted'); // Hacky marker
  };

  const handleAddTag = (taskId: string, newTag: string) => {
      if (!newTag.trim()) return;
      const currentTags = (getTaskValue(tasks.find(t=>t.id===taskId)!, 'tags') as string[]) || [];
      if (!currentTags.includes(newTag.trim())) {
          updateLocalEdit(taskId, 'tags', [...currentTags, newTag.trim()]);
      }
  };
  
  const handleRemoveTag = (taskId: string, tagToRemove: string) => {
      const currentTags = (getTaskValue(tasks.find(t=>t.id===taskId)!, 'tags') as string[]) || [];
      updateLocalEdit(taskId, 'tags', currentTags.filter(t => t !== tagToRemove));
  };

  const applyBatch = (field: keyof UploadTask, value: any) => {
      const updates: Record<string, Partial<UploadTask>> = {};
      tasks.forEach(t => {
          // Only apply to visible tasks
          if (localEdits[t.id]?.status !== 'deleted') {
             updates[t.id] = { ...localEdits[t.id], [field]: value };
          }
      });
      setLocalEdits(prev => ({ ...prev, ...updates }));
  };

  const handleConfirmAction = () => {
      // Merge edits
      const finalTasks = tasks.map(t => ({
          ...t,
          ...localEdits[t.id]
      })).filter(t => (t as any).status !== 'deleted'); // Remove deleted
      onConfirm(finalTasks);
  };

  if (!isOpen) return null;

  const visibleTasks = tasks.filter(t => localEdits[t.id]?.status !== 'deleted');
  const allComplete = visibleTasks.every(t => t.status === 'complete' || t.status === 'error');
  const analyzingCount = visibleTasks.filter(t => t.status === 'analyzing').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] border border-blue-100">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-100 p-5 flex-shrink-0 bg-gradient-to-r from-white to-blue-50">
          <div>
              <h3 className="text-xl font-bold text-gray-800">
                  {analyzingCount > 0 ? (
                      <span className="flex items-center gap-2">
                          <Spinner size="sm" className="text-primary" />
                          AI 处理中... (剩余 {analyzingCount} 张)
                      </span>
                  ) : (
                      '审核 & 编辑'
                  )}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                  {mode === 'download' 
                    ? '确认信息无误后，将生成符合命名规范的图片及配置文档。' 
                    : 'AI 已自动填充元数据，请进行二次确认或修改。'}
              </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Batch Actions */}
        <div className="bg-blue-50/50 p-4 border-b border-blue-100 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-bold text-blue-800">批量应用:</span>
            
            {/* Artist */}
            <div className="flex items-center space-x-1">
                <select 
                    value={batchArtist} 
                    onChange={(e) => setBatchArtist(e.target.value)} 
                    className="p-1.5 border border-blue-200 rounded-md bg-white text-sm focus:ring-1 focus:ring-blue-500"
                >
                    <option value="">(空值)</option>
                    {artists.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                </select>
                <button onClick={() => applyBatch('artist', batchArtist)} className="px-3 py-1.5 text-xs bg-white border border-blue-200 text-blue-700 rounded-md hover:bg-blue-100">应用</button>
            </div>

            {/* Category */}
             <div className="flex items-center space-x-1">
                <select 
                    value={batchCategory} 
                    onChange={(e) => setBatchCategory(e.target.value)} 
                    className="p-1.5 border border-blue-200 rounded-md bg-white text-sm focus:ring-1 focus:ring-blue-500"
                >
                    <option value="">(空值)</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => applyBatch('category', batchCategory)} className="px-3 py-1.5 text-xs bg-white border border-blue-200 text-blue-700 rounded-md hover:bg-blue-100">应用</button>
            </div>

            {/* Asset Type */}
            <div className="flex items-center space-x-1">
                <select 
                    value={batchAssetType} 
                    onChange={(e) => setBatchAssetType(e.target.value as AssetType | '')} 
                    className="p-1.5 border border-blue-200 rounded-md bg-white text-sm focus:ring-1 focus:ring-blue-500"
                >
                    <option value="">(空值)</option>
                    {assetTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button onClick={() => applyBatch('assetType', batchAssetType)} className="px-3 py-1.5 text-xs bg-white border border-blue-200 text-blue-700 rounded-md hover:bg-blue-100">应用</button>
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="p-6 overflow-y-auto space-y-4 bg-gray-50 flex-1">
          {visibleTasks.map(task => {
            const isAnalyzing = task.status === 'analyzing';
            const isError = task.status === 'error';
            
            const currentArtist = getTaskValue(task, 'artist') as string;
            const currentCategory = getTaskValue(task, 'category') as string;
            const currentType = getTaskValue(task, 'assetType') as string;
            const currentTitle = getTaskValue(task, 'title') as string;
            const currentName = getTaskValue(task, 'imageName') as string;
            const currentTags = getTaskValue(task, 'tags') as string[];
            const currentTagsZh = getTaskValue(task, 'tagsZh') as string[] | undefined;

            return (
                <div key={task.id} className={`relative bg-white border rounded-lg p-4 transition-all ${isAnalyzing ? 'border-blue-200 shadow-sm' : 'border-gray-200 shadow-sm hover:shadow-md'}`}>
                    <button onClick={() => handleRemoveTask(task.id)} className="absolute top-3 right-3 p-2 text-gray-300 hover:text-red-500 z-10 transition-colors">
                        <DeleteIcon className="w-5 h-5" />
                    </button>
                    
                    <div className="grid grid-cols-12 gap-6 items-start">
                        {/* Image Preview & Progress Overlay */}
                        <div className="col-span-2 relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
                            <img src={task.preview} alt={task.title} className={`w-full h-full object-cover transition-opacity ${isAnalyzing ? 'opacity-50' : 'opacity-100'}`} />
                            {isAnalyzing && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm">
                                    <Spinner size="md" className="text-primary" />
                                    <span className="text-xs font-bold text-primary mt-2">{task.progress}%</span>
                                </div>
                            )}
                            {isError && (
                                <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                                    <span className="text-xs font-bold text-red-500">分析失败</span>
                                </div>
                            )}
                        </div>

                        {/* Editor Fields */}
                        <div className={`col-span-10 grid grid-cols-4 gap-4 ${isAnalyzing ? 'opacity-50 pointer-events-none' : ''}`}>
                            
                            {/* Row 1: Naming & Basic Info */}
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">图片命名 (Date)</label>
                                <input 
                                    type="text" 
                                    value={currentName || ''} 
                                    onChange={e => updateLocalEdit(task.id, 'imageName', e.target.value)} 
                                    className="w-full p-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-blue-700" 
                                    placeholder="YYYYMMDD-X"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">描述 (Title)</label>
                                <input 
                                    type="text" 
                                    value={currentTitle} 
                                    onChange={e => updateLocalEdit(task.id, 'title', e.target.value)} 
                                    className="w-full p-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">AI 分类 (Category)</label>
                                <select 
                                    value={currentCategory} 
                                    onChange={e => updateLocalEdit(task.id, 'category', e.target.value)} 
                                    className="w-full p-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                >
                                    <option value="">(空值)</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">艺术家</label>
                                <select 
                                    value={currentArtist} 
                                    onChange={e => updateLocalEdit(task.id, 'artist', e.target.value)} 
                                    className="w-full p-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                >
                                    <option value="">(空值)</option>
                                    {artists.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                                </select>
                            </div>

                            {/* Row 2: Asset Type & Tags */}
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">类别</label>
                                <select 
                                    value={currentType} 
                                    onChange={e => updateLocalEdit(task.id, 'assetType', e.target.value)} 
                                    className="w-full p-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                >
                                    <option value="">(空值)</option>
                                    {assetTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div className="col-span-3">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">标签 (Tags)</label>
                                <div className="p-2 border border-gray-200 rounded-md bg-white min-h-[42px] flex flex-wrap gap-2 items-center">
                                    {currentTags.map((tag, idx) => (
                                        <div key={`${tag}-${idx}`} className="group relative flex flex-col items-center bg-blue-50 border border-blue-100 rounded px-2 py-1">
                                            <span className="text-sm font-medium text-blue-800">{tag}</span>
                                            {currentTagsZh && currentTagsZh[idx] && (
                                                <span className="text-[10px] text-blue-400 mt-0.5">{currentTagsZh[idx]}</span>
                                            )}
                                            <button 
                                                onClick={() => handleRemoveTag(task.id, tag)} 
                                                className="absolute -top-1.5 -right-1.5 bg-red-100 text-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                                            >
                                                <CloseIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex-grow flex items-center min-w-[100px]">
                                        <input 
                                            type="text" 
                                            placeholder="+ tag" 
                                            className="w-full text-sm outline-none bg-transparent placeholder-gray-400"
                                            onKeyDown={(e) => { 
                                                if (e.key === 'Enter') { 
                                                    e.preventDefault(); 
                                                    handleAddTag(task.id, e.currentTarget.value); 
                                                    e.currentTarget.value = ''; 
                                                } 
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-gray-100 p-5 flex-shrink-0 bg-white rounded-b-lg">
          <div className="text-sm text-gray-500">
              已处理: <span className="font-bold text-gray-800">{visibleTasks.length - analyzingCount}</span> / {visibleTasks.length}
          </div>
          <div className="flex space-x-3">
            <button onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">
                取消
            </button>
            <button 
                onClick={handleConfirmAction} 
                disabled={!allComplete || visibleTasks.length === 0}
                className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed font-medium shadow-sm transition-all flex items-center"
            >
                {mode === 'download' ? '下载素材包' : `确认上传 (${visibleTasks.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewAndEditModal;
