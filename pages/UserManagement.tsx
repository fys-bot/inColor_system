/**
 * @file 订阅用户管理页面 (UserManagement.tsx)
 * @description 该页面用于展示、筛选、排序和管理所有订阅用户的信息。
 */
import React, { useState, useMemo } from 'react';
import { SubscriptionUser, AccountStatus, SubscriptionStatus } from '../types';
import * as Icons from '../components/shared/Icons';
import Modal from '../components/shared/Modal';

// 定义页面 props 的接口
interface UserManagementProps {
  subscriptionUsers: SubscriptionUser[];
  setSubscriptionUsers: React.Dispatch<React.SetStateAction<SubscriptionUser[]>>;
}

/**
 * 根据状态获取对应的徽章样式类。
 * @param {SubscriptionStatus | AccountStatus} status - 用户状态。
 * @returns {string} Tailwind CSS 样式类。
 */
const getStatusBadge = (status: SubscriptionStatus | AccountStatus) => {
    switch (status) {
        case '活跃':
        case '正常':
            return 'bg-green-100 text-green-800';
        case '试用中':
            return 'bg-blue-100 text-blue-800';
        case '已过期':
            return 'bg-yellow-100 text-yellow-800';
        case '已取消':
            return 'bg-gray-200 text-gray-800';
        case '已封禁':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

/**
 * 根据订阅历史记录的状态获取对应的中文名称和徽章样式。
 * @param {'Active' | 'Expired' | 'Canceled'} status - 订阅记录的状态。
 * @returns {{text: string, className: string}} 包含中文文本和样式的对象。
 */
const getHistoryStatusBadge = (status: 'Active' | 'Expired' | 'Canceled') => {
    switch (status) {
        case 'Active': return { text: '活跃', className: 'bg-green-100 text-green-800' };
        case 'Expired': return { text: '已过期', className: 'bg-yellow-100 text-yellow-800' };
        case 'Canceled': return { text: '已取消', className: 'bg-gray-200 text-gray-800' };
        default: return { text: status, className: 'bg-gray-100 text-gray-800' };
    }
};

// 筛选条件的初始状态
const initialFilters = {
    subscriptionStatus: '',
    subscriptionPlan: '',
    accountStatus: '',
    expirationDateStart: '',
    expirationDateEnd: '',
    minConsumption: '',
    maxConsumption: '',
    registrationDateStart: '',
    registrationDateEnd: ''
};


// 主组件
const UserManagement: React.FC<UserManagementProps> = ({ subscriptionUsers, setSubscriptionUsers }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof SubscriptionUser; direction: 'ascending' | 'descending' } | null>({ key: 'registrationDate', direction: 'descending' });
    const [selectedUser, setSelectedUser] = useState<SubscriptionUser | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    
    // 高级筛选面板的状态
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    // 临时存储用户在筛选面板中的输入
    const [filters, setFilters] = useState(initialFilters);
    // 实际应用的筛选条件
    const [appliedFilters, setAppliedFilters] = useState(initialFilters);

    // 从用户数据中动态获取所有唯一的订阅方案
    const uniquePlans = useMemo(() => {
        const plans = new Set(subscriptionUsers.map(u => u.subscriptionPlan));
        return Array.from(plans).sort();
    }, [subscriptionUsers]);

    // 根据搜索词和高级筛选条件过滤并排序用户列表
    const finalDisplayedUsers = useMemo(() => {
        let filtered = subscriptionUsers.filter(user =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.appId.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // 应用高级筛选
        filtered = filtered.filter(user => {
            const { subscriptionStatus, subscriptionPlan, accountStatus, expirationDateStart, expirationDateEnd, minConsumption, maxConsumption, registrationDateStart, registrationDateEnd } = appliedFilters;
            if (subscriptionStatus && user.subscriptionStatus !== subscriptionStatus) return false;
            if (subscriptionPlan && user.subscriptionPlan !== subscriptionPlan) return false;
            if (accountStatus && user.accountStatus !== accountStatus) return false;
            
            // 日期范围筛选 (格式为 YYYY/MM/DD，可以直接比较字符串)
            if (registrationDateStart && user.registrationDate < registrationDateStart.replace(/-/g, '/')) return false;
            if (registrationDateEnd && user.registrationDate > registrationDateEnd.replace(/-/g, '/')) return false;
            if (expirationDateStart && (!user.expirationDate || user.expirationDate < expirationDateStart.replace(/-/g, '/'))) return false;
            if (expirationDateEnd && (!user.expirationDate || user.expirationDate > expirationDateEnd.replace(/-/g, '/'))) return false;
            
            // 消费区间筛选
            const min = parseFloat(minConsumption);
            const max = parseFloat(maxConsumption);
            if (!isNaN(min) && user.totalConsumption < min) return false;
            if (!isNaN(max) && user.totalConsumption > max) return false;

            return true;
        });

        // 排序逻辑
        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [subscriptionUsers, searchTerm, appliedFilters, sortConfig]);

    // 更新筛选条件
    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    // 应用筛选
    const handleApplyFilters = () => {
        setAppliedFilters(filters);
    };

    // 重置筛选
    const handleResetFilters = () => {
        setFilters(initialFilters);
        setAppliedFilters(initialFilters);
    };

    // 检查是否有任何筛选条件处于激活状态
    const filtersAreActive = useMemo(() => {
        return Object.values(appliedFilters).some(value => value !== '');
    }, [appliedFilters]);


    const requestSort = (key: keyof SubscriptionUser) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleViewDetails = (user: SubscriptionUser) => {
        setSelectedUser(user);
        setIsDetailModalOpen(true);
    };
    
    // 切换账户状态（正常/封禁）
    const toggleAccountStatus = (userId: string) => {
        setSubscriptionUsers(prev => prev.map(user => {
            if (user.id === userId) {
                const newStatus: AccountStatus = user.accountStatus === '正常' ? '已封禁' : '正常';
                return { ...user, accountStatus: newStatus };
            }
            return user;
        }));
    };

    // 表头定义
    const tableHeaders: { key: keyof SubscriptionUser, label: string }[] = [
        { key: 'username', label: '用户' }, { key: 'appId', label: 'APP ID' },
        { key: 'subscriptionStatus', label: '订阅状态' }, { key: 'subscriptionPlan', label: '订阅方案' },
        { key: 'expirationDate', label: '到期日' }, { key: 'totalConsumption', label: '总消费' },
        { key: 'registrationDate', label: '注册日期' }, { key: 'accountStatus', label: '账户状态' },
    ];

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-800">订阅用户管理</h1>
                <p className="text-gray-500 mt-1">查看和管理所有应用内订阅用户的信息。</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border flex-shrink-0 space-y-4">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-grow w-full md:w-auto">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><Icons.SearchIcon className="w-5 h-5"/></span>
                        <input 
                            type="text" 
                            placeholder="按用户名或 App ID 搜索..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full md:w-80 pl-10 pr-4 py-2 border rounded-md bg-white text-gray-900" 
                        />
                    </div>
                    <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100">
                        <Icons.FilterIcon className="w-5 h-5"/> 
                        <span>高级筛选</span>
                        {isFilterOpen ? <Icons.ChevronUpIcon className="w-4 h-4" /> : <Icons.ChevronDownIcon className="w-4 h-4" />}
                    </button>
                    {filtersAreActive && (
                        <button onClick={handleResetFilters} className="w-full md:w-auto px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                            清除筛选
                        </button>
                    )}
                </div>
                
                {/* 高级筛选面板 */}
                {isFilterOpen && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700">订阅状态</label><select value={filters.subscriptionStatus} onChange={e => handleFilterChange('subscriptionStatus', e.target.value)} className="mt-1 block w-full p-2 border rounded-md bg-white"><option value="">全部</option>{['活跃', '已过期', '已取消', '试用中'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-gray-700">订阅方案</label><select value={filters.subscriptionPlan} onChange={e => handleFilterChange('subscriptionPlan', e.target.value)} className="mt-1 block w-full p-2 border rounded-md bg-white"><option value="">全部</option>{uniquePlans.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-gray-700">账户状态</label><select value={filters.accountStatus} onChange={e => handleFilterChange('accountStatus', e.target.value)} className="mt-1 block w-full p-2 border rounded-md bg-white"><option value="">全部</option>{['正常', '已封禁'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-gray-700">消费金额</label><div className="flex items-center space-x-2 mt-1"><input type="number" placeholder="最小" value={filters.minConsumption} onChange={e => handleFilterChange('minConsumption', e.target.value)} className="w-full p-2 border rounded-md bg-white text-gray-900" /><input type="number" placeholder="最大" value={filters.maxConsumption} onChange={e => handleFilterChange('maxConsumption', e.target.value)} className="w-full p-2 border rounded-md bg-white text-gray-900" /></div></div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">到期时间</label>
                                <div className="flex items-center space-x-2 mt-1">
                                    <input 
                                        type="text" 
                                        placeholder="年/月/日" 
                                        value={filters.expirationDateStart} 
                                        onFocus={(e) => (e.target.type = 'date')} 
                                        onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }} 
                                        onChange={e => handleFilterChange('expirationDateStart', e.target.value)} 
                                        className="w-full p-2 border rounded-md bg-white text-gray-900" />
                                    <input 
                                        type="text" 
                                        placeholder="年/月/日" 
                                        value={filters.expirationDateEnd} 
                                        onFocus={(e) => (e.target.type = 'date')} 
                                        onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }} 
                                        onChange={e => handleFilterChange('expirationDateEnd', e.target.value)} 
                                        className="w-full p-2 border rounded-md bg-white text-gray-900" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">注册时间</label>
                                <div className="flex items-center space-x-2 mt-1">
                                    <input 
                                        type="text" 
                                        placeholder="年/月/日" 
                                        value={filters.registrationDateStart} 
                                        onFocus={(e) => (e.target.type = 'date')} 
                                        onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }} 
                                        onChange={e => handleFilterChange('registrationDateStart', e.target.value)} 
                                        className="w-full p-2 border rounded-md bg-white text-gray-900" />
                                    <input 
                                        type="text" 
                                        placeholder="年/月/日" 
                                        value={filters.registrationDateEnd} 
                                        onFocus={(e) => (e.target.type = 'date')} 
                                        onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }} 
                                        onChange={e => handleFilterChange('registrationDateEnd', e.target.value)} 
                                        className="w-full p-2 border rounded-md bg-white text-gray-900" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end space-x-2"><button onClick={() => { setFilters(appliedFilters); setIsFilterOpen(false); }} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100">取消</button><button onClick={handleApplyFilters} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover">应用筛选</button></div>
                    </div>
                )}
            </div>

            <div className="flex-1 bg-white rounded-lg shadow-md border flex flex-col min-h-0">
                 <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10"><tr>{tableHeaders.map(({ key, label }) => (<th key={key} scope="col" className="py-3 px-6 cursor-pointer whitespace-nowrap" onClick={() => requestSort(key)}><div className="flex items-center">{label}{sortConfig?.key === key && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</div></th>))}<th scope="col" className="py-3 px-6">操作</th></tr></thead>
                        <tbody>{finalDisplayedUsers.map(user => (<tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                            <td className="py-4 px-6"><div className="flex items-center space-x-3"><img src={user.avatarUrl} alt={user.username} className="w-10 h-10 rounded-full" /><span className="font-medium text-gray-900">{user.username}</span></div></td>
                            <td className="py-4 px-6 font-mono">{user.appId}</td>
                            <td className="py-4 px-6"><span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusBadge(user.subscriptionStatus)}`}>{user.subscriptionStatus}</span></td>
                            <td className="py-4 px-6">{user.subscriptionPlan}</td><td className="py-4 px-6">{user.expirationDate || 'N/A'}</td>
                            <td className="py-4 px-6">${user.totalConsumption.toFixed(2)}</td><td className="py-4 px-6">{user.registrationDate}</td>
                            <td className="py-4 px-6"><span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusBadge(user.accountStatus)}`}>{user.accountStatus}</span></td>
                            <td className="py-4 px-6"><div className="flex items-center space-x-1"><button onClick={() => handleViewDetails(user)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"><Icons.EyeIcon className="w-4 h-4" /></button></div></td>
                        </tr>))}</tbody>
                    </table>
                </div>
            </div>
            
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`用户详情: ${selectedUser?.username}`} maxWidth="2xl">
                {selectedUser && (<div className="space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-4">
                             <img src={selectedUser.avatarUrl} alt={selectedUser.username} className="w-16 h-16 rounded-full" />
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{selectedUser.username}</h2>
                                <p className="font-mono text-gray-500">{selectedUser.appId}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">累计消费金额</p>
                            <p className="text-2xl font-bold text-gray-900">${selectedUser.totalConsumption.toFixed(2)}</p>
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 pt-2">订阅记录</h3>
                    <div className="max-h-64 overflow-y-auto pr-2">
                        {selectedUser.subscriptionHistory && selectedUser.subscriptionHistory.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead className="text-left text-gray-600"><tr><th className="py-2 px-2">开始时间</th><th className="py-2 px-2">订阅 SKU</th><th className="py-2 px-2">方案</th><th className="py-2 px-2">花费金额</th><th className="py-2 px-2">状态</th></tr></thead>
                                <tbody>{selectedUser.subscriptionHistory.map((record, index) => { const statusInfo = getHistoryStatusBadge(record.status); return (
                                    <tr key={index} className="border-t"><td className="py-2 px-2 text-gray-800">{record.startDate}</td><td className="py-2 px-2 font-mono text-xs text-gray-700">{record.sku}</td><td className="py-2 px-2 text-gray-800">{record.plan}</td><td className="py-2 px-2 text-gray-800">${record.cost.toFixed(2)}</td><td className="py-2 px-2"><span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${statusInfo.className}`}>{statusInfo.text}</span></td></tr>
                                );})}</tbody>
                            </table>
                        ) : (<p className="text-gray-500">没有订阅历史记录。</p>)}
                    </div>
                    <div className="flex justify-end pt-4 mt-4 border-t"><button onClick={() => setIsDetailModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">关闭</button></div>
                </div>)}
            </Modal>
        </div>
    );
};

export default UserManagement;