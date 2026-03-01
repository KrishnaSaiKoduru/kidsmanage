import { useState, useEffect } from 'react';
import { Plus, DollarSign, Clock, AlertCircle, Send, CheckCircle2, X, CreditCard } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import Spinner from './ui/Spinner';
import EmptyState from './ui/EmptyState';

export default function BillingView({ user }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [children, setChildren] = useState([]);
  const [parents, setParents] = useState([]);
  const [taxRate, setTaxRate] = useState(0);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const toast = useToast();
  const isParent = user?.role === 'PARENT';
  const isAdmin = user?.role === 'ADMIN';

  const fetchInvoices = () => {
    api.get('/billing/invoices')
      .then(setInvoices)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoices();
    if (isAdmin) {
      api.get('/children').then(setChildren).catch(() => {});
      api.get('/center/parents').then(setParents).catch(() => {});
      api.get('/center').then((c) => setTaxRate(c.taxRate || 0)).catch(() => {});
    }
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    const fd = new FormData(e.target);
    try {
      await api.post('/billing/invoices', {
        childId: fd.get('childId') || undefined,
        parentId: fd.get('parentId') || undefined,
        amount: parseFloat(fd.get('amount')),
        dueDate: fd.get('dueDate'),
        lineItems: [{ description: fd.get('description'), amount: parseFloat(fd.get('amount')) }],
      });
      toast.success('Invoice created');
      setShowCreateModal(false);
      setInvoiceAmount('');
      fetchInvoices();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async (id) => {
    try {
      await api.post(`/billing/invoices/${id}/send`);
      toast.success('Invoice sent');
      fetchInvoices();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePay = async (id) => {
    try {
      const { url } = await api.post('/billing/stripe/checkout', { invoiceId: id });
      if (url) window.location.href = url;
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Spinner />;

  const collected = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.total, 0);
  const pending = invoices.filter((i) => i.status === 'SENT' || i.status === 'DRAFT').reduce((s, i) => s + i.total, 0);
  const overdue = invoices.filter((i) => i.status === 'OVERDUE').reduce((s, i) => s + i.total, 0);

  const filtered = statusFilter === 'all' ? invoices : invoices.filter((i) => i.status === statusFilter.toUpperCase());

  const statusPill = (status) => {
    const map = {
      PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
    };
    return map[status] || map.DRAFT;
  };

  const inputCls = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200 text-sm";

  return (
    <div className="animate-fade-slide space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{isParent ? 'My Invoices' : 'Billing & Invoicing'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{isParent ? 'View and pay your invoices' : 'Manage invoices and track payments'}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm">
            <Plus size={16} /> Create Invoice
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Collected', value: collected, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Pending', value: pending, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Overdue', value: overdue, icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}><s.icon size={24} /></div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>${s.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {['all', 'draft', 'sent', 'paid', 'overdue'].map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${statusFilter === f ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Invoice table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={DollarSign} title="No invoices" description="Create your first invoice to get started" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                  <th className="p-4 font-semibold">Invoice</th>
                  <th className="p-4 font-semibold">Parent</th>
                  <th className="p-4 font-semibold">Child</th>
                  <th className="p-4 font-semibold">Due Date</th>
                  <th className="p-4 font-semibold">Amount</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="p-4 font-medium text-gray-800 dark:text-gray-200 text-sm">{inv.id.slice(0, 12)}...</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 text-sm">{inv.parent?.name || '-'}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 text-sm">{inv.child ? `${inv.child.firstName} ${inv.child.lastName}` : '-'}</td>
                    <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="p-4 font-bold text-gray-800 dark:text-gray-200">${inv.total.toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusPill(inv.status)}`}>{inv.status}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {isAdmin && inv.status === 'DRAFT' && (
                          <button onClick={() => handleSend(inv.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Send">
                            <Send size={16} />
                          </button>
                        )}
                        {(inv.status === 'SENT' || inv.status === 'OVERDUE') && (
                          <button onClick={() => handlePay(inv.id)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors" title="Pay">
                            <CreditCard size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Create Invoice</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Parent</label>
                  <select name="parentId" className={inputCls}>
                    <option value="">-- Select Parent --</option>
                    {parents.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Child</label>
                  <select name="childId" className={inputCls}>
                    <option value="">-- Select Child --</option>
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Description</label>
                <input name="description" required className={inputCls} placeholder="e.g. February Tuition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Amount ($)</label>
                <input name="amount" type="number" step="0.01" required className={inputCls} placeholder="0.00" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} />
              </div>
              {taxRate > 0 && invoiceAmount && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-sm space-y-1">
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span>${parseFloat(invoiceAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Tax ({taxRate}%)</span>
                    <span>${(parseFloat(invoiceAmount) * taxRate / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-800 dark:text-gray-200 border-t border-gray-200 dark:border-gray-600 pt-1">
                    <span>Total</span>
                    <span>${(parseFloat(invoiceAmount) + parseFloat(invoiceAmount) * taxRate / 100).toFixed(2)}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Due Date</label>
                <input name="dueDate" type="date" required className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-3 font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 px-4 py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
