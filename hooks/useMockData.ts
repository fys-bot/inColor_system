
import { useState, useEffect, useCallback } from 'react';
import { rawAssetData as staticRawAssetData } from '../data/rawAssetData';
import { API_BASE } from '../utils/api';
import {
    AIModelConfig,
    Asset,
    AssetTypeInfo,
    ArtistInfo,
    AIGeneration,
    Report,
    User,
    SearchTerm,
    SubscriptionUser,
    AvailableModels,
    AIGenerationStyle,
    FileAsset,
    APIEndpointConfig,
    AIDebuggerData,
    ThemedBook,
    UserCreation
} from '../types';

const mockUserCreations: UserCreation[] = [
    { id: 'UC1', imageUrl: 'https://picsum.photos/seed/color1/800/800', userId: 'U1', userName: '小明', likes: 120 },
    { id: 'UC2', imageUrl: 'https://picsum.photos/seed/color2/800/800', userId: 'U2', userName: '绘画大牛', likes: 850 },
    { id: 'UC3', imageUrl: 'https://picsum.photos/seed/color3/800/800', userId: 'U3', userName: '艺术爱好者', likes: 45 },
];

// Helper to format date
const formatDate = (timestamp?: number) => {
    if (!timestamp) return new Date().toISOString().split('T')[0];
    return new Date(timestamp).toISOString().split('T')[0];
};

