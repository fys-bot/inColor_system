
/**
 * @file 社区管理页面 (CommunityManagement.tsx)
 * @description 该页面用于处理用户举报、管理社区用户状态，并利用 AI 进行辅助翻译。
 * 新增功能：本地缓存机制，用于回溯已删除的举报内容的图片和文本。
 * V0.9.11 更新：增加已处理内容的恢复功能，增加手动数据刷新功能。
 */
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Report, User, ReportStatus, BanDetails, BanType, ReportedContent, AIModelConfig, SystemDetection, UserReports, ReportState, SystemDetectionS } from '../types';
import { useImagePreview } from '../context/ImagePreviewContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/shared/Modal';
import Spinner from '../components/shared/Spinner';
import Tooltip from '../components/shared/Tooltip';
import * as Icons from '../components/shared/Icons';
import { triggerHaptic, btnClickable } from '../utils/ux';

// 定义页面内的标签页类型
type SubTab = 'pending' | 'processed' | 'banned';
type SystemSubTab = 'pending' | 'processed';

// 定义排序配置的类型
type SortConfig = { key: 'reportedUserCount' | 'timestamp'; direction: 'asc' | 'desc' } | null;

const reportReasons = {
    abuse: '违法有害信息',
    hate_speech: '仇恨言论/恐怖主义',
    spam: '垃圾广告营销',
    offensive: '憎恨/不友善内容',
    sex_violence: '淫秽色情/暴力'
}

// === 缓存相关常量 ===
const CACHE_PREFIX = 'cm_cache_';
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30天

/**
 * 清理过期缓存
 */
const cleanUpOldCache = () => {
    const now = Date.now();
    let deletedCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
            try {
                const item = JSON.parse(localStorage.getItem(key) || '{}');
                if (item.savedAt && (now - item.savedAt > CACHE_DURATION)) {
                    localStorage.removeItem(key);
                    deletedCount++;
                }
            } catch (e) {
                // 如果解析失败，可能是坏数据，也删除
                localStorage.removeItem(key);
            }
        }
    }
    if (deletedCount > 0) {
        console.log(`[Cache] Cleaned up ${deletedCount} expired community records.`);
    }
};

/**
 * 保存数据到缓存
 */
