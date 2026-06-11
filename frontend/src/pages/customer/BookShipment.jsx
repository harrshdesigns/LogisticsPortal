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
  { code: '+91', label: '+91' }, { code: '+1', label: '+1' },
  { code: '+44', label: '+44' }, { code: '+61', label: '+61' },
  { code: '+971', label: '+971' }, { code: '+65', label: '+65' },
  { code: '+60', label: '+60' }, { code: '+66', label: '+66' },
  { code: '+49', label: '+49' }, { code: '+33', label: '+33' },
];

const emptyParty = {
  id: '', name: '', pin: '', addressLine1: '', addressLine2: '',
  city: '', state: '', contactPerson: '', countryCode: '+91', phone: '', email: '',
};

const emptyRow = {
  description: '', reference: '',
  packages: '', packagesType: 'BAGS',
  unitWeight: '', dimensionL: '', dimensionW: '', dimensionH: '', dimensionUnit: 'CMS',
};

export default function BookShipment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addresses, setAddresses] = useState([]);

  const [consignor, setConsignor] = useState({ ...emptyParty });
  const [consignee, setConsignee] = useState({ ...emptyParty });
  const [packageRows, setPackageRows] = useState([{ ...emptyRow }]);

  const [form, setForm] = useState({
    // Invoice box
    invoiceValue: '', ewayBillNo: '', hsnCode: '',
    invoiceDate: '', invoiceNo: '', codAmount: '', quantity: '',
    // Service
    serviceType: 'SURFACE',
    appointmentDelivery: false, carrierRisk: false,
    mallDelivery: false, ownersRisk: false,
    // Payment
    paymentType: 'PREPAID',
    billToParty: '',
    // Docket
    docketDate: new Date().toISOString().split('T')[0],
    docketTime: '12:00',
    docketAmPm: 'PM',
    // Checkboxes
    materialHold: false,
    waitingPermit: false,
    // COD
    codPayeeName: '',
    // Notes
    notes: '',
  });

  useEffect(() => {
    api.get('/addresses').then(r => setAddresses(r.data.data.addresses || [])).catch(() => {});
  }, []);

  const setF = (name, value) => setForm(prev => ({ ...prev, [name]: value }));
  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    setF(name, type === 'checkbox' ? checked : value);
  };

  const handleServiceOption = e => {
    const { name, checked } = e.target;
    if (name === 'carrierRisk' && checked) {
      setForm(prev => ({ ...prev, carrierRisk: true, ownersRisk: false }));
    } else if (name === 'ownersRisk' && checked) {
      setForm(prev => ({ ...prev, ownersRisk: true, carrierRisk: false }));
    } else {
      setF(name, checked);
    }
  };

  const handleParty = (setter) => (e) => {
    const { name, value } = e.target;
    setter(prev => ({ ...prev, [name]: value }));
  };

  const fillParty = (setter, addr) => {
    setter({
      id: addr.id,
      name: addr.companyName || addr.contactName || '',
      pin: addr.pincode || '',
      addressLine1: addr.addressLine1 || '',
      addressLine2: addr.addressLine2 || '',
      city: addr.city || '',
      state: addr.state || '',
      contactPerson: addr.contactName || '',
      countryCode: addr.countryCode || '+91',
      phone: addr.phone || '',
      email: addr.email || '',
    });
  };

  const addRow = () => setPackageRows(prev => [...prev, { ...emptyRow }]);
  const removeRow = idx => setPackageRows(prev => prev.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) =>
    setPackageRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const handleSubmit = async () => {
    if (!consignor.name.trim()) { setError('Consignor name is required'); return; }
    if (!consignor.phone.trim()) { setError('Consignor phone is required'); return; }
    if (!consignee.name.trim()) { setError('Consignee name is required'); return; }
    if (!consignee.phone.trim()) { setError('Consignee phone is required'); return; }
    setError('');
    setLoading(true);
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

      const { docketTime, docketAmPm, ...rest } = form;
      const res = await api.post('/orders', {
        ...rest,
        docketDate,
        consignorName: consignor.name,
        consignorPin: consignor.pin,
        consignorAddressLine1: consignor.addressLine1,
        consignorAddressLine2: consignor.addressLine2,
        consignorCity: consignor.city,
        consignorState: consignor.state,
        consignorContactPerson: consignor.contactPerson,
        consignorCountryCode: consignor.countryCode,
        consignorPhone: consignor.phone,
        consignorEmail: consignor.email,
        consigneeName: consignee.name,
        consigneePin: consignee.pin,
        consigneeAddressLine1: consignee.addressLine1,
        consigneeAddressLine2: consignee.addressLine2,
        consigneeCity: consignee.city,
        consigneeState: consignee.state,
        consigneeContactPerson: consignee.contactPerson,
        consigneeCountryCode: consignee.countryCode,
        consigneePhone: consignee.phone,
        consigneeEmail: consignee.email,
        items: packageRows.filter(r => r.description || r.packages),
      });
      navigate(`/orders/${res.data.data.order.clientDocketNo}`);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const lbl = 'block text-sm font-medium text-gray-700 mb-1';
  const sectionTitle = 'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3';

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-10">
      <div>
        <Link to="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Book Shipment</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
      )}

      {/* ── Section 1: Invoice & Commercial Details (Box) ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-l-4 border-l-blue-400">
        <p className={sectionTitle}>Invoice &amp; Commercial Details</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={lbl}>a. Invoice Value (₹)</label>
            <input type="number" name="invoiceValue" value={form.invoiceValue} onChange={handleFormChange}
              placeholder="0.00" step="0.01" min="0" className="input-field text-sm" />
          </div>
          <div>
            <label className={lbl}>b. E-Way Bill No.</label>
            <input type="text" name="ewayBillNo" value={form.ewayBillNo} onChange={handleFormChange}
              placeholder="12-digit" className="input-field text-sm" />
          </div>
          <div>
            <label className={lbl}>c. HSN Code</label>
            <input type="text" name="hsnCode" value={form.hsnCode} onChange={handleFormChange}
              placeholder="e.g. 6203" className="input-field text-sm" />
          </div>
          <div>
            <label className={lbl}>d. Invoice Date</label>
            <input type="date" name="invoiceDate" value={form.invoiceDate} onChange={handleFormChange}
              className="input-field text-sm" />
          </div>
          <div>
            <label className={lbl}>e. Invoice No.</label>
            <input type="text" name="invoiceNo" value={form.invoiceNo} onChange={handleFormChange}
              placeholder="INV-001" className="input-field text-sm" />
          </div>
          <div>
            <label className={lbl}>f. COD Amount (₹)</label>
            <input type="number" name="codAmount" value={form.codAmount} onChange={handleFormChange}
              placeholder="0.00" step="0.01" min="0" className="input-field text-sm" />
          </div>
          <div>
            <label className={lbl}>g. Quantity</label>
            <input type="number" name="quantity" value={form.quantity} onChange={handleFormChange}
              placeholder="0" min="1" className="input-field text-sm" />
          </div>
        </div>
      </div>

      {/* ── Section 2: Consignor + Consignee side by side ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Consignor */}
        <PartyPanel
          title="Consignor (Sender)"
          party={consignor}
          setPart={setConsignor}
          handleChange={handleParty(setConsignor)}
          addresses={addresses}
          onSelect={addr => fillParty(setConsignor, addr)}
          lbl={lbl}
        />
        {/* Consignee */}
        <PartyPanel
          title="Consignee (Receiver)"
          party={consignee}
          setPart={setConsignee}
          handleChange={handleParty(setConsignee)}
          addresses={addresses}
          onSelect={addr => fillParty(setConsignee, addr)}
          lbl={lbl}
        />
      </div>

      {/* ── Section 3: Service + Checkboxes ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div>
          <label className={lbl}>Service *</label>
          <select name="serviceType" value={form.serviceType} onChange={handleFormChange}
            className="input-field text-sm sm:w-48">
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
            <label key={opt.name} className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
              <input type="checkbox" name={opt.name} checked={!!form[opt.name]} onChange={handleServiceOption}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              {opt.label}
              {(opt.name === 'carrierRisk' || opt.name === 'ownersRisk') && (
                <span className="text-xs text-gray-400">(exclusive)</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* ── Section 4: Package Details (multi-row box) ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-l-4 border-l-green-400">
        <div className="flex items-center justify-between mb-4">
          <p className={sectionTitle + ' mb-0'}>Package Details</p>
          <button type="button" onClick={addRow}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
            + Add Row
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[680px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['a. Description', 'b. Reference', 'c. Packages', 'd. Unit Weight', 'e. Dimensions (L × W × H)', ''].map(h => (
                  <th key={h} className="text-left text-gray-400 font-medium pb-2 pr-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packageRows.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="py-2 pr-2">
                    <input type="text" value={row.description} onChange={e => updateRow(idx, 'description', e.target.value)}
                      placeholder="Contents" className="input-field text-xs" />
                  </td>
                  <td className="py-2 pr-2">
                    <input type="text" value={row.reference} onChange={e => updateRow(idx, 'reference', e.target.value)}
                      placeholder="Ref #" className="input-field text-xs" />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex gap-1">
                      <input type="number" value={row.packages} onChange={e => updateRow(idx, 'packages', e.target.value)}
                        placeholder="Qty" min="1" className="input-field text-xs" style={{minWidth:'3.5rem',width:'3.5rem'}} />
                      <select value={row.packagesType} onChange={e => updateRow(idx, 'packagesType', e.target.value)}
                        className="input-field text-xs" style={{minWidth:'5rem'}}>
                        <option value="BAGS">Bags</option>
                        <option value="PACKETS">Packets</option>
                      </select>
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex gap-1 items-center">
                      <input type="number" value={row.unitWeight} onChange={e => updateRow(idx, 'unitWeight', e.target.value)}
                        placeholder="0.00" step="0.01" className="input-field text-xs" style={{minWidth:'4rem',width:'4rem'}} />
                      <span className="text-gray-400 shrink-0">Kgs</span>
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex gap-1 items-center">
                      <input type="number" value={row.dimensionL} onChange={e => updateRow(idx, 'dimensionL', e.target.value)}
                        placeholder="L" step="0.1" className="input-field text-xs" style={{minWidth:'3.5rem',width:'3.5rem'}} />
                      <span className="text-gray-300">×</span>
                      <input type="number" value={row.dimensionW} onChange={e => updateRow(idx, 'dimensionW', e.target.value)}
                        placeholder="W" step="0.1" className="input-field text-xs" style={{minWidth:'3.5rem',width:'3.5rem'}} />
                      <span className="text-gray-300">×</span>
                      <input type="number" value={row.dimensionH} onChange={e => updateRow(idx, 'dimensionH', e.target.value)}
                        placeholder="H" step="0.1" className="input-field text-xs" style={{minWidth:'3.5rem',width:'3.5rem'}} />
                      <select value={row.dimensionUnit} onChange={e => updateRow(idx, 'dimensionUnit', e.target.value)}
                        className="input-field text-xs" style={{minWidth:'4rem'}}>
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

      {/* ── Section 5: Payment Mode ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <p className={sectionTitle}>Payment Mode</p>
        <div className="space-y-2.5">
          {[
            { value: 'PREPAID', label: 'a. Prepaid' },
            { value: 'TO_PAY', label: 'b. To Pay' },
            { value: 'TO_BILL', label: 'c. To Bill' },
          ].map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-gray-700">
              <input type="radio" name="paymentType" value={opt.value} checked={form.paymentType === opt.value}
                onChange={handleFormChange} className="text-blue-600 w-4 h-4" />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Section 6: Bill To Party ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <label className={lbl}>Bill To Party</label>
        <input type="text" name="billToParty" value={form.billToParty} onChange={handleFormChange}
          placeholder="Party name" className="input-field text-sm sm:w-64" />
      </div>

      {/* ── Section 7: Docket Date ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <label className={lbl}>Docket Date</label>
        <div className="flex gap-2 items-center flex-wrap">
          <input type="date" name="docketDate" value={form.docketDate} onChange={handleFormChange}
            className="input-field text-sm w-auto" />
          <input type="time" name="docketTime" value={form.docketTime} onChange={handleFormChange}
            className="input-field text-sm w-28" />
          <select name="docketAmPm" value={form.docketAmPm} onChange={handleFormChange}
            className="input-field text-sm w-16">
            <option>AM</option>
            <option>PM</option>
          </select>
        </div>
      </div>

      {/* ── Section 8: Material Hold + Waiting for Permits ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
        <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-gray-700">
          <input type="checkbox" name="materialHold" checked={form.materialHold} onChange={handleFormChange}
            className="w-4 h-4 rounded border-gray-300 text-blue-600" />
          a. Material Hold
        </label>
        <div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-gray-700">
            <input type="checkbox" name="waitingPermit" checked={form.waitingPermit} onChange={handleFormChange}
              className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            b. Waiting for Permits
          </label>
          <p className="text-xs text-gray-400 mt-1 ml-7">Permit depend on exit and entry states</p>
        </div>
      </div>

      {/* ── Section 9: COD Payee Name (greyed out) ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          COD Payee Name <span className="font-normal">(when COD is selected)</span>
        </label>
        <input type="text" name="codPayeeName" value={form.codPayeeName} disabled
          placeholder="COD payee name"
          className="input-field text-sm opacity-40 cursor-not-allowed bg-gray-50 sm:w-64" />
      </div>

      {/* ── Section 10: Notes ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <label className={lbl}>Notes</label>
        <textarea name="notes" value={form.notes} onChange={handleFormChange}
          placeholder="Special handling or delivery instructions…"
          rows={3} className="input-field text-sm resize-y" />
      </div>

      {/* ── Submit ── */}
      <div className="flex justify-end">
        <button type="button" onClick={handleSubmit} disabled={loading}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm">
          {loading ? 'Submitting…' : 'Submit Order'}
        </button>
      </div>
    </div>
  );
}

