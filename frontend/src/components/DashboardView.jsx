import { useState, useEffect } from 'react';
import {
  Users, CheckCircle2, DollarSign, MessageSquare, ChevronRight,
  CalendarCheck, Clock, Zap, Download, UserCheck, Activity,
} from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import Spinner from './ui/Spinner';

export default function DashboardView({ user, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(setStats)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const role = user?.role;

  if (role === 'PARENT') return <ParentDashboard stats={stats} user={user} greeting={greeting} today={today} onNavigate={onNavigate} />;
  if (role === 'CARETAKER') return <CaretakerDashboard stats={stats} user={user} greeting={greeting} today={today} onNavigate={onNavigate} />;
  return <AdminDashboard stats={stats} user={user} greeting={greeting} today={today} onNavigate={onNavigate} />;
}

function AdminDashboard({ stats, user, greeting, today, onNavigate }) {
  const att = stats?.attendance || { present: 0, absent: 0, total: 0, rate: 0 };
  const bill = stats?.billing || { collected: 0, pending: 0, overdue: 0 };
  const billTotal = bill.collected + bill.pending + bill.overdue || 1;

  return (
    <div className="animate-fade-slide space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{greeting}, {user?.name?.split(' ')[0] || 'there'}!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{today}</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors active:scale-95">
          <Download size={16} /> Generate Report
        </button>
      </div>

      {/* KPI Cards - Now clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Enrolled', value: stats?.children?.enrolled || 0, sub: `${stats?.children?.pendingApplications || 0} pending`, icon: Users, grad: 'from-blue-500 to-blue-600', target: 'enrollment' },
          { label: 'Present Today', value: att.present, sub: `${att.rate}% attendance rate`, icon: CheckCircle2, grad: 'from-emerald-500 to-emerald-600', target: 'attendance' },
          { label: 'Pending Revenue', value: `$${bill.pending.toLocaleString()}`, sub: 'Awaiting payment', icon: DollarSign, grad: 'from-amber-500 to-orange-500', target: 'billing' },
          { label: 'Messages Today', value: stats?.unreadMessages || 0, sub: 'New messages', icon: MessageSquare, grad: 'from-purple-500 to-violet-600', target: 'messages' },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => onNavigate(stat.target)}
            className={`bg-gradient-to-br ${stat.grad} p-5 rounded-2xl text-white shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors"><stat.icon size={20} /></div>
              <ChevronRight size={16} className="opacity-60 mt-1 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
            </div>
            <p className="text-3xl font-extrabold leading-none mb-1">{stat.value}</p>
            <p className="text-xs font-semibold opacity-80">{stat.label}</p>
            <p className="text-[11px] opacity-60 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div onClick={() => onNavigate('attendance')} className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]">
          <AttendanceSnapshot att={att} />
        </div>
        
        {/* Billing overview - Clickable */}
        <div 
          onClick={() => onNavigate('billing')}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 cursor-pointer hover:shadow-md transition-all hover:border-amber-200 dark:hover:border-amber-800"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><DollarSign size={18} className="text-amber-500" /> Billing Overview</h3>
            <ChevronRight size={18} className="text-gray-400" />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Collected', value: `$${bill.collected.toLocaleString()}`, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { label: 'Pending', value: `$${bill.pending.toLocaleString()}`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
              { label: 'Overdue', value: `$${bill.overdue.toLocaleString()}`, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
            ].map(b => (
              <div key={b.label} className={`${b.bg} rounded-xl p-3 text-center`}>
                <p className={`text-lg font-extrabold ${b.color}`}>{b.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{b.label}</p>
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full flex overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(bill.collected / billTotal) * 100}%` }}></div>
            <div className="bg-amber-400 h-full transition-all duration-1000" style={{ width: `${(bill.pending / billTotal) * 100}%` }}></div>
            <div className="bg-red-400 h-full transition-all duration-1000" style={{ width: `${(bill.overdue / billTotal) * 100}%` }}></div>
          </div>
        </div>
      </div>

      <RecentCheckIns checkIns={stats?.recentCheckIns} />
    </div>
  );
}

function CaretakerDashboard({ stats, user, greeting, today, onNavigate }) {
  const att = stats?.attendance || { present: 0, absent: 0, total: 0, rate: 0 };

  return (
    <div className="animate-fade-slide space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{greeting}, {user?.name?.split(' ')[0] || 'there'}!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{today}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Children', value: stats?.children?.enrolled || 0, sub: 'Enrolled', icon: Users, grad: 'from-blue-500 to-blue-600', target: 'dashboard' },
          { label: 'Present Today', value: att.present, sub: `${att.rate}% attendance`, icon: CheckCircle2, grad: 'from-emerald-500 to-emerald-600', target: 'attendance' },
          { label: 'Activities Today', value: stats?.activitiesScheduled || 0, sub: 'Scheduled', icon: Activity, grad: 'from-amber-500 to-orange-500', target: 'activities' },
          { label: 'Messages Today', value: stats?.unreadMessages || 0, sub: 'New messages', icon: MessageSquare, grad: 'from-purple-500 to-violet-600', target: 'messages' },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => onNavigate(stat.target)}
            className={`bg-gradient-to-br ${stat.grad} p-5 rounded-2xl text-white shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors"><stat.icon size={20} /></div>
              <ChevronRight size={16} className="opacity-60 mt-1 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
            </div>
            <p className="text-3xl font-extrabold leading-none mb-1">{stat.value}</p>
            <p className="text-xs font-semibold opacity-80">{stat.label}</p>
            <p className="text-[11px] opacity-60 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div onClick={() => onNavigate('attendance')} className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99] max-w-2xl">
        <AttendanceSnapshot att={att} />
      </div>
      <RecentCheckIns checkIns={stats?.recentCheckIns} />
    </div>
  );
}

function ParentDashboard({ stats, user, greeting, today, onNavigate }) {
  const att = stats?.attendance || { present: 0, absent: 0, total: 0, rate: 0 };
  const bill = stats?.billing || { pending: 0, overdue: 0 };
  const children = stats?.myChildren || [];

  return (
    <div className="animate-fade-slide space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{greeting}, {user?.name?.split(' ')[0] || 'there'}!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{today}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Children', value: children.length, sub: 'Enrolled', icon: Users, grad: 'from-blue-500 to-blue-600', target: 'dashboard' },
          { label: 'Present Today', value: att.present, sub: `of ${att.total}`, icon: CheckCircle2, grad: 'from-emerald-500 to-emerald-600', target: 'attendance' },
          { label: 'Pending Bills', value: `$${bill.pending.toLocaleString()}`, sub: 'Awaiting payment', icon: DollarSign, grad: 'from-amber-500 to-orange-500', target: 'billing' },
          { label: 'Messages', value: stats?.unreadMessages || 0, sub: 'Today', icon: MessageSquare, grad: 'from-purple-500 to-violet-600', target: 'messages' },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => onNavigate(stat.target)}
            className={`bg-gradient-to-br ${stat.grad} p-5 rounded-2xl text-white shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors"><stat.icon size={20} /></div>
              <ChevronRight size={16} className="opacity-60 mt-1 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
            </div>
            <p className="text-3xl font-extrabold leading-none mb-1">{stat.value}</p>
            <p className="text-xs font-semibold opacity-80">{stat.label}</p>
            <p className="text-[11px] opacity-60 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {children.length > 0 && (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><Users size={18} className="text-blue-500" /> My Children</h3>
          <div className="space-y-3">
            {children.map((child) => (
              <div key={child.id} className="flex items-center gap-3 p-3 bg-gray-50/80 dark:bg-gray-700/50 rounded-xl hover:bg-white dark:hover:bg-gray-600 hover:shadow-sm transition-all cursor-pointer border border-transparent hover:border-blue-100 dark:hover:border-blue-900">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {child.firstName[0]}{child.lastName[0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{child.firstName} {child.lastName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{child.room || 'Unassigned'}</p>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div onClick={() => onNavigate('attendance')} className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99] max-w-2xl mt-6">
        <AttendanceSnapshot att={att} />
      </div>
    </div>
  );
}

function AttendanceSnapshot({ att }) {
  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow hover:border-emerald-200 dark:hover:border-emerald-800 group">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><CalendarCheck size={18} className="text-emerald-500" /> Today's Attendance</h3>
        <ChevronRight size={18} className="text-gray-400 group-hover:translate-x-1 group-hover:text-emerald-500 transition-all" />
      </div>
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-28 h-28">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F3F4F6" strokeWidth="3" className="dark:stroke-gray-700" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10B981" strokeWidth="3"
              strokeDasharray={`${att.rate} ${100 - att.rate}`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-gray-800 dark:text-gray-100">{att.rate}%</span>
            <span className="text-xs text-gray-400">Present</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Present', value: att.present, color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
          { label: 'Checked Out', value: att.checkedOut || 0, color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-400' },
          { label: 'Absent', value: att.absent, color: 'text-red-500 dark:text-red-400', dot: 'bg-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50/80 dark:bg-gray-700/50 rounded-xl p-2">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className={`w-2 h-2 rounded-full ${s.dot}`}></span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">{s.label}</span>
            </div>
            <p className={`text-lg font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentCheckIns({ checkIns }) {
  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><Zap size={18} className="text-blue-500" /> Recent Check-Ins</h3>
      {checkIns?.length > 0 ? (
        <div className="space-y-3">
          {checkIns.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="p-2 rounded-xl text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 shrink-0"><UserCheck size={14} /></div>
              <p className="text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate">{a.childName} checked in</p>
              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap font-medium">
                {a.time ? new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No check-ins today yet</p>
      )}
    </div>
  );
}
