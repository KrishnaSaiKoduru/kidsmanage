import { useState, useEffect } from 'react';
import {
  LayoutDashboard, CalendarCheck, FileText, MessageSquare,
  UserPlus, Activity, Settings as SettingsIcon, Menu, X, LogOut,
  Sun, Moon, Search, Plus, HelpCircle
} from 'lucide-react';

import DashboardView from './components/DashboardView';
import AttendanceView from './components/AttendanceView';
import BillingView from './components/BillingView';
import EnrollmentView from './components/EnrollmentView';
import ActivitiesView from './components/ActivitiesView';
import MessagesView from './components/MessagesView';
import SettingsView from './components/SettingsView';
import ProfileModal from './components/ProfileModal';
import NotificationDropdown from './components/NotificationDropdown';

// Each tab has its own accent color for personality & wayfinding
const menuItems = [
  { id: 'dashboard',   label: 'Dashboard',       icon: LayoutDashboard, roles: ['ADMIN', 'CARETAKER', 'PARENT'],
    color: 'blue',    activeClasses: 'bg-blue-500/15 text-blue-700 dark:bg-blue-500/25 dark:text-blue-300',   borderColor: 'border-blue-500',   iconColor: 'text-blue-500'   },
  { id: 'attendance',  label: 'Attendance',       icon: CalendarCheck,   roles: ['ADMIN', 'CARETAKER', 'PARENT'],
    color: 'emerald', activeClasses: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300', borderColor: 'border-emerald-500', iconColor: 'text-emerald-500' },
  { id: 'billing',     label: 'Billing',          icon: FileText,        roles: ['ADMIN', 'PARENT'],
    color: 'amber',   activeClasses: 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300',   borderColor: 'border-amber-500',   iconColor: 'text-amber-500'   },
  { id: 'messages',    label: 'Messages',         icon: MessageSquare,   roles: ['ADMIN', 'CARETAKER', 'PARENT'],
    color: 'purple',  activeClasses: 'bg-purple-500/15 text-purple-700 dark:bg-purple-500/25 dark:text-purple-300', borderColor: 'border-purple-500', iconColor: 'text-purple-500' },
  { id: 'enrollment',  label: 'Enrollment',       icon: UserPlus,        roles: ['ADMIN'],
    color: 'yellow',  activeClasses: 'bg-yellow-500/15 text-yellow-700 dark:bg-yellow-500/25 dark:text-yellow-300', borderColor: 'border-yellow-500', iconColor: 'text-yellow-500' },
  { id: 'activities',  label: 'Daily Activities', icon: Activity,        roles: ['ADMIN', 'CARETAKER', 'PARENT'],
    color: 'pink',    activeClasses: 'bg-pink-500/15 text-pink-700 dark:bg-pink-500/25 dark:text-pink-300',     borderColor: 'border-pink-500',   iconColor: 'text-pink-500'   },
  { id: 'settings',    label: 'Settings',         icon: SettingsIcon,    roles: ['ADMIN'],
    color: 'slate',   activeClasses: 'bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-300',   borderColor: 'border-slate-500',   iconColor: 'text-slate-500'   },
];

// Header tint strips matched to each tab's color for a cohesive feel
const headerTints = {
  dashboard:  'from-blue-50/80 to-white/80 dark:from-blue-900/30 dark:to-gray-800/80',
  attendance: 'from-emerald-50/80 to-white/80 dark:from-emerald-900/30 dark:to-gray-800/80',
  billing:    'from-amber-50/80 to-white/80 dark:from-amber-900/30 dark:to-gray-800/80',
  messages:   'from-purple-50/80 to-white/80 dark:from-purple-900/30 dark:to-gray-800/80',
  enrollment: 'from-yellow-50/80 to-white/80 dark:from-yellow-900/30 dark:to-gray-800/80',
  activities: 'from-pink-50/80 to-white/80 dark:from-pink-900/30 dark:to-gray-800/80',
  settings:   'from-slate-50/80 to-white/80 dark:from-slate-900/30 dark:to-gray-800/80',
};

export default function Portal({ onLogout, user, setUser }) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Set initial sidebar state based on window width
  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 1024);
    handleResize(); // Trigger once on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const visibleMenuItems = menuItems.filter((item) => item.roles.includes(user?.role));
  const activeItem = menuItems.find((m) => m.id === currentView);

  const handleNavClick = (id) => {
    setCurrentView(id);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':  return <DashboardView user={user} onNavigate={setCurrentView} />;
      case 'attendance': return <AttendanceView user={user} />;
      case 'billing':    return <BillingView user={user} />;
      case 'enrollment': return <EnrollmentView user={user} />;
      case 'activities': return <ActivitiesView user={user} />;
      case 'messages':   return <MessagesView user={user} />;
      case 'settings':   return <SettingsView user={user} />;
      default:           return <DashboardView user={user} onNavigate={setCurrentView} />;
    }
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'U';

  return (
    <div className={`${isDarkMode ? 'dark' : ''}`}>
      {/* Background container */}
      <div
        className="flex h-screen w-full font-sans overflow-hidden bg-cover bg-center transition-all duration-700 text-gray-800 dark:text-gray-100 relative"
        style={{ backgroundImage: `url('/images/portal_bg_${currentView}.png')` }}
      >
        {/* Soft overlay */}
        <div className="absolute inset-0 bg-white/55 dark:bg-gray-900/75 backdrop-blur-[2px] z-0 transition-colors duration-500 pointer-events-none"></div>

        {/* ── Sidebar Container (Controls push effect) ── */}
        <div 
          className={`relative z-50 transition-all duration-300 ease-in-out shrink-0 h-full overflow-hidden
            ${isSidebarOpen ? 'w-72' : 'w-0'}
          `}
        >
          <aside className="w-72 flex flex-col h-full bg-white/80 dark:bg-gray-800/85 backdrop-blur-xl border-r border-gray-200/60 dark:border-gray-700/60 shadow-2xl lg:shadow-md">
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200/60 dark:border-gray-700/60 shrink-0">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">KidsManage</span>
              <button
                className="lg:hidden p-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav Items */}
            <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
              {visibleMenuItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium
                      transition-all duration-200 ease-out border-l-4
                      ${isActive
                        ? `${item.activeClasses} ${item.borderColor} shadow-sm scale-[1.02]`
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-200 hover:scale-[1.01]'
                      }
                      active:scale-[0.98]
                    `}
                  >
                    <item.icon size={20} className={`shrink-0 transition-colors duration-200 ${isActive ? item.iconColor : ''}`} />
                    <span className="truncate">{item.label}</span>
                    {isActive && <span className="ml-auto w-2 h-2 rounded-full bg-current opacity-60 animate-pulse"></span>}
                  </button>
                );
              })}
            </div>

            {/* User + Logout */}
            <div className="p-4 border-t border-gray-200/60 dark:border-gray-700/60 space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.role || 'Staff'}{user?.center?.name ? ` · ${user.center.name}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                  text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-900/20
                  hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-95 transition-all duration-150 shadow-sm"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </aside>
        </div>

        {/* ── Main Content ── */}
        <main className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300">
          {/* Header */}
          <header className={`
            h-16 bg-gradient-to-r ${headerTints[currentView]}
            backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50
            flex items-center justify-between px-4 lg:px-6 z-10 transition-all duration-500
          `}>
            {/* Left: Menu toggle + Active Tab Info */}
            <div className="flex items-center gap-3 w-1/3">
              <button
                className="text-gray-500 dark:text-gray-300 p-2 hover:bg-white/60 dark:hover:bg-gray-700 rounded-lg transition-colors"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <Menu size={24} />
              </button>
              
              <div className="hidden sm:flex items-center gap-2">
                {activeItem && (
                  <>
                    <activeItem.icon size={18} className={`${activeItem.iconColor}`} />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      {activeItem.label}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Middle: Global Search (Hidden on tiny screens) */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search families, children, or staff..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-full leading-5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 sm:text-sm transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center justify-end gap-1 sm:gap-2 w-1/3">
              {/* Quick Add Button */}
              {user?.role === 'ADMIN' && (
                <button className="hidden sm:flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm mr-2 active:scale-95">
                  <Plus size={16} /> <span className="hidden lg:inline">Quick Add</span>
                </button>
              )}

              <button className="hidden sm:block p-2 text-gray-500 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700 rounded-full transition-all active:scale-90">
                <HelpCircle size={20} />
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 text-gray-500 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700 rounded-full transition-all active:scale-90"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <NotificationDropdown onNavigate={setCurrentView} />

              {/* Profile Button */}
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="ml-2 w-9 h-9 rounded-full overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all active:scale-95 shadow-sm shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-sm font-bold"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'U'
                )}
              </button>
            </div>
          </header>

          {/* View content */}
          <div key={currentView} className="flex-1 overflow-auto p-4 lg:p-6 animate-tab-enter">
            {renderView()}
          </div>
        </main>
      </div>

      {isProfileModalOpen && (
        <ProfileModal 
          user={user} 
          onClose={() => setIsProfileModalOpen(false)} 
          onUpdate={setUser} 
        />
      )}
    </div>
  );
}
