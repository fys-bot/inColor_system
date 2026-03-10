
/**
 * @file Login Page Component (LoginPage.tsx)
 * @description This component renders the login screen that users see before they
 * are authenticated. It presents a simple form for username and password and
 * calls a callback function upon submission to handle the login logic.
 */
import React, { useState } from 'react';
import { AppLogoIcon } from '../components/shared/Icons';

/**
 * Props for the LoginPage component.
 */
interface LoginPageProps {
    /** 
     * A callback function that is executed when the user successfully submits
     * the login form. This should handle the application's login state.
     */
    onLogin: () => void;
}

/**
 * A full-screen login page component.
 * @param {LoginPageProps} props - The props for the component.
 */
const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('incolor123'); // Default password for easier testing
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Handles the form submission event.
     * It prevents the default browser refresh and calls the `onLogin` callback.
     * @param {React.FormEvent} e - The form submission event.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default form submission behavior (page reload)
        setError('');
        setIsLoading(true);

        // Simulate a brief network delay for better UX (Game Feel)
        await new Promise(resolve => setTimeout(resolve, 600));

        if (password === 'incolor123') {
            onLogin(); // Trigger the login logic in the parent component
        } else {
            setError('密码错误，请重试。');
            setIsLoading(false);
            // Haptic feedback for error (if supported via navigator.vibrate directly here as fallback)
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([50, 50, 50]);
            }
        }
    };
    
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center w-full px-4">
                {/* App Logo and Title */}
                <div className="flex items-center space-x-4 mb-8 animate-fade-in-up">
                    <div className="rounded-2xl shadow-2xl overflow-hidden w-20 h-20 flex items-center justify-center">
                        <AppLogoIcon className="w-full h-full" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Incolor</h1>
                        <p className="text-sm text-gray-500 font-medium">后台管理系统</p>
                    </div>
                </div>
                
                {/* Login Form Card */}
                <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-gray-100 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-semibold text-gray-800">欢迎回来</h2>
                        <p className="text-sm text-gray-500 mt-1">请输入您的凭证以继续</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm bg-gray-50 focus:bg-white transition-all duration-200"
                                placeholder="请输入用户名"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                className={`block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm bg-gray-50 focus:bg-white transition-all duration-200 ${error ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 'border-gray-300 focus:ring-primary/50 focus:border-primary'}`}
                                placeholder="请输入密码"
                            />
                            {error && (
                                <p className="mt-2 text-sm text-red-600 flex items-center animate-fade-in-up">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    {error}
                                </p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 transform active:scale-[0.98] ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
                        >
                            {isLoading ? (
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : '登录'}
                        </button>
                    </form>
                </div>
                
                <p className="mt-8 text-xs text-gray-400 text-center">
                    &copy; 2025 Incolor Inc. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
