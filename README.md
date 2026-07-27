<div align="center">

# Mouse Radial Assistant

**鼠标径向助手** — 一个优雅的环形快捷菜单，让你的常用操作触手可及

[![Release](https://img.shields.io/github/v/release/knomiya/MouseRadialAssistant?style=flat-square&color=f59e0b)](https://github.com/knomiya/MouseRadialAssistant/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows-0078d4?style=flat-square&logo=windows)](https://github.com/knomiya/MouseRadialAssistant/releases)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri-24c8db?style=flat-square&logo=tauri)](https://tauri.app)

</div>

---

## 核心功能

| 功能模块 | 功能描述 |
|----------|----------|
| 🚀 **快速启动应用** | 配置常用程序、网页与 CLI 命令行，支持拖拽手柄自由排序 |
| 📋 **剪贴板管理** | 自动记录历史，卡片一键复制，支持实时关键词搜索与精确分类统计 |
| ⭐ **持久化收藏夹** | 常用代码与文本一键收藏，数据持久化存入 `favorites/` 目录 |
| 🛡️ **防截屏选中** | 采用 Win32 原生 Display Affinity 属性，截屏选区时界面自动隐形 |
| 📦 **局域高效渲染** | 基于算法的动态包围盒，避免全屏遮挡，不干扰桌面壁纸渲染 |
| ⏱️ **自定义长按唤出** | 支持 0~2000ms 自由设定唤起延迟，灵活防止误触发 |
| 🖥️ **系统硬件监控** | 实时采集 CPU 占用、内存使用、网络上下行速率及硬件温度 |
| 🪟 **活动窗口切换** | 实时列出当前打开的 Windows 窗口，支持一键置顶切换或关闭 |
| ⚙️ **高度可定制** | 热键绑定、圆盘半径、节点尺寸、主题样式与功能模块均可自定义 |

## 截图预览

<div align="center">

**主界面**

![主界面](https://github.com/user-attachments/assets/b828984d-b883-4484-9f35-472ae0bb04af)

</div>

<table>
  <tr>
    <td align="center"><b>🚀 快速启动</b><br/><img src="https://github.com/user-attachments/assets/a8790b2c-9b77-49ab-b80c-d433361a469a"/></td>
    <td align="center"><b>📋 剪贴板历史</b><br/><img src="https://github.com/user-attachments/assets/e5361c73-72fa-4f13-b9b2-bf7a0cb9794c"/></td>
  </tr>
  <tr>
    <td align="center"><b>🪟 活动窗口切换</b><br/><img src="https://github.com/user-attachments/assets/47aa3c96-ca77-46ce-80dd-9ce9ea9d7891"/></td>
    <td align="center"><b>🖥️ 系统监控</b><br/><img src="https://github.com/user-attachments/assets/9e1871fd-3f31-487f-a25a-b356c2ee1d2a"/></td>
  </tr>
</table>

## 下载安装

前往 [Releases 页面](https://github.com/knomiya/MouseRadialAssistant/releases/latest) 下载最新版本：

- **`MouseRadialAssistant_v0.1.2.zip`** — 绿色便携版，解压后双击即可运行

## 快速开始

1. 下载 ZIP 并解压到任意目录
2. 双击运行，托盘图标出现即代表后台已静默就绪
3. **按鼠标侧下键（MouseButton 4）** 在光标所在处唤出径向菜单
4. 点击节点展开功能面板，点击空白区域或按 × 按钮收起

### 修改唤醒热键与长按延迟

打开助手 → 点击设置节点 → **软件设置** Tab：
- **修改唤起按键**：支持自定义鼠标侧键或键盘快捷键
- **长按唤出延迟**：滑动调节 0~2000ms 触发响应时间

## 目录与配置说明

- `assistant_config.json` — 软件偏好配置文件
- `favorites/` — 收藏夹数据与资源存储目录

```json
{
  "summon_key": { "Mouse": 4 },
  "hold_ms": 0,
  "radius": 100,
  "node_size": 44,
  "card_gap": 30,
  "theme": "dark",
  "enabled_modules": ["quick-start", "clipboard", "window-switch", "sys-monitor"],
  "hotkey_whitelist": ["genshin", "csgo"]
}
```

## 技术栈

- **前端**：React + TypeScript + Vite + TailwindCSS + Framer Motion
- **后端**：Rust + Tauri 2.x
- **系统集成**：Win32 API（Display Affinity、Global Mouse Hook、WMI Metric Data）

---

<div align="center">

Made with ❤️ by [knomiya](https://github.com/knomiya)

</div>
