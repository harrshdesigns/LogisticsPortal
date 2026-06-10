import { useEffect, useState } from 'react';
import api from '../../services/api';

const PARTNERS = ['DELHIVERY', 'DP_WORLD', 'VRL', 'DTDC', 'MANUAL'];

const emptyForm = { loginId: '', apiKey: '', apiSecret: '', baseUrl: '' };

export default function AdminSettings() {
  const [credentials, setCredentials] = useState({});
  const [editing, setEditing] = useState(null); // partner name being edited
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [showSecrets, setShowSecrets] = useState({});

  useEffect(() => { loadCredentials(); }, []);

  function loadCredentials() {
    api.get('/admin/partner-credentials')
      .then(({ data }) => {
        const map = {};
        (data.data.credentials || []).forEach(c => { map[c.partner] = c; });
        setCredentials(map);
      })
      .catch(() => setMsg({ type: 'error', text: 'Failed to load credentials' }));
  }

  function startEdit(partner) {
    const existing = credentials[partner] || {};
    setForm({
      loginId: existing.loginId || '',
      apiKey: existing.apiKey || '',
      apiSecret: existing.apiSecret || '',
      baseUrl: existing.baseUrl || '',
    });
    setEditing(partner);
    setMsg({ type: '', text: '' });
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ ...emptyForm });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/partner-credentials/${editing}`, form);
      setMsg({ type: 'success', text: `${editing.replace('_', ' ')} credentials saved!` });
      loadCredentials();
      cancelEdit();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  const toggleSecret = partner => setShowSecrets(s => ({ ...s, [partner]: !s[partner] }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage delivery partner credentials. Login IDs are auto-filled in the booking form.</p>
      </div>

      {msg.text && (
        <div className={`p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-4">
        {PARTNERS.filter(p => p !== 'MANUAL').map(partner => {
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
                <button onClick={() => isEditing ? cancelEdit() : startEdit(partner)}
                  className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${isEditing ? 'text-gray-600 hover:bg-gray-100' : 'text-blue-600 hover:bg-blue-50'}`}>
                  {isEditing ? 'Cancel' : (hasData ? 'Edit' : 'Configure')}
                </button>
              </div>

              {isEditing && (
                <form onSubmit={handleSave} className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Login ID</label>
                      <input type="text" value={form.loginId} onChange={e => setForm(f => ({ ...f, loginId: e.target.value }))}
                        placeholder="Partner portal login" className="input-field" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                      <input type="url" value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
                        placeholder="https://api.partner.com" className="input-field" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                      <div className="relative">
                        <input type={showSecrets[partner] ? 'text' : 'password'} value={form.apiKey}
                          onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                          placeholder="API key" className="input-field pr-10" />
                        <button type="button" onClick={() => toggleSecret(partner)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                          {showSecrets[partner] ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
                      <div className="relative">
                        <input type={showSecrets[partner] ? 'text' : 'password'} value={form.apiSecret}
                          onChange={e => setForm(f => ({ ...f, apiSecret: e.target.value }))}
                          placeholder="API secret" className="input-field pr-10" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={saving}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm">
                      {saving ? 'Saving…' : 'Save Credentials'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Security Note</p>
        <p className="text-sm text-amber-700">Credentials are stored in the database and only accessible to Super Admins. API keys and secrets are never exposed to customers or in any public API response.</p>
      </div>
    </div>
  );
}
