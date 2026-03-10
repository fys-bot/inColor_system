
/**
 * @file Centralized Icon Library (Icons.tsx)
 */
import React from 'react';
import {
    User, BookOpen, Palette, LogOut, Image, Sparkles, Users, Search, Globe, FileText,
    Archive, X, Eye, EyeOff, Edit, Check, Undo2, ShieldCheck, Bell, CreditCard, Trash2,
    Languages, Info, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Download, Filter,
    Plus, Link, Home, Menu, Tag, Minus, Calendar, ChevronsLeft, ChevronsRight, RefreshCw,
    Cpu, Bug, Code2, CloudUpload, Heart, type LucideProps
} from 'lucide-react';

export const HomeIcon: React.FC<LucideProps> = (props) => <Home {...props} />;
export const AppLogoIcon: React.FC<any> = (props) => (
    <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        className={props.className || ''}
    >
        {/* Background Circle */}
        <circle cx="50" cy="50" r="48" fill="url(#gradient1)" />
        
        {/* Paint Palette Shape */}
        <path 
            d="M50 25C36.2 25 25 36.2 25 50C25 58.5 29.5 66 36.5 70.5C38 71.5 40 71 40.5 69.3C41.5 66.5 43 62 46 62C49.5 62 50.5 65.5 50.5 68C50.5 71 48.5 73 46 73C44.5 73 43.5 72.5 42.5 71.5C41.8 70.8 40.7 70.8 40 71.5C39.3 72.2 39.3 73.3 40 74C41.8 75.8 44.2 77 47 77C51.4 77 55 73.4 55 69C55 63.5 51.5 58 46 58C44.5 58 43.2 58.8 42.3 60C41.8 60.8 41.5 61.7 41.3 62.7C35.5 58.5 32 54.5 32 50C32 40.1 40.1 32 50 32C59.9 32 68 40.1 68 50C68 54.5 64.5 58.5 58.7 62.7C58.5 61.7 58.2 60.8 57.7 60C56.8 58.8 55.5 58 54 58C48.5 58 45 63.5 45 69C45 73.4 48.6 77 53 77C55.8 77 58.2 75.8 60 74C60.7 73.3 60.7 72.2 60 71.5C59.3 70.8 58.2 70.8 57.5 71.5C56.5 72.5 55.5 73 54 73C51.5 73 49.5 71 49.5 68C49.5 65.5 50.5 62 54 62C57 62 58.5 66.5 59.5 69.3C60 71 62 71.5 63.5 70.5C70.5 66 75 58.5 75 50C75 36.2 63.8 25 50 25Z" 
            fill="white" 
            opacity="0.95"
        />
        
        {/* Color Dots on Palette */}
        <circle cx="42" cy="42" r="4.5" fill="#FF6B6B" />
        <circle cx="58" cy="42" r="4.5" fill="#4ECDC4" />
        <circle cx="50" cy="50" r="4.5" fill="#FFE66D" />
        <circle cx="42" cy="58" r="4.5" fill="#A8E6CF" />
        <circle cx="58" cy="58" r="4.5" fill="#C7CEEA" />
        
        {/* Gradient Definitions */}
        <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#667eea" />
                <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
        </defs>
    </svg>
);
export const MenuIcon: React.FC<LucideProps> = (props) => <Menu {...props} />;
export const LogoutIcon: React.FC<LucideProps> = (props) => <LogOut {...props} />;
export const CloseIcon: React.FC<LucideProps> = (props) => <X {...props} />;

export const AssetIcon: React.FC<LucideProps> = (props) => <Image {...props} />;
export const AIGenerateIcon: React.FC<LucideProps> = (props) => <Sparkles {...props} />;
export const CommunityIcon: React.FC<LucideProps> = (props) => <Users {...props} />;
export const SearchIcon: React.FC<LucideProps> = (props) => <Search {...props} />;
export const FileArchiveIcon: React.FC<LucideProps> = (props) => <Archive {...props} />;
export const UserIcon: React.FC<LucideProps> = (props) => <User {...props} />;
export const CreditCardIcon: React.FC<LucideProps> = (props) => <CreditCard {...props} />;

export const EyeIcon: React.FC<LucideProps> = (props) => <Eye {...props} />;
export const EyeOffIcon: React.FC<LucideProps> = (props) => <EyeOff {...props} />;
export const EditIcon: React.FC<LucideProps> = (props) => <Edit {...props} />;
export const CheckIcon: React.FC<LucideProps> = (props) => <Check {...props} />;
export const RevertIcon: React.FC<LucideProps> = (props) => <Undo2 {...props} />;
export const ShieldCheckIcon: React.FC<LucideProps> = (props) => <ShieldCheck {...props} />;
export const DeleteIcon: React.FC<LucideProps> = (props) => <Trash2 {...props} />;
export const TrashIcon: React.FC<LucideProps> = (props) => <Trash2 {...props} />;
export const TranslateIcon: React.FC<LucideProps> = (props) => <Languages {...props} />;
export const DownloadIcon: React.FC<LucideProps> = (props) => <Download {...props} />;
export const FilterIcon: React.FC<LucideProps> = (props) => <Filter {...props} />;
export const PlusIcon: React.FC<LucideProps> = (props) => <Plus {...props} />;
export const MinusIcon: React.FC<LucideProps> = (props) => <Minus {...props} />;
export const RefreshCwIcon: React.FC<LucideProps> = (props) => <RefreshCw {...props} />;
export const RefreshIcon: React.FC<LucideProps> = (props) => <RefreshCw {...props} />;
export const LinkIcon: React.FC<LucideProps> = (props) => <Link {...props} />;
export const CloudUploadIcon: React.FC<LucideProps> = (props) => <CloudUpload {...props} />;

export const InfoIcon: React.FC<LucideProps> = (props) => <Info {...props} />;
export const BellIcon: React.FC<LucideProps> = (props) => <Bell {...props} />;
export const TagIcon: React.FC<LucideProps> = (props) => <Tag {...props} />;
export const DocumentTextIcon: React.FC<LucideProps> = (props) => <FileText {...props} />;
export const DocumentationIcon: React.FC<LucideProps> = (props) => <FileText {...props} />;
export const BookOpenIcon: React.FC<LucideProps> = (props) => <BookOpen {...props} />;
export const PaletteIcon: React.FC<LucideProps> = (props) => <Palette {...props} />;
export const CalendarIcon: React.FC<LucideProps> = (props) => <Calendar {...props} />;
export const SparklesIcon: React.FC<LucideProps> = (props) => <Sparkles {...props} />;

export const ChevronLeftIcon: React.FC<LucideProps> = (props) => <ChevronLeft {...props} />;
export const ChevronRightIcon: React.FC<LucideProps> = (props) => <ChevronRight {...props} />;
export const ChevronUpIcon: React.FC<LucideProps> = (props) => <ChevronUp {...props} />;
export const ChevronDownIcon: React.FC<LucideProps> = (props) => <ChevronDown {...props} />;
export const ChevronsLeftIcon: React.FC<LucideProps> = (props) => <ChevronsLeft {...props} />;
export const ChevronsRightIcon: React.FC<LucideProps> = (props) => <ChevronsRight {...props} />;

export const AIModelIcon: React.FC<LucideProps> = (props) => <Cpu {...props} />;
export const BugIcon: React.FC<LucideProps> = (props) => <Bug {...props} />;
export const CodeIcon: React.FC<LucideProps> = (props) => <Code2 {...props} />;
export const HeartIcon: React.FC<LucideProps> = (props) => <Heart {...props} />;
