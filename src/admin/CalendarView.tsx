import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Calendar as CalendarIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Room, Booking } from '../types';

interface CalendarViewProps {
  activeTab: 'week' | 'month';
  setActiveTab: (tab: 'week' | 'month') => void;
  weekStart: string;
  setWeekStart: (date: string) => void;
  monthDate: Date;
  setMonthDate: (date: Date) => void;
  onSelectCell: (date: string, roomId: string) => void;
}

// ===== 週視圖格子 =====
const WeekCell: React.FC<{ date: string, room: Room, booking?: Booking, onClick: (date: string, roomId: string) => void, isToday: boolean, isPast: boolean }> = React.memo(({ date, room, booking, onClick, isToday, isPast }) => {
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
          <span className="text-[11px] font-bold truncate opacity-100">{booking.customer_name}</span>
          <span className="text-[9px] font-bold opacity-100 text-white/90">
            ${((booking.total_price || 0) / 1000).toFixed(1)}k
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <span className="text-[11px] font-bold text-pms-accent">空房</span>
        </div>
      )}
    </div>
  );
});

// ===== 月視圖格子 =====
const MonthCell: React.FC<{ date: string, rooms: Room[], bookings: Record<string, Booking>, onSelect: (date: string) => void, isToday: boolean, isPast: boolean }> = React.memo(({ date, rooms, bookings, onSelect, isToday, isPast }) => {
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
            {booking ? (booking.customer_name || '---') : ''}
          </div>
        ))}
      </div>
    </div>
  );
});

const CalendarView: React.FC<CalendarViewProps> = ({ activeTab, setActiveTab, weekStart, setWeekStart, monthDate, setMonthDate, onSelectCell }) => {
  const { lang, rooms, bookings } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

  const monthDays = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const firstDay = first.getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const days: (string | null)[] = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
    for (let d = 1; d <= total; d++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return days;
  }, [monthDate]);

  const wholeHouseDates = useMemo(() => {
    const dates: Record<string, boolean> = {};
    Object.values(bookings).forEach(b => {
      if (b.is_whole_house) dates[b.date] = true;
    });
    return dates;
  }, [bookings]);

  return (
    <div className="space-y-3">
      {activeTab === 'week' ? (
        <div className="space-y-3">
          <header className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <div className="flex border border-pms-border rounded-pms overflow-hidden">
                <button onClick={() => setActiveTab('week')} className="px-2.5 py-1.5 text-[11px] font-bold bg-pms-accent text-white">週</button>
                <button onClick={() => setActiveTab('month')} className="px-2.5 py-1.5 text-[11px] font-bold text-pms-text-muted hover:bg-pms-accent/10 border-l border-pms-border">月</button>
              </div>
              <button onClick={() => {
                const now = new Date();
                const day = now.getDay();
                const monday = new Date(now);
                monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
                setWeekStart(monday.toISOString().split('T')[0]);
              }} className="px-2.5 py-1.5 rounded-pms border border-pms-border text-[11px] font-bold hover:bg-pms-accent/10">Today</button>
              <span className="text-pms-border-light">│</span>
              <button onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() - 7);
                setWeekStart(d.toISOString().split('T')[0]);
              }} className="p-1.5 rounded-pms border border-pms-border hover:bg-pms-accent/10"><ChevronLeft size={14} /></button>
              <button onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + 7);
                setWeekStart(d.toISOString().split('T')[0]);
              }} className="p-1.5 rounded-pms border border-pms-border hover:bg-pms-accent/10"><ChevronRight size={14} /></button>
              <span className="text-xs font-bold text-pms-text ml-1">{weekDays[0]} ~ {weekDays[6]}</span>
            </div>
          </header>

          <div className="border border-pms-border rounded-pms overflow-hidden">
            <div className="grid" style={{ gridTemplateColumns: '120px repeat(7, 1fr)' }}>
              <div className="p-3 bg-pms-bg-card border-b border-r border-pms-border-light text-[10px] font-bold text-pms-accent uppercase tracking-wider sticky left-0 z-10">Rooms</div>
              {weekDays.map(d => {
                const date = new Date(d + 'T00:00:00');
                const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div key={d} className={`p-2 bg-pms-bg-card border-b border-r border-pms-border-light text-center ${d === today ? 'bg-pms-accent/10' : ''}`}>
                    <div className={`text-xs font-bold ${wholeHouseDates[d] ? 'text-indigo-600' : isWeekend ? 'text-orange-500' : 'text-pms-text'}`}>{d.split('-').slice(1).join('/')}</div>
                    <div className={`text-[9px] ${wholeHouseDates[d] ? 'text-indigo-400' : isWeekend ? 'text-orange-400' : 'text-pms-text-muted'}`}>{wholeHouseDates[d] ? '包棟' : dayName}</div>
                  </div>
                );
              })}
              {rooms.map(room => (
                <React.Fragment key={room.id}>
                  <div className="p-3 bg-pms-bg border-b border-r border-pms-border-light text-[11px] font-bold text-pms-text truncate sticky left-0 z-10">
                    {lang === 'zh' ? room.name_zh : room.name_en}
                  </div>
                  {weekDays.map(d => (
                    <div key={`${d}_${room.id}`} className={`p-1 border-b border-r border-pms-border-light ${wholeHouseDates[d] ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                      <WeekCell date={d} room={room} booking={bookings[`${d}_${room.id}`]} onClick={onSelectCell} isToday={d === today} isPast={d < today} />
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <header className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <div className="flex border border-pms-border rounded-pms overflow-hidden">
                <button onClick={() => setActiveTab('week')} className="px-2.5 py-1.5 text-[11px] font-bold text-pms-text-muted hover:bg-pms-accent/10 border-r border-pms-border">週</button>
                <button onClick={() => setActiveTab('month')} className="px-2.5 py-1.5 text-[11px] font-bold bg-pms-accent text-white">月</button>
              </div>
              <button onClick={() => setMonthDate(new Date())} className="px-2.5 py-1.5 rounded-pms border border-pms-border text-[11px] font-bold hover:bg-pms-accent/10">Today</button>
              <button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1))} className="p-1.5 rounded-pms border border-pms-border hover:bg-pms-accent/10"><ChevronLeft size={14} /></button>
              <span className="text-xs font-bold text-pms-text">{monthDate.getFullYear()} / {monthDate.getMonth() + 1}</span>
              <button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1))} className="p-1.5 rounded-pms border border-pms-border hover:bg-pms-accent/10"><ChevronRight size={14} /></button>
            </div>
          </header>
          <div className="grid grid-cols-7 gap-1">
            {dayNames.map(d => <div key={d} className="text-center text-[10px] font-bold text-pms-text-muted py-2">{d}</div>)}
            {monthDays.map((d, i) => d ? (
              <MonthCell key={d} date={d} rooms={rooms} bookings={bookings} onSelect={(date) => {
                const dt = new Date(date);
                const day = dt.getDay();
                const mon = new Date(dt);
                mon.setDate(dt.getDate() - (day === 0 ? 6 : day - 1));
                setWeekStart(mon.toISOString().split('T')[0]);
                setActiveTab('week');
              }} isToday={d === today} isPast={d < today} />
            ) : <div key={`pad-${i}`} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
