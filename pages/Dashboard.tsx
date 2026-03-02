
/**
 * @file Dashboard Page (Dashboard.tsx)
 * @description This component serves as the main landing page after a user logs in.
 * It provides a high-level overview of the application's key metrics through
 * statistical cards and charts, and offers quick navigation to major management sections.
 */
import React, { useMemo } from 'react';
import { Page } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AssetIcon, AIGenerateIcon, CommunityIcon, SearchIcon } from '../components/shared/Icons';
import { Asset, AIGeneration, Report, SearchTerm } from '../types';

// =================================================================================
// ===== SUB-COMPONENTS
// =================================================================================

/**
 * Props for the StatCard component.
 */
interface StatCardProps {
    /** The icon to display in the card. */
    icon: React.ReactNode;
    /** The title or label for the metric. */
    title: string;
    /** The main value of the metric to display. */
    value: string | number;
    /** An optional percentage change to display. */
    change?: number;
    /** An optional click handler to make the card a navigation link. */
    onClick?: () => void;
    /** The background color class for the icon container. */
    color: string;
}

/**
 * A card component for displaying a single key statistic on the dashboard.
 * @param {StatCardProps} props - The props for the component.
 */
const StatCard: React.FC<StatCardProps> = ({ icon, title, value, change, onClick, color }) => (
    <div 
        className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4 transition-all hover:shadow-md hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : 'figure'}
        tabIndex={onClick ? 0 : -1}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        {change !== undefined && (
            <div className={`text-sm font-semibold ml-auto ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {change >= 0 ? '▲' : '▼'} {Math.abs(change)}%
            </div>
        )}
    </div>
);


// =================================================================================
// ===== MAIN COMPONENT
// =================================================================================

/**
 * Props for the Dashboard component.
 */
interface DashboardProps {
  /** A function to set the current active page, used for navigation. */
  setCurrentPage: (page: Page) => void;
  /** The complete list of assets. */
  assets: Asset[];
  /** The complete list of AI generation records. */
  aiGenerations: AIGeneration[];
  /** The complete list of community reports. */
  reports: Report[];
  /** The complete list of search terms. */
  searchTerms: SearchTerm[];
}

/**
 * The main dashboard component.
 * It calculates and displays key metrics and charts based on the provided data.
 * @param {DashboardProps} props - The props for the component.
 */
const Dashboard: React.FC<DashboardProps> = ({ setCurrentPage, assets, aiGenerations, reports, searchTerms }) => {

    // --- Data Processing & Memoization ---

    const totalAssets = useMemo(() => assets.length, [assets]);
    const totalAIGenerations = aiGenerations.length;
    const totalPendingReports = useMemo(() => reports.filter(r => r.status === 'Pending').length, [reports]);
    
    // The "hottest" search term is determined by sorting all terms by their search count in descending order and taking the first one.
    const hotSearchTerm = useMemo(() => {
        if (!searchTerms || searchTerms.length === 0) return null;
        return [...searchTerms].sort((a, b) => b.h - a.h)[0];
    }, [searchTerms]);

    /** Memoized calculation for weekly AI generation trends. */
    const weeklyAIGenerations = useMemo(() => {
        const today = new Date();
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const dailyCounts: Record<string, number> = last7Days.reduce((acc, date) => ({ ...acc, [date]: 0 }), {} as Record<string, number>);

        aiGenerations.forEach(gen => {
            const genDate = new Date(gen.generationTime).toISOString().split('T')[0];
            // Ensure genDate exists in dailyCounts before incrementing.
            if (Object.prototype.hasOwnProperty.call(dailyCounts, genDate)) {
                dailyCounts[genDate] = (dailyCounts[genDate] || 0) + 1;
            }
        });
        
        return Object.entries(dailyCounts).map(([date, count]) => ({
            name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            count
        }));
    }, [aiGenerations]);
    
    /** Memoized calculation for the distribution of top 5 AI generation styles. */
    const styleDistribution = useMemo(() => {
        const counts = aiGenerations.reduce((acc, gen) => {
            const current = acc[gen.style] || 0;
            acc[gen.style] = current + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a,b) => (b.count as number) - (a.count as number))
            .slice(0, 5);
    }, [aiGenerations]);

    // --- Render Logic ---

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800">仪表盘</h1>
                <p className="text-gray-500 mt-1">欢迎回来! 这是您的系统概览。</p>
            </div>

            {/* Key Metric Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    icon={<AssetIcon className="w-6 h-6 text-blue-800" />} 
                    title="总素材量" value={totalAssets} color="bg-blue-100"
                    onClick={() => setCurrentPage('assets')}
                />
                <StatCard 
                    icon={<AIGenerateIcon className="w-6 h-6 text-purple-800" />} 
                    title="AI 生图总数" value={totalAIGenerations} color="bg-purple-100"
                    onClick={() => setCurrentPage('ai-generations')}
                />
                <StatCard 
                    icon={<CommunityIcon className="w-6 h-6 text-red-800" />} 
                    title="待处理举报" value={totalPendingReports} color="bg-red-100"
                    onClick={() => setCurrentPage('community')}
                />
                <StatCard 
                    icon={<SearchIcon className="w-6 h-6 text-green-800" />} 
                    title="最热搜索词" value={hotSearchTerm?.term || 'N/A'}
                    color="bg-green-100"
                    onClick={() => setCurrentPage('search')}
                />
            </div>

            {/* Data Visualization Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">过去7天 AI 生图数量</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={weeklyAIGenerations} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Line type="monotone" dataKey="count" name="生图数量" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                     <h3 className="text-lg font-semibold text-gray-800 mb-4">热门生图风格 Top 5</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={styleDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={60} />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="count" name="数量" fill="#818cf8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

             {/* Quick Navigation Panel */}
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