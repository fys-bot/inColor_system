
/**
 * @file Main Application Component (App.tsx)
 * @description Orchestrates the app layout with smooth transitions and persistent state.
 */

import React, { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import AssetManagement from './pages/AssetManagement';
import AIGenerationManagement from './pages/AIGenerationManagement';
import CommunityManagement from './pages/CommunityManagement';
import SearchManagement from './pages/SearchManagement';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import { ImagePreviewProvider } from './context/ImagePreviewContext';
import { ToastProvider } from './context/ToastContext';
import ImagePreviewModal from './components/shared/ImagePreviewModal';
import Header from './components/layout/Header';
import UserManagement from './pages/UserManagement';
import { useMockData } from './hooks/useMockData';
import BatchImageGeneration from './pages/BatchImageGeneration';
import { Page } from './types';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Tabs for sub-navigation
  const [communityTab, setCommunityTab] = useState<'user_reports' | 'system_detection'>('user_reports');
  const [assetTab, setAssetTab] = useState<'single' | 'books'>('single');
  
  // 记录已访问过的页面，用于保持状态
  const [visitedPages, setVisitedPages] = useState<Set<Page>>(new Set(['dashboard']));
  
  const mockData = useMockData();

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setVisitedPages(new Set(['dashboard']));
  };

  // 切换页面时标记为已访问
  const handlePageChange = (page: Page) => {
    setCurrentPage(page);
    setVisitedPages(prev => new Set([...prev, page]));
  };

  // 渲染页面组件（只渲染已访问过的页面）
  const renderPage = (pageKey: Page) => {
    // 如果页面未被访问过且不是当前页面，不渲染
    if (!visitedPages.has(pageKey) && currentPage !== pageKey) {
      return null;
    }

    switch (pageKey) {
      case 'dashboard':
        return <Dashboard setCurrentPage={handlePageChange} assets={mockData.assets} themedBooks={mockData.themedBooks} assetsLoading={mockData.isLoading} refreshAssets={mockData.refreshAssets} />;
      case 'assets':
        return <AssetManagement {...mockData} activeTab={assetTab} />;
      case 'ai-generations':
        return <AIGenerationManagement {...mockData} />;
      case 'community':
        return <CommunityManagement {...mockData} activeTab={communityTab} />;
      case 'search':
        return <SearchManagement searchTerms={mockData.searchTerms} aiModelConfig={mockData.aiModelConfig} generationStyles={mockData.generationStyles} />;
      case 'batch-image-generation':
        return <BatchImageGeneration {...mockData} setAssets={mockData.setAssets} />;
      case 'user-management':
        return <UserManagement {...mockData} />;
      default:
        return null;
    }
  };

  const pageKeys: Page[] = ['dashboard', 'assets', 'ai-generations', 'community', 'search', 'batch-image-generation', 'user-management'];

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <ToastProvider>
      <ImagePreviewProvider>
        <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
          <Sidebar 
            currentPage={currentPage} 
            setCurrentPage={handlePageChange} 
            communityTab={communityTab}
            setCommunityTab={setCommunityTab}
            assetTab={assetTab}
            setAssetTab={setAssetTab}
            onLogout={handleLogout} 
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
          />
          
          <main className="flex-1 flex flex-col h-screen relative">
            <Header onToggleSidebar={() => setIsSidebarOpen(true)} />
            
            <div className="flex-1 bg-gray-50 relative overflow-hidden">
              {pageKeys.map((pageKey) => {
                const pageComponent = renderPage(pageKey);
                if (!pageComponent) return null;
                
                return (
                  <div
                    key={pageKey}
                    className={`absolute inset-0 overflow-auto p-4 sm:p-6 transition-opacity duration-300 ease-in-out ${
                      currentPage === pageKey 
                        ? 'opacity-100 z-10 animate-fade-in-up' 
                        : 'opacity-0 z-0 pointer-events-none'
                    }`}
                    style={{ 
                      visibility: currentPage === pageKey ? 'visible' : 'hidden',
                    }}
                  >
                    {pageComponent}
                  </div>
                );
              })}
            </div>
          </main>
          
          <ImagePreviewModal />
        </div>
      </ImagePreviewProvider>
    </ToastProvider>
  );
};

export default App;
