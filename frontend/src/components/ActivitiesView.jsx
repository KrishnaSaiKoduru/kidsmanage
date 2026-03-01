import { useState, useEffect } from 'react';
import {
  Plus, X, Trash2, Clock, CheckCircle2, ChevronRight, Activity,
  BookOpen, Sun, Palette, Music,
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

export default function ActivitiesView({ user }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const toast = useToast();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'CARETAKER';

  const today = new Date().toISOString().split('T')[0];

  const fetchActivities = () => {
    api.get(`/activities?date=${today}`)
      .then(setActivities)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchActivities(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.post('/activities', {
        title: fd.get('title'),
        category: fd.get('category'),
        scheduledTime: fd.get('time'),
        date: today,
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

  if (loading) return <Spinner />;

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="animate-fade-slide space-y-6 pb-12 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Daily Activities</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{todayLabel} &middot; {activities.length} scheduled</p>
        </div>
        {canEdit && (
          <button onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm">
            <Plus size={16} /> New Activity
          </button>
        )}
      </div>

      {/* Category tags */}
      <div className="flex gap-2 flex-wrap">
        {Object.keys(CATEGORY_STYLES).filter((c) => c !== 'Custom').map((cat) => {
          const style = CATEGORY_STYLES[cat];
          return <span key={cat} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>{cat}</span>;
        })}
      </div>

      {/* Activity list */}
      {activities.length === 0 ? (
        <EmptyState icon={Activity} title="No activities scheduled" description={canEdit ? "Add your first activity for today" : "No activities have been scheduled yet"}
          action={canEdit ? <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700">Add Activity</button> : null} />
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const style = CATEGORY_STYLES[activity.category] || CATEGORY_STYLES.Custom;
            const Icon = CATEGORY_ICONS[activity.category] || Activity;
            return (
              <div key={activity.id} className={`bg-white dark:bg-gray-800 rounded-2xl border-l-4 ${style.border} border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden`}>
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
                      <div className="flex items-center gap-2 mt-1">
                        {activity.scheduledTime && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Clock size={12} /> {activity.scheduledTime}</span>
                        )}
                        {activity.child && (
                          <span className="text-xs text-blue-500">{activity.child.firstName} {activity.child.lastName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <button onClick={() => handleDelete(activity.id)} disabled={deleting === activity.id}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors disabled:opacity-50">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Time</label>
                  <input name="time" type="time" required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Category</label>
                  <select name="category" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200 text-sm">
                    <option>Education</option><option>Physical</option><option>Creative</option><option>Music</option><option>Custom</option>
                  </select>
                </div>
              </div>
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
