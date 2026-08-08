import React from 'react';
import { Download, Key, Settings, HelpCircle } from 'lucide-react';
import { useTranslation } from '../i18n.jsx';

export default function Navigation({ activeTab, setActiveTab }) {
  const { t } = useTranslation();

  return (
    <nav className="nav-sidebar">
      <div className="nav-logo">
        <img 
          src="/logo.png" 
          className="logo-icon" 
          alt="Logo" 
          style={{ width: '2.2rem', height: '2.2rem', borderRadius: '50%', objectFit: 'cover' }} 
        />
      </div>
      <div className="nav-menu">
        <button
          type="button"
          className={`nav-item ${activeTab === 'download' ? 'active' : ''}`}
          onClick={() => setActiveTab('download')}
          title={t('nav_download')}
        >
          <Download size={20} />
          <span className="nav-label">{t('nav_download')}</span>
        </button>
        <button
          type="button"
          className={`nav-item ${activeTab === 'cookies' ? 'active' : ''}`}
          onClick={() => setActiveTab('cookies')}
          title={t('nav_cookies')}
        >
          <Key size={20} />
          <span className="nav-label">{t('nav_cookies')}</span>
        </button>
        <button
          type="button"
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          title={t('nav_settings')}
        >
          <Settings size={20} />
          <span className="nav-label">{t('nav_settings')}</span>
        </button>
      </div>
      <div className="nav-footer">
        <HelpCircle size={18} className="nav-help-icon" title={t('nav_help_title')} />
      </div>
    </nav>
  );
}

