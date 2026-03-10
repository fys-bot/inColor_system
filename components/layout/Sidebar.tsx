
/**
 * @file Sidebar Navigation Component (Sidebar.tsx)
 * @description Main navigation with Game-Feel haptics and smooth transitions.
 */

import React from 'react';
import { Page } from '../../types';
import {
    LogoutIcon,
    AssetIcon,
    AIGenerateIcon,
    CommunityIcon,
    SearchIcon,
    AppLogoIcon,
    HomeIcon,
    CloseIcon,
    FileArchiveIcon,
    CreditCardIcon,
    ChevronDownIcon,
    ChevronRightIcon
} from '../shared/Icons';
import { triggerHaptic, btnClickable } from '../../utils/ux';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  communityTab: 'user_reports' | 'system_detection';
  setCommunityTab: (tab: 'user_reports' | 'system_detection') => void;
  assetTab: 'single' | 'books';
  setAssetTab: (tab: 'single' | 'books') => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    currentPage, setCurrentPage, 
    communityTab, setCommunityTab, 
    assetTab, setAssetTab,
    onLogout, isOpen, setIsOpen 
}) => {
    
    interface NavSubItem {
        id: string;
        label: string;
        value: string;
    }

    interface NavItem {
        id: Page;
        label: string;
        icon: React.ReactNode;
        children?: NavSubItem[];
    }

    const mainNavItems: NavItem[] = [
        { id: 'dashboard', label: '仪表盘', icon: <HomeIcon /> },
        { 
            id: 'assets', 
            label: '内置素材管理', 
            icon: <AssetIcon />,
            children: [
                { id: 'asset_single', label: '单图', value: 'single' },
                { id: 'asset_books', label: '主题书本', value: 'books' }
            ]
        },
        { id: 'ai-generations', label: '用户生图记录', icon: <AIGenerateIcon /> },
        { 
            id: 'community', 
            label: '社区管理', 
            icon: <CommunityIcon />,
            children: [
                { id: 'user_reports', label: '用户举报', value: 'user_reports' },
                { id: 'system_detection', label: '系统检测', value: 'system_detection' }
            ]
        },
        { id: 'search', label: '搜索管理', icon: <SearchIcon /> },
        { id: 'batch-image-generation', label: '批量生图工具', icon: <FileArchiveIcon /> },
        // { id: 'user-management', label: '订阅用户管理', icon: <CreditCardIcon /> },
    ];

    const handleNavClick = (page: Page) => {
        triggerHaptic('light');
        setCurrentPage(page);
        // If the page has sub-items and we just clicked the parent, we don't close the sidebar yet
        const item = mainNavItems.find(i => i.id === page);
        if (!item?.children) {
            setIsOpen(false);
        }
    };

    const handleSubNavClick = (page: Page, value: string) => {
        triggerHaptic('light');
        setCurrentPage(page);
        if (page === 'community') {
            setCommunityTab(value as 'user_reports' | 'system_detection');
        } else if (page === 'assets') {
            setAssetTab(value as 'single' | 'books');
        }
        setIsOpen(false);
    };

    const NavButton: React.FC<{
        item: NavItem;
        isActive: boolean;
        onClick: (page: Page) => void;
    }> = ({ item, isActive, onClick }) => {
        const hasChildren = item.children && item.children.length > 0;
        const isParentActive = currentPage === item.id;

        return (
            <li>
                <button
                    onClick={() => onClick(item.id)}
                    className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${btnClickable} ${
                        (isActive && !hasChildren) || (hasChildren && isParentActive)
                            ? 'bg-primary text-white shadow-lg shadow-blue-500/30'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                    <div className="flex items-center">
                        {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { 
                            className: `w-5 h-5 ${(isActive && !hasChildren) || (hasChildren && isParentActive) ? 'text-white' : 'text-gray-500 group-hover:text-gray-900'}` 
                        })}
                        <span className="ml-3 font-medium">{item.label}</span>
                    </div>
                    {hasChildren && (
                        isParentActive ? <ChevronDownIcon className="w-4 h-4 text-white/80" /> : <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    )}
                </button>
                {hasChildren && isParentActive && (
                    <ul className="mt-1 space-y-1 pl-4 animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
                        {item.children!.map((child) => {
                            let isChildActive = false;
                            if (item.id === 'community') isChildActive = communityTab === child.value;
                            if (item.id === 'assets') isChildActive = assetTab === child.value;

                            return (
                                <li key={child.id}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleSubNavClick(item.id, child.value); }}
                                        className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors relative flex items-center ${
                                            isChildActive
                                                ? 'text-primary font-semibold bg-blue-50'
                                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                    >
                                        {isChildActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-r-full"></div>}
                                        {child.label}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </li>
        );
    };

    return (
        <>
            <div 
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            />

            <aside 
                className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) md:relative md:translate-x-0 md:flex-shrink-0 shadow-2xl md:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex flex-col h-full bg-white/95 backdrop-blur">
                    <div className="flex items-center justify-between p-6 h-20 flex-shrink-0">
                        <div className="flex items-center space-x-3 text-2xl font-bold tracking-tight text-gray-900">
                            <div className="rounded-xl shadow-lg overflow-hidden w-10 h-10 flex items-center justify-center">
                                <AppLogoIcon className="w-full h-full" />
                            </div>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">Incolor</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto no-scrollbar">
                        <div>
                            <h3 className="px-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">管理控制台</h3>
                            <ul className="space-y-1.5">
                                {mainNavItems.map(item => (
                                    <NavButton key={item.id} item={item} isActive={currentPage === item.id} onClick={handleNavClick} />
                                ))}
                            </ul>
                        </div>
                    </nav>

                    <div className="p-4 border-t border-gray-100 flex-shrink-0">
                        <button
                            onClick={() => { triggerHaptic('medium'); onLogout(); }}
                            className={`w-full text-left flex items-center px-4 py-3 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors ${btnClickable}`}
                        >
                            <LogoutIcon className="w-5 h-5" />
                            <span className="ml-3 font-medium">退出登录</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
