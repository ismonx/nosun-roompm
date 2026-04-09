import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useApp } from './context/AppContext';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { 
  Calendar as CalendarIcon, DollarSign, Settings, LogOut, 
  X, Save, Phone, ChevronLeft, ChevronRight, Crown, Power, Wallet
} from 'lucide-react';

// 阿芝規範：強制 Memoization 確保矩陣不卡頓
const MatrixCell = memo(({ date, roomId, booking, onSelect, isWholeHouse, isOpen, t }) => {
  const getStatusStyle = () => {
    if (!isOpen) return 'bg-slate-900/40 opacity-40 cursor-not-allowed';
    if (!booking) return isWholeHouse ? 'bg-indigo-50/50 hover:bg-indigo-100/50' : 'hover:bg-hostel-forest/30';
    
    switch (booking.status) {
      case 'pending': return 'bg-yellow-400 text-hostel-bg shadow-lg shadow-yellow-400/20';
      case 'deposit': return 'bg-blue-500 text-white';
      case 'full': return 'bg-green-600 text-white font-black';
      default: return 'bg-hostel-forest/50 text-hostel-sand';
    }
  };

  return (
    <div 
      onClick={() => isOpen && onSelect(date, roomId)}
      className={`relative aspect-square sm:aspect-[1.6/1] rounded-xl border border-hostel-olive/5 p-1 transition-all flex flex-col justify-between overflow-hidden cursor-pointer ${getStatusStyle()}`}
    >
      <div className="flex justify-between items-start">
        <span className="text-[9px] font-black opacity-40">{date.split('-').pop()}</span>
        {isWholeHouse && !booking && <Crown size={10} className="text-indigo-400 animate-pulse" />}
      </div>

      {booking && (
        <div className="flex flex-col gap-0.5 animate-in zoom-in-95">
          <span className="text-[8px] font-black truncate leading-tight uppercase tracking-tighter">{booking.customerName}</span>
          <div className="flex justify-between items-center px-0.5">
             <span className="text-[7px] font-bold opacity-80">${(booking.totalPrice/1000).toFixed(1)}k</span>
          </div>
        </div>
      )}
    </div>
  );
});

