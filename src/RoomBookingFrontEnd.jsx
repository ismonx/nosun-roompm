import React, { useState, useMemo, memo, useCallback } from 'react';
import { useApp } from './context/AppContext';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { 
  Calendar, ArrowRight, X, ChevronLeft, ChevronRight, 
  Power, Users, Phone, CheckCircle2, Info, ArrowLeft, Plus, Minus, Sun, Moon
} from 'lucide-react';

// 阿芝規範：強制 Memoization 確保舊款 Mac 流暢運行
const DateCard = memo(({ date, price, onClick, lang }) => (
  <button 
    onClick={() => onClick(date)}
    className="w-full p-5 bg-hostel-moss/10 dark:bg-hostel-dark-moss/10 rounded-2xl flex justify-between items-center border border-hostel-olive/10 dark:border-hostel-dark-olive/10 hover:border-hostel-moss dark:hover:border-hostel-dark-moss transition-all duration-500 active:scale-95"
  >
    <div className="text-left">
      <span className="font-black text-sm block text-hostel-text dark:text-hostel-dark-text">{date}</span>
      <span className="text-[10px] opacity-40 uppercase tracking-widest text-hostel-text dark:text-hostel-dark-text">{lang === 'zh' ? '最優惠價格' : 'Best Price'}</span>
    </div>
    <span className="text-sm font-black text-hostel-moss dark:text-hostel-dark-moss">NT$ {price.toLocaleString()}</span>
  </button>
));

