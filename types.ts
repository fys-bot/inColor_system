
export type AIGenerationStyle = string;
export type AIGenerationSize = '方形' | '横屏' | '竖屏';
export type AIGenerationOS = 'iOS' | 'Android';
export type AIGenerationModel = string;

export type AssetType = 'Categorized' | 'Daily' | 'Grayscale';

export interface AssetTypeInfo {
    id: string;
    name: string;
    namingConvention?: string;
}

export interface ArtistInfo {
    name: string;
    avatarUrl: string;
}

export interface UserCreation {
    id: string;
    imageUrl: string;
    userId: string;
    userName: string;
    likes: number;
}

export interface Asset {
    id: string;
    imageUrl: string;
    description: string;
    assetType: string; // 对应单图的二级分类或 Themed
    aiCategory: string;
    uploadDate: string;
    isHidden: boolean;
    tags?: string[];
    userCreations?: UserCreation[];
    artist?: string;
    style?: string;
    isAI?: boolean;
    bookId?: string | number; // 如果属于某本书
    
    // Compatibility fields for raw data mapping
    name?: string;
    thumb?: string;
    createdAt?: number;
    theme?: string;
}

// Updated to match the requested Raw Data Structure
export interface ThemedBook {
    id: number | string;
    name: string;
    cover: string; // Used as coverUrl
    createdAt?: number;
    updatedAt?: number;
    patterns: Asset[]; // Renamed from assets to patterns to match raw data structure
    tags?: string | string[]; // Can be string in raw data
    
    // Optional fields from raw data or previous structure
    accessFlag?: number;
    isnew?: boolean;
    isfreeBook?: boolean;
    seriesId?: number;
    isfirstsixe?: boolean;
    
    // Artist specific
    isArtistBook?: boolean;
    artist?: string;
    artistName?: string; // UI helper
    artistAvatar?: string; // UI helper
    banner?: string;
    avatar?: string;
    dest?: string;
    
    // UI Helpers (Mapped from raw)
    title?: string; // Alias for name for compatibility if needed, or we switch to name
    category?: string;
    description?: string;
}

export interface AIGeneration {
    id: string;
    os: string;
    version: string;
    modelName: string;
    size: string;
    style: string;
    userId: string;
    prompt: string;
    generationTime: string;
    duration: number;
    imageUrl: string;
    feedback: string;
}

/**
 * Represents an AI generation record in the management view.
 */
export interface AIGenerationRecords {
    id: string;
    URL: string;
    model: string;
    ratio: number;
    style: string;
    uid: string;
    prompt: string;
    createdAt: string;
    description_zh: string;
}

export type ReportStatus = 'Pending' | 'Resolved' | 'Ignored';
export interface ReportedContent {
    type: 'image' | 'text';
    url?: string;
    content?: string;
    language?: string;
}

export interface Report {
    id: string;
    reportedContent: ReportedContent;
    reason: string;
    reporterId: string;
    reportedUserId: string;
    timestamp: string;
    status: ReportStatus;
    processingTime?: string;
}

/**
 * Represents system detected content for moderation.
 */
export interface SystemDetection {
    id: string;
    url: string;
    type: string;
    author: string;
    userName: string;
    userUid: string;
    createdAt: string;
    likesCount: number;
}

export type SystemDetectionS = SystemDetection;

export type BanType = 'mute' | 'forbid_posting';
export interface BanDetails {
    type: BanType;
    duration: number | string;
    reason: string;
    bannedUntil: string;
}

export interface User {
    id: string;
    status: 'Active' | 'Suspended' | 'Banned';
    reportHistory: string[];
    banDetails?: BanDetails;
}

export interface SearchTerm {
    term: string;
    translation?: string;
    language?: string;
    h: number;
    c?: number;
    n?: number;
    date: string;
    trend?: number;
    matchRate?: number;
    category?: string;
}

export interface FileAsset {
    id: string;
    name: string;
    type: 'Image' | 'JSON' | 'Text';
    source: string;
    size: number;
    lastModified: string;
    path: string;
    content?: string;
    description?: string;
}

export type SubscriptionStatus = '活跃' | '已过期' | '已取消' | '试用中';
export type SubscriptionPlan = 'Free' | 'Premium' | 'Pro';
export type AccountStatus = '正常' | '已封禁';

export interface SubscriptionRecord {
    startDate: string;
    sku: string;
    plan: string;
    status: 'Active' | 'Expired' | 'Canceled';
    cost: number;
}

export interface SubscriptionUser {
    id: string;
    avatarUrl: string;
    username: string;
    appId: string;
    subscriptionStatus: SubscriptionStatus;
    subscriptionPlan: string;
    expirationDate: string | null;
    totalConsumption: number;
    registrationDate: string;
    accountStatus: AccountStatus;
    subscriptionHistory: SubscriptionRecord[];
}

export type AIModelFeature = 'imageTagging' | 'imageCategorization' | 'imageGeneration' | 'textTranslation';
export interface AIModelDetails {
    modelName: string;
    presetPrompts?: string[];
    activePresetPromptIndex?: number;
    defaultSize?: AIGenerationSize;
}
export type AIModelConfig = Record<AIModelFeature, AIModelDetails>;

export interface AvailableModels {
    text: string[];
    image: string[];
}

export type APIEndpointFeature = 'assets' | 'aiGenerations' | 'reports' | 'subscriptionUsers' | 'searchTerms' | 'aiDebugger';
export type APIEndpointConfig = Record<APIEndpointFeature, string>;

export interface AIDebuggerData extends Array<{
    timestamp: string;
    level: string;
    message: string;
    metadata?: any;
}> {}

export interface ImageGenerationTask {
    id: string;
    prompt: string;
    status: 'pending' | 'loading' | 'done' | 'error';
    imageUrl: string | null;
    completionDate?: string;
    uploadStatus?: 'idle' | 'uploading' | 'complete' | 'error';
    style: AIGenerationStyle;
    size: AIGenerationSize;
    modelName?: string;
    errorMessage?: string;
}

export interface UploadTask {
    id: string;
    file: File;
    preview: string;
    status: 'analyzing' | 'complete' | 'error' | 'deleted';
    progress: number;
    title: string;
    tags: string[];
    // Added for Batch Generation workflow
    tagsZh?: string[];
    // Added for Batch Generation workflow
    imageName?: string;
    category: string;
    artist: string;
    assetType: string;
}

export type ReportState = 'pending' | 'block' | 'deleted' | 'ignore';
export interface UserReports {
    id: string;
    uid: string;
    uids: string[];
    comment: string;
    url: string;
    reasons: Record<string, any>;
    count: number;
    createdAt: string;
    updatedAt: string;
    state: ReportState;
    status?: string;
    processingTime?: string;
}

export type Page = 'dashboard' | 'assets' | 'ai-generations' | 'community' | 'search' | 'user-management' | 'batch-image-generation';
