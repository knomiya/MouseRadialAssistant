import { MenuItem, ThemeConfig, SystemLog, DownloadTask, ClipboardItem, FileItem } from '../types';

export const initialMenuItems: MenuItem[] = [
  {
    id: 'quick-start',
    icon: 'Rocket',
    title: '快速启动',
    description: '启动常用应用、工具与系统快捷路径',
    category: 'apps',
    details: {
      idCode: 'APP-101',
      type: 'QUICK LAUNCHER',
      status: 'READY',
      link: 'LOCAL EXEC',
    }
  },
  {
    id: 'clipboard',
    icon: 'Copy',
    title: '剪贴板历史',
    description: '多条剪贴板记录、收藏与快速一键复制',
    category: 'clipboard',
    badge: '5 条',
    details: {
      idCode: 'CLIP-002',
      type: 'CLIPBOARD ENGINE',
      status: 'ACTIVE',
      link: 'MEMORY STORE',
    }
  },
  {
    id: 'favorites',
    icon: 'Bookmark',
    title: '常用收藏',
    description: '快速跳转常用网页与本地工作区书签',
    category: 'favorites',
    badge: '6 项',
    details: {
      idCode: 'FAV-009',
      type: 'FAVORITES INDEX',
      status: 'READY',
      link: 'ONLINE',
    }
  },
  {
    id: 'recycle-bin',
    icon: 'Trash2',
    title: '回收站清理',
    description: '临时缓存文件管理与回收站一键还原/清空',
    category: 'system',
    badge: '3 文件',
    details: {
      idCode: 'TRASH-01',
      type: 'STORAGE CLEANER',
      status: 'READY',
      link: 'CACHE TEMP',
    }
  },
  {
    id: 'sys-settings',
    icon: 'Settings',
    title: '偏好配置',
    description: '快捷助手呼出半径、剪贴板上限与快捷菜单配置',
    category: 'config',
    details: {
      idCode: 'CFG-000',
      type: 'ASSISTANT CONFIG',
      status: 'READY',
      link: 'JSON PERSIST',
    }
  }
];

export const presetThemes: ThemeConfig[] = [
  {
    id: 'bold-typography',
    name: '重磅黑白字型 (Bold Typography)',
    bgGradient: 'from-[#F5F5F3] via-[#EAEAEA] to-[#E0E0DC]',
    cardBg: '#FFFFFF',
    accentColor: '#000000',
    highlightColor: '#1A1A1A',
    textColor: '#1A1A1A',
    borderStyle: '2px solid #000000',
    blurLevel: 'backdrop-blur-none',
  },
  {
    id: 'frost-light',
    name: '柔和毛玻璃 (Frost Glass)',
    bgGradient: 'from-sky-100/80 via-indigo-50/60 to-slate-200/90',
    cardBg: 'rgba(255, 255, 255, 0.72)',
    accentColor: '#f59e0b',
    highlightColor: '#3b82f6',
    textColor: '#1e293b',
    borderStyle: '1px solid rgba(255, 255, 255, 0.8)',
    blurLevel: 'backdrop-blur-xl',
  },
  {
    id: 'sao-emerald',
    name: 'SAO 沉浸翡翠 (Emerald UI)',
    bgGradient: 'from-slate-900 via-emerald-950 to-cyan-950',
    cardBg: 'rgba(15, 23, 42, 0.75)',
    accentColor: '#10b981',
    highlightColor: '#06b6d4',
    textColor: '#e2e8f0',
    borderStyle: '1px solid rgba(16, 185, 129, 0.3)',
    blurLevel: 'backdrop-blur-xl',
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克 2077 (Neon)',
    bgGradient: 'from-gray-950 via-purple-950 to-pink-950',
    cardBg: 'rgba(24, 24, 27, 0.85)',
    accentColor: '#f43f5e',
    highlightColor: '#22d3ee',
    textColor: '#f8fafc',
    borderStyle: '1px solid rgba(34, 211, 238, 0.4)',
    blurLevel: 'backdrop-blur-2xl',
  },
  {
    id: 'royal-gold',
    name: '皇家金辉 (Royal Gold)',
    bgGradient: 'from-amber-950/90 via-stone-900 to-slate-950',
    cardBg: 'rgba(28, 25, 23, 0.8)',
    accentColor: '#d97706',
    highlightColor: '#f59e0b',
    textColor: '#fef3c7',
    borderStyle: '1px solid rgba(245, 158, 11, 0.35)',
    blurLevel: 'backdrop-blur-xl',
  },
  {
    id: 'minimalist-dark',
    name: '极简纯深黑 (Minimal Obsidian)',
    bgGradient: 'from-neutral-900 via-neutral-950 to-black',
    cardBg: 'rgba(23, 23, 23, 0.88)',
    accentColor: '#6366f1',
    highlightColor: '#a855f7',
    textColor: '#f5f5f5',
    borderStyle: '1px solid rgba(255, 255, 255, 0.12)',
    blurLevel: 'backdrop-blur-lg',
  }
];

