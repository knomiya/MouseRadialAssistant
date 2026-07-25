import React from 'react';
import { motion } from 'motion/react';
import { MenuItem } from '../types';
import {
  Folder,
  LayoutGrid,
  Globe,
  Star,
  RefreshCw,
  Sliders,
  Wrench,
  Rocket,
  FileText,
  Clock,
  Bookmark,
  Download,
  Monitor,
  Hexagon,
} from 'lucide-react';

interface ArcRadialMenuProps {
  items: MenuItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}

// Icon mapper for dynamic renders
const getLucideIcon = (name: string, className: string) => {
  switch (name) {
    case 'Rocket': return <Rocket className={className} />;
    case 'Folder': return <Folder className={className} />;
    case 'Clock': return <Clock className={className} />;
    case 'Bookmark': return <Bookmark className={className} />;
    case 'Download': return <Download className={className} />;
    case 'Monitor': return <Monitor className={className} />;
    case 'Hexagon': return <Hexagon className={className} />;
    default: return <Folder className={className} />;
  }
};

// Left arc strip icon list corresponding to Image 1's 7 arc positions
const arcIcons = [
  { id: 'quick-start', icon: Folder },
  { id: 'file-manager', icon: LayoutGrid },
  { id: 'recent-items', icon: Globe },
  { id: 'favorites', icon: Star },
  { id: 'downloads', icon: RefreshCw },
  { id: 'sys-monitor', icon: Sliders },
  { id: 'sys-settings', icon: Wrench },
];

export const ArcRadialMenu: React.FC<ArcRadialMenuProps> = ({
  items,
  selectedId,
  onSelect,
}) => {
  // Calculate vertical position offset for active golden badge
  const selectedIndex = items.findIndex((item) => item.id === selectedId);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 3; // Default to 'favorites' (3rd index) as in Image 1

  return (
    <div className="flex items-center gap-10 select-none relative py-4">
      {/* 1. Curved Arc Strip matching Image 1 */}
      <div className="relative w-28 h-[480px] flex items-center justify-center">
        {/* The White Frosted Arc Background Capsule Body */}
        <div className="absolute inset-y-0 left-0 w-24 rounded-full bg-white/40 backdrop-blur-xl border border-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col justify-between py-6 items-center">
          {/* Subtle arc track inner line */}
          <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-transparent via-white/80 to-transparent" />
        </div>

        {/* Arc Nodes (7 Circle Buttons) following curved arc trajectory */}
        <div className="relative w-full h-full flex flex-col justify-between py-2 items-center z-10">
          {arcIcons.map((arcItem, index) => {
            const isSelected = arcItem.id === selectedId;
            const IconComp = arcItem.icon;
            // Calculate natural smooth curve arc offset (X translation)
            // Center index = 3 gets pushed right (+12px), ends are pushed left (-8px)
            const curveOffset = Math.sin((index / (arcIcons.length - 1)) * Math.PI) * 22 - 10;

            return (
              <div
                key={arcItem.id}
                className="relative flex items-center justify-center transition-transform duration-300"
                style={{ transform: `translateX(${curveOffset}px)` }}
              >
                {/* Standard Circle Node */}
                <button
                  onClick={() => onSelect(arcItem.id)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border ${
                    isSelected
                      ? 'opacity-0 scale-90' // Hidden when replaced by golden emblem
                      : 'bg-white/80 hover:bg-white border-white/90 shadow-md text-slate-600 hover:text-slate-900 hover:scale-105 active:scale-95'
                  }`}
                >
                  <IconComp className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* 2. Golden Starburst Hexagon Badge (Active Highlight) matching Image 1 */}
        {(() => {
          const activeCurveOffset = Math.sin((activeIndex / (items.length - 1)) * Math.PI) * 22 - 10;
          return (
            <motion.div
              className="absolute z-20 flex items-center gap-1 pointer-events-none"
              animate={{
                top: `${(activeIndex / (items.length - 1)) * 410 + 10}px`,
                left: `${24 + activeCurveOffset}px`,
              }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            >
              {/* Golden Badge Container */}
              <div className="relative w-14 h-14 rounded-2xl golden-hexagon-badge flex items-center justify-center transform rotate-45 shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                {/* Inner Golden Compass Emblem */}
                <div className="transform -rotate-45 flex items-center justify-center text-white">
                  {/* Compass / Golden Starburst SVG icon */}
                  <svg className="w-7 h-7 text-amber-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" className="opacity-40" />
                    <path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" strokeWidth="1.5" className="opacity-80" />
                    <polygon points="12 3 14.5 9.5 21 12 14.5 14.5 12 21 9.5 14.5 3 12 9.5 9.5 12 3" fill="white" />
                  </svg>
                </div>
              </div>

              {/* Right Pointer Arrow Arrowhead pointing to text list */}
              <div className="golden-pointer-arrow ml-[-4px]" />
            </motion.div>
          );
        })()}
      </div>

      {/* 3. Right Vertical Text Menu List matching Image 1 */}
      <div className="flex flex-col gap-4 py-2 w-72">
        {items.map((item) => {
          const isSelected = item.id === selectedId;

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`flex items-start gap-4 p-2.5 rounded-2xl transition-all duration-200 text-left group ${
                isSelected
                  ? 'bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-white/90 translate-x-1'
                  : 'hover:bg-white/40 hover:backdrop-blur-sm'
              }`}
            >
              {/* Left Icon */}
              <div
                className={`mt-0.5 p-2 rounded-xl transition-colors ${
                  isSelected
                    ? 'text-amber-600 bg-amber-500/10'
                    : 'text-slate-600 group-hover:text-slate-900 group-hover:bg-white/60'
                }`}
              >
                {getLucideIcon(item.icon, 'w-5 h-5')}
              </div>

              {/* Title & Description */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold tracking-tight text-base transition-colors ${
                      isSelected ? 'text-slate-900 font-extrabold' : 'text-slate-700 group-hover:text-slate-900'
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500 mt-0.5 line-clamp-1 font-normal">
                  {item.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
