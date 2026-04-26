import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, DollarSign, Save, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PricingRule } from '../types';

interface PricingManagerProps {
  onConfirmDelete: (message: string, onConfirm: () => void) => void;
}

const PricingManager: React.FC<PricingManagerProps> = ({ onConfirmDelete }) => {
  const { rooms, pricingRules, addPricingRule, updatePricingRule, deletePricingRule } = useApp();
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState<Partial<PricingRule>>({});

  useEffect(() => {
    if (editingRule) {
      if (editingRule === 'new') {
        setRuleForm({
          rule_name: '', room_id: 'all', start_date: '', end_date: '', price: 0, promo_price: 0,
        });
      } else {
        const rule = pricingRules.find(r => r.id === editingRule);
        if (rule) setRuleForm({ ...rule });
      }
    }
  }, [editingRule]);

  const handleSave = async () => {
    const { id, ...data } = ruleForm;
    if (editingRule === 'new') {
      await addPricingRule(data as Omit<PricingRule, 'id'>);
    } else if (editingRule) {
      await updatePricingRule(editingRule, data);
    }
    setEditingRule(null);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-pms-text">定價規則</h2>
        <button onClick={() => setEditingRule('new')} className="flex items-center gap-2 px-4 py-2 bg-pms-accent text-white rounded-pms text-xs font-bold hover:bg-pms-accent-hover transition-all">
          <Plus size={14} /> 新增規則
        </button>
      </div>

      <div className="space-y-3">
        {pricingRules.map(rule => (
          <div key={rule.id} className="bg-pms-bg-card border border-pms-border-light rounded-pms p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-pms-text truncate">{rule.rule_name || '未命名規則'}</h3>
              <p className="text-[11px] text-pms-text-muted mt-0.5">
                {rule.start_date} → {rule.end_date} · 
                房型: {rule.room_id === 'all' ? '全部' : rooms.find(r => r.id === rule.room_id)?.name_zh || rule.room_id}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-bold text-pms-accent">NT$ {rule.price?.toLocaleString()}</div>
              {rule.promo_price > 0 && (
                <div className="text-xs text-red-500 font-bold">促銷 NT$ {rule.promo_price?.toLocaleString()}</div>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditingRule(rule.id)} className="p-2 rounded-pms border border-pms-border hover:bg-pms-accent/10"><Edit3 size={12} /></button>
              <button onClick={() => onConfirmDelete(`確定要刪除「${rule.rule_name}」定價規則嗎？`, async () => { await deletePricingRule(rule.id); })}
                className="p-2 rounded-pms border border-red-300 text-red-500 hover:bg-red-50"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
        <button onClick={() => setEditingRule('new')} className="w-full border-2 border-dashed border-pms-border rounded-pms p-6 flex items-center justify-center gap-2 hover:border-pms-accent hover:bg-pms-accent/5 transition-all">
          <Plus size={18} className="text-pms-text-muted" />
          <span className="text-xs font-bold text-pms-text-muted">新增定價卡片</span>
        </button>
      </div>

      {editingRule && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingRule(null)} />
          <div className="relative bg-pms-bg border border-pms-border rounded-pms p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <header className="flex justify-between items-center mb-6">
              <h3 className="font-heading text-lg font-bold text-pms-text">{editingRule === 'new' ? '新增定價規則' : '編輯定價規則'}</h3>
              <button onClick={() => setEditingRule(null)} className="p-2 rounded-pms hover:bg-pms-accent/10 text-pms-text-muted"><X size={18} /></button>
            </header>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">規則名稱</label>
                <input type="text" value={ruleForm.rule_name || ''} placeholder="例：清明連假加價"
                  onChange={e => setRuleForm({ ...ruleForm, rule_name: e.target.value })}
                  className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold text-pms-text focus:border-pms-accent outline-none mt-1" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">適用房型</label>
                <select value={ruleForm.room_id || 'all'} onChange={e => setRuleForm({ ...ruleForm, room_id: e.target.value })}
                  className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold text-pms-text outline-none mt-1">
                  <option value="all">全部房型</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name_zh}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">開始日期</label>
                  <input type="date" value={ruleForm.start_date || ''} onChange={e => setRuleForm({ ...ruleForm, start_date: e.target.value })}
                    className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm text-pms-text focus:border-pms-accent outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">結束日期</label>
                  <input type="date" value={ruleForm.end_date || ''} onChange={e => setRuleForm({ ...ruleForm, end_date: e.target.value })}
                    className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm text-pms-text focus:border-pms-accent outline-none mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">區間價格</label>
                  <input type="number" value={ruleForm.price || 0} onChange={e => setRuleForm({ ...ruleForm, price: Number(e.target.value) })}
                    className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold text-pms-text focus:border-pms-accent outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">優惠價 (選填)</label>
                  <input type="number" value={ruleForm.promo_price || 0} onChange={e => setRuleForm({ ...ruleForm, promo_price: Number(e.target.value) })}
                    placeholder="0 = 不設優惠"
                    className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold text-red-500 focus:border-pms-accent outline-none mt-1" />
                </div>
              </div>
            </div>
            <footer className="mt-6">
              <button onClick={handleSave} className="w-full bg-pms-accent text-white font-bold py-3 rounded-pms hover:bg-pms-accent-hover active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2">
                <Save size={16} /> 儲存規則
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingManager;
