import React, { useState, useEffect } from 'react';
import { X, Save, Phone, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Room, Booking } from '../types';

interface BookingModalProps {
  selectedCell: { date: string; roomId: string };
  onClose: () => void;
  onConfirmDelete: (message: string, onConfirm: () => void) => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ selectedCell, onClose, onConfirmDelete }) => {
  const { lang, rooms, bookings, saveBooking, deleteBooking, getSmartPrice } = useApp();
  const [modalData, setModalData] = useState<Partial<Booking>>({
    customer_name: '', phone: '', note: '', status: 'pending',
    extra_guests: 0, total_price: 0, is_whole_house: false
  });

  useEffect(() => {
    const key = `${selectedCell.date}_${selectedCell.roomId}`;
    const existing = bookings[key];
    if (existing) {
      setModalData({
        customer_name: existing.customer_name || '',
        phone: existing.phone || '',
        note: existing.note || '',
        status: existing.status || 'pending',
        extra_guests: existing.extra_guests || 0,
        total_price: existing.total_price || 0,
        is_whole_house: existing.is_whole_house || false,
      });
    } else {
      const price = getSmartPrice(selectedCell.roomId, selectedCell.date);
      setModalData({
        customer_name: '', phone: '', note: '', status: 'pending',
        extra_guests: 0, total_price: price, is_whole_house: false,
      });
    }
  }, [selectedCell, bookings, getSmartPrice]);

  const handleSave = async () => {
    const key = `${selectedCell.date}_${selectedCell.roomId}`;
    await saveBooking(key, {
      ...modalData,
      date: selectedCell.date,
      room_id: selectedCell.roomId,
      created_at: bookings[key]?.created_at || new Date().toISOString(),
    } as Booking);
    onClose();
  };

  const handleDelete = () => {
    const key = `${selectedCell.date}_${selectedCell.roomId}`;
    onConfirmDelete(`確定要刪除 ${selectedCell.date} 的訂單嗎？此操作無法復原。`, async () => {
      await deleteBooking(key);
      onClose();
    });
  };

  const room = rooms.find(r => r.id === selectedCell.roomId);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-pms-bg border border-pms-border rounded-pms p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <header className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-heading text-lg font-bold text-pms-text">
              {bookings[`${selectedCell.date}_${selectedCell.roomId}`] ? '編輯訂單' : '新增訂單'}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-pms-accent text-white px-2 py-1 rounded-pms text-[10px] font-bold">{selectedCell.date}</span>
              <span className="text-xs font-bold text-pms-text-muted">
                {room?.[lang === 'zh' ? 'name_zh' : 'name_en']}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-pms hover:bg-pms-accent/10 text-pms-text-muted"><X size={18} /></button>
        </header>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">姓名</label>
              <input type="text" value={modalData.customer_name} onChange={e => setModalData({ ...modalData, customer_name: e.target.value })}
                className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold focus:border-pms-accent outline-none text-pms-text mt-1" placeholder="客戶姓名" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">電話</label>
              <input type="tel" value={modalData.phone} onChange={e => setModalData({ ...modalData, phone: e.target.value })}
                className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold focus:border-pms-accent outline-none text-pms-text mt-1" placeholder="聯絡電話" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">備註</label>
            <textarea value={modalData.note} onChange={e => setModalData({ ...modalData, note: e.target.value })}
              className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm h-20 focus:border-pms-accent outline-none text-pms-text resize-none mt-1" placeholder="備註..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">金額 (手動覆寫)</label>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-sm font-bold text-pms-accent">NT$</span>
                <input type="number" value={modalData.total_price}
                  onChange={e => setModalData({ ...modalData, total_price: Number(e.target.value) })}
                  className="flex-1 bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold focus:border-pms-accent outline-none text-pms-text" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">加人數</label>
              <input type="number" value={modalData.extra_guests}
                onChange={e => setModalData({ ...modalData, extra_guests: Number(e.target.value) })}
                className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold focus:border-pms-accent outline-none text-pms-text mt-1" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider mb-1 block">訂單狀態</label>
            <div className="flex gap-1 bg-pms-bg-card p-1 rounded-pms">
              {(['pending', 'deposit', 'full'] as const).map(s => (
                <button key={s} onClick={() => setModalData({ ...modalData, status: s })}
                  className={`flex-1 py-2 rounded-pms text-[11px] font-bold uppercase transition-all
                    ${modalData.status === s ? `text-white ${s === 'pending' ? 'bg-status-pending' : s === 'deposit' ? 'bg-status-deposit' : 'bg-status-full'}` : 'text-pms-text-muted hover:bg-pms-accent/10'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-pms-bg-card rounded-pms border border-pms-border-light">
            <span className="text-[11px] font-bold text-pms-text-muted">整棟鎖房模式</span>
            <button onClick={() => setModalData({ ...modalData, is_whole_house: !modalData.is_whole_house })}
              className={`w-10 h-5 rounded-full relative transition-all ${modalData.is_whole_house ? 'bg-indigo-500' : 'bg-pms-border'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${modalData.is_whole_house ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>

        <footer className="mt-6 flex gap-3">
          {modalData.phone && (
            <a href={`tel:${modalData.phone}`} className="p-3 rounded-pms border border-pms-accent text-pms-accent hover:bg-pms-accent hover:text-white transition-all flex items-center justify-center gap-2" title="一鍵撥號">
              <Phone size={16} />
            </a>
          )}
          {bookings[`${selectedCell.date}_${selectedCell.roomId}`] && (
            <button onClick={handleDelete} className="py-3 px-4 rounded-pms border border-red-400 text-red-500 text-xs font-bold hover:bg-red-50 transition-all">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={handleSave} className="flex-1 bg-pms-accent text-white font-bold py-3 rounded-pms hover:bg-pms-accent-hover active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2">
            <Save size={16} /> 儲存
          </button>
        </footer>
      </div>
    </div>
  );
};

export default BookingModal;
