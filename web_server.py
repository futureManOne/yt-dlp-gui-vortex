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
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure local yt_dlp is in the import path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def get_config_dir():
    if getattr(sys, 'frozen', False):
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
    try:
        test_file = os.path.join(base_dir, '.vortex_write_test')
        with open(test_file, 'w') as f:
            f.write('1')
        os.remove(test_file)
        return base_dir
    except Exception:
        appdata = os.environ.get('APPDATA')
        if appdata:
            fallback = os.path.join(appdata, 'VortexDownloader')
            os.makedirs(fallback, exist_ok=True)
            return fallback
        return os.getcwd()

def get_config_path():
    return os.path.join(get_config_dir(), 'vortex_config.json')

def get_cookies_path():
    return os.path.join(get_config_dir(), 'vortex_cookies.txt')

def load_config():
    config_path = get_config_path()
    default_config = {
        "download_dir": os.getcwd(),
        "quality": "1080p",
        "format": "mkv_mp4",
        "cookies_from_browser": "",
        "cookie_file_info": None
    }
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if 'download_dir' in data:
                    default_config['download_dir'] = data['download_dir']
                if 'quality' in data:
                    default_config['quality'] = data['quality']
                if 'format' in data:
                    default_config['format'] = data['format']
                if 'cookies_from_browser' in data:
                    default_config['cookies_from_browser'] = data['cookies_from_browser']
                if 'cookie_file_info' in data:
                    default_config['cookie_file_info'] = data['cookie_file_info']
        except Exception as e:
            print(f"Error loading config: {e}")
    return default_config

def save_config(config_data):
    config_path = get_config_path()
    try:
        # Merge with existing config to preserve other keys
        current_config = load_config()
        current_config.update(config_data)
        
        # Ensure parent directories exist
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(current_config, f, ensure_ascii=False, indent=4)
        return True
    except Exception as e:
        print(f"Error saving config: {e}")
        return False

# Global task storage
TASKS = {}
TASKS_LOCK = threading.Lock()
ACTIVE_PORT = None

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

def save_error_log(task_id, target_dir, logs, error_msg=None):
    try:
        import datetime
        os.makedirs(target_dir, exist_ok=True)
        log_file_path = os.path.join(target_dir, 'yt-dlp-errors.log')
        
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        with open(log_file_path, 'a', encoding='utf-8') as f:
            f.write("\n" + "="*50 + "\n")
            f.write(f"Timestamp: {timestamp}\n")
            f.write(f"Task ID: {task_id}\n")
            if error_msg:
                f.write(f"Critical Error: {error_msg}\n")
            f.write("Logs Detail:\n")
            for line in logs:
                f.write(f"  {line}\n")
            f.write("="*50 + "\n")
    except Exception as e:
        print(f"Error writing task log to file: {e}")

def download_worker(task_id, urls, cookie_data, cookies_from_browser, download_dir, quality='1080p', format_sel='mkv_mp4', selected_height=None):
    target_dir = download_dir.strip() if download_dir else os.getcwd()
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
            'remote_components': ['ejs:github'],
        }
        
        # Check if a custom height (resolution) was selected via video parsing
        if selected_height is not None:
            selected_height = int(selected_height)
            if selected_height == 0:  # Audio Only
                ydl_opts['format'] = 'bestaudio/best'
                if format_sel == 'mp3':
                    ydl_opts['postprocessors'] = [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': '192',
                    }]
            else:
                if format_sel == 'mp4':
                    ydl_opts['format'] = f'bestvideo[ext=mp4][height={selected_height}]+bestaudio[ext=m4a]/best[ext=mp4][height={selected_height}]/best[height={selected_height}]'
                elif format_sel == 'mkv':
                    ydl_opts['format'] = f'bestvideo[height={selected_height}]+bestaudio/best[height={selected_height}]'
                    ydl_opts['merge_output_format'] = 'mkv'
                else: # mkv_mp4
                    ydl_opts['format'] = f'bestvideo[height={selected_height}]+bestaudio/best[height={selected_height}]'
        else:
            # Parse quality height limit (default fallback)
            height_limit = 1080
            if quality == '4K':
                height_limit = 2160
            elif quality == 'Ultra':
                height_limit = 1440
            elif quality == '1080p':
                height_limit = 1080
            elif quality == '720p':
                height_limit = 720

            # Parse format options
            if format_sel == 'mp3':
                ydl_opts['format'] = 'bestaudio/best'
                ydl_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }]
            elif format_sel == 'mp4':
                ydl_opts['format'] = f'bestvideo[ext=mp4][height<={height_limit}]+bestaudio[ext=m4a]/best[ext=mp4][height<={height_limit}]/best[height<={height_limit}]'
            elif format_sel == 'mkv':
                ydl_opts['format'] = f'bestvideo[height<={height_limit}]+bestaudio/best[height<={height_limit}]'
                ydl_opts['merge_output_format'] = 'mkv'
            else: # mkv_mp4
                ydl_opts['format'] = f'bestvideo[height<={height_limit}]+bestaudio/best[height<={height_limit}]'
        
        if cookies_from_browser:
            # cookiesfrombrowser requires a tuple (browser_name, profile, keyring, container)
            ydl_opts['cookiesfrombrowser'] = (cookies_from_browser.lower(),)
            with TASKS_LOCK:
                if task_id in TASKS:
                    TASKS[task_id]['logs'].append(f"[info] Configured to extract cookies from browser: {cookies_from_browser}")
        elif cookie_file_path:
            ydl_opts['cookiefile'] = cookie_file_path
            
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
                
                # Check for errors in logs when finished
                has_errors = any(("[ERROR]" in line or "error" in line.lower()) for line in TASKS[task_id]['logs'])
                if has_errors:
                    logs_copy = list(TASKS[task_id]['logs'])
                    save_error_log(task_id, target_dir, logs_copy, "Some videos failed to download")
                
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
                
                logs_copy = list(TASKS[task_id]['logs'])
                save_error_log(task_id, target_dir, logs_copy, str(e))
    finally:
        # Clean up temporary cookie file
        if cookie_file_path and os.path.exists(cookie_file_path):
            try:
                os.remove(cookie_file_path)
            except Exception:
                pass

class WebHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def translate_path(self, path):
        # Route static requests to the 'web/dist' subfolder
        root = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web', 'dist')
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
        if self.path == '/api/parse':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                url = data.get('url', '').strip()
                cookie_data = data.get('cookie_data', '')
                cookies_from_browser = data.get('cookies_from_browser', '')
                
                if not url:
                    self.send_json_response({"success": False, "error": "没有提供视频链接"}, 400)
                    return
                
                import yt_dlp
                
                # Setup temp cookie file if any
                cookie_file_path = None
                temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp')
                
                if cookie_data and cookie_data.strip():
                    os.makedirs(temp_dir, exist_ok=True)
                    cookie_file_path = os.path.join(temp_dir, f'cookies_parse_{int(time.time())}.txt')
                    with open(cookie_file_path, 'w', encoding='utf-8') as f:
                        f.write(cookie_data)
                        
                ydl_opts = {
                    'skip_download': True,
                    'ignoreerrors': False,
                    'js_runtimes': {'node': {}, 'deno': {}},
                    'remote_components': ['ejs:github'],
                }
                
                if cookies_from_browser:
                    ydl_opts['cookiesfrombrowser'] = (cookies_from_browser.lower(),)
                elif cookie_file_path:
                    ydl_opts['cookiefile'] = cookie_file_path
                    
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info_dict = ydl.extract_info(url, download=False)
                    
                # Clean up temporary cookie file
                if cookie_file_path and os.path.exists(cookie_file_path):
                    try:
                        os.remove(cookie_file_path)
                    except Exception:
                        pass
                
                # Process results
                formats = info_dict.get('formats', [])
                heights = set()
                for f in formats:
                    if f.get('vcodec') != 'none' and f.get('height'):
                        heights.add(int(f.get('height')))
                
                sorted_heights = sorted(list(heights), reverse=True)
                
                resolutions = []
                for h in sorted_heights:
                    label = f"{h}p"
                    if h == 2160:
                        label = "2160p (4K)"
                    elif h == 1440:
                        label = "1440p (2K)"
                    elif h == 1080:
                        label = "1080p (Full HD)"
                    elif h == 720:
                        label = "720p (HD)"
                    resolutions.append({"height": h, "label": label})
                
                resolutions.append({"height": 0, "label": "仅音频 (Audio Only)"})
                
                self.send_json_response({
                    "success": True,
                    "title": info_dict.get('title', 'Unknown Title'),
                    "thumbnail": info_dict.get('thumbnail', ''),
                    "duration": info_dict.get('duration', 0),
                    "resolutions": resolutions
                })
            except Exception as e:
                if 'cookie_file_path' in locals() and cookie_file_path and os.path.exists(cookie_file_path):
                    try:
                        os.remove(cookie_file_path)
                    except Exception:
                        pass
                self.send_json_response({"success": False, "error": str(e)}, 500)

        elif self.path == '/api/download':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                urls = data.get('urls', [])
                cookie_data = data.get('cookie_data', '')
                cookies_from_browser = data.get('cookies_from_browser', '')
                download_dir = data.get('download_dir', '')
                quality = data.get('quality', '1080p')
                format_sel = data.get('format', 'mkv_mp4')
                selected_height = data.get('selected_height', None)
                
                if not urls or not isinstance(urls, list):
                    self.send_json_response({"success": False, "error": "没有提供视频链接"}, 400)
                    return
                
                urls = [u.strip() for u in urls if u.strip()]
                if not urls:
                    self.send_json_response({"success": False, "error": "无效的视频链接"}, 400)
                    return
                
                resolution_label = "Auto"
                if selected_height is not None:
                    try:
                        h = int(selected_height)
                        if h == 0:
                            resolution_label = "音频 (Audio)"
                        else:
                            resolution_label = f"{h}p"
                    except ValueError:
                        pass
                else:
                    resolution_label = quality

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
                        'download_dir': download_dir,
                        'resolution': resolution_label
                    }
                
                t = threading.Thread(
                    target=download_worker,
                    args=(task_id, urls, cookie_data, cookies_from_browser, download_dir, quality, format_sel, selected_height),
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
        elif self.path == '/api/cookie':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                cookie_data = data.get('cookie_data', '')
                cookie_file_info = data.get('cookie_file_info', None)
                
                # Save cookie file content
                cookies_path = get_cookies_path()
                os.makedirs(os.path.dirname(cookies_path), exist_ok=True)
                with open(cookies_path, 'w', encoding='utf-8') as f:
                    f.write(cookie_data)
                
                # Save cookie metadata to config
                success = save_config({"cookie_file_info": cookie_file_info})
                self.send_json_response({"success": success})
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, 500)
                
        elif self.path == '/api/cookie/clear':
            try:
                cookies_path = get_cookies_path()
                if os.path.exists(cookies_path):
                    os.remove(cookies_path)
                success = save_config({"cookie_file_info": None})
                self.send_json_response({"success": success})
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, 500)

        elif self.path == '/api/open-dir':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                target_dir = data.get('dir', '').strip()
                if not target_dir:
                    target_dir = os.getcwd()
                
                if os.path.exists(target_dir):
                    os.startfile(target_dir)
                    self.send_json_response({"success": True})
                else:
                    self.send_json_response({"success": False, "error": "目录不存在"}, 400)
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, 500)

        elif self.path == '/api/config':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                cfg = {}
                if 'download_dir' in data:
                    cfg['download_dir'] = data.get('download_dir', '')
                if 'format' in data:
                    cfg['format'] = data.get('format', 'mkv_mp4')
                if 'cookies_from_browser' in data:
                    cfg['cookies_from_browser'] = data.get('cookies_from_browser', '')
                
                success = save_config(cfg)
                self.send_json_response({"success": success})
            except Exception as e:
                self.send_json_response({"success": False, "error": str(e)}, 500)
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
                cfg = load_config()
                cookie_data = ""
                cookies_path = get_cookies_path()
                if os.path.exists(cookies_path):
                    try:
                        with open(cookies_path, 'r', encoding='utf-8') as f:
                            cookie_data = f.read()
                    except Exception:
                        pass
                
                download_dir = cfg.get('download_dir', os.getcwd())
                free_space = None
                total_space = None
                try:
                    import shutil
                    if os.path.exists(download_dir):
                        total, used, free = shutil.disk_usage(download_dir)
                        free_space = free
                        total_space = total
                except Exception:
                    pass

                config = {
                    "default_download_dir": os.getcwd(),
                    "download_dir": download_dir,
                    "quality": cfg.get('quality', '1080p'),
                    "format": cfg.get('format', 'mkv_mp4'),
                    "cookies_from_browser": cfg.get('cookies_from_browser', ''),
                    "cookie_file_info": cfg.get('cookie_file_info', None),
                    "cookie_data": cookie_data,
                    "free_space": free_space,
                    "total_space": total_space
                }
                self.send_json_response(config)
            elif self.path.startswith('/api/select-dir'):
                from urllib.parse import urlparse, parse_qs
                query = parse_qs(urlparse(self.path).query)
                initial_dir = query.get('current', [''])[0]
                
                try:
                    import tkinter as tk
                    from tkinter import filedialog
                    
                    root = tk.Tk()
                    root.withdraw()
                    # Make sure the dialog is on top of other windows
                    root.attributes('-topmost', True)
                    
                    selected_dir = filedialog.askdirectory(
                        title="选择下载保存目录",
                        initialdir=initial_dir if initial_dir and os.path.exists(initial_dir) else os.getcwd()
                    )
                    root.destroy()
                    self.send_json_response({"success": True, "dir": selected_dir})
                except Exception as e:
                    self.send_json_response({"success": False, "error": str(e)}, 500)
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

def run_server(port=8000):
    global ACTIVE_PORT
    while port < 65535:
        try:
            server = ThreadedHTTPServer(('0.0.0.0', port), WebHandler)
            ACTIVE_PORT = port
            print(f"==================================================")
            print(f" yt-dlp GUI Server started successfully!")
            print(f" Please open the following URL in browser:")
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
