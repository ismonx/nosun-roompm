import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from './context/AppContext';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Settings, LogOut,
  X, Save, Phone, Crown, Wallet, Sun, Moon, Lock, Plus, Trash2, Edit3,
  Image, DollarSign, Users, Home, LayoutGrid, List, AlertTriangle, ExternalLink
} from 'lucide-react';

// ===== 週視圖格子 (Memoized for Smoothness) =====
const WeekCell = React.memo(({ date, room, booking, onClick, isToday, isPast }) => {
  const statusColors = {
    pending: 'bg-status-pending/90 text-white',
    deposit: 'bg-status-deposit/90 text-white',
    full: 'bg-status-full/90 text-white',
  };

  return (
    <div
      onClick={() => !isPast && onClick(date, room.id)}
      className={`relative min-h-[var(--pms-cell-h)] rounded-pms border border-pms-border-light p-2 cursor-pointer transition-all hover:shadow-md
        ${isPast ? 'opacity-30 pointer-events-none' : ''}
        ${isToday ? 'calendar-today' : ''}
        ${booking ? statusColors[booking.status] || 'bg-pms-bg-card' : 'bg-pms-bg-card hover:bg-pms-accent/10'}
      `}
    >
      {booking ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-bold truncate">{booking.customer_name || booking.customerName}</span>
          <span className="text-[9px] opacity-75">
            ${((booking.total_price || booking.totalPrice || 0) / 1000).toFixed(1)}k
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <span className="text-[11px] font-bold text-pms-accent/60">空房</span>
        </div>
      )}
    </div>
  );
});

// ===== 月視圖格子 (Memoized for Smoothness) =====
const MonthCell = React.memo(({ date, rooms, bookings, onSelect, isToday, isPast }) => {
  const dayBookings = rooms.map(r => ({
    room: r,
    booking: bookings[`${date}_${r.id}`]
  }));
  const bookedCount = dayBookings.filter(d => d.booking).length;
  const isFull = bookedCount === rooms.length;
  const dayNum = date.split('-').pop();

  return (
    <div
      onClick={() => !isPast && onSelect(date)}
      className={`min-h-[70px] rounded-pms border border-pms-border-light p-1.5 cursor-pointer transition-all
        ${isPast ? 'opacity-30 pointer-events-none' : 'hover:shadow-md'}
        ${isToday ? 'calendar-today' : ''}
        ${isFull ? 'bg-status-full/10' : 'bg-pms-bg-card'}
      `}
    >
      <div className={`text-xs font-bold mb-1 ${isFull ? 'line-through text-status-full' : 'text-pms-text'}`}>
        {dayNum}
      </div>
      <div className="flex flex-col gap-0.5">
        {dayBookings.map(({ room, booking }) => (
          <div key={room.id} className={`text-[8px] rounded px-1 py-0.5 truncate font-medium
            ${booking
              ? booking.status === 'pending' ? 'bg-status-pending/20 text-status-pending'
              : booking.status === 'deposit' ? 'bg-status-deposit/20 text-status-deposit'
              : 'bg-status-full/20 text-status-full'
              : ''
            }
          `}>
            {booking ? (booking.customer_name || booking.customerName || '---') : ''}
          </div>
        ))}
      </div>
    </div>
  );
});

// ===== 確認刪除 Modal =====
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-pms-bg border border-pms-border rounded-pms p-8 max-w-sm w-full shadow-2xl">
      <div className="flex items-center gap-3 mb-6 text-red-500">
        <AlertTriangle size={24} />
        <h3 className="font-heading text-lg font-bold">確認刪除</h3>
      </div>
      <p className="text-sm text-pms-text-muted mb-8">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-3 rounded-pms border border-pms-border text-sm font-bold text-pms-text hover:bg-pms-bg-card transition-all">
          取消
        </button>
        <button onClick={onConfirm} className="flex-1 py-3 rounded-pms bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all">
          確認刪除
        </button>
      </div>
    </div>
  </div>
);

