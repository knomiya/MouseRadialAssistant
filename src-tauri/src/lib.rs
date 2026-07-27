use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager, Emitter,
};
use std::sync::{Mutex, OnceLock, Arc};
use std::sync::atomic::{AtomicBool, Ordering};

use std::fs::File;
use std::io::{Read, Write};
use sysinfo::{System, Networks, Components};
use base64::Engine;

static APP_HANDLE: OnceLock<tauri::AppHandle> = OnceLock::new();
/// Cancel flag for pending hold-to-summon. Set true on ButtonRelease to cancel the pending spawn.
static SUMMON_CANCEL: OnceLock<Arc<AtomicBool>> = OnceLock::new();


#[repr(C)]
#[derive(Copy, Clone, Debug, serde::Serialize)]
pub struct POINT {
    pub x: i32,
    pub y: i32,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct WindowItem {
    pub hwnd: isize,
    pub title: String,
}

#[link(name = "kernel32")]
extern "system" {
    pub fn CreateMutexW(
        lpMutexAttributes: *mut std::ffi::c_void,
        bInitialOwner: i32,
        lpName: *const u16,
    ) -> *mut std::ffi::c_void;
    pub fn GetLastError() -> u32;
}

#[link(name = "shell32")]
extern "system" {
    pub fn ShellExecuteW(
        hwnd: *mut std::ffi::c_void,
        lpOperation: *const u16,
        lpFile: *const u16,
        lpParameters: *const u16,
        lpDirectory: *const u16,
        nShowCmd: i32,
    ) -> *mut std::ffi::c_void;

    pub fn SHEmptyRecycleBinW(
        hwnd: *mut std::ffi::c_void,
        pszRootPath: *const u16,
        dwFlags: u32,
    ) -> i32;
}

#[link(name = "user32")]
extern "system" {
    pub fn GetCursorPos(lpPoint: *mut POINT) -> i32;
    pub fn IsWindowVisible(hwnd: *mut std::ffi::c_void) -> i32;
    pub fn GetWindowLongW(hwnd: *mut std::ffi::c_void, nIndex: i32) -> i32;
    pub fn GetWindowTextLengthW(hwnd: *mut std::ffi::c_void) -> i32;
    pub fn GetWindowTextW(hwnd: *mut std::ffi::c_void, lpString: *mut u16, nMaxCount: i32) -> i32;
    pub fn GetWindowThreadProcessId(hwnd: *mut std::ffi::c_void, lpdwProcessId: *mut u32) -> u32;
    pub fn GetWindow(hwnd: *mut std::ffi::c_void, uCmd: u32) -> *mut std::ffi::c_void;
    pub fn SetForegroundWindow(hwnd: *mut std::ffi::c_void) -> i32;
    pub fn ShowWindow(hwnd: *mut std::ffi::c_void, nCmdShow: i32) -> i32;
    pub fn EnumWindows(
        lpEnumFunc: extern "system" fn(hwnd: *mut std::ffi::c_void, lparam: isize) -> i32,
        lparam: isize,
    ) -> i32;
    pub fn PostMessageW(
        hwnd: *mut std::ffi::c_void,
        msg: u32,
        wparam: usize,
        lparam: isize,
    ) -> i32;
    pub fn GetForegroundWindow() -> *mut std::ffi::c_void;
}

#[link(name = "kernel32")]
extern "system" {
    pub fn OpenProcess(dwDesiredAccess: u32, bInheritHandle: i32, dwProcessId: u32) -> *mut std::ffi::c_void;
    pub fn CloseHandle(hObject: *mut std::ffi::c_void) -> i32;
    pub fn QueryFullProcessImageNameW(
        hProcess: *mut std::ffi::c_void,
        dwFlags: u32,
        lpExeName: *mut u16,
        lpdwSize: *mut u32,
    ) -> i32;
}

const GWL_STYLE: i32 = -16;
const GWL_EXSTYLE: i32 = -20;
const WS_VISIBLE: i32 = 0x10000000;
const WS_EX_TOOLWINDOW: i32 = 0x00000080;
const GW_OWNER: u32 = 4;
const WM_CLOSE: u32 = 0x0010;

fn to_wide(s: &str) -> Vec<u16> {
    use std::os::windows::ffi::OsStrExt;
    std::ffi::OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
}

extern "system" fn enum_windows_callback(hwnd: *mut std::ffi::c_void, lparam: isize) -> i32 {
    unsafe {
        let list_ptr = lparam as *mut Vec<WindowItem>;
        if list_ptr.is_null() {
            return 1;
        }

        let current_pid = std::process::id();
        let mut win_pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut win_pid);
        if win_pid == current_pid {
            return 1;
        }

        let owner = GetWindow(hwnd, GW_OWNER);
        if owner != std::ptr::null_mut() {
            return 1;
        }

        if IsWindowVisible(hwnd) != 0 {
            let style = GetWindowLongW(hwnd, GWL_STYLE);
            let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);

            if (style & WS_VISIBLE) != 0 && (ex_style & WS_EX_TOOLWINDOW) == 0 {
                let text_len = GetWindowTextLengthW(hwnd);
                if text_len > 0 {
                    let mut buf = vec![0u16; (text_len + 1) as usize];
                    let len = GetWindowTextW(hwnd, buf.as_mut_ptr(), text_len + 1);
                    if len > 0 {
                        let title = String::from_utf16_lossy(&buf[..len as usize]);
                        let trimmed = title.trim();
                        
                        if !trimmed.is_empty()
                            && trimmed != "Program Manager"
                            && trimmed != "Mouse Radial Assistant"
                            && trimmed != "Radial Menu Implementation"
                            && trimmed != "设置"
                            && !trimmed.contains("NVIDIA")
                        {
                            (*list_ptr).push(WindowItem {
                                hwnd: hwnd as isize,
                                title: trimmed.to_string(),
                            });
                        }
                    }
                }
            }
        }
    }
    1
}

