
/**
 * @file Centralized Icon Library (Icons.tsx)
 */
import React from 'react';
import {
    User, BookOpen, Palette, LogOut, Image, Sparkles, Users, Search, Globe, FileText,
    Archive, X, Eye, EyeOff, Edit, Check, Undo2, ShieldCheck, Bell, CreditCard, Trash2,
    Languages, Info, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Download, Filter,
    Plus, Link, Home, Menu, Tag, Minus, Calendar, ChevronsLeft, ChevronsRight, RefreshCw,
    Cpu, Bug, Code2, CloudUpload, type LucideProps
} from 'lucide-react';

export const HomeIcon: React.FC<LucideProps> = (props) => <Home {...props} />;
export const AppLogoIcon: React.FC<any> = (props) => (
    <img 
        src="/Material Library/unnamed.png" 
        alt="Incolor Logo" 
        {...props} 
        className={`${props.className || ''} object-cover`}
    />
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
