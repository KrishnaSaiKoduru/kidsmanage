import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Trash2, Clock, CheckCircle2, ChevronRight, Activity,
  BookOpen, Sun, Palette, Music, ChevronLeft, Calendar, Users,
  Check, Circle, CheckCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import Spinner from './ui/Spinner';
import EmptyState from './ui/EmptyState';

const CATEGORY_ICONS = { Education: BookOpen, Physical: Sun, Creative: Palette, Music: Music };

const CATEGORY_STYLES = {
  Education: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-400', grad: 'from-blue-500 to-indigo-500' },
  Physical: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-400', grad: 'from-emerald-500 to-teal-500' },
  Creative: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-400', grad: 'from-rose-500 to-pink-500' },
  Music: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-400', grad: 'from-purple-500 to-violet-500' },
  Custom: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-400', grad: 'from-amber-500 to-orange-500' },
};

/* ─── Helpers ──────────────────────────────────────────────────────────── */

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

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const todayStr = toDateStr(new Date());

  return (
    <div className="absolute top-full mt-2 left-0 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-72 animate-fade-slide">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{monthLabel}</span>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-[10px] font-bold text-gray-400 text-center">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateStr = toDateStr(new Date(year, month, day));
          const isSelected = dateStr === selectedDate;
          const isTodayCell = dateStr === todayStr;
          return (
            <button
              key={day}
              onClick={() => { onSelect(dateStr); onClose(); }}
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

      {/* Today shortcut */}
      <button onClick={() => { onSelect(todayStr); onClose(); }}
        className="mt-3 w-full text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
        Go to Today
      </button>
    </div>
  );
}

/* ─── Activity Card (Caretaker / Admin) ───────────────────────────────── */