const RoomBookingFrontEnd = () => {
  const { lang, setLang, t, settings, bookings, getSmartPrice, isDark, toggleDark } = useApp();
  
  const [step, setStep] = useState(1);
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [extraGuests, setExtraGuests] = useState(0);
  const [guestInfo, setGuestInfo] = useState({ name: '', phone: '', note: '' });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectingType, setSelectingType] = useState('checkIn');

  // 阿芝規範：邏輯優先 - 檢查房況
  const checkAvailability = useCallback((dateStr, roomId) => {
    const isClosed = !settings.openIntervals.some(r => (r.roomId === 'all' || r.roomId === roomId) && dateStr >= r.startDate && dateStr <= r.endDate);
    if (isClosed) return false;
    
    // 檢查該日期是否有預訂
    const booking = bookings[`${dateStr}_${roomId}`];
    const wholeHouseBooking = bookings[`${dateStr}_all`]; // 假設有整棟鎖房邏輯
    return !booking && !wholeHouseBooking;
  }, [settings.openIntervals, bookings]);

  // Step 1: ±2 日推薦邏輯
  const recommendations = useMemo(() => {
    if (!dates.checkIn) return [];
    const recs = [];
    const offsets = [1, -1, 2, -2];
    for (let offset of offsets) {
      const d = new Date(dates.checkIn);
      d.setDate(d.getDate() + offset);
      const iso = d.toISOString().split('T')[0];
      
      // 搜尋當天最低房價
      const availableRooms = settings.rooms.filter(r => checkAvailability(iso, r.id));
      if (availableRooms.length > 0) {
        const lowestPrice = Math.min(...availableRooms.map(r => getSmartPrice(r.id, iso)));
        recs.push({ date: iso, price: lowestPrice });
        if (recs.length >= 2) break;
      }
    }
    return recs;
  }, [dates.checkIn, settings.rooms, checkAvailability, getSmartPrice]);

  const isSoldOut = useMemo(() => {
    if (!dates.checkIn) return false;
    return settings.rooms.every(r => !checkAvailability(dates.checkIn, r.id));
  }, [dates.checkIn, settings.rooms, checkAvailability]);

  const nightCount = useMemo(() => {
    if (!dates.checkIn || !dates.checkOut) return 1;
    const start = new Date(dates.checkIn);
    const end = new Date(dates.checkOut);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [dates.checkIn, dates.checkOut]);

  const currentRoom = settings.rooms.find(r => r.id === selectedRoomId);
  const totalBill = useMemo(() => {
    if (!selectedRoomId || !dates.checkIn) return 0;
    const base = getSmartPrice(selectedRoomId, dates.checkIn);
    const extraPrice = settings.extraGuestPrice || 500; // 使用校準價格
    return (base + (extraGuests * extraPrice)) * nightCount;
  }, [selectedRoomId, dates.checkIn, extraGuests, nightCount, getSmartPrice, settings.extraGuestPrice]);

  // Step 4: 鎖房與跳轉
  const handleBooking = async () => {
    if (!dates.checkIn || !selectedRoomId) return;
    const bookingId = `${dates.checkIn}_${selectedRoomId}`;
    
    try {
      // 寫入 Firestore 標記為 pending
      await setDoc(doc(db, "bookings", bookingId), {
        customerName: guestInfo.name,
        phone: guestInfo.phone,
        note: guestInfo.note,
        status: 'pending',
        roomId: selectedRoomId,
        date: dates.checkIn,
        extraGuests: extraGuests,
        totalPrice: totalBill,
        createdAt: new Date().toISOString()
      });

      // 構建 LINE 範本
      const template = `【2026 FU-HOSTEL 預訂自通報】\n` +
        `狀態：等待匯款 (Pending)\n` +
        `日期：${dates.checkIn} (${nightCount} 晚)\n` +
        `房型：${currentRoom.name[lang]}\n` +
        `人數：${currentRoom.standardCapacity} + 加 ${extraGuests} 位\n` +
        `總額：NT$ ${totalBill.toLocaleString()}\n` +
        `-----------------------\n` +
        `訂房人：${guestInfo.name}\n` +
        `電話：${guestInfo.phone}\n` +
        `備註：${guestInfo.note || '無'}\n` +
        `-----------------------\n` +
        `請在 24 小時內完成匯款以保留房源。`;

      const lineId = import.meta.env.VITE_LINE_OA_ID || "@nosun_happy";
      window.location.href = `https://line.me/R/oaMessage/${lineId}/?${encodeURIComponent(template)}`;
      setStep(4);
    } catch (e) {
      console.error("Booking error:", e);
      alert("鎖房失敗，請稍後再試。");
    }
  };

  // 日期選擇器彈窗 (優化版本)
  const DatePickerModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const [viewDate, setViewDate] = useState(new Date(dates.checkIn || '2026-04-01'));
    
    const renderDays = () => {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days = [];
      
      for (let i = 0; i < firstDay; i++) days.push(<div key={`pad-${i}`} />);
      for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isPast = iso < today;
        const isSelected = dates[selectingType] === iso;
        days.push(
          <button 
            key={iso}
            disabled={isPast}
            onClick={() => { setDates(prev => ({ ...prev, [selectingType]: iso })); setIsDatePickerOpen(false); }}
            className={`aspect-square flex flex-col items-center justify-center rounded-2xl text-xs transition-all duration-500 
              ${isSelected ? 'bg-hostel-moss dark:bg-hostel-dark-moss text-hostel-bg dark:text-hostel-dark-bg scale-90 font-black' : 'hover:bg-hostel-moss/20 dark:hover:bg-hostel-dark-moss/20'} 
              ${isPast ? 'opacity-10 cursor-not-allowed' : 'text-hostel-text dark:text-hostel-dark-text'}`}
          >
            {d}
            {isSelected && <div className="w-1 h-1 bg-hostel-bg dark:bg-hostel-dark-bg rounded-full mt-1" />}
          </button>
        );
      }
      return days;
    };

    return (
      <div className="fixed inset-0 z-[100] bg-hostel-bg/95 dark:bg-hostel-dark-bg/95 backdrop-blur-xl flex flex-col animate-in fade-in slide-in-from-bottom-10 pointer-events-auto transition-all duration-500">
        <header className="p-8 flex justify-between items-center bg-hostel-bg dark:bg-hostel-dark-bg border-b border-hostel-forest/10 dark:border-hostel-dark-forest/10">
          <h3 className="font-black uppercase tracking-widest text-hostel-moss dark:text-hostel-dark-moss">{t(selectingType)}</h3>
          <button onClick={() => setIsDatePickerOpen(false)} className="p-2 bg-hostel-forest/20 dark:bg-hostel-dark-forest/50 rounded-full text-hostel-text dark:text-hostel-dark-text"><X/></button>
        </header>
        <div className="flex-1 overflow-auto p-8 flex flex-col items-center">
          <div className="w-full max-w-sm">
            <div className="flex justify-between items-center mb-12">
              <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-3 border border-hostel-forest/20 dark:border-hostel-dark-forest/20 rounded-xl text-hostel-text dark:text-hostel-dark-text"><ChevronLeft /></button>
              <span className="text-xl font-black text-hostel-text dark:text-hostel-dark-text">{viewDate.getFullYear()} / {String(viewDate.getMonth() + 1).padStart(2, '0')}</span>
              <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-3 border border-hostel-forest/20 dark:border-hostel-dark-forest/20 rounded-xl text-hostel-text dark:text-hostel-dark-text"><ChevronRight /></button>
            </div>
            <div className="grid grid-cols-7 gap-3 text-[10px] opacity-40 text-center mb-6 uppercase tracking-widest font-black text-hostel-text dark:text-hostel-dark-text">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-3">{renderDays()}</div>
          </div>
        </div>
      </div>
    );
  };

  // 日期欄位 placeholder 文字
  const getDatePlaceholder = (type) => {
    if (lang === 'zh') return type === 'checkIn' ? '入住日期' : '退房日期';
    return type === 'checkIn' ? 'Check-in Date' : 'Check-out Date';
  };

  return (
    <div className="min-h-screen bg-hostel-bg dark:bg-hostel-dark-bg text-hostel-text dark:text-hostel-dark-text font-sans select-none pb-20 overflow-x-hidden transition-all duration-500">
      {isDatePickerOpen && <DatePickerModal />}

      <nav className="px-6 py-8 flex justify-between items-center border-b border-hostel-forest/10 dark:border-hostel-dark-forest/10 sticky top-0 bg-hostel-bg/90 dark:bg-hostel-dark-bg/90 backdrop-blur-md z-50 transition-all duration-500">
        <div className="flex items-center gap-4">
          {step > 1 && step < 4 && <button onClick={() => setStep(step - 1)} className="p-1 text-hostel-text dark:text-hostel-dark-text"><ArrowLeft size={18}/></button>}
          <div>
            <h1 className="text-xl font-black tracking-tighter text-hostel-moss dark:text-hostel-dark-moss uppercase leading-tight">{settings.hostelName}</h1>
            <p className="text-[8px] font-black opacity-40 uppercase tracking-[0.2em] text-hostel-text dark:text-hostel-dark-text">{t(`step${step}`)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 日夜切換按鈕 */}
          <button 
            onClick={toggleDark}
            className="p-2.5 rounded-full border border-hostel-moss/20 dark:border-hostel-dark-moss/20 hover:bg-hostel-moss/10 dark:hover:bg-hostel-dark-moss/10 transition-all duration-500 text-hostel-moss dark:text-hostel-dark-moss"
            aria-label="日夜切換"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button 
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="text-[10px] font-black px-3 py-1.5 rounded-full border border-hostel-moss/20 dark:border-hostel-dark-moss/20 hover:bg-hostel-moss dark:hover:bg-hostel-dark-moss hover:text-hostel-bg dark:hover:text-hostel-dark-bg transition-all duration-500 uppercase tracking-widest text-hostel-text dark:text-hostel-dark-text"
          >
            🌐 {lang === 'zh' ? 'EN' : 'ZH'}
          </button>
        </div>
      </nav>

      <main className="px-5 md:px-8 max-w-xl mx-auto py-14 space-y-16">
        {step === 1 && (
          <div className="space-y-16 animate-in fade-in duration-700">
            <header className="text-center space-y-5">
              <h2 className="text-5xl font-black tracking-tighter text-shadow-glow leading-tight text-hostel-text dark:text-hostel-dark-text">{settings.heroTitle || settings.hero?.[lang]?.title}</h2>
              <p className="text-[10px] text-hostel-olive dark:text-hostel-dark-olive opacity-80 uppercase tracking-[0.4em] font-black">{settings.hero?.[lang]?.subtitle}</p>
            </header>

            <div className="space-y-6">
              {['checkIn', 'checkOut'].map(type => (
                <button 
                  key={type}
                  onClick={() => { setSelectingType(type); setIsDatePickerOpen(true); }}
                  className={`w-full p-10 bg-hostel-forest/5 dark:bg-hostel-dark-forest/20 rounded-[2.5rem] border-2 flex justify-between items-center transition-all duration-500 ${dates[type] ? 'border-hostel-moss dark:border-hostel-dark-moss bg-hostel-moss/5 dark:bg-hostel-dark-moss/5 scale-[0.98]' : 'border-hostel-olive/10 dark:border-hostel-dark-olive/10'}`}
                >
                  <div className="text-left">
                    <p className="text-[9px] uppercase font-black opacity-30 mb-3 tracking-widest text-hostel-text dark:text-hostel-dark-text">{t(type)}</p>
                    <p className={`text-xl font-black ${!dates[type] ? 'opacity-30 text-hostel-olive dark:text-hostel-dark-olive' : 'text-hostel-text dark:text-hostel-dark-text'}`}>{dates[type] || getDatePlaceholder(type)}</p>
                  </div>
                  <Calendar className={`${dates[type] ? 'text-hostel-moss dark:text-hostel-dark-moss' : 'opacity-20 text-hostel-text dark:text-hostel-dark-text'}`} />
                </button>
              ))}
            </div>

            {isSoldOut && (
              <div className="p-10 bg-orange-500/5 rounded-[2.5rem] border border-orange-500/20 space-y-8 animate-in zoom-in-95">
                <div className="flex items-center gap-3 text-orange-500 font-black text-sm"><Info size={20}/> {t('fullyBooked')}</div>
                <p className="text-xs opacity-60 leading-relaxed font-medium text-hostel-text dark:text-hostel-dark-text">別擔心！我們為您掃描了附近的其他日期，或是可以參考我們的夥伴推薦：</p>
                <div className="space-y-4">
                  {recommendations.map((rec, i) => (
                    <DateCard key={i} date={rec.date} price={rec.price} onClick={(d) => setDates({ ...dates, checkIn: d })} lang={lang} />
                  ))}
                </div>
                {settings.referralSwitch && (
                  <div className="pt-6 border-t border-orange-500/10">
                    <p className="text-[10px] text-center italic opacity-60 font-black text-hostel-text dark:text-hostel-dark-text">💡 {settings.referralMsg[lang]}</p>
                  </div>
                )}
              </div>
            )}

            <button 
              disabled={!dates.checkIn || !dates.checkOut || isSoldOut} 
              onClick={() => setStep(2)}
              className="w-full bg-hostel-moss dark:bg-hostel-dark-moss text-hostel-bg dark:text-hostel-dark-bg font-black py-8 rounded-[2.5rem] text-xl active:scale-95 disabled:opacity-20 transition-all duration-500 shadow-glow hover:shadow-hostel-moss/20"
            >
              {lang === 'zh' ? '選擇房型' : 'CHOOSE ROOM'} <ArrowRight className="inline ml-2" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-12 animate-in slide-in-from-right duration-500">
            <h2 className="text-4xl font-black tracking-tight text-center text-hostel-text dark:text-hostel-dark-text">{lang === 'zh' ? '選擇您的空間' : 'Select Your Space'}</h2>
            <div className="space-y-8">
              {settings.rooms.map(room => {
                const isAvailable = checkAvailability(dates.checkIn, room.id);
                const isSelected = selectedRoomId === room.id;
                return (
                  <div key={room.id} className={`transition-all duration-500 ${!isAvailable ? 'opacity-30 grayscale' : ''}`}>
                    <button 
                      disabled={!isAvailable}
                      onClick={() => { setSelectedRoomId(room.id); setExtraGuests(0); }}
                      className={`w-full p-10 rounded-[3rem] border-2 text-left flex flex-col gap-8 transition-all duration-500 ${isSelected ? 'bg-hostel-moss dark:bg-hostel-dark-moss border-hostel-moss dark:border-hostel-dark-moss text-hostel-bg dark:text-hostel-dark-bg' : 'bg-hostel-forest/10 dark:bg-hostel-dark-forest/20 border-hostel-olive/10 dark:border-hostel-dark-olive/10'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-2xl font-black mb-2">{room.name[lang]}</h2>
                          <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isSelected ? 'opacity-60' : 'opacity-40'}`}>
                            <Users size={12}/> {room.standardCapacity} {t('standard')}
                          </p>
                        </div>
                        <span className="text-lg font-black">NT$ {getSmartPrice(room.id, dates.checkIn).toLocaleString()}</span>
                      </div>
                    </button>
                    
                    {isSelected && (
                      <div className="mt-6 p-10 bg-hostel-forest/10 dark:bg-hostel-dark-forest/20 rounded-[3rem] border border-hostel-moss/20 dark:border-hostel-dark-moss/20 space-y-10 animate-in slide-in-from-top-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 text-hostel-text dark:text-hostel-dark-text">{t('extra')}</p>
                            <p className="text-xs font-black text-hostel-text dark:text-hostel-dark-text">+NT$ {room.extraGuestFee} / 人</p>
                          </div>
                          <div className="flex items-center gap-6 bg-hostel-bg/40 dark:bg-hostel-dark-bg/40 p-4 rounded-2xl border border-hostel-moss/10 dark:border-hostel-dark-moss/10">
                            <button onClick={() => setExtraGuests(Math.max(0, extraGuests - 1))} className="p-1 hover:text-hostel-moss dark:hover:text-hostel-dark-moss text-hostel-text dark:text-hostel-dark-text"><Minus size={20}/></button>
                            <span className="text-xl font-black w-6 text-center text-hostel-text dark:text-hostel-dark-text">{extraGuests}</span>
                            <button onClick={() => setExtraGuests(Math.min(room.maxCapacity - room.standardCapacity, extraGuests + 1))} className="p-1 hover:text-hostel-moss dark:hover:text-hostel-dark-moss text-hostel-text dark:text-hostel-dark-text"><Plus size={20}/></button>
                          </div>
                        </div>
                        <div className="pt-10 border-t border-hostel-moss/10 dark:border-hostel-dark-moss/10 flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 text-hostel-text dark:text-hostel-dark-text">{t('total')} ({nightCount} {t('nights')})</span>
                          <span className="text-3xl font-black text-hostel-moss dark:text-hostel-dark-moss">NT$ {totalBill.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button 
              disabled={!selectedRoomId} 
              onClick={() => setStep(3)}
              className="w-full bg-hostel-moss dark:bg-hostel-dark-moss text-hostel-bg dark:text-hostel-dark-bg font-black py-8 rounded-[2.5rem] text-xl active:scale-95 shadow-xl transition-all duration-500"
            >
              {lang === 'zh' ? '繼續填寫' : 'CONTINUE'} <ArrowRight className="inline ml-2" />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-12 animate-in slide-in-from-right duration-500">
            <h2 className="text-4xl font-black text-center text-hostel-text dark:text-hostel-dark-text">{t('step3')}</h2>
            
            <div className="bg-hostel-forest/5 dark:bg-hostel-dark-forest/20 p-10 rounded-[3rem] border border-hostel-olive/10 dark:border-hostel-dark-olive/10 space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-30 text-hostel-text dark:text-hostel-dark-text">
                <span>Summary</span>
                <span>{currentRoom?.name[lang]} · {nightCount} {lang === 'zh' ? '晚' : 'NIGHTS'}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-black text-hostel-moss dark:text-hostel-dark-moss">NT$ {totalBill.toLocaleString()}</span>
                <span className="text-xs font-black opacity-60 text-hostel-text dark:text-hostel-dark-text">👤 {currentRoom?.standardCapacity} + {extraGuests}</span>
              </div>
            </div>

            <div className="space-y-5">
              {[
                { key: 'name', type: 'text', icon: <Info size={18}/> },
                { key: 'phone', type: 'tel', icon: <Phone size={18}/> },
                { key: 'note', type: 'textarea', icon: null }
              ].map(field => field.key === 'note' ? (
                <textarea 
                  key={field.key}
                  placeholder={t(field.key)}
                  value={guestInfo[field.key]}
                  onChange={e => setGuestInfo({ ...guestInfo, [field.key]: e.target.value })}
                  className="w-full bg-hostel-forest/10 dark:bg-hostel-dark-forest/20 p-7 rounded-[2rem] border border-hostel-olive/20 dark:border-hostel-dark-olive/20 font-bold h-32 focus:border-hostel-moss dark:focus:border-hostel-dark-moss outline-none transition-all duration-500 text-hostel-text dark:text-hostel-dark-text placeholder:text-hostel-text/20 dark:placeholder:text-hostel-dark-text/20"
                />
              ) : (
                <div key={field.key} className="relative group">
                  <input 
                    type={field.type}
                    placeholder={t(field.key)}
                    required
                    value={guestInfo[field.key]}
                    onChange={e => setGuestInfo({ ...guestInfo, [field.key]: e.target.value })}
                    className="w-full bg-hostel-forest/10 dark:bg-hostel-dark-forest/20 p-7 px-16 rounded-[2rem] border border-hostel-olive/20 dark:border-hostel-dark-olive/20 font-black focus:border-hostel-moss dark:focus:border-hostel-dark-moss outline-none transition-all duration-500 text-hostel-text dark:text-hostel-dark-text placeholder:text-hostel-text/20 dark:placeholder:text-hostel-dark-text/20"
                  />
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 group-focus-within:text-hostel-moss dark:group-focus-within:text-hostel-dark-moss transition-all duration-500 text-hostel-text dark:text-hostel-dark-text">
                    {field.icon}
                  </div>
                </div>
              ))}
            </div>

            <button 
              disabled={!guestInfo.name || !guestInfo.phone}
              onClick={handleBooking}
              className="w-full bg-hostel-moss dark:bg-hostel-dark-moss text-hostel-bg dark:text-hostel-dark-bg font-black py-8 rounded-[2.5rem] text-xl active:scale-95 shadow-glow transition-all duration-500"
            >
              {t('bookingBtn')}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-14 animate-in zoom-in-95 duration-1000 py-12">
            <div className="bg-hostel-moss/20 dark:bg-hostel-dark-moss/20 w-40 h-40 rounded-full flex items-center justify-center mx-auto border-4 border-hostel-moss dark:border-hostel-dark-moss shadow-glow animate-bounce">
              <CheckCircle2 size={80} className="text-hostel-moss dark:text-hostel-dark-moss" />
            </div>
            <h2 className="text-5xl font-black tracking-tighter uppercase text-hostel-moss dark:text-hostel-dark-moss">Booking Locked!</h2>
            <div className="space-y-5">
              <p className="text-hostel-text dark:text-hostel-dark-text font-black text-lg">房源已為您保留 24 小時。</p>
              <p className="text-hostel-olive dark:text-hostel-dark-olive font-medium opacity-60">請依 LINE 訊息引导完成最終匯款確認。<br/>若未收到訊息請聯繫官方客服。</p>
            </div>
            <button 
              onClick={() => { setStep(1); setDates({ checkIn: '', checkOut: '' }); setSelectedRoomId(null); }}
              className="mt-12 inline-block text-hostel-moss dark:text-hostel-dark-moss font-black text-xs uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-all duration-500 border-b-2 border-hostel-moss/20 dark:border-hostel-dark-moss/20 pb-2"
            >
              Back to Start
            </button>
          </div>
        )}
      </main>
      
      <footer className="mt-24 text-center py-12 border-t border-hostel-forest/5 dark:border-hostel-dark-forest/5 max-w-xs mx-auto">
        <p className="text-[9px] font-black opacity-20 uppercase tracking-[0.4em] leading-relaxed text-hostel-text dark:text-hostel-dark-text">
          © 2026 FU-HOSTEL · ALL RIGHTS RESERVED<br/>DESIGNED BY AH-ZHI ARCHITECTURE
        </p>
      </footer>
    </div>
  );
};

export default memo(RoomBookingFrontEnd);
