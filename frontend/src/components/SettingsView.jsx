import { useState, useEffect } from 'react';
import { Building2, Users, User, Save, Plus, UserX, Shield, Copy, Key } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import Spinner from './ui/Spinner';
import EmptyState from './ui/EmptyState';

const TABS = [
  { id: 'center', label: 'Center Info', icon: Building2 },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'account', label: 'My Account', icon: User },
];

export default function SettingsView({ user }) {
  const [tab, setTab] = useState('center');
  const toast = useToast();

  return (
    <div className="animate-fade-slide space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your center, staff, and account</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex-1 justify-center ${tab === t.id ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'center' && <CenterTab user={user} />}
      {tab === 'staff' && <StaffTab />}
      {tab === 'account' && <AccountTab user={user} />}
    </div>
  );
}

function CenterTab({ user }) {
  const [center, setCenter] = useState(null);
  const [joinCode, setJoinCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      api.get('/center'),
      api.get('/center/join-code'),
    ])
      .then(([centerData, joinCodeData]) => {
        setCenter(centerData);
        setJoinCode(joinCodeData.joinCode);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.patch('/center', {
        name: center.name,
        address: center.address,
        phone: center.phone,
        email: center.email,
        licenseNumber: center.licenseNumber,
        capacity: parseInt(center.capacity) || 0,
      });
      setCenter(updated);
      toast.success('Center info updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  const inputCls = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-200 text-sm";
  const labelCls = "block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5";

  const copyJoinCode = () => {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      toast.success('Join code copied to clipboard');
    }
  };

  return (
    <div className="space-y-6">
      {/* Join Code Card */}
      {joinCode && (
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-md p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-xl"><Key size={20} /></div>
            <div>
              <h3 className="font-bold text-lg">Center Join Code</h3>
              <p className="text-sm opacity-80">Share this code with parents and caretakers to join your center</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-3xl font-mono font-extrabold tracking-[0.3em] bg-white/20 px-6 py-3 rounded-xl">{joinCode}</span>
            <button onClick={copyJoinCode} className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors" title="Copy code">
              <Copy size={20} />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Center Name</label>
            <input className={inputCls} value={center?.name || ''} onChange={(e) => setCenter({ ...center, name: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} value={center?.email || ''} onChange={(e) => setCenter({ ...center, email: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input className={inputCls} value={center?.phone || ''} onChange={(e) => setCenter({ ...center, phone: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>License Number</label>
            <input className={inputCls} value={center?.licenseNumber || ''} onChange={(e) => setCenter({ ...center, licenseNumber: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Address</label>
            <input className={inputCls} value={center?.address || ''} onChange={(e) => setCenter({ ...center, address: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Capacity</label>
            <input type="number" className={inputCls} value={center?.capacity || 0} onChange={(e) => setCenter({ ...center, capacity: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-sm disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function StaffTab() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const toast = useToast();

  const fetchStaff = () => {
    api.get('/center/staff')
      .then(setStaff)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    const fd = new FormData(e.target);
    try {
      await api.post('/auth/invite', {
        email: fd.get('email'),
        name: fd.get('name'),
        role: fd.get('role'),
      });
      toast.success('Invitation sent');
      setShowInvite(false);
      fetchStaff();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await api.delete(`/center/staff/${id}`);
      toast.success('Staff member deactivated');
      fetchStaff();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Spinner />;

  const roleBadge = (role) => {
    const map = {
      ADMIN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      CARETAKER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      PARENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    };
    return map[role] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const inputCls = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-200 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Staff Members ({staff.length})</h3>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm">
          <Plus size={16} /> Invite Staff
        </button>
      </div>

      {staff.length === 0 ? (
        <EmptyState icon={Users} title="No staff members" description="Invite your first team member" />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700/50">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {s.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{s.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.email}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${roleBadge(s.role)}`}>{s.role}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>{s.status}</span>
              {s.status === 'ACTIVE' && (
                <button onClick={() => handleDeactivate(s.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Deactivate">
                  <UserX size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-5">Invite Staff Member</h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Name</label>
                <input name="name" required className={inputCls} placeholder="Full name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Email</label>
                <input name="email" type="email" required className={inputCls} placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Role</label>
                <select name="role" className={inputCls}>
                  <option value="CARETAKER">Caretaker</option>
                  <option value="ADMIN">Admin</option>
                  <option value="PARENT">Parent</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="flex-1 px-4 py-3 font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>
                <button type="submit" disabled={inviting} className="flex-1 px-4 py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm disabled:opacity-50">
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountTab({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/auth/me')
      .then(setProfile)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/auth/me', {
        name: profile.name,
        phone: profile.phone,
      });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  const inputCls = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-200 text-sm";
  const labelCls = "block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5";

  return (
    <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl">
          {profile?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'U'}
        </div>
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{profile?.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.email}</p>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{profile?.role}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelCls}>Full Name</label>
          <input className={inputCls} value={profile?.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} value={profile?.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input value={profile?.email || ''} disabled className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed" />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-sm disabled:opacity-50">
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
