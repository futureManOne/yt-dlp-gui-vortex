import React from 'react';
import { Settings, Folder, FolderOpen, FileText, Check, Palette } from 'lucide-react';

const getThemeName = (themeKey) => {
  switch (themeKey) {
    case 'cyber': return '赛博霓虹 (Cyber Black)';
    case 'ocean': return '深海幽蓝 (Midnight Ocean)';
    case 'sakura': return '炫彩粉樱 (Sakura Glow)';
    case 'light': return '极简白磨砂 (Light Glassmorphism)';
    default: return themeKey;
  }
};

export default function SettingsPanel({
  downloadDir,
  setDownloadDir,
  defaultDownloadDir,
  selectedFormat,
  setSelectedFormat,
  selectedQuality,
  setSelectedQuality,
  handleBrowseDir,
  handleSaveSettings,
  saveSettingsSilent,
  showToast,
  theme,
  setTheme
}) {
  return (
    <div className="content-board settings-board glass-card">
      <div className="board-header">
        <Settings size={28} className="board-header-icon" />
        <div>
          <h2>通用设置</h2>
          <p>在这里配置您的全局下载路径、文件保存格式以及默认视频质量偏好与视觉主题。</p>
        </div>
      </div>

      <div className="settings-body-container">
        {/* Save Directory */}
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

        {/* Encodes & Formats */}
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

        {/* Themes Selection */}
        <div className="settings-section-card">
          <h3><Palette size={16} className="title-sub-icon" /> 个性化视觉主题</h3>
          <div className="settings-row">
            <div className="input-field-group">
              <label htmlFor="theme-selector">应用主题风格</label>
              <select
                id="theme-selector"
                value={theme}
                onChange={(e) => {
                  const val = e.target.value;
                  setTheme(val);
                  localStorage.setItem('vortex-theme', val);
                  showToast(`已切换至主题: ${getThemeName(val)}`, 'success');
                }}
                style={{ maxWidth: '400px' }}
              >
                <option value="cyber">赛博霓虹 (Cyber Black)</option>
                <option value="ocean">深海幽蓝 (Midnight Ocean)</option>
                <option value="sakura">炫彩粉樱 (Sakura Glow)</option>
                <option value="light">极简白磨砂 (Light Glassmorphism)</option>
              </select>
              <span className="input-tip">
                提示：切换后会即时加载对应的色彩变量规则，且在刷新或系统重启后自动恢复。
              </span>
            </div>
          </div>
        </div>

        {/* Engine Management */}
        <div className="settings-section-card">
          <h3><Settings size={16} className="title-sub-icon" /> 核心解析引擎 (yt-dlp Engine)</h3>
          <div className="settings-row">
            <div className="input-field-group">
              <label>内核状态与在线升级</label>
              <div className="dir-input-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={async () => {
                    showToast('正在检查并在线升级下载内核...', 'info');
                    try {
                      const res = await fetch('/api/engine/update', { method: 'POST' });
                      const data = await res.json();
                      if (data.success) {
                        showToast('内核已成功升级至最新发布版本！', 'success');
                      } else {
                        showToast(`升级失败: ${data.error || '未知错误'}`, 'error');
                      }
                    } catch (e) {
                      showToast('更新接口连接失败', 'error');
                    }
                  }}
                >
                  <span>在线一键升级 yt-dlp 内核</span>
                </button>
              </div>
              <span className="input-tip">
                架构说明：本应用 UI 已与 yt-dlp 底层解耦。当目标网站升级防爬虫机制时，可直接点击此按钮一键升级最新内核规则，无需重新安装应用。
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
  );
}
