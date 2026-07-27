export interface MenuItem {
  id: string;
  icon: string; // Lucide icon identifier
  title: string;
  description: string;
  category: string;
  status?: string;
  badge?: string;
  actionType?: 'link' | 'folder' | 'system' | 'clipboard' | 'monitor';
  details?: {
    idCode: string;
    type: string;
    status: 'READY' | 'ACTIVE' | 'SYNCING' | 'OFFLINE';
    link: string;
    meta?: Record<string, any>;
  };
}

export interface SystemLog {
  id: string;
  timestamp: string;
  message: string;
  level: 'info' | 'warn' | 'success' | 'error';
}

export interface DownloadTask {
  id: string;
  name: string;
  size: string;
  progress: number;
  speed: string;
  status: 'downloading' | 'completed' | 'paused';
  icon: string;
}

export interface ClipboardItem {
  id: string;
  content: string;
  type: 'text' | 'link' | 'code' | 'image';
  timestamp: string;
  starred?: boolean;
  imageUrl?: string;
  title?: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  bgGradient: string;
  cardBg: string;
  accentColor: string;
  highlightColor: string;
  textColor: string;
  borderStyle: string;
  blurLevel: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: string;
  updatedAt: string;
  children?: FileItem[];
}
