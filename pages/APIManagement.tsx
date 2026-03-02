/**
 * @file 接口管理页面 (APIManagement.tsx)
 * @description 该页面现在是一个面向开发者的集成指南，详细说明了每个功能模块所需的后端接口规格，并允许管理员配置接口的 URL。
 */
import React, { useState, useEffect } from 'react';
import { APIEndpointConfig, APIEndpointFeature } from '../types';
import { useToast } from '../context/ToastContext';
import * as Icons from '../components/shared/Icons';
import Spinner from '../components/shared/Spinner';

// 定义页面 props 的接口
interface APIManagementProps {
  apiEndpoints: APIEndpointConfig;
  setApiEndpoints: React.Dispatch<React.SetStateAction<APIEndpointConfig>>;
}

// 为每个功能定义详细的元数据，包括接口规格
const featureMetadata: Record<APIEndpointFeature, { 
    name: string; 
    description: string; 
    icon: React.ReactNode;
    method: 'GET' | 'POST';
    requestLibraryInfo: string;
    params: string;
    responseFormat: string;
}> = {
  assets: { 
    name: '图库数据接口', 
    description: '为“内置素材管理”页面提供所有素材的数据。', 
    icon: <Icons.AssetIcon className="w-5 h-5 mr-2 text-primary" />,
    method: 'GET',
    requestLibraryInfo: '标准 Fetch API',
    params: '无',
    responseFormat: JSON.stringify([
        {
          "id": "AI1000",
          "imageUrl": "https://picsum.photos/seed/AI0/400/300",
          "description": "AI asset number 1",
          "assetType": "AI",
          "aiCategory": "建筑",
          "uploadDate": "2023-05-10",
          "isHidden": false,
          "tags": ["城市", "夜晚", "复古"],
          "artist": "特约艺术家A"
        }
    ], null, 2),
  },
  aiGenerations: { 
    name: 'AI生图管理接口', 
    description: '为“AI生图管理”页面提供所有生图记录的数据。', 
    icon: <Icons.AIGenerateIcon className="w-5 h-5 mr-2 text-primary" />,
    method: 'GET',
    requestLibraryInfo: '标准 Fetch API',
    params: '无',
    responseFormat: JSON.stringify([
        {
            "id": "AIGEN2000",
            "os": "iOS",
            "version": "1.3.2",
            "modelName": "Vertex AI-Imagen-4",
            "size": "方形",
            "style": "卡通",
            "userId": "USER100",
            "prompt": "A beautiful landscape painting...",
            "generationTime": "2023-08-01T10:00:00Z",
            "duration": 15,
            "imageUrl": "https://picsum.photos/seed/aigen0/256/256",
            "feedback": "Looks great!"
        }
    ], null, 2),
  },
  reports: { 
    name: '社区管理接口', 
    description: '为“社区管理”页面提供所有举报记录的数据。', 
    icon: <Icons.CommunityIcon className="w-5 h-5 mr-2 text-primary" />,
    method: 'GET',
    requestLibraryInfo: '标准 Fetch API',
    params: '无',
    responseFormat: JSON.stringify([
        {
            "id": "REP3000",
            "reportedContent": { "type": "image", "url": "..." },
            "reason": "Spam",
            "reporterId": "USER101",
            "reportedUserId": "USER102",
            "timestamp": "2023-11-15T14:30:00Z",
            "status": "Pending"
        }
    ], null, 2),
  },
  searchTerms: { 
    name: '搜索管理接口', 
    description: '为“搜索管理”页面提供所有搜索词条的数据。', 
    icon: <Icons.SearchIcon className="w-5 h-5 mr-2 text-primary" />,
    method: 'GET',
    requestLibraryInfo: '标准 Fetch API',
    params: '无',
    responseFormat: JSON.stringify([
        {
            "term": "动漫女孩",
            "count": 15230,
            "matchRate": 85,
            "category": "hot",
            "trend": 15
        }
    ], null, 2),
  },
  subscriptionUsers: { 
    name: '订阅用户接口', 
    description: '为“订阅用户管理”页面提供所有用户的数据。', 
    icon: <Icons.UserIcon className="w-5 h-5 mr-2 text-primary" />,
    method: 'GET',
    requestLibraryInfo: '标准 Fetch API',
    params: '无',
    responseFormat: JSON.stringify([
        {
            "id": "sub_user_1000",
            "avatarUrl": "https://i.pravatar.cc/150?img=1",
            "username": "User1000",
            "appId": "user_app_100000",
            "subscriptionStatus": "活跃",
            "subscriptionPlan": "Pro",
            "expirationDate": "2025/12/31",
            "totalConsumption": 99.99,
            "registrationDate": "2024/01/15",
            "accountStatus": "正常"
        }
    ], null, 2),
  },
  aiDebugger: { 
    name: 'AI调试日志接口', 
    description: '为“AI调试”页面提供日志数据。', 
    icon: <Icons.BugIcon className="w-5 h-5 mr-2 text-primary" />,
    method: 'GET',
    requestLibraryInfo: '标准 Fetch API',
    params: '无',
    responseFormat: JSON.stringify([
        {
            "timestamp": "2024-01-01T12:00:00Z",
            "level": "INFO",
            "message": "AI model 'gemini-2.5-flash' initialized.",
            "metadata": { "service": "imageTagging" }
        }
    ], null, 2),
  },
};

