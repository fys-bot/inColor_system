import React from 'react';
import * as Icons from '../components/shared/Icons';

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <section className="flex items-start space-x-6">
        <div className="mt-1 bg-primary-light p-3 rounded-full text-primary">{icon}</div>
        <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">{title}</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4 text-gray-700 leading-relaxed">
                {children}
            </div>
        </div>
    </section>
);

const SubSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="pt-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-3">{title}</h3>
        <div className="space-y-3 text-sm">{children}</div>
    </div>
);

const TestingPoints: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-md">
        <h4 className="font-semibold text-blue-800 text-sm mb-2">Testing Points:</h4>
        <ul className="list-disc list-inside space-y-2 text-sm text-blue-900">
            {children}
        </ul>
    </div>
);

const Documentation: React.FC = () => {
    return (
        <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
                <h1 className="text-5xl font-bold text-gray-800">Incolor 系统功能与测试文档</h1>
                <p className="text-xl text-gray-500 mt-3">本系统设计理念、核心功能规格、以及质量保证测试指南。</p>
            </div>

            <div className="space-y-16">
                <Section icon={<Icons.PaletteIcon className="w-6 h-6"/>} title="1. 设计理念与技术架构">
                    <p>Incolor 后台的设计旨在为运营和管理人员提供一个清晰、高效且易于扩展的工作平台。所有设计决策都围绕以下四个核心原则展开：</p>
                    <ul className="list-disc list-inside space-y-3 pl-2">
                        <li>
                            <strong className="font-semibold text-gray-800">清晰至上 (Clarity):</strong> 界面首先要易于理解。我们通过明确的视觉层级、一致的图标语言和充足的留白来实现。每个页面都有单一的核心焦点，关键操作在视觉上必须突出。用户操作后会收到明确的反馈（Toast 通知、模态框）。
                        </li>
                        <li>
                            <strong className="font-semibold text-gray-800">效率优先 (Efficiency):</strong> 系统是为专业用户设计的，因此工作流程必须高度优化。这体现在提供强大的批量操作、上下文感知操作、全功能的筛选以及快捷键支持，旨在最大限度地减少不必要的操作步骤。
                        </li>
                        <li>
                            <strong className="font-semibold text-gray-800">一致性 (Consistency):</strong> 在整个应用中，相同的功能和元素应表现出一致的行为和外观。我们通过建立一个共享组件库（`Modal`, `Tooltip`等）和统一的图标库来强制实现这一点，以降低用户的学习成本。
                        </li>
                         <li>
                            <strong className="font-semibold text-gray-800">可扩展性 (Scalability):</strong> 系统设计必须能够适应未来的增长。在架构上，我们采用模块化的页面结构，使得添加新功能页面只需在 `App.tsx` 和 `Sidebar.tsx` 中进行少量修改。
                        </li>
                    </ul>
                    <SubSection title="技术架构">
                        <ul className="list-disc list-inside space-y-3 pl-2 text-sm">
                           <li><strong className="font-semibold text-gray-800">核心框架:</strong> 使用 React 和 TypeScript 构建，通过 `types.ts` 中的严格接口确保数据流的稳定。</li>
                           <li><strong className="font-semibold text-gray-800">UI & 样式:</strong> 采用 Tailwind CSS 的原子化/功能类方法，设计 Token 在 `index.html` 的 `tailwind.config` 中统一定义。</li>
                           <li><strong className="font-semibold text-gray-800">状态管理 (Centralized State):</strong> 为解决跨页面数据同步问题，所有核心数据都由顶层 `App.tsx` 中的 `useMockData` Hook 管理，并通过 props 向下传递。这创建了一个单一的数据源，保证了整个应用的数据一致性。</li>
                           <li><strong className="font-semibold text-gray-800">AI 集成 (@google/genai):</strong> Gemini API 是本系统的核心竞争力。通过优化 Prompt Engineering，我们从 AI 获取结构化的、可直接使用的数据（如逗号分隔的标签列表、唯一的分类名称等）。</li>
                           <li><strong className="font-semibold text-gray-800">页面状态保持：</strong> 为提升用户体验，当用户在不同页面间切换时，我们没有卸载旧页面，而是通过 `display: none` 将其隐藏。这保留了每个页面的内部状态（如滚动位置、筛选条件），用户返回时可以无缝继续之前的操作。</li>
                        </ul>
                    </SubSection>
                </Section>
                
                <Section icon={<Icons.AIGenerateIcon className="w-6 h-6"/>} title="2. 核心模块功能规格与测试">
                    <SubSection title="仪表盘 (Dashboard)">
                        <p>提供系统关键指标的宏观概览，是每日工作的起点。</p>
                        <ul className="list-disc list-inside space-y-2 pl-2">
                            <li><strong>核心指标卡片:</strong> 展示四个关键指标：总素材量、AI 生图总数、待处理举报数和最热搜索词。卡片可点击，直接跳转到对应的管理页面。</li>
                            <li><strong>数据图表:</strong> 包含“过去7天 AI 生图数量”折线图和“热门生图风格 Top 5”条形图，用于趋势分析。</li>
                            <li><strong>快速导航:</strong> 提供到核心管理模块的快捷入口。</li>
                        </ul>
                        <TestingPoints>
                            <li>验证指标卡片上的数字是否与对应模块的数据总量一致。</li>
                            <li>点击指标卡片，验证是否能正确跳转到“素材管理”、“用户生图记录”等页面。</li>
                            <li>检查图表是否正确渲染，鼠标悬浮时应显示数据 Tooltip。</li>
                        </TestingPoints>
                    </SubSection>
                    
                    <SubSection title="内置素材管理 (Asset Management)">
                        <p>应用内所有图片素材的集中管理中心，整合了 AI 辅助的自动化流程和精细的手动控制。</p>
                        <p><strong>功能分为三个标签页: 素材库, 分类管理, 标签管理。</strong></p>
                        <h4 className="font-semibold text-gray-800 mt-3">A. 素材库 (Asset Library)</h4>
                        <ul className="list-disc list-inside space-y-2 pl-2">
                            <li><strong>上传流程:</strong>
                                <ol className="list-decimal list-inside pl-4 mt-1 space-y-1">
                                    <li>用户通过拖拽或点击“上传素材”按钮选择图片文件。</li>
                                    <li>“正在处理”模态框出现，显示每个文件的上传和 AI 分析进度。Gemini AI 会自动为每张图生成标签和建议分类。</li>
                                    <li>分析完成后，自动进入“审核 & 编辑”模态框。</li>
                                    <li>在此模态框中，运营人员可以对所有图片进行批量修改（艺术家、分类、类别），也可以对单张图片进行精细编辑（修改标题、分类、类别，增删标签）。</li>
                                    <li>点击最终的“上传”按钮，所有素材及其元数据被保存到素材库。</li>
                                </ol>
                            </li>
                            <li><strong>浏览与查看:</strong> 素材以卡片形式展示，可点击图片查看支持缩放和平移的大图。用户作品也可点击查看大图。</li>
                            <li><strong>搜索与筛选:</strong> 支持按ID、描述、标签进行文本搜索，或通过“图搜图”功能利用 Gemini AI 查找相似图片。高级筛选支持按日期、隐藏状态、素材类别、AI分类和标签进行组合过滤。</li>
                            <li><strong>批量管理:</strong> 进入“批量管理”模式后，可勾选多个素材，进行批量的隐藏或取消隐藏。所有更改为暂存状态，需点击“发布更改”后才正式生效，并有二次确认。</li>
                        </ul>
                        <TestingPoints>
                            <li>测试完整的上传流程：拖拽上传 -> 进度条显示 -> 审核模态框出现 -> AI生成的标签和分类正确填充。</li>
                            <li>在审核模态框中，测试批量应用艺术家/分类/类别功能，并验证其是否对所有项生效。</li>
                            <li>对单个素材进行编辑，特别是增删标签，然后确认上传。</li>
                            <li>上传完成后，在素材库中找到新素材，验证其所有元数据（标题、分类、标签等）是否与审核时设置的一致。</li>
                            <li>测试高级筛选功能，组合使用日期范围和分类筛选，验证结果是否准确。</li>
                            <li>测试批量管理：选中3个素材 -> 点击“批量隐藏” -> 点击“发布更改” -> 确认 -> 验证这3个素材是否变为隐藏状态。</li>
                            <li>测试图片预览功能，确认可以放大、缩小和拖动图片。</li>
                        </TestingPoints>
                        
                        <h4 className="font-semibold text-gray-800 mt-3">B. 分类管理 (AI) (Category Management)</h4>
                        <ul className="list-disc list-inside space-y-2 pl-2">
                           <li>查看所有由 AI 自动生成或手动添加的分类及其下的素材数量。</li>
                           <li>手动输入名称以添加新的分类，系统会自动去重（不区分大小写）。</li>
                           <li>可展开每个分类，查看该分类下最常见的 Top 10 标签。</li>
                        </ul>
                         <TestingPoints>
                            <li>尝试添加一个已存在的分类（如“建筑”），验证系统是否提示错误并且不会重复添加。</li>
                            <li>添加一个新分类，然后到素材库中筛选该分类，验证其是否可用。</li>
                            <li>展开一个分类，验证其下的主要标签是否与该分类的素材相关。</li>
                        </TestingPoints>

                        <h4 className="font-semibold text-gray-800 mt-3">C. 标签管理 (Tag Management)</h4>
                        <ul className="list-disc list-inside space-y-2 pl-2">
                           <li>以列表形式展示系统内所有标签及其被使用的次数。</li>
                           <li>支持对标签进行行内编辑。修改后，所有使用该标签的素材都会自动更新。</li>
                           <li>支持删除标签。删除后，所有使用该标签的素材都会移除该标签，并有二次确认。</li>
                        </ul>
                        <TestingPoints>
                            <li>编辑一个常用标签（例如，将“建筑”改为“建筑物”），然后在素材库中搜索“建筑物”，验证原先的素材是否能被搜到且标签已更新。</li>
                            <li>删除一个标签，然后检查使用过该标签的素材，确认该标签已被移除。</li>
                        </TestingPoints>
                    </SubSection>
                    
                     <SubSection title="用户生图记录 (AI Generation Management)">
                        <p>监控和分析所有用户通过 AI 模型生成的图片记录。</p>
                        <p><strong>功能分为两个标签页: 生图列表, AI 生图分布。</strong></p>
                        <h4 className="font-semibold text-gray-800 mt-3">A. 生图列表 (Generation List)</h4>
                         <ul className="list-disc list-inside space-y-2 pl-2">
                           <li>以表格和卡片视图展示所有 AI 生成的图片及其详细元数据。</li>
                           <li>提供强大的全功能筛选器，支持按操作系统、模型、尺寸、风格、用户ID等所有字段进行组合查询。</li>
                           <li><strong>AI 翻译:</strong> 在“提示词内容”列，为非中文的提示词提供一键翻译功能，由 Gemini AI 提供支持。</li>
                           <li>支持勾选多个条目进行批量打包下载（ZIP）。</li>
                        </ul>
                        <TestingPoints>
                            <li>使用筛选器按“风格: 卡通”和“尺寸: 横屏”进行筛选，验证结果是否同时满足两个条件。</li>
                            <li>找到一个英文提示词，点击翻译按钮，验证是否能生成合理的中文翻译。</li>
                            <li>勾选5张图片，点击“批量下载”，验证（模拟的）下载流程是否正常。</li>
                        </TestingPoints>
                        <h4 className="font-semibold text-gray-800 mt-3">B. AI 生图分布 (Distribution View)</h4>
                         <ul className="list-disc list-inside space-y-2 pl-2">
                           <li>通过饼图和条形图，直观展示操作系统、模型和风格的分布情况。</li>
                        </ul>
                        <TestingPoints>
                           <li>验证图表中的数据总和是否与生图列表的总数大致相符。</li>
                        </TestingPoints>
                    </SubSection>

                    <SubSection title="社区管理 (Community Management)">
                        <p>处理用户举报，维护社区健康。</p>
                        <ul className="list-disc list-inside space-y-2 pl-2">
                           <li><strong>三标签页系统:</strong> 分为“待处理”、“已处理”和“封禁用户”，使审核工作流清晰化。</li>
                           <li><strong>举报处理:</strong> 在“待处理”列表中，审核员可以查看被举报的内容（图片或文本）、原因、举报者和被举报者信息。</li>
                           <li><strong>AI 翻译:</strong> 对非中文的文本举报内容，提供一键 AI 翻译功能。</li>
                           <li><strong>处理操作:</strong> 可对举报进行“删除内容”（标记为 Resolved）或“忽略”（标记为 Ignored）处理。处理后的举报会移至“已处理”列表。</li>
                           <li><strong>用户封禁:</strong> 可查看用户档案，并对其进行封禁操作，支持自定义封禁类型、时长和原因。被封禁的用户会出现在“封禁用户”列表中，并支持解封或修改封禁。</li>
                        </ul>
                        <TestingPoints>
                            <li>对一条待处理举报执行“忽略”操作，验证其是否移动到“已处理”列表并标记为“已忽略”。</li>
                            <li>封禁一个用户，验证其是否出现在“封禁用户”列表中。</li>
                            <li>在“封禁用户”列表中，对一个用户执行“解封”，验证其状态是否恢复正常。</li>
                        </TestingPoints>
                    </SubSection>
                    
                    <SubSection title="搜索管理 (Search Management)">
                        <p>分析用户搜索行为以发现内容机会。</p>
                         <ul className="list-disc list-inside space-y-2 pl-2">
                            <li><strong>热搜词条:</strong> 展示最高频的搜索词，了解用户兴趣趋势。</li>
                            <li><strong>稀缺词条:</strong> 关注搜索量高但内容匹配度低的词条，这些是需要优先补充内容的方向。</li>
                            <li><strong>热点日历:</strong> 展示未来的全球性节假日和活动，用于内容规划。</li>
                         </ul>
                        <TestingPoints>
                           <li>验证三个列表是否都加载了数据。</li>
                        </TestingPoints>
                    </SubSection>

                    <SubSection title="批量生图工具 (Batch Image Generation)">
                         <p>一个强大的内容生产工具，允许运营人员从稀缺词条或手动输入中批量创建图片生成任务。</p>
                         <ul className="list-disc list-inside space-y-2 pl-2">
                            <li><strong>任务式工作流:</strong> 允许运营人员创建多个生图任务队列。</li>
                            <li><strong>导入词条:</strong> 一键将“热搜词条”或“稀缺词条”列表中的高价值词条导入为生图任务。</li>
                            <li><strong>自定义生成:</strong> 每个任务都可以独立设置风格和尺寸。</li>
                            <li><strong>任务完成与历史记录:</strong> 成功生成的任务会自动从任务队列移至下方的“生图记录”区域，并按天分组。</li>
                            <li><strong>后期处理 (下载/上传):</strong> 在“生图记录”中，运营人员可以多选图片，并执行“下载”（单张为PNG，多张为ZIP）或“上传到素材库”。“上传”操作会触发 AI 分析（自动生成标签和分类），然后将结果存入“内置素材管理”库。</li>
                         </ul>
                         <TestingPoints>
                            <li>点击“自动导入稀缺词条”，在弹窗中确认导入，验证是否创建了新的生图任务。</li>
                            <li>点击“全部生成”，等待至少一个任务完成。</li>
                            <li>验证已完成的任务是否从上方任务列表消失，并出现在下方的“生图记录”中。</li>
                            <li>在“生图记录”中，选中一张图片，点击“上传到素材库”。</li>
                            <li>切换到“内置素材管理”页面，验证新素材是否存在，并检查其 AI 分类和标签是否已自动生成。</li>
                            <li>在“生图记录”中，选中三张图片，点击“下载”，验证是否触发了 ZIP 文件的下载。</li>
                        </TestingPoints>
                    </SubSection>
                    
                    <SubSection title="订阅用户管理 (Subscription User Management)">
                        <p>查看和管理所有订阅用户的信息。</p>
                        <ul className="list-disc list-inside space-y-2 pl-2">
                            <li>以表格形式展示用户的订阅状态、方案、消费、注册日期等信息。</li>
                            <li>支持按用户名或 APP ID 搜索。</li>
                            <li>支持点击表头对任意列进行排序。</li>
                        </ul>
                         <TestingPoints>
                            <li>测试搜索功能，输入一个用户名，验证结果是否正确。</li>
                            <li>点击“总消费”表头，验证数据是否能按升序和降序正确排序。</li>
                        </TestingPoints>
                    </SubSection>
                </Section>
            </div>
        </div>
    );
};

export default Documentation;