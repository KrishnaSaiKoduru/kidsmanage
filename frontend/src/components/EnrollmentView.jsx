import { useState, useEffect } from 'react';
import React from 'react';
import { Users, UserPlus, CheckCircle2, ClipboardList, Clock, Check, X } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import Spinner from './ui/Spinner';

const inputCls = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all text-gray-800 dark:text-gray-200 placeholder-gray-400 text-sm";
const labelCls = "block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5";

const steps = [
  { label: 'Student Info', icon: Users },
  { label: 'Guardian Info', icon: UserPlus },
  { label: 'Review & Submit', icon: CheckCircle2 },
];

// Status badge helper
function StatusBadge({ status }) {
  const styles = {
    PENDING:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles[status] || styles.PENDING}`}>
      {status}
    </span>
  );
}

export default function EnrollmentView({ user }) {
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'new'
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const toast = useToast();

  // ── Fetch all applications on mount and when returning to applications tab
  const fetchApplications = () => {
    setLoadingApps(true);
    api.get('/enrollment/applications')
      .then(setApplications)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoadingApps(false));
  };

  useEffect(() => { fetchApplications(); }, []);

  // ── Approve application → creates Child record → all other tabs auto-reflect it
  const handleApprove = async (id, name) => {
    setApprovingId(id);
    try {
      await api.patch(`/enrollment/applications/${id}/approve`);
      toast.success(`${name} has been enrolled and will now appear in all tabs!`);
      fetchApplications(); // Refresh the list to reflect new status
    } catch (err) {
      toast.error(err.message);
    } finally {
      setApprovingId(null);
    }
  };

  const pendingCount = applications.filter((a) => a.status === 'PENDING').length;

  return (
    <div className="animate-fade-slide space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Student Enrollment</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage applications and enroll new students
          </p>
        </div>
        <button
          onClick={() => setActiveTab('new')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors active:scale-95"
        >
          <UserPlus size={16} /> New Application
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-gray-100/80 dark:bg-gray-700/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('applications')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'applications'
              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          <ClipboardList size={16} /> Applications
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'new'
              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          <UserPlus size={16} /> New Enrollment
        </button>
      </div>

      {/* ── Applications Tab ── */}
      {activeTab === 'applications' && (
        loadingApps ? <Spinner /> : (
          <div className="space-y-3">
            {applications.length === 0 ? (
              <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                <ClipboardList size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No applications yet</p>
                <p className="text-sm">Submitted applications will appear here for review.</p>
              </div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all p-5"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Child & Parent Info */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                        {app.childName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <h3 className="font-bold text-gray-800 dark:text-gray-100">{app.childName}</h3>
                          <StatusBadge status={app.status} />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Parent: <span className="font-medium text-gray-700 dark:text-gray-300">{app.parentName}</span>
                          {' · '}
                          <span className="text-blue-500">{app.parentEmail}</span>
                        </p>
                        {app.parentPhone && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{app.parentPhone}</p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-1">
                          <Clock size={11} />
                          Submitted {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Actions — Only admins can approve */}
                    {app.status === 'PENDING' && (
                      <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <button
                          onClick={() => handleApprove(app.id, app.childName)}
                          disabled={approvingId === app.id}
                          className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 active:scale-95 transition-all shadow-sm disabled:opacity-60"
                        >
                          <Check size={15} />
                          {approvingId === app.id ? 'Enrolling...' : 'Approve & Enroll'}
                        </button>
                      </div>
                    )}

                    {app.status === 'APPROVED' && (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-semibold shrink-0 ml-auto">
                        <CheckCircle2 size={16} /> Enrolled
                      </div>
                    )}
                  </div>

                  {app.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Notes:</span> {app.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )
      )}

      {/* ── New Enrollment Tab ── */}
      {activeTab === 'new' && (
        <EnrollmentForm onSuccess={() => { fetchApplications(); setActiveTab('applications'); }} />
      )}
    </div>
  );
}

// ── Enrollment Form (multi-step) ──────────────────────────────────────────────
function EnrollmentForm({ onSuccess }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: 'Male', room: '', startDate: '', allergies: '',
    parentName: '', parentEmail: '', parentPhone: '',
  });
  const toast = useToast();

  const update = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/enrollment/apply', {
        childName: `${formData.firstName} ${formData.lastName}`,
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
        parentPhone: formData.parentPhone || undefined,
        dateOfBirth: formData.dateOfBirth,
        notes: formData.allergies || undefined,
      });
      toast.success('Application submitted! Approve it from the Applications tab to enroll the student.');
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <button
              onClick={() => setStep(i)}
              className={`flex flex-col items-center gap-1.5 px-2 transition-all ${i <= step ? 'opacity-100' : 'opacity-40'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all shadow-sm
                ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
              >
                {i < step ? <CheckCircle2 size={18} /> : <s.icon size={18} />}
              </div>
              <span className={`text-[11px] font-bold whitespace-nowrap ${i === step ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-all ${i < step ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Form Card */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          {React.createElement(steps[step].icon, { size: 20, className: 'text-blue-600 dark:text-blue-400' })}
          <h3 className="font-bold text-gray-800 dark:text-gray-100">{steps[step].label}</h3>
          <span className="ml-auto text-xs text-gray-400">Step {step + 1} of {steps.length}</span>
        </div>
        <div className="p-6">
          {step === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>First Name</label>
                <input className={inputCls} placeholder="First name" value={formData.firstName} onChange={(e) => update('firstName', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input className={inputCls} placeholder="Last name" value={formData.lastName} onChange={(e) => update('lastName', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Date of Birth</label>
                <input type="date" className={inputCls} value={formData.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Room / Program</label>
                <select className={inputCls} value={formData.room} onChange={(e) => update('room', e.target.value)}>
                  <option value="">Select room...</option>
                  <option>Infant Room</option>
                  <option>Toddler Room A</option>
                  <option>Preschool B</option>
                  <option>Pre-K Room</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Allergies / Medical Notes</label>
                <textarea rows={3} className={inputCls + ' resize-none'} placeholder="List any known allergies or medical conditions..."
                  value={formData.allergies} onChange={(e) => update('allergies', e.target.value)} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-200 dark:border-gray-600 p-5">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-4 block">Parent / Guardian</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input className={inputCls} placeholder="Parent name" value={formData.parentName} onChange={(e) => update('parentName', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" className={inputCls} placeholder="parent@email.com" value={formData.parentEmail} onChange={(e) => update('parentEmail', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input type="tel" className={inputCls} placeholder="(555) 000-0000" value={formData.parentPhone} onChange={(e) => update('parentPhone', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-800 dark:text-gray-100">Ready to Submit</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                After submitting, you can <strong>Approve & Enroll</strong> the student from the Applications tab to make them visible across all tabs.
              </p>
              <div className="inline-flex flex-col gap-2 text-left bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-5 w-full max-w-xs mx-auto">
                {[
                  ['Student', `${formData.firstName} ${formData.lastName}`],
                  ['DOB', formData.dateOfBirth || 'Not set'],
                  ['Room', formData.room || 'Not selected'],
                  ['Parent', formData.parentName || 'Not provided'],
                  ['Email', formData.parentEmail || 'Not provided'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">{k}</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-4 pt-2">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-30 shadow-sm">
          Back
        </button>
        {step < steps.length - 1
          ? <button onClick={() => setStep(step + 1)}
              className="px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm active:scale-95 transition-all">
              Continue
            </button>
          : <button onClick={handleSubmit} disabled={submitting}
              className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md disabled:opacity-50 active:scale-95 transition-all">
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
        }
      </div>
    </div>
  );
}
