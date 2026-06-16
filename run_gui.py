import os
import sys
import time
import threading
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
        print("错误: 无法启动后台本地服务端口！")
        sys.exit(1)

    bound_port = web_server.ACTIVE_PORT
    print(f"后台服务已在端口 {bound_port} 启动。正在打开桌面客户端...")

    # 3. 创建桌面窗口并启动 (在 Windows 上使用 native WebView2/Edge)
    webview.create_window(
        title="yt-dlp 视频下载助手",
        url=f"http://127.0.0.1:{bound_port}",
        width=1024,
        height=768,
        min_size=(800, 600),
        resizable=True
    )
    webview.start()

if __name__ == '__main__':
    launch_gui()
