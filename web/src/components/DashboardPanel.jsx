import React from 'react';
import { HardDrive, FolderOpen, Activity, Globe } from 'lucide-react';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B';
  if (!bytes) return '--';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function DashboardPanel({
  freeSpace,
  totalSpace,
  downloadDir,
  tasks,
  showToast
}) {
  const handleOpenDir = async () => {
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
  };

  const downloadingCount = tasks.filter(t => t.status === 'downloading').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const finishedCount = tasks.filter(t => t.status === 'finished').length;

  return (
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
          onClick={handleOpenDir}
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
              {downloadingCount}
            </span>
          </div>
          <div className="mini-stat-item">
            <span className="stat-label">队列中</span>
            <span className="stat-number warning">
              {pendingCount}
            </span>
          </div>
          <div className="mini-stat-item">
            <span className="stat-label">已完成</span>
            <span className="stat-number success">
              {finishedCount}
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
  );
}
