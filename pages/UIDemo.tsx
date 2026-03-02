

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as Icons from '../components/shared/Icons';
import Tooltip from '../components/shared/Tooltip';
import Spinner from '../components/shared/Spinner';

const UIDemo: React.FC = () => {
    const [activeTab, setActiveTab] = useState('static');

    const tabs = [
        { id: 'static', label: '静态 UI Kit' },
        { id: 'interactive', label: '交互 UI Kit' },
        { id: 'framework', label: '应用框架' },
        { id: 'icons', label: '应用内图标库' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'static': return <StaticUIKit />;
            case 'interactive': return <InteractiveUIKit />;
            case 'framework': return <ApplicationFrameworkDemo />;
            case 'icons': return <IconLibrary />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">UI 功能演示</h1>
                <p className="text-gray-500 mt-1">应用内所有UI组件、功能与交互的集合。</p>
            </div>
            
            <div className="bg-white p-2 rounded-lg shadow-md">
                 <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-4 px-4">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

// Simplified StatCard for demonstration
const StatCardDemo: React.FC<{ title: string; data: Record<string, number> }> = ({ title, data }) => {
    // FIX: Provide explicit types for reducer parameters to resolve arithmetic operation error.
    const total = useMemo(() => Object.values(data).reduce((sum: number, count: number) => sum + count, 0), [data]);
    // FIX: Explicitly cast array values to number to resolve sort operation error.
    const sortedData = useMemo(() => Object.entries(data).sort(([, a], [, b]) => (b as number) - (a as number)), [data]);
    const maxCount = useMemo(() => {
        const values = Object.values(data);
        // FIX: Cast values to number[] for Math.max to accept them.
        return values.length > 0 ? Math.max(...(values as number[])) : 1;
    }, [data]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
            <div className="space-y-3">
                {sortedData.map(([key, count]) => {
                    const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                    return (
                        <div key={key}>
                            <div className="flex justify-between items-center text-sm mb-1">
                                <span className="text-gray-700 truncate font-medium">{key}</span>
                                <span className="font-medium text-gray-600">{count} ({percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${((count as number) / maxCount) * 100}%` }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const StaticUIKit = () => (
    <div className="space-y-12">
        {/* Section: Typography */}
        <div>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">Typography</h3>
            <div className="space-y-4 text-gray-700">
                <h1 className="text-4xl font-bold text-gray-900">Heading 1</h1>
                <h2 className="text-3xl font-bold text-gray-800">Heading 2</h2>
                <h3 className="text-2xl font-semibold text-gray-800">Heading 3</h3>
                <h4 className="text-xl font-semibold text-gray-700">Heading 4</h4>
                <p>This is a standard paragraph. It is used for most of the descriptive text in the application. It provides information and context to the user. <a href="#" className="text-primary hover:underline font-medium">This is a link.</a></p>
                <p className="text-sm text-gray-500">This is a smaller, secondary text style, often used for captions or supplementary information.</p>
            </div>
        </div>

        {/* Section: Buttons */}
        <div>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">Buttons</h3>
            <div className="flex flex-wrap items-center gap-4">
                <button className="px-4 py-2 bg-primary text-white rounded-md font-semibold shadow-sm hover:bg-primary-hover">Primary</button>
                <button className="px-4 py-2 bg-white border border-primary text-primary rounded-md font-semibold hover:bg-primary-light">Secondary</button>
                <button className="px-4 py-2 bg-danger text-white rounded-md font-semibold shadow-sm hover:bg-danger-hover">Danger</button>
                <button className="px-4 py-2 bg-gray-500 text-white rounded-md font-semibold shadow-sm hover:bg-gray-600">Neutral</button>
                <button className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md font-semibold cursor-not-allowed" disabled>Disabled</button>
            </div>
        </div>

        {/* Section: Form Elements */}
        <div>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">Form Elements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-1">Text Input</label>
                        <input id="text-input" type="text" placeholder="e.g. John Doe" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-white text-gray-900" />
                    </div>
                    <div>
                        <label htmlFor="select-input" className="block text-sm font-medium text-gray-700 mb-1">Select Dropdown</label>
                        <select id="select-input" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-white">
                            <option>Option 1</option>
                            <option>Option 2</option>
                            <option>Option 3</option>
                        </select>
                    </div>
                    <div className="flex items-center">
                         <input id="checkbox-input" type="checkbox" className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary" />
                         <label htmlFor="checkbox-input" className="ml-2 block text-sm text-gray-900">Checkbox</label>
                    </div>
                     <div>
                        <span className="block text-sm font-medium text-gray-700 mb-2">Radio Group</span>
                        <div className="flex space-x-4">
                            <label className="flex items-center"><input type="radio" name="radio-demo" className="mr-2 h-4 w-4 text-primary border-gray-300 focus:ring-primary"/> Option A</label>
                            <label className="flex items-center"><input type="radio" name="radio-demo" className="mr-2 h-4 w-4 text-primary border-gray-300 focus:ring-primary"/> Option B</label>
                        </div>
                    </div>
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">File Upload</label>
                     <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                             <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                             <p className="text-sm text-gray-600">支持拖拽或点击选择</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Section: Data Display */}
        <div>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">Data Display</h3>
            <div className="space-y-8">
                {/* Badges */}
                <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-700">Badges / Tags</h4>
                    <div className="flex flex-wrap gap-3 items-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Banned</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">风格不符</span>
                         <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">语法错误</span>
                    </div>
                </div>
                {/* Card */}
                <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-700">Card</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="relative border rounded-lg overflow-hidden shadow-sm bg-white">
                            <img src="https://picsum.photos/seed/demo/400/300" alt="Card image" className="w-full h-40 object-cover" />
                            <div className="p-4">
                                <h5 className="font-semibold text-gray-800">Card Title</h5>
                                <p className="text-sm text-gray-500 mt-1">This is a description for the card component.</p>
                            </div>
                        </div>
                         <div className="relative border rounded-lg overflow-hidden shadow-sm bg-gray-200 opacity-60 grayscale">
                            <img src="https://picsum.photos/seed/demo-hidden/400/300" alt="Card image" className="w-full h-40 object-cover" />
                            <div className="p-4">
                                <h5 className="font-semibold text-gray-800">Hidden State Card</h5>
                                <p className="text-sm text-gray-500 mt-1">This card represents a hidden or disabled state.</p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Table */}
                <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-700">Table with Actions</h4>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th scope="col" className="p-4"><input type="checkbox" /></th>
                                    <th scope="col" className="py-3 px-6">User</th>
                                    <th scope="col" className="py-3 px-6">Status</th>
                                    <th scope="col" className="py-3 px-6">Role</th>
                                    <th scope="col" className="py-3 px-6">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-white border-b hover:bg-gray-50">
                                    <td className="p-4"><input type="checkbox" /></td>
                                    <td className="py-4 px-6 font-medium text-gray-900">johndoe@example.com</td>
                                    <td className="py-4 px-6"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Active</span></td>
                                    <td className="py-4 px-6">Admin</td>
                                    <td className="py-4 px-6 space-x-2">
                                        <Tooltip content="预览"><button className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"><Icons.EyeIcon className="w-4 h-4" /></button></Tooltip>
                                        <Tooltip content="编辑"><button className="p-2 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100"><Icons.EditIcon className="w-4 h-4" /></button></Tooltip>
                                        <Tooltip content="删除"><button className="p-2 text-gray-500 hover:text-danger rounded-full hover:bg-gray-100"><Icons.DeleteIcon className="w-4 h-4" /></button></Tooltip>
                                    </td>
                                </tr>
                                <tr className="bg-white border-b hover:bg-gray-50">
                                    <td className="p-4"><input type="checkbox" /></td>
                                    <td className="py-4 px-6 font-medium text-gray-900">janedoe@example.com</td>
                                    <td className="py-4 px-6"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Suspended</span></td>
                                    <td className="py-4 px-6">Member</td>
                                     <td className="py-4 px-6 space-x-2">
                                        <Tooltip content="预览"><button className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"><Icons.EyeIcon className="w-4 h-4" /></button></Tooltip>
                                        <Tooltip content="编辑"><button className="p-2 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100"><Icons.EditIcon className="w-4 h-4" /></button></Tooltip>
                                        <Tooltip content="删除"><button className="p-2 text-gray-500 hover:text-danger rounded-full hover:bg-gray-100"><Icons.DeleteIcon className="w-4 h-4" /></button></Tooltip>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* Data Visualization */}
                 <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-700">Data Visualization</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <StatCardDemo title="操作系统分布" data={{ 'iOS': 1250, 'Android': 980 }} />
                        <StatCardDemo title="风格分布" data={{ '卡通': 850, '二次元': 620, '美式漫画': 430, '日漫': 210, '其他': 120 }} />
                    </div>
                 </div>
            </div>
        </div>

        {/* Section: Navigation */}
        <div>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">Navigation</h3>
             <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button className="border-primary text-primary whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">Active Tab</button>
                    <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">Inactive Tab</button>
                    <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">Another Tab</button>
                </nav>
            </div>
        </div>

        {/* Section: Feedback */}
        <div>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">Feedback & Overlays</h3>
            <div className="space-y-8">
                {/* Alerts (Toast style) */}
                <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-700">Alerts (Toast style)</h4>
                    <div className="space-y-3">
                        <div className="flex items-center w-full max-w-xs p-4 text-gray-500 bg-white rounded-lg shadow-lg">
                            <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-green-500"><Icons.CheckIcon className="w-5 h-5 text-white"/></div>
                            <div className="ml-3 text-sm font-normal text-gray-800">Success message here.</div>
                        </div>
                        <div className="flex items-center w-full max-w-xs p-4 text-gray-500 bg-white rounded-lg shadow-lg">
                            <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-danger"><Icons.CloseIcon className="w-5 h-5 text-white"/></div>
                            <div className="ml-3 text-sm font-normal text-gray-800">Error message here.</div>
                        </div>
                        <div className="flex items-center w-full max-w-xs p-4 text-gray-500 bg-white rounded-lg shadow-lg">
                            <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500"><Icons.InfoIcon className="w-5 h-5 text-white"/></div>
                            <div className="ml-3 text-sm font-normal text-gray-800">Informational message here.</div>
                        </div>
                    </div>
                </div>

                {/* Tooltip */}
                <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-700">Tooltip</h4>
                    <Tooltip content="This is a helpful tooltip!">
                        <span className="bg-gray-200 px-3 py-1 rounded-md cursor-pointer">Hover over me</span>
                    </Tooltip>
                </div>
                 {/* Spinners */}
                <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-700">Spinners</h4>
                    <div className="flex items-center space-x-8">
                        <Spinner size="sm" />
                        <Spinner size="md" />
                        <Spinner size="lg" />
                    </div>
                </div>

                {/* Modal */}
                 <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-700">Modal</h4>
                     <div className="relative h-80 w-full rounded-lg bg-gray-100 p-4 overflow-hidden border">
                         <div className="absolute inset-0 bg-black bg-opacity-30 z-0"></div>
                         <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4 z-10">
                            <div className="flex justify-between items-center border-b pb-3">
                                <h3 className="text-xl font-semibold text-gray-900">Modal Title</h3>
                                <button className="text-gray-400 hover:text-gray-600"><Icons.CloseIcon className="w-6 h-6" /></button>
                            </div>
                            <div className="mt-4">
                                <p>This is the content of the modal. It appears on top of the main content.</p>
                            </div>
                            <div className="flex justify-end pt-4 mt-4 border-t space-x-2">
                                <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                                <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover">Confirm</button>
                            </div>
                         </div>
                     </div>
                 </div>
            </div>
        </div>

        {/* Section: Empty State */}
        <div>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">Empty State</h3>
            <div className="text-center py-16 bg-white rounded-lg shadow-md border">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary-light mb-4">
                    <Icons.CommunityIcon className="h-8 w-8 text-primary"/>
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-gray-800">All Clear!</h2>
                <p className="mt-2 text-gray-500">There is no data to display at the moment.</p>
            </div>
        </div>
    </div>
);


const InteractiveUIKit = () => {
    // State for Filter Bar
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [appliedFilters, setAppliedFilters] = useState({term: '', status: 'all'});

    // State for Date Picker
    const [selectedDate, setSelectedDate] = useState(new Date(2025, 8, 18));
    const [displayMonth, setDisplayMonth] = useState(new Date(2025, 8, 1));
    
    // State for Range Slider
    const [rangeValues, setRangeValues] = useState([20, 80]);
    const [dragging, setDragging] = useState<'min' | 'max' | null>(null);
    const sliderRef = useRef<HTMLDivElement>(null);
    
    // State for Form Input
    const [textInput, setTextInput] = useState('');
    const [checkboxState, setCheckboxState] = useState(false);
    
    // State for Async Button
    const [asyncState, setAsyncState] = useState<'idle' | 'loading' | 'done'>('idle');
    const [translatedText, setTranslatedText] = useState('');

    const handleApplyFilters = () => setAppliedFilters({ term: searchTerm, status: statusFilter });
    const handleResetFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setAppliedFilters({ term: '', status: 'all' });
    };

    const calendarDays = useMemo(() => {
        const days = [];
        const year = displayMonth.getFullYear();
        const month = displayMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
        return days;
    }, [displayMonth]);
    
    const changeMonth = (offset: number) => {
        setDisplayMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    }
    
    const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!dragging || !sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const percent = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
        const newValue = Math.round(percent * 100);

        setRangeValues(prev => {
            const [min, max] = prev;
            if (dragging === 'min') {
                return [Math.min(newValue, max - 5), max]; // ensure min is always less than max
            } else {
                return [min, Math.max(newValue, min + 5)]; // ensure max is always greater than min
            }
        });
    }, [dragging]);

    const handleMouseUp = useCallback(() => setDragging(null), []);
    
    const handleMouseDown = (handle: 'min' | 'max') => (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setDragging(handle);
    };

    const handleAsyncAction = () => {
        setAsyncState('loading');
        setTimeout(() => {
            setTranslatedText('你好，世界！');
            setAsyncState('done');
        }, 1500);
    };

    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleMouseMove);
            window.addEventListener('touchend', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [dragging, handleMouseMove, handleMouseUp]);
    
    return (
        <div className="space-y-12">
            <div>
                <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">异步操作按钮 (Asynchronous Action Button)</h3>
                <div className="bg-gray-50 p-4 rounded-lg border flex items-center space-x-4">
                    <p className="text-gray-700">原文: <span className="font-mono">Hello, world!</span></p>
                    <div className="w-48 text-left">
                        {asyncState === 'idle' && (
                            <button onClick={handleAsyncAction} className="flex items-center space-x-1.5 text-sm text-blue-600 hover:underline">
                                <Icons.TranslateIcon className="w-4 h-4" />
                                <span>翻译 (模拟 AI)</span>
                            </button>
                        )}
                        {asyncState === 'loading' && <Spinner size="sm" />}
                        {asyncState === 'done' && <p className="text-gray-800 font-semibold">{translatedText}</p>}
                    </div>
                     <button onClick={() => setAsyncState('idle')} className="text-sm text-gray-500 hover:underline">重置</button>
                </div>
                 <p className="text-sm text-gray-600 mt-2">演示了在社区管理中使用的 AI 翻译按钮的“待处理-加载中-完成”三种状态。</p>
            </div>
            <div>
                <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">筛选栏 (Filter Bar)</h3>
                <div className="bg-gray-50 p-4 rounded-lg border flex items-center space-x-4">
                    <div className="relative flex-grow">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><Icons.SearchIcon className="w-5 h-5"/></span>
                        <input type="text" placeholder="搜索..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-md bg-white text-gray-900" />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="py-2 px-3 border rounded-md bg-white">
                        <option value="all">所有状态</option>
                        <option value="active">激活</option>
                        <option value="pending">待定</option>
                    </select>
                    <button onClick={handleApplyFilters} className="px-4 py-2 border border-gray-300 bg-white rounded-md font-semibold text-gray-700 hover:bg-gray-100">筛选</button>
                    <button onClick={handleResetFilters} className="px-4 py-2 border border-transparent bg-transparent rounded-md font-semibold text-gray-700 hover:bg-gray-100">重置</button>
                </div>
                 <p className="text-sm text-gray-600 mt-2">当前筛选: 搜索词 "<span className="font-semibold">{appliedFilters.term || '无'}</span>", 状态 "<span className="font-semibold">{appliedFilters.status}</span>"</p>
            </div>
            <div>
                <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">日期选择器 (Date Picker)</h3>
                <div className="flex items-start space-x-4">
                    <div className="bg-white p-4 rounded-lg shadow-md border inline-block">
                        <div className="flex justify-between items-center mb-4">
                            <button onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-gray-100"><Icons.ChevronLeftIcon className="w-5 h-5" /></button>
                            <span className="font-semibold">{displayMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                            <button onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-gray-100"><Icons.ChevronRightIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-sm">
                            {['日', '一', '二', '三', '四', '五', '六'].map(day => <div key={day} className="font-medium text-gray-500 w-9 h-9 flex items-center justify-center">{day}</div>)}
                            {calendarDays.map((day, i) => {
                                if (!day) return <div key={`empty-${i}`} className="w-9 h-9" />;
                                let classes = "w-9 h-9 flex items-center justify-center rounded-full cursor-pointer hover:bg-gray-100";
                                if(day.toDateString() === selectedDate.toDateString()) classes += " bg-primary text-white hover:bg-primary-hover";
                                return <div key={day.toISOString()} className={classes} onClick={() => setSelectedDate(day)}>{day.getDate()}</div>
                            })}
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">已选择日期: <span className="font-semibold">{selectedDate.toLocaleDateString()}</span></p>
                </div>
            </div>
            <div>
                 <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">范围选择器 (Range Slider)</h3>
                 <div className="p-4 space-y-4">
                    <div ref={sliderRef} className="relative h-2 bg-gray-200 rounded-full my-4 cursor-pointer">
                        <div className="absolute h-2 bg-primary rounded-full" style={{ left: `${rangeValues[0]}%`, width: `${rangeValues[1] - rangeValues[0]}%` }}></div>
                        <div onMouseDown={handleMouseDown('min')} onTouchStart={handleMouseDown('min')} className="absolute -top-2 w-6 h-6 bg-white border-2 border-primary rounded-full cursor-pointer" style={{ left: `${rangeValues[0]}%`, transform: 'translateX(-50%)' }}></div>
                        <div onMouseDown={handleMouseDown('max')} onTouchStart={handleMouseDown('max')} className="absolute -top-2 w-6 h-6 bg-white border-2 border-primary rounded-full cursor-pointer" style={{ left: `${rangeValues[1]}%`, transform: 'translateX(-50%)' }}></div>
                    </div>
                    <p className="text-sm text-center text-gray-600">当前范围: <span className="font-semibold">{rangeValues[0]}% - {rangeValues[1]}%</span></p>
                 </div>
            </div>
             <div>
                 <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">标准表单元素</h3>
                 <div className="space-y-4 max-w-sm">
                    <div>
                        <label htmlFor="text-input-demo" className="block text-sm font-medium text-gray-700 mb-1">文本输入</label>
                        <input id="text-input-demo" type="text" placeholder="输入文本..." value={textInput} onChange={e => setTextInput(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900" />
                         <p className="text-sm text-gray-600 mt-1">当前值: <span className="font-semibold">{textInput}</span></p>
                    </div>
                    <div className="flex items-center">
                         <input id="checkbox-demo" type="checkbox" checked={checkboxState} onChange={e => setCheckboxState(e.target.checked)} className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary" />
                         <label htmlFor="checkbox-demo" className="ml-2 block text-sm text-gray-900">复选框状态: <span className="font-semibold">{checkboxState ? '已选中' : '未选中'}</span></label>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ApplicationFrameworkDemo = () => (
    <div>
        <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">应用结构 (交互式)</h3>
        <p className="text-sm text-gray-600 mb-4">
            这是 Incolor 后台的交互式布局演示。它展示了一个固定的侧边栏和一个带有粘性头部和可滚动内容的主区域，其中包含了真实的应用组件。
        </p>
        <div className="h-[700px] w-full bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex p-4 space-x-4">
            {/* Sidebar Representation */}
            <div className="w-48 flex-shrink-0 bg-white border border-gray-200 rounded-lg flex flex-col p-4">
                <div className="h-10 bg-gray-200 rounded flex items-center justify-center text-sm font-medium text-gray-500 mb-6 space-x-2">
                    <Icons.AppLogoIcon className="w-5 h-5 text-gray-600" />
                    <span>Incolor</span>
                </div>
                <div className="space-y-2">
                    <div className="h-9 bg-blue-100 border border-blue-300 rounded text-sm flex items-center justify-center font-medium text-blue-700">Active Nav</div>
                    <div className="h-9 bg-gray-100 rounded hover:bg-gray-200"></div>
                    <div className="h-9 bg-gray-100 rounded hover:bg-gray-200"></div>
                </div>
                <div className="mt-auto space-y-2">
                    <div className="h-9 bg-gray-100 rounded hover:bg-gray-200"></div>
                    <div className="h-9 bg-gray-100 rounded hover:bg-gray-200"></div>
                </div>
            </div>
            {/* Main Content with Interactive Components */}
            <div className="flex-1 bg-white border border-gray-200 rounded-lg flex flex-col overflow-hidden">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">交互式页面演示</h2>
                </div>
                {/* Sticky Header */}
                <div className="flex-shrink-0 bg-white p-4 border-b z-10 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">粘性头部 (筛选栏)</h4>
                    <div className="bg-gray-50 p-2 rounded-lg border flex items-center space-x-2">
                        <div className="relative flex-grow">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400"><Icons.SearchIcon className="w-4 h-4"/></span>
                            <input type="text" placeholder="搜索..." className="w-full pl-8 pr-3 py-1.5 border rounded-md text-sm bg-white text-gray-900" />
                        </div>
                        <select className="py-1.5 px-2 border rounded-md bg-white text-sm">
                            <option>所有状态</option>
                        </select>
                        <button className="px-3 py-1.5 border border-gray-300 bg-white rounded-md font-semibold text-gray-700 text-sm hover:bg-gray-100">筛选</button>
                    </div>
                </div>
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50">
                    <div>
                        <h4 className="text-lg font-semibold mb-3 border-b pb-1">日期选择器</h4>
                         <div className="bg-white p-4 rounded-lg shadow-sm border inline-block">
                            <div className="flex justify-between items-center mb-4">
                                <button className="p-1 rounded-full hover:bg-gray-100"><Icons.ChevronLeftIcon className="w-5 h-5" /></button>
                                <span className="font-semibold">2025年 九月</span>
                                <button className="p-1 rounded-full hover:bg-gray-100"><Icons.ChevronRightIcon className="w-5 h-5" /></button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-sm">
                                {['日', '一', '二', '三', '四', '五', '六'].map(day => <div key={day} className="font-medium text-gray-500 w-9 h-9 flex items-center justify-center">{day}</div>)}
                                {[...Array(30)].map((_, i) => {
                                    const day = i + 1;
                                    let classes = "w-9 h-9 flex items-center justify-center rounded-full cursor-pointer hover:bg-gray-100";
                                    if(day === 18) classes += " bg-primary text-white hover:bg-primary-hover";
                                    return <div key={i} className={classes}>{day}</div>
                                })}
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold mb-3 border-b pb-1">范围选择器</h4>
                         <div className="p-4 bg-white rounded-lg shadow-sm border">
                            <div className="relative h-2 bg-gray-200 rounded-full my-4">
                                <div className="absolute h-2 bg-primary rounded-full" style={{left: '20%', width: '60%'}}></div>
                                <div className="absolute -top-2 w-6 h-6 bg-white border-2 border-primary rounded-full cursor-pointer" style={{left: '20%', transform: 'translateX(-50%)'}}></div>
                                <div className="absolute -top-2 w-6 h-6 bg-white border-2 border-primary rounded-full cursor-pointer" style={{left: '80%', transform: 'translateX(-50%)'}}></div>
                            </div>
                         </div>
                    </div>
                     <div>
                        <h4 className="text-lg font-semibold mb-3 border-b pb-1">表单元素</h4>
                         <div className="p-4 bg-white rounded-lg shadow-sm border">
                            <label className="block text-sm font-medium text-gray-700 mb-1">文本输入</label>
                            <input type="text" placeholder="输入文本..." className="w-full max-w-sm p-2 border border-gray-300 rounded-md bg-white text-gray-900" />
                        </div>
                    </div>
                    <div className="h-32 bg-white rounded-lg border flex items-center justify-center text-gray-400">更多滚动内容...</div>
                    <div className="h-32 bg-white rounded-lg border flex items-center justify-center text-gray-400">更多滚动内容...</div>
                    <div className="h-32 bg-white rounded-lg border flex items-center justify-center text-gray-400">更多滚动内容...</div>
                </div>
            </div>
        </div>
    </div>
);


const IconLibrary = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const iconNames = Object.keys(Icons);

    const filteredIcons = iconNames.filter(name => 
        name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div>
                 <h3 className="text-lg font-semibold">应用内图标库</h3>
                 <p className="text-sm text-gray-600 mb-4">
                    这是本应用内可用的所有 SVG 图标。使用下方的搜索框可以快速查找。
                 </p>
                 <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><Icons.SearchIcon className="w-5 h-5" /></span>
                    <input 
                        type="text" 
                        placeholder="搜索图标..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-md bg-white text-gray-900" 
                    />
                 </div>
            </div>
            {filteredIcons.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 text-center">
                    {filteredIcons.map(name => {
                        const IconComponent = (Icons as any)[name];
                        return (
                            <div key={name} className="flex flex-col items-center justify-center p-3 border rounded-lg hover:bg-gray-50 hover:shadow-sm">
                                <IconComponent className="w-8 h-8 text-gray-700 mb-2" />
                                <span className="text-xs text-gray-600 break-all">{name}</span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-10 text-gray-500">
                    <p>未找到匹配的图标 "{searchTerm}"</p>
                </div>
            )}
        </div>
    );
};

export default UIDemo;