import { useEffect, useState } from 'react';
import api from '../../services/api';

const PARTNERS = ['DELHIVERY', 'DP_WORLD', 'VRL', 'DTDC'];

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry',
];
const COUNTRY_CODES = [
  { code: '+91', label: '+91 India' },{ code: '+1', label: '+1 USA/Canada' },
  { code: '+44', label: '+44 UK' },{ code: '+61', label: '+61 Australia' },
  { code: '+971', label: '+971 UAE' },{ code: '+65', label: '+65 Singapore' },
  { code: '+60', label: '+60 Malaysia' },{ code: '+66', label: '+66 Thailand' },
];

const emptyPartyForm = { name: '', pin: '', addressLine1: '', addressLine2: '', city: '', state: '', contactPerson: '', countryCode: '+91', phone: '', email: '' };

// ─── Partners Tab ─────────────────────────────────────────────────────────────
function PartnersTab() {
  const [credentials, setCredentials] = useState({});
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ loginId: '', apiKey: '', apiSecret: '', baseUrl: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [showSecrets, setShowSecrets] = useState({});

  useEffect(() => { load(); }, []);

  function load() {
    api.get('/admin/partner-credentials')
      .then(({ data }) => {
        const map = {};
        (data.data.credentials || []).forEach(c => { map[c.partner] = c; });
        setCredentials(map);
      }).catch(() => setMsg({ type: 'error', text: 'Failed to load credentials' }));
  }

  function startEdit(partner) {
    const ex = credentials[partner] || {};
    setForm({ loginId: ex.loginId || '', apiKey: ex.apiKey || '', apiSecret: ex.apiSecret || '', baseUrl: ex.baseUrl || '' });
    setEditing(partner);
    setMsg({ type: '', text: '' });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/partner-credentials/${editing}`, form);
      setMsg({ type: 'success', text: `${editing.replace('_', ' ')} credentials saved!` });
      load();
      setEditing(null);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed' });
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      {msg.text && (
        <div className={`p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}
      {PARTNERS.map(partner => {
        const cred = credentials[partner];
        const isEditing = editing === partner;
        const hasData = cred?.loginId || cred?.apiKey;
        return (
          <div key={partner} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${hasData ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div>
                  <p className="font-semibold text-gray-900">{partner.replace('_', ' ')}</p>
                  {cred?.loginId && <p className="text-xs text-gray-500 font-mono">{cred.loginId}</p>}
                  {!hasData && <p className="text-xs text-gray-400">No credentials configured</p>}
                </div>
              </div>
              <button onClick={() => isEditing ? setEditing(null) : startEdit(partner)}
                className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${isEditing ? 'text-gray-600 hover:bg-gray-100' : 'text-blue-600 hover:bg-blue-50'}`}>
                {isEditing ? 'Cancel' : (hasData ? 'Edit' : 'Configure')}
              </button>
            </div>
            {isEditing && (
              <form onSubmit={handleSave} className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Login ID</label>
                    <input type="text" value={form.loginId} onChange={e => setForm(f => ({ ...f, loginId: e.target.value }))} placeholder="Partner portal login" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                    <input type="url" value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} placeholder="https://api.partner.com" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                    <div className="relative">
                      <input type={showSecrets[partner] ? 'text' : 'password'} value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="API key" className="input-field pr-10" />
                      <button type="button" onClick={() => setShowSecrets(s => ({ ...s, [partner]: !s[partner] }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                        {showSecrets[partner] ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
                    <input type={showSecrets[partner] ? 'text' : 'password'} value={form.apiSecret} onChange={e => setForm(f => ({ ...f, apiSecret: e.target.value }))} placeholder="API secret" className="input-field pr-10" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm">
                    {saving ? 'Saving…' : 'Save Credentials'}
                  </button>
                </div>
              </form>
            )}
          </div>
        );
      })}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">Security Note</p>
        <p className="text-sm text-amber-700">Credentials are stored securely and only accessible to Super Admins. API keys are never exposed to customers.</p>
      </div>
    </div>
  );
}

// ─── Consignors / Consignees Tab (reusable) ──────────────────────────────────
function PartyTab({ type }) {
  const endpoint = type === 'consignor' ? '/admin/saved-consignors' : '/admin/saved-consignees';
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, 'new' = new form, id = edit
  const [form, setForm] = useState({ ...emptyPartyForm });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    api.get(endpoint)
      .then(({ data }) => setList(data.data[type === 'consignor' ? 'consignors' : 'consignees'] || []))
      .catch(() => setMsg({ type: 'error', text: 'Failed to load' }))
      .finally(() => setLoading(false));
  }

  function startNew() {
    setForm({ ...emptyPartyForm });
    setEditing('new');
    setMsg({ type: '', text: '' });
  }

  function startEdit(item) {
    setForm({
      name: item.name || '', pin: item.pin || '',
      addressLine1: item.addressLine1 || '', addressLine2: item.addressLine2 || '',
      city: item.city || '', state: item.state || '',
      contactPerson: item.contactPerson || '',
      countryCode: item.countryCode || '+91',
      phone: item.phone || '', email: item.email || '',
    });
    setEditing(item.id);
    setMsg({ type: '', text: '' });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { setMsg({ type: 'error', text: 'Name is required' }); return; }
    setSaving(true);
    try {
      if (editing === 'new') {
        await api.post(endpoint, form);
        setMsg({ type: 'success', text: `${type === 'consignor' ? 'Consignor' : 'Consignee'} added!` });
      } else {
        await api.put(`${endpoint}/${editing}`, form);
        setMsg({ type: 'success', text: 'Updated successfully!' });
      }
      load();
      setEditing(null);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed' });
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await api.delete(`${endpoint}/${id}`);
      load();
    } catch { setMsg({ type: 'error', text: 'Delete failed' }); }
  }

  const title = type === 'consignor' ? 'Consignor' : 'Consignee';

  return (
    <div className="space-y-4">
      {msg.text && (
        <div className={`p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={startNew} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          + Add {title}
        </button>
      </div>

      {/* Add / Edit form */}
      {editing !== null && (
        <div className="card p-5 border-t-4 border-t-blue-500">
          <h3 className="text-sm font-semibold text-zinc-700 mb-4">{editing === 'new' ? `New ${title}` : `Edit ${title}`}</h3>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-600 mb-1">{title} Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name or company" className="input text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">PIN Code</label>
                <input type="text" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} placeholder="6-digit PIN" maxLength={6} className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">City</label>
                <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" className="input text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-600 mb-1">Address Line 1</label>
                <input type="text" value={form.addressLine1} onChange={e => setForm(f => ({ ...f, addressLine1: e.target.value }))} placeholder="Street, building" className="input text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-600 mb-1">Address Line 2</label>
                <input type="text" value={form.addressLine2} onChange={e => setForm(f => ({ ...f, addressLine2: e.target.value }))} placeholder="Landmark (optional)" className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">State</label>
                <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className="input text-sm">
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Contact Person</label>
                <input type="text" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Authorized person" className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Phone</label>
                <div className="flex gap-2">
                  <select value={form.countryCode} onChange={e => setForm(f => ({ ...f, countryCode: e.target.value }))} className="input w-28 text-sm shrink-0">
                    {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" className="input flex-1 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="input text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-zinc-400 py-4 text-center">Loading…</p>
      ) : list.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-zinc-400">No saved {title.toLowerCase()}s yet.</p>
          <p className="text-xs text-zinc-400 mt-1">Add one above — it will appear in the booking form dropdown.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(item => (
            <div key={item.id} className="card p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-sm text-zinc-900">{item.name}</p>
                {item.contactPerson && <p className="text-xs text-zinc-500 mt-0.5">Attn: {item.contactPerson}</p>}
                {item.phone && <p className="text-xs text-zinc-500">{item.countryCode} {item.phone}</p>}
                <p className="text-xs text-zinc-400 mt-0.5">
                  {[item.addressLine1, item.city, item.state, item.pin].filter(Boolean).join(', ')}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(item)} className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="text-xs text-red-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function AdminSettings() {
  const [tab, setTab] = useState('partners');

  const tabs = [
    { id: 'partners', label: 'Partners' },
    { id: 'consignors', label: 'Consignors' },
    { id: 'consignees', label: 'Consignees' },
  ];

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage partners, saved consignors, and consignees.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-zinc-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'partners' && <PartnersTab />}
      {tab === 'consignors' && <PartyTab type="consignor" />}
      {tab === 'consignees' && <PartyTab type="consignee" />}
    </div>
  );
}
