import os
import sys
import json
import re
import time
import random
import uuid
import threading
from http.server import SimpleHTTPRequestHandler, HTTPServer
import socketserver

# Force standard streams to use UTF-8 on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure local yt_dlp is in the import path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Global task storage
TASKS = {}
TASKS_LOCK = threading.Lock()

def clean_log_msg(msg):
    msg = msg.rstrip()
    if not msg:
        return ""
    # Strip ANSI escape sequences (terminal formatting/colors)
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', msg)

class TaskLogger:
    def __init__(self, task_id):
        self.task_id = task_id
        
    def debug(self, msg):
        msg = clean_log_msg(msg)
        if msg:
            with TASKS_LOCK:
                if self.task_id in TASKS:
                    # Ignore extremely repetitive debug messages to avoid bloat
                    if "fragment" in msg.lower() and len(TASKS[self.task_id]['logs']) > 0 and "fragment" in TASKS[self.task_id]['logs'][-1].lower():
                        TASKS[self.task_id]['logs'][-1] = msg
                    else:
                        TASKS[self.task_id]['logs'].append(msg)
        
    def warning(self, msg):
        msg = clean_log_msg(msg)
        if msg:
            with TASKS_LOCK:
                if self.task_id in TASKS:
                    TASKS[self.task_id]['logs'].append(f"[WARNING] {msg}")
        
    def error(self, msg):
        msg = clean_log_msg(msg)
        if msg:
            with TASKS_LOCK:
                if self.task_id in TASKS:
                    TASKS[self.task_id]['logs'].append(f"[ERROR] {msg}")

def make_progress_hook(task_id):
    def progress_hook(d):
        with TASKS_LOCK:
            if task_id not in TASKS:
                return
            task = TASKS[task_id]
            
        if task['cancel_requested']:
            from yt_dlp.utils import DownloadCancelled
            raise DownloadCancelled('Cancelled by user')
            
        if d['status'] == 'downloading':
            filename = os.path.basename(d.get('filename', ''))
            filepath = d.get('filename', '')
            downloaded = d.get('downloaded_bytes', 0)
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            
            percent = 0.0
            if total > 0:
                percent = min(100.0, round((downloaded / total) * 100, 1))
                
            speed = d.get('speed')
            eta = d.get('eta')
            
            with TASKS_LOCK:
                if task_id in TASKS:
                    TASKS[task_id].update({
                        'status': 'downloading',
                        'filename': filename,
                        'filepath': filepath,
                        'downloaded_bytes': downloaded,
                        'total_bytes': total,
                        'percent': percent,
                        'speed': speed,
                        'eta': eta
                    })
                    
        elif d['status'] == 'finished':
            filename = os.path.basename(d.get('filename', ''))
            filepath = d.get('filename', '')
            with TASKS_LOCK:
                if task_id in TASKS:
                    TASKS[task_id].update({
                        'filename': filename,
                        'filepath': filepath,
                        'percent': 100.0
                    })
    return progress_hook