function ActivityCardStaff({ activity, onDelete, onToggle, onMarkAllDone, deleting }) {
  const [expanded, setExpanded] = useState(false);
  const style = CATEGORY_STYLES[activity.category] || CATEGORY_STYLES.Custom;
  const Icon = CATEGORY_ICONS[activity.category] || Activity;

  const completions = activity.completions || [];
  const total = completions.length;
  const done = completions.filter((c) => c.completed).length;
  const allDone = total > 0 && done === total;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border-l-4 ${style.border} border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden`}>
      {/* Header row */}
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.grad} flex items-center justify-center shadow-md flex-shrink-0`}>
            <Icon size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">{activity.title}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{activity.category}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {activity.scheduledTime && (
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Clock size={12} /> {activity.scheduledTime}</span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Users size={12} /> {done}/{total} done
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Progress ring */}
          {total > 0 && (
            <div className="relative w-9 h-9">
              <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-gray-200 dark:stroke-gray-700" />
                <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeDasharray={`${progress * 0.942} 100`}
                  className={allDone ? 'stroke-emerald-500' : 'stroke-blue-500'} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300">
                {progress}%
              </span>
            </div>
          )}
          <ChevronRight size={16} className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {/* Expanded: student list */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {/* Action bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {done} of {total} students completed
            </span>
            <div className="flex items-center gap-2">
              {!allDone && (
                <button onClick={(e) => { e.stopPropagation(); onMarkAllDone(activity.id); }}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 px-2.5 py-1.5 rounded-lg transition-colors">
                  <CheckCheck size={14} /> Mark All Done
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onDelete(activity.id); }}
                disabled={deleting === activity.id}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Student list */}
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50 max-h-64 overflow-y-auto">
            {completions.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No enrolled students found</p>
            ) : (
              completions.map((comp) => (
                <div key={comp.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold
                      ${comp.completed
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {comp.child?.firstName?.[0]}{comp.child?.lastName?.[0]}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {comp.child?.firstName} {comp.child?.lastName}
                      </span>
                      {comp.child?.room && (
                        <span className="ml-2 text-[10px] text-gray-400 dark:text-gray-500">{comp.child.room}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onToggle(activity.id, comp.child?.id); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all
                      ${comp.completed
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                    {comp.completed ? <Check size={12} /> : <Circle size={12} />}
                    {comp.completed ? 'Done' : 'Pending'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Activity Card (Parent) ──────────────────────────────────────────── */

function ActivityCardParent({ activity }) {
  const style = CATEGORY_STYLES[activity.category] || CATEGORY_STYLES.Custom;
  const Icon = CATEGORY_ICONS[activity.category] || Activity;
  const completion = activity.completions?.[0]; // Parent view only has their child's completion
  const isDone = completion?.completed;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border-l-4 ${style.border} border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.grad} flex items-center justify-center shadow-md`}>
            <Icon size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{activity.title}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{activity.category}</span>
            </div>
            {activity.scheduledTime && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1"><Clock size={12} /> {activity.scheduledTime}</span>
            )}
          </div>
        </div>
        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
          ${isDone
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
          {isDone ? <CheckCircle2 size={14} /> : <Clock size={14} />}
          {isDone ? 'Completed' : 'Pending'}
        </span>
      </div>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────── */

export default function ActivitiesView({ user }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [children, setChildren] = useState([]); // parent's children
  const [selectedChildId, setSelectedChildId] = useState(null);
  const toast = useToast();

  const isParent = user?.role === 'PARENT';
  const canEdit = user?.role === 'ADMIN' || user?.role === 'CARETAKER';

  // Fetch parent's children if parent
  useEffect(() => {
    if (!isParent) return;
    api.get('/children')
      .then((data) => {
        // Filter to only children linked to this parent
        const myChildren = data.filter((c) =>
          c.parentChildren?.some((pc) => pc.parent?.id === user.id)
        );
        setChildren(myChildren);
        if (myChildren.length > 0 && !selectedChildId) {
          setSelectedChildId(myChildren[0].id);
        }
      })
      .catch(() => {});
  }, [isParent, user?.id]);

  const fetchActivities = useCallback(() => {
    setLoading(true);
    let endpoint;
    if (isParent && selectedChildId) {
      endpoint = `/activities/child/${selectedChildId}?date=${selectedDate}`;
    } else {
      endpoint = `/activities?date=${selectedDate}`;
    }
    api.get(endpoint)
      .then(setActivities)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [selectedDate, isParent, selectedChildId]);

  useEffect(() => {
    if (isParent && !selectedChildId) return; // Wait for child selection
    fetchActivities();
  }, [fetchActivities]);

  /* ─── Date navigation ─── */
  const goDay = (offset) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(toDateStr(d));
  };

  /* ─── Actions ─── */
  const handleAdd = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.post('/activities', {
        title: fd.get('title'),
        category: fd.get('category'),
        scheduledTime: `${fd.get('startTime')} - ${fd.get('endTime')}`,
        date: selectedDate,
      });
      toast.success('Activity added');
      setIsModalOpen(false);
      fetchActivities();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await api.delete(`/activities/${id}`);
      toast.success('Activity deleted');
      fetchActivities();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (activityId, childId) => {
    try {
      await api.post(`/activities/${activityId}/toggle-completion`, { childId });
      fetchActivities();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleMarkAllDone = async (activityId) => {
    try {
      await api.post(`/activities/${activityId}/mark-all-done`);
      toast.success('All students marked as done');
      fetchActivities();
    } catch (err) {
      toast.error(err.message);
    }
  };

  /* ─── Summary stats ─── */
  const totalActivities = activities.length;
  const totalCompletions = activities.reduce((sum, a) => sum + (a.completions?.filter((c) => c.completed).length || 0), 0);
  const totalStudents = activities.reduce((sum, a) => sum + (a.completions?.length || 0), 0);

  const dateObj = new Date(selectedDate + 'T00:00:00');

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-slide space-y-6 pb-12 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Daily Activities</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isToday(selectedDate) ? 'Today' : formatLabel(dateObj)} &middot; {totalActivities} scheduled
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm">
            <Plus size={16} /> New Activity
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

      {/* Parent: child selector */}
      {isParent && children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map((child) => (
            <button key={child.id} onClick={() => setSelectedChildId(child.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all
                ${selectedChildId === child.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {child.firstName} {child.lastName}
            </button>
          ))}
        </div>
      )}

      {/* Category tags */}
      <div className="flex gap-2 flex-wrap">
        {Object.keys(CATEGORY_STYLES).filter((c) => c !== 'Custom').map((cat) => {
          const style = CATEGORY_STYLES[cat];
          return <span key={cat} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>{cat}</span>;
        })}
      </div>

      {/* Summary bar (staff only) */}
      {canEdit && totalActivities > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-center">
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalActivities}</p>
            <p className="text-[11px] font-semibold text-gray-400">Activities</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalCompletions}</p>
            <p className="text-[11px] font-semibold text-gray-400">Completed</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalStudents - totalCompletions}</p>
            <p className="text-[11px] font-semibold text-gray-400">Pending</p>
          </div>
        </div>
      )}

      {/* Activity list */}
      {activities.length === 0 ? (
        <EmptyState icon={Activity}
          title={isToday(selectedDate) ? 'No activities scheduled' : `No activities on ${formatLabel(dateObj)}`}
          description={canEdit ? 'Add your first activity for this day' : 'No activities have been scheduled'}
          action={canEdit ? <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700">Add Activity</button> : null}
        />
      ) : (
        <div className="space-y-3">
          {isParent
            ? activities.map((a) => <ActivityCardParent key={a.id} activity={a} />)
            : activities.map((a) => (
              <ActivityCardStaff key={a.id} activity={a} onDelete={handleDelete} onToggle={handleToggle}
                onMarkAllDone={handleMarkAllDone} deleting={deleting} />
            ))
          }
        </div>
      )}

      {/* Add Activity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">New Activity</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Activity Title</label>
                <input name="title" required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200 text-sm" placeholder="e.g. Story Time" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">From</label>
                    <input name="startTime" type="time" required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200 text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">To</label>
                    <input name="endTime" type="time" required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Category</label>
                  <select name="category" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200 text-sm">
                    <option>Education</option><option>Physical</option><option>Creative</option><option>Music</option><option>Custom</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Scheduling for: <strong>{isToday(selectedDate) ? 'Today' : formatLabel(dateObj)}</strong>
              </p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm">Add Activity</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
