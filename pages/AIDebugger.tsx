/**
 * @file AI 调试页面 (AIDebugger.tsx)
 * @description 该页面用于展示从配置的接口获取的 AI 调试信息和日志。
 */
import React from 'react';
import { AIDebuggerData } from '../types';

// 定义页面 props 的接口
interface AIDebuggerProps {
  aiDebuggerData: AIDebuggerData;
}

const AIDebugger: React.FC<AIDebuggerProps> = ({ aiDebuggerData }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">AI 调试日志</h1>
        <p className="text-gray-500 mt-1">查看从“接口管理”页面配置的 API 端点获取的 AI 调试信息和日志。</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        {aiDebuggerData && aiDebuggerData.length > 0 ? (
          // 使用 pre 和 code 标签来格式化和展示 JSON 数据
          <pre className="bg-gray-900 text-white p-4 rounded-md text-sm max-h-[70vh] overflow-auto">
            <code>
              {JSON.stringify(aiDebuggerData, null, 2)}
            </code>
          </pre>
        ) : (
          <p className="text-gray-500 text-center py-10">
            没有可用的调试数据。请在“接口管理”页面配置有效的 API 端点。
          </p>
        )}
      </div>
    </div>
  );
};

export default AIDebugger;
