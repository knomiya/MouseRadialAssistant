import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ThemeConfig } from '../types';
import { presetThemes } from '../data/presetData';
import {
  X,
  Code,
  Download,
  Upload,
  Check,
  Copy,
  Sparkles,
  RefreshCw,
  FileJson,
  Palette,
} from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeConfig;
  onApplyTheme: (theme: ThemeConfig) => void;
  onLogMessage: (msg: string, level?: 'info' | 'success' | 'warn' | 'error') => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onApplyTheme,
  onLogMessage,
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Export current config as JSON string
  const currentJsonString = JSON.stringify(
    {
      appVersion: 'v3.2',
      theme: currentTheme,
      created: new Date().toISOString(),
    },
    null,
    2
  );

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(currentJsonString);
    setCopied(true);
    onLogMessage('当前 JSON 配置已成功复制到剪贴板', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyJson = () => {
    try {
      setParseError(null);
      const parsed = JSON.parse(jsonInput);
      if (parsed && (parsed.theme || parsed.id)) {
        const themeToApply = parsed.theme || parsed;
        onApplyTheme(themeToApply);
        onLogMessage(`成功解析并应用外部 JSON 主题: ${themeToApply.name || '自定义主题'}`, 'success');
        setJsonInput('');
      } else {
        setParseError('无效的 JSON 格式：缺少必要的 theme 配置属性');
      }
    } catch (err) {
      setParseError('JSON 语法错误：请检查粘贴的代码格式是否正确');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          setJsonInput(content);
          onLogMessage(`上传 JSON 配置文件成功: ${file.name}`, 'info');
        } catch (error) {
          setParseError('文件读取失败');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl rounded-3xl glass-panel p-6 shadow-2xl border border-white/90 relative flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Explicit Close Button matching PRD */}
        <button
          onClick={onClose}
          title="关闭面板"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-all z-10"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 border border-amber-500/30">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">
              JSON 主题与配置导入 / 导出
            </h3>
            <p className="text-xs text-slate-500">
              切换高颜值设计预设主题，或直接导入/导出 JSON 配置代码
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-6">
          {/* Section 1: Preset Design Themes */}
          <div>
            <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-3 flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              预设精品主题库 (Preset Themes)
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              {presetThemes.map((theme) => {
                const isActive = theme.id === currentTheme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      onApplyTheme(theme);
                      onLogMessage(`切换主题: ${theme.name}`, 'info');
                    }}
                    className={`p-3 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-md ring-2 ring-amber-500/30'
                        : 'bg-white/60 hover:bg-white/90 border-white/90'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-xs text-slate-800">{theme.name}</span>
                      {isActive && <Check className="w-4 h-4 text-amber-600 stroke-[3]" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-4 h-4 rounded-full border border-white/80 shadow-2xs" style={{ background: theme.accentColor }} />
                      <div className="w-4 h-4 rounded-full border border-white/80 shadow-2xs" style={{ background: theme.highlightColor }} />
                      <span className="text-[10px] font-mono text-slate-400 ml-auto">{theme.id}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Import Custom JSON */}
          <div className="p-4 rounded-2xl bg-white/50 border border-white/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-sky-600" />
                导入外部 JSON 代码 / 配置文件
              </h4>
              <label className="cursor-pointer text-[11px] font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 bg-white/80 hover:bg-white px-2.5 py-1 rounded-xl border border-sky-200">
                <Upload className="w-3 h-3" />
                选择 .json 文件
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <textarea
              rows={3}
              placeholder="在此粘贴外部 Theme JSON 配置代码..."
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full p-3 text-xs font-mono rounded-xl bg-white/80 border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-sky-400 text-slate-800"
            />

            {parseError && (
              <span className="text-[11px] font-bold text-rose-600 font-mono">{parseError}</span>
            )}

            <button
              onClick={handleApplyJson}
              disabled={!jsonInput.trim()}
              className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <FileJson className="w-4 h-4" />
              解析并应用 JSON 配置
            </button>
          </div>

          {/* Section 3: Backup & Export JSON */}
          <div className="p-4 rounded-2xl bg-white/50 border border-white/80 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                导出 / 备份当前配置 (Export JSON)
              </h4>
              <button
                onClick={handleCopyConfig}
                className="text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? '已复制' : '复制 JSON'}
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] max-h-28 overflow-y-auto">
              {currentJsonString}
            </pre>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
