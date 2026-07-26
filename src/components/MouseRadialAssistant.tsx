import React, { useState, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { DetailCard } from './DetailCard';
import { MenuItem, ClipboardItem } from '../types';
import { Rocket, ClipboardList, Monitor, Settings, X, Layers } from 'lucide-react';

interface UserConfig {
  summon_key: any;
  apps: any[];
  radius: number;
  node_size?: number;
  card_gap?: number;
  max_clipboard: number;
  visible_monitors?: string[];
  enabled_modules?: string[];
  theme?: string;
  monitor_order?: string[];
  window_click_action?: string;
}

const ALL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'quick-start',
    title: '快速启动应用',
    icon: Rocket,
    description: '快速启动常用程序或常用网页路径',
  },
  {
    id: 'clipboard',
    title: '剪贴板历史记录',
    icon: ClipboardList,
    description: '管理并快速复用剪贴板历史信息',
  },
  {
    id: 'window-switch',
    title: '活动窗口切换',
    icon: Layers,
    description: '一键切换当前桌面活动窗口',
  },
  {
    id: 'sys-monitor',
    title: '系统监控视图',
    icon: Monitor,
    description: '实时查看 CPU、内存、温度与流量开销',
  },
  {
    id: 'sys-settings',
    title: '助手偏好设置',
    icon: Settings,
    description: '自定义热键、尺寸、明暗主题与模块配置',
  },
];

interface RadialMenuProps {
  items: MenuItem[];
  activeItem: MenuItem | null;
  onSelectItem: (item: MenuItem) => void;
  onClose: () => void;
  radius: number;
  nodeSize: number;
  theme?: string;
}

