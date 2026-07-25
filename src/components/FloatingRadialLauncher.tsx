import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem } from '../types';
import {
  X,
  ChevronLeft,
  Folder,
  Rocket,
  Clock,
  Bookmark,
  Download,
  Monitor,
  Hexagon,
  Sparkles,
  ArrowRight,
  Plus,
} from 'lucide-react';

interface FloatingRadialLauncherProps {
  position: { x: number; y: number } | null;
  items: MenuItem[];
  onSelectModule: (id: string) => void;
  onClose: () => void;
  onLogMessage: (msg: string, level?: 'info' | 'success' | 'warn' | 'error') => void;
}

export const FloatingRadialLauncher: React.FC<FloatingRadialLauncherProps> = ({
  position,
  items,
  onSelectModule,
  onClose,
  onLogMessage,
}) => {
  const [hoveredItem, setHoveredItem] = useState<MenuItem | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);

  if (!position) return null;

  // Calculate coordinates to keep radial menu inside viewport
  const radius = 110;
  const menuX = Math.min(Math.max(position.x, radius + 20), window.innerWidth - radius - 20);
  const menuY = Math.min(Math.max(position.y, radius + 20), window.innerHeight - radius - 20);

  const getIcon = (name: string) => {
    switch (name) {
      case 'Rocket': return <Rocket className="w-5 h-5" />;
      case 'Folder': return <Folder className="w-5 h-5" />;
      case 'Clock': return <Clock className="w-5 h-5" />;
      case 'Bookmark': return <Bookmark className="w-5 h-5" />;
      case 'Download': return <Download className="w-5 h-5" />;
      case 'Monitor': return <Monitor className="w-5 h-5" />;
      case 'Hexagon': return <Hexagon className="w-5 h-5" />;
      default: return <Folder className="w-5 h-5" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-auto select-none">
        {/* Backdrop click to close */}
        <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px]" onClick={onClose} />

        {/* Center Hub & Floating Concentric Ring */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${menuX}px`, top: `${menuY}px` }}
        >
          {/* Radial Ring Track Circle */}
          <motion.div
            initial={{ scale: 0, rotate: -45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-72 h-72 rounded-full border-2 border-white/60 bg-white/30 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex items-center justify-center"
          >
            {/* Center Hub with Explicit Close Button matching PRD */}
            <div className="relative w-20 h-20 rounded-full bg-white/90 border border-white shadow-lg flex flex-col items-center justify-center text-slate-800 z-20 group">
              {currentFolder ? (
                <button
                  onClick={() => setCurrentFolder(null)}
                  className="flex flex-col items-center justify-center hover:scale-105 transition-transform"
                >
                  <ChevronLeft className="w-5 h-5 text-sky-600" />
                  <span className="text-[10px] font-bold text-slate-600">返回</span>
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="w-full h-full rounded-full flex flex-col items-center justify-center text-slate-700 hover:text-rose-600 hover:bg-rose-50/50 transition-colors relative"
                  title="一键收起/关闭"
                >
                  <X className="w-6 h-6 stroke-[2.5]" />
                  <span className="text-[9px] font-bold tracking-widest text-slate-400 mt-0.5">关闭</span>
                </button>
              )}
            </div>

            {/* Radial Nodes Spread Around Circle */}
            {items.map((item, index) => {
              const total = items.length;
              const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
              const itemX = Math.cos(angle) * radius;
              const itemY = Math.sin(angle) * radius;

              return (
                <motion.button
                  key={item.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.15 }}
                  onClick={() => {
                    onSelectModule(item.id);
                    onLogMessage(`从径向发射器选择: ${item.title}`, 'info');
                    onClose();
                  }}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    position: 'absolute',
                    left: `calc(50% + ${itemX}px - 24px)`,
                    top: `calc(50% + ${itemY}px - 24px)`,
                  }}
                  className="w-12 h-12 rounded-full bg-white/85 hover:bg-white border border-white/90 shadow-md flex items-center justify-center text-slate-700 hover:text-amber-600 transition-all z-10 hover:shadow-lg"
                >
                  {getIcon(item.icon)}
                </motion.button>
              );
            })}
          </motion.div>

          {/* Hover Preview Card with Smart Viewport Edge Alignment matching PRD */}
          <AnimatePresence>
            {hoveredItem && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`absolute pointer-events-none z-30 w-56 p-3.5 rounded-2xl glass-panel shadow-xl border border-white/90 ${
                  menuX > window.innerWidth / 2 ? '-left-64 top-10' : 'left-80 top-10'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600">
                    {getIcon(hoveredItem.icon)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-800">{hoveredItem.title}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">{hoveredItem.details?.type}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2 mt-1">
                  {hoveredItem.description}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono font-bold text-emerald-600">
                  <span>STATUS: READY</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AnimatePresence>
  );
};