export const initialLogs: SystemLog[] = [
  { id: '1', timestamp: '09:42:17', message: 'SYSTEM ONLINE', level: 'info' },
  { id: '2', timestamp: '09:42:17', message: 'MODULE LINK : STABLE', level: 'info' },
  { id: '3', timestamp: '09:42:18', message: 'USER DATA LOADED', level: 'success' },
  { id: '4', timestamp: '09:42:18', message: 'ALL SYSTEMS READY', level: 'success' },
];

export const initialDownloads: DownloadTask[] = [
  {
    id: 'd1',
    name: 'System_Kernel_Patch_v3.2.iso',
    size: '1.42 GB',
    progress: 78,
    speed: '8.4 MB/s',
    status: 'downloading',
    icon: 'Package',
  },
  {
    id: 'd2',
    name: 'Neural_Graphics_Driver.exe',
    size: '640 MB',
    progress: 100,
    speed: '0 KB/s',
    status: 'completed',
    icon: 'Cpu',
  },
  {
    id: 'd3',
    name: 'HighRes_Wallpaper_Pack.zip',
    size: '320 MB',
    progress: 45,
    speed: '4.1 MB/s',
    status: 'downloading',
    icon: 'Image',
  }
];

export const initialClipboards: ClipboardItem[] = [
  {
    id: 'c-img1',
    content: '桌面UI高保真架构设计草图.png',
    type: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    title: 'UI高保真设计图',
    timestamp: '09:45:10',
    starred: true,
  },
  {
    id: 'c1',
    content: 'https://ais.studio/build/radial-assistant',
    title: 'AI Studio 径向助手控制台',
    type: 'link',
    timestamp: '09:41:02',
    starred: true,
  },
  {
    id: 'c-img2',
    content: '品牌渐变视觉概念设计_2026.jpg',
    type: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=600&q=80',
    title: '极光渐变图层概念',
    timestamp: '09:39:20',
    starred: false,
  },
  {
    id: 'c2',
    content: 'npm install @google/genai lucide-react motion',
    type: 'code',
    timestamp: '09:38:15',
    starred: true,
  },
  {
    id: 'c3',
    content: '主色调: #f59e0b | 强调色: #d97706 | 渐变: from-amber-400 to-amber-600',
    type: 'text',
    timestamp: '09:35:20',
    starred: true,
  },
  {
    id: 'c-link2',
    content: 'https://tailwindcss.com/docs/utility-first',
    title: 'Tailwind CSS 3.4 实用类设计指南',
    type: 'link',
    timestamp: '09:32:10',
    starred: false,
  },
  {
    id: 'c4',
    content: '项目进度汇报：所有高保真交互模块已接入，径向助手正常运行。',
    type: 'text',
    timestamp: '09:30:44',
    starred: false,
  },
  {
    id: 'c5',
    content: 'SELECT * FROM users WHERE status = "active" ORDER BY created_at DESC;',
    type: 'code',
    timestamp: '09:12:00',
    starred: false,
  },
];

export const initialFiles: FileItem[] = [
  {
    id: 'f1',
    name: '工作文档',
    type: 'folder',
    updatedAt: '2026-07-23 09:30',
    children: [
      { id: 'f1-1', name: '系统设计规格书.pdf', type: 'file', size: '2.4 MB', updatedAt: '2026-07-22' },
      { id: 'f1-2', name: 'UI_组件库规范.figma', type: 'file', size: '18.1 MB', updatedAt: '2026-07-21' },
    ]
  },
  {
    id: 'f2',
    name: '媒体与资源',
    type: 'folder',
    updatedAt: '2026-07-23 08:15',
    children: [
      { id: 'f2-1', name: 'Alpine_Misty_Background.jpg', type: 'file', size: '4.8 MB', updatedAt: '2026-07-23' },
      { id: 'f2-2', name: 'Icon_Set_Vector.svg', type: 'file', size: '1.1 MB', updatedAt: '2026-07-20' },
    ]
  },
  {
    id: 'f3',
    name: '配置文件_backup.json',
    type: 'file',
    size: '12 KB',
    updatedAt: '2026-07-23 09:40'
  }
];