const RadialMenu: React.FC<RadialMenuProps> = ({
  items,
  activeItem,
  onSelectItem,
  onClose,
  radius,
  nodeSize,
  theme,
}) => {
  const count = items.length;
  const angleStep = Math.PI / Math.max(1, count - 1);
  const startAngle = -Math.PI / 2;

  const isDark = theme === 'dark';
  // Center close button diameter: nodeSize + 6 (Radius is exactly 3px larger than regular node)
  const centerSize = nodeSize + 6;

  return (
    <div className="relative flex items-center justify-center">
      {/* Center Close Circle Button */}
      <motion.button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          width: `${centerSize}px`,
          height: `${centerSize}px`,
        }}
        className={`rounded-full shadow-2xl flex items-center justify-center cursor-pointer z-50 transition-all group ${
          isDark
            ? 'bg-slate-900 text-slate-200 hover:border-rose-500 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
            : 'bg-white text-slate-700 hover:border-rose-500 shadow-[0_10px_30px_rgba(15,23,42,0.15)]'
        }`}
      >
        <X className="w-5 h-5 stroke-[2.8] transition-colors group-hover:text-rose-500" />
      </motion.button>

      {/* Radial Nodes */}
      {items.map((item, index) => {
        const angle = startAngle + index * angleStep;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        const isActive = activeItem?.id === item.id;
        const Icon = item.icon;

        return (
          <motion.button
            key={item.id}
            data-node-id={item.id}
            onClick={(e) => { e.stopPropagation(); onSelectItem(item); }}
            initial={{ scale: 0, x: 0, y: 0 }}
            animate={{ scale: 1, x, y }}
            exit={{ scale: 0, x: 0, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            style={{
              position: 'absolute',
              width: `${nodeSize}px`,
              height: `${nodeSize}px`,
            }}
            title={item.title}
            className={`rounded-full shadow-xl flex items-center justify-center cursor-pointer z-40 transition-all relative ${
              isActive
                ? 'bg-amber-500 text-slate-950 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : isDark
                ? 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {/* Inner Ring: Bright White Glowing Breathing Light */}
            <div
              style={{
                width: `${nodeSize - 10}px`,
                height: `${nodeSize - 10}px`,
              }}
              className={`rounded-full border-2 flex items-center justify-center transition-all ${
                isActive
                  ? 'border-white bg-amber-400/20 animate-pulse shadow-[0_0_10px_#ffffff,0_0_18px_#f59e0b]'
                  : isDark
                  ? 'border-slate-700/80'
                  : 'border-slate-200/90'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

export const MouseRadialAssistant: React.FC = () => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [clipboards, setClipboards] = useState<ClipboardItem[]>([]);
  const [radius, setRadius] = useState<number>(100);
  const [nodeSize, setNodeSize] = useState<number>(44);
  const [cardGap, setCardGap] = useState<number>(30);
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // SVG connector coords — populated by DOM measurement after animation settles
  const [svgCoords, setSvgCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = () => {
    invoke<UserConfig>('get_user_config')
      .then((cfg) => {
        setUserConfig(cfg);
        if (cfg.radius) setRadius(cfg.radius);
        if (cfg.node_size) setNodeSize(cfg.node_size);
        if (cfg.card_gap !== undefined) setCardGap(cfg.card_gap);
      })
      .catch(console.error);
  };

  useEffect(() => {
    const unlistenSummon = listen<{ x: number; y: number }>('summon_menu', (event) => {
      fetchConfig();
      setPosition({ x: event.payload.x, y: event.payload.y });
    });

    const unlistenClip = listen<string>('clipboard_update', (event) => {
      const text = event.payload;
      if (!text || !text.trim()) return;

      const isLink = text.startsWith('http://') || text.startsWith('https://');

      setClipboards((prev) => {
        if (prev.length > 0 && prev[0].content === text) {
          return prev;
        }
        const newItem: ClipboardItem = {
          id: Date.now().toString(),
          content: text,
          type: isLink ? 'link' : 'text',
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        const maxLimit = userConfig?.max_clipboard || 20;
        return [newItem, ...prev].slice(0, maxLimit);
      });
    });

    return () => {
      unlistenSummon.then((u) => u());
      unlistenClip.then((u) => u());
    };
  }, [userConfig?.max_clipboard]);

  const handleClose = () => {
    setPosition(null);
    setActiveItem(null);
    invoke('hide_window').catch(console.error);
  };

  const handleSelectItem = (item: MenuItem) => {
    if (activeItem?.id === item.id) {
      setActiveItem(null);
    } else {
      setActiveItem(item);
    }
  };

  const showLaunchToast = (appName: string) => {
    setToastMessage(`正在启动 ${appName}...`);
    setTimeout(() => {
      setToastMessage(null);
      handleClose();
    }, 400);
  };

  const isDark = userConfig?.theme === 'dark';

  const enabledModuleIds = userConfig?.enabled_modules || ['quick-start', 'clipboard', 'window-switch', 'sys-monitor'];
  
  const sortedMenuItems: MenuItem[] = [];
  enabledModuleIds.forEach(id => {
    const item = ALL_MENU_ITEMS.find(m => m.id === id);
    if (item) sortedMenuItems.push(item);
  });
  const settingsNode = ALL_MENU_ITEMS.find(m => m.id === 'sys-settings');
  if (settingsNode) sortedMenuItems.push(settingsNode);

  const count = sortedMenuItems.length;
  const angleStep = Math.PI / Math.max(1, count - 1);
  const startAngle = -Math.PI / 2;

  // Calculate the max right X for card placement
  let maxNodeRightX = 0;
  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    const nodeRightX = Math.cos(angle) * radius + nodeSize / 2;
    if (nodeRightX > maxNodeRightX) maxNodeRightX = nodeRightX;
  }
  const cardLeftX = maxNodeRightX + cardGap;

  // activeIndex/Y needed for card vertical position
  const activeIndex = activeItem ? sortedMenuItems.findIndex(m => m.id === activeItem.id) : -1;
  const activeAngle = activeIndex >= 0 ? startAngle + activeIndex * angleStep : 0;
  const activeNodeY = Math.sin(activeAngle) * radius;

  // ── SVG line: measure exact button apex and card left edge from real DOM ──
  useLayoutEffect(() => {
    if (!activeItem || !position) {
      setSvgCoords(null);
      return;
    }

    const updateCoords = () => {
      const btn = document.querySelector(`[data-node-id="${activeItem.id}"]`) as HTMLElement | null;
      const card = document.getElementById('detail-card-overlay');
      if (!btn || !card) return;

      const btnRect = btn.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      // Button exact physical center in screen coords
      const btnCenterX = btnRect.left + btnRect.width / 2;
      const btnCenterY = btnRect.top + btnRect.height / 2;

      // X1 = Button right apex = Center + (nodeSize / 2)
      const x1 = btnCenterX + nodeSize / 2;
      const y1 = btnCenterY;

      // X2 = Card left border exact screen position
      const x2 = cardRect.left;
      const y2 = btnCenterY;

      setSvgCoords({ x1, y1, x2, y2 });
    };

    updateCoords();
    const timer1 = setTimeout(updateCoords, 80);
    const timer2 = setTimeout(updateCoords, 260);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [activeItem, position, nodeSize, radius, cardGap]);


  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 w-screen h-screen overflow-hidden select-none pointer-events-auto ${isDark ? 'dark' : ''}`}
    >
      {/* Toast Feedback Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 px-4 py-2 rounded-xl font-black text-xs shadow-2xl z-50 flex items-center gap-2"
          >
            <Rocket className="w-4 h-4 animate-bounce" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen SVG connector — uses DOM-measured coordinates for pixel-perfect accuracy */}
      {svgCoords && (
        <svg
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 25,
            overflow: 'visible',
          }}
        >
          <line
            x1={svgCoords.x1}
            y1={svgCoords.y1}
            x2={svgCoords.x2}
            y2={svgCoords.y2}
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="5 4"
            strokeOpacity="0.9"
          />
          <circle
            cx={svgCoords.x2}
            cy={svgCoords.y2}
            r="3"
            fill="#f59e0b"
            opacity="0.9"
          />
        </svg>
      )}

      <AnimatePresence>
        {position && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="pointer-events-none relative"
          >
            {/* Radial Menu Node Ring */}
            <div className="pointer-events-auto">
              <RadialMenu
                items={sortedMenuItems}
                activeItem={activeItem}
                onSelectItem={handleSelectItem}
                onClose={handleClose}
                radius={radius}
                nodeSize={nodeSize}
                theme={userConfig?.theme}
              />
            </div>

            {/* Detail Card Overlay */}
            {activeItem && (
              <div
                id="detail-card-overlay"
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  left: `${cardLeftX}px`,
                  top: `${activeNodeY}px`,
                  transform: 'translateY(-50%)',
                }}
                className="z-30 pointer-events-auto"
              >
                <DetailCard
                  item={activeItem}
                  clipboards={clipboards}
                  onCloseCard={() => setActiveItem(null)}
                  onRadiusChange={(r) => setRadius(r)}
                  onNodeSizeChange={(s) => setNodeSize(s)}
                  onCardGapChange={(g) => setCardGap(g)}
                  onConfigReload={fetchConfig}
                  onLaunchApp={(name) => showLaunchToast(name)}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