def download_worker(task_id, urls, cookie_data, cookies_from_browser, download_dir):
    with TASKS_LOCK:
        if task_id in TASKS:
            TASKS[task_id]['status'] = 'downloading'
            
    cookie_file_path = None
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp')
    
    try:
        if cookie_data and cookie_data.strip():
            os.makedirs(temp_dir, exist_ok=True)
            cookie_file_path = os.path.join(temp_dir, f'cookies_{task_id}.txt')
            with open(cookie_file_path, 'w', encoding='utf-8') as f:
                f.write(cookie_data)
                
        import yt_dlp
        
        # Base options
        ydl_opts = {
            'progress_hooks': [make_progress_hook(task_id)],
            'logger': TaskLogger(task_id),
            'noprogress': True,
            'ignoreerrors': True,
            'js_runtimes': {'node': {}, 'deno': {}},
        }
        
        if cookies_from_browser:
            # cookiesfrombrowser requires a tuple (browser_name, profile, keyring, container)
            ydl_opts['cookiesfrombrowser'] = (cookies_from_browser.lower(),)
            with TASKS_LOCK:
                if task_id in TASKS:
                    TASKS[task_id]['logs'].append(f"[info] Configured to extract cookies from browser: {cookies_from_browser}")
        elif cookie_file_path:
            ydl_opts['cookiefile'] = cookie_file_path
            
        target_dir = download_dir.strip() if download_dir else os.getcwd()
        ydl_opts['outtmpl'] = os.path.join(target_dir, '%(title)s.%(ext)s')
        
        # Safe check to log startup info
        with TASKS_LOCK:
            TASKS[task_id]['logs'].append(f"[info] Preparing to download to directory: {target_dir}")
            
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            for idx, url in enumerate(urls):
                with TASKS_LOCK:
                    if TASKS[task_id]['cancel_requested']:
                        break
                    TASKS[task_id]['current_url_index'] = idx + 1
                    TASKS[task_id]['logs'].append(f"[info] Starting URL {idx + 1}/{len(urls)}: {url}")
                
                ydl.download([url])
                
        with TASKS_LOCK:
            if TASKS[task_id]['cancel_requested']:
                TASKS[task_id]['status'] = 'cancelled'
                TASKS[task_id]['logs'].append("[info] Download cancelled.")
            else:
                TASKS[task_id]['status'] = 'finished'
                TASKS[task_id]['percent'] = 100.0
                TASKS[task_id]['logs'].append("[info] Download completed successfully.")
                
    except Exception as e:
        # Check if it was cancelled
        is_cancelled = False
        with TASKS_LOCK:
            if TASKS[task_id]['cancel_requested']:
                is_cancelled = True
                
        with TASKS_LOCK:
            if is_cancelled:
                TASKS[task_id]['status'] = 'cancelled'
                TASKS[task_id]['logs'].append("[info] Download cancelled.")
            else:
                TASKS[task_id]['status'] = 'error'
                TASKS[task_id]['error'] = str(e)
                TASKS[task_id]['logs'].append(f"[ERROR] Task failed: {str(e)}")
    finally:
        # Clean up temporary cookie file
        if cookie_file_path and os.path.exists(cookie_file_path):
            try:
                os.remove(cookie_file_path)
            except Exception:
                pass

class WebHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Route static requests to the 'web' subfolder
        root = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web')
        relative_path = path.lstrip('/')
        # Security check: prevent directory traversal
        clean_path = os.path.normpath(relative_path)
        if clean_path.startswith("..") or os.path.isabs(clean_path):
            return os.path.join(root, 'index.html')
            
        if not relative_path or relative_path == '/':
            relative_path = 'index.html'
            
        target = os.path.join(root, relative_path)
        # Fallback to index.html if file doesn't exist (SPA routing style)
        if not os.path.exists(target):
            return os.path.join(root, 'index.html')
        return target

    def do_OPTIONS(self):
        # Support CORS pre-flight requests
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/download':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                urls = data.get('urls', [])
                cookie_data = data.get('cookie_data', '')
                cookies_from_browser = data.get('cookies_from_browser', '')
                download_dir = data.get('download_dir', '')
                
                if not urls or not isinstance(urls, list):
                    self.send_json_response({"success": False, "error": "没有提供视频链接"}, 400)
                    return
                
                urls = [u.strip() for u in urls if u.strip()]
                if not urls:
                    self.send_json_response({"success": False, "error": "无效的视频链接"}, 400)
                    return
                
                task_id = f"task_{int(time.time())}_{random.randint(1000, 9999)}"
                with TASKS_LOCK:
                    TASKS[task_id] = {
                        'id': task_id,
                        'urls': urls,
                        'status': 'pending',
                        'percent': 0.0,
                        'downloaded_bytes': 0,
                        'total_bytes': 0,
                        'speed': None,
                        'eta': None,
                        'filename': '',
                        'filepath': '',
                        'logs': [f"[info] 任务已创建，共 {len(urls)} 个链接。"],
                        'error': None,
                        'cancel_requested': False,
                        'current_url_index': 1,
                        'total_urls_count': len(urls),
                        'download_dir': download_dir
                    }
                
                t = threading.Thread(
                    target=download_worker,
                    args=(task_id, urls, cookie_data, cookies_from_browser, download_dir),
                    daemon=True
                )
                t.start()
                
                self.send_json_response({"success": True, "task_id": task_id})
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, 500)
                
        elif self.path.startswith('/api/task/') and self.path.endswith('/cancel'):
            parts = self.path.split('/')
            if len(parts) >= 5:
                task_id = parts[3]
                with TASKS_LOCK:
                    if task_id in TASKS:
                        TASKS[task_id]['cancel_requested'] = True
                        TASKS[task_id]['logs'].append("[info] 用户请求取消任务，正在中止...")
                        self.send_json_response({"success": True})
                    else:
                        self.send_json_response({"success": False, "error": "找不到该任务"}, 404)
            else:
                self.send_json_response({"success": False, "error": "无效的接口路径"}, 400)
                
        elif self.path.startswith('/api/task/') and self.path.endswith('/open'):
            parts = self.path.split('/')
            if len(parts) >= 5:
                task_id = parts[3]
                
                # Check task
                filepath = None
                download_dir = None
                with TASKS_LOCK:
                    if task_id in TASKS:
                        filepath = TASKS[task_id].get('filepath')
                        download_dir = TASKS[task_id].get('download_dir')
                
                if filepath or download_dir or task_id in TASKS:
                    open_path = None
                    if filepath and os.path.exists(filepath):
                        open_path = os.path.dirname(os.path.abspath(filepath))
                    elif download_dir and os.path.exists(download_dir):
                        open_path = download_dir
                    else:
                        open_path = os.getcwd()
                    
                    try:
                        # Open folder in Windows
                        os.startfile(open_path)
                        self.send_json_response({"success": True})
                    except Exception as e:
                        self.send_json_response({"success": False, "error": f"无法打开文件夹: {str(e)}"}, 500)
                else:
                    self.send_json_response({"success": False, "error": "找不到该任务"}, 404)
            else:
                self.send_json_response({"success": False, "error": "无效的接口路径"}, 400)
        else:
            self.send_response(404)
            self.end_headers()
            
    def do_GET(self):
        if self.path.startswith('/api/'):
            if self.path == '/api/tasks':
                with TASKS_LOCK:
                    tasks_list = list(TASKS.values())
                self.send_json_response(tasks_list)
            elif self.path.startswith('/api/task/'):
                parts = self.path.split('/')
                if len(parts) >= 4:
                    task_id = parts[3]
                    with TASKS_LOCK:
                        task = TASKS.get(task_id)
                    if task:
                        self.send_json_response(task)
                    else:
                        self.send_json_response({"error": "找不到该任务"}, 404)
                else:
                    self.send_json_response({"error": "无效的接口路径"}, 400)
            elif self.path == '/api/config':
                config = {
                    "default_download_dir": os.getcwd()
                }
                self.send_json_response(config)
            else:
                self.send_response(404)
                self.end_headers()
        else:
            super().do_GET()
            
    def send_json_response(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

class ThreadedHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
    daemon_threads = True

def run_server(port=8080):
    while port < 65535:
        try:
            server = ThreadedHTTPServer(('0.0.0.0', port), WebHandler)
            print(f"==================================================")
            print(f" yt-dlp GUI 控制台服务已成功启动！")
            print(f" 请使用浏览器打开以下链接：")
            print(f" --> http://localhost:{port} <--")
            print(f"==================================================")
            server.serve_forever()
            break
        except OSError as e:
            if e.errno == 98 or e.errno == 10048: # Port already in use
                print(f"端口 {port} 已被占用，尝试使用 {port + 1}...")
                port += 1
            else:
                raise e

if __name__ == '__main__':
    run_server()
