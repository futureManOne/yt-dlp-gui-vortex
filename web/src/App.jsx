import React, { useState, useEffect, useRef } from 'react';
import { Check, AlertTriangle, HelpCircle } from 'lucide-react';

import Navigation from './components/Navigation';
import DownloadPanel from './components/DownloadPanel';
import TasksPanel from './components/TasksPanel';
import DashboardPanel from './components/DashboardPanel';
import CookiesPanel from './components/CookiesPanel';
import SettingsPanel from './components/SettingsPanel';

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

  // Drag over state for dropzone
  const [isDragOver, setIsDragOver] = useState(false);

  // Tasks State
  const [tasks, setTasks] = useState([]);
  const [clearedTaskIds, setClearedTaskIds] = useState(new Set());
  const [openLogIds, setOpenLogIds] = useState(new Set()); // Tracks expanded consoles

  // Toast State
  const [toasts, setToasts] = useState([]);

  // Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('vortex-theme') || 'cyber';
  });

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
    <div className={`app-container theme-${theme}`}>
      <div className="stars-bg"></div>
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      {/* Main Grid Content */}
      <main className="app-content">
        {/* Navigation Sidebar */}
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Conditional layouts based on activeTab */}
        {activeTab === 'download' && (
          <>
            {/* Middle column: URL Input Panel */}
            <DownloadPanel
              urls={urls}
              setUrls={setUrls}
              isParsing={isParsing}
              isSubmitting={isSubmitting}
              handleParseVideo={handleParseVideo}
              handleStartDownload={handleStartDownload}
              parsedInfo={parsedInfo}
              selectedResolution={selectedResolution}
              setSelectedResolution={setSelectedResolution}
            />

            {/* Right layout: Tasks queue and Stats panel */}
            <div className="main-layout-container">
              <TasksPanel
                visibleTasks={visibleTasks}
                handleClearCompleted={handleClearCompleted}
                openLogIds={openLogIds}
                toggleLogAccordion={toggleLogAccordion}
                logContainersRef={logContainersRef}
                showToast={showToast}
                openTaskFolder={openTaskFolder}
                cancelTask={cancelTask}
                setClearedTaskIds={setClearedTaskIds}
              />
              
              <DashboardPanel
                freeSpace={freeSpace}
                totalSpace={totalSpace}
                downloadDir={downloadDir}
                tasks={tasks}
                showToast={showToast}
              />
            </div>
          </>
        )}

        {/* Cookies Import View */}
        {activeTab === 'cookies' && (
          <CookiesPanel
            cookieFileInfo={cookieFileInfo}
            isDragOver={isDragOver}
            handleDragEnterOver={handleDragEnterOver}
            handleDragLeave={handleDragLeave}
            handleCookieDrop={handleCookieDrop}
            fileInputRef={fileInputRef}
            handleCookieSelect={handleCookieSelect}
            resetCookieUpload={resetCookieUpload}
            cookiesBrowser={cookiesBrowser}
            setCookiesBrowser={setCookiesBrowser}
            saveSettingsSilent={saveSettingsSilent}
          />
        )}

        {/* General Settings View */}
        {activeTab === 'settings' && (
          <SettingsPanel
            downloadDir={downloadDir}
            setDownloadDir={setDownloadDir}
            defaultDownloadDir={defaultDownloadDir}
            selectedFormat={selectedFormat}
            setSelectedFormat={setSelectedFormat}
            selectedQuality={selectedQuality}
            setSelectedQuality={setSelectedQuality}
            handleBrowseDir={handleBrowseDir}
            handleSaveSettings={handleSaveSettings}
            saveSettingsSilent={saveSettingsSilent}
            showToast={showToast}
            theme={theme}
            setTheme={setTheme}
          />
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
