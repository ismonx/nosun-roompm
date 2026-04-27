import React, { useState } from 'react';
import { Settings, LogOut, Sun, Moon, AlertTriangle, LayoutGrid, Calendar as CalendarIcon, Home, DollarSign } from 'lucide-react';
import { useApp } from '../context/AppContext';
import CalendarView from './CalendarView';
import RoomManager from './RoomManager';
import PricingManager from './PricingManager';
import SettingsManager from './SettingsManager';
import BookingModal from './BookingModal';

// ===== 確認刪除 Modal =====
const ConfirmModal: React.FC<{ message: string, onConfirm: () => void, onCancel: () => void }> = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-pms-bg border border-pms-border rounded-pms p-8 max-w-sm w-full shadow-2xl">
      <div className="flex items-center gap-3 mb-6 text-red-500">
        <AlertTriangle size={24} />
        <h3 className="font-heading text-lg font-bold">確認刪除</h3>
      </div>
      <p className="text-sm text-pms-text-muted mb-8">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-3 rounded-pms border border-pms-border text-sm font-bold text-pms-text hover:bg-pms-bg-card transition-all">取消</button>
        <button onClick={() => { onConfirm(); onCancel(); }} className="flex-1 py-3 rounded-pms bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all">確認刪除</button>
      </div>
    </div>
  </div>
);

const RoomAdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { lang, t, settings, updateSettings, isDark, toggleDark, THEMES } = useApp();

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('pms_auth') === 'true';
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [activeTab, setActiveTab] = useState<'week' | 'month' | 'rooms' | 'pricing' | 'settings'>('month');
  const [isPending, startTransition] = React.useTransition();

  const handleTabChange = (tab: any) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };

  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return monday.toISOString().split('T')[0];
  });
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState<{ date: string; roomId: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const handleLogin = () => {
    if (loginPassword === (settings.admin_password || '2026')) {
      setIsAuthenticated(true);
      if (rememberMe) {
        localStorage.setItem('pms_auth', 'true');
      }
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 2000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pms_auth');
    setIsAuthenticated(false);
    onLogout();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-pms-bg flex items-center justify-center p-6">
        <div className="bg-pms-bg-card p-10 rounded-pms border border-pms-border max-w-sm w-full space-y-6">
          <div className="flex justify-center"><div className="w-14 h-14 rounded-pms bg-pms-accent/20 flex items-center justify-center"><Settings size={24} className="text-pms-accent" /></div></div>
          <h1 className="font-heading text-xl font-bold text-pms-text text-center tracking-wide">{settings.login_title || 'fUX Center'}</h1>
          <div className="flex items-center gap-2 px-1">
            <input 
              id="remember" 
              type="checkbox" 
              checked={rememberMe} 
              onChange={e => setRememberMe(e.target.checked)}
              className="accent-pms-accent"
            />
            <label htmlFor="remember" className="text-[10px] font-bold text-pms-text-muted cursor-pointer">記住登入狀態</label>
          </div>
          <button onClick={handleLogin} className="w-full bg-pms-accent text-[var(--pms-text-on-accent)] font-bold py-4 rounded-pms text-sm hover:bg-pms-accent-hover transition-all shadow-glow">{lang === 'zh' ? '登入後台' : 'LOGIN'}</button>
          {loginError && <p className="text-red-500 text-xs text-center font-bold">密碼錯誤</p>}
          <div className="flex justify-center"><button onClick={toggleDark} className="p-2 rounded-pms border border-pms-border text-pms-accent hover:bg-pms-accent/10">{isDark ? <Sun size={14} /> : <Moon size={14} />}</button></div>
          <p className="text-[10px] text-center text-pms-text-muted">PMS V6.0</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'week', label: lang === 'zh' ? '週檢視' : 'Week', icon: <LayoutGrid size={16} /> },
    { id: 'month', label: lang === 'zh' ? '月檢視' : 'Month', icon: <CalendarIcon size={16} /> },
    { id: 'rooms', label: lang === 'zh' ? '房型管理' : 'Rooms', icon: <Home size={16} /> },
    { id: 'pricing', label: lang === 'zh' ? '定價規則' : 'Pricing', icon: <DollarSign size={16} /> },
    { id: 'settings', label: lang === 'zh' ? '全域設定' : 'Settings', icon: <Settings size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-pms-bg text-pms-text font-body flex flex-col overflow-hidden">
      {confirmDelete && <ConfirmModal message={confirmDelete.message} onConfirm={confirmDelete.onConfirm} onCancel={() => setConfirmDelete(null)} />}

      <header className="bg-pms-bg-card border-b border-pms-border-light px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3"><h1 className="font-heading text-sm font-bold text-pms-accent tracking-tight">FU·PMS</h1><span className="text-[8px] font-bold text-pms-text-muted">V6.0</span></div>
        <nav className="flex items-center gap-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id as any)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-pms text-[11px] font-bold transition-all ${activeTab === tab.id ? 'bg-pms-accent text-[var(--pms-text-on-accent)] shadow-sm' : 'text-pms-text-muted hover:bg-pms-accent/10 hover:text-pms-text'}`}>
              {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5 border border-pms-border-light rounded-pms p-0.5">
            {Object.keys(THEMES).map(tid => (
              <button key={tid} onClick={() => updateSettings({ active_theme: tid })} className={`px-1.5 py-1 text-[8px] font-bold rounded-pms transition-all ${settings.active_theme === tid ? 'bg-pms-accent text-[var(--pms-text-on-accent)]' : 'text-pms-text-muted hover:bg-pms-accent/10'}`}>
                {(THEMES as any)[tid].nameZh.substring(0, 2)}
              </button>
            ))}
          </div>
          <button onClick={toggleDark} className="p-1.5 rounded-pms text-pms-text-muted hover:text-pms-accent hover:bg-pms-accent/10"><Sun size={14} /></button>
          <button onClick={handleLogout} className="p-1.5 rounded-pms text-pms-text-muted hover:text-red-500"><LogOut size={14} /></button>
        </div>
      </header>

      <main className={`flex-1 overflow-auto p-3 md:p-5 transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        {(activeTab === 'week' || activeTab === 'month') && <CalendarView activeTab={activeTab} setActiveTab={handleTabChange} weekStart={weekStart} setWeekStart={setWeekStart} monthDate={monthDate} setMonthDate={setMonthDate} onSelectCell={(date, roomId) => setSelectedCell({ date, roomId })} />}
        {activeTab === 'rooms' && <RoomManager onConfirmDelete={(msg, conf) => setConfirmDelete({ message: msg, onConfirm: conf })} />}
        {activeTab === 'pricing' && <PricingManager onConfirmDelete={(msg, conf) => setConfirmDelete({ message: msg, onConfirm: conf })} />}
        {activeTab === 'settings' && <SettingsManager onConfirmDelete={(msg, conf) => setConfirmDelete({ message: msg, onConfirm: conf })} />}
      </main>

      {selectedCell && <BookingModal selectedCell={selectedCell} onClose={() => setSelectedCell(null)} onConfirmDelete={(msg, conf) => setConfirmDelete({ message: msg, onConfirm: conf })} />}
    </div>
  );
};

export default RoomAdminDashboard;