// ===== 主元件 =====
const RoomAdminDashboard = ({ onLogout }) => {
  const {
    lang, t, settings, updateSettings, isDark, toggleDark,
    rooms, addRoom, updateRoom, deleteRoom,
    pricingRules, addPricingRule, updatePricingRule, deletePricingRule,
    bookings, saveBooking, deleteBooking,
    getSmartPrice, THEMES,
  } = useApp();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [activeTab, setActiveTab] = useState('week');
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return monday.toISOString().split('T')[0];
  });
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [modalData, setModalData] = useState({
    customer_name: '', phone: '', note: '', status: 'pending',
    extra_guests: 0, total_price: 0, is_whole_house: false
  });

  // ===== 登入 =====
  const handleLogin = () => {
    if (loginPassword === (settings.admin_password || '2026')) {
      setIsAuthenticated(true);
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 2000);
    }
  };

  // ===== 週視圖計算 =====
  const weekDays = useMemo(() => {
    const days = [];
    const start = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [weekStart]);

  const navigateWeek = (dir) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  const goToThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    setWeekStart(monday.toISOString().split('T')[0]);
  };

  // ===== 月視圖計算 =====
  const monthDays = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const firstDay = first.getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const days = [];

    // 前面空格
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
      days.push(null);
    }
    for (let d = 1; d <= total; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(iso);
    }
    return days;
  }, [monthDate]);

  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const wholeHouseDates = useMemo(() => {
    const dates = {};
    Object.values(bookings).forEach(b => {
      if (b.is_whole_house || b.isWholeHouse) dates[b.date] = true;
    });
    return dates;
  }, [bookings]);

  // ===== 訂單 Modal =====
  useEffect(() => {
    if (selectedCell) {
      const key = `${selectedCell.date}_${selectedCell.roomId}`;
      const existing = bookings[key];
      if (existing) {
        setModalData({
          customer_name: existing.customer_name || existing.customerName || '',
          phone: existing.phone || '',
          note: existing.note || '',
          status: existing.status || 'pending',
          extra_guests: existing.extra_guests || existing.extraGuests || 0,
          total_price: existing.total_price || existing.totalPrice || 0,
          is_whole_house: existing.is_whole_house || existing.isWholeHouse || false,
        });
      } else {
        const price = getSmartPrice(selectedCell.roomId, selectedCell.date);
        setModalData({
          customer_name: '', phone: '', note: '', status: 'pending',
          extra_guests: 0, total_price: price, is_whole_house: false,
        });
      }
    }
  }, [selectedCell, bookings, getSmartPrice]);

  const handleSaveBooking = async () => {
    if (!selectedCell) return;
    const key = `${selectedCell.date}_${selectedCell.roomId}`;
    await saveBooking(key, {
      ...modalData,
      date: selectedCell.date,
      room_id: selectedCell.roomId,
      created_at: bookings[key]?.created_at || new Date().toISOString(),
    });
    setSelectedCell(null);
  };

  const handleDeleteBooking = () => {
    if (!selectedCell) return;
    const key = `${selectedCell.date}_${selectedCell.roomId}`;
    setConfirmDelete({
      message: `確定要刪除 ${selectedCell.date} 的訂單嗎？此操作無法復原。`,
      onConfirm: async () => {
        await deleteBooking(key);
        setSelectedCell(null);
        setConfirmDelete(null);
      }
    });
  };

  // ===== 房型編輯 =====
  const [roomForm, setRoomForm] = useState({});
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
  }, [editingRoom, rooms]);

  const handleSaveRoom = async () => {
    if (editingRoom === 'new') {
      const id = `room_${Date.now()}`;
      await addRoom({ id, ...roomForm });
    } else {
      const { id, ...data } = roomForm;
      await updateRoom(editingRoom, data);
    }
    setEditingRoom(null);
  };

  // ===== 定價規則編輯 =====
  const [ruleForm, setRuleForm] = useState({});
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
  }, [editingRule, pricingRules]);

  const handleSaveRule = async () => {
    const { id, ...data } = ruleForm;
    if (editingRule === 'new') {
      await addPricingRule(data);
    } else {
      await updatePricingRule(editingRule, data);
    }
    setEditingRule(null);
  };

  // ===== 未登入 =====
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-pms-bg flex items-center justify-center p-6">
        <div className="bg-pms-bg-card p-10 rounded-pms border border-pms-border max-w-sm w-full space-y-6">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-pms bg-pms-accent/20 flex items-center justify-center">
              <Lock size={24} className="text-pms-accent" />
            </div>
          </div>
          <h1 className="font-heading text-xl font-bold text-pms-text text-center tracking-wide">FU OPS CENTER</h1>
          <input
            type="password" placeholder="ENTER KEY"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className={`w-full bg-pms-bg border p-4 rounded-pms text-center tracking-[0.4em] text-pms-text focus:border-pms-accent outline-none transition-all ${loginError ? 'border-red-500' : 'border-pms-border'}`}
          />
          <button onClick={handleLogin} className="w-full bg-pms-accent text-white font-bold py-4 rounded-pms text-sm hover:bg-pms-accent-hover active:scale-[0.98] transition-all">
            {lang === 'zh' ? '登入後台' : 'LOGIN'}
          </button>
          {loginError && <p className="text-red-500 text-xs text-center font-bold">密碼錯誤</p>}
          <div className="flex justify-center">
            <button onClick={toggleDark} className="p-2 rounded-pms border border-pms-border text-pms-accent hover:bg-pms-accent/10">
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
          <p className="text-[10px] text-center text-pms-text-muted">PMS V6.0</p>
        </div>
      </div>
    );
  }

  // ===== Sidebar Tabs =====
  const tabs = [
    { id: 'week', label: lang === 'zh' ? '週檢視' : 'Week', icon: <LayoutGrid size={16} /> },
    { id: 'month', label: lang === 'zh' ? '月檢視' : 'Month', icon: <CalendarIcon size={16} /> },
    { id: 'rooms', label: lang === 'zh' ? '房型管理' : 'Rooms', icon: <Home size={16} /> },
    { id: 'pricing', label: lang === 'zh' ? '定價規則' : 'Pricing', icon: <DollarSign size={16} /> },
    { id: 'settings', label: lang === 'zh' ? '全域設定' : 'Settings', icon: <Settings size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-pms-bg text-pms-text font-body flex flex-col overflow-hidden">
      {confirmDelete && (
        <ConfirmModal
          message={confirmDelete.message}
          onConfirm={confirmDelete.onConfirm}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* ===== Top Toolbar ===== */}
      <header className="bg-pms-bg-card border-b border-pms-border-light px-3 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-sm font-bold text-pms-accent tracking-tight">FU·PMS</h1>
          <span className="text-[8px] font-bold text-pms-text-muted">V6.0</span>
        </div>

        <nav className="flex items-center gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-pms text-[11px] font-bold transition-all
                ${activeTab === tab.id ? 'bg-pms-accent text-white shadow-sm' : 'text-pms-text-muted hover:bg-pms-accent/10 hover:text-pms-text'}`}
            >
              {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          {/* 主題切換 */}
          <div className="flex gap-0.5 border border-pms-border-light rounded-pms p-0.5">
            {Object.keys(THEMES).map(tid => (
              <button
                key={tid}
                onClick={() => updateSettings({ active_theme: tid })}
                className={`px-1.5 py-1 text-[8px] font-bold rounded-pms transition-all
                  ${settings.active_theme === tid ? 'bg-pms-accent text-white' : 'text-pms-text-muted hover:bg-pms-accent/10'}`}
                title={THEMES[tid].nameZh}
              >
                {THEMES[tid].nameZh.substring(0, 2)}
              </button>
            ))}
          </div>
          <button onClick={toggleDark} className="p-1.5 rounded-pms text-pms-text-muted hover:text-pms-accent hover:bg-pms-accent/10 transition-all">
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={onLogout} className="p-1.5 rounded-pms text-pms-text-muted hover:text-red-500 transition-all" title={t('back')}>
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main className="flex-1 overflow-auto p-3 md:p-5">

        {/* ========== TAB: 週檢視 ========== */}
        {activeTab === 'week' && (
          <div className="space-y-3">
            <header className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                {/* 週｜月 快速切換 */}
                <div className="flex border border-pms-border rounded-pms overflow-hidden">
                  <button onClick={() => setActiveTab('week')} className="px-2.5 py-1.5 text-[11px] font-bold bg-pms-accent text-white">週</button>
                  <button onClick={() => setActiveTab('month')} className="px-2.5 py-1.5 text-[11px] font-bold text-pms-text-muted hover:bg-pms-accent/10 border-l border-pms-border">月</button>
                </div>
                <button onClick={goToThisWeek} className="px-2.5 py-1.5 rounded-pms border border-pms-border text-[11px] font-bold hover:bg-pms-accent/10">Today</button>
                <span className="text-pms-border-light">│</span>
                <button onClick={() => navigateWeek(-1)} className="p-1.5 rounded-pms border border-pms-border hover:bg-pms-accent/10"><ChevronLeft size={14} /></button>
                <button onClick={() => navigateWeek(1)} className="p-1.5 rounded-pms border border-pms-border hover:bg-pms-accent/10"><ChevronRight size={14} /></button>
                <span className="text-xs font-bold text-pms-text ml-1">{weekDays[0]} ~ {weekDays[6]}</span>
              </div>
              <div className="flex gap-2 text-[9px] font-bold text-pms-text-muted">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-pending" /> Pending</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-deposit" /> Deposit</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-full" /> Full</span>
              </div>
            </header>

            {/* CSS Grid 週矩陣：房型欄固定，日期欄自動伸展 */}
            <div className="border border-pms-border rounded-pms overflow-hidden">
              <div className="grid" style={{ gridTemplateColumns: '120px repeat(7, 1fr)' }}>
                {/* Header row */}
                <div className="p-3 bg-pms-bg-card border-b border-r border-pms-border-light text-[10px] font-bold text-pms-accent uppercase tracking-wider sticky left-0 z-10">
                  Rooms
                </div>
                {weekDays.map(d => {
                  const date = new Date(d + 'T00:00:00');
                  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <div key={d} className={`p-2 bg-pms-bg-card border-b border-r border-pms-border-light text-center transition-colors
                      ${d === today ? 'bg-pms-accent/10' : ''}
                      ${wholeHouseDates[d] ? 'bg-indigo-500/10' : ''}
                    `}>
                      <div className={`text-xs font-bold 
                        ${wholeHouseDates[d] ? 'text-indigo-600 dark:text-indigo-400' : isWeekend ? 'text-orange-500' : 'text-pms-text'}
                      `}>
                        {d.split('-').slice(1).join('/')}
                      </div>
                      <div className={`text-[9px] ${wholeHouseDates[d] ? 'text-indigo-400' : isWeekend ? 'text-orange-400' : 'text-pms-text-muted'}`}>
                        {wholeHouseDates[d] ? '包棟' : dayName}
                      </div>
                    </div>
                  );
                })}

                {/* Room rows */}
                {rooms.map(room => (
                  <React.Fragment key={room.id}>
                    <div className="p-3 bg-pms-bg border-b border-r border-pms-border-light text-[11px] font-bold text-pms-text truncate sticky left-0 z-10">
                      {lang === 'zh' ? room.name_zh : room.name_en}
                    </div>
                    {weekDays.map(d => (
                      <div key={`${d}_${room.id}`} className={`p-1 border-b border-r border-pms-border-light transition-colors ${wholeHouseDates[d] ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                        <WeekCell
                          date={d}
                          room={room}
                          booking={bookings[`${d}_${room.id}`]}
                          onClick={(date, roomId) => setSelectedCell({ date, roomId })}
                          isToday={d === today}
                          isPast={d < today}
                        />
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========== TAB: 月檢視 ========== */}
        {activeTab === 'month' && (
          <div className="space-y-3">
            <header className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                {/* 週｜月 快速切換 */}
                <div className="flex border border-pms-border rounded-pms overflow-hidden">
                  <button onClick={() => setActiveTab('week')} className="px-2.5 py-1.5 text-[11px] font-bold text-pms-text-muted hover:bg-pms-accent/10 border-r border-pms-border">週</button>
                  <button onClick={() => setActiveTab('month')} className="px-2.5 py-1.5 text-[11px] font-bold bg-pms-accent text-white">月</button>
                </div>
                <button onClick={() => { setMonthDate(new Date()); }} className="px-2.5 py-1.5 rounded-pms border border-pms-border text-[11px] font-bold hover:bg-pms-accent/10">Today</button>
                <span className="text-pms-border-light">│</span>
                <button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1))} className="p-1.5 rounded-pms border border-pms-border hover:bg-pms-accent/10"><ChevronLeft size={14} /></button>
                {/* 年份/月份快速跳轉 */}
                <select
                  value={monthDate.getFullYear()}
                  onChange={e => setMonthDate(new Date(Number(e.target.value), monthDate.getMonth()))}
                  className="bg-pms-bg border border-pms-border rounded-pms px-1.5 py-1.5 text-xs font-bold text-pms-text outline-none"
                >
                  {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  value={monthDate.getMonth()}
                  onChange={e => setMonthDate(new Date(monthDate.getFullYear(), Number(e.target.value)))}
                  className="bg-pms-bg border border-pms-border rounded-pms px-1.5 py-1.5 text-xs font-bold text-pms-text outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{i + 1}月</option>)}
                </select>
                <button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1))} className="p-1.5 rounded-pms border border-pms-border hover:bg-pms-accent/10"><ChevronRight size={14} /></button>
              </div>
              <div className="flex gap-3 text-[9px] font-bold text-pms-text-muted">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-pending" /> Pending</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-deposit" /> Deposit</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-full" /> Full</span>
              </div>
            </header>

            <div className="grid grid-cols-7 gap-1">
              {dayNames.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-pms-text-muted py-2">{d}</div>
              ))}
              {monthDays.map((d, i) => d ? (
                <MonthCell
                  key={d}
                  date={d}
                  rooms={rooms}
                  bookings={bookings}
                  onSelect={(date) => {
                    // 點月曆某天 → 跳到週視圖並選中
                    const dt = new Date(date);
                    const day = dt.getDay();
                    const mon = new Date(dt);
                    mon.setDate(dt.getDate() - (day === 0 ? 6 : day - 1));
                    setWeekStart(mon.toISOString().split('T')[0]);
                    setActiveTab('week');
                  }}
                  isToday={d === today}
                  isPast={d < today}
                />
              ) : (
                <div key={`pad-${i}`} />
              ))}
            </div>
          </div>
        )}

        {/* ========== TAB: 房型管理 ========== */}
        {activeTab === 'rooms' && (
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
                    <button onClick={() => setConfirmDelete({
                      message: `確定要刪除「${room.name_zh}」嗎？相關訂單需手動處理。`,
                      onConfirm: async () => { await deleteRoom(room.id); setConfirmDelete(null); }
                    })} className="py-2 px-3 rounded-pms border border-red-300 text-red-500 text-xs font-bold hover:bg-red-50 transition-all">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {/* 空白新增卡片 */}
              <button onClick={() => setEditingRoom('new')} className="border-2 border-dashed border-pms-border rounded-pms p-8 flex flex-col items-center justify-center gap-2 hover:border-pms-accent hover:bg-pms-accent/5 transition-all">
                <Plus size={24} className="text-pms-text-muted" />
                <span className="text-xs font-bold text-pms-text-muted">新增房型</span>
              </button>
            </div>
          </div>
        )}

        {/* ========== TAB: 定價規則 ========== */}
        {activeTab === 'pricing' && (
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
                    <button onClick={() => setConfirmDelete({
                      message: `確定要刪除「${rule.rule_name}」定價規則嗎？`,
                      onConfirm: async () => { await deletePricingRule(rule.id); setConfirmDelete(null); }
                    })} className="p-2 rounded-pms border border-red-300 text-red-500 hover:bg-red-50"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}

              {/* 空白新增卡片 */}
              <button onClick={() => setEditingRule('new')} className="w-full border-2 border-dashed border-pms-border rounded-pms p-6 flex items-center justify-center gap-2 hover:border-pms-accent hover:bg-pms-accent/5 transition-all">
                <Plus size={18} className="text-pms-text-muted" />
                <span className="text-xs font-bold text-pms-text-muted">新增定價卡片</span>
              </button>
            </div>
          </div>
        )}

        {/* ========== TAB: 全域設定 ========== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="font-heading text-xl font-bold text-pms-text">全域設定</h2>

            {/* 文案設定 */}
            <div className="bg-pms-bg-card border border-pms-border-light rounded-pms p-5 space-y-4">
              <h3 className="font-bold text-sm text-pms-accent">首頁文案</h3>
              {[
                { key: 'home_title_zh', label: '標題 (中)' },
                { key: 'home_title_en', label: 'Title (EN)' },
                { key: 'home_subtitle_zh', label: '副標 (中)' },
                { key: 'home_subtitle_en', label: 'Subtitle (EN)' },
                { key: 'hostel_name', label: '民宿名稱' },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">{f.label}</label>
                  <input
                    type="text"
                    value={settings[f.key] || ''}
                    onChange={e => updateSettings({ [f.key]: e.target.value })}
                    className="w-full bg-pms-bg border border-pms-border rounded-pms p-3 text-sm font-medium text-pms-text focus:border-pms-accent outline-none"
                  />
                </div>
              ))}
            </div>

            {/* 推薦系統 */}
            <div className="bg-pms-bg-card border border-pms-border-light rounded-pms p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-pms-accent">夥伴推薦系統</h3>
                <button
                  onClick={() => updateSettings({ referral_switch: !settings.referral_switch })}
                  className={`w-10 h-5 rounded-full relative transition-all ${settings.referral_switch ? 'bg-pms-accent' : 'bg-pms-border'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${settings.referral_switch ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <textarea
                value={settings[`referral_msg_${lang}`] || ''}
                onChange={e => updateSettings({ [`referral_msg_${lang}`]: e.target.value })}
                className="w-full bg-pms-bg border border-pms-border rounded-pms p-3 text-xs font-medium h-24 outline-none focus:border-pms-accent text-pms-text resize-none"
              />
            </div>

            {/* 密碼 */}
            <div className="bg-pms-bg-card border border-pms-border-light rounded-pms p-5 space-y-3">
              <h3 className="font-bold text-sm text-pms-accent">管理密碼</h3>
              <input
                type="text"
                value={settings.admin_password || ''}
                onChange={e => updateSettings({ admin_password: e.target.value })}
                className="w-full bg-pms-bg border border-pms-border rounded-pms p-3 text-sm font-mono text-pms-text focus:border-pms-accent outline-none"
              />
            </div>
          </div>
        )}
      </main>

      {/* ===== 訂單編輯 Modal ===== */}
      {selectedCell && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCell(null)} />
          <div className="relative bg-pms-bg border border-pms-border rounded-pms p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <header className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-heading text-lg font-bold text-pms-text">
                  {bookings[`${selectedCell.date}_${selectedCell.roomId}`] ? '編輯訂單' : '新增訂單'}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-pms-accent text-white px-2 py-1 rounded-pms text-[10px] font-bold">{selectedCell.date}</span>
                  <span className="text-xs font-bold text-pms-text-muted">
                    {rooms.find(r => r.id === selectedCell.roomId)?.[lang === 'zh' ? 'name_zh' : 'name_en']}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedCell(null)} className="p-2 rounded-pms hover:bg-pms-accent/10 text-pms-text-muted"><X size={18} /></button>
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

              {/* 狀態選擇 */}
              <div>
                <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider mb-1 block">訂單狀態</label>
                <div className="flex gap-1 bg-pms-bg-card p-1 rounded-pms">
                  {['pending', 'deposit', 'full'].map(s => (
                    <button key={s} onClick={() => setModalData({ ...modalData, status: s })}
                      className={`flex-1 py-2 rounded-pms text-[11px] font-bold uppercase transition-all
                        ${modalData.status === s ? `text-white ${s === 'pending' ? 'bg-status-pending' : s === 'deposit' ? 'bg-status-deposit' : 'bg-status-full'}` : 'text-pms-text-muted hover:bg-pms-accent/10'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* 整棟模式 */}
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
                <a
                  href={`tel:${modalData.phone}`}
                  className="p-3 rounded-pms border border-pms-accent text-pms-accent hover:bg-pms-accent hover:text-white transition-all flex items-center justify-center gap-2"
                  title="一鍵撥號"
                >
                  <Phone size={16} />
                </a>
              )}
              {bookings[`${selectedCell.date}_${selectedCell.roomId}`] && (
                <button onClick={handleDeleteBooking} className="py-3 px-4 rounded-pms border border-red-400 text-red-500 text-xs font-bold hover:bg-red-50 transition-all">
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={handleSaveBooking} className="flex-1 bg-pms-accent text-white font-bold py-3 rounded-pms hover:bg-pms-accent-hover active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2">
                <Save size={16} /> 儲存
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ===== 房型編輯 Modal ===== */}
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
                <select value={roomForm.category || 'double'} onChange={e => setRoomForm({ ...roomForm, category: e.target.value })}
                  className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold text-pms-text outline-none mt-1">
                  <option value="double">雙人房</option>
                  <option value="quad">四人房</option>
                  <option value="suite">套房</option>
                  <option value="dorm">背包房</option>
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
                  <input type="number" value={roomForm.standard_capacity || 2} onChange={e => setRoomForm({ ...roomForm, standard_capacity: Number(e.target.value) })}
                    className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-2.5 text-sm font-bold text-pms-text outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">最大入住</label>
                  <input type="number" value={roomForm.max_capacity || 3} onChange={e => setRoomForm({ ...roomForm, max_capacity: Number(e.target.value) })}
                    className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-2.5 text-sm font-bold text-pms-text outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">加床費</label>
                  <input type="number" value={roomForm.extra_guest_fee || 500} onChange={e => setRoomForm({ ...roomForm, extra_guest_fee: Number(e.target.value) })}
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
                  <label className="text-[10px] font-bold text-pms-text-muted uppercase tracking-wider">優惠價 <span className="text-red-400">(選填)</span></label>
                  <input type="number" value={roomForm.promo_price || ''} placeholder="空=不設優惠"
                    onChange={e => setRoomForm({ ...roomForm, promo_price: e.target.value ? Number(e.target.value) : 0 })}
                    className="w-full bg-pms-bg-card border border-pms-border rounded-pms p-3 text-sm font-bold text-red-500 focus:border-red-400 outline-none mt-1 placeholder:text-pms-text-muted/30" />
                </div>
              </div>
            </div>
            <footer className="mt-6">
              <button onClick={handleSaveRoom} className="w-full bg-pms-accent text-white font-bold py-3 rounded-pms hover:bg-pms-accent-hover active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2">
                <Save size={16} /> 儲存房型
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ===== 定價規則編輯 Modal ===== */}
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
              <button onClick={handleSaveRule} className="w-full bg-pms-accent text-white font-bold py-3 rounded-pms hover:bg-pms-accent-hover active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2">
                <Save size={16} /> 儲存規則
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomAdminDashboard;