function PartyPanel({ title, party, handleChange, addresses, onSelect, lbl }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-2.5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</p>

      <div>
        <label className={lbl}>Select from Address Book</label>
        <select
          value={party.id}
          onChange={e => {
            const addr = addresses.find(a => a.id === e.target.value);
            if (addr) onSelect(addr);
          }}
          className="input-field text-sm"
        >
          <option value="">— Select or fill manually —</option>
          {addresses.map(a => (
            <option key={a.id} value={a.id}>{a.label}{a.city ? ` — ${a.city}` : ''}</option>
          ))}
        </select>
      </div>

      <hr className="border-gray-100" />

      {[
        { label: title.split(' ')[0], field: 'name', placeholder: 'Name or company' },
        { label: 'Pin', field: 'pin', placeholder: 'PIN code', maxLen: 6 },
        { label: 'Line 1', field: 'addressLine1', placeholder: 'Street, building' },
        { label: 'Line 2', field: 'addressLine2', placeholder: 'Landmark (optional)' },
        { label: 'City', field: 'city', placeholder: 'City' },
      ].map(({ label, field, placeholder, maxLen }) => (
        <div key={field}>
          <label className={lbl}>{label}</label>
          <input type="text" name={field} value={party[field]} onChange={handleChange}
            placeholder={placeholder} maxLength={maxLen} className="input-field text-sm" />
        </div>
      ))}

      <div>
        <label className={lbl}>State</label>
        <select name="state" value={party.state} onChange={handleChange} className="input-field text-sm">
          <option value="">Select state</option>
          {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className={lbl}>Contact</label>
        <input type="text" name="contactPerson" value={party.contactPerson} onChange={handleChange}
          placeholder="Contact person" className="input-field text-sm" />
      </div>

      <div>
        <label className={lbl}>Phone</label>
        <div className="flex gap-1.5">
          <select name="countryCode" value={party.countryCode} onChange={handleChange}
            className="input-field text-sm w-20 shrink-0">
            {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <input type="tel" name="phone" value={party.phone} onChange={handleChange}
            placeholder="Phone number" className="input-field text-sm flex-1" />
        </div>
      </div>

      <div>
        <label className={lbl}>Email</label>
        <input type="email" name="email" value={party.email} onChange={handleChange}
          placeholder="email@example.com" className="input-field text-sm" />
      </div>
    </div>
  );
}
