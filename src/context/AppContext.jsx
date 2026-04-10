import React, { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, setDoc, collection, query, orderBy } from 'firebase/firestore';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('fu_lang') || 'zh');
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('fu_dark');
    if (saved !== null) return saved === 'true';
    // 預設使用系統偏好
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
  });
  
  // 阿芝規範：核心設定與數據結構 (V5.0 Logic)
  const [settings, setSettings] = useState({
    hostelName: "防曬不要擦太多民宿",
    heroTitle: "防曬不要擦太多", // 校準欄位
    extraGuestPrice: 500,        // 校準欄位
    referralSwitch: true,
    referralMsg: {
      zh: "當天已滿房，推薦您參考這間優質同業：[夥伴名稱/連結]",
      en: "Fully booked! We recommend our partner: [Partner Name/Link]"
    },
    hero: {
      zh: { title: "防曬不要擦太多", subtitle: "2026 恆春半島最溫暖的預訂門戶" },
      en: { title: "Back to Natural Rhythm", subtitle: "Travel Gateway 2026" }
    },
    rooms: [
      { 
        id: 'sun', 
        name: { zh: '山海二人房', en: 'Mountain Sea' }, 
        standardCapacity: 2, 
        maxCapacity: 3, 
        extraGuestFee: 500,
        pricing: { offWeekday: 2800, offWeekend: 3500, offHoliday: 5200, peakWeekday: 3800, peakWeekend: 4500, peakHoliday: 6200 }
      },
      { 
        id: 'moon', 
        name: { zh: '星空四人房', en: 'Starry Quad' }, 
        standardCapacity: 4, 
        maxCapacity: 6,
        extraGuestFee: 500,
        pricing: { offWeekday: 4200, offWeekend: 5500, offHoliday: 7800, peakWeekday: 5200, peakWeekend: 6500, peakHoliday: 8800 }
      },
    ],
    peakMonths: [7, 8],
    holidays: [
      '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22',
      '2026-02-28', '2026-04-03', '2026-04-04', '2026-04-05', '2026-06-19', '2026-06-20', '2026-06-21',
      '2026-09-25', '2026-09-26', '2026-09-27', '2026-10-10'
    ],
    openIntervals: [
      { startDate: '2026-04-01', endDate: '2026-12-31', roomId: 'all' }
    ],
  });

  const [bookings, setBookings] = useState({});

  // 日夜切換 - 綁定 HTML class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('fu_dark', String(isDark));
  }, [isDark]);

  const toggleDark = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  // 1. 同步全域設定 (settings)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "global", "settings"), (snap) => {
      if (snap.exists()) {
        setSettings(prev => ({ ...prev, ...snap.data() }));
      } else {
        setDoc(doc(db, "global", "settings"), settings);
      }
    });
    return () => unsub();
  }, []);

  // 2. 同步預訂資料 (bookings) - 標記為 /bookings/
  useEffect(() => {
    const q = query(collection(db, "bookings"));
    const unsub = onSnapshot(q, (snap) => {
      const data = {};
      snap.forEach(d => { data[d.id] = d.data(); });
      setBookings(data);
    });
    return () => unsub();
  }, []);

  // 3. 語系持久化
  useEffect(() => {
    localStorage.setItem('fu_lang', lang);
  }, [lang]);

  // 4. 定價計算公式 (Logic-First)
  const getSmartPrice = useCallback((roomId, date) => {
    if (!date || !roomId) return 0;
    const room = settings.rooms.find(r => r.id === roomId);
    if (!room) return 0;
    
    const d = new Date(date);
    const dateStr = d.toISOString().split('T')[0];
    const isPeak = settings.peakMonths.includes(d.getMonth() + 1);
    const isHoliday = settings.holidays.includes(dateStr);
    const isWeekend = d.getDay() === 6 || d.getDay() === 5; // 五六算週末

    const p = room.pricing;
    const extraPrice = settings.extraGuestPrice || 500; // 使用校準價格
    if (isPeak) {
      if (isHoliday) return p.peakHoliday;
      if (isWeekend) return p.peakWeekend;
      return p.peakWeekday;
    } else {
      if (isHoliday) return p.offHoliday;
      if (isWeekend) return p.offWeekend;
      return p.offWeekday;
    }
  }, [settings]);

  // 5. 翻譯 Hook (Manual useTranslation)
  const t = useCallback((key) => {
    const dict = {
      zh: { 
        checkIn: "入住日期", checkOut: "退房日期", step1: "日期與轉單", step2: "房型與加人", 
        step3: "客資蒐集", step4: "鎖房成功", guest: "位", extra: "加人費", total: "預估總額",
        name: "姓名", phone: "手機", note: "備註", bookingBtn: "LINE 預訂與鎖房",
        standard: "標準入住", available: "可預訂", fullyBooked: "該日客滿",
        partnerInfo: "夥伴推薦", back: "返回", nights: "晚"
      },
      en: { 
        checkIn: "Check-in", checkOut: "Check-out", step1: "Date & Referral", step2: "Room & Guests", 
        step3: "Information", step4: "Locked!", guest: "Guests", extra: "Extra Fee", total: "Total",
        name: "Name", phone: "Phone", note: "Note", bookingBtn: "LINE Book & Lock",
        standard: "Standard", available: "Available", fullyBooked: "Sold Out",
        partnerInfo: "Partner Recommendation", back: "Back", nights: "Nights"
      }
    };
    return dict[lang][key] || key;
  }, [lang]);

  // 6. 更新設定指令
  const updateSettings = async (newData) => {
    try {
      await updateDoc(doc(db, "global", "settings"), newData);
    } catch (e) { console.error("Update failed", e); }
  };

  const value = useMemo(() => ({
    lang, setLang, t, settings, bookings, getSmartPrice, updateSettings, isDark, toggleDark
  }), [lang, settings, bookings, getSmartPrice, t, isDark, toggleDark]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
