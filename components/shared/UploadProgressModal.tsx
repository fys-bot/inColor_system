/**
 * @file 上传进度模态框组件 (UploadProgressModal.tsx)。
 * @description 该组件用于在文件上传和 AI 分析期间向用户显示一个模态框，
 * 里面包含了每个文件的处理进度和状态。
 */
import React from 'react';
import { CloseIcon } from './Icons';
import { UploadTask } from '../../types';

// 定义组件的 props 类型
interface UploadProgressModalProps {
  tasks: UploadTask[];               // 所有上传任务的数组
  onClose: () => void;               // 关闭模态框的回调
  completedCount: number;            // 已完成的任务数量
  totalCount: number;                // 总任务数量
  onCancelTask: (taskId: string) => void; // 取消单个任务的回调
}

const UploadProgressModal: React.FC<UploadProgressModalProps> = ({ tasks, onClose, completedCount, totalCount, onCancelTask }) => {
  // 判断是否所有任务都已完成或出错
  const allDoneOrError = tasks.every(t => t.status === 'complete' || t.status === 'error');

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]"
      >
        {/* 头部 */}
        <div className="flex justify-between items-center border-b p-4 flex-shrink-0">
          <h3 className="text-xl font-semibold text-gray-900">
            {allDoneOrError ? '处理完成' : `正在处理... (${completedCount}/${totalCount})`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 总体进度条 */}
        <div className="p-6 flex-shrink-0">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-accent h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* 任务列表 */}
        <div className="p-6 pt-0 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map(task => (
              <TaskItem key={task.id} task={task} onCancel={onCancelTask} />
            ))}
          </div>
        </div>
        
        {/* 如果全部完成，显示底部操作按钮 */}
        {allDoneOrError && (
          <div className="p-4 border-t flex justify-end">
            <button onClick={onClose} className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-hover">
              {tasks.some(t => t.status === 'complete') ? '下一步' : '关闭'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// 单个任务项子组件
const TaskItem: React.FC<{task: UploadTask, onCancel: (taskId: string) => void}> = ({ task, onCancel }) => {
  const getStatusText = () => {
    switch (task.status) {
      case 'analyzing': return 'AI 分析中...';
      case 'complete': return '分析完成';
      case 'error': return '分析失败';
      default: return '';
    }
  };
   const getStatusColor = () => {
    switch (task.status) {
      case 'analyzing': return 'text-blue-500';
      case 'complete': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 flex items-start space-x-3 border">
      <img src={task.preview} alt={task.title} className="w-16 h-16 object-cover rounded-md flex-shrink-0 bg-white" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
        <div className="w-full mt-2">
            <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-semibold ${getStatusColor()}`}>{getStatusText()}</span>
                {task.status !== 'error' && <span className="text-xs font-mono text-gray-600">{task.progress}%</span>}
            </div>
            {/* 单个文件进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-accent h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${task.progress}%` }}
                ></div>
            </div>
        </div>
      </div>
       <button onClick={() => onCancel(task.id)} className="text-gray-400 hover:text-gray-600 p-1">
         <CloseIcon className="w-4 h-4" />
       </button>
    </div>
  );
};

export default UploadProgressModal;