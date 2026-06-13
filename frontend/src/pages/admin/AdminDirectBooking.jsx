import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

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
  { code: '+91', label: '+91' },{ code: '+1', label: '+1' },
  { code: '+44', label: '+44' },{ code: '+61', label: '+61' },
  { code: '+971', label: '+971' },{ code: '+65', label: '+65' },
  { code: '+60', label: '+60' },{ code: '+66', label: '+66' },
  { code: '+49', label: '+49' },{ code: '+33', label: '+33' },
];

const PARTNER_OPTIONS = [
  { value: 'DELHIVERY', label: 'DELHIVERY LIMITED' },
  { value: 'DP_WORLD', label: 'DP WORLD EXPRESS LOGISTICS PRIVATE LIMITED' },
  { value: 'VRL', label: 'VRL LOGISTICS LIMITED' },
  { value: 'DTDC', label: 'DTDC EXPRESS LIMITED' },
];

const emptyRow = {
  description: '', reference: '',
  packages: '', packagesType: 'BAGS',
  unitWeight: '', dimensionL: '', dimensionW: '', dimensionH: '', dimensionUnit: 'CMS',
};


export default function AdminDirectBooking() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedConsignors, setSavedConsignors] = useState([]);
  const [savedConsignees, setSavedConsignees] = useState([]);
  const [credentials, setCredentials] = useState({});
  const [ratesData, setRatesData] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesMsg, setRatesMsg] = useState({ type: '', text: '' });

  const [form, setForm] = useState(() => ({
    // Top section
    consignmentType: 'OUTBOUND',
    requestedBy: '',
    primaryServiceProvider: 'DP_WORLD',

    // Invoice box (a–g)
    invoiceValue: '',
    ewayBillNo: '',
    hsnCode: '',
    invoiceDate: '',
    invoiceNo: '',
    codAmount: '',
    quantity: '',

    // Partner's pre-allocated docket number
    partnerDocketNo: '',

    // Consignor
    consignorId: '',
    consignorName: '',
    consignorPin: '',
    consignorAddressLine1: '',
    consignorAddressLine2: '',
    consignorCity: '',
    consignorState: '',
    consignorContactPerson: '',
    consignorCountryCode: '+91',
    consignorPhone: '',
    consignorEmail: '',

    // Consignee
    consigneeId: '',
    consigneeName: '',
    consigneePin: '',
    consigneeAddressLine1: '',
    consigneeAddressLine2: '',
    consigneeCity: '',
    consigneeState: '',
    consigneeContactPerson: '',
    consigneeCountryCode: '+91',
    consigneePhone: '',
    consigneeEmail: '',

    // Service
    serviceType: 'SURFACE',
    appointmentDelivery: false,
    carrierRisk: false,
    mallDelivery: false,
    ownersRisk: false,

    // Weight
    actualWeight: '',

    // Package box handled separately via packageRows state

    // Pickup Options
    pickupOption: 'PICKUP_FROM_CONSIGNOR',

    // Payment Mode
    paymentType: 'PREPAID',

    // Bill To Party
    billToParty: '',

    // Docket Date
    docketDate: new Date().toISOString().split('T')[0],
    docketTime: '12:00',
    docketAmPm: 'PM',

    // Checkboxes
    materialHold: false,
    waitingPermit: false,

    // Bottom row
    promoCode: '',
    codPayeeName: '',
    deliveryCode: '',

    // Notes
    notes: '',
  }));

  const [packageRows, setPackageRows] = useState([{ ...emptyRow }]);

  // Load saved data
  useEffect(() => {
    api.get('/admin/saved-consignors').then(r => setSavedConsignors(r.data.data.consignors || [])).catch(() => {});
    api.get('/admin/saved-consignees').then(r => setSavedConsignees(r.data.data.consignees || [])).catch(() => {});
    api.get('/admin/partner-credentials').then(({ data }) => {
      const map = {};
      (data.data.credentials || []).forEach(c => { map[c.partner] = c; });
      setCredentials(map);
    }).catch(() => {});
  }, []);

  // Auto-fill requestedBy when partner changes
  useEffect(() => {
    const cred = credentials[form.primaryServiceProvider];
    setForm(prev => ({ ...prev, requestedBy: cred?.loginId || '' }));
  }, [form.primaryServiceProvider, credentials]);

  const set = (name, value) => setForm(prev => ({ ...prev, [name]: value }));
  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    set(name, type === 'checkbox' ? checked : value);
  };

  // Carrier Risk / Owner's Risk are mutually exclusive
  const handleServiceOption = e => {
    const { name, checked } = e.target;
    if (name === 'carrierRisk' && checked) {
      setForm(prev => ({ ...prev, carrierRisk: true, ownersRisk: false }));
    } else if (name === 'ownersRisk' && checked) {
      setForm(prev => ({ ...prev, ownersRisk: true, carrierRisk: false }));
    } else {
      set(name, checked);
    }
  };

  const fillConsignor = id => {
    const c = savedConsignors.find(x => x.id === id);
    if (!c) return;
    setForm(prev => ({
      ...prev, consignorId: id,
      consignorName: c.name || '', consignorPin: c.pin || '',
      consignorAddressLine1: c.addressLine1 || '', consignorAddressLine2: c.addressLine2 || '',
      consignorCity: c.city || '', consignorState: c.state || '',
      consignorContactPerson: c.contactPerson || '',
      consignorCountryCode: c.countryCode || '+91',
      consignorPhone: c.phone || '', consignorEmail: c.email || '',
    }));
  };

  const fillConsignee = id => {
    const c = savedConsignees.find(x => x.id === id);
    if (!c) return;
    setForm(prev => ({
      ...prev, consigneeId: id,
      consigneeName: c.name || '', consigneePin: c.pin || '',
      consigneeAddressLine1: c.addressLine1 || '', consigneeAddressLine2: c.addressLine2 || '',
      consigneeCity: c.city || '', consigneeState: c.state || '',
      consigneeContactPerson: c.contactPerson || '',
      consigneeCountryCode: c.countryCode || '+91',
      consigneePhone: c.phone || '', consigneeEmail: c.email || '',
    }));
  };

  const addRow = () => setPackageRows(prev => [...prev, { ...emptyRow }]);
  const removeRow = idx => setPackageRows(prev => prev.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) =>
    setPackageRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const handleCheckRates = async () => {
    setRatesLoading(true); setRatesData(null); setRatesMsg({ type: '', text: '' });
    try {
      let docketDate = null;
      if (form.docketDate) {
        const [h, m] = (form.docketTime || '12:00').split(':').map(Number);
        let hours = h;
        if (form.docketAmPm === 'PM' && hours < 12) hours += 12;
        if (form.docketAmPm === 'AM' && hours === 12) hours = 0;
        const d = new Date(form.docketDate);
        d.setHours(hours, m, 0, 0);
        docketDate = d.toISOString();
      }
      const { consignorId, consigneeId, docketTime, docketAmPm, ...rest } = form;
      const { data } = await api.post('/admin/bookings/check-rates', {
        ...rest,
        partnerName: form.primaryServiceProvider,
        docketDate,
        items: packageRows.filter(r => r.description || r.packages),
      });
      setRatesData(data.data.rates);
    } catch (e) {
      const raw = e.response?.data?.data;
      setRatesMsg({
        type: 'error',
        text: e.response?.data?.message || 'Failed to fetch rates',
        raw: raw ? JSON.stringify(raw, null, 2) : null,
      });
    } finally { setRatesLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.consignorName.trim()) { setError('Consignor name is required'); return; }
    if (!form.consigneeName.trim()) { setError('Consignee name is required'); return; }
    if (!form.serviceType) { setError('Service type is required'); return; }
    if (!form.partnerDocketNo.trim()) { setError('Consignment # (partner docket) is required'); return; }
    setError('');
    setLoading(true);
    try {
      // Combine docket date + time
      let docketDate = null;
      if (form.docketDate) {
        const [h, m] = (form.docketTime || '12:00').split(':').map(Number);
        let hours = h;
        if (form.docketAmPm === 'PM' && hours < 12) hours += 12;
        if (form.docketAmPm === 'AM' && hours === 12) hours = 0;
        const d = new Date(form.docketDate);
        d.setHours(hours, m, 0, 0);
        docketDate = d.toISOString();
      }

      const { consignorId, consigneeId, docketTime, docketAmPm, ...rest } = form;
      const res = await api.post('/admin/bookings/direct', {
        ...rest,
        docketDate,
        items: packageRows.filter(r => r.description || r.packages),
      });
      navigate(`/admin/orders/${res.data.data.order.id}`);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Shared field label style
  const lbl = 'block text-xs font-medium text-zinc-500 mb-1';
  const sectionTitle = 'text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3';

  return (
    <div className="max-w-5xl space-y-4 pb-10">
      {/* Header */}
      <div>
        <Link to="/admin/orders" className="text-sm text-zinc-500 hover:text-zinc-700">← Orders</Link>
        <h1 className="text-xl font-bold text-zinc-900 mt-0.5">New Direct Booking</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
      )}

      {/* ── Section 1: Consignment Type / Requested By / Primary Service Provider ── */}
      <div className="card p-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Consignment Type *</label>
            <select name="consignmentType" value={form.consignmentType} onChange={handleChange} className="input text-sm">
              <option value="OUTBOUND">OUTBOUND</option>
              <option value="INBOUND">INBOUND</option>
              <option value="RETURN">RETURN</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Requested By</label>
            <input type="text" name="requestedBy" value={form.requestedBy} onChange={handleChange}
              placeholder="Auto-fetched from partner settings" className="input text-sm" />
          </div>
          <div>
            <label className={lbl}>Primary Service Provider</label>
            <select name="primaryServiceProvider" value={form.primaryServiceProvider} onChange={handleChange} className="input text-sm">
              {PARTNER_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Section 2: Invoice & Commercial Details (Box) ── */}
      <div className="card p-5 border-l-4 border-l-blue-400">
        <p className={sectionTitle}>Invoice &amp; Commercial Details</p>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className={lbl}>a. Invoice Value (₹)</label>
            <input type="number" name="invoiceValue" value={form.invoiceValue} onChange={handleChange}
              placeholder="0.00" step="0.01" min="0" className="input text-sm" />
          </div>
          <div>
            <label className={lbl}>b. E-Way Bill No.</label>
            <input type="text" name="ewayBillNo" value={form.ewayBillNo} onChange={handleChange}
              placeholder="12-digit" className="input text-sm" />
          </div>
          <div>
            <label className={lbl}>c. HSN Code</label>
            <input type="text" name="hsnCode" value={form.hsnCode} onChange={handleChange}
              placeholder="e.g. 6203" className="input text-sm" />
          </div>
          <div>
            <label className={lbl}>d. Invoice Date</label>
            <input type="date" name="invoiceDate" value={form.invoiceDate} onChange={handleChange} className="input text-sm" />
          </div>
          <div>
            <label className={lbl}>e. Invoice No.</label>
            <input type="text" name="invoiceNo" value={form.invoiceNo} onChange={handleChange}
              placeholder="INV-001" className="input text-sm" />
          </div>
          <div>
            <label className={lbl}>f. COD Amount (₹)</label>
            <input type="number" name="codAmount" value={form.codAmount} onChange={handleChange}
              placeholder="0.00" step="0.01" min="0" className="input text-sm" />
          </div>
          <div>
            <label className={lbl}>g. Quantity</label>
            <input type="number" name="quantity" value={form.quantity} onChange={handleChange}
              placeholder="0" min="1" className="input text-sm" />
          </div>
        </div>
      </div>

      {/* ── Section 3: Consignment # (partner docket) ── */}
      <div className="card p-5">
        <label className={lbl}>Consignment # *</label>
        <input type="text" name="partnerDocketNo" value={form.partnerDocketNo} onChange={handleChange}
          placeholder="Partner-issued docket number" className="input font-mono text-sm sm:w-64" required />
        <p className="text-xs text-zinc-400 mt-1">Enter the docket number issued by the delivery partner. An app tracking number is auto-generated separately for the customer.</p>
      </div>

      {/* ── Section 4: Consignor + Consignee (side by side) ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Consignor */}
        <div className="card p-5 space-y-2.5">
          <p className={sectionTitle}>Consignor (Sender)</p>
          <div>
            <label className={lbl}>Select Saved Consignor</label>
            <select value={form.consignorId} onChange={e => fillConsignor(e.target.value)} className="input text-sm">
              <option value="">— Select or fill manually —</option>
              {savedConsignors.map(c => <option key={c.id} value={c.id}>{c.name}{c.city ? ` — ${c.city}` : ''}</option>)}
            </select>
          </div>
          <hr className="border-zinc-100" />
          {[
            { label: 'Consignor', field: 'consignorName', placeholder: 'Name or company' },
            { label: 'Pin', field: 'consignorPin', placeholder: 'PIN code', maxLen: 6 },
            { label: 'Line 1', field: 'consignorAddressLine1', placeholder: 'Street, building' },
            { label: 'Line 2', field: 'consignorAddressLine2', placeholder: 'Landmark (optional)' },
            { label: 'City', field: 'consignorCity', placeholder: 'City' },
          ].map(({ label, field, placeholder, maxLen }) => (
            <div key={field}>
              <label className={lbl}>{label}</label>
              <input type="text" name={field} value={form[field]} onChange={handleChange}
                placeholder={placeholder} maxLength={maxLen} className="input text-sm" />
            </div>
          ))}
          <div>
            <label className={lbl}>State</label>
            <select name="consignorState" value={form.consignorState} onChange={handleChange} className="input text-sm">
              <option value="">Select state</option>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Contact</label>
            <input type="text" name="consignorContactPerson" value={form.consignorContactPerson} onChange={handleChange}
              placeholder="Contact person" className="input text-sm" />
          </div>
          <div>
            <label className={lbl}>Phone</label>
            <div className="flex gap-1.5">
              <select name="consignorCountryCode" value={form.consignorCountryCode} onChange={handleChange} className="input text-sm w-20 shrink-0">
                {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
              <input type="tel" name="consignorPhone" value={form.consignorPhone} onChange={handleChange}
                placeholder="Phone number" className="input text-sm flex-1" />
            </div>
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input type="email" name="consignorEmail" value={form.consignorEmail} onChange={handleChange}
              placeholder="email@example.com" className="input text-sm" />
          </div>
        </div>

        {/* Consignee */}
        <div className="card p-5 space-y-2.5">
          <p className={sectionTitle}>Consignee (Receiver)</p>
          <div>
            <label className={lbl}>Select Saved Consignee</label>
            <select value={form.consigneeId} onChange={e => fillConsignee(e.target.value)} className="input text-sm">
              <option value="">— Select or fill manually —</option>
              {savedConsignees.map(c => <option key={c.id} value={c.id}>{c.name}{c.city ? ` — ${c.city}` : ''}</option>)}
            </select>
          </div>
          <hr className="border-zinc-100" />
          {[
            { label: 'Consignee', field: 'consigneeName', placeholder: 'Name or company' },
            { label: 'Pin', field: 'consigneePin', placeholder: 'PIN code', maxLen: 6 },
            { label: 'Line 1', field: 'consigneeAddressLine1', placeholder: 'Street, building' },
            { label: 'Line 2', field: 'consigneeAddressLine2', placeholder: 'Landmark (optional)' },
            { label: 'City', field: 'consigneeCity', placeholder: 'City' },
          ].map(({ label, field, placeholder, maxLen }) => (
            <div key={field}>
              <label className={lbl}>{label}</label>
              <input type="text" name={field} value={form[field]} onChange={handleChange}
                placeholder={placeholder} maxLength={maxLen} className="input text-sm" />
            </div>
          ))}
          <div>
            <label className={lbl}>State</label>
            <select name="consigneeState" value={form.consigneeState} onChange={handleChange} className="input text-sm">
              <option value="">Select state</option>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Contact</label>
            <input type="text" name="consigneeContactPerson" value={form.consigneeContactPerson} onChange={handleChange}
              placeholder="Contact person" className="input text-sm" />
          </div>
          <div>
            <label className={lbl}>Phone</label>
            <div className="flex gap-1.5">
              <select name="consigneeCountryCode" value={form.consigneeCountryCode} onChange={handleChange} className="input text-sm w-20 shrink-0">
                {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
              <input type="tel" name="consigneePhone" value={form.consigneePhone} onChange={handleChange}
                placeholder="Phone number" className="input text-sm flex-1" />
            </div>
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input type="email" name="consigneeEmail" value={form.consigneeEmail} onChange={handleChange}
              placeholder="email@example.com" className="input text-sm" />
          </div>
        </div>
      </div>

      {/* ── Section 5: Service + Checkboxes ── */}
      <div className="card p-5 space-y-4">
        <div>
          <label className={lbl}>Service *</label>
          <select name="serviceType" value={form.serviceType} onChange={handleChange} className="input text-sm sm:w-48">
            <option value="SURFACE">SURFACE</option>
            <option value="AIR">AIR</option>
            <option value="WATER">WATER</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { name: 'appointmentDelivery', label: 'a. Appointment Delivery' },
            { name: 'carrierRisk', label: 'b. Carrier Risk' },
            { name: 'mallDelivery', label: 'c. Mall Delivery' },
            { name: 'ownersRisk', label: "d. Owner's Risk" },
          ].map(opt => (
            <label key={opt.name} className="flex items-center gap-2 cursor-pointer select-none text-sm text-zinc-700">
              <input type="checkbox" name={opt.name} checked={!!form[opt.name]} onChange={handleServiceOption}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              {opt.label}
              {(opt.name === 'carrierRisk' || opt.name === 'ownersRisk') && (
                <span className="text-xs text-zinc-400 font-normal">(exclusive)</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* ── Section 6: Actual Weight ── */}
      <div className="card p-5">
        <label className={lbl}>Actual Weight</label>
        <div className="flex gap-2 items-center">
          <input type="number" name="actualWeight" value={form.actualWeight} onChange={handleChange}
            placeholder="0.00" step="0.01" min="0" className="input text-sm sm:w-36" />
          <select disabled className="input text-sm w-20 opacity-60 cursor-not-allowed">
            <option>Kgs</option>
          </select>
        </div>
      </div>

      {/* ── Section 7: Package Details (multi-row box) ── */}
      <div className="card p-5 border-l-4 border-l-green-400">
        <div className="flex items-center justify-between mb-4">
          <p className={sectionTitle + ' mb-0'}>Package Details</p>
          <button type="button" onClick={addRow}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
            + Add Row
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-zinc-100">
                {['a. Description', 'b. Reference', 'c. Packages', 'd. Unit Weight', 'e. Dimensions (L × W × H)', ''].map(h => (
                  <th key={h} className="text-left text-zinc-400 font-medium pb-2 pr-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packageRows.map((row, idx) => (
                <tr key={idx} className="border-b border-zinc-50">
                  <td className="py-2 pr-2">
                    <input type="text" value={row.description} onChange={e => updateRow(idx, 'description', e.target.value)}
                      placeholder="Contents" className="input text-xs" />
                  </td>
                  <td className="py-2 pr-2">
                    <input type="text" value={row.reference} onChange={e => updateRow(idx, 'reference', e.target.value)}
                      placeholder="Ref #" className="input text-xs" />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex gap-1">
                      <input type="number" value={row.packages} onChange={e => updateRow(idx, 'packages', e.target.value)}
                        placeholder="Qty" min="1" className="input text-xs w-14" style={{minWidth:'3.5rem'}} />
                      <select value={row.packagesType} onChange={e => updateRow(idx, 'packagesType', e.target.value)}
                        className="input text-xs" style={{minWidth:'5rem'}}>
                        <option value="BAGS">Bags</option>
                        <option value="PACKETS">Packets</option>
                      </select>
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex gap-1 items-center">
                      <input type="number" value={row.unitWeight} onChange={e => updateRow(idx, 'unitWeight', e.target.value)}
                        placeholder="0.00" step="0.01" min="0" className="input text-xs w-16" style={{minWidth:'4rem'}} />
                      <span className="text-zinc-400 shrink-0">Kgs</span>
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex gap-1 items-center">
                      <input type="number" value={row.dimensionL} onChange={e => updateRow(idx, 'dimensionL', e.target.value)}
                        placeholder="L" step="0.1" className="input text-xs w-14" style={{minWidth:'3.5rem'}} />
                      <span className="text-zinc-300">×</span>
                      <input type="number" value={row.dimensionW} onChange={e => updateRow(idx, 'dimensionW', e.target.value)}
                        placeholder="W" step="0.1" className="input text-xs w-14" style={{minWidth:'3.5rem'}} />
                      <span className="text-zinc-300">×</span>
                      <input type="number" value={row.dimensionH} onChange={e => updateRow(idx, 'dimensionH', e.target.value)}
                        placeholder="H" step="0.1" className="input text-xs w-14" style={{minWidth:'3.5rem'}} />
                      <select value={row.dimensionUnit} onChange={e => updateRow(idx, 'dimensionUnit', e.target.value)}
                        className="input text-xs" style={{minWidth:'4rem'}}>
                        <option value="CMS">cms</option>
                        <option value="INCHES">in</option>
                      </select>
                    </div>
                  </td>
                  <td className="py-2 text-center">
                    {packageRows.length > 1 && (
                      <button type="button" onClick={() => removeRow(idx)}
                        className="text-red-400 hover:text-red-600 text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-red-50">
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 8: Pickup Options ── */}
      <div className="card p-5">
        <p className={sectionTitle}>Pickup Options</p>
        <div className="space-y-2.5">
          {[
            { value: 'PICKUP_FROM_CONSIGNOR', label: 'a. Pickup from consignor location' },
            { value: 'DROP_AT_BRANCH', label: 'b. Drop off at a pickup branch' },
          ].map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-zinc-700">
              <input type="radio" name="pickupOption" value={opt.value} checked={form.pickupOption === opt.value}
                onChange={handleChange} className="text-blue-600 w-4 h-4" />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Section 9: Payment Mode ── */}
      <div className="card p-5">
        <p className={sectionTitle}>Payment Mode</p>
        <div className="space-y-2.5">
          {[
            { value: 'PREPAID', label: 'a. Prepaid' },
            { value: 'TO_PAY', label: 'b. To Pay' },
            { value: 'TO_BILL', label: 'c. To Bill' },
          ].map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-zinc-700">
              <input type="radio" name="paymentType" value={opt.value} checked={form.paymentType === opt.value}
                onChange={handleChange} className="text-blue-600 w-4 h-4" />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Section 10: Bill To Party ── */}
      <div className="card p-5">
        <label className={lbl}>Bill To Party</label>
        <input type="text" name="billToParty" value={form.billToParty} onChange={handleChange}
          placeholder="Party name" className="input text-sm sm:w-64" />
      </div>

      {/* ── Section 11: Docket Date ── */}
      <div className="card p-5">
        <label className={lbl}>Docket Date</label>
        <div className="flex gap-2 items-center flex-wrap">
          <input type="date" name="docketDate" value={form.docketDate} onChange={handleChange} className="input text-sm w-auto" />
          <input type="time" name="docketTime" value={form.docketTime} onChange={handleChange} className="input text-sm w-28" />
          <select name="docketAmPm" value={form.docketAmPm} onChange={handleChange} className="input text-sm w-16">
            <option>AM</option>
            <option>PM</option>
          </select>
        </div>
      </div>

      {/* ── Section 12: Material Hold + Waiting for Permits ── */}
      <div className="card p-5 space-y-3">
        <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-zinc-700">
          <input type="checkbox" name="materialHold" checked={form.materialHold} onChange={handleChange}
            className="w-4 h-4 rounded border-gray-300 text-blue-600" />
          a. Material Hold
        </label>
        <div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-zinc-700">
            <input type="checkbox" name="waitingPermit" checked={form.waitingPermit} onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            b. Waiting for Permits
          </label>
          <p className="text-xs text-zinc-400 mt-1 ml-6.5">Permit depend on exit and entry states</p>
        </div>
      </div>

      {/* ── Section 13: Promo Code / COD Payee Name / Delivery Code ── */}
      <div className="card p-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Promo Code</label>
            <input type="text" name="promoCode" value={form.promoCode} onChange={handleChange}
              placeholder="Enter promo code" className="input text-sm" />
          </div>
          <div>
            <label className={lbl + ' text-zinc-300'}>COD Payee Name <span className="font-normal normal-case">(when COD selected)</span></label>
            <input type="text" name="codPayeeName" value={form.codPayeeName} disabled
              placeholder="COD payee name" className="input text-sm opacity-40 cursor-not-allowed bg-zinc-50" />
          </div>
          <div>
            <label className={lbl}>Delivery Code</label>
            <input type="text" name="deliveryCode" value={form.deliveryCode} onChange={handleChange}
              placeholder="OTP / delivery code" className="input text-sm" />
          </div>
        </div>
      </div>

      {/* ── Section 14: Notes ── */}
      <div className="card p-5">
        <label className={lbl}>Notes</label>
        <textarea name="notes" value={form.notes} onChange={handleChange}
          placeholder="Special instructions or handling notes…"
          rows={3} className="input text-sm resize-y" />
      </div>

      {/* ── Rates display ── */}
      {ratesMsg.text && (
        <div className={`rounded-lg text-sm ${ratesMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          <p className="p-3 font-medium">{ratesMsg.text}</p>
          {ratesMsg.raw && (
            <pre className="px-3 pb-3 text-xs font-mono whitespace-pre-wrap break-all border-t border-red-200 text-red-800">{ratesMsg.raw}</pre>
          )}
        </div>
      )}

      {ratesData && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
          <p className="px-4 pt-3 pb-2 text-xs font-semibold text-blue-700 flex items-center gap-2 flex-wrap">
            <span>{ratesData.partner?.replace(/_/g, ' ')} — checked at {new Date(ratesData.checkedAt).toLocaleTimeString('en-IN')}</span>
            {ratesData.draftId && (
              <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-blue-800">Draft #{ratesData.draftId}</span>
            )}
          </p>
          {(ratesData.deliveryBranch || ratesData.serviceOption) && (
            <div className="px-4 pb-4 grid grid-cols-2 gap-3">
              {ratesData.deliveryBranch && (
                <div className="bg-white rounded-lg border border-blue-200 px-3 py-2">
                  <p className="text-xs text-blue-500 font-medium mb-0.5">Delivery Branch</p>
                  <p className="text-sm font-semibold text-zinc-800">{ratesData.deliveryBranch}</p>
                </div>
              )}
              {ratesData.serviceOption && (
                <div className="bg-white rounded-lg border border-blue-200 px-3 py-2">
                  <p className="text-xs text-blue-500 font-medium mb-0.5">Service Lane</p>
                  <p className="text-sm font-semibold text-zinc-800">{ratesData.serviceOption}</p>
                </div>
              )}
              <p className="col-span-2 text-xs text-blue-600">DP World API confirms route only — pricing is billed separately per contract.</p>
            </div>
          )}
          {ratesData.options && (
            <div className="space-y-2 px-4 pb-4">
              {ratesData.options.map(opt => (
                <div key={opt.service} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-zinc-800">{opt.service}</span>
                    <span className="text-zinc-500 ml-2 text-xs">{opt.estimatedDays} days</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-zinc-900">₹{opt.total.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-zinc-400 ml-1">(incl. GST)</span>
                  </div>
                </div>
              ))}
              {ratesData.note && <p className="text-xs text-zinc-400 mt-1">{ratesData.note}</p>}
            </div>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={handleCheckRates} disabled={ratesLoading}
          className="px-6 py-3 border-2 border-blue-500 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 disabled:opacity-60 transition-colors text-sm">
          {ratesLoading ? 'Checking…' : 'Check Rates'}
        </button>
        <button type="button" onClick={handleSubmit} disabled={loading}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm">
          {loading ? 'Creating Booking…' : 'Create Booking'}
        </button>
      </div>
    </div>
  );
}
