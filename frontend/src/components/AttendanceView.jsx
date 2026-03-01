import { useState, useEffect, useCallback } from 'react';
import {
  Download, Search, Clock, UserCheck, UserX, LogOut as LogOutIcon,
  ChevronLeft, ChevronRight, Calendar,
} from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import Spinner from './ui/Spinner';
import EmptyState from './ui/EmptyState';

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

function formatLabel(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function isToday(dateStr) {
  return dateStr === toDateStr(new Date());
}

/* ─── Mini Calendar Popover ───────────────────────────────────────────── */

function MiniCalendar({ selectedDate, onSelect, onClose }) {
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate + 'T00:00:00'));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayStr = toDateStr(new Date());

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-72 animate-fade-slide">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{monthLabel}</span>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-[10px] font-bold text-gray-400 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = toDateStr(new Date(year, month, day));
          const isSelected = dateStr === selectedDate;
          const isTodayCell = dateStr === todayStr;
          return (
            <button key={day} onClick={() => { onSelect(dateStr); onClose(); }}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all
                ${isSelected ? 'bg-blue-600 text-white shadow-md' : ''}
                ${!isSelected && isTodayCell ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300' : ''}
                ${!isSelected && !isTodayCell ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
      <button onClick={() => { onSelect(todayStr); onClose(); }}
        className="mt-3 w-full text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
        Go to Today
      </button>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────── */

export default function AttendanceView({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRoom, setFilterRoom] = useState('All');
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const toast = useToast();
  const isParent = user?.role === 'PARENT';

  // Can only check in/out on today
  const isHistorical = !isToday(selectedDate);

  const fetchAttendance = useCallback(() => {
    setLoading(true);
    const endpoint = isParent
      ? `/attendance/my-children?date=${selectedDate}`
      : `/attendance/today?date=${selectedDate}`;
    api.get(endpoint)
      .then(setData)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [selectedDate, isParent]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const goDay = (offset) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(toDateStr(d));
  };

  const handleCheckIn = async (childId) => {
    setActionLoading(childId);
    try {
      await api.post('/attendance/checkin', { childId });
      toast.success('Checked in successfully');
      fetchAttendance();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOut = async (childId) => {
    setActionLoading(childId);
    try {
      await api.post('/attendance/checkout', { childId });
      toast.success('Checked out successfully');
      fetchAttendance();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <Spinner />;

  const summary = data?.summary || { total: 0, present: 0, checkedOut: 0, absent: 0 };
  const dateObj = new Date(selectedDate + 'T00:00:00');

  // Build unified roster
  const roster = [
    ...(data?.present || []).map((r) => ({
      id: r.child.id,
      name: `${r.child.firstName} ${r.child.lastName}`,
      room: r.child.room || 'Unassigned',
      status: 'Present',
      timeIn: r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    })),
    ...(data?.checkedOut || []).map((r) => ({
      id: r.child.id,
      name: `${r.child.firstName} ${r.child.lastName}`,
      room: r.child.room || 'Unassigned',
      status: 'Checked Out',
      timeIn: r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    })),
    ...(data?.absent || []).map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      room: c.room || 'Unassigned',
      status: 'Absent',
      timeIn: '-',
    })),
  ];

  const rooms = ['All', ...new Set(roster.map((s) => s.room))];
  const visible = roster.filter((s) =>
    (filterRoom === 'All' || s.room === filterRoom) &&
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const statusStyle = {
    Present: { pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-400', row: 'border-l-emerald-400' },
    Absent: { pill: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', dot: 'bg-red-400', row: 'border-l-red-400' },
    'Checked Out': { pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-400', row: 'border-l-amber-400' },
  };

  const getInitials = (name) => name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  const colors = ['bg-rose-400', 'bg-blue-400', 'bg-emerald-400', 'bg-amber-400', 'bg-purple-400', 'bg-teal-400', 'bg-pink-400'];

  return (
    <div className="animate-fade-slide space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Attendance</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isToday(selectedDate) ? 'Today' : formatLabel(dateObj)}
            {isHistorical && <span className="ml-2 text-xs font-semibold text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">Historical View</span>}
          </p>
        </div>
        {!isParent && (
          <button className="flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm">
            <Download size={16} /> Export CSV
          </button>
        )}
      </div>

      {/* Date navigator */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-3">
        <button onClick={() => goDay(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
          <ChevronLeft size={18} />
        </button>

        <div className="relative flex items-center gap-2">
          <button onClick={() => setCalendarOpen(!calendarOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Calendar size={16} className="text-blue-500" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
              {isToday(selectedDate) ? `Today — ${formatLabel(dateObj)}` : formatLabel(dateObj)}
            </span>
          </button>
          {!isToday(selectedDate) && (
            <button onClick={() => setSelectedDate(toDateStr(new Date()))}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1">
              Today
            </button>
          )}
          {calendarOpen && (
            <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} onClose={() => setCalendarOpen(false)} />
          )}
        </div>

        <button onClick={() => goDay(1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Present', count: summary.present, grad: 'from-emerald-500 to-teal-500', icon: UserCheck },
          { label: 'Checked Out', count: summary.checkedOut, grad: 'from-amber-400 to-orange-500', icon: LogOutIcon },
          { label: 'Absent', count: summary.absent, grad: 'from-red-400 to-rose-500', icon: UserX },
        ].map((s) => (
          <div key={s.label} className={`bg-gradient-to-br ${s.grad} rounded-2xl p-5 text-white flex items-center gap-4 shadow-md`}>
            <div className="p-2.5 bg-white/20 rounded-xl"><s.icon size={22} /></div>
            <div>
              <p className="text-3xl font-extrabold leading-none">{s.count}</p>
              <p className="text-sm font-semibold opacity-80 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Roster */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h3 className="font-bold text-gray-800 dark:text-gray-100">
            {isToday(selectedDate) ? "Today's" : formatLabel(dateObj).split(',')[0] + "'s"} Roster ({roster.length} students)
          </h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
                className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:text-gray-200" />
            </div>
            <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none dark:text-gray-200">
              {rooms.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState title="No students found" description="Try adjusting your search or filter" />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {visible.map((student, idx) => {
              const st = statusStyle[student.status];
              return (
                <div key={student.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 dark:hover:bg-gray-700/40 transition-colors border-l-4 ${st.row}`}>
                  <div className={`w-10 h-10 rounded-xl ${colors[idx % colors.length]} text-white flex items-center justify-center font-bold text-sm shrink-0`}>
                    {getInitials(student.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{student.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{student.room}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock size={13} />
                    <span className="font-medium">{student.timeIn}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${st.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                      {student.status}
                    </span>
                    {/* Only show action buttons on today's view */}
                    {!isParent && !isHistorical && student.status === 'Absent' && (
                      <button onClick={() => handleCheckIn(student.id)} disabled={actionLoading === student.id}
                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-colors disabled:opacity-50">
                        {actionLoading === student.id ? '...' : 'Check In'}
                      </button>
                    )}
                    {!isParent && !isHistorical && student.status === 'Present' && (
                      <button onClick={() => handleCheckOut(student.id)} disabled={actionLoading === student.id}
                        className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 transition-colors disabled:opacity-50">
                        {actionLoading === student.id ? '...' : 'Check Out'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
