


import React from 'react';
import { AssetIcon, AIGenerateIcon, CommunityIcon, SearchIcon, FileArchiveIcon } from '../components/shared/Icons';

// FIX: Changed icon prop type to React.ReactNode to resolve JSX namespace error.
const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="flex items-start space-x-6">
        <div className="mt-1 bg-primary-light p-3 rounded-full text-primary">{icon}</div>
        <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">{title}</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="space-y-4 text-gray-600">
                    {children}
                </div>
            </div>
        </div>
    </div>
);

const UsageTutorial: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-800">使用教学</h1>
                <p className="text-lg text-gray-500 mt-2">欢迎! 这里是 Incolor 后台管理系统的核心功能指南。</p>
            </div>

            <div className="space-y-12">
                <Section icon={<AssetIcon className="w-6 h-6" />} title="内置素材管理">
                    <p>
                        此模块用于管理应用内的所有基础、AI生成、主题及活动图片素材。
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-2">
                        <li><strong className="font-semibold text-gray-700">分类浏览:</strong> 点击顶部的标签页 (如 "基础图", "AI 图") 切换不同类型的素材库。</li>
                        <li><strong className="font-semibold text-gray-700">搜索与筛选:</strong> 使用搜索框按ID或描述快速查找，或通过“高级筛选”按上传日期和隐藏状态精确过滤。</li>
                        <li><strong className="font-semibold text-gray-700">以图搜图 (Gemini):</strong> 点击搜索框旁的图片图标，上传一张图片，系统将利用 Gemini AI 分析图片内容并自动搜索相似的素材。</li>
                        <li><strong className="font-semibold text-gray-700">批量操作:</strong> 勾选素材卡片左上角的复选框，即可进行批量隐藏或取消隐藏操作。</li>
                         <li><strong className="font-semibold text-gray-700">上传新素材:</strong> 点击“上传”按钮，选择分类并（模拟）上传新图片到对应的素材库。</li>
                    </ul>
                </Section>
                
                <Section icon={<FileArchiveIcon className="w-6 h-6" />} title="系统内容总览 (文件资源管理)">
                    <p>
                        这是一个系统内容的中央枢纽，您可以在此统一查看和管理所有文件资源。它整合了来自“内置素材管理”的图片和来自文件系统的静态资源（如 JSON、文本文件）。
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-2">
                        <li><strong className="font-semibold text-gray-700">统一视图:</strong> 在同一个列表中查看来自“内置素材管理”的图片和文件系统资源，并通过“来源/分类”列区分它们。</li>
                        <li><strong className="font-semibold text-gray-700">差异化管理:</strong> 对文件系统中的资源（如 JSON、文本）提供完整的增删查改功能。对于内置素材，此页面提供预览功能，编辑和删除操作请前往“内置素材管理”模块。</li>
                        <li><strong className="font-semibold text-gray-700">内容预览:</strong> 点击每行资源旁的预览图标，可以直接在弹窗中查看图片、格式化的 JSON 或文本内容，无需下载。</li>
                        <li><strong className="font-semibold text-gray-700">全局搜索:</strong> 使用顶部的搜索框，可以按资源名称、描述或分类快速过滤整个系统的所有内容。</li>
                    </ul>
                </Section>

                <Section icon={<AIGenerateIcon className="w-6 h-6" />} title="用户生图记录">
                     <p>
                        集中审查和管理所有用户通过 AI 模型生成的图片。此功能对于监控生成质量、用户行为和模型表现至关重要。
                     </p>
                    <ul className="list-disc list-inside space-y-2 pl-2">
                        <li><strong className="font-semibold text-gray-700">全功能筛选:</strong> 点击“筛选”按钮打开高级筛选面板，您可以根据操作系统、模型、尺寸、风格、用户ID等多种维度组合查询。</li>
                        <li><strong className="font-semibold text-gray-700">数据分布统计:</strong> 切换到“AI 生图分布”页签，可以直观地查看各项指标（如操作系统、模型、风格）的统计图表，帮助您从宏观上把握用户行为和模型趋势。</li>
                        <li><strong className="font-semibold text-gray-700">图片预览:</strong> 点击任意一张生成的图片，可以放大查看细节，支持鼠标悬浮放大镜功能。</li>
                        <li><strong className="font-semibold text-gray-700">数据导出:</strong> 选中一个或多个条目后，点击“批量下载为 ZIP 文件”按钮，以（模拟）打包下载所选图片及其元数据。</li>
                    </ul>
                </Section>
                
                <Section icon={<CommunityIcon className="w-6 h-6" />} title="社区管理">
                    <p>
                      此模块是维护社区健康的关键。您可以在这里处理用户举报，并对违规用户采取相应措施。
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-2">
                        <li><strong className="font-semibold text-gray-700">统一内容审查:</strong> “被举报内容”列现在可以同时展示被举报的图片或文字评论，方便您统一处理。</li>
                        <li><strong className="font-semibold text-gray-700">AI 辅助翻译:</strong> 对于非中文的文字举报，点击“翻译”按钮即可利用 Gemini AI 将其即时翻译成中文，消除语言障碍，提升全球社区的管理效率。</li>
                        <li><strong className="font-semibold text-gray-700">查看用户档案:</strong> 点击被举报用户的ID，可以查看其历史被举报次数、违规记录和当前状态。</li>
                        <li><strong className="font-semibold text-gray-700">用户封禁:</strong> 点击“封禁用户”按钮，可以设置封禁时长和类型（如禁止发言），对违规用户进行处理。</li>
                         <li><strong className="font-semibold text-gray-700">排序与批量操作:</strong> 点击“举报次数”可进行排序。勾选多个举报可进行批量忽略或删除。</li>
                    </ul>
                </Section>
                 <Section icon={<SearchIcon className="w-6 h-6" />} title="搜索管理">
                    <p>
                      通过分析搜索数据，优化应用内容策略，满足用户需求。
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-2">
                        <li><strong className="font-semibold text-gray-700">热搜词条:</strong> 查看当前最热门的50个搜索词，了解用户兴趣趋势。</li>
                         <li><strong className="font-semibold text-gray-700">稀缺词条:</strong> 关注搜索量高但内容匹配度低的词条，这些是需要优先补充内容的方向。</li>
                        <li><strong className="font-semibold text-gray-700">热点日历:</strong> 预先了解未来30天的全球节假日和活动，帮助您提前规划运营和内容更新。点击按钮可快速定位到最近的事件。</li>
                    </ul>
                </Section>
                <Section icon={<FileArchiveIcon className="w-6 h-6" />} title="批量生图工具">
                    <p>
                      这是一个高效的内容生产工具，旨在将高价值的“稀缺词条”快速转化为可用的图片素材。
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-2">
                        <li><strong className="font-semibold text-gray-700">导入词条:</strong> 一键将“热搜词条”或“稀缺词条”列表中的高价值词条导入为生图任务队列。</li>
                        <li><strong className="font-semibold text-gray-700">自定义任务:</strong> 您可以手动添加新的提示词，或对已导入的任务进行编辑，调整提示词、风格和尺寸。</li>
                        <li><strong className="font-semibold text-gray-700">批量生成:</strong> 点击“全部生成”按钮，系统将自动处理所有待生成的任务。</li>
                        <li><strong className="font-semibold text-gray-700">生图记录与后期处理:</strong> 成功生成的图片会自动移入下方的“生图记录”区域。在这里，您可以多选图片，然后进行**批量下载**或**上传到素材库**。上传时，系统会使用 Gemini AI 自动为图片打上标签、进行分类，完成从数据洞察到内容生产的闭环。</li>
                    </ul>
                </Section>
            </div>
        </div>
    );
};

export default UsageTutorial;