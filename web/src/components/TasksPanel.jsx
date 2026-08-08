import React from 'react';
import { 
  Activity, 
  Trash2, 
  Download, 
  Video, 
  Terminal, 
  ChevronDown, 
  FolderOpen, 
  X 
} from 'lucide-react';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B';
  if (!bytes) return '--';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

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

export default function TasksPanel({
  visibleTasks,
  handleClearCompleted,
  openLogIds,
  toggleLogAccordion,
  logContainersRef,
  showToast,
  openTaskFolder,
  cancelTask,
  setClearedTaskIds
}) {
  return (
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
  );
}
