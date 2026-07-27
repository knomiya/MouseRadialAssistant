<div align="center">

# Mouse Radial Assistant

**鼠标径向助手** — 一个优雅的环形快捷菜单，让你的常用操作触手可及

[![Release](https://img.shields.io/github/v/release/knomiya/MouseRadialAssistant?style=flat-square&color=f59e0b)](https://github.com/knomiya/MouseRadialAssistant/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows-0078d4?style=flat-square&logo=windows)](https://github.com/knomiya/MouseRadialAssistant/releases)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri-24c8db?style=flat-square&logo=tauri)](https://tauri.app)

</div>

---

## 最新功能特性 (v0.1.2)

| 功能 | 描述 |
|------|------|
| 🚀 **快捷启动应用** | 配置常用程序、网页、CLI 命令行，支持拖拽手柄自由排序 |
| 📋 **剪贴板全框复制** | 自动记录历史，点击卡片任意区域直接一键复制，支持实时关键词搜索与分类角标统计 |
| ⭐ **持久化收藏夹** | 给常备代码/链接点 ⭐ 加入收藏夹，数据集中保存在 `favorites/` 目录，图片自动存为 PNG 原图 |
| 🛡️ **截屏防框屏蔽** | 采用 Win32 `SetWindowDisplayAffinity`，微信/PixPin 截屏选区时自动对截屏引擎隐藏窗口，100% 无黑框 |
| 📦 **动态微型包围盒** | 摒弃全屏遮挡，采用基于算法的局域窗口，Wallpaper Engine 动态壁纸 100% 顺畅播放 |
| ⏱️ **长按延迟唤出** | 支持 0~2000ms 自定义长按唤出延迟，防误触更加得心应手 |
| 🖥️ **WMI 真实监控** | 读取 CPU/内存/网速/系统时长，支持 WMI 真实温度采集，无权限时真实显示 `N/A` 绝不伪造数据 |
| 🪟 **活动窗口切换** | 实时列出已打开的 Windows 窗口，一键置顶切换或关闭 |
| ⚙️ **高度可定制** | 全局热键、圆盘半径、节点大小、主题样式、监控模块显隐均可配置 |

## 截图预览

<div align="center">

**主界面**

![主界面](https://github.com/user-attachments/assets/b828984d-b883-4484-9f35-472ae0bb04af)

</div>

<table>
  <tr>
    <td align="center"><b>🚀 快速启动</b><br/><img src="https://github.com/user-attachments/assets/a8790b2c-9b77-49ab-b80c-d433361a469a"/></td>
    <td align="center"><b>📋 剪贴板历史与收藏夹</b><br/><img src="https://github.com/user-attachments/assets/e5361c73-72fa-4f13-b9b2-bf7a0cb9794c"/></td>
  </tr>
  <tr>
    <td align="center"><b>🪟 活动窗口切换</b><br/><img src="https://github.com/user-attachments/assets/47aa3c96-ca77-46ce-80dd-9ce9ea9d7891"/></td>
    <td align="center"><b>🖥️ 系统监控</b><br/><img src="https://github.com/user-attachments/assets/9e1871fd-3f31-487f-a25a-b356c2ee1d2a"/></td>
  </tr>
</table>

## 下载安装

前往 [Releases 页面](https://github.com/knomiya/MouseRadialAssistant/releases/latest) 下载最新版本：

- **`MouseRadialAssistant_v0.1.2.zip`** — 绿色免安装便携版，解压后直接双击 exe 即可运行

> Windows 可能弹出安全提示，点击「更多信息 → 仍要运行」即可。程序未签名，无恶意行为。

## 快速开始

1. 下载 ZIP 解压到任意目录
2. 启动后托盘出现图标，代表程序已在后台静默运行
3. **按鼠标侧下键（MouseButton 4）** 在鼠标位置唤出圆形菜单
4. 点击节点打开对应功能面板
5. 点击菜单外任意处或按 × 按钮关闭

### 修改唤醒热键与长按延迟

打开助手 → 点击设置节点 → **软件设置** Tab：
- 点击「修改唤起按键」→ 按下你想要的按键（支持侧键与键盘热键）。
- 拖动「长按唤出延迟」滑块，可设置 0~2000ms 长按触发机制。

## 目录与配置说明

- `assistant_config.json` — 用户偏好配置（热键、半径、列表顺序、白名单）
- `favorites/` — 独立收藏夹子目录（内部存储 `favorites.json` 索引与 `fav_img_xxx.png` 收藏原图）

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

| 字段 | 说明 |
|------|------|
| `summon_key` | 唤醒热键，`Mouse(4)` = 鼠标侧下键 |
| `hold_ms` | 长按延迟毫秒数，0 为瞬间唤出 |
| `radius` | 圆盘半径（像素） |
| `node_size` | 节点圆大小（像素） |
| `card_gap` | 节点到悬浮卡片的间距 |
| `theme` | 主题，`"dark"` 或 `"light"` |
| `hotkey_whitelist` | 进程名关键字列表，匹配时屏蔽热键 |

## 技术栈

- **前端**：React + TypeScript + Vite + TailwindCSS + Framer Motion
- **后端**：Rust + Tauri 2.x
- **系统集成**：Win32 API（SetWindowDisplayAffinity 截屏屏蔽、鼠标钩子、WMI 硬件温度、窗口枚举）

---

<div align="center">

Made with ❤️ by [knomiya](https://github.com/knomiya)

</div>
