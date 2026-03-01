import { useState } from 'react';
import {
  LayoutDashboard, CalendarCheck, FileText, MessageSquare,
  UserPlus, Activity, Settings as SettingsIcon, Bell, Menu, X, LogOut,
  Sun, Moon,
} from 'lucide-react';

import DashboardView from './components/DashboardView';
import AttendanceView from './components/AttendanceView';
import BillingView from './components/BillingView';
import EnrollmentView from './components/EnrollmentView';
import ActivitiesView from './components/ActivitiesView';
import MessagesView from './components/MessagesView';
import SettingsView from './components/SettingsView';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'CARETAKER', 'PARENT'] },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck, roles: ['ADMIN', 'CARETAKER', 'PARENT'] },
  { id: 'billing', label: 'Billing', icon: FileText, roles: ['ADMIN', 'PARENT'] },
  { id: 'messages', label: 'Messages', icon: MessageSquare, roles: ['ADMIN', 'CARETAKER', 'PARENT'] },
  { id: 'enrollment', label: 'Enrollment', icon: UserPlus, roles: ['ADMIN'] },
  { id: 'activities', label: 'Daily Activities', icon: Activity, roles: ['ADMIN', 'CARETAKER', 'PARENT'] },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: ['ADMIN'] },
];

export default function Portal({ onLogout, user }) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const visibleMenuItems = menuItems.filter((item) => item.roles.includes(user?.role));

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView user={user} />;
      case 'attendance': return <AttendanceView user={user} />;
      case 'billing': return <BillingView user={user} />;
      case 'enrollment': return <EnrollmentView user={user} />;
      case 'activities': return <ActivitiesView user={user} />;
      case 'messages': return <MessagesView user={user} />;
      case 'settings': return <SettingsView user={user} />;
      default: return <DashboardView user={user} />;
    }
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'U';

  return (
    <div className={`${isDarkMode ? 'dark' : ''}`}>
      <div
        className="flex h-screen font-sans overflow-hidden bg-cover bg-center transition-colors duration-300 text-gray-800 dark:text-gray-100"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=2000&auto=format&fit=crop')" }}
      >
        <div className="absolute inset-0 bg-white/85 dark:bg-gray-900/90 backdrop-blur-sm z-0 transition-colors duration-300"></div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 flex flex-col bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-r border-gray-100 dark:border-gray-700 shadow-xl lg:shadow-sm transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-gray-700 shrink-0">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">KidsManage</span>
            <button className="lg:hidden p-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            {visibleMenuItems.map((item) => (
              <button key={item.id} onClick={() => { setCurrentView(item.id); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${currentView === item.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                <item.icon size={20} /> {item.label}
              </button>
            ))}
          </div>

          {/* User info + Logout */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.role || 'Staff'} {user?.center?.name ? `· ${user.center.name}` : ''}</p>
              </div>
            </div>
            <button onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-6 z-10">
            <button className="lg:hidden text-gray-500 dark:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="ml-auto flex items-center gap-4">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button className="relative text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors">
                <Bell size={22} />
              </button>
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">{initials}</div>
            </div>
          </header>

          {/* View content */}
          <div className="flex-1 overflow-auto p-6">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}