pub fn get_mouse_position() -> (i32, i32) {
    let mut point = POINT { x: 0, y: 0 };
    unsafe {
        GetCursorPos(&mut point);
    }
    (point.x, point.y)
}

/// Returns lowercase process name (basename without extension) of the foreground window.
pub fn get_foreground_process_name() -> String {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_null() {
            return String::new();
        }
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == 0 {
            return String::new();
        }
        const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;
        let hproc = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if hproc.is_null() {
            return String::new();
        }
        let mut buf = vec![0u16; 512];
        let mut size = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(hproc, 0, buf.as_mut_ptr(), &mut size);
        CloseHandle(hproc);
        if ok == 0 {
            return String::new();
        }
        let full_path = String::from_utf16_lossy(&buf[..size as usize]);
        // Extract basename without extension
        let basename = full_path
            .split(['\\', '/'])
            .last()
            .unwrap_or("")
            .to_lowercase();
        // Strip .exe suffix
        if let Some(stem) = basename.strip_suffix(".exe") {
            stem.to_string()
        } else {
            basename
        }
    }
}

/// Check if the foreground process matches any keyword in the whitelist (case-insensitive substring).
pub fn is_foreground_in_whitelist(whitelist: &[String]) -> bool {
    if whitelist.is_empty() {
        return false;
    }
    let proc_name = get_foreground_process_name();
    if proc_name.is_empty() {
        return false;
    }
    whitelist.iter().any(|kw| proc_name.contains(kw.to_lowercase().as_str()))
}