const APIManagement: React.FC<APIManagementProps> = ({ apiEndpoints, setApiEndpoints }) => {
  const { showToast } = useToast();
  const [localEndpoints, setLocalEndpoints] = useState<APIEndpointConfig>(apiEndpoints);
  const [expandedDetails, setExpandedDetails] = useState<APIEndpointFeature | null>(null);

  type TestStatus = 'idle' | 'testing' | 'success' | 'error';
  const [testStatus, setTestStatus] = useState<Record<APIEndpointFeature, TestStatus>>(() => {
    const initialStatus = {} as Record<APIEndpointFeature, TestStatus>;
    (Object.keys(featureMetadata) as APIEndpointFeature[]).forEach(feature => {
        initialStatus[feature] = 'idle';
    });
    return initialStatus;
  });
  
  // Sync local state if props change from parent
  useEffect(() => {
    setLocalEndpoints(apiEndpoints);
  }, [apiEndpoints]);

  const handleLocalUrlChange = (feature: APIEndpointFeature, url: string) => {
    setLocalEndpoints(prev => ({ ...prev, [feature]: url }));
    // Reset test status when URL changes
    setTestStatus(prev => ({ ...prev, [feature]: 'idle' }));
  };
  
  const handleSave = (feature: APIEndpointFeature) => {
    const newUrl = localEndpoints[feature].trim();
    setApiEndpoints(prev => ({ ...prev, [feature]: newUrl }));
    showToast(`“${featureMetadata[feature].name}”的接口地址已保存`, 'success');
  };

  const handleTestConnection = async (feature: APIEndpointFeature) => {
    const url = localEndpoints[feature].trim();
    if (!url) {
      showToast('请输入 URL 以进行测试', 'error');
      return;
    }

    setTestStatus(prev => ({ ...prev, [feature]: 'testing' }));

    try {
      const response = await fetch(url, { method: featureMetadata[feature].method, headers: { 'Accept': 'application/json' } });
      if (response.ok) {
        setTestStatus(prev => ({ ...prev, [feature]: 'success' }));
        showToast('连接成功！服务器返回 2xx 状态。', 'success');
      } else {
        setTestStatus(prev => ({ ...prev, [feature]: 'error' }));
        showToast(`连接失败: ${response.status} ${response.statusText}`, 'error');
      }
    } catch (error) {
      setTestStatus(prev => ({ ...prev, [feature]: 'error' }));
      showToast('连接失败: 检查网络、URL 或 CORS 策略。', 'error');
      console.error(error);
    }
  };
  
  const getStatusIcon = (status: TestStatus) => {
      switch (status) {
          case 'testing': return <Spinner size="sm" />;
          case 'success': return <Icons.CheckIcon className="w-5 h-5 text-green-500" />;
          case 'error': return <Icons.CloseIcon className="w-5 h-5 text-red-500" />;
          default: return null;
      }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">接口管理 & 开发者指南</h1>
        <p className="text-gray-500 mt-1">配置系统数据接口，并查看各接口的技术规格以供后端开发参考。</p>
      </div>

      <div className="space-y-6">
        {(Object.keys(featureMetadata) as APIEndpointFeature[]).map(feature => {
          const metadata = featureMetadata[feature];
          const isExpanded = expandedDetails === feature;
          const currentUrl = localEndpoints[feature];
          const originalUrl = apiEndpoints[feature];
          const hasUnsavedChanges = currentUrl !== originalUrl;
          const status = testStatus[feature];

          return (
            <div key={feature} className="bg-white p-6 rounded-lg shadow-sm border transition-all duration-300">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">{metadata.icon}{metadata.name}</h2>
              <p className="text-sm text-gray-600 mt-1 mb-4">{metadata.description}</p>
              
              <div>
                <label htmlFor={`endpoint-url-${feature}`} className="block text-sm font-medium text-gray-700 mb-1">当前接口地址</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-grow">
                        <input
                            id={`endpoint-url-${feature}`}
                            type="url"
                            placeholder="输入此功能的 API 端点 URL..."
                            value={currentUrl}
                            onChange={(e) => handleLocalUrlChange(feature, e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-primary focus:border-primary font-mono text-sm"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            {getStatusIcon(status)}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button 
                            onClick={() => handleTestConnection(feature)}
                            disabled={status === 'testing'}
                            className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 text-sm font-medium disabled:bg-gray-100 disabled:cursor-wait"
                        >
                            测试连接
                        </button>
                        <button 
                            onClick={() => handleSave(feature)}
                            disabled={!hasUnsavedChanges}
                            className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            保存
                        </button>
                    </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => setExpandedDetails(isExpanded ? null : feature)}
                  className="text-sm font-medium text-primary hover:underline flex items-center"
                >
                  {isExpanded ? '隐藏接口详情' : '查看接口详情'}
                  <Icons.ChevronDownIcon className={`w-4 h-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
              
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2"><Icons.CodeIcon className="w-4 h-4 text-gray-500" /><strong className="text-gray-600">请求方法:</strong><span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{metadata.method}</span></div>
                    <div className="flex items-center space-x-2"><Icons.CodeIcon className="w-4 h-4 text-gray-500" /><strong className="text-gray-600">请求库:</strong><span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{metadata.requestLibraryInfo}</span></div>
                    <div className="flex items-center space-x-2"><Icons.CodeIcon className="w-4 h-4 text-gray-500" /><strong className="text-gray-600">API 参数:</strong><span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{metadata.params}</span></div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">响应格式 (Response Format):</h4>
                    <pre className="bg-gray-900 text-white p-4 rounded-md text-xs max-h-60 overflow-auto">
                      <code>{metadata.responseFormat}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default APIManagement;
