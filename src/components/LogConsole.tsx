import React, { useState } from 'react';
import { SystemLog } from '../types';
import { MoreHorizontal, Trash2, Terminal, ChevronUp, ChevronDown } from 'lucide-react';

interface LogConsoleProps {
  logs: SystemLog[];
  onClearLogs: () => void;
}

export const LogConsole: React.FC<LogConsoleProps> = ({ logs, onClearLogs }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Take latest logs
  const displayLogs = isExpanded ? logs : logs.slice(-4);

  return (
    <div className="w-full px-8 pb-6 z-20 select-none">
      <div className="w-full rounded-2xl glass-panel p-4 shadow-[0_15px_30px_rgba(0,0,0,0.05)] border border-white/90 flex items-start justify-between relative transition-all duration-300">
        {/* Left Vertical Blue Accent Line matching Image 1 */}
        <div className="absolute left-4 top-4 bottom-4 w-1 bg-gradient-to-b from-sky-500 to-indigo-600 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)]" />

        {/* Logs Text List matching Image 1 */}
        <div className="pl-6 flex flex-col gap-1.5 font-mono text-xs text-sky-800 tracking-wide font-medium max-h-[160px] overflow-y-auto w-full pr-8">
          {displayLogs.map((log) => (
            <div key={log.id} className="flex items-center gap-3">
              <span className="text-sky-600/80 font-bold">[{log.timestamp}]</span>
              <span
                className={
                  log.level === 'success'
                    ? 'text-emerald-700 font-bold'
                    : log.level === 'error'
                    ? 'text-rose-600 font-bold'
                    : log.level === 'warn'
                    ? 'text-amber-700 font-bold'
                    : 'text-slate-800 font-bold'
                }
              >
                {log.message}
              </span>
            </div>
          ))}
        </div>

        {/* Right More Action Button matching Image 1 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? '折叠日志' : '展开日志'}
            className="p-1.5 rounded-xl hover:bg-white/80 text-slate-500 hover:text-slate-900 transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={onClearLogs}
            title="清空日志"
            className="p-1.5 rounded-xl hover:bg-white/80 text-slate-500 hover:text-rose-600 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
