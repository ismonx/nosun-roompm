import React, { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, setDoc, deleteDoc, collection, query, getDocs, addDoc } from 'firebase/firestore';
import { applyTheme, THEMES } from '../themes';

const AppContext = createContext();

// ===== 預設資料 (首次建庫用) =====
const DEFAULT_SETTINGS = {
  vendor_id: 'ismonx_primary',
  hostel_name: '防曬不要擦太多民宿',
  hostel_name_en: 'Sunscreen Resort',
  home_title_zh: '防曬不要擦太多',
  home_title_en: 'Back to Natural Rhythm',
  home_subtitle_zh: '2026 恆春半島最溫暖的預訂門戶',
  home_subtitle_en: 'Travel Gateway 2026',
  active_theme: 'forest',
  density: 'compact',
  referral_switch: true,
  referral_msg_zh: '當天已滿房，推薦您參考這間優質同業：[夥伴名稱/連結]',
  referral_msg_en: 'Fully booked! We recommend our partner: [Partner Name/Link]',
  line_oa_id: '@nosun_happy',
  admin_password: '2026',
};

const DEFAULT_ROOMS = [
  {
    id: 'sun',
    name_zh: '山海二人房',
    name_en: 'Mountain Sea',
    category: 'double',
    photos: [],
    standard_capacity: 2,
    max_capacity: 3,
    extra_guest_fee: 500,
    base_price: 2800,
    sort_order: 0,
  },
  {
    id: 'moon',
    name_zh: '星空四人房',
    name_en: 'Starry Quad',
    category: 'quad',
    photos: [],
    standard_capacity: 4,
    max_capacity: 6,
    extra_guest_fee: 500,
    base_price: 4200,
    sort_order: 1,
  },
];

