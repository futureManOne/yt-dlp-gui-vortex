import React, { useState } from 'react';
import { Video, X, Download, Bot, Sparkles } from 'lucide-react';
import { useTranslation } from '../i18n.jsx';

export default function DownloadPanel({
  urls,
  setUrls,
  isParsing,
  isSubmitting,
  handleParseVideo,
  handleStartDownload,
  parsedInfo,
  selectedResolution,
  setSelectedResolution
}) {
  const { t } = useTranslation();
  const urlCount = urls.split('\n').map(u => u.trim()).filter(Boolean).length;
  
  const [aiSummary, setAiSummary] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Reset AI summary when parsed info changes
  React.useEffect(() => {
    setAiSummary('');
  }, [parsedInfo]);

  const handleAiSummary = async () => {
    if (!parsedInfo) return;
    setIsAiLoading(true);
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: parsedInfo.title, description: parsedInfo.description })
      });
      const data = await response.json();
      if (data.success) {
        setAiSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <aside className="sidebar">
      {/* Brand Logo & Info */}
      <div className="brand-section">
        <div className="logo-area" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img 
            src="/logo.png" 
            className="brand-logo" 
            alt="Logo" 
            style={{ 
              width: '2rem', 
              height: '2rem', 
              borderRadius: '50%', 
              objectFit: 'cover', 
              border: '1px solid rgba(0, 242, 254, 0.3)' 
            }} 
          />
          <div className="logo-text">
            <h1>Vortex Downloader</h1>
            <p>{t('brand_subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Section 1: URL Input & Action */}
      <div className="sidebar-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <h2 className="section-title">
          <Video size={16} className="section-icon" />
          {t('add_urls_title')}
        </h2>
        <div className="input-group" style={{ position: 'relative' }}>
          <textarea
            id="video-urls"
            placeholder={t('urls_placeholder')}
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
              title={t('clear_input')}
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
          <span>{t('detected_links', { count: urlCount })}</span>
        </div>
        <div className="btn-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' }}>
          <button
            type="button"
            className="btn-primary animate-hover"
            onClick={handleParseVideo}
            disabled={isParsing || isSubmitting}
            style={{ width: '100%', padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.82rem', borderRadius: '0.375rem', minHeight: '2.5rem', margin: 0 }}
          >
            <span>{isParsing ? t('parsing') : t('parse_single')}</span>
          </button>
          
          {/* Shortcut to start downloading immediately without parsing first */}
          {!parsedInfo && (
            <button
              type="button"
              className="btn-outline animate-hover"
              onClick={handleStartDownload}
              disabled={isSubmitting || isParsing}
              style={{ width: '100%', padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.82rem', borderRadius: '99px', minHeight: '2.5rem', margin: 0 }}
            >
              <span>{t('direct_download')}</span>
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
                  {t('duration_format', { min: Math.floor(parsedInfo.duration / 60), sec: parsedInfo.duration % 60 })}
                </div>
              </div>
            </div>
            <div className="input-group" style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', display: 'block' }}>视频与音频选项 (Video & Audio Formats)</label>
              <select
                value={selectedResolution}
                onChange={(e) => setSelectedResolution(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem', width: '100%', borderRadius: '0.25rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', outline: 'none' }}
              >
                {parsedInfo.video_formats ? (
                  <>
                    <optgroup label="视频 (Video)">
                      {parsedInfo.video_formats.map((v) => {
                        const sizeMb = v.filesize ? (v.filesize / 1024 / 1024).toFixed(1) + 'MB' : '未知大小';
                        const label = `${v.height}p ${v.fps}fps - ${v.ext} (${v.vcodec}) - ${sizeMb}`;
                        return (
                          <option key={v.format_id} value={v.height.toString()} style={{ background: '#18181b' }}>
                            {label}
                          </option>
                        );
                      })}
                    </optgroup>
                    <optgroup label="纯音频 (Audio Only)">
                      <option value="0" style={{ background: '#18181b' }}>仅音频 (Audio Only) - 最佳质量</option>
                      {parsedInfo.audio_formats && parsedInfo.audio_formats.map((a) => {
                        const sizeMb = a.filesize ? (a.filesize / 1024 / 1024).toFixed(1) + 'MB' : '未知大小';
                        const label = `音频 - ${a.ext} (${a.acodec}) ${a.abr ? a.abr + 'kbps' : ''} - ${sizeMb}`;
                        return (
                          <option key={a.format_id} value={`audio_${a.format_id}`} style={{ background: '#18181b' }}>
                            {label}
                          </option>
                        );
                      })}
                    </optgroup>
                  </>
                ) : (
                  parsedInfo.resolutions && parsedInfo.resolutions.map((r) => (
                    <option key={r.height} value={r.height.toString()} style={{ background: '#18181b' }}>
                      {r.label}
                    </option>
                  ))
                )}
              </select>
            </div>
            
            {/* AI Action Button */}
            <button
              type="button"
              className="btn-outline animate-hover"
              onClick={handleAiSummary}
              disabled={isAiLoading}
              style={{ width: '100%', marginBottom: '0.75rem', padding: '0.4rem', fontSize: '0.75rem', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', borderColor: 'rgba(128, 90, 213, 0.5)', color: '#d6bcfa' }}
            >
              <Sparkles size={14} />
              <span>{isAiLoading ? 'AI 正在分析...' : 'AI 智能摘要 (分析视频价值)'}</span>
            </button>

            {/* AI Summary Result */}
            {aiSummary && (
              <div style={{ marginBottom: '0.75rem', padding: '0.5rem', fontSize: '0.75rem', color: '#e2e8f0', background: 'rgba(128, 90, 213, 0.1)', border: '1px solid rgba(128, 90, 213, 0.3)', borderRadius: '0.375rem', whiteSpace: 'pre-wrap' }}>
                {aiSummary}
              </div>
            )}

            <button

              className="btn-primary animate-hover"
              id="btn-start-download"
              onClick={handleStartDownload}
              disabled={isSubmitting || isParsing}
              style={{ width: '100%', margin: 0, padding: '0.55rem', fontSize: '0.82rem', borderRadius: '0.375rem', minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
            >
              <span>{isSubmitting ? t('submitting') : t('start_download')}</span>
              <Download size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

