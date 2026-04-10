import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from './context/AppContext';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  Calendar, ArrowRight, X, ChevronLeft, ChevronRight,
  Users, Phone, CheckCircle2, Info, ArrowLeft, Plus, Minus, Sun, Moon
} from 'lucide-react';

const RoomBookingFrontEnd = () => {
  const {
    lang, setLang, t, settings, rooms, bookings,
    getSmartPrice, getPromoInfo, checkAvailability,
    isDark, toggleDark, saveBooking,
  } = useApp();

  const [step, setStep] = useState(1);
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [extraGuests, setExtraGuests] = useState(0);
  const [guestInfo, setGuestInfo] = useState({ name: '', phone: '', note: '' });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectingType, setSelectingType] = useState('checkIn');

  const today = new Date().toISOString().split('T')[0];

  // ===== 計算 =====
  const isSoldOut = useMemo(() => {
    if (!dates.checkIn) return false;
    return rooms.every(r => !checkAvailability(dates.checkIn, r.id));
  }, [dates.checkIn, rooms, checkAvailability]);

  const nightCount = useMemo(() => {
    if (!dates.checkIn || !dates.checkOut) return 1;
    const diff = Math.ceil((new Date(dates.checkOut) - new Date(dates.checkIn)) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [dates.checkIn, dates.checkOut]);

  const currentRoom = rooms.find(r => r.id === selectedRoomId);
  const totalBill = useMemo(() => {
    if (!selectedRoomId || !dates.checkIn) return 0;
    const base = getSmartPrice(selectedRoomId, dates.checkIn);
    const extraFee = currentRoom?.extra_guest_fee || 500;
    return (base + (extraGuests * extraFee)) * nightCount;
  }, [selectedRoomId, dates.checkIn, extraGuests, nightCount, getSmartPrice, currentRoom]);

  // ===== 鎖房 =====
  const handleBooking = async () => {
    if (!dates.checkIn || !selectedRoomId) return;
    const bookingId = `${dates.checkIn}_${selectedRoomId}`;
    try {
      await saveBooking(bookingId, {
        customer_name: guestInfo.name,
        phone: guestInfo.phone,
        note: guestInfo.note,
        status: 'pending',
        room_id: selectedRoomId,
        date: dates.checkIn,
        extra_guests: extraGuests,
        total_price: totalBill,
        is_whole_house: false,
        created_at: new Date().toISOString(),
      });

      const roomName = lang === 'zh' ? currentRoom.name_zh : currentRoom.name_en;
      const template = `【FU-HOSTEL 預訂通報】\n狀態：等待匯款\n日期：${dates.checkIn} (${nightCount}晚)\n房型：${roomName}\n人數：${currentRoom.standard_capacity}+${extraGuests}\n總額：NT$ ${totalBill.toLocaleString()}\n---\n訂房人：${guestInfo.name}\n電話：${guestInfo.phone}\n備註：${guestInfo.note || '無'}\n---\n請於24小時內匯款。`;
      const lineId = settings.line_oa_id || import.meta.env.VITE_LINE_OA_ID || '@nosun_happy';
      window.location.href = `https://line.me/R/oaMessage/${lineId}/?${encodeURIComponent(template)}`;
      setStep(4);
    } catch (e) {
      console.error('Booking error:', e);
      alert('鎖房失敗，請稍後再試。');
    }
  };

  // ===== 日期選擇器 =====
  const DatePickerModal = () => {
    const [viewDate, setViewDate] = useState(new Date(dates.checkIn || today));

    const renderDays = () => {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days = [];

      for (let i = 0; i < firstDay; i++) days.push(<div key={`p-${i}`} />);
      for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isPast = iso < today;
        const isToday = iso === today;
        const isSelected = dates[selectingType] === iso;

        // 檢查所有房型是否都已售罄
        const allSoldOut = rooms.length > 0 && rooms.every(r => !checkAvailability(iso, r.id));

        days.push(
          <button
            key={iso}
            disabled={isPast || allSoldOut}
            onClick={() => { setDates(prev => ({ ...prev, [selectingType]: iso })); setIsDatePickerOpen(false); }}
            className={`aspect-square flex flex-col items-center justify-center rounded-pms text-xs font-medium transition-all
              ${isSelected ? 'bg-pms-accent text-white font-bold scale-95' : 'hover:bg-pms-accent/15'}
              ${isToday && !isSelected ? 'calendar-today font-bold text-pms-accent' : ''}
              ${isPast ? 'opacity-20 pointer-events-none' : ''}
              ${allSoldOut && !isPast ? 'calendar-sold-out' : ''}
              ${!isPast && !allSoldOut && !isSelected ? 'text-pms-text' : ''}
            `}
          >
            {d}
          </button>
        );
      }
      return days;
    };

    return (
      <div className="fixed inset-0 z-[100] bg-pms-bg/95 backdrop-blur-xl flex flex-col">
        <header className="p-6 flex justify-between items-center border-b border-pms-border-light">
          <h3 className="font-heading font-bold text-pms-accent uppercase tracking-widest text-sm">{t(selectingType)}</h3>
          <button onClick={() => setIsDatePickerOpen(false)} className="p-2 rounded-pms bg-pms-bg-card text-pms-text-muted hover:text-pms-text"><X size={18} /></button>
        </header>
        <div className="flex-1 overflow-auto p-6 flex flex-col items-center">
          <div className="w-full max-w-sm">
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="p-2 border border-pms-border rounded-pms text-pms-text hover:bg-pms-accent/10"><ChevronLeft size={18} /></button>
              <span className="text-lg font-bold text-pms-text">{viewDate.getFullYear()} / {String(viewDate.getMonth() + 1).padStart(2, '0')}</span>
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="p-2 border border-pms-border rounded-pms text-pms-text hover:bg-pms-accent/10"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-[10px] text-pms-text-muted text-center mb-3 font-bold">
              {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">{renderDays()}</div>
            <div className="mt-6 flex gap-3 text-[9px] text-pms-text-muted justify-center font-bold">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pms-accent" /> 今日</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-pms-text-muted line-through" /> 客滿</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getDatePlaceholder = (type) => {
    if (lang === 'zh') return type === 'checkIn' ? '入住日期' : '退房日期';
    return type === 'checkIn' ? 'Check-in Date' : 'Check-out Date';
  };

  // ===== 價格顯示元件 =====
  const PriceDisplay = ({ roomId, date, className = '' }) => {
    const promo = getPromoInfo(roomId, date);
    const price = getSmartPrice(roomId, date);
    if (promo.hasPromo) {
      return (
        <span className={className}>
          <span className="price-original mr-1">NT$ {promo.originalPrice.toLocaleString()}</span>
          <span className="text-red-500 font-bold">NT$ {promo.promoPrice.toLocaleString()}</span>
        </span>
      );
    }
    return <span className={className}>NT$ {price.toLocaleString()}</span>;
  };

  return (
    <div className="min-h-screen bg-pms-bg text-pms-text font-body select-none pb-20 overflow-x-hidden">
      {isDatePickerOpen && <DatePickerModal />}

      {/* Nav */}
      <nav className="px-5 py-5 flex justify-between items-center border-b border-pms-border-light sticky top-0 bg-pms-bg/90 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          {step > 1 && step < 4 && <button onClick={() => setStep(step - 1)} className="p-1 text-pms-text"><ArrowLeft size={18} /></button>}
          <div>
            <h1 className="font-heading text-lg font-bold text-pms-accent leading-tight">{settings.hostel_name || '防曬不要擦太多民宿'}</h1>
            <p className="text-[8px] font-bold text-pms-text-muted uppercase tracking-[0.2em]">{t(`step${step}`)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleDark} className="p-2 rounded-pms border border-pms-border text-pms-accent hover:bg-pms-accent/10 transition-all">
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="text-[10px] font-bold px-3 py-1.5 rounded-pms border border-pms-border hover:bg-pms-accent hover:text-white transition-all text-pms-text">
            🌐 {lang === 'zh' ? 'EN' : 'ZH'}
          </button>
        </div>
      </nav>

      <main className="px-5 md:px-8 max-w-xl mx-auto py-10 space-y-10">
        {/* Step 1: 日期選擇 */}
        {step === 1 && (
          <div className="space-y-10">
            <header className="text-center space-y-3">
              <h2 className="font-heading text-4xl font-bold text-pms-text leading-tight text-shadow-glow">
                {settings[`home_title_${lang}`] || settings.hostel_name}
              </h2>
              <p className="text-[10px] text-pms-text-muted uppercase tracking-[0.3em] font-bold">
                {settings[`home_subtitle_${lang}`]}
              </p>
            </header>

            <div className="space-y-4">
              {['checkIn', 'checkOut'].map(type => (
                <button key={type}
                  onClick={() => { setSelectingType(type); setIsDatePickerOpen(true); }}
                  className={`w-full p-6 bg-pms-bg-card rounded-pms border-2 flex justify-between items-center transition-all
                    ${dates[type] ? 'border-pms-accent bg-pms-accent/5 scale-[0.99]' : 'border-pms-border-light'}`}
                >
                  <div className="text-left">
                    <p className="text-[9px] uppercase font-bold text-pms-text-muted mb-1.5 tracking-widest">{t(type)}</p>
                    <p className={`text-lg font-bold ${!dates[type] ? 'text-pms-text-muted opacity-50' : 'text-pms-text'}`}>
                      {dates[type] || getDatePlaceholder(type)}
                    </p>
                  </div>
                  <Calendar className={dates[type] ? 'text-pms-accent' : 'text-pms-text-muted opacity-30'} size={20} />
                </button>
              ))}
            </div>

            {isSoldOut && (
              <div className="p-6 bg-orange-500/5 rounded-pms border border-orange-500/20 space-y-4">
                <div className="flex items-center gap-2 text-orange-500 font-bold text-sm"><Info size={18} /> {t('fullyBooked')}</div>
                <p className="text-xs text-pms-text-muted">別擔心！請嘗試選擇其他日期。</p>
                {settings.referral_switch && (
                  <p className="text-[10px] text-center italic text-pms-text-muted pt-3 border-t border-orange-500/10">
                    💡 {settings[`referral_msg_${lang}`]}
                  </p>
                )}
              </div>
            )}

            <button
              disabled={!dates.checkIn || !dates.checkOut || isSoldOut}
              onClick={() => setStep(2)}
              className="w-full bg-pms-accent text-white font-bold py-5 rounded-pms text-lg active:scale-[0.98] disabled:opacity-20 transition-all shadow-glow"
            >
              {lang === 'zh' ? '選擇房型' : 'CHOOSE ROOM'} <ArrowRight className="inline ml-2" size={20} />
            </button>
          </div>
        )}

        {/* Step 2: 房型選擇 */}
        {step === 2 && (
          <div className="space-y-8">
            <h2 className="font-heading text-3xl font-bold text-center text-pms-text">{lang === 'zh' ? '選擇您的空間' : 'Select Your Space'}</h2>
            <div className="space-y-5">
              {rooms.map(room => {
                const isAvailable = checkAvailability(dates.checkIn, room.id);
                const isSelected = selectedRoomId === room.id;
                const roomName = lang === 'zh' ? room.name_zh : room.name_en;

                return (
                  <div key={room.id} className={`transition-all ${!isAvailable ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                    <button
                      disabled={!isAvailable}
                      onClick={() => { setSelectedRoomId(room.id); setExtraGuests(0); }}
                      className={`w-full rounded-pms border-2 text-left overflow-hidden transition-all
                        ${isSelected ? 'border-pms-accent bg-pms-accent text-white' : 'border-pms-border-light bg-pms-bg-card'}`}
                    >
                      {room.photos?.[0] && (
                        <img src={room.photos[0]} alt={roomName} className="w-full h-36 object-cover" />
                      )}
                      <div className="p-5 flex justify-between items-start">
                        <div>
                          <h3 className="font-heading text-xl font-bold mb-1">{roomName}</h3>
                          <p className={`text-[10px] font-bold flex items-center gap-1 ${isSelected ? 'opacity-70' : 'text-pms-text-muted'}`}>
                            <Users size={11} /> {room.standard_capacity} {t('standard')}
                          </p>
                        </div>
                        <div className="text-right">
                          <PriceDisplay roomId={room.id} date={dates.checkIn} className="text-sm font-bold" />
                        </div>
                      </div>
                    </button>

                    {isSelected && (
                      <div className="mt-3 p-5 bg-pms-bg-card rounded-pms border border-pms-border-light space-y-5">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-bold text-pms-text-muted uppercase tracking-widest mb-1">{t('extra')}</p>
                            <p className="text-xs font-bold text-pms-text">+NT$ {room.extra_guest_fee} / 人</p>
                          </div>
                          <div className="flex items-center gap-4 bg-pms-bg p-2 rounded-pms border border-pms-border-light">
                            <button onClick={() => setExtraGuests(Math.max(0, extraGuests - 1))} className="p-1 hover:text-pms-accent text-pms-text"><Minus size={18} /></button>
                            <span className="text-lg font-bold w-5 text-center text-pms-text">{extraGuests}</span>
                            <button onClick={() => setExtraGuests(Math.min(room.max_capacity - room.standard_capacity, extraGuests + 1))} className="p-1 hover:text-pms-accent text-pms-text"><Plus size={18} /></button>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-pms-border-light flex justify-between items-center">
                          <span className="text-[9px] font-bold text-pms-text-muted uppercase tracking-widest">{t('total')} ({nightCount} {t('nights')})</span>
                          <span className="text-2xl font-bold text-pms-accent">NT$ {totalBill.toLocaleString()}</span>
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
              className="w-full bg-pms-accent text-white font-bold py-5 rounded-pms text-lg active:scale-[0.98] disabled:opacity-20 transition-all shadow-glow"
            >
              {lang === 'zh' ? '繼續填寫' : 'CONTINUE'} <ArrowRight className="inline ml-2" size={20} />
            </button>
          </div>
        )}

        {/* Step 3: 旅客資料 */}
        {step === 3 && (
          <div className="space-y-8">
            <h2 className="font-heading text-3xl font-bold text-center text-pms-text">{t('step3')}</h2>

            <div className="bg-pms-bg-card p-5 rounded-pms border border-pms-border-light">
              <div className="flex justify-between text-[10px] font-bold text-pms-text-muted uppercase tracking-widest">
                <span>Summary</span>
                <span>{lang === 'zh' ? currentRoom?.name_zh : currentRoom?.name_en} · {nightCount} {t('nights')}</span>
              </div>
              <div className="flex justify-between items-baseline mt-2">
                <span className="text-xl font-bold text-pms-accent">NT$ {totalBill.toLocaleString()}</span>
                <span className="text-xs font-bold text-pms-text-muted">👤 {currentRoom?.standard_capacity}+{extraGuests}</span>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { key: 'name', type: 'text', icon: <Info size={16} /> },
                { key: 'phone', type: 'tel', icon: <Phone size={16} /> },
              ].map(field => (
                <div key={field.key} className="relative group">
                  <input
                    type={field.type} placeholder={t(field.key)} required
                    value={guestInfo[field.key]}
                    onChange={e => setGuestInfo({ ...guestInfo, [field.key]: e.target.value })}
                    className="w-full bg-pms-bg-card p-4 pl-12 rounded-pms border border-pms-border-light font-bold text-sm focus:border-pms-accent outline-none text-pms-text placeholder:text-pms-text-muted/40"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-pms-text-muted opacity-30 group-focus-within:opacity-100 group-focus-within:text-pms-accent transition-all">
                    {field.icon}
                  </div>
                </div>
              ))}
              <textarea
                placeholder={t('note')}
                value={guestInfo.note}
                onChange={e => setGuestInfo({ ...guestInfo, note: e.target.value })}
                className="w-full bg-pms-bg-card p-4 rounded-pms border border-pms-border-light font-medium text-sm h-24 focus:border-pms-accent outline-none text-pms-text resize-none placeholder:text-pms-text-muted/40"
              />
            </div>

            <button
              disabled={!guestInfo.name || !guestInfo.phone}
              onClick={handleBooking}
              className="w-full bg-pms-accent text-white font-bold py-5 rounded-pms text-lg active:scale-[0.98] disabled:opacity-20 transition-all shadow-glow"
            >
              {t('bookingBtn')}
            </button>
          </div>
        )}

        {/* Step 4: 完成 */}
        {step === 4 && (
          <div className="text-center space-y-10 py-8">
            <div className="bg-pms-accent/15 w-32 h-32 rounded-full flex items-center justify-center mx-auto border-4 border-pms-accent shadow-glow animate-bounce">
              <CheckCircle2 size={64} className="text-pms-accent" />
            </div>
            <h2 className="font-heading text-4xl font-bold text-pms-accent">Booking Locked!</h2>
            <div className="space-y-3">
              <p className="text-pms-text font-bold text-lg">房源已為您保留 24 小時。</p>
              <p className="text-pms-text-muted text-sm">請依 LINE 訊息引导完成匯款確認。<br />若未收到訊息請聯繫官方客服。</p>
            </div>
            <button
              onClick={() => { setStep(1); setDates({ checkIn: '', checkOut: '' }); setSelectedRoomId(null); }}
              className="text-pms-accent font-bold text-xs uppercase tracking-widest opacity-50 hover:opacity-100 transition-all border-b-2 border-pms-accent/20 pb-1"
            >
              Back to Start
            </button>
          </div>
        )}
      </main>

      <footer className="mt-16 text-center py-8 border-t border-pms-border-light max-w-xs mx-auto">
        <p className="text-[9px] font-bold text-pms-text-muted opacity-30 uppercase tracking-[0.3em] leading-relaxed">
          © 2026 FU-HOSTEL · PMS V6.0<br />DESIGNED BY AH-ZHI ARCHITECTURE
        </p>
      </footer>
    </div>
  );
};

export default RoomBookingFrontEnd;
