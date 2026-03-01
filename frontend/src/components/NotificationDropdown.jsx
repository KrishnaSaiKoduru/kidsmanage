import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X, FileText, MessageSquare, UserPlus, CalendarCheck, DollarSign, UserCheck, Info } from 'lucide-react';
import { api } from '../lib/api';

const ICON_MAP = {
  'New Enrollment Application': { icon: UserPlus, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/30' },
  'Enrollment Approved': { icon: UserCheck, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/30' },
  'New Invoice': { icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  'Payment Received': { icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/30' },
  'Payment Confirmed': { icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/30' },
  'Checked In': { icon: CalendarCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  'Checked Out': { icon: CalendarCheck, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30' },
  'New Message': { icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/30' },
  'Invite Accepted': { icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30' },
};

function getNotificationStyle(title) {
  for (const [key, style] of Object.entries(ICON_MAP)) {
    if (title.includes(key)) return style;
  }
  return { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30' };
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationDropdown({ onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Poll for unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchUnreadCount() {
    try {
      const data = await api.get('/notifications/unread-count');
      setUnreadCount(data.count);
    } catch {
      // Silently fail — don't interrupt UX
    }
  }

  async function fetchNotifications() {
    setLoading(true);
    try {
      const data = await api.get('/notifications');
      setNotifications(data);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  }

  async function handleMarkAsRead(e, id) {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }

  function handleNotificationClick(notification) {
    // Mark as read if unread
    if (!notification.read) {
      api.patch(`/notifications/${notification.id}/read`).catch(() => {});
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // Navigate to the linked tab if available
    if (notification.link && onNavigate) {
      const tab = notification.link.replace('/', '');
      if (tab) onNavigate(tab);
    }

    setIsOpen(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-500 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700 rounded-full transition-all active:scale-90"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-gray-800 px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[100] animate-tab-enter">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[420px] divide-y divide-gray-50 dark:divide-gray-700/50">
            {loading && notifications.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-400 dark:text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const style = getNotificationStyle(n.title);
                const IconComp = style.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      !n.read ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${style.bg}`}>
                      <IconComp size={16} className={style.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <button
                            onClick={(e) => handleMarkAsRead(e, n.id)}
                            className="shrink-0 p-1 text-gray-400 hover:text-blue-500 rounded transition-colors"
                            title="Mark as read"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                      {n.body && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <div className="shrink-0 mt-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
