import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Page, Asset, ThemedBook } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { RefreshIcon } from '../components/shared/Icons';
import Spinner from '../components/shared/Spinner';
import { API_BASE } from '../utils/api';

type TimeRange = '1d' | '7d' | '30d';
const rangeLabels: Record<TimeRange, string> = { '1d': '今日', '7d': '近7天', '30d': '近30天' };

interface DashboardData {
    imagenTotal: number;
    rangeTotal: number;
    prevRangeTotal: number;
    prevUniqueUsers: number;
    reportPending: number;
    reportTotal: number;
    detectionPending: number;
    detectionTotal: number;
    hotSearchTerm: { term: string; h: number } | null;
    topSearchTerms: { term: string; h: number; n: number; c: number }[];
    scarceTerms: { term: string; h: number; n: number; rarity: number }[];
    weeklyGenerations: { name: string; count: number }[];
    styleDistribution: { name: string; count: number }[];
    modelDistribution: { name: string; count: number }[];
    platformDistribution: { name: string; count: number }[];
    modeDistribution: { name: string; count: number }[];
    successCount: number;
    failCount: number;
    topUsers: { name: string; count: number }[];
    uniqueUsers: number;
    peakHours: { hour: number; count: number }[];
    modelPerformance: { name: string; total: number; success: number; fail: number; rate: number }[];
    avgPerUser: string;
    hourlyCounts: number[];
    [key: string]: any;
}

const emptyData: DashboardData = {
    imagenTotal: 0, rangeTotal: 0, prevRangeTotal: 0, prevUniqueUsers: 0,
    reportPending: 0, reportTotal: 0, detectionPending: 0, detectionTotal: 0,
    hotSearchTerm: null, topSearchTerms: [], scarceTerms: [],
    weeklyGenerations: [], styleDistribution: [],
    modelDistribution: [], platformDistribution: [], modeDistribution: [],
    successCount: 0, failCount: 0, topUsers: [], uniqueUsers: 0,
    peakHours: [], modelPerformance: [], avgPerUser: '0', hourlyCounts: []
};

// ── 环比 ──
const Trend: React.FC<{ cur: number; prev: number }> = ({ cur, prev }) => {
    if (!prev && !cur) return null;
    if (!prev) return null;
    const p = Math.round(((cur - prev) / prev) * 100);
    if (p === 0) return null;
    return <span className={`text-[10px] font-medium ${p > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{p > 0 ? '↑' : '↓'}{Math.abs(p)}%</span>;
};

// ── 进度条行 ──
const BarRow: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => (
    <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-20 flex-shrink-0 truncate">{label}</span>
        <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(Math.round((value / (max || 1)) * 100), 3)}%` }} />
        </div>
        <span className="text-xs font-semibold text-gray-700 w-10 text-right">{value}</span>
    </div>
);

interface DashboardProps {
    setCurrentPage: (page: Page) => void;
    assets: Asset[];
    themedBooks: ThemedBook[];
    assetsLoading: boolean;
    refreshAssets: () => Promise<any>;
}

