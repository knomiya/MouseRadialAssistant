# 鼠标径向助手 (Mouse Radial Assistant) 精简化与自定义按键唤起改造实施计划书

- **日期**：2026-07-24
- **本次使用的技术**：
  - **前端**：React, Vite, TS, Tailwind CSS
  - **后端**：Rust (Tauri v2), Win32 shell32 FFI (用于一键物理清空回收站), arboard (系统剪贴板监听), sysinfo (CPU/内存状态读取), `rdev` (全局输入捕获用于自定义快捷键录入与匹配)
- **问题描述或需求背景**：
  用户反馈先前的高保真代码中包含了大量的纯展示 mock 功能（例如虚假的模拟 CMD 窗口导致无法正常退出与操作，多余的主题背景色和模态背景框造成大灰色遮罩层阻碍视线）。
  为了将该软件做成真正的实用工具，我们需要**“瘦身”并彻底剔除虚假高保真 mock 代码**，使界面 100% 保持透明并支持点击穿透，且所有选项均为真实的系统调用。
  **新增需求**：用户希望可以在设置中自定义“唤起按键”，点击修改按钮后，能够通过监听用户的下一次键盘或鼠标物理输入，自动识别并更新为新的全局唤醒快捷键。
- **涉及到的交互方式**：
  - 鼠标下侧键（或用户自定义的热键/鼠标侧键）全局唤醒主窗口并自动定位，在透明区点击一次即可穿透并隐藏主窗口。
  - 在偏好设置卡片中，点击“修改唤起键”，进入“请按键录入...”状态，按任意键盘按键或鼠标按键即可完成修改。
- **涉及到的其他项目联动**：
  - 真实拉起本地 VS Code、Windows 终端、系统任务管理器。
  - 一键调用 Windows shell32 API 清空系统物理回收站。
  - 系统剪贴板历史（读写系统剪贴板，支持历史复制与一键复写）。
  - 真实的系统 CPU / 内存占用图表。
- **本次改造重点**：
  1. **精简 UI**：删除 [MouseRadialAssistant.tsx](file:///e:/Projects/Rust/MouseRadialAssistant/src/components/MouseRadialAssistant.tsx) 中的配置面板、CMD 命令行模态框、回收站列表面板、下载面板等所有假 Mock 代码。
  2. **完全透明底色**：清除背景渐变等可能平铺满窗口的任何主题背景样式，只在菜单和卡片本身渲染磨砂，其余区域一律完全透明。
  3. **清空回收站 FFI**：在 Rust 侧通过 FFI 绑定 `SHEmptyRecycleBinW`，一键真实清理 Windows 物理回收站。
  4. **只展示真实数据**：剪贴板列表只保留系统实时复制的历史记录（废弃 presetData 中的假数据），快速启动直接拉起真实的系统应用。
  5. **自定义按键监听与录入**：
     - 在 Rust 的全局 `rdev::grab` 线程中增加“录入状态锁（`is_recording`）”。
     - 开启录入时，捕获用户的下一次 `ButtonPress` 或 `KeyPress`，提取其键码/按键名并写入配置文件。
     - 在常态下，读取配置文件，动态比对当前物理输入事件，符合设定按键则唤起菜单并拦截默认动作，其余按键透传。

---

## 涉及修改/新增文件概览

### [Component: Backend] (Rust)

#### [MODIFY] [lib.rs](file:///e:/Projects/Rust/MouseRadialAssistant/src-tauri/src/lib.rs)
- 增加自定义快捷键（`SummonKey`）枚举及本地持久化读取。
- 增加 `start_recording_key` Command。
- 改造 `rdev::grab` 线程：
  - 录入模式下：捕获物理按键后向前端 `emit("key_recorded")` 并更新配置，重置状态。
  - 触发模式下：动态与配置 of `SummonKey` 进行比对，匹配成功则执行窗口唤出与定位。

---

### [Component: Frontend] (React)

#### [MODIFY] [App.tsx](file:///e:/Projects/Rust/MouseRadialAssistant/src/App.tsx)
- 废弃多余的预设列表，仅传递必要的基础菜单选项（快速启动、剪贴板历史、系统监控、清空回收站）。

#### [MODIFY] [MouseRadialAssistant.tsx](file:///e:/Projects/Rust/MouseRadialAssistant/src/components/MouseRadialAssistant.tsx)
- 彻底删去 `activeModal === 'cmd'`、配置中心、模拟回收站清理面板、下载监控模块等前端展示相关的冗余代码。
- 只渲染精简 of 4 个真实核心选项，并使未激活时背景完全透明，防穿透矩形精准贴合菜单与卡片。

#### [MODIFY] [DetailCard.tsx](file:///e:/Projects/Rust/MouseRadialAssistant/src/components/DetailCard.tsx)
- 精简化重构：仅保留快速启动、剪贴板历史、系统监视这三个子卡片，砍掉下载任务栏、配置中心等无实际用处的前端交互。
- 在“偏好设置”卡片中，渲染“当前唤起按键”状态展示，并提供“点击修改”按钮。绑定事件，监听并显示录入中的倒计时与录取成功后的新按键名。

---

## 详细实施步骤

### 阶段一：Rust 后端清空回收站与自定义按键保存功能开发
1. 在 `lib.rs` 引入 `shell32` FFI，实现物理回收站清空。
2. 定义 `SummonKey` 枚举：支持鼠标（如 `MouseButton 4`）与键盘（如 `F1`, `F4`, `Space` 等）。
3. 增加 `start_recording_key` 触发函数。当调用时，将 `region.is_recording` 设为 `true`。
4. 改造 `rdev::grab` 监听器：
   - 若处于 `is_recording = true` 状态，捕获下一次键盘 `KeyPress(key)` 或是鼠标 `ButtonPress(btn)` 动作：
     - 解析得到可读的按键名。
     - 通过 `window.emit("key_recorded", key_name)` 推送前端。
     - 更新 `summon_key`，写入本地配置文件 `assistant_config.json` 归档。
     - 恢复 `is_recording = false`。
     - 返回 `None` 吞掉该事件。
   - 若处于常态，比对物理按键是否匹配 `summon_key`，匹配则唤起窗口并返回 `None`，不匹配则返回 `Some(event)` 正常派发。

### 阶段二：前端 React 无效高保真 Mock 代码彻底剔除
1. 重写 `DetailCard.tsx`，将冗余的网页下载管理等部分剔除。
2. 重写 `MouseRadialAssistant.tsx`，删除 CMD 控制台表单及配套状态、配置弹窗组件。
3. 提供 4 项主菜单：快速启动、剪贴板历史、系统监视、一键物理清空回收站。
4. 在详情卡片的设置页，增加自定义按键设置板块，实现真实按键录入响应。

### 阶段三：编译与运行测试
1. 运行 `npm run build` 和 `npx tauri build` 进行打包。
2. 物理验证侧键唤起、空白区点击一次穿透、真实清空回收站、真实剪贴历史的可用性，以及点击修改快捷键进入监听并录入生效的功能。