const saveToCache = (items: any[], type: 'report' | 'detection') => {
    items.forEach(item => {
        if (!item.id) return;
        const key = `${CACHE_PREFIX}${item.id}`;
        // 只缓存必要信息
        const cacheData = {
            id: item.id,
            url: item.url,
            content: type === 'report' ? item.comment : item.type, // 举报存 comment，系统检测存 type
            avatar: item.author, // 系统检测有 author 头像
            savedAt: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
    });
};

/**
 * 从缓存获取数据并合并
 */
const mergeWithCache = (item: any) => {
    const key = `${CACHE_PREFIX}${item.id}`;
    const cachedStr = localStorage.getItem(key);
    if (cachedStr) {
        try {
            const cached = JSON.parse(cachedStr);
            return {
                ...item,
                url: cached.url || item.url, // 优先使用缓存图片，防止链接失效
                comment: cached.content || item.comment,
                author: cached.avatar || item.author,
                _isCached: true // 标记使用了缓存
            };
        } catch (e) {
            return item;
        }
    }
    return item;
};

/**
 * 根据举报状态返回对应的徽章组件。
 * @param {ReportStatus} status - 举报的处理状态。
 * @returns {React.ReactNode} 状态徽章组件。
 */
const getStatusBadge = (status: ReportState) => {
    switch (status) {
        case 'pending': return <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">待处理</span>;
        case 'block': return <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">已拒审</span>;
        case 'deleted': return <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">已拒审</span>;
        case 'ignore': return <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">已通过</span>;
        default: return null;
    }
};

// 定义组件的 props 接口
interface CommunityManagementProps {
    reports?: any[]; // Relaxed to handle mock data mismatch
    setReports: React.Dispatch<React.SetStateAction<any[]>>;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    systemDetections?: SystemDetection[];
    setSystemDetections?: React.Dispatch<React.SetStateAction<SystemDetection[]>>;
    aiModelConfig: AIModelConfig;
    activeTab: 'user_reports' | 'system_detection';
}

const CommunityManagement: React.FC<CommunityManagementProps> = ({ reports, setReports, users, setUsers, systemDetections = [], setSystemDetections, aiModelConfig, activeTab }) => {
    const { showPreview } = useImagePreview();
    const { showToast } = useToast();

    // 状态管理
    const [subTab, setSubTab] = useState<SubTab>('pending');
    const [systemSubTab, setSystemSubTab] = useState<SystemSubTab>('pending');
    const [selectedItems, setSelectedItems] = useState<UserReports[]>([]);
    const [isUserModalOpen, setUserModalOpen] = useState(false);
    const [isBanModalOpen, setBanModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [banDetails, setBanDetails] = useState({ type: 'mute' as BanType, duration: '1', reason: '' });
    const [translationState, setTranslationState] = useState<Record<string, { loading: boolean; text: string | null }>>({});
    const [recentlyModifiedUserId, setRecentlyModifiedUserId] = useState<string | null>(null);
    const [isDeleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
    const [itemsToDelete, setItemsToDelete] = useState<UserReports[]>([]);
    // 新增：排序状态
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'desc' });

    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false); // 刷新状态
    const [userReports, setUserReports] = useState<Record<string, UserReports[]>>({});
    const [systemDetections_, setSystemDetections_] = useState<Record<string, SystemDetectionS[]>>({});
    
    // 初始化清理缓存
    useEffect(() => {
        cleanUpOldCache();
    }, []);

    const getUserReportsData = async () => {
        const res = await fetch(`https://sg.api.eyewind.cn/etl/imagen/user_report/load`, {
            "headers": {
                "accept": "*/*",
                "content-type": "application/json",
            },
            "body": "{\"limit\":1000}",
            "method": "POST",
            "mode": "cors",
        }).then(r => r.json());
        return res
    }

    const getSystemDetectionData = async () => {
        const res = await fetch(`https://sg.api.eyewind.cn/etl/imagen/system_detection/load`, {
            "headers": {
                "accept": "*/*",
                "content-type": "application/json",
            },
            "body": "{\"limit\":1000}",
            "method": "POST",
            "mode": "cors",
        }).then(r => r.json());
        return res
    }

    const fetchData = async () => {
        setLoading(true);
        try {
            const [reportRes, sdRes] = await Promise.all([
                getUserReportsData(),
                getSystemDetectionData()
            ]);

            if (reportRes.success) {
                setUserReports(reportRes.data);
                if (reportRes.data.pending) saveToCache(reportRes.data.pending, 'report');
            }
            if (sdRes.success) {
                setSystemDetections_(sdRes.data);
                if (sdRes.data.pending) saveToCache(sdRes.data.pending, 'detection');
            }
        } catch (error) {
            console.error("获取数据失败:", error);
            showToast("数据获取失败，请稍后重试", "error");
        } finally {
            setLoading(false);
        }
    };

    // 手动刷新逻辑
    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        triggerHaptic('medium');
        
        try {
            await fetchData();
            showToast("数据已同步至最新状态", "success");
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const currentList = useMemo(() => {
        if (!userReports) return [];
        let list = [];
        switch (subTab) {
            case 'pending':
                list = userReports.pending || [];
                break;
            case 'processed':
                const processedItems = (userReports.ignore || []).concat(userReports.deleted || []);
                list = processedItems.sort((a, b) => {
                    const timeA = new Date(a.updatedAt).getTime();
                    const timeB = new Date(b.updatedAt).getTime();
                    return timeB - timeA;
                }) || [];
                break;
            case 'banned':
                list = userReports?.block || [];
                break;
            default:
                list = [];
        }
        // 应用缓存合并 (主要是针对 'processed' 状态，如果后端没返回图片，尝试从本地取)
        return list.map(item => mergeWithCache(item));
    }, [userReports, subTab])

    const filterDuplicateObjects = (array = [], key = 'id') => {
        const uniqueMap = new Map();
        array.forEach(item => {
            const uniqueKey = item?.[key];
            if (!uniqueMap.has(uniqueKey)) {
                uniqueMap.set(uniqueKey, item);
            }
        });
        return Array.from(uniqueMap.values());
    };

    const currentSystemList = useMemo(() => {
        if (!systemDetections_) return [];
        let list = [];
        switch (systemSubTab) {
            case 'pending':
                list = filterDuplicateObjects(systemDetections_?.pending || [], 'id') || [];
                break;
            case 'processed':
                const processedSysItems = (systemDetections_?.ignore || []).concat(systemDetections_?.deleted || []);
                list = filterDuplicateObjects(processedSysItems, 'id').sort((a, b) => {
                    const timeA = new Date(a.createdAt).getTime();
                    const timeB = new Date(b.createdAt).getTime();
                    return timeB - timeA;
                }) || [];
                break;
            default:
                list = [];
        }
        // 应用缓存合并
        return list.map(item => mergeWithCache(item));
    }, [systemDetections_, systemSubTab])

    useEffect(() => {
        if (recentlyModifiedUserId) {
            const timer = setTimeout(() => {
                setRecentlyModifiedUserId(null);
            }, 3000); // Highlight for 3 seconds
            return () => clearTimeout(timer);
        }
    }, [recentlyModifiedUserId]);

    // Clear selections when changing tabs
    useEffect(() => {
        setSelectedItems([]);
    }, [activeTab, subTab, systemSubTab]);

    /**
     * 为举报列表添加被举报用户的历史被举报次数。
     */
    const addReportedCountToReports = (reportsToProcess: Report[]) => {
        return reportsToProcess.map(report => {
            const user = users.find(u => u.id === report.reportedUserId);
            const reportedUserCount = user ? user.reportHistory.length : 0;
            return { ...report, reportedUserCount };
        });
    };

    /**
     * 根据当前排序配置对举报列表进行排序。
     */
    const sortReports = (reportsToSort: Array<Report & { reportedUserCount: number }>) => {
        if (sortConfig) {
            return [...reportsToSort].sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                const valA = sortConfig.key === 'timestamp' ? new Date(aValue as string).getTime() : aValue;
                const valB = sortConfig.key === 'timestamp' ? new Date(bValue as string).getTime() : bValue;

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return reportsToSort;
    }

    const bannedUsers = useMemo(() => {
        const bannedUids = new Set(currentList.filter(u => u.state === 'block').map(u => u.uid));
        return users.filter(user => bannedUids.has(user.id));
    }, [currentList, users]);

    /**
     * 处理排序请求，循环切换排序状态（降序 -> 升序 -> 不排序）。
     * @param {'reportedUserCount' | 'timestamp'} key - 请求排序的字段。
     */
    const requestSort = (key: 'reportedUserCount' | 'timestamp') => {
        if (sortConfig && sortConfig.key === key) {
            if (sortConfig.direction === 'desc') {
                setSortConfig({ key, direction: 'asc' });
            } else {
                setSortConfig(null);
            }
        } else {
            setSortConfig({ key, direction: 'desc' });
        }
    };

    const handleSelect = (id: string, checked: boolean) => {
        const selectedItem = currentList.find(c => c.id === id);
        if (!selectedItem) {
            console.warn(`Item with id ${id} not found in current list.`);
            return;
        }
        setSelectedItems(prevSelectedItems => {
            if (checked) {
                const exists = prevSelectedItems.some(item => item.id === id);
                if (exists) return prevSelectedItems;
                return [...prevSelectedItems, selectedItem];
            } else {
                return prevSelectedItems.filter(item => item.id !== id);
            }
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (activeTab === 'user_reports' && (subTab === 'pending' || subTab === 'processed')) {
            setSelectedItems(checked ? currentList : []);
        }
    };

    const handleUserReportsChange = async (action, rows) => {
        const res = await fetch(`https://sg.api.eyewind.cn/etl/imagen/user_report/update`, {
            "headers": {
                "accept": "*/*",
                "content-type": "application/json",
            },
            "body": JSON.stringify({
                action, rows
            }),
            "method": "POST",
            "mode": "cors",
        }).then(r => r.json());
        return res;
    }

    const handleAction = async (reports: UserReports[], status: 'delete' | 'ignore') => {
        setSelectedItems([]);
        const res = await handleUserReportsChange(status, reports);
        if (res?.success) {
            showToast(`${res.id.length} 个举报已标记为 "${status === 'delete' ? '已拒审' : '已通过审核'}"`, 'success');
            const data = await getUserReportsData();
            if (data.success) {
                setUserReports(data.data);
            }
        }
    };

    // 恢复用户举报状态为待处理
    const handleRestoreReport = async (report: UserReports) => {
        const res = await handleUserReportsChange('pending', [report]);
        if (res?.success) {
            showToast(`举报已恢复至待处理`, 'success');
            const data = await getUserReportsData();
            if (data.success) {
                setUserReports(data.data);
                // 确保缓存中也有该条目（如果之前被清理了）
                if (data.data.pending && Array.isArray(data.data.pending)) {
                    saveToCache(data.data.pending, 'report');
                }
            }
        }
    };

    const handleDeleteClick = (repors: UserReports[]) => {
        if (repors.length === 0) return;
        setItemsToDelete(repors);
        setDeleteConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        setReports(prev => prev.filter(r => !itemsToDelete.map(i => i.id).includes(r.id)));
        showToast(`${itemsToDelete.length} 条记录已彻底删除`, 'success');
        setSelectedItems([]);
        setItemsToDelete([]);
        setDeleteConfirmModalOpen(false);
    };

    const openUserModal = (userId: string) => {
        // Implementation
    };

    const openBanModal = (userId: string) => {
        // Implementation
    };

    const handleTranslate = async (report: UserReports) => {
        if (!process.env.API_KEY) { showToast("API_KEY 环境变量未设置", 'error'); return; }
        if (!report?.comment) return;

        setTranslationState(prev => ({ ...prev, [report.id]: { loading: true, text: null } }));
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({ model: aiModelConfig.textTranslation.modelName, contents: `Translate the following text to Simplified Chinese: "${report?.comment}"` });
            setTranslationState(prev => ({ ...prev, [report.id]: { loading: false, text: response.text } }));
        } catch (error) {
            console.error("Translation error:", error);
            showToast("AI 翻译失败", 'error');
            setTranslationState(prev => ({ ...prev, [report.id]: { loading: false, text: '翻译出错' } }));
        }
    };

    const handleBanUser = () => {
        if (!selectedUser) return;
        const durationDays = parseInt(banDetails.duration, 10);
        const bannedUntilDate = new Date();
        bannedUntilDate.setDate(bannedUntilDate.getDate() + durationDays);

        const newBanDetails: BanDetails = {
            type: banDetails.type,
            duration: durationDays,
            reason: banDetails.reason || '未提供原因',
            bannedUntil: bannedUntilDate.toISOString(),
        };

        setUsers(prevUsers => prevUsers.map(u => u.id === selectedUser.id ? { ...u, status: 'Banned', banDetails: newBanDetails } : u));
        setRecentlyModifiedUserId(selectedUser.id);
        setBanModalOpen(false);
        setUserModalOpen(false);
        showToast(`用户 ${selectedUser.id} 的封禁信息已更新`, 'success');
        setBanDetails({ type: 'mute', duration: '1', reason: '' });
    };

    const handleUnbanUser = (userId: string) => {
        setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, status: 'Active', banDetails: undefined } : u));
        setRecentlyModifiedUserId(userId);
        showToast(`用户 ${userId} 已解封`, 'success');
    };

    const handleModifyBan = (user: User) => {
        if (user.banDetails) {
            setSelectedUser(user);
            setBanDetails({
                type: user.banDetails.type,
                duration: String(user.banDetails.duration),
                reason: user.banDetails.reason,
            });
            setBanModalOpen(true);
        } else {
            showToast(`用户 ${user.id} 没有有效的封禁信息`, 'error');
        }
    };

    const handleSystemDetectionsChange = async (action, rows) => {
        const res = await fetch(`https://sg.api.eyewind.cn/etl/imagen/system_detection/update`, {
            "headers": {
                "accept": "*/*",
                "content-type": "application/json",
            },
            "body": JSON.stringify({
                action, rows
            }),
            "method": "POST",
            "mode": "cors",
        }).then(r => r.json());
        return res;
    }

    const handleSystemDetectionAction = async (item: SystemDetectionS, action: 'ignore' | 'delete') => {
        await handleSystemDetectionsChange(action, [item]);
        showToast(action === 'ignore' ? '操作成功：内容已审核通过' : '操作成功：内容已拒审并删除', 'success');
        const sd = await getSystemDetectionData();
        if (sd.success) {
            setSystemDetections_(sd.data);
            // 缓存更新
            if (sd.data.pending && Array.isArray(sd.data.pending)) {
                saveToCache(sd.data.pending, 'detection');
            }
        }
    };

    // 恢复系统检测记录状态为待处理
    const handleRestoreSystemDetection = async (item: SystemDetectionS) => {
        await handleSystemDetectionsChange('pending', [item]);
        showToast('检测记录已恢复至待处理', 'success');
        const sd = await getSystemDetectionData();
        if (sd.success) {
            setSystemDetections_(sd.data);
            // 缓存更新
            if (sd.data.pending && Array.isArray(sd.data.pending)) {
                saveToCache(sd.data.pending, 'detection');
            }
        }
    };

    // --- 渲染函数 ---
    const renderReportContent = (report: UserReports & { _isCached?: boolean }) => {
        const hasImage = !!report?.url;
        const hasComment = !!report?.comment;
        if (!hasImage && !hasComment) return null;

        return (
            <div className="flex items-start space-x-3 w-full max-w-sm">
                {hasImage && (
                    <div className="relative">
                        <img
                            src={report?.url || ''}
                            alt="reported"
                            className="h-16 w-16 object-cover rounded-md cursor-pointer flex-shrink-0 border border-gray-200"
                            onClick={(e) => { e.stopPropagation(); showPreview(report?.url); }}
                            onError={(e) => {
                                // 简单的错误处理，如果图片挂了显示占位
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=Error';
                            }}
                        />
                        {report._isCached && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" title="从本地缓存加载"></span>
                            </span>
                        )}
                    </div>
                )}
                {hasComment && (
                    <div className="flex-1 min-w-0">
                        <p className="truncate text-sm text-gray-700" title={report?.comment}>
                            {report?.comment}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const renderTranslation = (report: UserReports) => {
        if (!report?.comment) return <span className="text-gray-400">—</span>;
        const state = translationState[report.id];
        if (state?.loading) return <Spinner size="sm" />;
        if (state?.text) return <p className="text-blue-600 font-semibold max-w-xs" title={state.text}>{state.text}</p>;
        if (subTab === 'pending') {
            return (
                <button onClick={(e) => { e.stopPropagation(); handleTranslate(report); }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full">
                    <Tooltip content="翻译"><Icons.TranslateIcon className="w-4 h-4" /></Tooltip>
                </button>
            );
        }
        return <span className="text-gray-400">—</span>;
    }

    const renderActions = (report: UserReports) => {
        if (subTab === 'pending') {
            return (
                <div className="flex items-center space-x-1">
                    <Tooltip content="拒审"><button onClick={(e) => { e.stopPropagation(); handleAction([report], 'delete') }} className="p-1.5 text-danger hover:bg-red-100 rounded-full"><Icons.DeleteIcon className="w-4 h-4" /></button></Tooltip>
                    <Tooltip content="通过审核"><button onClick={(e) => { e.stopPropagation(); handleAction([report], 'ignore') }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full"><Icons.CheckIcon className="w-4 h-4" /></button></Tooltip>
                    <Tooltip content="封禁用户"><button onClick={(e) => { e.stopPropagation(); openBanModal(report.uid) }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full"><Icons.ShieldCheckIcon className="w-4 h-4" /></button></Tooltip>
                </div>
            );
        }
        return (
            <div className="flex items-center space-x-1">
                 <Tooltip content="恢复"><button onClick={(e) => { e.stopPropagation(); handleRestoreReport(report) }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full"><Icons.RevertIcon className="w-4 h-4" /></button></Tooltip>
                <Tooltip content="彻底删除"><button onClick={(e) => { e.stopPropagation(); handleDeleteClick([report]) }} className="p-1.5 text-danger hover:bg-red-100 rounded-full"><Icons.DeleteIcon className="w-4 h-4" /></button></Tooltip>
            </div>
        );
    };

    const renderSortableHeader = (label: string, sortKey: 'reportedUserCount' | 'timestamp') => (
        <th scope="col" className="py-3 px-6 whitespace-nowrap bg-gray-50 cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {label}
                {sortConfig?.key === sortKey ? (
                    sortConfig.direction === 'asc' ? <Icons.ChevronUpIcon className="w-4 h-4 ml-1" /> : <Icons.ChevronDownIcon className="w-4 h-4 ml-1" />
                ) : <div className="w-4 h-4 ml-1"></div>}
            </div>
        </th>
    );

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex-shrink-0 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">社区管理</h1>
                    <p className="text-gray-500 mt-1">处理用户举报并维护社区健康。</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleRefresh}
                        disabled={isRefreshing || loading}
                        className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-primary/30 transition-all shadow-sm ${btnClickable} ${(isRefreshing || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Icons.RefreshCwIcon className={`w-4 h-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>刷新数据</span>
                    </button>
                </div>
            </div>

            {activeTab === 'user_reports' ? (
                <>
                    <div className="border-b border-gray-200 flex-shrink-0">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button onClick={() => { setSubTab('pending'); }} className={`${subTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>待处理 ({userReports?.pending?.length || 0})</button>
                            <button onClick={() => { setSubTab('processed'); }} className={`${subTab === 'processed' ? 'border-primary text-primary' : 'border-transparent text-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>已处理 ({(userReports?.ignore || []).concat(userReports?.deleted || []).length})</button>
                            <button onClick={() => { setSubTab('banned'); }} className={`${subTab === 'banned' ? 'border-primary text-primary' : 'border-transparent text-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>封禁用户 ({userReports?.block?.length || 0})</button>
                        </nav>
                    </div>

                    <div className="flex-1 bg-white rounded-lg shadow-md border flex flex-col min-h-0">
                        {(subTab === 'pending' || subTab === 'processed') && (
                            <div className="p-4 border-b bg-gray-50 flex-shrink-0">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                                    <div className="flex-1">
                                        {selectedItems.length > 0 ? (
                                            <p className="text-sm font-medium text-blue-800">{`已选择 ${selectedItems.length} 项.`}</p>
                                        ) : (
                                            <p className="text-sm text-gray-500">
                                                {subTab === 'pending' ? '处理社区用户提交的举报。' : '查看已处理的举报，可恢复或彻底删除。'}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        {subTab === 'pending' ? (
                                            <>
                                                <button
                                                    onClick={() => handleAction(selectedItems, 'delete')}
                                                    disabled={selectedItems.length === 0}
                                                    className="w-full sm:w-auto px-4 py-2 bg-danger text-white text-sm rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                                                >
                                                    批量拒审
                                                </button>
                                                <button
                                                    onClick={() => handleAction(selectedItems, 'ignore')}
                                                    disabled={selectedItems.length === 0}
                                                    className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white text-sm rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                                                >
                                                    批量通过审核
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleDeleteClick(selectedItems)}
                                                disabled={selectedItems.length === 0}
                                                className="w-full sm:w-auto px-4 py-2 bg-danger text-white text-sm rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                                            >
                                                批量彻底删除
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-auto">
                            {/* Mobile Card View */}
                            <div className="lg:hidden">
                                {subTab === 'banned' ? (
                                    <div className="divide-y divide-gray-200">
                                        {bannedUsers.map(user => (
                                            <div key={user.id} className={`p-4 space-y-2 transition-colors duration-1000 ${recentlyModifiedUserId === user.id ? 'bg-yellow-100' : ''}`}>
                                                <div className="flex justify-between items-center">
                                                    <span className="font-mono text-gray-800">{user.id}</span>
                                                </div>
                                                <p><strong className="font-medium text-gray-600">类型:</strong> {user.banDetails?.type === 'mute' ? '禁止发言' : '禁止发布'}</p>
                                                <p><strong className="font-medium text-gray-600">理由:</strong> {user.banDetails?.reason}</p>
                                                <p><strong className="font-medium text-gray-600">解封时间:</strong> {user.banDetails?.duration === 36500 ? '永久' : new Date(user.banDetails?.bannedUntil || '').toLocaleString()}</p>
                                                <div className="flex items-center space-x-2 pt-2">
                                                    <button onClick={() => handleModifyBan(user)} className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-md">修改</button>
                                                    <button onClick={() => handleUnbanUser(user.id)} className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded-md">解封</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-200">
                                        {currentList.map(report => (
                                            <div
                                                key={report.id}
                                                className={`p-4 space-y-3 cursor-pointer hover:bg-gray-50 ${selectedItems.map(s => s.id).includes(report.id) ? 'bg-blue-50' : ''}`}
                                                onClick={() => handleSelect(report.id, !selectedItems.map(s => s.id).includes(report.id))}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start space-x-3">
                                                        <input type="checkbox" checked={selectedItems.map(s => s.id).includes(report.id)} onChange={e => handleSelect(report.id, e.target.checked)} className="mt-1 form-checkbox h-5 w-5 text-primary rounded focus:ring-primary" onClick={e => e.stopPropagation()} />
                                                        <div onClick={e => e.stopPropagation()}>{renderReportContent(report)}</div>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        {getStatusBadge(report.state)}
                                                    </div>
                                                </div>
                                                <div><strong className="font-medium text-gray-600">翻译:</strong> <div className="inline-block ml-2" onClick={e => e.stopPropagation()}>{renderTranslation(report)}</div></div>
                                                <div><strong className="font-medium text-gray-600">原因:</strong> {Object.keys(report.reasons || {}).map(k => reportReasons[k]).join('、')}</div>
                                                <div><strong className="font-medium text-gray-600">被举报用户:</strong> <button onClick={(e) => { e.stopPropagation(); openUserModal(report.uid) }} className="font-mono text-primary hover:underline">{report.uid}</button></div>
                                                <div><strong className="font-medium text-gray-600">被举报次数:</strong> <span className="font-bold text-red-600">{report.count}</span></div>
                                                <div className="text-xs text-gray-500">{report.createdAt}</div>
                                                {subTab === 'processed' && <div><strong className="font-medium text-gray-600">处理时间:</strong> {report.updatedAt || '—'}</div>}
                                                <div className="pt-2 flex justify-end" onClick={e => e.stopPropagation()}>{renderActions(report)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Desktop Table View */}
                            {loading && (
                                <Spinner size="lg" />
                            ) || (
                                    <div className="hidden lg:block">
                                        {subTab === 'banned' ? (
                                            <table className="w-full text-sm text-left text-gray-500">
                                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10"><tr>{['用户 ID', '封禁类型', '封禁理由', '解封时间', '操作'].map(h => <th key={h} scope="col" className="py-3 px-6 whitespace-nowrap bg-gray-50">{h}</th>)}</tr></thead>
                                                <tbody>{bannedUsers.map(user => (<tr key={user.id} className={`bg-white border-b hover:bg-gray-50 transition-colors duration-1000 ${recentlyModifiedUserId === user.id ? 'bg-yellow-100' : ''}`}>
                                                    <td className="py-4 px-6 font-mono">{user.id}</td>
                                                    <td className="py-4 px-6">{user.banDetails?.type === 'mute' ? '禁止发言' : '禁止发布'}</td>
                                                    <td className="py-4 px-6"><p className="max-w-xs truncate" title={user.banDetails?.reason}>{user.banDetails?.reason}</p></td>
                                                    <td className="py-4 px-6 whitespace-nowrap">{user.banDetails?.duration === 36500 ? '永久' : new Date(user.banDetails?.bannedUntil || '').toLocaleString()}</td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center space-x-1">
                                                            <Tooltip content="修改封禁"><button onClick={() => handleModifyBan(user)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full"><Icons.EditIcon className="w-4 h-4" /></button></Tooltip>
                                                            <Tooltip content="解封用户"><button onClick={() => handleUnbanUser(user.id)} className="p-1.5 text-green-600 hover:bg-green-100 rounded-full"><Icons.RevertIcon className="w-4 h-4" /></button></Tooltip>
                                                        </div>
                                                    </td>
                                                </tr>))}</tbody>
                                            </table>
                                        ) : (
                                            <table className="w-full text-sm text-left text-gray-500">
                                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
                                                    <tr>
                                                        <th scope="col" className="p-4 bg-gray-50 sticky left-0 z-20">
                                                            <input
                                                                type="checkbox"
                                                                onChange={e => handleSelectAll(e.target.checked)}
                                                                checked={selectedItems.length > 0 && selectedItems.length === currentList.length && currentList.length > 0}
                                                                className="form-checkbox h-4 w-4 text-primary rounded focus:ring-primary"
                                                            />
                                                        </th>
                                                        {['被举报内容', '翻译', '举报原因', '举报人 ID', '被举报用户 ID'].map(h => <th key={h} scope="col" className="py-3 px-6 whitespace-nowrap bg-gray-50">{h}</th>)}
                                                        {renderSortableHeader('被举报次数', 'reportedUserCount')}
                                                        {renderSortableHeader('举报时间', 'timestamp')}
                                                        {subTab === 'processed' && <th scope="col" className="py-3 px-6 whitespace-nowrap bg-gray-50">处理时间</th>}
                                                        <th scope="col" className="min-w-[120px] py-3 px-6 whitespace-nowrap bg-gray-50">状态</th>
                                                        <th scope="col" className="py-3 px-6 whitespace-nowrap bg-gray-50">操作</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentList.map(report => (
                                                        <tr
                                                            key={report.id}
                                                            className={`bg-white border-b hover:bg-gray-50 cursor-pointer ${selectedItems.map(s => s.id).includes(report.id) ? 'bg-blue-50' : ''}`}
                                                            onClick={() => handleSelect(report.id, !selectedItems.map(s => s.id).includes(report.id))}
                                                        >
                                                            <td className="p-4 bg-white sticky left-0 z-10" onClick={e => e.stopPropagation()}>
                                                                <input type="checkbox" checked={selectedItems.map(s => s.id).includes(report.id)} onChange={e => handleSelect(report.id, e.target.checked)} className="form-checkbox h-4 w-4 text-primary rounded focus:ring-primary" />
                                                            </td>
                                                            <td className="py-4 px-6" onClick={e => e.stopPropagation()}>{renderReportContent(report)}</td>
                                                            <td className="py-4 px-6" onClick={e => e.stopPropagation()}><div className="min-w-[120px]">{renderTranslation(report)}</div></td>
                                                            <td className="min-w-[200px] py-4 px-6">{Object.keys(report.reasons || {}).map(k => reportReasons[k]).join('、')}</td>
                                                            <td className="py-4 px-6 font-mono">{(report.uids || []).join('、')}</td>
                                                            <td className="py-4 px-6 font-mono" onClick={e => e.stopPropagation()}><button onClick={() => openUserModal(report.uid)} className="text-primary hover:underline">{report.uid}</button></td>
                                                            <td className="py-4 px-6 font-bold text-red-600 text-center">{report.count}</td>
                                                            <td className="py-4 px-6 whitespace-nowrap">{report.createdAt}</td>
                                                            {subTab === 'processed' && <td className="py-4 px-6 whitespace-nowrap">{report.updatedAt || '—'}</td>}
                                                            <td className="min-w-[120px] py-4 px-6">{getStatusBadge(report.state)}</td>
                                                            <td className="py-4 px-6" onClick={e => e.stopPropagation()}>{renderActions(report)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="border-b border-gray-200 flex-shrink-0">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button onClick={() => { setSystemSubTab('pending'); }} className={`${systemSubTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>待处理 ({systemDetections_?.pending?.length || 0})</button>
                            <button onClick={() => { setSystemSubTab('processed'); }} className={`${systemSubTab === 'processed' ? 'border-primary text-primary' : 'border-transparent text-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>已处理 ({(systemDetections_?.ignore || []).concat(systemDetections_?.deleted || []).filter(Boolean).length})</button>
                        </nav>
                    </div>
                    <div className="flex-1 bg-white rounded-lg shadow-md border flex flex-col min-h-0">
                        <div className="p-4 border-b bg-gray-50 flex-shrink-0">
                            <p className="text-sm text-gray-500">
                                {systemSubTab === 'pending' ? '查看系统自动检测到的潜在违规内容。' : '查看已审核通过或拒审的系统检测记录。'}
                            </p>
                        </div>
                        {loading && (
                            <Spinner size="lg" />
                        ) || (
                                <div className="flex-1 overflow-auto">
                                    <table className="w-full text-sm text-left text-gray-500">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
                                            <tr>
                                                {['待审内容', '类型', '用户', '创建时间'].map(h => <th key={h} scope="col" className="py-3 px-6 whitespace-nowrap bg-gray-50">{h}</th>)}
                                                <th scope="col" className="py-3 px-6 whitespace-nowrap bg-gray-50">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentSystemList.filter(Boolean).map(item => (
                                                <tr key={item?.id} className="bg-white border-b hover:bg-gray-50">
                                                    <td className="py-4 px-6">
                                                        <div className="relative inline-block">
                                                            <img src={item?.url || ''} alt="detected" className="h-16 w-16 object-cover rounded-md cursor-pointer border border-gray-200" onClick={() => showPreview(item?.url || '')}
                                                                onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=Error'}
                                                            />
                                                            {(item as any)._isCached && (
                                                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" title="从本地缓存加载"></span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6"><span className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-semibold">{(item?.type || '').toUpperCase()}</span></td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center">
                                                            <img src={item?.author} alt={item?.userName} className="w-8 h-8 rounded-full mr-3 border border-gray-200" onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32?text=User'} />
                                                            <div>
                                                                <p className="font-medium text-gray-900">{item?.userName}</p>
                                                                <p className="font-mono text-xs text-gray-500">{item?.userUid}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 whitespace-nowrap">{item?.createdAt}</td>
                                                    <td className="py-4 px-6">
                                                        {systemSubTab === 'pending' ? (
                                                            <div className="flex items-center space-x-2">
                                                                <button
                                                                    onClick={() => handleSystemDetectionAction(item, 'ignore')}
                                                                    className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 text-xs font-medium transition-colors"
                                                                >
                                                                    通过审核
                                                                </button>
                                                                <button
                                                                    onClick={() => handleSystemDetectionAction(item, 'delete')}
                                                                    className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 text-xs font-medium transition-colors"
                                                                >
                                                                    拒审
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${item?.likesCount === 2 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                    {item?.likesCount === 2 ? '已通过' : '已拒审'}
                                                                </span>
                                                                <Tooltip content="恢复"><button onClick={(e) => { e.stopPropagation(); handleRestoreSystemDetection(item) }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full"><Icons.RevertIcon className="w-4 h-4" /></button></Tooltip>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {currentSystemList.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="py-8 text-center text-gray-500">暂无检测记录</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                    </div>
                </>
            )}

            <Modal isOpen={isUserModalOpen} onClose={() => setUserModalOpen(false)} title={`用户档案: ${selectedUser?.id}`}>
                {selectedUser && <div className="space-y-4">
                    <p><strong>状态:</strong> <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedUser.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{selectedUser.status}</span></p>
                    <p><strong>历史被举报次数:</strong> {(selectedUser.reportHistory || []).length}</p>
                    <div className="flex justify-end pt-4 mt-4 border-t">
                        <button onClick={() => { setUserModalOpen(false); openBanModal(selectedUser.id); }} className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger-hover">封禁用户</button>
                    </div>
                </div>}
            </Modal>

            <Modal isOpen={isBanModalOpen} onClose={() => setBanModalOpen(false)} title={`封禁用户: ${selectedUser?.id}`}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">封禁类型</label>
                        <select value={banDetails.type} onChange={e => setBanDetails(d => ({ ...d, type: e.target.value as BanType }))} className="mt-1 block w-full p-2 border rounded-md bg-white">
                            <option value="mute">禁止发言</option>
                            <option value="forbid_posting">禁止发布</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">封禁时长 (天)</label>
                        <select value={banDetails.duration} onChange={e => setBanDetails(d => ({ ...d, duration: e.target.value }))} className="mt-1 block w-full p-2 border rounded-md bg-white">
                            <option value="1">1 天</option>
                            <option value="7">7 天</option>
                            <option value="30">30 天</option>
                            <option value="36500">永久</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">封禁原因</label>
                        <textarea value={banDetails.reason} onChange={e => setBanDetails(d => ({ ...d, reason: e.target.value }))} className="mt-1 block w-full p-2 border rounded-md bg-white text-gray-900" placeholder="例如: 发布不当内容"></textarea>
                    </div>
                    <div className="flex justify-end pt-4 mt-4 border-t">
                        <button onClick={handleBanUser} className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger-hover">确认封禁</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDeleteConfirmModalOpen} onClose={() => setDeleteConfirmModalOpen(false)} title="确认彻底删除">
                <div>
                    <p className="text-gray-700">您确定要彻底删除这 <strong className="text-danger">{itemsToDelete.length}</strong> 条举报记录吗？</p>
                    <p className="text-sm text-gray-500 mt-2">此操作无法撤销，记录将永久消失。</p>
                    <div className="flex justify-end pt-4 mt-4 border-t space-x-2">
                        <button onClick={() => setDeleteConfirmModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button>
                        <button onClick={handleConfirmDelete} className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger-hover">确认删除</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CommunityManagement;
