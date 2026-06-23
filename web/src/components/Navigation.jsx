import React from 'react';
import { Download, Key, Settings, HelpCircle } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab }) {
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
  );
}
