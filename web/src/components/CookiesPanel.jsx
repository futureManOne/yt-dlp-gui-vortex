import React from 'react';
import { ShieldCheck, FileText, Trash2, Check } from 'lucide-react';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B';
  if (!bytes) return '--';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function CookiesPanel({
  cookieFiles,
  isDragOver,
  handleDragEnterOver,
  handleDragLeave,
  handleCookieDrop,
  fileInputRef,
  handleCookieSelect,
  deleteCookie,
  cookiesBrowser,
  setCookiesBrowser,
  saveSettingsSilent
}) {
  return (
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
            <span className={`status-badge-text ${cookieFiles.length > 0 ? 'success' : 'mute'}`}>
              {cookieFiles.length > 0 ? `已载入 ${cookieFiles.length} 个凭证文件` : '未加载任何凭证文件'}
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
              className="file-input"
              ref={fileInputRef}
              onChange={handleCookieSelect}
              multiple
            />
            
            <div className="upload-placeholder-large" style={{ padding: '2rem 1rem' }}>
              <FileText size={48} className="upload-icon-large" />
              <h3>拖拽 Netscape 格式的 cookies.txt 文件到这里添加</h3>
              <p>或者点击此区域浏览本地文件进行导入 (支持多个独立站点凭证)</p>
              <span className="file-limits-tip">仅支持扩展名为 .txt 的文件</span>
            </div>
          </div>
          
          {cookieFiles.length > 0 && (
            <div className="cookie-files-list" style={{ marginTop: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#a1a1aa' }}>已导入的凭证列表</h4>
              {cookieFiles.map((file, idx) => (
                <div key={file.id || idx} className="file-info-container-large" style={{ marginBottom: '0.5rem', padding: '1rem' }}>
                  <FileText size={24} className="file-icon-large" style={{ marginBottom: 0, marginRight: '1rem' }} />
                  <div className="file-meta-large" style={{ flex: 1, textAlign: 'left', marginTop: 0 }}>
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">大小: {formatBytes(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-danger-large animate-hover"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCookie(file.id);
                    }}
                    style={{ marginTop: 0 }}
                  >
                    <Trash2 size={16} />
                    <span>删除</span>
                  </button>
                </div>
              ))}
            </div>
          )}
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
  );
}
