<div align="center">

# Mouse Radial Assistant

**鼠标径向助手** — 一个优雅的环形快捷菜单，让你的常用操作触手可及

[![Release](https://img.shields.io/github/v/release/knomiya/MouseRadialAssistant?style=flat-square&color=f59e0b)](https://github.com/knomiya/MouseRadialAssistant/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows-0078d4?style=flat-square&logo=windows)](https://github.com/knomiya/MouseRadialAssistant/releases)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri-24c8db?style=flat-square&logo=tauri)](https://tauri.app)

</div>

---

## 功能特性

| 功能 | 描述 |
|------|------|
| 🚀 **快速启动应用** | 配置常用程序、网页、脚本，一键直达 |
| 📋 **剪贴板历史** | 自动记录剪贴板内容（文字/图片/链接），随时复用 |
| 🪟 **活动窗口切换** | 列出所有打开的窗口，一键切换或关闭 |
| 🖥️ **系统监控** | 实时显示 CPU、内存、温度、网络速度、运行时长 |
| ⚙️ **高度可定制** | 热键、圆盘半径、节点大小、主题、模块开关均可配置 |
| 🎮 **游戏白名单** | 配置指定进程（如游戏）运行时屏蔽热键，防止误触 |

## 截图预览

<div align="center">

**主界面**

![主界面](https://github.com/user-attachments/assets/b828984d-b883-4484-9f35-472ae0bb04af)

</div>

<table>
  <tr>
    <td align="center"><b>🚀 快速启动</b><br/><img src="https://github.com/user-attachments/assets/a8790b2c-9b77-49ab-b80c-d433361a469a"/></td>
    <td align="center"><b>🪟 活动窗口切换</b><br/><img src="https://github.com/user-attachments/assets/47aa3c96-ca77-46ce-80dd-9ce9ea9d7891"/></td>
    <td align="center"><b>🖥️ 系统监控</b><br/><img src="https://github.com/user-attachments/assets/9e1871fd-3f31-487f-a25a-b356c2ee1d2a"/></td>
  </tr>
</table>


## 下载安装

前往 [Releases 页面](https://github.com/knomiya/MouseRadialAssistant/releases/latest) 下载最新版本：

- **`MouseRadialAssistant_vX.X.X.zip`** — 绿色免安装版，解压后直接双击 exe 即可运行

> Windows 可能弹出安全提示，点击「更多信息 → 仍要运行」即可。程序未签名，无恶意行为。


## 快速开始

1. 下载 ZIP 解压到任意目录

2. 启动后托盘出现图标，代表程序已在后台运行
3. **按鼠标侧下键（MouseButton 4）** 在鼠标位置唤出圆形菜单
4. 点击节点打开对应功能面板
5. 点击菜单外任意处或按 × 按钮关闭

### 修改唤醒热键

打开助手 → 点击设置节点 → **软件设置** Tab → 点击「修改唤起按键」→ 按下你想要的按键即可。


## 配置说明

配置保存在程序同目录的 `assistant_config.json`，首次运行自动生成，重启后生效。

```json
{
  "summon_key": { "Mouse": 4 },
  "radius": 100,
  "node_size": 44,
  "card_gap": 30,
  "theme": "dark",
  "enabled_modules": ["quick-start", "clipboard", "window-switch", "sys-monitor"],
  "hotkey_whitelist": ["genshin", "csgo"]
}
```

| 字段 | 说明 |
|------|------|
| `summon_key` | 唤醒热键，`Mouse(4)` = 鼠标侧下键 |
| `radius` | 圆盘半径（像素） |
| `node_size` | 节点圆大小（像素） |
| `card_gap` | 节点到悬浮卡片的间距 |
| `theme` | 主题，`"dark"` 或 `"light"` |
| `hotkey_whitelist` | 进程名关键字列表，匹配时屏蔽热键 |

## 技术栈

- **前端**：React + TypeScript + Vite + TailwindCSS + Framer Motion
- **后端**：Rust + Tauri 2.x
- **系统集成**：Win32 API（鼠标钩子、窗口枚举、进程查询）

---

<div align="center">

Made with ❤️ by [knomiya](https://github.com/knomiya)

</div>
