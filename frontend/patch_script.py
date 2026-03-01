import os

file_path = 'src/Portal.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Icons
content = content.replace(
    "CreditCard, Download, Send, AlertCircle\n} from 'lucide-react';",
    "CreditCard, Download, Send, AlertCircle, Moon, Sun\n} from 'lucide-react';"
)

# 2. Attendance Toggle
old_state = """  const [students, setStudents] = useState([
    { id: 1, name: 'Emma Johnson', room: 'Toddler Room A', status: 'Present', timeIn: '08:15 AM' },
    { id: 2, name: 'Noah Williams', room: 'Preschool B', status: 'Absent', timeIn: '-' },
    { id: 3, name: 'Olivia Brown', room: 'Infant Room', status: 'Late', timeIn: '09:30 AM' },
  ]);

  const chartData ="""
new_state = """  const [students, setStudents] = useState([
    { id: 1, name: 'Emma Johnson', room: 'Toddler Room A', status: 'Present', timeIn: '08:15 AM' },
    { id: 2, name: 'Noah Williams', room: 'Preschool B', status: 'Absent', timeIn: '-' },
    { id: 3, name: 'Olivia Brown', room: 'Infant Room', status: 'Late', timeIn: '09:30 AM' },
  ]);

  const toggleStatus = (id) => {
    setStudents(students.map(s => {
      if (s.id === id) {
        const nextStatus = s.status === 'Present' ? 'Absent' : s.status === 'Absent' ? 'Late' : 'Present';
        return { ...s, status: nextStatus, timeIn: nextStatus === 'Present' || nextStatus === 'Late' ? new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-' };
      }
      return s;
    }));
  };

  const chartData ="""
content = content.replace(old_state, new_state)

# 3. Roster Table Button
old_td = """                <td className="p-4 text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1
                    ${student.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 
                      student.status === 'Absent' ? 'bg-red-100 text-red-700' : 
                      'bg-amber-100 text-amber-700'}`}>
                    {student.status}
                  </span>
                </td>"""
new_td = """                <td className="p-4 flex items-center justify-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center justify-center w-20
                    ${student.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 
                      student.status === 'Absent' ? 'bg-red-100 text-red-700' : 
                      'bg-amber-100 text-amber-700'}`}>
                    {student.status}
                  </span>
                  <button onClick={() => toggleStatus(student.id)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-700">Toggle</button>
                </td>"""
content = content.replace(old_td, new_td)

# 4. State
old_portal_state = """export default function Portal({ onLogout }) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);"""
new_portal_state = """export default function Portal({ onLogout }) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);"""
content = content.replace(old_portal_state, new_portal_state)

# 5. Layout
old_layout = """  return (
    <div className="flex h-screen bg-gray-50/50 font-sans overflow-hidden">
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 shadow-sm transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-50 shrink-0">
          <span className="text-2xl font-bold text-blue-600 tracking-tight">KidsManage</span>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => { setCurrentView(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${currentView === item.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 z-10">
          <button className="lg:hidden text-gray-500" onClick={() => setIsMobileMenuOpen(true)}><Menu size={24} /></button>
          <div className="ml-auto flex items-center gap-4">
            <button className="text-gray-500"><Bell size={22} /></button>
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">JD</div>
          </div>
        </header>"""

new_layout = """  return (
    <div className={`${isDarkMode ? 'dark' : ''}`}>
      <div 
        className="flex h-screen font-sans overflow-hidden bg-cover bg-center transition-colors duration-300 text-gray-800 dark:text-gray-100"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=2000&auto=format&fit=crop')" }}
      >
        <div className="absolute inset-0 bg-white/85 dark:bg-gray-900/90 backdrop-blur-sm z-0 transition-colors duration-300"></div>
        
        <aside className={`relative z-50 fixed lg:static inset-y-0 left-0 w-72 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-r border-gray-100 dark:border-gray-700 shadow-sm transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-700 shrink-0">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">KidsManage</span>
          </div>
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => { setCurrentView(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${currentView === item.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                <item.icon size={20} /> {item.label}
              </button>
            ))}
          </div>
        </aside>

        <main className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-6 z-10">
            <button className="lg:hidden text-gray-500 dark:text-gray-300" onClick={() => setIsMobileMenuOpen(true)}><Menu size={24} /></button>
            <div className="ml-auto flex items-center gap-4">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button className="text-gray-500 dark:text-gray-300"><Bell size={22} /></button>
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">JD</div>
            </div>
          </header>"""

content = content.replace(old_layout, new_layout)

# 6. Fix closing tags
content = content.replace(
    """        <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
          {renderView()}
        </div>
      </main>
    </div>
  );""",
    """        <div className="flex-1 overflow-auto p-6">
          {renderView()}
        </div>
      </main>
    </div>
    </div>
  );"""
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched Portal.jsx successfully!")
