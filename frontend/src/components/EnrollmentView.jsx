import { useState } from 'react';
import React from 'react';
import { Users, UserPlus, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

const inputCls = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all text-gray-800 dark:text-gray-200 placeholder-gray-400 text-sm";
const labelCls = "block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5";

const steps = [
  { label: 'Student Info', icon: Users },
  { label: 'Guardian Info', icon: UserPlus },
  { label: 'Review & Submit', icon: CheckCircle2 },
];

export default function EnrollmentView() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
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
      toast.success('Enrollment application submitted!');
      setSuccess(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ firstName: '', lastName: '', dateOfBirth: '', gender: 'Male', room: '', startDate: '', allergies: '', parentName: '', parentEmail: '', parentPhone: '' });
    setStep(0);
    setSuccess(false);
  };

  if (success) {
    return (
      <div className="animate-fade-slide max-w-lg mx-auto text-center py-16 space-y-4">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
          <CheckCircle2 size={40} className="text-white" />
        </div>
        <h3 className="text-2xl font-extrabold text-gray-800 dark:text-gray-100">Application Submitted!</h3>
        <p className="text-gray-500 dark:text-gray-400">The enrollment application for <strong>{formData.firstName} {formData.lastName}</strong> has been submitted and is pending review.</p>
        <button onClick={resetForm} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-sm transition-colors">
          Enroll Another Student
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-slide max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Student Enrollment</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Complete all steps to enroll a new student</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <button onClick={() => setStep(i)}
              className={`flex flex-col items-center gap-1.5 px-2 transition-all ${i <= step ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all shadow-sm
                ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                {i < step ? <CheckCircle2 size={18} /> : <s.icon size={18} />}
              </div>
              <span className={`text-[11px] font-bold whitespace-nowrap ${i === step ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-all ${i < step ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          {React.createElement(steps[step].icon, { size: 20, className: 'text-blue-600 dark:text-blue-400' })}
          <h3 className="font-bold text-gray-800 dark:text-gray-100">{steps[step].label}</h3>
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">Step {step + 1} of {steps.length}</span>
        </div>
        <div className="p-6">
          {/* Step 0: Student Info */}
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

          {/* Step 1: Guardian Info */}
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

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-800 dark:text-gray-100">Ready to Submit</h3>
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
              className="px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm">
              Continue
            </button>
          : <button onClick={handleSubmit} disabled={submitting}
              className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Complete Enrollment'}
            </button>
        }
      </div>
    </div>
  );
}
