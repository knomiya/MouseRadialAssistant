import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { MenuItem, ClipboardItem } from '../types';
import {
  X,
  Cpu,
  HardDrive,
  Trash2,
  Keyboard,
  Settings,
  Edit2,
  Play,
  Save,
  Plus,
  FolderOpen,
  Wifi,
  ArrowUp,
  ArrowDown,
  Globe,
  ExternalLink,
  Layers,
  Clock,
  Flame,
  Gamepad2,
  Power,
  Sun,
  Moon,
  GripVertical,
} from 'lucide-react';

interface AppConfig {
  name: string;
  path: string;
  app_type?: string;
  browser?: string;
  args?: string;
}

interface UserConfig {
  summon_key: { Mouse?: number; Keyboard?: string };
  apps: AppConfig[];
  radius: number;
  node_size?: number;
  card_gap?: number;
  max_clipboard: number;
  visible_monitors?: string[];
  enabled_modules?: string[];
  theme?: string;
  monitor_order?: string[];
  window_click_action?: string;
  hotkey_whitelist?: string[];
  hold_ms?: number;
}


interface WindowItem {
  hwnd: number;
  title: string;
}

interface DetailCardProps {
  item: MenuItem;
  clipboards: ClipboardItem[];
  onCloseCard: () => void;
  onRadiusChange?: (r: number) => void;
  onNodeSizeChange?: (s: number) => void;
  onCardGapChange?: (g: number) => void;
  onConfigReload?: () => void;
  onLaunchApp?: (name: string) => void;
}

