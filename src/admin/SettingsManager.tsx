import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit3, Trash2, Save, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PromoCode, AppSettings } from '../types';

interface SettingsManagerProps {
  onConfirmDelete: (message: string, onConfirm: () => void) => void;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ onConfirmDelete }) => {
  const { lang, settings, updateSettings, promoCodes, addPromoCode, updatePromoCode, deletePromoCode } = useApp();
  const [editingPromo, setEditingPromo] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  // 當外部 settings 更新時（例如從 Firebase 同步），同步更新本地 state
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    await updateSettings(localSettings);
    setIsSaving(false);
  };

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-pms-text">全域設定</h2>
      </div>

      {/* 文案設定 */}
      <div className="bg-pms-bg-card border border-pms-border-light rounded-pms p-5 space-y-4 shadow-sm">
        <h3 className="font-bold text-sm text-pms-accent">首頁文案</h3>
        {(['home_title_zh', 'home_title_en', 'home_subtitle_zh', 'home_subtitle_en', 'hostel_name', 'hostel_name_en', 'login_title', 'step1_text_zh', 'step1_text_en'] as const).map(key => (
          <div key={key} className="space-y-1">
            <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">{key.replace(/_/g, ' ')}</label>
            <input
              type="text"
              value={localSettings[key] || ''}
              onChange={e => setLocalSettings({ ...localSettings, [key]: e.target.value })}
              className="w-full bg-pms-bg border border-pms-border rounded-pms p-3 text-sm font-medium text-pms-text focus:border-pms-accent outline-none transition-all"
            />
          </div>
        ))}
      </div>

      {/* 推薦系統 */}
      <div className="bg-pms-bg-card border border-pms-border-light rounded-pms p-5 space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-pms-accent">夥伴推薦系統</h3>
          <button
            onClick={() => setLocalSettings({ ...localSettings, referral_switch: !localSettings.referral_switch })}
            className={`w-10 h-5 rounded-full relative transition-all ${localSettings.referral_switch ? 'bg-pms-accent' : 'bg-pms-border'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.referral_switch ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        <textarea
          value={(localSettings as any)[`referral_msg_${lang}`] || ''}
          onChange={e => setLocalSettings({ ...localSettings, [`referral_msg_${lang}`]: e.target.value })}
          className="w-full bg-pms-bg border border-pms-border rounded-pms p-3 text-xs font-medium h-24 outline-none focus:border-pms-accent text-pms-text resize-none transition-all"
        />
      </div>

      {/* 密碼 */}
      <div className="bg-pms-bg-card border border-pms-border-light rounded-pms p-5 space-y-3 shadow-sm">
        <h3 className="font-bold text-sm text-pms-accent">管理密碼</h3>
        <input
          type="text"
          value={localSettings.admin_password || ''}
          onChange={e => setLocalSettings({ ...localSettings, admin_password: e.target.value })}
          className="w-full bg-pms-bg border border-pms-border rounded-pms p-3 text-sm font-mono text-pms-text focus:border-pms-accent outline-none transition-all"
        />
      </div>

      {/* 推薦碼/合作夥伴管理 */}
      <div className="bg-pms-bg-card border border-pms-border-light rounded-pms p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-pms-accent">推薦碼 / 合作夥伴</h3>
          <button onClick={() => setEditingPromo('new')} className="flex items-center gap-1.5 px-3 py-1.5 bg-pms-accent text-[var(--pms-text-on-accent)] rounded-pms text-[10px] font-bold hover:bg-pms-accent-hover transition-all">
            <Plus size={12} /> 新增推薦碼
          </button>
        </div>
        
        <div className="space-y-2">
          {promoCodes.map(promo => (
            <div key={promo.id} className="flex items-center justify-between p-3 bg-pms-bg rounded-pms border border-pms-border-light">
              <div className="flex flex-col gap-1">
                <div className="text-[11px] font-bold text-pms-text flex flex-wrap gap-x-3 gap-y-1">
                  <span>推薦碼：{promo.code}</span>
                  <span>名稱：{promo.name}</span>
                </div>
                <div className="text-[10px] text-pms-text-muted font-medium flex flex-wrap gap-x-3 gap-y-1">
                  <span>折扣：{Math.round((1 - (promo.discount || 1)) * 100)}%</span>
                  <span>到期日：{promo.expiry_date || '無期限'}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditingPromo(promo.id)} className="p-1.5 rounded-pms border border-pms-border hover:bg-pms-accent/10 text-pms-text-muted"><Edit3 size={12} /></button>
                <button onClick={() => onConfirmDelete(`確定要刪除推薦碼「${promo.code}」嗎？`, async () => { await deletePromoCode(promo.id); })}
                  className="p-1.5 rounded-pms border border-red-300 text-red-500 hover:bg-red-50"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
          {promoCodes.length === 0 && (
            <p className="text-center py-4 text-[10px] text-pms-text-muted italic">目前尚無推薦碼</p>
          )}
        </div>
      </div>

      {editingPromo && (
        <PromoEditModal
          promo={editingPromo === 'new' ? { code: '', name: '', discount: 0.9, expiry_date: '' } : promoCodes.find(p => p.id === editingPromo)}
          onClose={() => setEditingPromo(null)}
          onSave={async (data) => {
            const { id, ...cleanData } = data;
            if (editingPromo === 'new') {
              await addPromoCode(cleanData as Omit<PromoCode, 'id'>);
            } else if (editingPromo) {
              await updatePromoCode(editingPromo, cleanData);
            }
            setEditingPromo(null);
          }}
        />
      )}

      {/* 固定底部儲存列 */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-pms-bg/80 backdrop-blur-md border-t border-pms-border-light z-50 flex justify-center">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-10 py-4 bg-pms-accent text-[var(--pms-text-on-accent)] rounded-pms text-sm font-bold hover:bg-pms-accent-hover transition-all shadow-glow w-full max-w-sm"
          >
            <Save size={18} /> {isSaving ? '儲存中...' : '儲存所有變更'}
          </button>
        </div>
      )}
      {/* 為了防止底部被儲存列擋住的間隔 */}
      <div className="h-20" />
    </div>
  );
};

// Internal Sub-component for Promo Edit
const PromoEditModal: React.FC<{ promo: any, onClose: () => void, onSave: (data: any) => Promise<void> }> = ({ promo, onClose, onSave }) => {
  const { promoCodes } = useApp();
  const [form, setForm] = useState(promo);
  const isDuplicate = promoCodes.some(p => p.code === form.code && p.id !== promo.id);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-pms-bg border border-pms-border rounded-pms p-6 w-full max-w-sm shadow-2xl">
        <header className="flex justify-between items-center mb-6">
          <h3 className="font-heading text-lg font-bold text-pms-text">{promo.id ? '編輯推薦碼' : '新增推薦碼'}</h3>
          <button onClick={onClose} className="p-2 rounded-pms hover:bg-pms-accent/10 text-pms-text-muted"><X size={18} /></button>
        </header>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">代碼 (如: CI888)</label>
            <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold focus:border-pms-accent outline-none text-pms-text mt-1" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">名稱 (如: 華航)</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold focus:border-pms-accent outline-none text-pms-text mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">折扣 (0.85 = 85折)</label>
              <input type="number" step="0.01" value={form.discount} onChange={e => setForm({ ...form, discount: Number(e.target.value) })}
                className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold focus:border-pms-accent outline-none text-pms-text mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">到期日</label>
              <input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-[11px] font-bold focus:border-pms-accent outline-none text-pms-text mt-1" />
            </div>
          </div>
        </div>
        <footer className="mt-6">
          <button 
            disabled={!form.code || !form.name || isDuplicate}
            onClick={() => onSave(form)} 
            className="w-full bg-pms-accent text-[var(--pms-text-on-accent)] font-bold py-3 rounded-pms hover:bg-pms-accent-hover active:scale-[0.98] disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2"
          >
            {isDuplicate ? '代碼重複' : <><Save size={16} /> 儲存推薦碼</>}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SettingsManager;