#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub enum SummonKey {
    Mouse(u8),
    Keyboard(String),
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AppConfig {
    pub name: String,
    pub path: String,
    pub app_type: Option<String>,
    pub browser: Option<String>,
    pub args: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct UserConfig {
    pub summon_key: SummonKey,
    pub apps: Vec<AppConfig>,
    pub radius: i32,
    pub node_size: Option<i32>,
    pub card_gap: Option<i32>,
    pub max_clipboard: usize,
    pub visible_monitors: Option<Vec<String>>,
    pub enabled_modules: Option<Vec<String>>,
    pub theme: Option<String>,
    pub monitor_order: Option<Vec<String>>,
    pub window_click_action: Option<String>,
    pub hotkey_whitelist: Option<Vec<String>>,
    pub hold_ms: Option<u64>,
}


struct ActiveRegion {
    center_x: i32,
    center_y: i32,
    is_active: bool,
    config: UserConfig,
    is_recording: bool,
    is_dialog_open: bool,
}

struct SystemState {
    sys: Mutex<System>,
    networks: Mutex<Networks>,
    region: Mutex<ActiveRegion>,
    last_clipboard: Mutex<String>,
}

fn load_config() -> UserConfig {
    if let Ok(mut file) = File::open("assistant_config.json") {
        let mut data = String::new();
        if file.read_to_string(&mut data).is_ok() {
            if let Ok(mut cfg) = serde_json::from_str::<UserConfig>(&data) {
                // Protect against accidental left click (Mouse 1) saving
                if matches!(cfg.summon_key, SummonKey::Mouse(1)) {
                    cfg.summon_key = SummonKey::Mouse(4);
                }
                return cfg;
            }
        }
    }
    UserConfig {
        summon_key: SummonKey::Mouse(4),

        apps: vec![
            AppConfig {
                name: "命令行终端".to_string(),
                path: "powershell".to_string(),
                app_type: Some("app".to_string()),
                browser: None,
                args: None,
            },
        ],
        radius: 100,
        node_size: Some(44),
        card_gap: Some(30),
        max_clipboard: 20,
        visible_monitors: Some(vec![
            "cpu".to_string(),
            "mem".to_string(),
            "net".to_string(),
            "cpu_temp".to_string(),
            "gpu_temp".to_string(),
            "uptime".to_string(),
        ]),
        enabled_modules: Some(vec![
            "quick-start".to_string(),
            "clipboard".to_string(),
            "window-switch".to_string(),
            "sys-monitor".to_string(),
        ]),
        theme: Some("light".to_string()),
        monitor_order: Some(vec![
            "cpu".to_string(),
            "mem".to_string(),
            "net".to_string(),
            "cpu_temp".to_string(),
            "gpu_temp".to_string(),
            "uptime".to_string(),
        ]),
        window_click_action: Some("switch".to_string()),
        hotkey_whitelist: Some(vec![]),
        hold_ms: None,
    }
}


fn save_config(cfg: &UserConfig) {
    if let Ok(mut file) = File::create("assistant_config.json") {
        if let Ok(data) = serde_json::to_string(cfg) {
            let _ = file.write_all(data.as_bytes());
        }
    }
}

fn get_key_name(key: &SummonKey) -> String {
    match key {
        SummonKey::Mouse(1) => "鼠标左键".to_string(),
        SummonKey::Mouse(2) => "鼠标右键".to_string(),
        SummonKey::Mouse(3) => "鼠标中键".to_string(),
        SummonKey::Mouse(4) => "鼠标侧下键 (MouseButton 4)".to_string(),
        SummonKey::Mouse(5) => "鼠标侧上键 (MouseButton 5)".to_string(),
        SummonKey::Mouse(code) => format!("鼠标按键 {}", code),
        SummonKey::Keyboard(name) => {
            let clean_name = name.strip_prefix("Key").unwrap_or(name);
            match clean_name {
                "Space" => "空格键 (Space)".to_string(),
                "Tab" => "Tab 键".to_string(),
                "Return" => "回车键 (Enter)".to_string(),
                "Escape" => "Esc 键".to_string(),
                _ => clean_name.to_string(),
            }
        }
    }
}

fn get_summon_key_from_button(btn: rdev::Button) -> SummonKey {
    match btn {
        rdev::Button::Left => SummonKey::Mouse(1),
        rdev::Button::Right => SummonKey::Mouse(2),
        rdev::Button::Middle => SummonKey::Mouse(3),
        rdev::Button::Unknown(code) => SummonKey::Mouse(code),
    }
}

fn get_summon_key_from_key(key: rdev::Key) -> SummonKey {
    SummonKey::Keyboard(format!("{:?}", key))
}

/// Perform summon with Dynamic Bounding Box: size window to 820x700 to fit all cards and high DPI screens.
fn do_summon() {
    if let Some(handle) = APP_HANDLE.get() {
        let handle = handle.clone();
        tauri::async_runtime::spawn(async move {
            let state_c = handle.state::<SystemState>();
            if let Some(window) = handle.get_webview_window("main") {
                let (mx, my) = get_mouse_position();
                let scale_factor = window.scale_factor().unwrap_or(1.0);

                // Physical size of bounding box window (820x700 logical px)
                let win_w_logical = 820.0;
                let win_h_logical = 700.0;
                let win_w_phys = (win_w_logical * scale_factor) as i32;
                let win_h_phys = (win_h_logical * scale_factor) as i32;

                // Radial center offset inside window: X = 160px, Y = 350px
                let center_offset_x = (160.0 * scale_factor) as i32;
                let center_offset_y = (350.0 * scale_factor) as i32;

                // Get screen physical size
                let (screen_w, screen_h) = if let Ok(Some(monitor)) = window.primary_monitor() {
                    let s = monitor.size();
                    (s.width as i32, s.height as i32)
                } else {
                    (1920, 1080)
                };

                // Calculate window top-left physical position
                let mut win_x = mx - center_offset_x;
                let mut win_y = my - center_offset_y;

                // Clamp to screen bounds to prevent clipping
                win_x = win_x.clamp(0, (screen_w - win_w_phys).max(0));
                win_y = win_y.clamp(0, (screen_h - win_h_phys).max(0));

                // Relative radial disk center inside the bounding box window (logical px)
                let logical_rel_x = ((mx - win_x) as f64 / scale_factor) as i32;
                let logical_rel_y = ((my - win_y) as f64 / scale_factor) as i32;

                {
                    let mut r = state_c.region.lock().unwrap();
                    r.is_active = true;
                    r.center_x = mx;
                    r.center_y = my;
                }

                // Apply dynamic bounding window geometry
                window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: win_w_phys as u32,
                    height: win_h_phys as u32,
                })).ok();
                window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: win_x,
                    y: win_y,
                })).ok();

                // Exclude window from screen capture / screenshot tools
                #[cfg(target_os = "windows")]
                unsafe {
                    extern "system" {
                        fn SetWindowDisplayAffinity(hwnd: *mut std::ffi::c_void, dw_affinity: u32) -> i32;
                    }
                    if let Ok(hwnd) = window.hwnd() {
                        SetWindowDisplayAffinity(hwnd.0 as _, 0x00000011);
                    }
                }

                window.set_ignore_cursor_events(false).ok();
                window.show().unwrap();
                window.set_focus().unwrap();

                if let Some(clip_text) = read_clipboard_native() {
                    window.emit("clipboard_update", clip_text).ok();
                }
                window.emit("summon_menu", POINT { x: logical_rel_x, y: logical_rel_y }).unwrap();
            }
        });
    }
}

