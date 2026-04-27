import React, { useState, useEffect, createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, setDoc, deleteDoc, collection, addDoc, DocumentData } from 'firebase/firestore';
import { applyTheme, THEMES } from '../themes';
import { Room, Booking, PricingRule, PromoCode, AppSettings, ThemeId } from '../types';

interface AppContextType {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string) => string;
  isDark: boolean;
  toggleDark: () => void;
  settings: AppSettings;
  updateSettings: (newData: Partial<AppSettings>) => Promise<void>;
  rooms: Room[];
  addRoom: (roomData: Room) => Promise<string>;
  updateRoom: (roomId: string, newData: Partial<Room>) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  updateRoomSortOrder: (newRooms: Room[]) => Promise<void>;
  pricingRules: PricingRule[];
  addPricingRule: (ruleData: Omit<PricingRule, 'id'>) => Promise<string>;
  updatePricingRule: (ruleId: string, newData: Partial<PricingRule>) => Promise<void>;
  deletePricingRule: (ruleId: string) => Promise<void>;
  bookings: Record<string, Booking>;
  saveBooking: (bookingId: string, data: Booking) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
  promoCodes: PromoCode[];
  addPromoCode: (data: Omit<PromoCode, 'id'>) => Promise<void>;
  updatePromoCode: (id: string, data: Partial<PromoCode>) => Promise<void>;
  deletePromoCode: (id: string) => Promise<void>;
  getSmartPrice: (roomId: string, dateStr: string) => number;
  getPromoInfo: (roomId: string, dateStr: string) => { hasPromo: boolean; originalPrice: number; promoPrice: number };
  checkAvailability: (dateStr: string, roomId: string) => boolean;
  partnershipCode: string;
  setPartnershipCode: (code: string) => void;
  validateCode: (code: string) => boolean;
  discountRate: number;
  THEMES: typeof THEMES;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
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
  login_title: 'fUX Center',
  step1_text_zh: '選擇日期',
  step1_text_en: 'SELECT DATE',
};