export const useMockData = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [themedBooks, setThemedBooks] = useState<ThemedBook[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 通用的数据处理函数
    const processRawData = useCallback((rawAssetData: any) => {
        const HOST = rawAssetData.host;
        const allAssets: Asset[] = [];
        const allBooks: ThemedBook[] = [];

        // 辅助：解析 tags 字段
        const parseTags = (item: any): string[] =>
            item.tags ? (typeof item.tags === 'string' ? item.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : item.tags) : [];

        // 辅助：判断是否有 tags（有 tags 的数据是分类图）
        const hasTags = (item: any): boolean => {
            const t = parseTags(item);
            return t.length > 0;
        };

        // pages / pages2 — 有 tags 的是分类图，name 以 -d 结尾的是每日更新，其余也归分类图
        const rawPages = [...(rawAssetData.pages || []), ...(rawAssetData.pages2 || [])];
        console.log(`[processRawData] pages: ${(rawAssetData.pages || []).length}, pages2: ${(rawAssetData.pages2 || []).length}, total: ${rawPages.length}`);
        rawPages.forEach((item: any) => {
            const isDaily = item.name.endsWith('-d');
            const isCategorized = hasTags(item);
            // 有 tags → 分类图（优先级最高），否则按 -d 后缀判断
            const assetType = isCategorized ? 'Categorized' : (isDaily ? 'Daily' : 'Categorized');
            allAssets.push({
                id: item.name,
                imageUrl: `${HOST}${item.thumb}?alt=media`,
                description: item.name,
                assetType,
                aiCategory: assetType === 'Daily' ? 'Daily Update' : 'General',
                uploadDate: formatDate(item.createdAt),
                isHidden: false,
                tags: parseTags(item),
                style: 'Normal',
                isAI: false,
                artist: 'System',
                userCreations: Math.random() > 0.8 ? mockUserCreations : []
            });
        });

        // activities / activities2 — 活动图
        const rawActivities = [...(rawAssetData.activities || []), ...(rawAssetData.activities2 || [])];
        console.log(`[processRawData] activities: ${(rawAssetData.activities || []).length}, activities2: ${(rawAssetData.activities2 || []).length}, total: ${rawActivities.length}`);
        rawActivities.forEach((item: any) => {
            allAssets.push({
                id: item.name,
                imageUrl: `${HOST}${item.thumb}?alt=media`,
                description: item.name,
                assetType: 'Activity',
                aiCategory: 'Event',
                uploadDate: formatDate(item.createdAt),
                isHidden: false,
                tags: parseTags(item).length > 0 ? parseTags(item) : ['Activity'],
                style: 'Event',
                isAI: false,
                artist: 'System',
                userCreations: []
            });
        });

        // grayscalefigures — 灰度图
        const rawGrayscale = [...(rawAssetData.grayscalefigures || [])];
        rawGrayscale.forEach((item: any) => {
            allAssets.push({
                id: item.name,
                imageUrl: `${HOST}${item.thumb}?alt=media`,
                description: item.name,
                assetType: 'Grayscale',
                aiCategory: 'Grayscale',
                uploadDate: formatDate(item.createdAt),
                isHidden: false,
                tags: parseTags(item).length > 0 ? parseTags(item) : ['Grayscale', 'AI'],
                style: 'Sketch',
                isAI: true,
                artist: 'Gemini',
                userCreations: []
            });
        });

        // free — 全部是主页图
        const rawFree = [...(rawAssetData.free || [])];
        console.log(`[processRawData] free: ${rawFree.length}`);
        rawFree.forEach((item: any) => {
            allAssets.push({
                id: item.name,
                imageUrl: `${HOST}${item.thumb}?alt=media`,
                description: item.name,
                assetType: 'Homepage',
                aiCategory: 'Homepage',
                uploadDate: formatDate(item.createdAt),
                isHidden: false,
                tags: parseTags(item).length > 0 ? parseTags(item) : ['Homepage', 'Free'],
                style: 'Normal',
                isAI: false,
                artist: 'System',
                userCreations: []
            });
        });

        // pickups — 全部是主页图（不再区分搜索图）
        const rawPickups = [...(rawAssetData.pickups || [])];
        console.log(`[processRawData] pickups: ${rawPickups.length}`);
        rawPickups.forEach((item: any) => {
            allAssets.push({
                id: item.name,
                imageUrl: `${HOST}${item.thumb}?alt=media`,
                description: item.name,
                assetType: 'Homepage',
                aiCategory: 'Homepage',
                uploadDate: formatDate(item.createdAt),
                isHidden: false,
                tags: parseTags(item).length > 0 ? parseTags(item) : ['Homepage', 'AI'],
                style: 'Sketch',
                isAI: true,
                artist: 'Gemini',
                userCreations: []
            });
        });

        // choice — 忽略不处理

        (rawAssetData.books || []).forEach((book: any) => {
            const patterns: Asset[] = (book.patterns || []).map((p: any) => ({
                id: p.name,
                imageUrl: `${HOST}${p.thumb}?alt=media`,
                description: p.name,
                assetType: 'Themed',
                aiCategory: book.name,
                uploadDate: formatDate(p.createdAt || book.createdAt),
                isHidden: false,
                tags: p.tags ? (typeof p.tags === 'string' ? p.tags.split(',') : p.tags) : [book.name],
                style: p.style || 'Book',
                isAI: false,
                bookId: book.id,
                userCreations: []
            }));

            allBooks.push({
                ...book,
                cover: `${HOST}${book.cover}?alt=media`,
                title: book.name,
                description: `Theme: ${book.name}`,
                patterns: patterns,
                style: 'Book',
                category: 'Themed',
                tags: book.tags,
                isArtistBook: false
            });
        });

        (rawAssetData.artists || []).forEach((artist: any) => {
            const patterns: Asset[] = (artist.patterns || []).map((p: any) => ({
                id: p.name,
                imageUrl: `${HOST}${p.thumb}?alt=media`,
                description: p.name,
                assetType: 'Themed',
                aiCategory: artist.name,
                uploadDate: formatDate(p.createdAt || artist.createdAt || Date.now()),
                isHidden: false,
                tags: p.tags ? (typeof p.tags === 'string' ? p.tags.split(',') : p.tags) : [artist.name],
                style: 'Artist',
                isAI: false,
                bookId: artist.id,
                artist: artist.artist,
                userCreations: []
            }));

            allBooks.push({
                ...artist,
                cover: `${HOST}${artist.banner}?alt=media`,
                title: artist.name,
                description: artist.dest || `Works by ${artist.artist}`,
                patterns: patterns,
                style: 'Artist',
                category: 'Artist Special',
                tags: ['Artist', artist.artist],
                isArtistBook: true,
                artistName: artist.artist,
                artistAvatar: `${HOST}${artist.avatar}?alt=media`
            });
        });

        return { allAssets, allBooks };
    }, []);

    // 从远程 API 刷新素材数据
    const refreshAssets = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(API_BASE + '/api/content-config');
            const json = await res.json();
            console.log('[refreshAssets] API response keys:', json.data ? Object.keys(json.data) : 'no data');
            if (json.success && json.data) {
                const { allAssets, allBooks } = processRawData(json.data);
                console.log(`[refreshAssets] Loaded ${allAssets.length} assets, ${allBooks.length} books`);
                const activityCount = allAssets.filter(a => a.assetType === 'Activity').length;
                const dailyCount = allAssets.filter(a => a.assetType === 'Daily').length;
                console.log(`[refreshAssets] Activity: ${activityCount}, Daily: ${dailyCount}`);
                setAssets(allAssets);
                setThemedBooks(allBooks);
                return { success: true, count: allAssets.length };
            } else {
                throw new Error(json.error || '获取素材配置失败');
            }
        } catch (e: any) {
            console.error('refreshAssets failed:', e);
            return { success: false, error: e.message };
        } finally {
            setIsLoading(false);
        }
    }, [processRawData]);

    // 初始加载：直接从远程拉取最新数据，静态数据作为 fallback
    useEffect(() => {
        refreshAssets().then(result => {
            if (!result.success) {
                // 远程失败时用本地静态数据兜底
                console.warn('[useMockData] Remote refresh failed, using static data');
                try {
                    const { allAssets, allBooks } = processRawData(staticRawAssetData);
                    setAssets(allAssets);
                    setThemedBooks(allBooks);
                } catch (error) {
                    console.error("Error processing static assets:", error);
                }
                setIsLoading(false);
            }
        });
    }, [processRawData, refreshAssets]);

    const [categories, setCategories] = useState<string[]>(['Nature', 'Animals', 'Abstract', 'Character', 'Flower & Plant', 'Scifi', 'Holiday & Seasons', 'Artist Special']);
    const [artists, setArtists] = useState<ArtistInfo[]>([{ name: 'Official Artist', avatarUrl: '' }, { name: 'John Doe', avatarUrl: '' }]);
    const [generationStyles, setGenerationStyles] = useState<AIGenerationStyle[]>(['Line Art', 'Anime', 'Pixar', 'Mandala', 'Classicism', 'Impressionism', 'Cyberpunk']);
    const [aiModelConfig, setAiModelConfig] = useState<AIModelConfig>({
        imageTagging: { modelName: 'gemini-3-flash-preview' },
        imageCategorization: { modelName: 'gemini-3-flash-preview' },
        imageGeneration: { modelName: 'gemini-2.5-flash-image', presetPrompts: [], activePresetPromptIndex: 0 },
        textTranslation: { modelName: 'gemini-3-flash-preview' },
    });

    const [aiGenerations, setAiGenerations] = useState<AIGeneration[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);

    const [assetTypes, setAssetTypes] = useState<AssetTypeInfo[]>([
        { id: 'Categorized', name: '分类图库' },
        { id: 'Daily', name: '每日更新' },
        { id: 'Activity', name: '活动图' },
        { id: 'Grayscale', name: '灰度图' },
        { id: 'Homepage', name: '主页图' },
    ]);
    const [availableModels, setAvailableModels] = useState<AvailableModels>({
        text: ['gemini-3-flash-preview', 'gemini-3-pro-preview'],
        image: ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview']
    });
    const [subscriptionUsers, setSubscriptionUsers] = useState<SubscriptionUser[]>([]);
    const [fileAssets, setFileAssets] = useState<FileAsset[]>([]);
    const [apiEndpoints, setApiEndpoints] = useState<APIEndpointConfig>({
        assets: '', aiGenerations: '', reports: '', subscriptionUsers: '', searchTerms: '', aiDebugger: ''
    });
    const [aiDebuggerData, setAiDebuggerData] = useState<AIDebuggerData>([]);

    return {
        assets, setAssets,
        themedBooks, setThemedBooks,
        isLoading,
        refreshAssets,
        categories, setCategories,
        artists, setArtists,
        assetTypes, setAssetTypes,
        aiModelConfig, setAiModelConfig,
        availableModels, setAvailableModels,
        generationStyles, setGenerationStyles,
        subscriptionUsers, setSubscriptionUsers,
        fileAssets, setFileAssets,
        apiEndpoints, setApiEndpoints,
        aiDebuggerData, setAiDebuggerData,
        aiGenerations, setAiGenerations,
        reports, setReports,
        users, setUsers,
        searchTerms, setSearchTerms
    };
};
