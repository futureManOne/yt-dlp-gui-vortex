import React from 'react';
import { Video, X, Download } from 'lucide-react';
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
              <label style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', display: 'block' }}>{t('select_resolution')}</label>
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
              <span>{isSubmitting ? t('submitting') : t('start_download')}</span>
              <Download size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

