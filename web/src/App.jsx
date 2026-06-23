import React, { useState, useEffect, useRef } from 'react';

export default function App() {
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
        }
      } catch (err) {
        console.error('获取默认配置失败:', err);
        showToast('未能连接到后台服务器', 'error');
      }
    }
    fetchConfig();
  }, []);

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
        {/* Left column: Unified Sidebar */}
        <aside className="sidebar">
          {/* Brand Logo & Info */}
          <div className="brand-section">
            <div className="logo-area">
              <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 16.5V7.5L16 12L10 16.5Z"
                  fill="url(#logo-grad)"
                />
                <defs>
                  <linearGradient id="logo-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#00F2FE" />
                    <stop offset="1" stopColor="#4FACFE" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="logo-text">
                <h1>Vortex Downloader</h1>
                <p>React, 2.1.0</p>
              </div>
            </div>
          </div>

          {/* Section 1: URL Input & Action */}
          <div className="sidebar-section">
            <h2 className="section-title">
              <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              Add Video URL
            </h2>
            <div className="input-group" style={{ position: 'relative' }}>
              <textarea
                id="video-urls"
                placeholder="Paste Video Link here..."
                rows="4"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                style={{ paddingRight: urls ? '2.2rem' : '0.85rem' }}
              ></textarea>
              {urls && (
                <button
                  type="button"
                  className="btn-textarea-clear animate-hover"
                  onClick={() => setUrls('')}
                  title="Clear Input"
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '1.8rem',
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '0.85rem', height: '0.85rem' }}>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
            <div className="textarea-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-sec)', marginTop: '0.1rem', padding: '0 0.2rem' }}>
              <span>{urls.split('\n').map(u => u.trim()).filter(Boolean).length} links detected</span>
            </div>
            <div className="btn-group" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
              <button
                type="button"
                className="btn-primary animate-hover"
                onClick={handleParseVideo}
                disabled={isParsing || isSubmitting}
                style={{ width: '100%', padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.82rem', borderRadius: '0.375rem', minHeight: '2.5rem', margin: 0 }}
              >
                <span>{isParsing ? '解析中...' : '解析视频'}</span>
              </button>
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '0.85rem', height: '0.85rem' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Cookies Import (Collapsible) */}
          <div className="sidebar-section">
            <div className="accordion-header" onClick={() => setIsCookiesOpen(!isCookiesOpen)}>
              <h2 className="section-title">
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Cookies Import
              </h2>
              <svg className={`accordion-arrow ${isCookiesOpen ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>

            <div className={`accordion-content ${isCookiesOpen ? 'open' : ''}`}>
              <div className="cookie-status">
                Status: <span className={cookieFileInfo ? 'text-success' : 'text-mute'}>{cookieFileInfo ? 'Loaded' : 'Not Loaded'}</span>
              </div>
              <div
                className={`cookie-dropzone ${isDragOver ? 'dragover' : ''}`}
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
                  <div className="upload-placeholder">
                    <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <p className="primary-text">Import cookie file (txt/json)</p>
                  </div>
                ) : (
                  <div className="file-info-container">
                    <svg className="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <div className="file-meta">
                      <span className="file-name">{cookieFileInfo.name}</span>
                      <span className="file-size">{formatBytes(cookieFileInfo.size)}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-icon-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetCookieUpload();
                      }}
                      title="Remove Cookie"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="browser-cookie-divider">
                <span>or</span>
              </div>

              <div className="input-group">
                <select
                  id="cookies-browser"
                  value={cookiesBrowser}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCookiesBrowser(val);
                    saveSettingsSilent({ cookies_from_browser: val });
                  }}
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                >
                  <option value="">-- Extract cookies from browser --</option>
                  <option value="chrome">Google Chrome</option>
                  <option value="edge">Microsoft Edge</option>
                  <option value="firefox">Mozilla Firefox</option>
                  <option value="brave">Brave</option>
                  <option value="opera">Opera</option>
                  <option value="vivaldi">Vivaldi</option>
                  <option value="safari">Safari (macOS)</option>
                </select>
              </div>

              <button className="btn-outline" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                IMPORT
              </button>
            </div>
          </div>

          {/* Section 3: General Settings (Collapsible) */}
          <div className="sidebar-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div className="accordion-header" onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
              <h2 className="section-title">
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.5 1z"></path>
                </svg>
                General Settings
              </h2>
              <svg className={`accordion-arrow ${isSettingsOpen ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>

            <div className={`accordion-content ${isSettingsOpen ? 'open' : ''}`}>
              <div className="input-group">
                <label>Format</label>
                <select 
                  value={selectedFormat} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedFormat(val);
                    saveSettingsSilent({ format: val });
                  }}
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                >
                  <option value="mkv_mp4">MKV, MP4</option>
                  <option value="mp4">MP4 Only</option>
                  <option value="mkv">MKV Only</option>
                  <option value="mp3">MP3 Audio Only</option>
                </select>
              </div>

              {/* Quality settings removed - resolution is selected per-video on parse */}

              <div className="input-group">
                <label htmlFor="download-dir">Path</label>
                <div className="dir-input-wrapper">
                  <input
                    type="text"
                    id="download-dir"
                    value={downloadDir}
                    onChange={(e) => setDownloadDir(e.target.value)}
                    onBlur={(e) => {
                      saveSettingsSilent({ download_dir: e.target.value });
                    }}
                    placeholder="加载中..."
                    style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                  />
                  <button
                    type="button"
                    className="btn-secondary-small"
                    onClick={handleBrowseDir}
                    title="Select Folder"
                  >
                    选择
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-small"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/open-dir', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ dir: downloadDir }),
                        });
                        if (response.ok) {
                          const result = await response.json();
                          if (result.success) {
                            showToast('已在文件管理器中打开保存文件夹', 'success');
                          } else {
                            showToast(`打开失败: ${result.error}`, 'error');
                          }
                        } else {
                          showToast('目录不存在或无法打开', 'error');
                        }
                      } catch (err) {
                        showToast('网络连接错误', 'error');
                      }
                    }}
                    title="Open Folder"
                  >
                    打开
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-small"
                    onClick={() => {
                      setDownloadDir(defaultDownloadDir);
                      saveSettingsSilent({ download_dir: defaultDownloadDir });
                      showToast('已恢复默认下载目录', 'info');
                    }}
                    title="Restore Default"
                  >
                    默认
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right column: Main content area (Task monitor) */}
        <section className="main-content">
          <div className="main-header">
            <div className="main-title">
              <svg className="main-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Active Downloading Tasks</h2>
              <span className="task-count-badge">{visibleTasks.length} tasks</span>
            </div>
            <div className="header-actions">
              <button className="btn-icon-action" onClick={handleClearCompleted} title="Clear Records">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
              <button className="btn-icon-action" title="Share Tasks">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
              </button>
            </div>
          </div>

          <div className={`tasks-list scrollbar ${visibleTasks.length === 0 ? 'empty' : ''}`}>
            {visibleTasks.length === 0 ? (
              <div className="empty-state">
                <svg className="empty-icon animate-float" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <h3>No active downloads</h3>
                <p>Paste video links on the left and click start to download</p>
              </div>
            ) : (
              visibleTasks.map((task) => {
                // Status Badge translation
                let statusText = 'Pending';
                let statusClass = 'status-pending';
                let fillClass = 'primary'; // gradient blue/purple

                if (task.status === 'downloading') {
                  statusText = `Downloading ${task.current_url_index}/${task.total_urls_count}`;
                  statusClass = 'status-downloading';
                  fillClass = 'primary';
                } else if (task.status === 'finished') {
                  statusText = 'Completed';
                  statusClass = 'status-finished';
                  fillClass = 'success';
                } else if (task.status === 'cancelled') {
                  statusText = 'Cancelled';
                  statusClass = 'status-cancelled';
                  fillClass = 'neutral';
                } else if (task.status === 'error') {
                  statusText = 'Error';
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
                      {/* Left icon wrapper */}
                      <div className="video-icon-box">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polygon points="10 8 16 12 10 16 10 8"></polygon>
                        </svg>
                      </div>

                      <div className="task-title-area">
                        <span className="task-title" title={task.filename || task.urls[0]}>
                          {task.filename || task.urls[0]}
                        </span>
                        <span className="task-resolution">{task.resolution || 'Auto'}</span>
                      </div>
                      
                      {/* Right side stats row */}
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

                      {/* Logs Console accordion inline inside task stats right */}
                      <div className="log-accordion" style={{ flexGrow: 1, minWidth: '150px', marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="log-header" onClick={() => toggleLogAccordion(task.id)} style={{ flexGrow: 1 }}>
                          <span>Console Log</span>
                          <svg className={`log-arrow ${openLogIds.has(task.id) ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
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
                            title="Copy Logs"
                            style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'var(--text-sec)', border: 'none', cursor: 'pointer' }}
                          >
                            复制
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Console log content drop-down */}
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

                    {/* Action buttons inside each task card bottom left */}
                    <div className="task-actions">
                      {isFinished ? (
                        <>
                          <button className="circular-action-btn open-folder-btn" onClick={() => openTaskFolder(task.id)} title="Open Folder">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                            </svg>
                          </button>
                          <button
                            className="circular-action-btn delete-btn"
                            onClick={() => {
                              setClearedTaskIds((prev) => new Set([...prev, task.id]));
                              showToast('已隐藏任务卡片', 'info');
                            }}
                            title="Hide Card"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </>
                      ) : (
                        <button className="circular-action-btn cancel-btn" onClick={() => cancelTask(task.id)} title="Cancel Download">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type} show`}>
            {toast.type === 'success' ? (
              <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : toast.type === 'error' ? (
              <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            ) : (
              <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            )}
            <div className="toast-msg">{toast.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
