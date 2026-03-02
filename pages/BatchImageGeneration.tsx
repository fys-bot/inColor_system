
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
// FIX: Removed standard JS/Web API types (like Blob, AudioContext) and Gemini internal types (like Modality, Type) from the local types import as they are either global or should be handled differently.
import { 
    SearchTerm, 
    ImageGenerationTask, 
    Asset, 
    AIGenerationStyle, 
    AIGenerationSize, 
    AssetTypeInfo, 
    AIModelConfig, 
    AvailableModels, 
    UploadTask, 
    ArtistInfo 
} from '../types';
import * as Icons from '../components/shared/Icons';
import Tooltip from '../components/shared/Tooltip';
import Spinner from '../components/shared/Spinner';
import { useToast } from '../context/ToastContext';
import Modal from '../components/shared/Modal';
import ReviewAndEditModal from '../components/shared/ReviewAndEditModal';
import { useImagePreview } from '../context/ImagePreviewContext';

declare var JSZip: any;

const generationSizes: AIGenerationSize[] = ['方形', '横屏', '竖屏'];
const STORAGE_KEY = 'incolor_search_translations_v1';

// Fixed list of allowed categories for the Batch Image Generation tool
const FIXED_CATEGORIES = [
    'Animals', 'Birds', 'Landscape', 'Ocean', 'Butterfly', 
    'Flower & Plant', 'Holiday & Seasons', 'Poly', 'Mandala', 
    'Culture', 'People', 'Fashion', 'Manga & Doodle', 
    'Pop Art', 'Message', 'Wish'
];

// Helper to reliably parse JSON from AI response
const safeParseJSON = (text: string) => {
    try {
        // 1. Strip Markdown code blocks if present
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // 2. Extract content between the first {/[ and the last }/] to ignore conversational text
        const firstOpenBrace = cleaned.indexOf('{');
        const firstOpenBracket = cleaned.indexOf('[');
        let start = -1;
        let end = -1;

        if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
            start = firstOpenBrace;
            end = cleaned.lastIndexOf('}') + 1;
        } else if (firstOpenBracket !== -1) {
            start = firstOpenBracket;
            end = cleaned.lastIndexOf(']') + 1;
        }

        if (start !== -1 && end !== -1) {
            cleaned = cleaned.substring(start, end);
        }

        // 3. Attempt parse
        return JSON.parse(cleaned);
    } catch (e) {
        console.warn("Initial JSON parse failed, attempting cleanup...", e);
        // 4. Basic cleanup for common errors like trailing commas
        try {
            // Remove Markdown code blocks again in case extraction failed slightly
            let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            // Regex to remove trailing commas before closing braces/brackets
            cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
            
            // Re-extract
            const firstOpenBrace = cleaned.indexOf('{');
            const firstOpenBracket = cleaned.indexOf('[');
            let start = -1;
            let end = -1;
            if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
                start = firstOpenBrace;
                end = cleaned.lastIndexOf('}') + 1;
            } else if (firstOpenBracket !== -1) {
                start = firstOpenBracket;
                end = cleaned.lastIndexOf(']') + 1;
            }
            if (start !== -1 && end !== -1) {
                cleaned = cleaned.substring(start, end);
            }
            return JSON.parse(cleaned);
        } catch (e2: any) {
            console.error("JSON parse completely failed", e2);
            throw new Error("Failed to parse AI response as JSON");
        }
    }
};