/// Perform summon at the exact center of primary monitor (used for System Tray click).
fn do_summon_at_center() {
    if let Some(handle) = APP_HANDLE.get() {
        let handle = handle.clone();
        tauri::async_runtime::spawn(async move {
            let state_c = handle.state::<SystemState>();
            if let Some(window) = handle.get_webview_window("main") {
                let scale_factor = window.scale_factor().unwrap_or(1.0);

                let win_w_logical = 820.0;
                let win_h_logical = 700.0;
                let win_w_phys = (win_w_logical * scale_factor) as i32;
                let win_h_phys = (win_h_logical * scale_factor) as i32;

                let (screen_w, screen_h) = if let Ok(Some(monitor)) = window.primary_monitor() {
                    let s = monitor.size();
                    (s.width as i32, s.height as i32)
                } else {
                    (1920, 1080)
                };

                let win_x = ((screen_w - win_w_phys) / 2).max(0);
                let win_y = ((screen_h - win_h_phys) / 2).max(0);

                let logical_rel_x = 160;
                let logical_rel_y = 350;

                {
                    let mut r = state_c.region.lock().unwrap();
                    r.is_active = true;
                    r.center_x = win_x + (160.0 * scale_factor) as i32;
                    r.center_y = win_y + (350.0 * scale_factor) as i32;
                }

                window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: win_w_phys as u32,
                    height: win_h_phys as u32,
                })).ok();
                window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: win_x,
                    y: win_y,
                })).ok();

                #[cfg(target_os = "windows")]
                unsafe {
                    extern "system" {
                        fn SetWindowDisplayAffinity(hwnd: *mut std::ffi::c_void, dw_affinity: u32) -> i32;
                    }
                    if let Ok(hwnd) = window.hwnd() {
                        SetWindowDisplayAffinity(hwnd.0 as _, 0x00000011);
                    }
                }

                window.set_ignore_cursor_events(false).ok();
                window.show().unwrap();
                window.set_focus().unwrap();



                if let Some(clip_text) = read_clipboard_native() {
                    window.emit("clipboard_update", clip_text).ok();
                }
                window.emit("summon_menu", POINT { x: logical_rel_x, y: logical_rel_y }).unwrap();
            }
        });
    }
}




fn read_clipboard_native() -> Option<String> {
    if let Ok(mut ctx) = arboard::Clipboard::new() {
        if let Ok(text) = ctx.get_text() {
            if !text.is_empty() {
                return Some(text);
            }
        }
        if let Ok(img) = ctx.get_image() {
            use image::{ImageBuffer, Rgba};
            let buffer: Option<ImageBuffer<Rgba<u8>, _>> = ImageBuffer::from_raw(img.width as u32, img.height as u32, img.bytes.into_owned());
            if let Some(buf) = buffer {
                let mut cursor = std::io::Cursor::new(Vec::new());
                if buf.write_to(&mut cursor, image::ImageFormat::Png).is_ok() {
                    let base64_str = base64::engine::general_purpose::STANDARD.encode(cursor.into_inner());
                    return Some(format!("data:image/png;base64,{}", base64_str));
                }
            }
        }
    }
    None
}

// Commands
#[tauri::command]
fn select_exe_file(window: tauri::Window, state: tauri::State<'_, SystemState>) -> Result<String, String> {
    {
        let mut reg = state.region.lock().unwrap();
        reg.is_dialog_open = true;
    }

    window.set_ignore_cursor_events(true).ok();

    let file = rfd::FileDialog::new()
        .add_filter("可执行程序/快捷方式", &["exe", "lnk", "bat", "cmd"])
        .pick_file();

    // Keep is_dialog_open=true; restore window immediately, then unlock after 600ms
    // to absorb the Focused(false) event Windows fires when the file dialog closes.
    {
        let mut reg = state.region.lock().unwrap();
        reg.is_active = true;
    }

    // Restore focus & visibility right away so the assistant stays visible.
    window.set_ignore_cursor_events(false).ok();
    window.show().ok();
    window.set_focus().ok();

    // Delayed unlock: give Windows 600ms to fire (and absorb) the Focused(false) event.
    let app_handle = window.app_handle().clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(600));
        let st = app_handle.state::<SystemState>();
        {
            let mut reg = st.region.lock().unwrap();
            reg.is_dialog_open = false;
        }
        if let Some(win) = app_handle.get_webview_window("main") {
            win.show().ok();
            win.set_focus().ok();
        }
    });

    if let Some(path) = file {
        Ok(path.to_string_lossy().to_string())
    } else {
        Err("取消选择".to_string())
    }
}

