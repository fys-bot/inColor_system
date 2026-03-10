import React, { useState, useEffect, useCallback } from 'react';
import { Page } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AssetIcon, AIGenerateIcon, CommunityIcon, SearchIcon, RefreshIcon } from '../components/shared/Icons';
import { Asset } from '../types';
import Spinner from '../components/shared/Spinner';
import { API_BASE } from '../utils/api';

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    onClick?: () => void;
    color: string;
    loading?: boolean;
    customContent?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, onClick, color, loading, customContent }) => (
    <div 
        className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4 transition-all hover:shadow-md hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : 'figure'}
        tabIndex={onClick ? 0 : -1}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
        <div className={`p-3 rounded-full ${color}`}>{icon}</div>
        {loading ? (
            <div className="flex-1 flex items-center"><Spinner size="sm" /></div>
        ) : customContent ? customContent : (
            <div>
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <p className="text-3xl font-bold text-gray-800">{value}</p>
            </div>
        )}
    </div>
);

type TimeRange = '1d' | '7d' | '30d';
const rangeLabels: Record<TimeRange, string> = { '1d': '近1天', '7d': '近7天', '30d': '近30天' };

interface DashboardProps {
    setCurrentPage: (page: Page) => void;
    assets: Asset[];
    assetsLoading: boolean;
    refreshAssets: () => Promise<any>;
}

const Dashboard: React.FC<DashboardProps> = ({ setCurrentPage, assets, assetsLoading, refreshAssets }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [range, setRange] = useState<TimeRange>('1d');
    const [data, setData] = useState<{
        imagenTotal: number;
        rangeTotal: number;
        reportPending: number;
        hotSearchTerm: { term: string; h: number } | null;
        weeklyGenerations: { name: string; count: number }[];
        styleDistribution: { name: string; count: number }[];
    }>({
        imagenTotal: 0,
        rangeTotal: 0,
        reportPending: 0,
        hotSearchTerm: null,
        weeklyGenerations: [],
        styleDistribution: []
    });

    const fetchOverview = useCallback(async (r: TimeRange) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/dashboard/overview?range=${r}`).then(r => r.json());
            if (res.data) setData(res.data);
        } catch (e) {
            console.error('仪表盘数据加载失败:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchOverview(range); }, [range, fetchOverview]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            fetchOverview(range),
            refreshAssets(),
        ]);
        setRefreshing(false);
    };

    const totalAssets = assets.length;
    const isAssetsReady = !assetsLoading && totalAssets > 0;

    // 按类型统计素材数量
    const assetBreakdown = React.useMemo(() => {
        const counts: Record<string, number> = {};
        assets.forEach(a => { counts[a.assetType] = (counts[a.assetType] || 0) + 1; });
        return counts;
    }, [assets]);

    const typeLabels: Record<string, string> = {
        Categorized: '分类图库',
        Daily: '每日更新',
        Activity: '活动图',
        Grayscale: '灰度图',
        Homepage: '主页图',
    };
    const typeColors: Record<string, string> = {
        Categorized: 'bg-blue-100 text-blue-700',
        Daily: 'bg-amber-100 text-amber-700',
        Activity: 'bg-pink-100 text-pink-700',
        Grayscale: 'bg-gray-200 text-gray-700',
        Homepage: 'bg-indigo-100 text-indigo-700',
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">仪表盘</h1>
                    <p className="text-gray-500 mt-1">欢迎回来! 这是您的系统概览。</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        title="刷新所有数据"
                    >
                        <RefreshIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? '刷新中...' : '刷新'}
                    </button>
                    <div className="flex items-center bg-white border rounded-lg overflow-hidden">
                        {(['1d', '7d', '30d'] as TimeRange[]).map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${range === r ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                {rangeLabels[r]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    icon={<AssetIcon className="w-6 h-6 text-blue-800" />} 
                    title="总素材量" value="" color="bg-blue-100"
                    onClick={() => setCurrentPage('assets')}
                    loading={assetsLoading}
                    customContent={isAssetsReady ? (
                        <div>
                            <p className="text-sm text-gray-500 font-medium">总素材量</p>
                            <p className="text-3xl font-bold text-gray-800">{totalAssets.toLocaleString()}</p>
                        </div>
                    ) : undefined}
                />
                <StatCard 
                    icon={<AIGenerateIcon className="w-6 h-6 text-purple-800" />} 
                    title="AI 生图总数" value="" color="bg-purple-100"
                    onClick={() => setCurrentPage('ai-generations')}
                    loading={loading}
                    customContent={!loading ? (
                        <div>
                            <p className="text-sm text-gray-500 font-medium">AI 生图 · {rangeLabels[range]}</p>
                            <p className="text-3xl font-bold text-purple-700">{data.rangeTotal.toLocaleString()}</p>
                            <p className="text-xs text-gray-400 mt-1">总计 {data.imagenTotal.toLocaleString()}</p>
                        </div>
                    ) : undefined}
                />
                <StatCard 
                    icon={<CommunityIcon className="w-6 h-6 text-red-800" />} 
                    title="待处理举报" value={data.reportPending} color="bg-red-100"
                    onClick={() => setCurrentPage('community')}
                    loading={loading}
                />
                <StatCard 
                    icon={<SearchIcon className="w-6 h-6 text-green-800" />} 
                    title="最热搜索词" value={data.hotSearchTerm?.term || 'N/A'}
                    color="bg-green-100"
                    onClick={() => setCurrentPage('search')}
                    loading={loading}
                />
            </div>

            {/* 素材分类统计 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">素材分类统计</h3>
                {assetsLoading ? (
                    <div className="flex items-center justify-center py-8"><Spinner size="lg" /></div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {Object.entries(typeLabels).map(([key, label]) => (
                            <div key={key} className="text-center p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => setCurrentPage('assets')}>
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold mb-2 ${typeColors[key] || 'bg-gray-100 text-gray-600'}`}>{label}</span>
                                <p className="text-2xl font-bold text-gray-800">{(assetBreakdown[key] || 0).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 图表 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{rangeLabels[range]} AI 生图数量</h3>
                    {loading ? (
                        <div className="flex items-center justify-center h-[300px]"><Spinner size="lg" /></div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={data.weeklyGenerations} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Legend />
                                <Line type="monotone" dataKey="count" name="生图数量" stroke="#3b82f6" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">热门生图风格 Top 5</h3>
                    {loading ? (
                        <div className="flex items-center justify-center h-[300px]"><Spinner size="lg" /></div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.styleDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" width={60} />
                                <RechartsTooltip />
                                <Legend />
                                <Bar dataKey="count" name="数量" fill="#818cf8" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* 快速导航 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">快速导航</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <button onClick={() => setCurrentPage('assets')} className="p-4 bg-gray-50 rounded-lg text-center hover:bg-gray-100 transition-colors">
                        <AssetIcon className="w-8 h-8 mx-auto text-primary" />
                        <p className="mt-2 font-semibold text-gray-700">素材管理</p>
                    </button>
                    <button onClick={() => setCurrentPage('community')} className="p-4 bg-gray-50 rounded-lg text-center hover:bg-gray-100 transition-colors">
                        <CommunityIcon className="w-8 h-8 mx-auto text-primary" />
                        <p className="mt-2 font-semibold text-gray-700">社区管理</p>
                    </button>
                    <button onClick={() => setCurrentPage('search')} className="p-4 bg-gray-50 rounded-lg text-center hover:bg-gray-100 transition-colors">
                        <SearchIcon className="w-8 h-8 mx-auto text-primary" />
                        <p className="mt-2 font-semibold text-gray-700">搜索管理</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
