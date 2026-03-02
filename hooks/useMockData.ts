
import { useState, useEffect } from 'react';
import { rawAssetData } from '../data/rawAssetData';
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

    // Process Local Data into Application State
    useEffect(() => {
        const loadData = () => {
            setIsLoading(true);
            try {
                // --- Processing Logic Start ---
                const HOST = rawAssetData.host;
                const allAssets: Asset[] = [];
                const allBooks: ThemedBook[] = [];

                // 1. Process Pages & Pages2 (Categorized & Daily)
                const rawPages = [...(rawAssetData.pages || []), ...(rawAssetData.pages2 || [])];
                rawPages.forEach((item: any) => {
                    const isDaily = item.name.endsWith('-d');
                    allAssets.push({
                        id: item.name,
                        imageUrl: `${HOST}${item.thumb}?alt=media`,
                        description: item.name,
                        assetType: isDaily ? 'Daily' : 'Categorized',
                        aiCategory: isDaily ? 'Daily Update' : 'General',
                        uploadDate: formatDate(item.createdAt),
                        isHidden: false,
                        tags: item.tags ? (typeof item.tags === 'string' ? item.tags.split(',') : item.tags) : [],
                        style: 'Normal',
                        isAI: false,
                        artist: 'System',
                        userCreations: Math.random() > 0.8 ? mockUserCreations : []
                    });
                });

                // 2. Process Activities & Activities2
                const rawActivities = [...(rawAssetData.activities || []), ...(rawAssetData.activities2 || [])];
                rawActivities.forEach((item: any) => {
                    allAssets.push({
                        id: item.name,
                        imageUrl: `${HOST}${item.thumb}?alt=media`,
                        description: item.name,
                        assetType: 'Activity',
                        aiCategory: 'Event',
                        uploadDate: formatDate(item.createdAt),
                        isHidden: false,
                        tags: item.tags ? (typeof item.tags === 'string' ? item.tags.split(',') : item.tags) : ['Activity'],
                        style: 'Event',
                        isAI: false,
                        artist: 'System',
                        userCreations: []
                    });
                });

                // 3. Process Grayscale & Pickups (as Grayscale/AI)
                const rawGrayscale = [...(rawAssetData.grayscalefigures || []), ...(rawAssetData.pickups || [])];
                rawGrayscale.forEach((item: any) => {
                    allAssets.push({
                        id: item.name,
                        imageUrl: `${HOST}${item.thumb}?alt=media`,
                        description: item.name,
                        assetType: 'Grayscale',
                        aiCategory: 'Grayscale',
                        uploadDate: formatDate(item.createdAt),
                        isHidden: false,
                        tags: item.tags ? (typeof item.tags === 'string' ? item.tags.split(',') : item.tags) : ['Grayscale', 'AI'],
                        style: 'Sketch',
                        isAI: true,
                        artist: 'Gemini',
                        userCreations: []
                    });
                });

                // 4. Process Books (Normal)
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

                // 5. Process Artists (Artist Books)
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
                        // Artist Books use 11:6 Banner for cover
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

                setAssets(allAssets);
                setThemedBooks(allBooks);
                setIsLoading(false);

            } catch (error) {
                console.error("Error processing assets:", error);
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

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
        { id: 'Grayscale', name: '灰度图' }
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