#[tauri::command]
fn set_auto_start(enable: bool) -> Result<(), String> {
    let hkcu = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
    let path = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
    let (key, _) = hkcu.create_subkey(path).map_err(|e| e.to_string())?;

    if enable {
        if let Ok(exe_path) = std::env::current_exe() {
            let exe_str = exe_path.to_string_lossy().to_string();
            let _ = key.set_value("MouseRadialAssistant", &exe_str);
        }
    } else {
        let _ = key.delete_value("MouseRadialAssistant");
    }
    Ok(())
}

#[tauri::command]
fn get_auto_start() -> Result<bool, String> {
    let hkcu = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
    let path = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
    if let Ok(key) = hkcu.open_subkey(path) {
        if let Ok(_val) = key.get_value::<String, _>("MouseRadialAssistant") {
            return Ok(true);
        }
    }
    Ok(false)
}

#[tauri::command]
fn launch_app(path: String, args: Option<String>) -> Result<(), String> {
    let clean_path = path.trim().to_string();
    if clean_path.is_empty() {
        return Err("启动路径为空！".to_string());
    }

    std::thread::spawn(move || {
        let is_cmd_or_ps = clean_path.eq_ignore_ascii_case("cmd")
            || clean_path.eq_ignore_ascii_case("powershell")
            || clean_path.eq_ignore_ascii_case("powershell.exe")
            || clean_path.eq_ignore_ascii_case("cmd.exe");

        let op_str = if is_cmd_or_ps { "runas" } else { "open" };
        let wide_open = to_wide(op_str);
        let wide_path = to_wide(&clean_path);
        let extra_args = args.unwrap_or_default();
        let wide_args = if !extra_args.trim().is_empty() {
            Some(to_wide(extra_args.trim()))
        } else {
            None
        };
        let ptr_args = match &wide_args {
            Some(v) => v.as_ptr(),
            None => std::ptr::null(),
        };

        unsafe {
            ShellExecuteW(
                std::ptr::null_mut(),
                wide_open.as_ptr(),
                wide_path.as_ptr(),
                ptr_args,
                std::ptr::null(),
                1, // SW_SHOWNORMAL
            );
        }
    });

    Ok(())
}

#[tauri::command]
fn get_user_config(state: tauri::State<'_, SystemState>) -> Result<UserConfig, String> {
    let reg = state.region.lock().unwrap();
    Ok(reg.config.clone())
}

#[tauri::command]
fn save_full_config(config: UserConfig, state: tauri::State<'_, SystemState>) -> Result<(), String> {
    let mut reg = state.region.lock().unwrap();
    reg.config = config.clone();
    save_config(&reg.config);
    Ok(())
}

/// Fetch real hardware temperature using WMI MSAcpi_ThermalZoneTemperature ACPI interface.
/// Returns -1.0 if not supported or permission denied (so frontend renders N/A with zero fake data).
fn get_wmi_acpi_temp() -> f32 {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let output = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", "Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue | Select-Object -ExpandProperty CurrentTemperature"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            for line in stdout.lines() {
                let trimmed = line.trim();
                if let Ok(val) = trimmed.parse::<f32>() {
                    if val > 2732.0 {
                        let celsius = (val - 2732.0) / 10.0;
                        if celsius > 0.0 && celsius < 115.0 {
                            return celsius;
                        }
                    }
                }
            }
        }
    }
    -1.0
}

#[tauri::command]
fn get_system_stats(state: tauri::State<'_, SystemState>) -> Result<(f32, f32, f32, f32, f32, f32, u64), String> {
    let mut sys = state.sys.lock().unwrap();
    sys.refresh_cpu();
    sys.refresh_memory();

    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let total_mem = sys.total_memory() as f32;
    let used_mem = sys.used_memory() as f32;
    let mem_usage = if total_mem > 0.0 { (used_mem / total_mem) * 100.0 } else { 0.0 };

    let mut networks = state.networks.lock().unwrap();
    networks.refresh();

    let mut total_transmitted: u64 = 0;
    let mut total_received: u64 = 0;

    for (_interface_name, network) in networks.iter() {
        total_transmitted += network.transmitted();
        total_received += network.received();
    }

    let upload_speed_kb = (total_transmitted as f32) / 1024.0;
    let download_speed_kb = (total_received as f32) / 1024.0;

    let components = Components::new_with_refreshed_list();
    let mut cpu_temp: f32 = -1.0;
    let mut gpu_temp: f32 = -1.0;

    for component in &components {
        let label = component.label().to_lowercase();
        let temp = component.temperature();
        if label.contains("cpu") || label.contains("core") || label.contains("package") {
            if temp > 0.0 && temp < 115.0 {
                cpu_temp = temp;
            }
        }
        if label.contains("gpu") || label.contains("nvidia") || label.contains("amd") {
            if temp > 0.0 && temp < 115.0 {
                gpu_temp = temp;
            }
        }
    }

    if cpu_temp < 0.0 {
        cpu_temp = get_wmi_acpi_temp();
    }

    let uptime_secs = System::uptime();

    Ok((cpu_usage, mem_usage, upload_speed_kb, download_speed_kb, cpu_temp, gpu_temp, uptime_secs))
}



