import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from './context/AppContext';
import {
  Calendar, ArrowRight, X, ChevronLeft, ChevronRight,
  Users, Phone, CheckCircle2, Info, ArrowLeft, Plus, Minus, Sun, Moon, Sparkles,
  Languages
} from 'lucide-react';
import { Room } from './types';

const RoomBookingFrontEnd: React.FC<{ onAdminLogin: () => void }> = ({ onAdminLogin }) => {
  const {
    lang, setLang, t, settings, rooms,
    getSmartPrice, getPromoInfo, checkAvailability,
    isDark, toggleDark, saveBooking,
    validateCode, discountRate,
  } = useApp();

  const [codeInput, setCodeInput] = useState('');
  const [codeStatus, setCodeStatus] = useState<'valid' | 'invalid' | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);

  const [step, setStep] = useState(1);
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [extraGuests, setExtraGuests] = useState(0);
  const [guestInfo, setGuestInfo] = useState({ name: '', phone: '', note: '' });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectingType, setSelectingType] = useState<'checkIn' | 'checkOut'>('checkIn');

  const today = new Date().toISOString().split('T')[0];

  const isSoldOut = useMemo(() => {
    if (!dates.checkIn) return false;
    return rooms.every(r => !checkAvailability(dates.checkIn, r.id));
  }, [dates.checkIn, rooms, checkAvailability]);

  const nightCount = useMemo(() => {
    if (!dates.checkIn || !dates.checkOut) return 1;
    const diff = Math.ceil((new Date(dates.checkOut).getTime() - new Date(dates.checkIn).getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [dates.checkIn, dates.checkOut]);

  const recommendations = useMemo(() => {
    if (!dates.checkIn || !isSoldOut) return [];
    const suggestions: { date: string; minPrice: number }[] = [];
    const offsets = [-2, -1, 1, 2];
    const baseDate = new Date(dates.checkIn);

    offsets.forEach(offset => {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + offset);
      const iso = d.toISOString().split('T')[0];
      if (iso < today) return;

      const availableRoom = rooms.find(r => checkAvailability(iso, r.id));
      if (availableRoom) {
        const prices = rooms
          .filter(r => checkAvailability(iso, r.id))
          .map(r => getSmartPrice(r.id, iso));
        const minPrice = Math.min(...prices);
        suggestions.push({ date: iso, minPrice });
      }
    });
    return suggestions;
  }, [dates.checkIn, isSoldOut, rooms, checkAvailability, getSmartPrice, today]);

  const currentRoom = rooms.find(r => r.id === selectedRoomId);
  const totalBill = useMemo(() => {
    if (!selectedRoomId || !dates.checkIn) return 0;
    const base = getSmartPrice(selectedRoomId, dates.checkIn);
    const extraFee = currentRoom?.extra_guest_fee || 500;
    const subtotal = (base + (extraGuests * extraFee)) * nightCount;
    return Math.round(subtotal * discountRate);
  }, [selectedRoomId, dates.checkIn, extraGuests, nightCount, getSmartPrice, currentRoom, discountRate]);

  const handleBooking = async () => {
    if (!dates.checkIn || !selectedRoomId) return;
    const bookingId = `${dates.checkIn}_${selectedRoomId}`;
    try {
      await saveBooking(bookingId, {
        id: bookingId,
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
      setStep(4);
    } catch (e) {
      console.error('Booking error:', e);
      alert('鎖房失敗，請稍後再試。');
    }
  };

  const DatePickerModal = () => {
    const [viewDate, setViewDate] = useState(new Date(dates.checkIn || today));
    const renderDays = () => {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days = [];
      for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(<div key={`p-${i}`} />);
      for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isPast = iso < today;
        const isToday = iso === today;
        const isSelected = dates[selectingType] === iso;
        const remainingRooms = rooms.filter(r => checkAvailability(iso, r.id)).length;

        days.push(
          <button
            key={iso}
            disabled={isPast || remainingRooms === 0}
            onClick={() => { setDates(prev => ({ ...prev, [selectingType]: iso })); setIsDatePickerOpen(false); }}
            className={`aspect-square flex flex-col items-center justify-center rounded-pms text-xs font-medium transition-all relative
              ${isSelected ? 'bg-pms-accent text-white font-bold scale-95 ring-2 ring-pms-accent ring-offset-1' : 'hover:bg-pms-accent/15'}
              ${isToday && !isSelected ? 'border-[3px] border-black dark:border-white font-extrabold text-pms-accent' : ''}
              ${isPast ? 'opacity-20 pointer-events-none' : ''}
              ${remainingRooms === 0 && !isPast ? 'line-through text-gray-400 opacity-50' : ''}
            `}
          >
            {d}
            {remainingRooms > 0 && remainingRooms <= 2 && !isPast && !isSelected && (
              <span className="absolute bottom-0.5 text-[7px] text-orange-500 font-bold">剩{remainingRooms}</span>
            )}
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
              {['一', '二', '三', '四', '五', '六', '日'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">{renderDays()}</div>
          </div>
        </div>
      </div>
    );
  };

  const PriceDisplay: React.FC<{ roomId: string, date: string, className?: string }> = ({ roomId, date, className = '' }) => {
    const promo = getPromoInfo(roomId, date);
    const price = getSmartPrice(roomId, date);
    if (promo.hasPromo) {
      return (
        <span className={className}>
          <span className="line-through opacity-50 mr-1">NT$ {promo.originalPrice.toLocaleString()}</span>
          <span className="text-red-500 font-bold">NT$ {promo.promoPrice.toLocaleString()}</span>
        </span>
      );
    }
    return <span className={className}>NT$ {price.toLocaleString()}</span>;
  };

  return (
    <div className="min-h-screen bg-pms-bg text-pms-text font-body select-none pb-20 overflow-x-hidden">
      {isDatePickerOpen && <DatePickerModal />}
      <nav className="px-5 py-5 flex justify-between items-center border-b border-pms-border-light sticky top-0 bg-pms-bg/90 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          {step > 1 && step < 4 && <button onClick={() => setStep(step - 1)} className="p-1 text-pms-text"><ArrowLeft size={18} /></button>}
          <div onClick={(e) => e.detail === 3 && onAdminLogin()}>
            <h1 className="font-heading text-lg font-bold text-pms-accent leading-tight">
              {settings.hostel_name || '防曬不要擦太多民宿'}
              <span className="block text-[10px] opacity-80 font-medium tracking-normal mt-0.5">{settings.hostel_name_en}</span>
            </h1>
            <p className="text-[8px] font-bold text-pms-text-muted uppercase tracking-[0.2em]">{t(`step${step}`)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleDark} className="p-2 rounded-pms border border-pms-border text-pms-accent hover:bg-pms-accent/10 transition-all">
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-pms border border-pms-border hover:bg-pms-accent hover:text-white transition-all text-pms-text group">
            <Languages size={14} /> <span>{lang === 'zh' ? 'EN' : 'ZH'}</span>
          </button>
        </div>
      </nav>

      <main className="px-5 md:px-8 max-w-xl mx-auto py-10 space-y-10">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
              <header className="text-center space-y-3">
                <h2 className="font-heading text-4xl font-bold text-pms-text leading-tight">{settings[`home_title_${lang as 'zh'|'en'}`] || settings.hostel_name}</h2>
                <p className="text-[10px] text-pms-text-muted uppercase tracking-[0.3em] font-bold">{settings[`home_subtitle_${lang as 'zh'|'en'}`]}</p>
              </header>
              <div className="space-y-4">
                {(['checkIn', 'checkOut'] as const).map(type => (
                  <button key={type} onClick={() => { setSelectingType(type); setIsDatePickerOpen(true); }} className={`w-full p-6 bg-pms-bg-card rounded-pms border-2 flex justify-between items-center transition-all ${dates[type] ? 'border-pms-accent bg-pms-accent/5' : 'border-pms-border-light shadow-sm'}`}>
                    <div className="text-left">
                      <p className="text-[9px] uppercase font-bold text-pms-text-muted mb-1.5 tracking-widest">{t(type)}</p>
                      <p className={`text-lg font-bold ${!dates[type] ? 'text-pms-text-muted opacity-70' : 'text-pms-text'}`}>{dates[type] || t(type)}</p>
                    </div>
                    <Calendar size={20} className={dates[type] ? 'text-pms-accent' : 'text-pms-text-muted'} />
                  </button>
                ))}
              </div>
              {isSoldOut && (
                <div className="p-6 bg-orange-500/5 rounded-pms border border-orange-500/20 space-y-4">
                  <div className="flex items-center gap-2 text-orange-500 font-bold text-sm"><Info size={18} /> {t('fullyBooked')}</div>
                  <div className="grid grid-cols-2 gap-3">
                    {recommendations.map(rec => (
                      <button key={rec.date} onClick={() => setDates({ ...dates, checkIn: rec.date })} className="p-3 bg-pms-bg rounded-pms border border-pms-border-light hover:border-pms-accent transition-all text-left">
                        <p className="text-[10px] font-bold text-pms-text-muted">{rec.date.split('-').slice(1).join('/')}</p>
                        <p className="text-xs font-bold text-pms-accent">NT$ {rec.minPrice.toLocaleString()} 起</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button disabled={!dates.checkIn || !dates.checkOut || isSoldOut} onClick={() => setStep(2)} className="w-full bg-pms-accent text-white font-bold py-5 rounded-pms text-lg active:scale-[0.98] disabled:opacity-50 transition-all shadow-glow flex items-center justify-center gap-2 group">
                {lang === 'zh' ? '選擇房型' : 'CHOOSE ROOM'} <ArrowRight size={20} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-8">
              <h2 className="font-heading text-3xl font-bold text-center text-pms-text">{lang === 'zh' ? '選擇您的空間' : 'Select Your Space'}</h2>
              <div className="space-y-5">
                {rooms.map(room => {
                  const isAvailable = checkAvailability(dates.checkIn, room.id);
                  const isSelected = selectedRoomId === room.id;
                  return (
                    <div key={room.id} className={!isAvailable ? 'opacity-30 grayscale pointer-events-none' : ''}>
                      <button disabled={!isAvailable} onClick={() => { setSelectedRoomId(room.id); setExtraGuests(0); }} className={`w-full rounded-pms border-2 text-left overflow-hidden transition-all ${isSelected ? 'border-pms-accent bg-pms-accent text-white' : 'border-pms-border-light bg-pms-bg-card'}`}>
                        {room.photos && room.photos.length > 0 ? (
                          <img src={room.photos[0]} alt={room.name_zh} className="w-full h-40 object-cover" />
                        ) : (
                          <div className="bg-pms-bg-card flex items-center justify-center h-40 border-b border-pms-border-light">
                            <span className="text-[10px] font-bold text-pms-text-muted italic">防曬不要擦太多 - 12人包棟建置中</span>
                          </div>
                        )}
                        <div className="p-5 flex justify-between items-start">
                          <div>
                            <h3 className="font-heading text-xl font-bold mb-1">{lang === 'zh' ? room.name_zh : room.name_en}</h3>
                            <p className="text-[10px] font-bold flex items-center gap-1 opacity-70"><Users size={11} /> {room.standard_capacity} {t('standard')}</p>
                          </div>
                          <PriceDisplay roomId={room.id} date={dates.checkIn} className="text-sm font-bold" />
                        </div>
                      </button>
                      {isSelected && (
                        <div className="mt-3 p-5 bg-pms-bg-card rounded-pms border border-pms-border-light space-y-5">
                          <div className="flex justify-between items-center">
                            <div><p className="text-[10px] font-bold text-pms-text-muted uppercase mb-1">{t('extra')}</p><p className="text-xs font-bold text-pms-text">+NT$ {room.extra_guest_fee} / 人</p></div>
                            <div className="flex items-center gap-4 bg-pms-bg p-2 rounded-pms border border-pms-border-light">
                              <button onClick={() => setExtraGuests(Math.max(0, extraGuests - 1))} className="p-1"><Minus size={18} /></button>
                              <span className="text-lg font-bold w-5 text-center">{extraGuests}</span>
                              <button onClick={() => setExtraGuests(Math.min(room.max_capacity - room.standard_capacity, extraGuests + 1))} className="p-1"><Plus size={18} /></button>
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
              <button disabled={!selectedRoomId} onClick={() => setStep(3)} className="w-full bg-pms-accent text-white font-bold py-5 rounded-pms text-lg shadow-glow">{lang === 'zh' ? '繼續填寫' : 'CONTINUE'}</button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-8">
              <h2 className="font-heading text-3xl font-bold text-center text-pms-text">{t('step3')}</h2>
              <div className="space-y-3">
                <input type="text" placeholder={t('name')} value={guestInfo.name} onChange={e => setGuestInfo({ ...guestInfo, name: e.target.value })} className="w-full bg-pms-bg-card p-4 rounded-pms border border-pms-border-light font-bold text-sm outline-none text-pms-text" />
                <input type="tel" placeholder={t('phone')} value={guestInfo.phone} onChange={e => setGuestInfo({ ...guestInfo, phone: e.target.value })} className="w-full bg-pms-bg-card p-4 rounded-pms border border-pms-border-light font-bold text-sm outline-none text-pms-text" />
                <textarea placeholder={t('note')} value={guestInfo.note} onChange={e => setGuestInfo({ ...guestInfo, note: e.target.value })} className="w-full bg-pms-bg-card p-4 rounded-pms border border-pms-border-light font-medium text-sm h-24 outline-none text-pms-text resize-none" />
              </div>
              <button disabled={!guestInfo.name || !guestInfo.phone} onClick={handleBooking} className="w-full bg-pms-accent text-white font-bold py-5 rounded-pms text-lg shadow-glow">{t('bookingBtn')}</button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-10 py-8">
              <div className="bg-pms-accent/15 w-32 h-32 rounded-full flex items-center justify-center mx-auto border-4 border-pms-accent"><CheckCircle2 size={64} className="text-pms-accent" /></div>
              <h2 className="font-heading text-4xl font-bold text-pms-accent">已完成預訂申請</h2>
              <button onClick={() => setStep(1)} className="text-pms-text-muted font-bold text-[10px] uppercase tracking-widest opacity-70">← Back to Start</button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {step >= 2 && step <= 3 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-pms-border bg-pms-bg/95 backdrop-blur-md px-4 py-3">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {!showCodeInput ? (
                <button onClick={() => setShowCodeInput(true)} className="text-[10px] text-pms-text-muted underline">我有優惠代碼？</button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} placeholder="代碼" className="text-[10px] border border-pms-border rounded px-2 py-1 w-24 bg-pms-bg-card text-pms-text outline-none" />
                  <button onClick={() => { const ok = validateCode(codeInput); setCodeStatus(ok ? 'valid' : 'invalid'); setTimeout(() => setCodeStatus(null), 2000); }} className="text-[10px] bg-pms-text text-pms-bg px-2.5 py-1 rounded font-bold">套用</button>
                </div>
              )}
              {codeStatus === 'valid' && <span className="text-[10px] text-green-500 font-bold">✓ 套用成功</span>}
              {codeStatus === 'invalid' && <span className="text-[10px] text-red-400 font-bold">✗ 無效</span>}
            </div>
            <div className="text-right">
              {discountRate < 1 && <p className="text-[9px] text-green-500 font-bold">已享折扣</p>}
              <p className="text-lg font-bold text-pms-accent">NT$ {totalBill.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomBookingFrontEnd;
