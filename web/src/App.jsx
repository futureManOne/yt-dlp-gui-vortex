import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Key, 
  Settings, 
  HardDrive, 
  Folder, 
  FileText, 
  Play, 
  Square, 
  Trash2, 
  FolderOpen, 
  Share2, 
  HelpCircle, 
  ExternalLink,
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Video, 
  Compass, 
  X, 
  Clock, 
  Plus, 
  Check, 
  AlertTriangle,
  Globe,
  Database,
  Terminal,
  ShieldCheck,
  Server
} from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('download'); // 'download' | 'cookies' | 'settings'

  // Config & Form State
  const [urls, setUrls] = useState('');
  const [downloadDir, setDownloadDir] = useState('');
  const [defaultDownloadDir, setDefaultDownloadDir] = useState('');
  const [cookiesBrowser, setCookiesBrowser] = useState('');
  const [cookieData, setCookieData] = useState('');
  const [cookieFileInfo, setCookieFileInfo] = useState(null); // { name, size }
  const [selectedQuality, setSelectedQuality] = useState('1080p'); // default quality selection
  const [selectedFormat, setSelectedFormat] = useState('mkv_mp4');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedInfo, setParsedInfo] = useState(null);
  const [selectedResolution, setSelectedResolution] = useState('');

  // Disk Space States
  const [freeSpace, setFreeSpace] = useState(null);
  const [totalSpace, setTotalSpace] = useState(null);

  // Sidebar Accordion States
  const [isCookiesOpen, setIsCookiesOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  // Drag over state for dropzone
  const [isDragOver, setIsDragOver] = useState(false);

  // Tasks State
  const [tasks, setTasks] = useState([]);
  const [clearedTaskIds, setClearedTaskIds] = useState(new Set());
  const [openLogIds, setOpenLogIds] = useState(new Set()); // Tracks expanded consoles

  // Toast State
  const [toasts, setToasts] = useState([]);

  // File Input Ref
  const fileInputRef = useRef(null);

  // Log containers scroll tracker
  const logContainersRef = useRef({});

  // Show toast notification helper
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 3.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Fetch configuration on mount
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          setDefaultDownloadDir(data.default_download_dir);
          setDownloadDir(data.download_dir || data.default_download_dir);
          setSelectedQuality(data.quality || '1080p');
          setSelectedFormat(data.format || 'mkv_mp4');
          if (data.cookies_from_browser) {
            setCookiesBrowser(data.cookies_from_browser);
          }
          if (data.cookie_file_info) {
            setCookieFileInfo(data.cookie_file_info);
          }
          if (data.cookie_data) {
            setCookieData(data.cookie_data);
          }
          if (data.free_space !== undefined) {
            setFreeSpace(data.free_space);
          }
          if (data.total_space !== undefined) {
            setTotalSpace(data.total_space);
          }
        }
      } catch (err) {
        console.error('获取默认配置失败:', err);
        showToast('未能连接到后台服务器', 'error');
      }
    }
    fetchConfig();
  }, []);

  // Poll disk space every 5 seconds
  useEffect(() => {
    let intervalId;
    async function fetchDiskSpace() {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          if (data.free_space !== undefined) setFreeSpace(data.free_space);
          if (data.total_space !== undefined) setTotalSpace(data.total_space);
        }
      } catch (err) {
        console.error('获取磁盘空间失败:', err);
      }
    }
    fetchDiskSpace();
    intervalId = setInterval(fetchDiskSpace, 5000);
    return () => clearInterval(intervalId);
  }, [downloadDir]);

  // Poll tasks progress every 800ms
  useEffect(() => {
    let intervalId;
    async function pollTasks() {
      try {
        const response = await fetch('/api/tasks');
        if (response.ok) {
          const fetchedTasks = await response.json();
          setTasks(fetchedTasks);
        }
      } catch (err) {
        console.error('轮询任务失败:', err);
      }
    }

    pollTasks();
    intervalId = setInterval(pollTasks, 800);

    return () => clearInterval(intervalId);
  }, []);

  // Scroll active logs to bottom when updated
  useEffect(() => {
    tasks.forEach((task) => {
      if (openLogIds.has(task.id) && logContainersRef.current[task.id]) {
        const el = logContainersRef.current[task.id];
        const isNearBottom = el.scrollHeight - el.clientHeight <= el.scrollTop + 50;
        if (isNearBottom || el.scrollTop === 0) {
          el.scrollTop = el.scrollHeight;
        }
      }
    });
  }, [tasks, openLogIds]);

  // Byte Formatter
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 B';
    if (!bytes) return '--';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Seconds Formatter
  const formatSeconds = (secs) => {
    if (secs === Infinity || isNaN(secs) || secs === null || secs === undefined) return '--';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Cookie Drag and Drop handlers
  const handleDragEnterOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleCookieDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      readCookieFile(files[0]);
    }
  };

  const handleCookieSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      readCookieFile(files[0]);
    }
  };

  const readCookieFile = (file) => {
    if (!file.name.toLowerCase().endsWith('.txt')) {
      showToast('只支持 .txt 格式的 Cookie 文件', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const fileInfo = { name: file.name, size: file.size };
      try {
        const response = await fetch('/api/cookie', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cookie_data: text,
            cookie_file_info: fileInfo
          })
        });
        if (response.ok) {
          setCookieData(text);
          setCookieFileInfo(fileInfo);
          showToast('Cookie 文件保存并载入成功', 'success');
        } else {
          showToast('保存 Cookie 到服务器失败', 'error');
        }
      } catch (err) {
        showToast('无法发送 Cookie 到服务器', 'error');
      }
    };
    reader.onerror = () => {
      showToast('无法读取文件内容', 'error');
      resetCookieUpload();
    };
    reader.readAsText(file);
  };

  const resetCookieUpload = async () => {
    try {
      const response = await fetch('/api/cookie/clear', { method: 'POST' });
      if (response.ok) {
        setCookieData('');
        setCookieFileInfo(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        showToast('已从服务器清除 Cookie', 'info');
      } else {
        showToast('清除服务器 Cookie 失败', 'error');
      }
    } catch (err) {
      showToast('无法请求服务器清除 Cookie', 'error');
    }
  };

  // Parse Video metadata and resolutions
  const handleParseVideo = async () => {
    const parsedUrls = urls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (parsedUrls.length === 0) {
      showToast('请输入视频链接进行解析', 'error');
      return;
    }
    if (parsedUrls.length > 1) {
      showToast('解析分辨率目前仅支持单个视频链接', 'warning');
      return;
    }

    setIsParsing(true);
    setParsedInfo(null);
    setSelectedResolution('');
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: parsedUrls[0],
          cookie_data: cookieData,
          cookies_from_browser: cookiesBrowser,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setParsedInfo({ ...result, url: parsedUrls[0] });
        if (result.resolutions && result.resolutions.length > 0) {
          setSelectedResolution(result.resolutions[0].height.toString());
        }
        showToast('视频解析成功', 'success');
      } else {
        showToast(result.error || '解析视频失败，请检查链接或网络', 'error');
      }
    } catch (err) {
      console.error('解析视频失败:', err);
      showToast('网络连接失败，请检查后端服务', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // Start Download trigger
  const handleStartDownload = async () => {
    const parsedUrls = urls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (parsedUrls.length === 0) {
      showToast('请输入至少一个视频链接', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        urls: parsedUrls,
        cookie_data: cookieData,
        cookies_from_browser: cookiesBrowser,
        download_dir: downloadDir,
        quality: selectedQuality,
        format: selectedFormat,
      };

      if (parsedInfo && parsedUrls.length === 1 && parsedInfo.url === parsedUrls[0]) {
        payload.selected_height = parseInt(selectedResolution);
      }

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        showToast('任务已成功发起到后台', 'success');
        setUrls(''); // Clean URL text area
        setParsedInfo(null);
        setSelectedResolution('');
      } else {
        showToast(result.error || '创建下载任务失败', 'error');
      }
    } catch (err) {
      console.error('提交任务失败:', err);
      showToast('网络连接失败，请检查后端服务', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel running task
  const cancelTask = async (taskId) => {
    try {
      const response = await fetch(`/api/task/${taskId}/cancel`, { method: 'POST' });
      if (response.ok) {
        showToast('已发送取消请求', 'info');
      } else {
        showToast('无法取消该任务', 'error');
      }
    } catch (err) {
      showToast('网络连接错误', 'error');
    }
  };

  // Open download folder in Explorer
  const openTaskFolder = async (taskId) => {
    try {
      const response = await fetch(`/api/task/${taskId}/open`, { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          showToast('已在文件管理器中打开保存文件夹', 'success');
        } else {
          showToast(`打开失败: ${result.error}`, 'error');
        }
      } else {
        showToast('服务器请求失败', 'error');
      }
    } catch (err) {
      showToast('网络连接错误', 'error');
    }
  };

  const saveSettingsSilent = async (newSettings) => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });
    } catch (err) {
      console.error('自动保存设置失败:', err);
    }
  };

  // Browse directory dialog
  const handleBrowseDir = async () => {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.select_folder) {
      try {
        const selected = await window.pywebview.api.select_folder(downloadDir || defaultDownloadDir);
        if (selected) {
          setDownloadDir(selected);
          saveSettingsSilent({ download_dir: selected });
          showToast(`已选择目录: ${selected}`, 'success');
        }
      } catch (err) {
        console.error('调用原生选择目录失败:', err);
        showToast('选择目录失败', 'error');
      }
    } else {
      try {
        const response = await fetch(`/api/select-dir?current=${encodeURIComponent(downloadDir || defaultDownloadDir)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.dir) {
            setDownloadDir(data.dir);
            saveSettingsSilent({ download_dir: data.dir });
            showToast(`已选择目录: ${data.dir}`, 'success');
          }
        } else {
          showToast('当前环境不支持弹窗选择目录，请手动输入路径', 'warning');
        }
      } catch (err) {
        showToast('当前环境不支持弹窗选择目录，请手动输入路径', 'warning');
      }
    }
  };

  // Save settings to persistent configuration
  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          download_dir: downloadDir,
          quality: selectedQuality,
          format: selectedFormat,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          showToast('设置保存成功', 'success');
        } else {
          showToast('保存设置失败', 'error');
        }
      } else {
        showToast('保存设置请求失败', 'error');
      }
    } catch (err) {
      console.error('保存设置失败:', err);
      showToast('网络连接失败，请检查后端服务', 'error');
    }
  };

  // Filter tasks that have not been manually hidden (cleared)
  const visibleTasks = tasks.filter((t) => !clearedTaskIds.has(t.id));

  // Hide completed/cancelled/error tasks from UI
  const handleClearCompleted = () => {
    let count = 0;
    tasks.forEach((task) => {
      const isFinished = ['finished', 'cancelled', 'error'].includes(task.status);
      if (isFinished && !clearedTaskIds.has(task.id)) {
        clearedTaskIds.add(task.id);
        count++;
      }
    });

    if (count > 0) {
      setClearedTaskIds(new Set(clearedTaskIds));
      showToast(`已隐藏 ${count} 个非活动任务卡片`, 'info');
    } else {
      showToast('没有可清除的非活动任务', 'info');
    }
  };

  // Toggle log accordion
  const toggleLogAccordion = (taskId) => {
    setOpenLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  return (
    <div className="app-container">
      <div className="stars-bg"></div>
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      {/* Main Grid Content */}
      <main className="app-content">
        {/* Far Left Navigation Sidebar Menu */}
        <nav className="nav-sidebar">
          <div className="nav-logo">
            <img src="/logo.png" className="logo-icon" alt="Logo" style={{ width: '2.2rem', height: '2.2rem', borderRadius: '50%', objectFit: 'cover' }} />
          </div>
          <div className="nav-menu">
            <button
              type="button"
              className={`nav-item ${activeTab === 'download' ? 'active' : ''}`}
              onClick={() => setActiveTab('download')}
              title="视频下载"
            >
              <Download size={20} />
              <span className="nav-label">下载</span>
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'cookies' ? 'active' : ''}`}
              onClick={() => setActiveTab('cookies')}
              title="凭证导入"
            >
              <Key size={20} />
              <span className="nav-label">凭证</span>
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
              title="设置"
            >
              <Settings size={20} />
              <span className="nav-label">设置</span>
            </button>
          </div>
          <div className="nav-footer">
            <HelpCircle size={18} className="nav-help-icon" title="使用说明" />
          </div>
        </nav>

        {/* Conditional layouts based on activeTab */}
        {activeTab === 'download' && (
          <>
            {/* Middle column: URL Input Sidebar */}
            <aside className="sidebar">
              {/* Brand Logo & Info */}
              <div className="brand-section">
                <div className="logo-area" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src="/logo.png" className="brand-logo" alt="Logo" style={{ width: '2rem', height: '2rem', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(0, 242, 254, 0.3)' }} />
                  <div className="logo-text">
                    <h1>Vortex Downloader</h1>
                    <p>视频解析与下载</p>
                  </div>
                </div>
              </div>

              {/* Section 1: URL Input & Action */}
              <div className="sidebar-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <h2 className="section-title">
                  <Video size={16} className="section-icon" />
                  添加视频链接
                </h2>
                <div className="input-group" style={{ position: 'relative' }}>
                  <textarea
                    id="video-urls"
                    placeholder="在此输入视频链接，支持一行一个链接..."
                    rows="8"
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                    style={{ paddingRight: urls ? '2.2rem' : '0.85rem' }}
                  ></textarea>
                  {urls && (
                    <button
                      type="button"
                      className="btn-textarea-clear animate-hover"
                      onClick={() => setUrls('')}
                      title="清除输入"
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '0.5rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-mute)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.25rem',
                        borderRadius: '50%',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="textarea-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-sec)', marginTop: '0.1rem', padding: '0 0.2rem' }}>
                  <span>检测到 {urls.split('\n').map(u => u.trim()).filter(Boolean).length} 个链接</span>
                </div>
                <div className="btn-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn-primary animate-hover"
                    onClick={handleParseVideo}
                    disabled={isParsing || isSubmitting}
                    style={{ width: '100%', padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.82rem', borderRadius: '0.375rem', minHeight: '2.5rem', margin: 0 }}
                  >
                    <span>{isParsing ? '解析中...' : '解析视频 (单链接)'}</span>
                  </button>
                  
                  {/* Shortcut to start downloading immediately without parsing first, which is great for batch downloads */}
                  {!parsedInfo && (
                    <button
                      type="button"
                      className="btn-outline animate-hover"
                      onClick={handleStartDownload}
                      disabled={isSubmitting || isParsing}
                      style={{ width: '100%', padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.82rem', borderRadius: '99px', minHeight: '2.5rem', margin: 0 }}
                    >
                      <span>直接开始下载</span>
                      <Download size={14} />
                    </button>
                  )}
                </div>

                {parsedInfo && (
                  <div className="parsed-preview-card animate-float" style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      {parsedInfo.thumbnail && (
                        <img src={parsedInfo.thumbnail} alt="thumbnail" style={{ width: '80px', height: '45px', objectFit: 'cover', borderRadius: '0.25rem', border: '1px solid rgba(255, 255, 255, 0.1)' }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }} title={parsedInfo.title}>
                          {parsedInfo.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '0.15rem' }}>
                          时长: {Math.floor(parsedInfo.duration / 60)}分{parsedInfo.duration % 60}秒
                        </div>
                      </div>
                    </div>
                    <div className="input-group" style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', display: 'block' }}>选择分辨率</label>
                      <select
                        value={selectedResolution}
                        onChange={(e) => setSelectedResolution(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem', width: '100%', borderRadius: '0.25rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', outline: 'none' }}
                      >
                        {parsedInfo.resolutions && parsedInfo.resolutions.map((r) => (
                          <option key={r.height} value={r.height.toString()} style={{ background: '#18181b' }}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="btn-primary animate-hover"
                      id="btn-start-download"
                      onClick={handleStartDownload}
                      disabled={isSubmitting || isParsing}
                      style={{ width: '100%', margin: 0, padding: '0.55rem', fontSize: '0.82rem', borderRadius: '0.375rem', minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                    >
                      <span>{isSubmitting ? '提交中...' : '开始下载'}</span>
                      <Download size={14} />
                    </button>
                  </div>
                )}
              </div>
            </aside>

            {/* Right layout: split into Tasks and Dashboard Sidebar */}
            <div className="main-layout-container">
              {/* Tasks list section */}
              <section className="main-content">
                <div className="main-header">
                  <div className="main-title">
                    <Activity size={18} className="main-icon" />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>下载任务列表</h2>
                    <span className="task-count-badge">{visibleTasks.length} 个任务</span>
                  </div>
                  <div className="header-actions">
                    <button className="btn-icon-action" onClick={handleClearCompleted} title="清理已完成任务">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className={`tasks-list scrollbar ${visibleTasks.length === 0 ? 'empty' : ''}`}>
                  {visibleTasks.length === 0 ? (
                    <div className="empty-state">
                      <Download size={48} className="empty-icon animate-float" />
                      <h3>暂无下载任务</h3>
                      <p>在左侧输入视频链接，然后开始下载吧</p>
                    </div>
                  ) : (
                    visibleTasks.map((task) => {
                      let statusText = '准备中';
                      let statusClass = 'status-pending';
                      let fillClass = 'primary';

                      if (task.status === 'downloading') {
                        statusText = `正在下载 ${task.current_url_index}/${task.total_urls_count}`;
                        statusClass = 'status-downloading';
                        fillClass = 'primary';
                      } else if (task.status === 'finished') {
                        statusText = '已完成';
                        statusClass = 'status-finished';
                        fillClass = 'success';
                      } else if (task.status === 'cancelled') {
                        statusText = '已取消';
                        statusClass = 'status-cancelled';
                        fillClass = 'neutral';
                      } else if (task.status === 'error') {
                        statusText = '出错了';
                        statusClass = 'status-error';
                        fillClass = 'danger';
                      }

                      const isFinished = ['finished', 'cancelled', 'error'].includes(task.status);
                      const formattedSpeed = task.speed ? `${(task.speed / (1024 * 1024)).toFixed(1)} MB/s` : '--';
                      const formattedEta = task.eta ? formatSeconds(task.eta) : '--';
                      const formattedSize = task.total_bytes ? formatBytes(task.total_bytes) : '--';
                      const formattedDownloaded = task.downloaded_bytes ? formatBytes(task.downloaded_bytes) : '0 B';

                      return (
                        <div key={task.id} className={`task-card glass-card ${task.status}`} id={`task-${task.id}`}>
                          <div className="task-header">
                            <div className="video-icon-box">
                              <Video size={16} />
                            </div>

                            <div className="task-title-area">
                              <span className="task-title" title={task.filename || task.urls[0]}>
                                {task.filename || task.urls[0]}
                              </span>
                              <span className="task-resolution">{task.resolution || 'Auto'}</span>
                              <span className={`status-badge-tag ${statusClass}`}>{statusText}</span>
                            </div>
                            
                            <div className="task-header-right">
                              <span className={`progress-percent ${fillClass}`}>{task.percent.toFixed(0)}%</span>
                              <span className="task-timer">{formattedEta}</span>
                            </div>
                          </div>

                          <div className="progress-container">
                            <div className="progress-track">
                              <div className={`progress-fill ${fillClass}`} style={{ width: `${task.percent}%` }}></div>
                            </div>
                          </div>

                          <div className="task-stats">
                            <div className="stat-item">
                              <span className="stat-value">{formattedDownloaded} / {formattedSize}</span>
                            </div>
                            <div className="stat-item" style={{ marginLeft: 'auto' }}>
                              <span className="stat-value speed-value">{formattedSpeed}</span>
                            </div>

                            <div className="log-accordion" style={{ flexGrow: 1, minWidth: '150px', marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div className="log-header" onClick={() => toggleLogAccordion(task.id)} style={{ flexGrow: 1 }}>
                                <Terminal size={12} style={{ marginRight: '4px' }} />
                                <span>日志控制台</span>
                                <ChevronDown size={14} className={`log-arrow ${openLogIds.has(task.id) ? 'open' : ''}`} />
                              </div>
                              {task.logs && task.logs.length > 0 && (
                                <button
                                  type="button"
                                  className="btn-text"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const text = task.logs.join('\n');
                                    navigator.clipboard.writeText(text)
                                      .then(() => showToast('日志已复制到剪贴板', 'success'))
                                      .catch(() => showToast('复制失败', 'error'));
                                  }}
                                  title="复制日志"
                                  style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'var(--text-sec)', border: 'none', cursor: 'pointer' }}
                                >
                                  复制
                                </button>
                              )}
                            </div>
                          </div>

                          <div className={`log-content ${openLogIds.has(task.id) ? 'open' : ''}`}>
                            <div
                              className="log-console scrollbar"
                              ref={(el) => (logContainersRef.current[task.id] = el)}
                            >
                              {task.logs && task.logs.map((line, idx) => {
                                let logType = 'info';
                                if (line.includes('[WARNING]')) logType = 'warning';
                                else if (line.includes('[ERROR]')) logType = 'error';

                                return (
                                  <div key={idx} className={`log-line ${logType}`}>
                                    {line}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="task-actions">
                            {isFinished ? (
                              <>
                                <button className="circular-action-btn open-folder-btn" onClick={() => openTaskFolder(task.id)} title="打开所在文件夹">
                                  <FolderOpen size={14} />
                                </button>
                                <button
                                  className="circular-action-btn delete-btn"
                                  onClick={() => {
                                    setClearedTaskIds((prev) => new Set([...prev, task.id]));
                                    showToast('已隐藏任务卡片', 'info');
                                  }}
                                  title="隐藏卡片"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : (
                              <button className="circular-action-btn cancel-btn" onClick={() => cancelTask(task.id)} title="取消下载">
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Right column dashboard stats and site grid */}
              <aside className="dashboard-sidebar">
                {/* 1. Storage gauge card */}
                <div className="dashboard-card glass-card">
                  <div className="card-header-with-icon">
                    <HardDrive size={18} className="card-title-icon" />
                    <h3>存储空间</h3>
                  </div>
                  {totalSpace ? (
                    <div className="storage-gauge">
                      <div className="gauge-stats">
                        <span className="gauge-free">{formatBytes(freeSpace)} 可用</span>
                        <span className="gauge-total">共 {formatBytes(totalSpace)}</span>
                      </div>
                      <div className="gauge-bar-track">
                        <div 
                          className="gauge-bar-fill" 
                          style={{ 
                            width: `${((totalSpace - freeSpace) / totalSpace * 100).toFixed(1)}%` 
                          }}
                        ></div>
                      </div>
                      <div className="gauge-percent-text">
                        已使用 {((totalSpace - freeSpace) / totalSpace * 100).toFixed(0)}%
                      </div>
                    </div>
                  ) : (
                    <div className="storage-loading">
                      正在获取磁盘空间信息...
                    </div>
                  )}
                  <button 
                    type="button" 
                    className="btn-outline-small"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/open-dir', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ dir: downloadDir })
                        });
                        if (response.ok) {
                          showToast('已在文件管理器中打开保存文件夹', 'success');
                        }
                      } catch (err) {
                        showToast('无法打开目录', 'error');
                      }
                    }}
                  >
                    <FolderOpen size={12} />
                    <span>打开下载目录</span>
                  </button>
                </div>

                {/* 2. Download summary statistics */}
                <div className="dashboard-card glass-card">
                  <div className="card-header-with-icon">
                    <Activity size={18} className="card-title-icon" />
                    <h3>任务统计</h3>
                  </div>
                  <div className="stats-mini-grid">
                    <div className="mini-stat-item">
                      <span className="stat-label">进行中</span>
                      <span className="stat-number primary">
                        {tasks.filter(t => t.status === 'downloading').length}
                      </span>
                    </div>
                    <div className="mini-stat-item">
                      <span className="stat-label">队列中</span>
                      <span className="stat-number warning">
                        {tasks.filter(t => t.status === 'pending').length}
                      </span>
                    </div>
                    <div className="mini-stat-item">
                      <span className="stat-label">已完成</span>
                      <span className="stat-number success">
                        {tasks.filter(t => t.status === 'finished').length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Supported Websites Guide Grid */}
                <div className="dashboard-card glass-card">
                  <div className="card-header-with-icon">
                    <Globe size={18} className="card-title-icon" />
                    <h3>支持的热门网站</h3>
                  </div>
                  <p className="card-subtitle-guide">点击前往对应平台获取链接：</p>
                  <div className="site-guide-grid">
                    <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="site-tile yt-tile animate-hover">
                      <span className="site-dot"></span>
                      YouTube
                    </a>
                    <a href="https://www.bilibili.com" target="_blank" rel="noopener noreferrer" className="site-tile bili-tile animate-hover">
                      <span className="site-dot"></span>
                      Bilibili
                    </a>
                    <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" className="site-tile tiktok-tile animate-hover">
                      <span className="site-dot"></span>
                      TikTok
                    </a>
                    <a href="https://www.douyin.com" target="_blank" rel="noopener noreferrer" className="site-tile douyin-tile animate-hover">
                      <span className="site-dot"></span>
                      抖音
                    </a>
                    <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="site-tile x-tile animate-hover">
                      <span className="site-dot"></span>
                      Twitter / X
                    </a>
                    <a href="https://www.weibo.com" target="_blank" rel="noopener noreferrer" className="site-tile weibo-tile animate-hover">
                      <span className="site-dot"></span>
                      微博
                    </a>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}

        {/* Cookies Import View */}
        {activeTab === 'cookies' && (
          <div className="content-board cookies-board glass-card">
            <div className="board-header">
              <ShieldCheck size={28} className="board-header-icon" />
              <div>
                <h2>凭证管理 (Cookies Import)</h2>
                <p>导入 Cookies 可用于下载仅关注、仅会员、私密或限制级别的视频。</p>
              </div>
            </div>

            <div className="board-body-grid">
              <div className="board-main-panel">
                <div className="cookie-status-bar">
                  <span>当前状态:</span>
                  <span className={`status-badge-text ${cookieFileInfo ? 'success' : 'mute'}`}>
                    {cookieFileInfo ? `已载入 (${cookieFileInfo.name})` : '未加载任何凭证文件'}
                  </span>
                </div>

                <div
                  className={`cookie-dropzone-large ${isDragOver ? 'dragover' : ''}`}
                  onDragEnter={handleDragEnterOver}
                  onDragOver={handleDragEnterOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleCookieDrop}
                >
                  <input
                    type="file"
                    id="cookie-file"
                    accept=".txt"
                    className={`file-input ${cookieFileInfo ? 'hidden' : ''}`}
                    ref={fileInputRef}
                    onChange={handleCookieSelect}
                  />
                  
                  {!cookieFileInfo ? (
                    <div className="upload-placeholder-large">
                      <FileText size={48} className="upload-icon-large" />
                      <h3>拖拽 Netscape 格式的 cookies.txt 文件到这里</h3>
                      <p>或者点击此区域浏览本地文件进行导入</p>
                      <span className="file-limits-tip">仅支持扩展名为 .txt 的文件</span>
                    </div>
                  ) : (
                    <div className="file-info-container-large">
                      <FileText size={48} className="file-icon-large" />
                      <div className="file-meta-large">
                        <span className="file-name">{cookieFileInfo.name}</span>
                        <span className="file-size">大小: {formatBytes(cookieFileInfo.size)}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-danger-large animate-hover"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetCookieUpload();
                        }}
                      >
                        <Trash2 size={16} />
                        <span>清除凭证</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="board-sidebar-panel">
                <div className="sidebar-group-card">
                  <h4>从浏览器自动提取 (推荐)</h4>
                  <p className="card-note">可直接提取当前浏览器中已登录 of Cookie 授权信息：</p>
                  <div className="input-group" style={{ marginTop: '0.75rem' }}>
                    <select
                      id="cookies-browser"
                      value={cookiesBrowser}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCookiesBrowser(val);
                        saveSettingsSilent({ cookies_from_browser: val });
                      }}
                    >
                      <option value="">-- 选择提取源浏览器 --</option>
                      <option value="chrome">Google Chrome</option>
                      <option value="edge">Microsoft Edge</option>
                      <option value="firefox">Mozilla Firefox</option>
                      <option value="brave">Brave</option>
                      <option value="opera">Opera</option>
                      <option value="vivaldi">Vivaldi</option>
                      <option value="safari">Safari (macOS)</option>
                    </select>
                  </div>
                  {cookiesBrowser && (
                    <div className="browser-extract-alert">
                      <Check size={12} className="alert-check-icon" />
                      <span>下载时将尝试自动从 <strong>{cookiesBrowser}</strong> 提取凭证</span>
                    </div>
                  )}
                </div>

                <div className="sidebar-group-card info-card">
                  <h4>什么是 Cookies 凭证文件？</h4>
                  <p>当视频资源需要登录才能访问时（如 Bilibili 限制级别视频、YouTube 会员专属视频），您可以使用浏览器插件（如 <em>Get cookies.txt LOCALLY</em>）将当前登录凭证导出为 Netscape 格式的文本，并在此页面导入。</p>
                  <p style={{ marginTop: '0.5rem', color: '#ffc107', fontSize: '0.75rem' }}>
                    ⚠️ 请勿向他人分享您的 cookies 文件，其中包含您的账号安全令牌！
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* General Settings View */}
        {activeTab === 'settings' && (
          <div className="content-board settings-board glass-card">
            <div className="board-header">
              <Settings size={28} className="board-header-icon" />
              <div>
                <h2>通用设置</h2>
                <p>在这里配置您的全局下载路径、文件保存格式以及默认视频质量偏好。</p>
              </div>
            </div>

            <div className="settings-body-container">
              <div className="settings-section-card">
                <h3><Folder size={16} className="title-sub-icon" /> 保存目录设置</h3>
                <div className="settings-row">
                  <div className="input-field-group">
                    <label htmlFor="download-dir">默认下载保存目录</label>
                    <div className="dir-input-row">
                      <input
                        type="text"
                        id="download-dir"
                        value={downloadDir}
                        onChange={(e) => setDownloadDir(e.target.value)}
                        onBlur={(e) => saveSettingsSilent({ download_dir: e.target.value })}
                        placeholder="加载中..."
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleBrowseDir}
                      >
                        <FolderOpen size={14} />
                        <span>浏览选择</span>
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/open-dir', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ dir: downloadDir }),
                            });
                            if (response.ok) {
                              showToast('已在文件管理器中打开保存文件夹', 'success');
                            }
                          } catch (err) {
                            showToast('无法打开目录', 'error');
                          }
                        }}
                      >
                        <span>打开目录</span>
                      </button>
                      <button
                        type="button"
                        className="btn-outline-small-gray"
                        onClick={() => {
                          setDownloadDir(defaultDownloadDir);
                          saveSettingsSilent({ download_dir: defaultDownloadDir });
                          showToast('已恢复默认下载目录', 'info');
                        }}
                      >
                        <span>恢复默认</span>
                      </button>
                    </div>
                    <span className="input-tip">
                      提示：下载好的视频将自动以 "[视频标题].[扩展名]" 命名规则保存在此目录下。
                    </span>
                  </div>
                </div>
              </div>

              <div className="settings-section-card">
                <h3><FileText size={16} className="title-sub-icon" /> 编码与合并格式</h3>
                <div className="settings-row flex-row">
                  <div className="input-field-group flex-1">
                    <label>保存封装格式</label>
                    <select 
                      value={selectedFormat} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedFormat(val);
                        saveSettingsSilent({ format: val });
                      }}
                    >
                      <option value="mkv_mp4">自动合并最高音视频质量 (MKV/MP4)</option>
                      <option value="mp4">强制转换为 MP4 格式 (兼容性好)</option>
                      <option value="mkv">保留为 MKV 封装 (支持高级音轨/字幕)</option>
                      <option value="mp3">提取纯音频为 MP3 格式 (192kbps)</option>
                    </select>
                    <span className="input-tip">
                      注：使用纯音频下载时，系统将调用 FFmpeg 提取高品质音轨。
                    </span>
                  </div>

                  <div className="input-field-group flex-1">
                    <label>未解析时的默认画质偏好</label>
                    <select
                      value={selectedQuality}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedQuality(val);
                        saveSettingsSilent({ quality: val });
                      }}
                    >
                      <option value="4K">4K Ultra HD (最高支持 2160p)</option>
                      <option value="Ultra">2K QHD (最高支持 1440p)</option>
                      <option value="1080p">Full HD (最高支持 1080p)</option>
                      <option value="720p">HD (最高支持 720p)</option>
                    </select>
                    <span className="input-tip">
                      如果在视频解析面板未手动选择画质，将以此偏好自动匹配最优画质。
                    </span>
                  </div>
                </div>
              </div>

              <div className="settings-footer-actions">
                <button
                  type="button"
                  className="btn-primary animate-hover"
                  onClick={handleSaveSettings}
                  style={{ width: 'auto', padding: '0.75rem 2.5rem', borderRadius: '99px' }}
                >
                  <Check size={16} />
                  <span>保存设置并生效</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type} show`}>
            {toast.type === 'success' ? (
              <Check className="toast-icon" size={16} />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="toast-icon" size={16} />
            ) : (
              <HelpCircle className="toast-icon" size={16} />
            )}
            <div className="toast-msg">{toast.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