#[tauri::command]
fn get_open_windows() -> Result<Vec<WindowItem>, String> {
    let mut list = Vec::new();
    let list_ptr = &mut list as *mut Vec<WindowItem> as isize;
    unsafe {
        EnumWindows(enum_windows_callback, list_ptr);
    }
    Ok(list)
}

#[tauri::command]
fn switch_to_window(hwnd: isize) -> Result<(), String> {
    let ptr = hwnd as *mut std::ffi::c_void;
    unsafe {
        ShowWindow(ptr, 9); // SW_RESTORE
        SetForegroundWindow(ptr);
    }
    Ok(())
}

#[tauri::command]
fn close_window_by_hwnd(hwnd: isize) -> Result<(), String> {
    let ptr = hwnd as *mut std::ffi::c_void;
    unsafe {
        PostMessageW(ptr, WM_CLOSE, 0, 0);
    }
    Ok(())
}

#[tauri::command]
fn write_clipboard(content: String) -> Result<(), String> {
    let mut ctx = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    if content.starts_with("data:image/") {
        if let Some(pos) = content.find(",") {
            let base64_data = &content[pos + 1..];
            if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(base64_data) {
                if let Ok(img) = image::load_from_memory(&bytes) {
                    let rgba = img.to_rgba8();
                    let img_data = arboard::ImageData {
                        width: rgba.width() as usize,
                        height: rgba.height() as usize,
                        bytes: std::borrow::Cow::Owned(rgba.into_raw()),
                    };
                    ctx.set_image(img_data).map_err(|e| e.to_string())?;
                    return Ok(());
                }
            }
        }
    }
    ctx.set_text(content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn empty_recycle_bin() -> Result<String, String> {
    let res = unsafe {
        SHEmptyRecycleBinW(std::ptr::null_mut(), std::ptr::null(), 7)
    };
    if res == 0 {
        Ok("回收站已成功清空！".to_string())
    } else {
        Ok("回收站已是清空状态".to_string())
    }
}

#[tauri::command]
fn start_recording_key(state: tauri::State<'_, SystemState>) -> Result<(), String> {
    let mut reg = state.region.lock().unwrap();
    reg.is_recording = true;
    Ok(())
}

#[tauri::command]
fn set_custom_summon_key(code: u8, state: tauri::State<'_, SystemState>) -> Result<String, String> {
    let mut reg = state.region.lock().unwrap();
    let new_key = SummonKey::Mouse(code);
    reg.is_recording = false;
    reg.config.summon_key = new_key.clone();
    save_config(&reg.config);

    let key_name = get_key_name(&new_key);
    if let Some(handle) = APP_HANDLE.get() {
        let name_c = key_name.clone();
        let handle_c = handle.clone();
        tauri::async_runtime::spawn(async move {
            if let Some(window) = handle_c.get_webview_window("main") {
                window.emit("key_recorded", name_c).ok();
            }
        });
    }
    Ok(key_name)
}




#[tauri::command]
fn get_current_summon_key(state: tauri::State<'_, SystemState>) -> Result<(String, String), String> {
    let reg = state.region.lock().unwrap();
    let name = get_key_name(&reg.config.summon_key);
    let key_type = match &reg.config.summon_key {
        SummonKey::Mouse(_) => "mouse".to_string(),
        SummonKey::Keyboard(_) => "keyboard".to_string(),
    };
    Ok((name, key_type))
}

#[tauri::command]
fn hide_window(window: tauri::Window, state: tauri::State<'_, SystemState>) -> Result<(), String> {
    {
        let mut reg = state.region.lock().unwrap();
        reg.is_active = false;
        reg.is_recording = false;
    }
    window.set_ignore_cursor_events(true).ok();
    // Collapse size to 0x0 so screen capture / screenshot tools won't detect any bounding box
    window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: 0, height: 0 })).ok();
    window.hide().map_err(|e| e.to_string())
}

fn get_favorites_dir() -> std::path::PathBuf {
    let dir = if let Ok(exe_path) = std::env::current_exe() {
        if let Some(d) = exe_path.parent() {
            d.join("favorites")
        } else {
            std::path::PathBuf::from("favorites")
        }
    } else {
        std::path::PathBuf::from("favorites")
    };
    if !dir.exists() {
        std::fs::create_dir_all(&dir).ok();
    }
    dir
}

fn get_favorites_file_path() -> std::path::PathBuf {
    get_favorites_dir().join("favorites.json")
}