const Dashboard: React.FC<DashboardProps> = ({ setCurrentPage, assets, themedBooks, assetsLoading, refreshAssets }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [range, setRange] = useState<TimeRange>('7d');
    const [d, setD] = useState<DashboardData>(emptyData);

    const fetchData = useCallback(async (r: TimeRange) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/dashboard/overview?range=${r}`).then(x => x.json());
            if (res.data) setD(prev => ({ ...prev, ...res.data }));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(range); }, [range, fetchData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchData(range), refreshAssets()]);
        setRefreshing(false);
    };

    // ── 素材统计 ──
    const assetStats = useMemo(() => {
        const byType: Record<string, number> = {};
        let aiCount = 0;
        const tagCounts: Record<string, number> = {};
        assets.forEach((a: Asset) => {
            byType[a.assetType] = (byType[a.assetType] || 0) + 1;
            if (a.isAI) aiCount++;
            (a.tags || []).forEach((t: string) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
        });
        // 主题图册统计
        const bookCount = themedBooks.filter((b: ThemedBook) => !b.isArtistBook).length;
        const artistBookCount = themedBooks.filter((b: ThemedBook) => b.isArtistBook).length;
        const totalPatterns = themedBooks.reduce((sum: number, b: ThemedBook) => sum + (b.patterns?.length || 0), 0);
        // 热门标签 top 8
        const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
        return { byType, aiCount, bookCount, artistBookCount, totalPatterns, topTags, total: assets.length };
    }, [assets, themedBooks]);

    const pendingTotal = d.reportPending + d.detectionPending;
    const L = loading;

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        return h < 6 ? '夜深了' : h < 12 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
    }, []);

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{greeting}</h1>
                    <p className="text-gray-400 text-sm mt-0.5">
                        {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleRefresh} disabled={refreshing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                        <RefreshIcon className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        刷新
                    </button>
                    <div className="flex bg-white border rounded-lg overflow-hidden">
                        {(['1d', '7d', '30d'] as TimeRange[]).map(r => (
                            <button key={r} onClick={() => setRange(r)}
                                className={`px-3 py-1.5 text-xs font-medium transition-colors ${range === r ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                                {rangeLabels[r]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── 待办提醒 ── */}
            {!L && pendingTotal > 0 && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
                    <p className="text-sm text-amber-800">
                        ⚠️ {d.reportPending > 0 && <span>用户举报 <span className="font-bold">{d.reportPending}</span> 条</span>}
                        {d.reportPending > 0 && d.detectionPending > 0 && '，'}
                        {d.detectionPending > 0 && <span>系统检测 <span className="font-bold">{d.detectionPending}</span> 条</span>}
                        <span className="text-amber-600"> 待处理</span>
                    </p>
                    <button onClick={() => setCurrentPage('community')}
                        className="px-4 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 flex-shrink-0">
                        去处理
                    </button>
                </div>
            )}

            {/* ── 核心数字（3个） ── */}
            <div className="grid grid-cols-3 gap-4">
                {L ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border p-5 flex items-center justify-center h-24"><Spinner size="sm" /></div>
                )) : (<>
                    <div className="bg-white rounded-xl border p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all" onClick={() => setCurrentPage('ai-generations')}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">AI 生图 · {rangeLabels[range]}</span>
                            <Trend cur={d.rangeTotal} prev={d.prevRangeTotal} />
                        </div>
                        <p className="text-3xl font-bold text-gray-800">{d.rangeTotal.toLocaleString()}</p>
                        <p className="text-[11px] text-gray-400 mt-1">累计 {d.imagenTotal.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl border p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all" onClick={() => setCurrentPage('community')}>
                        <span className="text-xs text-gray-400">社区审核</span>
                        <p className="text-3xl font-bold text-gray-800 mt-1">{d.reportPending + d.detectionPending}</p>
                        <p className="text-[11px] text-gray-400 mt-1">举报 {d.reportPending} · 检测 {d.detectionPending}</p>
                    </div>
                    <div className="bg-white rounded-xl border p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all" onClick={() => setCurrentPage('search')}>
                        <span className="text-xs text-gray-400">今日热搜</span>
                        <p className="text-2xl font-bold text-gray-800 mt-1 truncate">{d.hotSearchTerm?.term || '-'}</p>
                        {d.hotSearchTerm && <p className="text-[11px] text-gray-400 mt-1">热度 {d.hotSearchTerm.h}</p>}
                    </div>
                </>)}
            </div>

            {/* ── 生图趋势 ── */}
            <div className="bg-white rounded-xl border p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-gray-700">生图趋势 · {rangeLabels[range]}</p>
                    {!L && d.peakHours && d.peakHours.length > 0 && (
                        <span className="text-[11px] text-gray-400">高峰 {d.peakHours.map((h: any) => `${h.hour}:00`).join('、')}</span>
                    )}
                </div>
                {L ? <div className="flex items-center justify-center h-[200px]"><Spinner size="lg" /></div> : (
                    d.weeklyGenerations.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={d.weeklyGenerations} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#e5e7eb" />
                                <YAxis tick={{ fontSize: 11 }} stroke="#e5e7eb" />
                                <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                                <Area type="monotone" dataKey="count" name="生图数" stroke="#3b82f6" strokeWidth={2} fill="url(#areaFill)" dot={{ r: 3, fill: '#3b82f6' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <p className="text-gray-300 text-center py-16 text-sm">该时间段暂无数据</p>
                )}
            </div>

            {/* ── 风格分布（只在有数据时显示） ── */}
            {!L && d.styleDistribution.length > 0 && (
                <div className="bg-white rounded-xl border p-5">
                    <p className="text-sm font-bold text-gray-700 mb-3">热门生图风格 · {rangeLabels[range]}</p>
                    <ResponsiveContainer width="100%" height={Math.max(d.styleDistribution.length * 40, 120)}>
                        <BarChart data={d.styleDistribution} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis type="number" tick={{ fontSize: 11 }} stroke="#e5e7eb" />
                            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} stroke="#e5e7eb" />
                            <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                            <Bar dataKey="count" name="数量" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* ── 内置素材构成（重点细分） ── */}
            <div className="bg-white rounded-xl border p-5">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-gray-700">内置素材构成</p>
                    <button onClick={() => setCurrentPage('assets')} className="text-xs text-primary hover:underline">管理素材</button>
                </div>
                {assetsLoading ? <div className="flex items-center justify-center py-8"><Spinner size="lg" /></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 左侧：单图分类 */}
                        <div>
                            <p className="text-xs text-gray-400 font-medium mb-3">单图素材 · 共 {assetStats.total.toLocaleString()} 张</p>
                            <div className="space-y-2.5">
                                <BarRow label="分类图库" value={assetStats.byType['Categorized'] || 0} max={assetStats.total} color="bg-blue-400" />
                                <BarRow label="每日更新" value={assetStats.byType['Daily'] || 0} max={assetStats.total} color="bg-amber-400" />
                                <BarRow label="活动图" value={assetStats.byType['Activity'] || 0} max={assetStats.total} color="bg-pink-400" />
                                <BarRow label="灰度图" value={assetStats.byType['Grayscale'] || 0} max={assetStats.total} color="bg-gray-400" />
                                <BarRow label="主页图" value={assetStats.byType['Homepage'] || 0} max={assetStats.total} color="bg-indigo-400" />
                            </div>
                            {assetStats.aiCount > 0 && (
                                <p className="text-[11px] text-gray-400 mt-3">其中 AI 生成素材 {assetStats.aiCount} 张（{Math.round((assetStats.aiCount / assetStats.total) * 100)}%）</p>
                            )}
                        </div>

                        {/* 右侧：图册 + 标签 */}
                        <div className="space-y-5">
                            {/* 图册统计 */}
                            <div>
                                <p className="text-xs text-gray-400 font-medium mb-3">主题图册</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                                        <p className="text-xl font-bold text-gray-800">{assetStats.bookCount}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">普通图册</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                                        <p className="text-xl font-bold text-gray-800">{assetStats.artistBookCount}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">艺术家图册</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                                        <p className="text-xl font-bold text-gray-800">{assetStats.totalPatterns}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">图册内图片</p>
                                    </div>
                                </div>
                            </div>

                            {/* 热门标签 */}
                            {assetStats.topTags.length > 0 && (
                                <div>
                                    <p className="text-xs text-gray-400 font-medium mb-2">热门标签</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {assetStats.topTags.map(([tag, count]) => (
                                            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-[11px]">
                                                {tag} <span className="text-gray-400">{count}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── 搜索热词（有数据才显示） ── */}
            {!L && d.topSearchTerms && d.topSearchTerms.length > 0 && (
                <div className="bg-white rounded-xl border p-5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-gray-700">搜索热词</p>
                        <button onClick={() => setCurrentPage('search')} className="text-xs text-primary hover:underline">查看全部</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {d.topSearchTerms.slice(0, 12).map((t: any, i: number) => (
                            <span key={t.term} className={`px-3 py-1.5 rounded-full text-xs ${i === 0 ? 'bg-red-50 text-red-700 font-medium' : i < 3 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>
                                {t.term} <span className="opacity-50">{t.h}</span>
                            </span>
                        ))}
                    </div>
                    {d.scarceTerms && d.scarceTerms.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-xs text-amber-600 font-medium mb-2">⚠️ 稀缺内容提示（用户搜索多但素材少）</p>
                            <div className="flex flex-wrap gap-2">
                                {d.scarceTerms.slice(0, 5).map((t: any) => (
                                    <span key={t.term} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs">
                                        {t.term} <span className="text-amber-400 text-[10px]">搜{t.n}/结果{t.h}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── 快速入口 ── */}
            <div className="bg-white rounded-xl border p-5">
                <p className="text-sm font-bold text-gray-700 mb-3">快速入口</p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {([
                        { label: '素材管理', icon: '📁', page: 'assets' as Page },
                        { label: '生图记录', icon: '🎨', page: 'ai-generations' as Page },
                        { label: '社区管理', icon: '👥', page: 'community' as Page },
                        { label: '搜索管理', icon: '🔍', page: 'search' as Page },
                        { label: '批量生图', icon: '🖼', page: 'batch-image-generation' as Page },
                        { label: '用户管理', icon: '👤', page: 'user-management' as Page },
                    ]).map(item => (
                        <button key={item.page} onClick={() => setCurrentPage(item.page)}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <span className="text-lg">{item.icon}</span>
                            <span className="text-[11px] text-gray-600">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