export const DetailCard: React.FC<DetailCardProps> = ({
  item,
  clipboards,
  onCloseCard,
  onRadiusChange,
  onNodeSizeChange,
  onCardGapChange,
  onConfigReload,
  onLaunchApp,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 0,
    mem: 0,
    memText: '0 GB',
    upload: '0 KB/s',
    download: '0 KB/s',
    cpuTemp: 42,
    gpuTemp: 45,
    uptimeText: '0 小时',
  });

  const [openWindows, setOpenWindows] = useState<WindowItem[]>([]);
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [currentKeyName, setCurrentKeyName] = useState<string>('鼠标侧下键 (MouseButton 4)');
  const [isRecording, setIsRecording] = useState(false);
  const [isAutoStart, setIsAutoStart] = useState<boolean>(false);

  // Settings tab navigation state
  const [activeTab, setActiveTab] = useState<'hotkey' | 'modules' | 'appearance' | 'clipboard' | 'launcher' | 'monitors' | 'windows'>('hotkey');
  const [clipFilter, setClipFilter] = useState<'all' | 'text' | 'link' | 'image'>('all');

  // Editing quick launch items state
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPath, setEditPath] = useState('');
  const [editAppType, setEditAppType] = useState<'app' | 'web'>('app');
  const [editBrowser, setEditBrowser] = useState<string>('default');
  const [editArgs, setEditArgs] = useState<string>('');
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Drag and drop state for module & monitor reordering
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [draggedMonitorIdx, setDraggedMonitorIdx] = useState<number | null>(null);

  const launcherContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUserConfig();
    fetchAutoStartStatus();
    if (item.id === 'window-switch') {
      fetchOpenWindows();
    }
  }, [item.id]);

  const fetchUserConfig = () => {
    invoke<UserConfig>('get_user_config')
      .then((cfg) => {
        setUserConfig(cfg);
        if (onRadiusChange) {
          onRadiusChange(cfg.radius);
        }
        if (onNodeSizeChange && cfg.node_size) {
          onNodeSizeChange(cfg.node_size);
        }
        if (onCardGapChange && cfg.card_gap !== undefined) {
          onCardGapChange(cfg.card_gap);
        }
      })
      .catch(console.error);

    invoke<[string, string]>('get_current_summon_key')
      .then(([name]) => {
        setCurrentKeyName(name);
      })
      .catch(console.error);
  };

  const fetchAutoStartStatus = () => {
    invoke<boolean>('get_auto_start')
      .then((enabled) => setIsAutoStart(enabled))
      .catch(console.error);
  };

  const handleToggleAutoStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsAutoStart(checked);
    invoke('set_auto_start', { enable: checked }).catch(console.error);
  };

  const fetchOpenWindows = () => {
    invoke<WindowItem[]>('get_open_windows')
      .then((wins) => {
        setOpenWindows(wins);
      })
      .catch(console.error);
  };

  // Stats timer for sys-monitor
  useEffect(() => {
    if (item.id !== 'sys-monitor') return;

    let lastNet = { up: 0, down: 0 };
    const fetchStats = () => {
      invoke<[number, number, number, number, number, number, number]>('get_system_stats')
        .then(([cpu, mem, upKb, downKb, cpuTemp, gpuTemp, uptimeSecs]) => {
          const usedMemGb = ((mem / 100.0) * 16.0).toFixed(1);

          const upDiff = Math.max(0, upKb - lastNet.up);
          const downDiff = Math.max(0, downKb - lastNet.down);
          lastNet = { up: upKb, down: downKb };

          const formatSpeed = (speedKb: number) => {
            if (speedKb > 1024) {
              return `${(speedKb / 1024).toFixed(1)} MB/s`;
            }
            return `${Math.round(speedKb)} KB/s`;
          };

          const hours = Math.floor(uptimeSecs / 3600);
          const mins = Math.floor((uptimeSecs % 3600) / 60);

          setSystemMetrics({
            cpu: Math.round(cpu),
            mem: Math.round(mem),
            memText: `${usedMemGb} GB`,
            upload: formatSpeed(upDiff),
            download: formatSpeed(downDiff),
            cpuTemp: Math.round(cpuTemp),
            gpuTemp: Math.round(gpuTemp),
            uptimeText: `${hours} 小时 ${mins} 分钟`,
          });
        })
        .catch(console.error);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 1000);
    return () => clearInterval(interval);
  }, [item.id]);

  useEffect(() => {
    if (item.id !== 'sys-settings') return;

    const unlistenPromise = listen<string>('key_recorded', (event) => {
      setCurrentKeyName(event.payload);
      setIsRecording(false);
      fetchUserConfig();
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [item.id]);

  const handleCopy = (text: string, id: string) => {
    invoke('write_clipboard', { content: text })
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1800);
      })
      .catch(console.error);
  };

  const handleOpenWeb = (url: string) => {
    if (onLaunchApp) {
      onLaunchApp(url);
    } else {
      invoke('hide_window').catch(console.error);
      onCloseCard();
    }
    invoke('launch_app', { path: url }).catch(console.error);
  };

  const handleRunApp = (app: AppConfig) => {
    if (!app.path || !app.path.trim()) {
      setLaunchError('路径或网址为空！');
      setTimeout(() => setLaunchError(null), 3000);
      return;
    }

    if (onLaunchApp) {
      onLaunchApp(app.name || app.path);
    } else {
      invoke('hide_window').catch(console.error);
      onCloseCard();
    }

    invoke('launch_app', {
      path: app.path,
      args: app.args || '',
    }).catch((err) => {
      console.error('Launch Error:', err);
    });
  };

  const handleSwitchWindow = (hwnd: number) => {
    invoke('switch_to_window', { hwnd })
      .then(() => {
        invoke('hide_window').catch(console.error);
        onCloseCard();
      })
      .catch(console.error);
  };

  const handleCloseWindow = (hwnd: number) => {
    invoke('close_window_by_hwnd', { hwnd })
      .then(() => {
        setOpenWindows((prev) => prev.filter((w) => w.hwnd !== hwnd));
      })
      .catch(console.error);
  };

  const handleRowClickWindow = (hwnd: number) => {
    const action = userConfig?.window_click_action || 'switch';
    if (action === 'close') {
      handleCloseWindow(hwnd);
    } else {
      handleSwitchWindow(hwnd);
    }
  };

  const handleStartEdit = (idx: number, app: AppConfig) => {
    setEditingIdx(idx);
    setEditName(app.name);
    setEditPath(app.path);
    setEditAppType((app.app_type as any) || (app.path.startsWith('http') ? 'web' : 'app'));
    setEditBrowser(app.browser || 'default');
    setEditArgs(app.args || '');
    setTimeout(() => {
      launcherContainerRef.current?.scrollTo({ top: 9999, behavior: 'smooth' });
    }, 100);
  };

  const handleSaveAppConfig = (idx: number) => {
    if (!userConfig) return;
    const newApps = [...userConfig.apps];
    newApps[idx] = {
      name: editName,
      path: editPath,
      app_type: editAppType,
      browser: editBrowser,
      args: editArgs,
    };
    const newCfg = { ...userConfig, apps: newApps };

    invoke('save_full_config', { config: newCfg })
      .then(() => {
        setUserConfig(newCfg);
        setEditingIdx(null);
      })
      .catch(console.error);
  };

  const handleAddAppConfig = () => {
    if (!userConfig) return;
    const newApps = [
      ...userConfig.apps,
      { name: `自定义应用 ${userConfig.apps.length + 1}`, path: '', app_type: 'app', browser: 'default', args: '' },
    ];
    const newCfg = { ...userConfig, apps: newApps };

    invoke('save_full_config', { config: newCfg })
      .then(() => {
        setUserConfig(newCfg);
        handleStartEdit(newApps.length - 1, newApps[newApps.length - 1]);
      })
      .catch(console.error);
  };

  const handleDeleteAppConfig = (idx: number) => {
    if (!userConfig) return;
    const newApps = userConfig.apps.filter((_, i) => i !== idx);
    const newCfg = { ...userConfig, apps: newApps };

    invoke('save_full_config', { config: newCfg })
      .then(() => {
        setUserConfig(newCfg);
        if (editingIdx === idx) setEditingIdx(null);
      })
      .catch(console.error);
  };

  const handleNativeFilePicker = () => {
    invoke<string>('select_exe_file')
      .then((path) => {
        if (path && path.trim()) {
          setEditPath(path);
          const fileName = path.split('\\').pop()?.split('/').pop()?.replace(/\.exe$/i, '');
          if (fileName && (!editName || editName.startsWith('自定义应用'))) {
            setEditName(fileName);
          }
        }
      })
      .catch(console.error);
  };

  const handleUpdatePreference = (field: keyof UserConfig, val: any) => {
    if (!userConfig) return;
    const newCfg = { ...userConfig, [field]: val };
    setUserConfig(newCfg);
    if (field === 'radius' && onRadiusChange) {
      onRadiusChange(val);
    }
    if (field === 'node_size' && onNodeSizeChange) {
      onNodeSizeChange(val);
    }
    if (field === 'card_gap' && onCardGapChange) {
      onCardGapChange(val);
    }
    invoke('save_full_config', { config: newCfg })
      .then(() => {
        if (onConfigReload) onConfigReload();
      })
      .catch(console.error);
  };

  const handleToggleModule = (modId: string) => {
    if (!userConfig) return;
    const currentMods = userConfig.enabled_modules || ['quick-start', 'clipboard', 'window-switch', 'sys-monitor'];
    const exists = currentMods.includes(modId);
    const updated = exists ? currentMods.filter(m => m !== modId) : [...currentMods, modId];
    handleUpdatePreference('enabled_modules', updated);
  };

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
  };

  const handleDrop = (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx || !userConfig) return;
    const currentMods = [...(userConfig.enabled_modules || ['quick-start', 'clipboard', 'window-switch', 'sys-monitor'])];
    const draggedItem = currentMods[draggedIdx];
    currentMods.splice(draggedIdx, 1);
    currentMods.splice(idx, 0, draggedItem);
    setDraggedIdx(null);
    handleUpdatePreference('enabled_modules', currentMods);
  };

  const handleMonitorDragStart = (idx: number) => {
    setDraggedMonitorIdx(idx);
  };

  const handleMonitorDrop = (idx: number) => {
    if (draggedMonitorIdx === null || draggedMonitorIdx === idx || !userConfig) return;
    const currentOrder = [...(userConfig.monitor_order || ['cpu', 'mem', 'net', 'cpu_temp', 'gpu_temp', 'uptime'])];
    const draggedItem = currentOrder[draggedMonitorIdx];
    currentOrder.splice(draggedMonitorIdx, 1);
    currentOrder.splice(idx, 0, draggedItem);
    setDraggedMonitorIdx(null);
    handleUpdatePreference('monitor_order', currentOrder);
  };

  const handleToggleMonitorItem = (monKey: string) => {
    if (!userConfig) return;
    const currentList = userConfig.visible_monitors || ['cpu', 'mem', 'net', 'cpu_temp', 'gpu_temp', 'uptime'];
    const exists = currentList.includes(monKey);
    const updated = exists ? currentList.filter(k => k !== monKey) : [...currentList, monKey];
    handleUpdatePreference('visible_monitors', updated);
  };

  const handleStartRecordKey = () => {
    setIsRecording(true);
    invoke('start_recording_key')
      .catch((err) => {
        console.error(err);
        setIsRecording(false);
      });
  };

  const validLaunchApps = userConfig?.apps.filter(app => app.path && app.path.trim()) || [];

  const filteredClipboards = clipboards.filter(clip => {
    if (clipFilter === 'all') return true;
    if (clipFilter === 'image') return clip.content.startsWith('data:image/');
    if (clipFilter === 'link') return clip.type === 'link';
    if (clipFilter === 'text') return clip.type === 'text' && !clip.content.startsWith('data:image/');
    return true;
  });

  const visibleMonitors = userConfig?.visible_monitors || ['cpu', 'mem', 'net', 'cpu_temp', 'gpu_temp', 'uptime'];
  const monitorOrder = userConfig?.monitor_order || ['cpu', 'mem', 'net', 'cpu_temp', 'gpu_temp', 'uptime'];
  const enabledMods = userConfig?.enabled_modules || ['quick-start', 'clipboard', 'window-switch', 'sys-monitor'];

  const isDark = userConfig?.theme === 'dark';

  const moduleNamesMap: Record<string, string> = {
    'quick-start': '快捷启动应用',
    'clipboard': '剪贴板历史记录',
    'window-switch': '活动窗口切换',
    'sys-monitor': '系统监控视图',
  };

  const monitorNamesMap: Record<string, string> = {
    'cpu': 'CPU 占用率',
    'mem': '内存使用',
    'net': '实时网络网速',
    'cpu_temp': 'CPU 核心温度',
    'gpu_temp': 'GPU 显卡温度',
    'uptime': '连续运行时间',
  };

  const renderMonitorBlock = (key: string) => {
    if (!visibleMonitors.includes(key)) return null;

    if (key === 'cpu') {
      return (
        <div key="cpu" className="flex flex-col gap-1.5">
          <div className={`flex justify-between text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-indigo-500" /> CPU 占用率</span>
            <span className="font-mono">{systemMetrics.cpu}%</span>
          </div>
          <div className={`w-full h-2 rounded-full overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200/50'}`}>
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${systemMetrics.cpu}%` }} />
          </div>
        </div>
      );
    }
    if (key === 'mem') {
      return (
        <div key="mem" className="flex flex-col gap-1.5">
          <div className={`flex justify-between text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            <span className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5 text-emerald-500" /> 内存使用</span>
            <span className="font-mono">{systemMetrics.memText} ({systemMetrics.mem}%)</span>
          </div>
          <div className={`w-full h-2 rounded-full overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200/50'}`}>
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${systemMetrics.mem}%` }} />
          </div>
        </div>
      );
    }
    if (key === 'net') {
      return (
        <div key="net" className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50/70 border-slate-100 text-slate-600'}`}>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>实时网速</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="flex items-center gap-0.5 text-emerald-500"><ArrowUp className="w-3 h-3" /> {systemMetrics.upload}</span>
            <span className="flex items-center gap-0.5 text-indigo-400"><ArrowDown className="w-3 h-3" /> {systemMetrics.download}</span>
          </div>
        </div>
      );
    }
    if (key === 'cpu_temp') {
      return (
        <div key="cpu_temp" className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50/70 border-slate-100 text-slate-600'}`}>
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>CPU 核心温度</span>
          </div>
          <span className="font-mono text-[11px] font-bold text-rose-500">{systemMetrics.cpuTemp} °C</span>
        </div>
      );
    }
    if (key === 'gpu_temp') {
      return (
        <div key="gpu_temp" className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50/70 border-slate-100 text-slate-600'}`}>
          <div className="flex items-center gap-1.5">
            <Gamepad2 className="w-4 h-4 text-amber-500" />
            <span>GPU 显卡温度</span>
          </div>
          <span className="font-mono text-[11px] font-bold text-amber-500">{systemMetrics.gpuTemp} °C</span>
        </div>
      );
    }
    if (key === 'uptime') {
      return (
        <div key="uptime" className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50/70 border-slate-100 text-slate-600'}`}>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>系统连续运行</span>
          </div>
          <span className="font-mono text-[11px]">{systemMetrics.uptimeText}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`w-[375px] max-w-[92vw] rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.18)] select-none flex flex-col justify-between overflow-hidden relative transition-colors ${
        isDark
          ? 'bg-slate-900/95 text-slate-100 backdrop-blur-2xl'
          : 'bg-white/90 text-slate-800 backdrop-blur-xl'
      }`}
    >
      {/* Header Bar */}
      <div
        className={`px-5 py-3.5 flex items-center justify-between rounded-t-2xl transition-colors ${
          isDark
            ? 'bg-white text-slate-900'
            : 'bg-slate-900 text-white'
        }`}
      >
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
          <span className="text-xs font-black tracking-wider uppercase font-mono">
            {item.title}
          </span>
        </div>
        {/* Red Hover Close Button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCloseCard(); }}
          title="关闭"
          className="p-1 rounded-full text-slate-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[170px] max-h-[320px] overflow-y-auto p-4 pr-3">
        {/* 1. Quick Launch */}
        {item.id === 'quick-start' && (
          <div className="flex flex-col gap-2">
            {launchError && (
              <div className="text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-600 px-2.5 py-1.5 rounded-lg mb-1 font-bold whitespace-nowrap">
                {launchError}
              </div>
            )}
            
            {validLaunchApps.length > 0 ? (
              validLaunchApps.map((app, idx) => {
                const isWeb = app.app_type === 'web' || app.path.startsWith('http');
                return (
                  <div
                    key={idx}
                    onClick={() => handleRunApp(app)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer group ${
                      isDark
                        ? 'bg-slate-800/60 border-slate-700/60 hover:bg-amber-500/20 hover:border-amber-500/40'
                        : 'bg-slate-50/70 border-slate-100 hover:bg-amber-500/10 hover:border-amber-500/30'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isWeb ? <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" /> : <Play className="w-3.5 h-3.5 text-amber-500 fill-current shrink-0" />}
                        <span className={`text-xs font-bold truncate transition-colors ${isDark ? 'text-slate-200 group-hover:text-amber-400' : 'text-slate-700 group-hover:text-amber-700'}`}>
                          {app.name || '未命名应用'}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono truncate">{app.path}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all whitespace-nowrap flex items-center gap-1">
                      {isWeb ? <ExternalLink className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                暂无配置的快捷启动项。<br />请在偏好设置中点击“添加”进行编辑！
              </div>
            )}
          </div>
        )}

        {/* 2. Clipboard */}
        {item.id === 'clipboard' && (
          <div className="flex flex-col gap-3">
            <div className={`flex border-b pb-1.5 text-[10px] font-bold gap-2 ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setClipFilter('all'); }}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${clipFilter === 'all' ? 'bg-amber-500 text-slate-950 font-black' : 'hover:bg-slate-500/10 text-slate-400'}`}
              >
                全部 ({clipboards.length})
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setClipFilter('text'); }}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${clipFilter === 'text' ? 'bg-amber-500 text-slate-950 font-black' : 'hover:bg-slate-500/10 text-slate-400'}`}
              >
                文本
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setClipFilter('link'); }}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${clipFilter === 'link' ? 'bg-amber-500 text-slate-950 font-black' : 'hover:bg-slate-500/10 text-slate-400'}`}
              >
                链接
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setClipFilter('image'); }}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${clipFilter === 'image' ? 'bg-amber-500 text-slate-950 font-black' : 'hover:bg-slate-500/10 text-slate-400'}`}
              >
                图片
              </button>
            </div>

            {filteredClipboards.length > 0 ? (
              filteredClipboards.map((clip) => {
                const isCopied = copiedId === clip.id;
                const isImage = clip.content.startsWith('data:image/');
                const isLink = clip.type === 'link';
                return (
                  <div
                    key={clip.id}
                    className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all group ${
                      isDark ? 'bg-slate-800/60 border-slate-700/60 hover:border-amber-500/40' : 'bg-slate-50/70 border-slate-100 hover:border-amber-500/20'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[8px] text-slate-400 font-mono">
                      <span className={`px-1.5 py-0.5 rounded border font-bold uppercase ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-100 border-slate-200/50 text-slate-500'}`}>
                        {isImage ? '图片' : clip.type}
                      </span>
                      <span>{clip.timestamp}</span>
                    </div>

                    {isImage ? (
                      <div
                        onClick={() => handleCopy(clip.content, clip.id)}
                        className="py-1 flex justify-center cursor-pointer"
                      >
                        <img
                          src={clip.content}
                          alt="剪贴板截图"
                          className="max-h-32 max-w-full rounded border border-slate-700 object-contain shadow-sm"
                        />
                      </div>
                    ) : (
                      <div className={`text-xs font-bold font-mono line-clamp-2 break-all pt-1 leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {clip.content}
                      </div>
                    )}

                    <div className={`flex justify-end text-[9px] font-bold pt-1 border-t mt-1 ${isDark ? 'border-slate-700/80' : 'border-slate-100'}`}>
                      {isLink ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenWeb(clip.content); }}
                          className="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500 text-sky-500 hover:text-white border border-sky-500/20 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-2.5 h-2.5" /> 打开网页
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleCopy(clip.content, clip.id); }}
                          className="text-amber-500 hover:underline cursor-pointer"
                        >
                          {isCopied ? '已复制 ✔' : '一键复制'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                暂无符合筛选条件的剪贴记录。<br />按 Ctrl+C 复制或 Win+Shift+S 截图试试！
              </div>
            )}
          </div>
        )}

        {/* 3. Window Switcher Panel */}
        {item.id === 'window-switch' && (
          <div className="flex flex-col gap-2">
            <div className={`flex justify-between items-center text-[10px] text-slate-400 font-mono mb-1 border-b pb-1 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span>活动桌面窗口 ({openWindows.length})</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fetchOpenWindows(); }}
                className="text-amber-500 hover:underline font-bold cursor-pointer"
              >
                刷新列表
              </button>
            </div>
            {openWindows.length > 0 ? (
              openWindows.map((win) => (
                <div
                  key={win.hwnd}
                  onClick={() => handleRowClickWindow(win.hwnd)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer group ${
                    isDark ? 'bg-slate-800/60 border-slate-700/60 hover:bg-amber-500/20' : 'bg-slate-50/70 border-slate-100 hover:bg-amber-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Layers className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 shrink-0" />
                    <span className={`text-xs font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{win.title}</span>
                  </div>

                  {/* Explicit Switch & Close Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwitchWindow(win.hwnd);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-slate-950 transition-all cursor-pointer"
                    >
                      切换 {'->'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseWindow(win.hwnd);
                      }}
                      title="关闭该窗口"
                      className="p-1 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                暂无发现活动的桌面应用窗口。
              </div>
            )}
          </div>
        )}

        {/* 4. Rich System Monitor */}
        {item.id === 'sys-monitor' && (
          <div className="flex flex-col gap-3">
            {monitorOrder.map(key => renderMonitorBlock(key))}
          </div>
        )}

        {/* 5. Preferences Settings */}
        {item.id === 'sys-settings' && userConfig && (
          <div className="flex flex-col gap-3">
            {/* Dynamic Tabs */}
            <div className={`flex border-b pb-1.5 mb-2 text-[10px] uppercase font-bold tracking-wider whitespace-nowrap overflow-x-auto gap-1 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveTab('hotkey'); }}
                className={`pb-1 px-1.5 transition-all border-b-2 ${
                  activeTab === 'hotkey' ? 'border-amber-500 text-amber-500 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                软件设置
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveTab('modules'); }}
                className={`pb-1 px-1.5 transition-all border-b-2 ${
                  activeTab === 'modules' ? 'border-amber-500 text-amber-500 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                功能导航
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveTab('appearance'); }}
                className={`pb-1 px-1.5 transition-all border-b-2 ${
                  activeTab === 'appearance' ? 'border-amber-500 text-amber-500 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                外观样式
              </button>

              {enabledMods.includes('window-switch') && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveTab('windows'); }}
                  className={`pb-1 px-1.5 transition-all border-b-2 ${
                    activeTab === 'windows' ? 'border-amber-500 text-amber-500 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  活动窗口
                </button>
              )}

              {enabledMods.includes('clipboard') && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveTab('clipboard'); }}
                  className={`pb-1 px-1.5 transition-all border-b-2 ${
                    activeTab === 'clipboard' ? 'border-amber-500 text-amber-500 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  剪贴板设置
                </button>
              )}

              {enabledMods.includes('quick-start') && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveTab('launcher'); }}
                  className={`pb-1 px-1.5 transition-all border-b-2 ${
                    activeTab === 'launcher' ? 'border-amber-500 text-amber-500 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  应用启动
                </button>
              )}

              {enabledMods.includes('sys-monitor') && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveTab('monitors'); }}
                  className={`pb-1 px-1.5 transition-all border-b-2 ${
                    activeTab === 'monitors' ? 'border-amber-500 text-amber-500 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  监控视图
                </button>
              )}
            </div>

            {/* TAB 1: Hotkey & Auto Start */}
            {activeTab === 'hotkey' && (
              <div className="flex flex-col gap-3 py-1">
                <div className="flex flex-col gap-2.5">
                  <span className="text-[9px] font-bold text-slate-400 font-mono whitespace-nowrap">全局快捷热键</span>
                  <div className={`p-3 rounded-xl border flex flex-col gap-3 ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div className="flex justify-between items-center text-xs whitespace-nowrap gap-2">
                      <span className="text-slate-400 shrink-0">当前唤起按键:</span>
                      <span className="font-bold text-amber-500 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25 truncate">
                        {currentKeyName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleStartRecordKey(); }}
                      disabled={isRecording}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 border whitespace-nowrap ${
                        isRecording
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse cursor-wait'
                          : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                      {isRecording ? '录入中，请按按键...' : '修改唤起按键'}
                    </button>
                  </div>
                </div>

                {/* App Whitelist: suppress hotkey when these processes are in foreground */}
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-bold text-slate-400 font-mono whitespace-nowrap">应用禁用白名单（进程名关键字，运行时热键无效）</span>
                  <div className={`p-3 rounded-xl border flex flex-col gap-2 ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div className="flex flex-col gap-1.5">
                      {(userConfig?.hotkey_whitelist || []).map((entry, idx) => (
                        <div key={idx} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs ${isDark ? 'bg-slate-700/60' : 'bg-slate-100'}`}>
                          <span className={`flex-1 font-mono truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{entry}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newList = (userConfig?.hotkey_whitelist || []).filter((_, i) => i !== idx);
                              const newCfg = { ...userConfig!, hotkey_whitelist: newList };
                              setUserConfig(newCfg);
                              invoke('save_full_config', { config: newCfg }).then(() => onConfigReload?.()).catch(console.error);
                            }}
                            className="text-rose-400 hover:text-rose-600 transition-colors font-bold text-xs px-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {(userConfig?.hotkey_whitelist || []).length === 0 && (
                        <span className="text-[10px] text-slate-400 italic">暂无禁用应用，热键全场景生效</span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        id="whitelist-input"
                        placeholder="输入进程名关键字，如 genshin、csgo..."
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (!val) return;
                            const newList = [...(userConfig?.hotkey_whitelist || []), val];
                            const newCfg = { ...userConfig!, hotkey_whitelist: newList };
                            setUserConfig(newCfg);
                            invoke('save_full_config', { config: newCfg }).then(() => onConfigReload?.()).catch(console.error);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className={`flex-1 rounded-lg px-2 py-1 text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500/50 font-mono ${
                          isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-700 placeholder:text-slate-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const input = document.getElementById('whitelist-input') as HTMLInputElement;
                          const val = input?.value.trim();
                          if (!val) return;
                          const newList = [...(userConfig?.hotkey_whitelist || []), val];
                          const newCfg = { ...userConfig!, hotkey_whitelist: newList };
                          setUserConfig(newCfg);
                          invoke('save_full_config', { config: newCfg }).then(() => onConfigReload?.()).catch(console.error);
                          if (input) input.value = '';
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
                      >
                        添加
                      </button>
                    </div>
                    <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      💡 填入进程名关键字（支持部分匹配）。运行该应用时，按热键不会唤出助手。适用于游戏、全屏应用等场景。
                    </span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${isDark ? 'bg-slate-800/40 border-slate-700/60 text-slate-200' : 'bg-slate-50/70 border-slate-100 text-slate-700'}`}>
                  <div className="flex items-center gap-1.5">
                    <Power className="w-4 h-4 text-emerald-500" />
                    <span>开机自动启动</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAutoStart}
                      onChange={handleToggleAutoStart}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Hold-to-Summon Delay */}
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-bold text-slate-400 font-mono whitespace-nowrap">长按唤出延迟</span>
                  <div className={`p-3 rounded-xl border flex flex-col gap-2 ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div className="flex justify-between items-center text-xs whitespace-nowrap gap-2">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>按住多长时间后才唤出菜单</span>
                      <span className="font-bold text-amber-500 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                        {(userConfig?.hold_ms ?? 0) === 0 ? '立即' : `${userConfig?.hold_ms ?? 0}ms`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2000"
                      step="50"
                      value={userConfig?.hold_ms ?? 0}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleUpdatePreference('hold_ms', parseInt(e.target.value));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full accent-amber-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                    />
                    <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      💡 设为 0 = 立即唤出。建议设置 300~500ms 以避免误触。
                    </span>
                  </div>
                </div>

              </div>
            )}


            {/* TAB 2: Modules Drag and Drop */}
            {activeTab === 'modules' && (
              <div className="flex flex-col gap-2.5 py-1">
                <span className="text-[9px] font-bold text-slate-400 font-mono whitespace-nowrap">拖拽卡片调整圆盘节点顺序</span>
                <div className="flex flex-col gap-2">
                  {enabledMods.map((modId, idx) => (
                    <div
                      key={modId}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-grab active:cursor-grabbing ${
                        draggedIdx === idx ? 'opacity-40 border-dashed border-amber-500' : ''
                      } ${
                        isDark ? 'bg-slate-800/60 border-slate-700 hover:border-amber-500/40' : 'bg-slate-50/70 border-slate-100 hover:border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                        <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={true}
                            onChange={() => handleToggleModule(modId)}
                            className="accent-amber-500"
                          />
                          <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{moduleNamesMap[modId] || modId}</span>
                        </label>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">按住拖动 ⠿</span>
                    </div>
                  ))}

                  {['quick-start', 'clipboard', 'window-switch', 'sys-monitor'].filter(m => !enabledMods.includes(m)).map(modId => (
                    <div
                      key={modId}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold opacity-60 ${
                        isDark ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-100/50 border-slate-200'
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => handleToggleModule(modId)}
                          className="accent-amber-500"
                        />
                        <span className="text-slate-400">{moduleNamesMap[modId] || modId} (未开启)</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Appearance */}
            {activeTab === 'appearance' && (
              <div className="flex flex-col gap-4 py-1">
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-bold text-slate-400 font-mono">界面设计主题</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleUpdatePreference('theme', 'light'); }}
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                        !isDark ? 'bg-amber-500/10 border-amber-500 text-amber-600 shadow-sm' : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      白
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleUpdatePreference('theme', 'dark'); }}
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                        isDark ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Moon className="w-4 h-4 text-purple-400" />
                      黑
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-slate-400 whitespace-nowrap">
                      <span className="font-bold">召唤圆盘半径 (50px ~ 150px)</span>
                      <span className="font-mono text-amber-500 font-bold">{userConfig.radius}px</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={userConfig.radius}
                      onChange={(e) => handleUpdatePreference('radius', parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-slate-400 whitespace-nowrap">
                      <span className="font-bold">节点按钮尺寸 (32px ~ 64px)</span>
                      <span className="font-mono text-amber-500 font-bold">{userConfig.node_size || 44}px</span>
                    </div>
                    <input
                      type="range"
                      min="32"
                      max="64"
                      value={userConfig.node_size || 44}
                      onChange={(e) => handleUpdatePreference('node_size', parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-slate-400 whitespace-nowrap">
                      <span className="font-bold">悬浮窗相对间距 (10px ~ 100px)</span>
                      <span className="font-mono text-amber-500 font-bold">{userConfig.card_gap !== undefined ? userConfig.card_gap : 30}px</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={userConfig.card_gap !== undefined ? userConfig.card_gap : 30}
                      onChange={(e) => handleUpdatePreference('card_gap', parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Dedicated Active Window Settings */}
            {activeTab === 'windows' && (
              <div className="flex flex-col gap-3 py-1">
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-bold text-slate-400 font-mono">点击窗口整行空白区域时的默认行为</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleUpdatePreference('window_click_action', 'switch'); }}
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                        (userConfig.window_click_action || 'switch') === 'switch'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-600 shadow-sm'
                          : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Layers className="w-4 h-4 text-amber-500" />
                      切换窗口 (默认)
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleUpdatePreference('window_click_action', 'close'); }}
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                        userConfig.window_click_action === 'close'
                          ? 'bg-rose-500/10 border-rose-500 text-rose-500 shadow-sm'
                          : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <X className="w-4 h-4 text-rose-500" />
                      关闭窗口
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Dedicated Clipboard Settings */}
            {activeTab === 'clipboard' && (
              <div className="flex flex-col gap-3 py-1">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs text-slate-400 whitespace-nowrap">
                    <span className="font-bold">剪贴板历史保留上限</span>
                    <span className="font-mono text-amber-500 font-bold">{userConfig.max_clipboard} 条</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={userConfig.max_clipboard}
                    onChange={(e) => handleUpdatePreference('max_clipboard', parseInt(e.target.value))}
                    className="w-full accent-amber-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB 6: Launcher Apps Editor */}
            {activeTab === 'launcher' && (
              <div
                ref={launcherContainerRef}
                className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-0.5 scroll-smooth"
              >
                <div className="flex justify-between items-center mb-1 whitespace-nowrap">
                  <span className="text-[9px] font-bold text-slate-400 font-mono">快捷启动项 ({userConfig.apps.length})</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleAddAppConfig(); }}
                    className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 text-[10px] font-bold border border-amber-500/20 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" /> 添加快捷启动
                  </button>
                </div>

                {userConfig.apps.map((app, idx) => {
                  const isEditing = editingIdx === idx;
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex flex-col gap-2 ${
                        isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50/70 border-slate-100'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex flex-col gap-2 w-full text-xs">
                          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 mb-0.5">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`type-${idx}`}
                                checked={editAppType === 'app'}
                                onChange={() => setEditAppType('app')}
                                className="accent-amber-500"
                              />
                              本地程序 (.exe)
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`type-${idx}`}
                                checked={editAppType === 'web'}
                                onChange={() => setEditAppType('web')}
                                className="accent-amber-500"
                              />
                              网页 URL
                            </label>
                          </div>

                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className={`w-full border rounded px-2 py-1 text-xs font-bold ${
                              isDark ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-amber-500' : 'bg-white border-slate-250 text-slate-800 focus:border-amber-500'
                            }`}
                            placeholder="按钮别名"
                          />

                          {editAppType === 'app' ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editPath}
                                onChange={(e) => setEditPath(e.target.value)}
                                className={`flex-1 border rounded px-2 py-1 text-[10px] font-mono ${
                                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-250 text-slate-600'
                                }`}
                                placeholder="程序绝对路径 C:\..."
                              />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleNativeFilePicker(); }}
                                className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border border-amber-500/30 text-[10px] font-bold cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
                              >
                                <FolderOpen className="w-3 h-3" /> 📁 浏览
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              <input
                                type="text"
                                value={editPath}
                                onChange={(e) => setEditPath(e.target.value)}
                                className={`w-full border rounded px-2 py-1 text-[10px] font-mono ${
                                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-250 text-slate-600'
                                }`}
                                placeholder="网址 URL (https://...)"
                              />
                            </div>
                          )}

                          <input
                            type="text"
                            value={editArgs}
                            onChange={(e) => setEditArgs(e.target.value)}
                            className={`w-full border rounded px-2 py-1 text-[10px] font-mono ${
                              isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-250 text-slate-600'
                            }`}
                            placeholder="额外参数 / CLI Flags"
                          />

                          <div className="flex justify-end gap-1.5 mt-1 pt-1 border-t border-slate-700/50">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingIdx(null); }}
                              className="px-2.5 py-1 rounded text-[10px] bg-slate-700/50 text-slate-300 cursor-pointer"
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleSaveAppConfig(idx); }}
                              className="px-3 py-1 rounded text-[10px] bg-amber-500 text-slate-950 font-black hover:bg-amber-400 shadow-sm cursor-pointer flex items-center gap-1 whitespace-nowrap"
                            >
                              <Save className="w-3 h-3" /> 保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex flex-col gap-0.5 truncate pr-2">
                            <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{idx + 1}. {app.name || '(未命名)'}</span>
                            <span className="text-[9px] text-slate-400 font-mono truncate">{app.path || '未配置'}</span>
                          </div>
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleStartEdit(idx, app); }}
                              title="编辑"
                              className={`p-1.5 rounded border cursor-pointer ${
                                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-amber-400' : 'bg-white border-slate-250 text-slate-400 hover:text-amber-500'
                              }`}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteAppConfig(idx); }}
                              title="删除"
                              className={`p-1.5 rounded border cursor-pointer ${
                                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-rose-400' : 'bg-white border-slate-250 text-slate-400 hover:text-rose-500'
                              }`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 7: Sys Monitor Checkbox Settings with Drag-and-Drop Reordering */}
            {activeTab === 'monitors' && (
              <div className="flex flex-col gap-2.5 py-1 text-xs">
                <span className="text-[9px] font-bold text-slate-400 font-mono whitespace-nowrap">拖拽调整监控项在主面板中的渲染顺序</span>
                <div className="flex flex-col gap-2">
                  {monitorOrder.map((monKey, idx) => (
                    <div
                      key={monKey}
                      draggable
                      onDragStart={() => handleMonitorDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-grab active:cursor-grabbing ${
                        draggedMonitorIdx === idx ? 'opacity-40 border-dashed border-amber-500' : ''
                      } ${
                        isDark ? 'bg-slate-800/60 border-slate-700 hover:border-amber-500/40' : 'bg-slate-50/70 border-slate-100 hover:border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                        <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={visibleMonitors.includes(monKey)}
                            onChange={() => handleToggleMonitorItem(monKey)}
                            className="accent-amber-500"
                          />
                          <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{monitorNamesMap[monKey] || monKey}</span>
                        </label>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">按住拖动 ⠿</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
