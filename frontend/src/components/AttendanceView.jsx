import { useState, useEffect } from 'react';
import { Download, Search, Clock, UserCheck, UserX, LogOut as LogOutIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import Spinner from './ui/Spinner';
import EmptyState from './ui/EmptyState';

export default function AttendanceView({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRoom, setFilterRoom] = useState('All');
  const toast = useToast();
  const isParent = user?.role === 'PARENT';

  const fetchAttendance = () => {
    const endpoint = isParent ? '/attendance/my-children' : '/attendance/today';
    api.get(endpoint)
      .then(setData)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAttendance(); }, []);

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
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Attendance</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{today}</p>
        </div>
        {!isParent && (
          <button className="flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm">
            <Download size={16} /> Export CSV
          </button>
        )}
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
          <h3 className="font-bold text-gray-800 dark:text-gray-100">Today's Roster ({roster.length} students)</h3>
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
                    {!isParent && student.status === 'Absent' && (
                      <button onClick={() => handleCheckIn(student.id)} disabled={actionLoading === student.id}
                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-colors disabled:opacity-50">
                        {actionLoading === student.id ? '...' : 'Check In'}
                      </button>
                    )}
                    {!isParent && student.status === 'Present' && (
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