const DEFAULT_ROOMS: Room[] = [
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
    promo_price: 0,
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
    promo_price: 0,
    sort_order: 1,
  },
  {
    id: 'whole_house',
    name_zh: '【全棟包棟】防曬不要擦太多',
    name_en: 'Whole House Service',
    category: 'whole_house',
    photos: [], 
    standard_capacity: 12, 
    max_capacity: 16,      
    extra_guest_fee: 500,  
    base_price: 11000,     
    promo_price: 0,
    description: '包含 2 間兩人房、2 間四人房，恆春放空首選',
    inventory: 1,
    sort_order: 99
  },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<string>(() => {
    const saved = localStorage.getItem('fu_lang');
    if (saved) return saved;
    const browserLang = navigator.language;
    return browserLang.startsWith('zh') ? 'zh' : 'en';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('fu_dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
  });

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [bookings, setBookings] = useState<Record<string, Booking>>({});
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);

  const [partnershipCode, setPartnershipCode] = useState<string>('');
  const [discountRate, setDiscountRate] = useState<number>(1);

  const validateCode = useCallback((code: string) => {
    const trimmed = (code || '').trim().toUpperCase();
    const match = promoCodes.find(p => p.code === trimmed);
    
    if (match) {
      if (match.expiry_date && new Date(match.expiry_date) < new Date()) {
        return false;
      }
      setPartnershipCode(trimmed);
      setDiscountRate(match.discount || 1);
      return true;
    }
    return false;
  }, [promoCodes]);

  useEffect(() => {
    applyTheme(settings.active_theme as ThemeId || 'forest', isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('fu_dark', String(isDark));
  }, [isDark, settings.active_theme]);

  const toggleDark = useCallback(() => setIsDark(prev => !prev), []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'global', 'settings'), (snap) => {
      if (snap.exists()) {
        setSettings(prev => ({ ...prev, ...snap.data() as AppSettings }));
      } else {
        setDoc(doc(db, 'global', 'settings'), DEFAULT_SETTINGS);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'rooms'), (snap) => {
      const data: Room[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Room));
      if (data.length === 0) {
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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pricing_rules'), (snap) => {
      const data: PricingRule[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as PricingRule));
      setPricingRules(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bookings'), (snap) => {
      const data: Record<string, Booking> = {};
      snap.forEach(d => { data[d.id] = { id: d.id, ...d.data() } as Booking; });
      setBookings(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'promo_codes'), (snap) => {
      const data: PromoCode[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as PromoCode));
      setPromoCodes(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    localStorage.setItem('fu_lang', lang);
  }, [lang]);

  const getSmartPrice = useCallback((roomId: string, dateStr: string): number => {
    if (!dateStr || !roomId) return 0;
    const matchingRules = pricingRules.filter(rule =>
      (rule.room_id === roomId || rule.room_id === 'all') &&
      dateStr >= rule.start_date && dateStr <= rule.end_date
    );
    const specificRule = matchingRules.find(r => r.room_id === roomId);
    const generalRule = matchingRules.find(r => r.room_id === 'all');
    const activeRule = specificRule || generalRule;

    if (activeRule) {
      if (activeRule.promo_price && activeRule.promo_price > 0) return activeRule.promo_price;
      if (activeRule.price && activeRule.price > 0) return activeRule.price;
    }
    const room = rooms.find(r => r.id === roomId);
    if (room?.promo_price && room.promo_price > 0) return room.promo_price;
    return room?.base_price || 0;
  }, [rooms, pricingRules]);

  const getPromoInfo = useCallback((roomId: string, dateStr: string) => {
    if (!dateStr || !roomId) return { hasPromo: false, originalPrice: 0, promoPrice: 0 };
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
    const room = rooms.find(r => r.id === roomId);
    if (room?.promo_price && room.promo_price > 0) {
      return { hasPromo: true, originalPrice: room.base_price, promoPrice: room.promo_price };
    }
    return { hasPromo: false, originalPrice: 0, promoPrice: 0 };
  }, [rooms, pricingRules]);

  const checkAvailability = useCallback((dateStr: string, roomId: string): boolean => {
    if (!dateStr) return false;
    
    // 1. 基本檢查：該日期該房型是否已被佔用
    if (bookings[`${dateStr}_${roomId}`]) return false;

    // 2. 互斥檢查邏輯
    const dayBookings = Object.values(bookings).filter(b => b.date === dateStr);

    // 如果有人訂了「包棟」，單間全部鎖死
    const isWholeHouseBooked = dayBookings.some(b => b.is_whole_house || b.room_id === 'whole_house');
    if (isWholeHouseBooked) return false;

    // 如果現在查的是「包棟」，但當天已經有任何單間被訂，則包棟鎖死
    if (roomId === 'whole_house' && dayBookings.length > 0) {
      return false;
    }

    return true;
  }, [bookings]);

  const updateSettings = useCallback(async (newData: Partial<AppSettings>) => {
    try {
      await updateDoc(doc(db, 'global', 'settings'), newData as DocumentData);
    } catch (e) { console.error('Settings update failed:', e); }
  }, []);

  const addRoom = useCallback(async (roomData: Room) => {
    const newId = roomData.id || `room_${Date.now()}`;
    const { id, ...data } = roomData;
    await setDoc(doc(db, 'rooms', newId), data);
    return newId;
  }, []);

  const updateRoom = useCallback(async (roomId: string, newData: Partial<Room>) => {
    await updateDoc(doc(db, 'rooms', roomId), newData as DocumentData);
  }, []);

  const deleteRoom = useCallback(async (roomId: string) => {
    await deleteDoc(doc(db, 'rooms', roomId));
  }, []);

  const updateRoomSortOrder = useCallback(async (newRooms: Room[]) => {
    try {
      const promises = newRooms.map((room, index) => 
        updateDoc(doc(db, 'rooms', room.id), { sort_order: index })
      );
      await Promise.all(promises);
    } catch (e) {
      console.error('Failed to update room sort order:', e);
    }
  }, []);

  const addPricingRule = useCallback(async (ruleData: Omit<PricingRule, 'id'>) => {
    const ref = await addDoc(collection(db, 'pricing_rules'), ruleData);
    return ref.id;
  }, []);

  const updatePricingRule = useCallback(async (ruleId: string, newData: Partial<PricingRule>) => {
    await updateDoc(doc(db, 'pricing_rules', ruleId), newData as DocumentData);
  }, []);

  const deletePricingRule = useCallback(async (ruleId: string) => {
    await deleteDoc(doc(db, 'pricing_rules', ruleId));
  }, []);

  const saveBooking = useCallback(async (bookingId: string, data: Booking) => {
    await setDoc(doc(db, 'bookings', bookingId), {
      ...data,
      updated_at: new Date().toISOString(),
    });
  }, []);

  const deleteBooking = useCallback(async (bookingId: string) => {
    await deleteDoc(doc(db, 'bookings', bookingId));
  }, []);

  const addPromoCode = useCallback(async (data: Omit<PromoCode, 'id'>) => {
    await addDoc(collection(db, 'promo_codes'), {
      ...data,
      created_at: new Date().toISOString()
    });
  }, []);

  const updatePromoCode = useCallback(async (id: string, data: Partial<PromoCode>) => {
    await updateDoc(doc(db, 'promo_codes', id), data as DocumentData);
  }, []);

  const deletePromoCode = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'promo_codes', id));
  }, []);

  const t = useCallback((key: string): string => {
    const dict: Record<string, Record<string, string>> = {
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

  const value: AppContextType = useMemo(() => ({
    lang, setLang, t, isDark, toggleDark,
    settings, updateSettings,
    rooms, addRoom, updateRoom, deleteRoom, updateRoomSortOrder,
    pricingRules, addPricingRule, updatePricingRule, deletePricingRule,
    bookings, saveBooking, deleteBooking,
    promoCodes, addPromoCode, updatePromoCode, deletePromoCode,
    getSmartPrice, getPromoInfo, checkAvailability,
    partnershipCode, setPartnershipCode, validateCode, discountRate,
    THEMES,
  }), [
    lang, t, isDark, toggleDark,
    settings, updateSettings,
    rooms, addRoom, updateRoom, deleteRoom, updateRoomSortOrder,
    pricingRules, addPricingRule, updatePricingRule, deletePricingRule,
    bookings, saveBooking, deleteBooking,
    promoCodes, addPromoCode, updatePromoCode, deletePromoCode,
    getSmartPrice, getPromoInfo, checkAvailability,
    partnershipCode, validateCode, discountRate,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
