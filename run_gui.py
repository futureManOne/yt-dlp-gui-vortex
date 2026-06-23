import os
import sys
import time
import threading

if sys.platform == 'win32':
    # Hide console window on startup if packaged
    if getattr(sys, 'frozen', False):
        import ctypes
        whnd = ctypes.windll.kernel32.GetConsoleWindow()
        if whnd != 0:
            ctypes.windll.user32.ShowWindow(whnd, 0) # 0 = SW_HIDE

    if sys.stdout is None:
        class NullWriter:
            def write(self, x): pass
            def flush(self): pass
        sys.stdout = NullWriter()
    if sys.stderr is None:
        class NullWriter:
            def write(self, x): pass
            def flush(self): pass
        sys.stderr = NullWriter()

    # Log unhandled exceptions to a crash log file
    import traceback
    def handle_exception(exc_type, exc_value, exc_traceback):
        try:
            if getattr(sys, 'frozen', False):
                base_dir = os.path.dirname(sys.executable)
            else:
                base_dir = os.path.dirname(os.path.abspath(__file__))
            crash_log_path = os.path.join(base_dir, 'crash.log')
            with open(crash_log_path, 'a', encoding='utf-8') as f:
                f.write(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Uncaught Exception:\n")
                traceback.print_exception(exc_type, exc_value, exc_traceback, file=f)
        except Exception:
            pass
    sys.excepthook = handle_exception

import web_server

try:
    import webview
except ImportError:
    print("==================================================")
    print("错误: 未检测到 'pywebview' 库。")
    print("请使用以下命令安装依赖：")
    print("  .venv\\Scripts\\pip install pywebview")
    print("==================================================")
    input("按回车键退出...")
    sys.exit(1)

class Api:
    def __init__(self):
        self._window = None

    def set_window(self, window):
        self._window = window

    def select_folder(self, default_dir=""):
        if not self._window:
            return ""
        try:
            # Prefer webview.FileDialog.FOLDER if available
            from webview import FileDialog
            dialog_type = FileDialog.FOLDER
        except Exception:
            dialog_type = getattr(webview, 'FOLDER_DIALOG', 20)
            
        result = self._window.create_file_dialog(dialog_type, directory=default_dir)
        if result and len(result) > 0:
            return result[0]
        return ""

def launch_gui():
    # 1. 启动本地 web_server.py 作为后台线程
    port = 8000
    server_thread = threading.Thread(
        target=web_server.run_server,
        args=(port,),
        daemon=True
    )
    server_thread.start()

    # 2. 等待 web_server 绑定端口并启动成功
    # 检查 web_server.ACTIVE_PORT
    retries = 50
    while web_server.ACTIVE_PORT is None and retries > 0:
        time.sleep(0.1)
        retries -= 1

    if web_server.ACTIVE_PORT is None:
        print("Error: Cannot start backend server!")
        sys.exit(1)

    bound_port = web_server.ACTIVE_PORT
    print(f"Backend server started on port {bound_port}. Launching GUI client...")

    # 3. 创建桌面窗口并启动 (在 Windows 上使用 native WebView2/Edge)
    api = Api()
    window = webview.create_window(
        title="Vortex Downloader",
        url=f"http://127.0.0.1:{bound_port}",
        width=1024,
        height=768,
        min_size=(800, 600),
        resizable=True,
        js_api=api
    )
    api.set_window(window)
    webview.start()

if __name__ == '__main__':
    launch_gui()