// IndexedDB Helper Functions
const DB_NAME = 'IncolorDB';
const STORE_NAME = 'BatchHistory';
const STORE_NAME_PROCESSING = 'BatchProcessingHistory';
const DB_VERSION = 2; // Incremented version for new store

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_NAME_PROCESSING)) {
                db.createObjectStore(STORE_NAME_PROCESSING, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveTasksToDB = async (storeName: string, tasks: ImageGenerationTask[]) => {
    try {
        const db = await openDB();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        
        await new Promise<void>((resolve, reject) => {
            const clearReq = store.clear();
            clearReq.onsuccess = () => resolve();
            clearReq.onerror = () => reject(clearReq.error);
        });

        if (tasks.length > 0) {
            tasks.forEach(task => store.put(task));
        }
        
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e: any) {
        console.error("IndexedDB Save Error", e);
    }
};

const loadTasksFromDB = async (storeName: string): Promise<ImageGenerationTask[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

interface BatchImageGenerationProps {
    searchTerms: SearchTerm[];
    setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
    categories: string[];
    setCategories: React.Dispatch<React.SetStateAction<string[]>>;
    assetTypes: AssetTypeInfo[];
    aiModelConfig: AIModelConfig;
    setAiModelConfig: React.Dispatch<React.SetStateAction<AIModelConfig>>;
    generationStyles: AIGenerationStyle[];
    setGenerationStyles: React.Dispatch<React.SetStateAction<AIGenerationStyle[]>>;
    availableModels: AvailableModels;
    artists?: ArtistInfo[]; 
}

const BatchImageGeneration: React.FC<BatchImageGenerationProps> = ({ 
    searchTerms, setAssets, categories, setCategories, assetTypes, 
    aiModelConfig, setAiModelConfig, generationStyles, setGenerationStyles, availableModels, artists = [] 
}) => {
    const { showToast } = useToast();
    const { showPreview } = useImagePreview();
    const [activeTab, setActiveTab] = useState<'tool' | 'history' | 'processing'>('tool');
    const [tasks, setTasks] = useState<ImageGenerationTask[]>([]);
    
    // Progress stats
    const [progressStats, setProgressStats] = useState({ total: 0, completed: 0 });

    const [isGenerating, setIsGenerating] = useState(false);
    const [isAddPromptModalOpen, setIsAddPromptModalOpen] = useState(false);
    const [isPromptSettingsModalOpen, setIsPromptSettingsModalOpen] = useState(false);
    const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const [newPromptText, setNewPromptText] = useState('');
    const [generationCount, setGenerationCount] = useState<number>(1);
    
    // Auto Expand State
    const [isAutoExpand, setIsAutoExpand] = useState(false);
    const [isExpanding, setIsExpanding] = useState(false);

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isImportLoading, setIsImportLoading] = useState(false);
    const [loadingType, setLoadingType] = useState<'scarce' | 'hot' | null>(null);
    const [importModalConfig, setImportModalConfig] = useState<{ type: 'scarce' | 'hot'; terms: SearchTerm[] } | null>(null);

    // History (Generation)
    const [generationHistory, setGenerationHistory] = useState<ImageGenerationTask[]>([]);
    const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
    const [selectedHistoryItems, setSelectedHistoryItems] = useState<Set<string>>(new Set());
    const [newHistoryCount, setNewHistoryCount] = useState(0);

    // Image Processing (Uploads)
    const [processingTasks, setProcessingTasks] = useState<ImageGenerationTask[]>([]);
    const [selectedProcessingItems, setSelectedProcessingItems] = useState<Set<string>>(new Set());
    const [isProcessingLoaded, setIsProcessingLoaded] = useState(false);

    // History Preview Modal State
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    // Upload/Download Integrated Workflow
    const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [processMode, setProcessMode] = useState<'upload' | 'download'>('upload');

    // Load history
    useEffect(() => {
        loadTasksFromDB(STORE_NAME)
            .then((data) => {
                setGenerationHistory(sortTasks(data));
                setIsHistoryLoaded(true);
            });
        loadTasksFromDB(STORE_NAME_PROCESSING)
            .then((data) => {
                setProcessingTasks(sortTasks(data));
                setIsProcessingLoaded(true);
            });
    }, []);

    const sortTasks = (tasks: ImageGenerationTask[]) => {
        return tasks.sort((a, b) => new Date(b.completionDate || 0).getTime() - new Date(a.completionDate || 0).getTime());
    };

    // Save history on change
    useEffect(() => {
        if (isHistoryLoaded) saveTasksToDB(STORE_NAME, generationHistory);
    }, [generationHistory, isHistoryLoaded]);

    useEffect(() => {
        if (isProcessingLoaded) saveTasksToDB(STORE_NAME_PROCESSING, processingTasks);
    }, [processingTasks, isProcessingLoaded]);

    // Helpers
    const getAIClient = (): GoogleGenAI | null => {
        try {
            const key = process.env.API_KEY || '';
            if (key) return new GoogleGenAI({ apiKey: key });
        } catch (e: any) {
            console.error("Failed to create GoogleGenAI client", e);
        }
        return null;
    };

    const getNextSequenceName = (indexOffset: number = 0): string => {
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // 20251216
        const storageKey = `incolor_seq_${todayStr}`;
        const currentSeq = parseInt(localStorage.getItem(storageKey) || '0', 10);
        return `${todayStr}-${currentSeq + 1 + indexOffset}`;
    };

    const incrementSequence = (count: number) => {
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); 
        const storageKey = `incolor_seq_${todayStr}`;
        const currentSeq = parseInt(localStorage.getItem(storageKey) || '0', 10);
        localStorage.setItem(storageKey, (currentSeq + count).toString());
    };

    // --- Task Management ---

    const handleAddTask = () => {
        setNewPromptText('');
        setGenerationCount(1);
        setIsAutoExpand(false); 
        setIsAddPromptModalOpen(true);
    };

    const handleConfirmAddPrompt = async () => {
        const trimmedPrompt = newPromptText.trim();
        if (!trimmedPrompt) {
            showToast('提示词不能为空', 'error');
            return;
        }

        setIsExpanding(true);
        let promptsToUse: string[] = [];

        if (isAutoExpand && generationCount > 0) {
            try {
                const ai = getAIClient();
                if (!ai) throw new Error("API Key Missing");

                const prompt = `You are an expert creative assistant. The user wants to generate images based on the keyword or concept: "${trimmedPrompt}".
                Please generate ${generationCount} distinct image prompts that are related to or variations of this concept.
                CONSTRAINTS: Keep prompts SHORT and SIMPLE. NO color-related words.
                Return ONLY a JSON array of strings. 
                Example output: ["prompt 1", "prompt 2"]
                Do not use Markdown. Do not add comments or trailing commas.`;

                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: prompt,
                });

                const parsedPrompts = safeParseJSON(response.text || '[]');

                if (Array.isArray(parsedPrompts)) {
                    promptsToUse = parsedPrompts;
                } else {
                    promptsToUse = Array(generationCount).fill(trimmedPrompt);
                }
            } catch (error: any) {
                console.error("Auto expand failed:", error);
                promptsToUse = Array(generationCount).fill(trimmedPrompt);
            }
        } else {
            promptsToUse = Array(generationCount).fill(trimmedPrompt);
        }

        while (promptsToUse.length < generationCount) {
            promptsToUse.push(promptsToUse[promptsToUse.length % promptsToUse.length]);
        }
        promptsToUse = promptsToUse.slice(0, generationCount);

        const shuffledStyles = [...generationStyles].sort(() => 0.5 - Math.random());
        const defaultSize = aiModelConfig.imageGeneration.defaultSize || '方形';
        
        const newTasks: ImageGenerationTask[] = promptsToUse.map((promptText, index) => ({
            id: `task-manual-${Date.now()}-${index}`,
            prompt: promptText,
            status: 'pending',
            imageUrl: null,
            style: shuffledStyles[index % shuffledStyles.length],
            size: defaultSize,
        }));

        setTasks(prev => [...prev, ...newTasks]);
        setProgressStats(prev => ({ ...prev, total: prev.total + newTasks.length }));
        showToast(`已添加 ${newTasks.length} 个生成任务`, 'success');
        setIsExpanding(false);
        setIsAddPromptModalOpen(false);
    };
    
    const handleUpdateTask = (id: string, field: keyof ImageGenerationTask, value: any) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };
    
    const handleRemoveTask = (id: string) => {
        const taskToRemove = tasks.find(t => t.id === id);
        if (taskToRemove) {
            setProgressStats(s => ({ ...s, total: Math.max(0, s.total - 1) }));
            setTasks(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleClearAllTasks = () => {
        setTasks([]);
        setProgressStats({ total: 0, completed: 0 });
        showToast('所有任务已清除', 'success');
        setIsClearAllModalOpen(false);
    };

    // --- Import Logic ---
    const getSearchData = async (type: 'hot' | 'scarce') => {
        try {
            const endpoint = type === 'hot' ? 'h' : 'rarity';
            const res = await fetch(`https://sg.api.eyewind.cn/etl/imagen/history/${endpoint}`, {
                "headers": { "content-type": "application/json" },
                "body": JSON.stringify({ limit: 1000 }),
                "method": "POST",
                "mode": "cors",
                "credentials": "omit"
            }).then(r => r.json());
            return res.data || [];
        } catch (e: any) { return null; }
    }

    const handleOpenImportModal = async (type: 'scarce' | 'hot') => {
        setIsImportLoading(true);
        setLoadingType(type);
        let termsToImport: SearchTerm[] = [];
        const apiData = await getSearchData(type);
        if (apiData && apiData.length > 0) {
             termsToImport = apiData;
        } else {
             termsToImport = [...searchTerms].slice(0, 50); // Fallback
        }
        setImportModalConfig({ type, terms: termsToImport });
        setIsImportModalOpen(true);
        setIsImportLoading(false);
        setLoadingType(null);
    };

    const handleConfirmImport = (finalTerms: SearchTerm[], stylesPerTerm: number, type: 'scarce' | 'hot') => {
        const newTasks: ImageGenerationTask[] = [];
        const defaultSize = aiModelConfig.imageGeneration.defaultSize || '方形';
        finalTerms.forEach(term => {
            const shuffledStyles = [...generationStyles].sort(() => 0.5 - Math.random());
            for (let i = 0; i < stylesPerTerm; i++) {
                newTasks.push({
                    id: `task-import-${type}-${Date.now()}-${i}-${Math.random()}`,
                    prompt: term.translation || term.term,
                    status: 'pending',
                    imageUrl: null,
                    style: shuffledStyles[i % shuffledStyles.length],
                    size: defaultSize,
                });
            }
        });
        setTasks(prev => [...prev, ...newTasks]);
        setProgressStats(prev => ({ ...prev, total: prev.total + newTasks.length }));
        setIsImportModalOpen(false);
        showToast(`成功导入 ${newTasks.length} 个任务`, 'success');
    };

    // --- Generation Logic ---
    const handleGenerateAll = async () => {
        const tasksToProcess = tasks.filter(t => t.status === 'pending' || t.status === 'error');
        if (tasksToProcess.length === 0) return;

        setIsGenerating(true);
        showToast(`开始处理 ${tasksToProcess.length} 个任务...`, 'info');

        const ai = getAIClient();
        if (!ai) { showToast("API Key Error", "error"); setIsGenerating(false); return; }

        const config = aiModelConfig?.imageGeneration;
        const modelName = config?.modelName || 'gemini-2.5-flash-image';
        const template = config?.presetPrompts?.[config?.activePresetPromptIndex ?? 0] || '{PROMPT}';

        const getAspectRatio = (size: AIGenerationSize) => {
            return size === '横屏' ? '16:9' : size === '竖屏' ? '9:16' : '1:1';
        };

        const generateImageWithRetry = async (task: ImageGenerationTask): Promise<ImageGenerationTask> => {
            const finalPrompt = template.replace('{PROMPT}', task.prompt).replace('{STYLE}', task.style);
            const aspectRatio = getAspectRatio(task.size);
            
            try {
                let imageUrl = '';
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: { parts: [{ text: finalPrompt }] },
                    config: { imageConfig: { aspectRatio: aspectRatio as any } }
                });
                for (const part of response.candidates?.[0]?.content?.parts || []) {
                    if (part.inlineData) {
                        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                        break;
                    }
                }
                if (imageUrl) {
                    return { ...task, status: 'done', imageUrl, completionDate: new Date().toISOString(), modelName, errorMessage: undefined };
                }
                throw new Error("No image generated");
            } catch (error: any) {
                return { ...task, status: 'error', imageUrl: null, errorMessage: error.message };
            }
        };

        const chunkSize = 3; 
        for (let i = 0; i < tasksToProcess.length; i += chunkSize) {
            const batch = tasksToProcess.slice(i, i + chunkSize);
            setTasks(prev => prev.map(t => batch.some(b => b.id === t.id) ? { ...t, status: 'loading' } : t));
            const results = await Promise.all(batch.map(task => generateImageWithRetry(task)));
            
            const doneTasks = results.filter(t => t.status === 'done');
            if (doneTasks.length > 0) {
                setGenerationHistory(h => [...doneTasks, ...h]);
                setNewHistoryCount(c => c + doneTasks.length);
                setProgressStats(p => ({ ...p, completed: p.completed + doneTasks.length }));
            }
            setTasks(prev => {
                let nextTasks = prev.filter(t => !doneTasks.some(d => d.id === t.id));
                // Update error statuses
                const errorTasks = results.filter(t => t.status === 'error');
                nextTasks = nextTasks.map(t => {
                    const err = errorTasks.find(e => e.id === t.id);
                    return err ? { ...t, status: 'error', errorMessage: err.errorMessage } : t;
                });
                return nextTasks;
            });
            if (i + chunkSize < tasksToProcess.length) await new Promise(resolve => setTimeout(resolve, 1500)); 
        }
        setIsGenerating(false);
        showToast('生成任务队列处理完毕', 'success');
    };

    // --- Image Processing (Upload) Logic ---
    const handleUploadImages = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        const files = Array.from(e.target.files) as File[];
        const newTasks: ImageGenerationTask[] = [];
        
        const fileReaders = files.map(file => {
            return new Promise<void>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    newTasks.push({
                        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        prompt: file.name.replace(/\.[^/.]+$/, ""), // Use filename as prompt/title
                        status: 'done',
                        imageUrl: reader.result as string,
                        style: 'Local',
                        size: '方形', // Default, will be adjusted visually
                        completionDate: new Date().toISOString(),
                    });
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(fileReaders).then(() => {
            setProcessingTasks(prev => sortTasks([...newTasks, ...prev]));
            showToast(`成功上传 ${newTasks.length} 张图片`, 'success');
        });
        
        e.target.value = ''; // Reset input
    };

    // --- Unified Review / Upload / Download Workflow ---

    const getCurrentList = () => activeTab === 'history' ? generationHistory : processingTasks;
    const getCurrentSelection = () => activeTab === 'history' ? selectedHistoryItems : selectedProcessingItems;
    const setCurrentSelection = (newSet: Set<string>) => activeTab === 'history' ? setSelectedHistoryItems(newSet) : setSelectedProcessingItems(newSet);

    const handleIntegratedProcess = async (mode: 'upload' | 'download') => {
        const currentList = getCurrentList();
        const currentSelection = getCurrentSelection();
        const selectedTasks = currentList.filter(t => currentSelection.has(t.id));
        if (selectedTasks.length === 0) return;

        setProcessMode(mode);
        
        const initialUploadTasks: UploadTask[] = selectedTasks.map((task, index) => ({
            id: task.id,
            file: new File([], `ai_gen_${task.id}.png`),
            preview: task.imageUrl!,
            status: 'analyzing', // Start as analyzing
            progress: 0,
            title: task.prompt,
            tags: [],
            tagsZh: [], // Will be filled by AI
            imageName: getNextSequenceName(index), // Pre-fill name
            category: '', // Start empty
            artist: '', // Start empty
            assetType: '' // Start empty
        }));

        setUploadTasks(initialUploadTasks);
        setIsReviewModalOpen(true);

        const ai = getAIClient();
        if (!ai) return;

        // Background AI Processing Loop
        for (const task of initialUploadTasks) {
            try {
                // Update progress to started
                setUploadTasks(prev => prev.map(t => t.id === task.id ? { ...t, progress: 10 } : t));

                const base64Data = task.preview.split(',')[1];
                const imagePart = { inlineData: { data: base64Data, mimeType: 'image/png' } };

                // Combined Prompt for Tags + Category
                // Note: We tell the AI to choose from FIXED_CATEGORIES
                const analysisPrompt = `
                    Analyze this image. 
                    1. Generate 5-8 descriptive tags in English.
                    2. Provide Simplified Chinese translations for these tags.
                    3. Choose the best single category from this EXACT list: [${FIXED_CATEGORIES.join(', ')}].
                    
                    Return a JSON object only. No Markdown. No comments.
                    Ensure the JSON is valid and has no trailing commas.
                    Structure:
                    {
                        "tags": ["tag1", "tag2"],
                        "tagsZh": ["标签1", "标签2"],
                        "category": "CategoryName"
                    }
                `;

                const response = await ai.models.generateContent({
                    model: aiModelConfig.imageTagging.modelName, // Using text model for analysis
                    contents: { parts: [imagePart, { text: analysisPrompt }] }
                });

                const result = safeParseJSON(response.text || '{}') as any;

                setUploadTasks(prev => prev.map(t => t.id === task.id ? { 
                    ...t, 
                    progress: 100, 
                    status: 'complete',
                    tags: result.tags || [],
                    tagsZh: result.tagsZh || [],
                    category: result.category || '未分类'
                } : t));

            } catch (e: any) {
                console.error("Analysis failed", e);
                setUploadTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'error' } : t));
            }
        }
    };

    const handleConfirmReview = (finalizedTasks: UploadTask[]) => {
        if (processMode === 'upload') {
            handleUploadToAssetsFinal(finalizedTasks);
        } else {
            handleDownloadPackage(finalizedTasks);
        }
    };

    const handleUploadToAssetsFinal = (finalizedTasks: UploadTask[]) => {
        const newCategoryNames = [...new Set(finalizedTasks.map(t => t.category.trim()).filter(Boolean))];
        const categoriesToAdd = newCategoryNames.filter(cat => !categories.some(c => c.toLowerCase() === cat.toLowerCase()));
        if (categoriesToAdd.length > 0) {
            setCategories(prev => [...prev, ...categoriesToAdd].sort());
        }

        const newAssets: Asset[] = finalizedTasks.map(t => ({
            id: `AI_${t.imageName || Date.now()}`, // Use generated name if possible
            imageUrl: t.preview,
            description: t.title,
            artist: t.artist,
            assetType: t.assetType,
            aiCategory: t.category || '未分类',
            uploadDate: new Date().toISOString().split('T')[0],
            isHidden: false,
            tags: t.tags, // English tags usually stored
            userCreations: []
        }));

        setAssets(prev => [...newAssets, ...prev]);
        
        incrementSequence(finalizedTasks.length);

        setIsReviewModalOpen(false);
        setCurrentSelection(new Set()); // Clear current selection
        showToast(`已将 ${newAssets.length} 张图片添加到素材库`, 'success');
    };

    const handleDownloadPackage = async (finalizedTasks: UploadTask[]) => {
        if (finalizedTasks.length === 0) return;
        showToast('正在生成素材包...', 'info');

        try {
            const zip = new JSZip();
            
            // 1. Generate Excel/CSV Content
            let csvContent = "\uFEFF"; // BOM for Excel
            csvContent += "Date,Category,Tag1,Tag2,Tag3,Tag4,Tag5,Tag6,Tag7,Tag8\n"; // Header

            const imgPromises = finalizedTasks.map(async (task: UploadTask) => {
                const rowTags = (task.tags || []).slice(0, 8); 
                while(rowTags.length < 8) rowTags.push('');
                
                const row = [
                    task.imageName, 
                    task.category,
                    ...rowTags
                ].map(item => `"${(item || '').replace(/"/g, '""')}"`).join(","); 
                
                csvContent += row + "\n";

                let data: any;
                if (task.preview.startsWith('data:')) {
                    const matches = task.preview.match(/^data:image\/([a-zA-Z]*);base64,(.*)$/);
                    if (matches) data = matches[2];
                } else {
                    const response = await fetch(task.preview);
                    data = await response.blob();
                }

                if (data) {
                    const filename = `${task.imageName || task.id}.png`; 
                    zip.file(filename, data, { base64: typeof data === 'string' });
                }
            });

            await Promise.all(imgPromises);
            zip.file("素材配置文档.csv", csvContent);

            const content = (await zip.generateAsync({ type: "blob" })) as any;
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `Batch_Assets_${new Date().toISOString().slice(0, 10)}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            incrementSequence(finalizedTasks.length);

            setIsReviewModalOpen(false);
            setCurrentSelection(new Set()); // Clear current selection
            showToast('素材包下载已开始', 'success');

        } catch (e: any) {
            console.error(e);
            showToast('打包失败', 'error');
        }
    };

    // --- History Management ---
    const handleToggleItem = (id: string) => {
        const currentSelection = getCurrentSelection();
        // Specify the generic type <string> for the Set constructor to ensure it is correctly typed as Set<string>.
        const newSet = new Set<string>(currentSelection);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setCurrentSelection(newSet);
    };

    const handleSelectAll = () => {
        const currentList = getCurrentList();
        const currentSelection = getCurrentSelection();
        if (currentList.length > 0 && currentSelection.size === currentList.length) {
            setCurrentSelection(new Set());
        } else {
            setCurrentSelection(new Set(currentList.map(t => t.id)));
        }
    };

    const handleDeleteSelected = () => {
        const currentSelection = getCurrentSelection();
        if (currentSelection.size === 0) return;
        setIsDeleteConfirmModalOpen(true);
    };

    const confirmDeleteSelected = () => {
        const currentSelection = getCurrentSelection();
        if (activeTab === 'history') {
            setGenerationHistory(prev => prev.filter(t => !currentSelection.has(t.id)));
        } else {
            setProcessingTasks(prev => prev.filter(t => !currentSelection.has(t.id)));
        }
        setCurrentSelection(new Set());
        setIsDeleteConfirmModalOpen(false);
        showToast('选中图片已删除', 'success');
    };

    // --- Preview Modal Logic ---
    const handleOpenPreview = (index: number) => setPreviewIndex(index);
    const handleClosePreview = () => setPreviewIndex(null);
    const handlePrevPreview = (e?: React.MouseEvent) => {
        if(e) e.stopPropagation();
        setPreviewIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
    };
    const handleNextPreview = (e?: React.MouseEvent) => {
        if(e) e.stopPropagation();
        const currentList = getCurrentList();
        setPreviewIndex(prev => (prev !== null && prev < currentList.length - 1 ? prev + 1 : prev));
    };

    // Keyboard support for preview navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (previewIndex === null) return;
            if (e.key === 'ArrowLeft') handlePrevPreview();
            if (e.key === 'ArrowRight') handleNextPreview();
            if (e.key === 'Escape') handleClosePreview();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [previewIndex, activeTab, generationHistory, processingTasks]); 

    // --- Render ---
    const totalTasksCount = progressStats.total;
    const completedTasksCount = progressStats.completed;
    const remainingTasksCount = Math.max(0, totalTasksCount - completedTasksCount);
    const progressPercentage = totalTasksCount === 0 ? 0 : (completedTasksCount / totalTasksCount) * 100;
    
    // Tab Data
    const currentList = getCurrentList();
    const currentSelection = getCurrentSelection();
    const isAllSelected = currentList.length > 0 && currentSelection.size === currentList.length;

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-800">批量生图工具</h1>
            </div>
            
            <div className="border-b border-gray-200 flex-shrink-0">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('tool')} className={`${activeTab === 'tool' ? 'border-primary text-primary' : 'border-transparent text-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        生图工具
                    </button>
                    <button onClick={() => { setActiveTab('history'); setNewHistoryCount(0); }} className={`${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative`}>
                        生图记录
                        {newHistoryCount > 0 && <span className="absolute top-2 -right-4 ml-2 px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">{newHistoryCount}</span>}
                    </button>
                    <button onClick={() => setActiveTab('processing')} className={`${activeTab === 'processing' ? 'border-primary text-primary' : 'border-transparent text-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        图片处理
                    </button>
                </nav>
            </div>

            {/* Tool Tab Content */}
            {activeTab === 'tool' && (
                <div className="flex-1 flex flex-col min-h-0 bg-white p-6 rounded-lg shadow-sm border">
                     <p className="text-gray-500 mb-6">从稀缺词条或手动添加的提示词批量生成图片，一键保存到素材库。</p>
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <button onClick={handleAddTask} className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors">
                                <Icons.PlusIcon className="w-4 h-4 mr-2" /> 添加提示词
                            </button>
                            <button onClick={() => handleOpenImportModal('hot')} disabled={isImportLoading} className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-md hover:bg-blue-100 text-sm font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                                {isImportLoading && loadingType === 'hot' ? <Spinner size="sm" className="mr-2" /> : null} 自动导入热搜词条
                            </button>
                            <button onClick={() => handleOpenImportModal('scarce')} disabled={isImportLoading} className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-md hover:bg-blue-100 text-sm font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                                {isImportLoading && loadingType === 'scarce' ? <Spinner size="sm" className="mr-2" /> : null} 自动导入稀缺词条
                            </button>
                            <button onClick={handleGenerateAll} disabled={isGenerating || tasks.filter(t => t.status === 'pending' || t.status === 'error').length === 0} className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:bg-gray-300 text-sm font-medium transition-colors ml-2 shadow-sm">
                                {isGenerating ? <Spinner size="sm" /> : <Icons.AIGenerateIcon className="w-4 h-4 mr-2" />} {isGenerating ? '生成中...' : '全部生成'}
                            </button>
                        </div>
                        <button onClick={() => setIsPromptSettingsModalOpen(true)} className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors">
                            <Icons.EditIcon className="w-4 h-4 mr-2" /> 生图配置
                        </button>
                    </div>
                    {/* Task List Visualization */}
                    <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 p-4">
                        {tasks.length === 0 ? <div className="text-center text-gray-400 py-10">任务列表为空</div> : (
                            <div className="space-y-2">
                                {tasks.map(t => (
                                    <div key={t.id} className="bg-white p-3 rounded shadow-sm flex justify-between items-center">
                                        <span className="truncate flex-1 font-medium text-sm">{t.prompt}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-500">{t.style} - {t.size}</span>
                                            {t.status === 'done' ? <Icons.CheckIcon className="w-4 h-4 text-green-500"/> : t.status === 'error' ? <Icons.CloseIcon className="w-4 h-4 text-red-500"/> : t.status === 'loading' ? <Spinner size="sm"/> : <span className="text-xs text-gray-400">等待</span>}
                                            <button onClick={() => handleRemoveTask(t.id)}><Icons.DeleteIcon className="w-4 h-4 text-gray-400 hover:text-red-500"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                     {(tasks.length > 0 || totalTasksCount > 0) && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="w-full sm:max-w-md flex-1">
                                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                                    <span className="font-medium text-gray-600">任务进度</span>
                                    <span>总计: <span className="font-medium text-gray-900">{totalTasksCount}</span> <span className="mx-2 text-gray-300">|</span> 剩余: <span className="font-medium text-blue-600">{remainingTasksCount}</span></span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
                                    <div className={`h-full rounded-full transition-all duration-300 ${remainingTasksCount === 0 && totalTasksCount > 0 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${progressPercentage}%` }}></div>
                                </div>
                            </div>
                             <button onClick={() => setIsClearAllModalOpen(true)} className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors flex-shrink-0">清空任务列表</button>
                        </div>
                    )}
                </div>
            )}
            
             {(activeTab === 'history' || activeTab === 'processing') && (
                 <div className="flex-1 bg-white p-6 rounded-lg shadow-sm border flex flex-col min-h-0">
                     <div className="flex items-center justify-between pb-4 border-b border-gray-200 flex-shrink-0">
                         <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-gray-800">
                                {activeTab === 'history' ? '生图历史' : '图片处理'}
                            </h3>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">{currentList.length} 条记录</span>
                         </div>
                         <div className="flex items-center gap-3">
                             {activeTab === 'processing' && (
                                <label className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-md hover:bg-blue-100 text-sm font-medium transition-colors cursor-pointer mr-2">
                                    <Icons.CloudUploadIcon className="w-4 h-4 mr-2" /> 上传图片
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleUploadImages} />
                                </label>
                             )}
                             <span className="text-sm text-gray-500">{currentSelection.size} 项已选中</span>
                             <button onClick={handleSelectAll} disabled={currentList.length === 0} className="text-sm text-primary hover:text-primary-hover font-medium mr-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                 {isAllSelected ? '取消全选' : '选中全部'}
                             </button>
                             <button onClick={handleDeleteSelected} disabled={currentSelection.size === 0} className="px-4 py-2 text-sm bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center">
                                <Icons.DeleteIcon className="w-4 h-4 mr-1"/> 删除选中
                            </button>
                            <button onClick={() => handleIntegratedProcess('download')} disabled={currentSelection.size === 0} className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center">
                                <Icons.DownloadIcon className="w-4 h-4 mr-1"/> 下载选中
                            </button>
                             <button onClick={() => handleIntegratedProcess('upload')} disabled={currentSelection.size === 0} className="flex items-center px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                                 <Icons.CloudUploadIcon className="w-4 h-4 mr-2" /> 上传到素材库
                            </button>
                         </div>
                     </div>
                      <div className="flex-1 overflow-y-auto mt-6">
                         {currentList.length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <Icons.AssetIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p>{activeTab === 'history' ? '暂无生图记录。' : '暂无上传图片。'}</p>
                            </div>
                         ) : (
                             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                {currentList.map((task, index) => (
                                    <div 
                                        key={task.id} 
                                        className={`relative group border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${currentSelection.has(task.id) ? 'ring-4 ring-blue-600 border-transparent z-10' : 'border-gray-200'}`}
                                        onClick={() => handleToggleItem(task.id)}
                                    >
                                        <div className="absolute top-2 right-2 z-20">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleOpenPreview(index); }} 
                                                className="p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Icons.EyeIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="aspect-square bg-gray-100 relative">
                                            <img src={task.imageUrl!} alt={task.prompt} className="w-full h-full object-cover" />
                                            {currentSelection.has(task.id) && (
                                                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                    <Icons.CheckIcon className="w-8 h-8 text-white drop-shadow-md" />
                                                </div>
                                            )}
                                        </div>
                                        <div className={`p-3 ${currentSelection.has(task.id) ? 'bg-blue-50' : 'bg-white'}`}>
                                            <p className="text-xs text-gray-500 mb-1">{new Date(task.completionDate || '').toLocaleTimeString()}</p>
                                            <p className="text-sm text-gray-800 font-medium truncate" title={task.prompt}>{task.prompt}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{task.style}</span>
                                                <span className="text-xs text-gray-400 ml-auto">{task.size}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         )}
                     </div>
                 </div>
             )}

            {/* Custom Full Screen Preview Modal with Navigation and Details */}
            {previewIndex !== null && currentList[previewIndex] && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90" onClick={handleClosePreview}>
                    
                    <div className="flex w-full h-full p-10 gap-6 pointer-events-none" onClick={(e) => e.stopPropagation()}>
                        {/* Image Area */}
                        <div className="flex-1 flex items-center justify-center relative pointer-events-auto">
                            <img 
                                src={currentList[previewIndex].imageUrl || ''} 
                                alt="Preview" 
                                className="max-w-full max-h-full object-contain shadow-2xl" 
                            />
                        </div>

                        {/* Details Panel */}
                        <div className="w-80 bg-white rounded-lg p-6 overflow-y-auto flex-shrink-0 shadow-xl pointer-events-auto">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">详情</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">提示词</label>
                                    <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded mt-1 leading-relaxed break-words">
                                        {currentList[previewIndex].prompt || '(无提示词)'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase">风格</label>
                                        <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                            {currentList[previewIndex].style}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase">尺寸</label>
                                        <p className="text-sm text-gray-800 mt-1">{currentList[previewIndex].size}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">模型</label>
                                    <p className="text-sm text-gray-800 mt-1 font-mono text-xs">{currentList[previewIndex].modelName || 'Unknown'}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">生成时间</label>
                                    <p className="text-sm text-gray-800 mt-1">
                                        {new Date(currentList[previewIndex].completionDate || '').toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-6 border-t">
                                 <button 
                                    onClick={() => handleToggleItem(currentList[previewIndex].id)}
                                    className={`w-full py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors ${currentSelection.has(currentList[previewIndex].id) ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                 >
                                    <Icons.CheckIcon className={`w-4 h-4 ${currentSelection.has(currentList[previewIndex].id) ? 'opacity-100' : 'opacity-0'}`} />
                                    {currentSelection.has(currentList[previewIndex].id) ? '已选中此图片' : '选中此图片'}
                                 </button>
                            </div>
                        </div>
                    </div>

                    <button onClick={handleClosePreview} className="absolute top-4 right-4 text-white p-2 bg-black/50 hover:bg-black/70 rounded-full z-[60] transition-colors">
                        <Icons.CloseIcon className="w-8 h-8" />
                    </button>
                    
                    <button 
                        onClick={handlePrevPreview} 
                        disabled={previewIndex === 0}
                        className={`absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 rounded-full z-[60] bg-black/50 transition-all ${previewIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/70'}`}
                    >
                        <Icons.ChevronLeftIcon className="w-10 h-10" />
                    </button>

                    <button 
                        onClick={handleNextPreview} 
                        disabled={previewIndex === currentList.length - 1}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 rounded-full z-[60] bg-black/50 transition-all ${previewIndex === currentList.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/70'}`}
                    >
                        <Icons.ChevronRightIcon className="w-10 h-10" />
                    </button>
                </div>
            )}

            <Modal isOpen={isAddPromptModalOpen} onClose={() => setIsAddPromptModalOpen(false)} title="手动添加提示词">
               <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">提示词内容</label>
                        <textarea value={newPromptText} onChange={e => setNewPromptText(e.target.value)} rows={4} className="w-full p-3 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-primary focus:border-primary placeholder-gray-400" placeholder="输入想要生成的画面描述..." />
                        <div className="flex items-center mt-2 space-x-2">
                            <input id="auto-expand-check" type="checkbox" checked={isAutoExpand} onChange={(e) => setIsAutoExpand(e.target.checked)} className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"/>
                            <label htmlFor="auto-expand-check" className="text-sm text-gray-700 cursor-pointer flex items-center">
                                ✨ 启用 AI 智能联想扩展
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">生成数量</label>
                        <input type="number" value={generationCount} onChange={e => setGenerationCount(parseInt(e.target.value, 10) || 1)} min="1" max="50" className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-primary focus:border-primary" />
                    </div>
                    <div className="flex justify-end pt-4 border-t mt-4 gap-2">
                        <button onClick={() => setIsAddPromptModalOpen(false)} disabled={isExpanding} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50">取消</button>
                        <button onClick={handleConfirmAddPrompt} disabled={isExpanding} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover flex items-center disabled:opacity-70 disabled:cursor-not-allowed">
                            {isExpanding ? <><Spinner size="sm" className="mr-2 text-white" /> 正在联想...</> : '确认添加'}
                        </button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isPromptSettingsModalOpen} onClose={() => setIsPromptSettingsModalOpen(false)} title="生图配置设置" maxWidth="4xl">
               <PromptSettingsForm 
                    initialPrompts={aiModelConfig.imageGeneration.presetPrompts || []} 
                    initialActiveIndex={aiModelConfig.imageGeneration.activePresetPromptIndex || 0}
                    initialStyles={generationStyles}
                    initialModelName={aiModelConfig.imageGeneration.modelName}
                    initialDefaultSize={aiModelConfig.imageGeneration.defaultSize || '方形'}
                    availableImageModels={availableModels.image}
                    onSave={(newPrompts, newActiveIndex, newStyles, newModelName, newDefaultSize) => {
                        setAiModelConfig(prev => ({...prev, imageGeneration: {...prev.imageGeneration, presetPrompts: newPrompts, activePresetPromptIndex: newActiveIndex, modelName: newModelName, defaultSize: newDefaultSize}}));
                        setGenerationStyles(newStyles);
                        setIsPromptSettingsModalOpen(false);
                        showToast('设置已保存', 'success');
                    }} 
                    onCancel={() => setIsPromptSettingsModalOpen(false)} 
                />
            </Modal>

            <Modal isOpen={isClearAllModalOpen} onClose={() => setIsClearAllModalOpen(false)} title="确认清空">
                <div className="space-y-4">
                    <p className="text-gray-600">您确定要清空所有待生成的任务吗？此操作不可撤销。</p>
                    <div className="flex justify-end space-x-2 pt-4 border-t">
                        <button onClick={() => setIsClearAllModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">取消</button>
                        <button onClick={handleClearAllTasks} className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger-hover">确认清空</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDeleteConfirmModalOpen} onClose={() => setIsDeleteConfirmModalOpen(false)} title="确认删除">
                <div className="space-y-4">
                    <p className="text-gray-600">您确定要删除选中的 <strong className="text-red-600">{currentSelection.size}</strong> 张图片吗？此操作无法撤销。</p>
                    <div className="flex justify-end space-x-2 pt-4 border-t">
                        <button onClick={() => setIsDeleteConfirmModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">取消</button>
                        <button onClick={confirmDeleteSelected} className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger-hover">确认删除</button>
                    </div>
                </div>
            </Modal>

            {isReviewModalOpen && (
                <ReviewAndEditModal 
                    isOpen={isReviewModalOpen} 
                    onClose={() => setIsReviewModalOpen(false)} 
                    onConfirm={handleConfirmReview} 
                    tasks={uploadTasks}
                    artists={artists} 
                    categories={FIXED_CATEGORIES} 
                    assetTypes={assetTypes} 
                    mode={processMode}
                />
            )}
        </div>
    );
};

const PromptSettingsForm: React.FC<{
    initialPrompts: string[];
    initialActiveIndex: number;
    initialStyles: AIGenerationStyle[];
    initialModelName: string;
    initialDefaultSize: AIGenerationSize;
    availableImageModels: string[];
    onSave: (prompts: string[], activeIndex: number, styles: AIGenerationStyle[], modelName: string, defaultSize: AIGenerationSize) => void;
    onCancel: () => void;
}> = ({ initialPrompts, initialActiveIndex, initialStyles, initialModelName, initialDefaultSize, availableImageModels, onSave, onCancel }) => {
    const [prompts, setPrompts] = useState<string[]>(initialPrompts.length > 0 ? initialPrompts : ['']);
    const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
    const [styles, setStyles] = useState<string>(initialStyles.join(', '));
    const [modelName, setModelName] = useState(initialModelName);
    const [defaultSize, setDefaultSize] = useState<AIGenerationSize>(initialDefaultSize);

    const handleSave = () => {
        const styleArray = styles.split(',').map(s => s.trim()).filter(s => s !== '');
        onSave(prompts.filter(p => p.trim() !== ''), activeIndex, styleArray, modelName, defaultSize);
    };

    const handlePromptChange = (index: number, value: string) => {
        const newPrompts = [...prompts];
        newPrompts[index] = value;
        setPrompts(newPrompts);
    };

    const addPrompt = () => setPrompts([...prompts, '']);
    const removePrompt = (index: number) => {
        const newPrompts = prompts.filter((_, i) => i !== index);
        setPrompts(newPrompts.length ? newPrompts : ['']);
        if (activeIndex >= newPrompts.length) setActiveIndex(Math.max(0, newPrompts.length - 1));
    };

    return (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">默认生图模型</label>
                    <select value={modelName} onChange={(e) => setModelName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                        {availableImageModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">默认生图尺寸</label>
                    <select value={defaultSize} onChange={(e) => setDefaultSize(e.target.value as AIGenerationSize)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                        {generationSizes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">可用风格列表 (逗号分隔)</label>
                <textarea value={styles} onChange={(e) => setStyles(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white" rows={3} />
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">预制提示词模版 (Templates)</label>
                    <button onClick={addPrompt} className="text-sm text-primary hover:underline">+ 添加模版</button>
                </div>
                <div className="space-y-3">
                    {prompts.map((prompt, index) => (
                        <div key={index} className="flex gap-2 items-start">
                            <div className="pt-2">
                                <input type="radio" name="activePrompt" checked={activeIndex === index} onChange={() => setActiveIndex(index)} className="cursor-pointer" title="设为默认" />
                            </div>
                            <textarea 
                                value={prompt} 
                                onChange={(e) => handlePromptChange(index, e.target.value)} 
                                className={`flex-1 p-2 border rounded-md text-sm ${activeIndex === index ? 'border-primary ring-1 ring-primary' : 'border-gray-300'}`}
                                rows={2}
                                placeholder="输入提示词模版，使用 {PROMPT} 和 {STYLE} 作为占位符..."
                            />
                            <button onClick={() => removePrompt(index)} className="p-2 text-gray-400 hover:text-red-500">
                                <Icons.DeleteIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={onCancel} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">取消</button>
                <button onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover">保存设置</button>
            </div>
        </div>
    );
};

const ImportForm: React.FC<{
    config: { type: 'scarce' | 'hot'; terms: SearchTerm[] } | null;
    onConfirm: (terms: SearchTerm[], stylesPerTerm: number, type: 'scarce' | 'hot') => void;
    onCancel: () => void;
}> = ({ config, onConfirm, onCancel }) => {
    const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set<string>());
    const [stylesPerTerm, setStylesPerTerm] = useState(3);

    useEffect(() => {
        if (config?.terms) {
            // Default select top 20 or all if less
            const initialSelection = config.terms.slice(0, 20).map(t => t.term);
            setSelectedTerms(new Set(initialSelection));
        }
    }, [config]);

    if (!config) return null;

    const handleToggle = (term: string) => {
        // Specify the generic type <string> for the Set constructor to ensure it is correctly typed as Set<string>.
        const newSet = new Set<string>(selectedTerms);
        if (newSet.has(term)) newSet.delete(term);
        else newSet.add(term);
        setSelectedTerms(newSet);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedTerms(new Set(config.terms.map(t => t.term)));
        else setSelectedTerms(new Set<string>());
    };

    const handleConfirm = () => {
        // Non-null assertion safe because of early return in component
        const termsToImport = config!.terms.filter(t => selectedTerms.has(t.term));
        onConfirm(termsToImport, stylesPerTerm, config!.type);
    };

    return (
        <div className="space-y-4 max-h-[70vh] flex flex-col">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                <div className="text-sm text-gray-700">
                    <span className="font-semibold">来源:</span> {config.type === 'hot' ? '热搜词条' : '稀缺词条'} (Top 1000)
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">每个词条生成变体数:</label>
                    <input type="number" value={stylesPerTerm} onChange={e => setStylesPerTerm(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 p-1 border rounded text-center" min="1" max="10" />
                </div>
            </div>

            <div className="flex items-center gap-2 py-2 border-b">
                <input type="checkbox" checked={selectedTerms.size === config.terms.length && config.terms.length > 0} onChange={e => handleSelectAll(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm font-semibold text-gray-700">全选 ({selectedTerms.size}/{config.terms.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto border rounded-md">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 sticky top-0">
                        <tr>
                            <th className="p-3 w-10"></th>
                            <th className="p-3">词条 (Term)</th>
                            <th className="p-3">翻译 (Translation)</th>
                            <th className="p-3 text-right">{config.type === 'hot' ? '搜索量' : '稀缺指数'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {config.terms.map(term => (
                            <tr key={term.term} className={`hover:bg-blue-50 cursor-pointer ${selectedTerms.has(term.term) ? 'bg-blue-50' : ''}`} onClick={() => handleToggle(term.term)}>
                                <td className="p-3 text-center">
                                    <input type="checkbox" checked={selectedTerms.has(term.term)} onChange={() => {}} className="pointer-events-none" />
                                </td>
                                <td className="p-3 font-medium text-gray-900">{term.term}</td>
                                <td className="p-3 text-gray-500">{term.translation || '-'}</td>
                                <td className="p-3 text-right text-gray-500 font-mono">{config.type === 'hot' ? term.h : (term.n ? (term.h / term.n).toFixed(2) : '-')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-auto">
                <button onClick={onCancel} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">取消</button>
                <button onClick={handleConfirm} disabled={selectedTerms.size === 0} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:bg-gray-300">
                    导入 {selectedTerms.size * stylesPerTerm} 个任务
                </button>
            </div>
        </div>
    );
};

export default BatchImageGeneration;
