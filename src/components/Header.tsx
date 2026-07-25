import React, { useState, useEffect } from 'react';
import { Wifi, User, Settings, Compass, MousePointerClick } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  isFloatingMode: boolean;
  onToggleFloatingMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  isFloatingMode,
  onToggleFloatingMode,
}) => {
  const [timeStr, setTimeStr] = useState('09:42');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${hours}:${mins}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full flex items-center justify-between px-8 py-5 select-none z-20">
      {/* Left System Clock & Status matching Image 1 */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"></span>
          <span className="text-3xl font-extrabold tracking-tight text-slate-800 drop-shadow-sm font-mono">
            {timeStr}
          </span>
        </div>
        <span className="text-[11px] font-bold tracking-widest text-slate-500 uppercase mt-0.5 ml-4">
          SYSTEM ONLINE
        </span>
      </div>

      {/* Right User Status, EXP Bar & Control Icons */}
      <div className="flex items-center gap-6">
        {/* Floating mode shortcut toggle */}
        <button
          onClick={onToggleFloatingMode}
          title={isFloatingMode ? '切换至固态大屏模式' : '切换至悬浮径向菜单模式 (桌面空白处点击唤出)'}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
            isFloatingMode
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 shadow-sm'
              : 'bg-white/60 border-white/80 text-slate-700 hover:bg-white/80'
          }`}
        >
          <MousePointerClick className={`w-3.5 h-3.5 ${isFloatingMode ? 'text-amber-600 animate-bounce' : 'text-slate-500'}`} />
          <span>{isFloatingMode ? '鼠标唤出模式中' : '静态展示模式'}</span>
        </button>

        {/* Level and EXP Bar */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3 text-xs font-bold text-slate-700 font-mono">
            <span className="text-slate-800 tracking-wider">LV.88</span>
            <span className="text-slate-500 text-[11px]">EXP 85.6%</span>
          </div>
          <div className="w-36 h-2 bg-slate-200/80 rounded-full overflow-hidden p-0.5 border border-white/60 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-400 via-indigo-500 to-sky-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
              style={{ width: '85.6%' }}
            />
          </div>
        </div>

        {/* Header Action Icons matching Image 1 */}
        <div className="flex items-center gap-3">
          <button
            title="网络在线"
            className="w-10 h-10 rounded-full bg-white/70 hover:bg-white/90 border border-white/80 shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all active:scale-95"
          >
            <Wifi className="w-4 h-4" />
          </button>
          <button
            title="当前用户: Administrator"
            className="w-10 h-10 rounded-full bg-white/70 hover:bg-white/90 border border-white/80 shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all active:scale-95"
          >
            <User className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            title="系统设置与 JSON 主题导入"
            className="w-10 h-10 rounded-full bg-white/70 hover:bg-white/90 border border-white/80 shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all active:scale-95 group"
          >
            <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </header>
  );
};