export const AppProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('fu_lang');
    if (saved) return saved;
    // 自動偵測語系：若瀏覽器語言不是 zh- 開頭，預設為 en
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.startsWith('zh') ? 'zh' : 'en';
  });
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('fu_dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
  });

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [rooms, setRooms] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [bookings, setBookings] = useState({});
  const [promoCodes, setPromoCodes] = useState([]);

  // ===== 航空公司優惠碼系統 =====
  const [partnershipCode, setPartnershipCode] = useState('');
  const [discountRate, setDiscountRate] = useState(1); // 1 = 不打折

  const validateCode = useCallback((code) => {
    const trimmed = (code || '').trim().toUpperCase();
    const match = promoCodes.find(p => p.code === trimmed);
    
    if (match) {
      // 檢查有效期 (若有設定)
      if (match.expiry_date && new Date(match.expiry_date) < new Date()) {
        return false;
      }
      setPartnershipCode(trimmed);
      setDiscountRate(match.discount || 1);
      return true;
    }
    return false;
  }, [promoCodes]);

  // ===== 主題引擎 =====
  useEffect(() => {
    applyTheme(settings.active_theme || 'forest', isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('fu_dark', String(isDark));
  }, [isDark, settings.active_theme]);

  const toggleDark = useCallback(() => setIsDark(prev => !prev), []);

  // ===== 1. Sync global_settings =====
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'global', 'settings'), (snap) => {
      if (snap.exists()) {
        setSettings(prev => ({ ...prev, ...snap.data() }));
      } else {
        setDoc(doc(db, 'global', 'settings'), DEFAULT_SETTINGS);
      }
    });
    return () => unsub();
  }, []);

  // ===== 2. Sync rooms collection =====
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'rooms'), (snap) => {
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      if (data.length === 0) {
        // 首次建庫：寫入預設房型
        DEFAULT_ROOMS.forEach(room => {
          const { id, ...roomData } = room;
          setDoc(doc(db, 'rooms', id), roomData);
        });
        setRooms(DEFAULT_ROOMS);
      } else {
        data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setRooms(data);
      }
    });
    return () => unsub();
  }, []);

  // ===== 3. Sync pricing_rules collection =====
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pricing_rules'), (snap) => {
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setPricingRules(data);
    });
    return () => unsub();
  }, []);

  // ===== 4. Sync bookings collection =====
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bookings'), (snap) => {
      const data = {};
      snap.forEach(d => { data[d.id] = { id: d.id, ...d.data() }; });
      setBookings(data);
    });
    return () => unsub();
  }, []);

  // ===== 5. Sync promo_codes collection =====
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'promo_codes'), (snap) => {
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setPromoCodes(data);
    });
    return () => unsub();
  }, []);

  // ===== 5. 語系持久化 =====
  useEffect(() => {
    localStorage.setItem('fu_lang', lang);
  }, [lang]);

  // ===== 三級定價引擎 =====
  // Priority: pricing_rules.promo_price > pricing_rules.price > room.promo_price > rooms.base_price
  const getSmartPrice = useCallback((roomId, dateStr) => {
    if (!dateStr || !roomId) return 0;

    // 尋找符合的定價規則（最具體的優先：指定房型 > all）
    const matchingRules = pricingRules.filter(rule =>
      (rule.room_id === roomId || rule.room_id === 'all') &&
      dateStr >= rule.start_date && dateStr <= rule.end_date
    );

    const specificRule = matchingRules.find(r => r.room_id === roomId);
    const generalRule = matchingRules.find(r => r.room_id === 'all');
    const activeRule = specificRule || generalRule;

    if (activeRule) {
      // 優先級 1: pricing_rules.promo_price
      if (activeRule.promo_price && activeRule.promo_price > 0) {
        return activeRule.promo_price;
      }
      // 優先級 2: pricing_rules.price
      if (activeRule.price && activeRule.price > 0) {
        return activeRule.price;
      }
    }

    // 優先級 3: room.promo_price (房型層級優惠價)
    const room = rooms.find(r => r.id === roomId);
    if (room?.promo_price && room.promo_price > 0) {
      return room.promo_price;
    }

    // 優先級 4: rooms.base_price
    return room?.base_price || 0;
  }, [rooms, pricingRules]);

  // 取得促銷資訊 (前端顯示刪除線用)
  const getPromoInfo = useCallback((roomId, dateStr) => {
    if (!dateStr || !roomId) return { hasPromo: false, originalPrice: 0, promoPrice: 0 };

    // 先檢查 pricing_rules 層級的 promo
    const matchingRules = pricingRules.filter(rule =>
      (rule.room_id === roomId || rule.room_id === 'all') &&
      dateStr >= rule.start_date && dateStr <= rule.end_date
    );
    const specificRule = matchingRules.find(r => r.room_id === roomId);
    const generalRule = matchingRules.find(r => r.room_id === 'all');
    const activeRule = specificRule || generalRule;

    if (activeRule && activeRule.promo_price && activeRule.promo_price > 0) {
      const originalPrice = activeRule.price || (rooms.find(r => r.id === roomId)?.base_price || 0);
      return { hasPromo: true, originalPrice, promoPrice: activeRule.promo_price };
    }

    // 再檢查房型層級的 promo_price
    const room = rooms.find(r => r.id === roomId);
    if (room?.promo_price && room.promo_price > 0) {
      return { hasPromo: true, originalPrice: room.base_price, promoPrice: room.promo_price };
    }

    return { hasPromo: false, originalPrice: 0, promoPrice: 0 };
  }, [rooms, pricingRules]);

  // ===== 檢查房況 =====
  const checkAvailability = useCallback((dateStr, roomId) => {
    if (!dateStr) return false;
    const booking = bookings[`${dateStr}_${roomId}`];
    const wholeHouseBooking = Object.values(bookings).find(
      b => b.date === dateStr && b.is_whole_house
    );
    return !booking && !wholeHouseBooking;
  }, [bookings]);

  // ===== CRUD: Settings =====
  const updateSettings = useCallback(async (newData) => {
    try {
      await updateDoc(doc(db, 'global', 'settings'), newData);
    } catch (e) { console.error('Settings update failed:', e); }
  }, []);

  // ===== CRUD: Rooms =====
  const addRoom = useCallback(async (roomData) => {
    const newId = roomData.id || `room_${Date.now()}`;
    const { id, ...data } = roomData;
    await setDoc(doc(db, 'rooms', newId), data);
    return newId;
  }, []);

  const updateRoom = useCallback(async (roomId, newData) => {
    await updateDoc(doc(db, 'rooms', roomId), newData);
  }, []);

  const deleteRoom = useCallback(async (roomId) => {
    await deleteDoc(doc(db, 'rooms', roomId));
  }, []);

  // ===== CRUD: Pricing Rules =====
  const addPricingRule = useCallback(async (ruleData) => {
    const ref = await addDoc(collection(db, 'pricing_rules'), ruleData);
    return ref.id;
  }, []);

  const updatePricingRule = useCallback(async (ruleId, newData) => {
    await updateDoc(doc(db, 'pricing_rules', ruleId), newData);
  }, []);

  const deletePricingRule = useCallback(async (ruleId) => {
    await deleteDoc(doc(db, 'pricing_rules', ruleId));
  }, []);

  // ===== CRUD: Bookings =====
  const saveBooking = useCallback(async (bookingId, data) => {
    await setDoc(doc(db, 'bookings', bookingId), {
      ...data,
      updated_at: new Date().toISOString(),
    });
  }, []);

  const deleteBooking = useCallback(async (bookingId) => {
    await deleteDoc(doc(db, 'bookings', bookingId));
  }, []);

  // ===== CRUD: Promo Codes =====
  const addPromoCode = useCallback(async (data) => {
    await addDoc(collection(db, 'promo_codes'), {
      ...data,
      created_at: new Date().toISOString()
    });
  }, []);

  const updatePromoCode = useCallback(async (id, data) => {
    await updateDoc(doc(db, 'promo_codes', id), data);
  }, []);

  const deletePromoCode = useCallback(async (id) => {
    await deleteDoc(doc(db, 'promo_codes', id));
  }, []);

  // ===== 翻譯 =====
  const t = useCallback((key) => {
    const dict = {
      zh: {
        checkIn: '入住日期', checkOut: '退房日期', step1: '選擇日期', step2: '選擇房型',
        step3: '旅客資料', step4: '鎖房成功', guest: '位', extra: '加人費', total: '預估總額',
        name: '姓名', phone: '手機', note: '備註', bookingBtn: 'LINE 預訂與鎖房',
        standard: '標準入住', available: '可預訂', fullyBooked: '該日客滿',
        partnerInfo: '夥伴推薦', back: '返回前台', nights: '晚',
        weekView: '週檢視', monthView: '月檢視', roomMgmt: '房型管理',
        pricingMgmt: '定價規則', settings: '全域設定',
      },
      en: {
        checkIn: 'Check-in', checkOut: 'Check-out', step1: 'Select Date', step2: 'Select Room',
        step3: 'Guest Info', step4: 'Locked!', guest: 'Guests', extra: 'Extra Fee', total: 'Total',
        name: 'Name', phone: 'Phone', note: 'Note', bookingBtn: 'LINE Book & Lock',
        standard: 'Standard', available: 'Available', fullyBooked: 'Sold Out',
        partnerInfo: 'Partner Recommendation', back: 'Back', nights: 'Nights',
        weekView: 'Week', monthView: 'Month', roomMgmt: 'Rooms',
        pricingMgmt: 'Pricing', settings: 'Settings',
      }
    };
    return dict[lang]?.[key] || key;
  }, [lang]);

  const value = useMemo(() => ({
    lang, setLang, t, isDark, toggleDark,
    settings, updateSettings,
    rooms, addRoom, updateRoom, deleteRoom,
    pricingRules, addPricingRule, updatePricingRule, deletePricingRule,
    bookings, saveBooking, deleteBooking,
    promoCodes, addPromoCode, updatePromoCode, deletePromoCode,
    getSmartPrice, getPromoInfo, checkAvailability,
    partnershipCode, setPartnershipCode, validateCode, discountRate,
    THEMES,
  }), [
    lang, t, isDark, toggleDark,
    settings, updateSettings,
    rooms, addRoom, updateRoom, deleteRoom,
    pricingRules, addPricingRule, updatePricingRule, deletePricingRule,
    bookings, saveBooking, deleteBooking,
    promoCodes, addPromoCode, updatePromoCode, deletePromoCode,
    getSmartPrice, getPromoInfo, checkAvailability,
    partnershipCode, validateCode, discountRate,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