#[tauri::command]
fn load_favorites() -> Result<Vec<serde_json::Value>, String> {
    let path = get_favorites_file_path();
    if path.exists() {
        if let Ok(content) = std::fs::read_to_string(path) {
            if let Ok(items) = serde_json::from_str::<Vec<serde_json::Value>>(&content) {
                return Ok(items);
            }
        }
    }
    Ok(Vec::new())
}

#[tauri::command]
fn save_favorite_image(base64_data: String) -> Result<String, String> {

    use base64::Engine;
    use std::time::{SystemTime, UNIX_EPOCH};

    let fav_dir = get_favorites_dir();
    if !fav_dir.exists() {
        std::fs::create_dir_all(&fav_dir).map_err(|e| e.to_string())?;
    }

    let clean_b64 = if let Some(pos) = base64_data.find(",") {
        &base64_data[pos + 1..]
    } else {
        &base64_data
    };

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(clean_b64)
        .map_err(|e| e.to_string())?;

    let filename = format!("fav_img_{}.png", SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis());
    let file_path = fav_dir.join(&filename);
    std::fs::write(&file_path, bytes).map_err(|e| e.to_string())?;

    Ok(format!("favorites/{}", filename))
}

#[tauri::command]
fn save_favorites(items: Vec<serde_json::Value>) -> Result<(), String> {
    let path = get_favorites_file_path();
    let json = serde_json::to_string_pretty(&items).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use std::os::windows::ffi::OsStrExt;
    let mutex_name: Vec<u16> = std::ffi::OsStr::new("Global\\MouseRadialAssistantSingleInstanceMutex")
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    unsafe {
        let handle = CreateMutexW(std::ptr::null_mut(), 1, mutex_name.as_ptr());
        if handle.is_null() || GetLastError() == 183 {
            std::process::exit(0);
        }
    }

    let system = System::new_all();
    let networks = Networks::new_with_refreshed_list();
    let user_cfg = load_config();
    let state = SystemState {
        sys: Mutex::new(system),
        networks: Mutex::new(networks),
        region: Mutex::new(ActiveRegion {
            center_x: 0,
            center_y: 0,
            is_active: false,
            config: user_cfg,
            is_recording: false,
            is_dialog_open: false,
        }),
        last_clipboard: Mutex::new(String::new()),
    };

    tauri::Builder::default()
        .manage(state)
        .plugin(tauri_plugin_log::Builder::default().build())
        .setup(|app| {
            APP_HANDLE.set(app.handle().clone()).ok();

            if let Some(window) = app.get_webview_window("main") {
                window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: 0, height: 0 })).ok();
                window.set_ignore_cursor_events(true).ok();
            }

            let quit_i = MenuItem::with_id(app, "quit", "退出程序", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "显示助手", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "hide", "隐藏助手", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_i, &hide_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            if let Some(window) = app.get_webview_window("main") {
                                window.set_ignore_cursor_events(true).ok();
                            }
                            app.exit(0);
                        }
                        "show" => {
                            do_summon_at_center();
                        }
                        "hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                window.set_ignore_cursor_events(true).ok();
                                window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: 0, height: 0 })).ok();
                                window.hide().unwrap();
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap() {
                                window.set_ignore_cursor_events(true).ok();
                                window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: 0, height: 0 })).ok();
                                window.hide().unwrap();
                            } else {
                                do_summon_at_center();
                            }
                        }
                    }
                })
                .build(app)?;











            // Start global mouse hook thread
            std::thread::spawn(move || {
                use rdev::{grab, EventType};

                if let Err(error) = grab(move |event| {
                    let app_handle = APP_HANDLE.get().expect("App handle not initialized");
                    let state = app_handle.state::<SystemState>();
                    
                    let mut reg = state.region.lock().unwrap();

                    if reg.is_recording {
                        let recorded_opt = match event.event_type {
                            EventType::KeyPress(key) => Some(get_summon_key_from_key(key)),
                            EventType::ButtonPress(btn) => {
                                let k = get_summon_key_from_button(btn);
                                // Ignore Left (1) and Right (2) clicks to prevent UI interaction interference
                                if matches!(k, SummonKey::Mouse(1) | SummonKey::Mouse(2)) {
                                    None
                                } else {
                                    Some(k)
                                }
                            }
                            _ => None,
                        };

                        if let Some(recorded_key) = recorded_opt {
                            reg.is_recording = false;
                            reg.config.summon_key = recorded_key.clone();
                            save_config(&reg.config);

                            let key_name = get_key_name(&recorded_key);
                            let handle = app_handle.clone();
                            tauri::async_runtime::spawn(async move {
                                if let Some(window) = handle.get_webview_window("main") {
                                    window.emit("key_recorded", key_name).ok();
                                }
                            });
                            return None;
                        }
                        return Some(event);
                    }

                    match event.event_type {
                        EventType::ButtonPress(button) => {
                            let current_key = get_summon_key_from_button(button);

                            let is_match = match (&current_key, &reg.config.summon_key) {
                                (SummonKey::Mouse(c1), SummonKey::Mouse(c2)) => {
                                    *c1 == *c2 || (*c2 >= 4 && (*c1 >= 4 || matches!(button, rdev::Button::Unknown(_))))
                                }
                                _ => false,
                            };

                            if is_match {
                                let whitelist = reg.config.hotkey_whitelist.clone().unwrap_or_default();
                                if is_foreground_in_whitelist(&whitelist) {
                                    return Some(event);
                                }
                                let hold_ms = reg.config.hold_ms.unwrap_or(0);
                                drop(reg); // release lock before spawning

                                if hold_ms == 0 {
                                    // Instant summon
                                    do_summon();
                                } else {
                                    // Hold-to-summon: reset cancel flag and wait hold_ms
                                    let cancel = SUMMON_CANCEL.get_or_init(|| Arc::new(AtomicBool::new(false))).clone();
                                    cancel.store(false, Ordering::SeqCst);
                                    std::thread::spawn(move || {
                                        std::thread::sleep(std::time::Duration::from_millis(hold_ms));
                                        if !cancel.load(Ordering::SeqCst) {
                                            do_summon();
                                        }
                                    });
                                }
                                return None; // intercept event
                            }
                            Some(event)
                        }

                        EventType::ButtonRelease(button) => {
                            // Cancel any pending hold-to-summon
                            let current_key = get_summon_key_from_button(button);
                            let is_match = match (&current_key, &reg.config.summon_key) {
                                (SummonKey::Mouse(c1), SummonKey::Mouse(c2)) => {
                                    *c1 == *c2 || (*c2 >= 4 && (*c1 >= 4 || matches!(button, rdev::Button::Unknown(_))))
                                }
                                _ => false,
                            };
                            if is_match {
                                if let Some(cancel) = SUMMON_CANCEL.get() {
                                    cancel.store(true, Ordering::SeqCst);
                                }
                            }
                            Some(event)
                        }



                        EventType::KeyPress(key) => {
                            let current_key = get_summon_key_from_key(key);

                            let is_match = match (&current_key, &reg.config.summon_key) {
                                (SummonKey::Keyboard(n1), SummonKey::Keyboard(n2)) => n1 == n2,
                                _ => false,
                            };

                            if is_match {
                                let whitelist = reg.config.hotkey_whitelist.clone().unwrap_or_default();
                                if is_foreground_in_whitelist(&whitelist) {
                                    return Some(event);
                                }
                                let hold_ms = reg.config.hold_ms.unwrap_or(0);
                                drop(reg);

                                if hold_ms == 0 {
                                    do_summon();
                                } else {
                                    let cancel = SUMMON_CANCEL.get_or_init(|| Arc::new(AtomicBool::new(false))).clone();
                                    cancel.store(false, Ordering::SeqCst);
                                    std::thread::spawn(move || {
                                        std::thread::sleep(std::time::Duration::from_millis(hold_ms));
                                        if !cancel.load(Ordering::SeqCst) {
                                            do_summon();
                                        }
                                    });
                                }
                                return None;
                            }
                            Some(event)
                        }

                        _ => Some(event),
                    }

                }) {
                    if let Some(handle) = APP_HANDLE.get() {
                        let handle = handle.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Some(window) = handle.get_webview_window("main") {
                                window.emit("debug_log", format!("[Mouse Hook Error] Grab failed: {:?}", error)).ok();
                            }
                        });
                    }
                }
            });

            // Start background clipboard monitor thread
            let app_handle_clip = app.handle().clone();
            std::thread::spawn(move || {
                let state = app_handle_clip.state::<SystemState>();

                loop {
                    std::thread::sleep(std::time::Duration::from_millis(500));
                    if let Some(text) = read_clipboard_native() {
                        let mut last = state.last_clipboard.lock().unwrap();
                        if *last != text {
                            *last = text.clone();
                            if let Some(window) = app_handle_clip.get_webview_window("main") {
                                window.emit("clipboard_update", text).ok();
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Focused(false) = event {
                if window.label() == "main" {
                    let state = window.state::<SystemState>();
                    let mut reg = state.region.lock().unwrap();

                    if reg.is_dialog_open {
                        return;
                    }

                    reg.is_active = false;
                    reg.is_recording = false;
                    window.set_ignore_cursor_events(true).ok();
                    window.hide().unwrap();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            launch_app,
            get_system_stats,
            write_clipboard,
            hide_window,
            empty_recycle_bin,
            start_recording_key,
            get_current_summon_key,
            set_custom_summon_key,
            get_user_config,

            save_full_config,
            select_exe_file,
            get_open_windows,
            switch_to_window,
            close_window_by_hwnd,
            set_auto_start,
            get_auto_start,
            load_favorites,
            save_favorites,
            save_favorite_image,
        ])
        .run(tauri::generate_context!())


        .expect("error while running tauri application");
}
