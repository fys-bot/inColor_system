/**
 * @file Account Settings Page (AccountSettings.tsx)
 * @description This page provides a user interface for managing account-related
 * settings. It is structured with tabs for different categories like personal
 * information, security, and notifications. Currently, only the "Personal Info"
 * tab is implemented.
 */
import React, { useState } from 'react';
import { UserIcon, ShieldCheckIcon, BellIcon, CreditCardIcon } from '../components/shared/Icons';
import Modal from '../components/shared/Modal';
import { useToast } from '../context/ToastContext';

/**
 * Props for the AccountSettings component.
 */
interface AccountSettingsProps {
    /** A callback function to be executed when the user logs out. */
    onLogout: () => void;
}

/**
 * The main component for the Account Settings page.
 * @param {AccountSettingsProps} props - The props for the component.
 */
const AccountSettings: React.FC<AccountSettingsProps> = ({ onLogout }) => {
    // State to manage the currently active tab.
    const [activeTab, setActiveTab] = useState('personal');
    // State to track the selected avatar.
    const [selectedAvatar, setSelectedAvatar] = useState(3);
    // Hook to show toast notifications.
    const { showToast } = useToast();

    // State for the personal information form.
    const [username, setUsername] = useState('admin');
    const [email, setEmail] = useState('admin@incolor.system');
    
    // State for the account deletion confirmation modal.
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    // Configuration for the tabs.
    const tabs = [
        { id: 'personal', label: '个人资料', icon: <UserIcon /> },
        { id: 'security', label: '安全', icon: <ShieldCheckIcon /> },
        { id: 'notifications', label: '偏好', icon: <BellIcon /> },
        { id: 'billing', label: '账单', icon: <CreditCardIcon /> },
    ];

    // A list of available avatar image URLs.
    const avatars = [
        'https://avatar.vercel.sh/jack', 'https://avatar.vercel.sh/jane',
        'https://avatar.vercel.sh/joe', 'https://avatar.vercel.sh/jill',
    ];

    /**
     * Handles saving changes to the user's personal information.
     * In a real application, this would make an API call.
     */
    const handleSaveChanges = () => {
        console.log("Saving data:", { username, email });
        showToast('个人资料已成功更新', 'success');
    };

    /**
     * Handles the final confirmation of account deletion.
     */
    const handleDeleteAccount = () => {
        setDeleteModalOpen(false);
        showToast('账户已删除。正在为您登出...', 'info');
        // Delay logout to allow user to see the toast message.
        setTimeout(onLogout, 1500);
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">账号设置</h1>
                <p className="text-gray-500 mt-1">管理您的个人资料、安全设置和应用偏好。</p>
            </div>

            {/* Main content container */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                {/* Tab Navigation */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-6">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
                
                {/* Personal Information Tab Content */}
                {activeTab === 'personal' && (
                     <div className="space-y-8">
                        {/* Avatar Selection Section */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                            <div className="md:col-span-1">
                                <h3 className="font-medium text-gray-800">头像</h3>
                                <p className="text-sm text-gray-500">选择一个您喜欢的头像。</p>
                            </div>
                            <div className="md:col-span-3 flex items-center space-x-4">
                                {avatars.map((src, index) => (
                                    <button key={index} onClick={() => setSelectedAvatar(index)} className={`rounded-full transition-all duration-200 ${selectedAvatar === index ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                                        <img src={src} alt={`Avatar ${index + 1}`} className="w-16 h-16 rounded-full" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <hr className="border-gray-200" />

                        {/* Personal Info Form Section */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                             <div className="md:col-span-1">
                                <h3 className="font-medium text-gray-800">个人信息</h3>
                                <p className="text-sm text-gray-500">更新您的公开资料信息。</p>
                            </div>
                            <div className="md:col-span-3 space-y-4">
                                <div>
                                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                                    <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-white text-gray-900" />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
                                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-white text-gray-900" />
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end">
                            <button onClick={handleSaveChanges} className="px-5 py-2.5 bg-primary text-white font-semibold rounded-lg shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                                保存更改
                            </button>
                        </div>
                        
                        <hr className="border-gray-200" />

                        {/* Danger Zone for Destructive Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                             <div className="md:col-span-1">
                                <h3 className="font-medium text-danger">危险区域</h3>
                                <p className="text-sm text-gray-500">这些操作是不可逆的，请谨慎操作。</p>
                            </div>
                             <div className="md:col-span-3">
                                <button onClick={() => setDeleteModalOpen(true)} className="px-5 py-2.5 bg-danger text-white font-semibold rounded-lg shadow-sm hover:bg-danger-hover focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2">
                                    删除我的账户
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Placeholder for other tabs */}
                {activeTab !== 'personal' && (
                    <div className="text-center py-12 text-gray-500">
                        <p>{tabs.find(t => t.id === activeTab)?.label} section is under construction.</p>
                    </div>
                )}
            </div>
            
            {/* Confirmation Modal for Account Deletion */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="确认删除账户">
                <p className="text-gray-600">您确定要删除您的账户吗？此操作无法撤销，您的所有数据都将被永久删除。</p>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        取消
                    </button>
                    <button onClick={handleDeleteAccount} className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger-hover">
                        确认删除
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default AccountSettings;
