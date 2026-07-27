import React, { useState, useEffect } from 'react';
import { MouseRadialAssistant } from './components/MouseRadialAssistant';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { MenuItem } from './types';

const coreMenuItems: MenuItem[] = [
  {
    id: 'quick-start',
    icon: 'Rocket',
    title: '快速启动',
    description: '启动配置好的命令行、本地程序或浏览器网页',
    category: 'apps',
    details: {
      idCode: 'LAUNCH-01',
      type: 'APP LAUNCHER',
      status: 'READY',
      link: 'LOCAL PROCESS',
    }
  },
  {
    id: 'clipboard',
    icon: 'Copy',
    title: '剪贴板历史',
    description: '查看历史文本、链接及图片截图并支持一键复写/浏览',
    category: 'clipboard',
    details: {
      idCode: 'CLIP-02',
      type: 'REALTIME BUFFER',
      status: 'ACTIVE',
      link: 'SYSTEM CLIP',
    }
  },
  {
    id: 'window-switch',
    icon: 'Layers',
    title: '窗口切换',
    description: '实时列出 Windows 打开的活动窗口并一键快速置顶',
    category: 'windows',
    details: {
      idCode: 'WIN-03',
      type: 'ALT-TAB ASSISTANT',
      status: 'ACTIVE',
      link: 'WIN32 FOREGROUND',
    }
  },
  {
    id: 'sys-monitor',
    icon: 'Sliders',
    title: '系统监控',
    description: '读取本机 CPU、内存、网络上下行流速、磁盘及运行时间',
    category: 'system',
    details: {
      idCode: 'MONITOR-04',
      type: 'HARDWARE SENSOR',
      status: 'ACTIVE',
      link: 'REALTIME SYSINFO',
    }
  },
  {
    id: 'sys-settings',
    icon: 'Settings',
    title: '偏好设置',
    description: '管理全局唤醒热键、召唤半径、网页/程序路径及监控显示',
    category: 'settings',
    details: {
      idCode: 'SET-05',
      type: 'PREFERENCES',
      status: 'READY',
      link: 'LOCAL JSON',
    }
  }
];

export default function App() {
  const [radialPos, setRadialPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const unlistenPromise = listen<{ x: number; y: number }>('summon_menu', (event) => {
      const coords = event.payload;
      setRadialPos({ x: coords.x, y: coords.y });
    });

    const defaultX = Math.round(window.innerWidth * 0.5);
    const defaultY = Math.round(window.innerHeight * 0.5);
    setRadialPos({ x: defaultX, y: defaultY });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const handleClose = () => {
    setRadialPos(null);
    invoke('hide_window').catch(console.error);
  };

  return (
    <div
      onClick={handleClose}
      className="w-screen h-screen relative overflow-hidden bg-transparent font-sans text-slate-800 select-none cursor-default"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full h-full bg-transparent">
        <MouseRadialAssistant
          position={radialPos}
          items={coreMenuItems}
          onClose={handleClose}
        />
      </div>
    </div>
  );
}