const RoomAdminDashboard = ({ onLogout }) => {
  const { lang, t, settings, bookings, updateSettings, getSmartPrice } = useApp();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  const [viewDate, setViewDate] = useState(new Date('2026-04-01'));
  const [selectedCell, setSelectedCell] = useState(null);
  
  const [modalData, setModalData] = useState({
    customerName: '', phone: '', note: '', status: 'pending', extraGuests: 0, 
    manualPrice: 0, isWholeHouse: false
  });

  // 當選擇格子時帶入現有資料
  useEffect(() => {
    if (selectedCell) {
      const key = `${selectedCell.date}_${selectedCell.roomId}`;
      const existing = bookings[key];
      if (existing) {
        setModalData({
          customerName: existing.customerName || '',
          phone: existing.phone || '',
          note: existing.note || '',
          status: existing.status || 'pending',
          extraGuests: existing.extraGuests || 0,
          manualPrice: existing.totalPrice || 0,
          isWholeHouse: existing.isWholeHouse || false
        });
      } else {
        const base = getSmartPrice(selectedCell.roomId, selectedCell.date);
        setModalData({ 
          customerName: '', phone: '', note: '', status: 'pending', 
          extraGuests: 0, manualPrice: base, isWholeHouse: false 
        });
      }
    }
  }, [selectedCell, bookings, getSmartPrice]);

  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const total = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return { iso: d.toISOString().split('T')[0], day: d.getDay() };
    });
  }, [viewDate]);

  const checkIfOpen = useCallback((iso, roomId) => {
    return settings.openIntervals.some(r => (r.roomId === 'all' || r.roomId === roomId) && iso >= r.startDate && iso <= r.endDate);
  }, [settings.openIntervals]);

  const checkIfWholeHouse = useCallback((iso) => {
    // 如果該日任一房型標記為 isWholeHouse，則整列變色
    return settings.rooms.some(r => bookings[`${iso}_${r.id}`]?.isWholeHouse);
  }, [settings.rooms, bookings]);

  const handleUpdate = async () => {
    if (!selectedCell) return;
    const key = `${selectedCell.date}_${selectedCell.roomId}`;
    try {
      await setDoc(doc(db, "bookings", key), {
        ...modalData,
        totalPrice: Number(modalData.manualPrice),
        date: selectedCell.date,
        roomId: selectedCell.roomId,
        updatedAt: new Date().toISOString()
      });
      setSelectedCell(null);
    } catch (e) { console.error(e); }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-hostel-bg flex items-center justify-center p-6">
        <div className="bg-hostel-forest/20 p-12 rounded-[3.5rem] border border-hostel-olive/20 max-w-sm w-full backdrop-blur-3xl animate-in zoom-in-95">
          <h1 className="text-2xl font-black text-hostel-sand mb-8 text-center uppercase tracking-widest text-shadow-glow">FU OPS CENTER</h1>
          <input 
            type="password" placeholder="ENTER KEY" 
            onKeyDown={(e) => e.key === 'Enter' && e.target.value === '2026' && setIsAuthenticated(true)}
            className="w-full bg-hostel-bg/80 border border-hostel-olive/20 p-5 rounded-2xl mb-4 text-center tracking-[0.5em] text-hostel-sand focus:border-hostel-moss outline-none" 
          />
          <p className="text-[10px] text-center opacity-30 font-black uppercase tracking-widest">Logic-First Architecture V5.0</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hostel-bg text-hostel-sand font-sans flex flex-col md:flex-row overflow-hidden">
      
      <aside className="w-full md:w-72 bg-hostel-bg border-r border-hostel-forest/10 p-8 flex flex-col gap-10">
        <div>
          <h1 className="text-2xl font-black text-hostel-moss tracking-tighter uppercase">FU MATRIX</h1>
          <p className="text-[10px] font-black opacity-30 tracking-widest uppercase">Admin Matrix V5.0</p>
        </div>
        
        <nav className="flex-1 space-y-4">
          {[
            { id: 'calendar', label: '房況矩陣監控', icon: <CalendarIcon size={18}/> },
            { id: 'settings', label: '全域參數中心', icon: <Settings size={18}/> }
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)} 
              className={`w-full flex items-center gap-4 p-5 rounded-[2rem] transition-all font-black text-xs uppercase tracking-widest ${activeTab === item.id ? 'bg-hostel-olive text-hostel-bg shadow-xl' : 'opacity-40 hover:opacity-100 hover:bg-hostel-forest/20'}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <button onClick={onLogout} className="flex items-center gap-4 p-5 text-hostel-olive font-black text-xs uppercase tracking-widest opacity-60 hover:opacity-100"><LogOut size={18}/> {t('back')}</button>
      </aside>

      <main className="flex-1 overflow-auto p-4 md:p-10">
        {activeTab === 'calendar' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <header className="flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4 bg-hostel-forest/10 p-2 rounded-[2rem] border border-hostel-olive/10">
                <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth()-1)))} className="p-3 hover:bg-hostel-moss/20 rounded-2xl"><ChevronLeft size={20}/></button>
                <span className="px-8 font-black text-lg tracking-tight">{viewDate.getFullYear()} / {String(viewDate.getMonth() + 1).padStart(2, '0')}</span>
                <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth()+1)))} className="p-3 hover:bg-hostel-moss/20 rounded-2xl"><ChevronRight size={20}/></button>
              </div>
              <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest opacity-40">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Pending</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Deposit</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-600"></div> Full</div>
              </div>
            </header>

            <div className="bg-hostel-forest/5 rounded-[4rem] border border-hostel-olive/10 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto selection:none">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-hostel-forest/10 bg-hostel-bg/50 backdrop-blur-md">
                      <th className="p-8 sticky left-0 z-20 min-w-[120px] bg-hostel-bg border-r border-hostel-forest/10 text-[10px] font-black uppercase tracking-widest text-hostel-moss">Rooms</th>
                      {daysInMonth.map(day => (
                        <th key={day.iso} className={`p-6 min-w-[70px] md:min-w-[100px] text-[10px] font-black ${day.day === 0 || day.day === 6 ? 'text-orange-400' : 'opacity-40'}`}>
                          {day.iso.split('-').pop()}
                          <div className="text-[8px] uppercase">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day.day]}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {settings.rooms.map(room => (
                      <tr key={room.id} className="border-b border-hostel-forest/5 group hover:bg-hostel-olive/5 transition-colors">
                        <td className="p-6 bg-hostel-bg sticky left-0 z-20 font-black text-[10px] border-r border-hostel-forest/10 uppercase tracking-tighter shadow-xl">
                          {room.name[lang]}
                        </td>
                        {daysInMonth.map(day => (
                          <td key={`${day.iso}_${room.id}`} className="p-1 px-1.5">
                            <MatrixCell 
                              date={day.iso} roomId={room.id} booking={bookings[`${day.iso}_${room.id}`]}
                              isOpen={checkIfOpen(day.iso, room.id)} onSelect={(d, rid) => setSelectedCell({ date: d, roomId: rid })}
                              isWholeHouse={checkIfWholeHouse(day.iso)} t={t}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-4xl space-y-12 animate-in slide-in-from-bottom-10 duration-700">
            <h2 className="text-4xl font-black uppercase tracking-tight">全域參數中心</h2>
            
            <div className="bg-hostel-forest/10 p-10 rounded-[3.5rem] border border-hostel-olive/20 space-y-8">
              <h3 className="font-black text-sm uppercase tracking-widest text-hostel-moss">首頁視覺與文案 (Hero Text)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {['zh', 'en'].map(l => (
                  <div key={l} className="space-y-4">
                    <label className="text-[10px] font-black uppercase opacity-40 tracking-widest">Title ({l})</label>
                    <input 
                      type="text" value={settings.hero[l].title} 
                      onChange={e => updateSettings({ hero: { ...settings.hero, [l]: { ...settings.hero[l], title: e.target.value } } })}
                      className="w-full bg-hostel-bg/60 p-5 rounded-2xl border border-hostel-olive/10 font-bold focus:border-hostel-moss outline-none transition-all" 
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-hostel-forest/10 p-10 rounded-[3.5rem] border border-hostel-olive/20 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-sm uppercase tracking-widest text-hostel-moss">夥伴推薦系統</h3>
                  <button 
                    onClick={() => updateSettings({ referralSwitch: !settings.referralSwitch })} 
                    className={`w-12 h-6 rounded-full transition-all relative ${settings.referralSwitch ? 'bg-orange-500 shadow-glow-sm' : 'bg-slate-800'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.referralSwitch ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
                <textarea 
                  value={settings.referralMsg[lang]} 
                  onChange={e => updateSettings({ referralMsg: { ...settings.referralMsg, [lang]: e.target.value } })}
                  className="w-full bg-hostel-bg/60 p-5 rounded-2xl text-xs font-bold border border-hostel-olive/10 h-32 outline-none focus:border-hostel-moss" 
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 阿芝規範：互動式詳情彈窗 (核心神經連接) */}
      {selectedCell && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-hostel-bg/95 backdrop-blur-3xl" onClick={() => setSelectedCell(null)}></div>
          <div className="bg-hostel-forest/10 p-10 rounded-[4rem] border border-hostel-olive/30 w-full max-w-2xl relative animate-in zoom-in-95 shadow-2xl overflow-hidden">
            
            <header className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-4xl font-black tracking-tighter uppercase">{bookings[`${selectedCell.date}_${selectedCell.roomId}`] ? '營運詳情' : '手動加單'}</h3>
                <div className="flex items-center gap-4 mt-3">
                  <span className="bg-hostel-moss text-hostel-bg px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{selectedCell.date}</span>
                  <span className="text-hostel-sand font-black text-sm uppercase tracking-widest">{settings.rooms.find(r => r.id === selectedCell.roomId)?.name[lang]}</span>
                </div>
              </div>
              <button onClick={() => setSelectedCell(null)} className="p-4 bg-hostel-bg/50 rounded-[1.5rem] hover:bg-red-500/20 transition-all group">
                <X className="group-hover:rotate-90 transition-transform" />
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase opacity-40 ml-3 tracking-widest">Guest Name</label>
                  <input 
                    type="text" value={modalData.customerName} placeholder="客戶姓名"
                    onChange={e => setModalData({...modalData, customerName: e.target.value})}
                    className="w-full bg-hostel-bg/60 p-5 rounded-2xl border border-hostel-olive/10 font-bold focus:border-hostel-moss outline-none shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase opacity-40 ml-3 tracking-widest">Phone & Quick Call</label>
                  <div className="flex gap-3">
                    <input 
                      type="tel" value={modalData.phone} placeholder="聯絡電話"
                      onChange={e => setModalData({...modalData, phone: e.target.value})}
                      className="flex-1 bg-hostel-bg/60 p-5 rounded-2xl border border-hostel-olive/10 font-bold focus:border-hostel-moss outline-none"
                    />
                    {modalData.phone && (
                      <a href={`tel:${modalData.phone}`} className="p-5 bg-yellow-500/20 rounded-2xl text-yellow-500 hover:bg-yellow-500 hover:text-hostel-bg transition-all active:scale-90"><Phone size={20}/></a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40">整棟鎖房模式 (isWholeHouse)</span>
                  <button 
                    onClick={() => setModalData({...modalData, isWholeHouse: !modalData.isWholeHouse})}
                    className={`ml-auto w-10 h-5 rounded-full transition-all relative ${modalData.isWholeHouse ? 'bg-indigo-500' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${modalData.isWholeHouse ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-8 flex flex-col h-full">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase opacity-40 ml-3 tracking-widest">Operational Note</label>
                  <textarea 
                    value={modalData.note} placeholder="請輸入備註..."
                    onChange={e => setModalData({...modalData, note: e.target.value})}
                    className="w-full bg-hostel-bg/60 p-6 rounded-[2.5rem] border border-hostel-olive/10 font-bold h-32 focus:border-hostel-moss outline-none resize-none"
                  />
                </div>
                
                <div className="mt-auto space-y-4">
                  <div className="p-6 bg-hostel-moss/5 rounded-[2.5rem] border border-hostel-moss/20 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black uppercase opacity-40 tracking-widest mb-1">已繳實額 (手動覆蓋)</p>
                      <div className="flex gap-2 text-2xl font-black text-hostel-moss">
                        <span>NT$</span>
                        <input 
                          type="number" value={modalData.manualPrice} 
                          onChange={e => setModalData({...modalData, manualPrice: e.target.value})}
                          className="bg-transparent w-full focus:outline-none"
                        />
                      </div>
                    </div>
                    <Wallet size={24} className="opacity-20" />
                  </div>
                  
                  <div className="flex gap-2 bg-hostel-bg/40 p-1.5 rounded-2xl">
                    {['pending', 'deposit', 'full'].map(s => (
                      <button 
                        key={s} 
                        onClick={() => setModalData({...modalData, status: s})}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${modalData.status === s ? 'bg-hostel-moss text-hostel-bg shadow-lg' : 'opacity-30 hover:opacity-60'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <footer className="mt-12 flex gap-4">
              <button onClick={handleUpdate} className="flex-1 bg-hostel-moss text-hostel-bg font-black py-6 rounded-[2.5rem] shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3">
                <Save size={20}/> 儲存並同步矩陣
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(RoomAdminDashboard);
