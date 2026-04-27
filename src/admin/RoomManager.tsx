import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Users, Save, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Room } from '../types';

interface RoomManagerProps {
  onConfirmDelete: (message: string, onConfirm: () => void) => void;
}

const RoomManager: React.FC<RoomManagerProps> = ({ onConfirmDelete }) => {
  const { lang, rooms, addRoom, updateRoom, deleteRoom } = useApp();
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState<Partial<Room>>({});

  useEffect(() => {
    if (editingRoom) {
      if (editingRoom === 'new') {
        setRoomForm({
          name_zh: '', name_en: '', category: 'double', photos: ['', '', ''],
          standard_capacity: 2, max_capacity: 3, extra_guest_fee: 500, base_price: 2800, promo_price: 0, sort_order: rooms.length,
        });
      } else {
        const room = rooms.find(r => r.id === editingRoom);
        if (room) setRoomForm({ ...room, photos: room.photos || ['', '', ''] });
      }
    }
  }, [editingRoom]);

  const handleSave = async () => {
    if (editingRoom === 'new') {
      const id = `room_${Date.now()}`;
      await addRoom({ id, ...roomForm } as Room);
    } else if (editingRoom) {
      const { id, ...data } = roomForm;
      await updateRoom(editingRoom, data);
    }
    setEditingRoom(null);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-pms-text">房型管理</h2>
        <button onClick={() => setEditingRoom('new')} className="flex items-center gap-2 px-4 py-2 bg-pms-accent text-white rounded-pms text-xs font-bold hover:bg-pms-accent-hover transition-all">
          <Plus size={14} /> 新增房型
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.map(room => (
          <div key={room.id} className="bg-pms-bg-card border border-pms-border-light rounded-pms p-5 space-y-3">
            {room.photos?.[0] && (
              <img src={room.photos[0]} alt={room.name_zh} className="w-full h-32 object-cover rounded-pms" />
            )}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-heading font-bold text-pms-text">{lang === 'zh' ? room.name_zh : room.name_en}</h3>
                <p className="text-[10px] text-pms-text-muted mt-0.5">
                  <Users size={10} className="inline mr-1" />{room.standard_capacity}人 · 最多{room.max_capacity}人 · 加床 NT${room.extra_guest_fee}
                </p>
              </div>
              <div className="text-right">
                {room.promo_price > 0 ? (
                  <>
                    <span className="text-xs text-pms-text-muted line-through">NT$ {room.base_price?.toLocaleString()}</span>
                    <span className="text-sm font-bold text-red-500 block">NT$ {room.promo_price?.toLocaleString()}</span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-pms-accent">NT$ {room.base_price?.toLocaleString()}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-pms-border-light">
              <button onClick={() => setEditingRoom(room.id)} className="flex-1 py-2 rounded-pms border border-pms-border text-xs font-bold hover:bg-pms-accent/10 flex items-center justify-center gap-1">
                <Edit3 size={12} /> 編輯
              </button>
              <button onClick={() => onConfirmDelete(`確定要刪除「${room.name_zh}」嗎？`, async () => { await deleteRoom(room.id); })}
                className="py-2 px-3 rounded-pms border border-red-300 text-red-500 text-xs font-bold hover:bg-red-50 transition-all">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        <button onClick={() => setEditingRoom('new')} className="border-2 border-dashed border-pms-border rounded-pms p-8 flex flex-col items-center justify-center gap-2 hover:border-pms-accent hover:bg-pms-accent/5 transition-all">
          <Plus size={24} className="text-pms-text-muted" />
          <span className="text-xs font-bold text-pms-text-muted">新增房型</span>
        </button>
      </div>

      {editingRoom && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingRoom(null)} />
          <div className="relative bg-pms-bg border border-pms-border rounded-pms p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <header className="flex justify-between items-center mb-6">
              <h3 className="font-heading text-lg font-bold text-pms-text">{editingRoom === 'new' ? '新增房型' : '編輯房型'}</h3>
              <button onClick={() => setEditingRoom(null)} className="p-2 rounded-pms hover:bg-pms-accent/10 text-pms-text-muted"><X size={18} /></button>
            </header>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">名稱 (中)</label>
                  <input type="text" value={roomForm.name_zh || ''} onChange={e => setRoomForm({ ...roomForm, name_zh: e.target.value })}
                    className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold focus:border-pms-accent outline-none text-pms-text mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">Name (EN)</label>
                  <input type="text" value={roomForm.name_en || ''} onChange={e => setRoomForm({ ...roomForm, name_en: e.target.value })}
                    className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold focus:border-pms-accent outline-none text-pms-text mt-1" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">類別</label>
                <select value={roomForm.category || 'double'} onChange={e => setRoomForm({ ...roomForm, category: e.target.value as any })}
                  className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold text-pms-text outline-none mt-1">
                  <option value="double">雙人房</option>
                  <option value="quad">四人房</option>
                  <option value="suite">套房</option>
                  <option value="dorm">背包房</option>
                  <option value="whole">全棟包棟</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">照片 URL (最多3張)</label>
                {(roomForm.photos || ['', '', '']).map((url, i) => (
                  <input key={i} type="url" value={url} placeholder={`照片 ${i + 1} URL`}
                    onChange={e => {
                      const p = [...(roomForm.photos || ['', '', ''])];
                      p[i] = e.target.value;
                      setRoomForm({ ...roomForm, photos: p });
                    }}
                    className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-2.5 text-xs text-pms-text focus:border-pms-accent outline-none mt-1" />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">標準入住</label>
                  <input type="number" value={roomForm.standard_capacity || 0} onChange={e => setRoomForm({ ...roomForm, standard_capacity: Number(e.target.value) })}
                    className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-2.5 text-sm font-bold text-pms-text outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">最大入住</label>
                  <input type="number" value={roomForm.max_capacity || 0} onChange={e => setRoomForm({ ...roomForm, max_capacity: Number(e.target.value) })}
                    className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-2.5 text-sm font-bold text-pms-text outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">加床費</label>
                  <input type="number" value={roomForm.extra_guest_fee || 0} onChange={e => setRoomForm({ ...roomForm, extra_guest_fee: Number(e.target.value) })}
                    className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-2.5 text-sm font-bold text-pms-text outline-none mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">基礎房價</label>
                  <input type="number" value={roomForm.base_price || 0} onChange={e => setRoomForm({ ...roomForm, base_price: Number(e.target.value) })}
                    className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold text-pms-accent focus:border-pms-accent outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">優惠價</label>
                  <input type="number" value={roomForm.promo_price || 0} onChange={e => setRoomForm({ ...roomForm, promo_price: Number(e.target.value) })}
                    className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold text-red-500 focus:border-red-400 outline-none mt-1" />
                </div>
              </div>
            </div>
            <footer className="mt-6">
              <button onClick={handleSave} className="w-full bg-pms-accent text-white font-bold py-3 rounded-pms hover:bg-pms-accent-hover active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2">
                <Save size={16} /> 儲存房型
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManager;
