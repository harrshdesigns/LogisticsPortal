import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

const SERVICE_TYPES = ['SURFACE', 'AIR', 'WATER', 'EXPRESS'];
const PAYMENT_TYPES = [
  { value: 'PREPAID', label: 'Prepaid' },
  { value: 'TO_PAY', label: 'To Pay' },
  { value: 'TO_BILL', label: 'To Bill' },
  { value: 'COD', label: 'COD' },
];
const PACKAGE_TYPES = ['PACKAGES', 'BOXES', 'BAGS'];

const emptyAddr = {
  name: '', pin: '', addressLine1: '', addressLine2: '',
  city: '', state: '', contactPerson: '', phone: '', email: '',
};

export default function AdminDirectBooking() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [consignor, setConsignor] = useState({ ...emptyAddr });
  const [consignee, setConsignee] = useState({ ...emptyAddr });
  const [shipment, setShipment] = useState({
    serviceType: 'SURFACE', paymentType: 'PREPAID', codPayeeName: '',
    appointmentDelivery: false, carrierRisk: false, ownersRisk: false, mallDelivery: false,
    actualWeight: '', itemDescription: '', packages: '', packagesType: 'BAGS',
    unitWeight: '', dimensionL: '', dimensionW: '', dimensionH: '', dimensionUnit: 'CMS',
    notes: '',
  });

  const STEPS = ['Consignor', 'Consignee', 'Shipment Details'];

  const handleCr = e => setConsignor(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleCe = e => setConsignee(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSh = e => {
    const { name, value, type, checked } = e.target;
    setShipment(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  function validate() {
    if (step === 0 && (!consignor.name || !consignor.city || !consignor.state || !consignor.pin || !consignor.phone))
      return 'Fill Consignor Name, PIN, City, State, Phone.';
    if (step === 1 && (!consignee.name || !consignee.city || !consignee.state || !consignee.pin || !consignee.phone))
      return 'Fill Consignee Name, PIN, City, State, Phone.';
    if (step === 2) {
      if (!shipment.actualWeight) return 'Enter actual weight.';
      if (!shipment.packages) return 'Enter number of packages.';
      if (!shipment.itemDescription) return 'Enter item description.';
      if (shipment.paymentType === 'COD' && !shipment.codPayeeName) return 'Enter COD Payee Name.';
    }
    return '';
  }

  function next() {
    const err = validate(); if (err) { setError(err); return; }
    setError(''); setStep(s => s + 1);
  }

  async function submit() {
    const err = validate(); if (err) { setError(err); return; }
    setError(''); setLoading(true);
    try {
      const res = await api.post('/admin/bookings/direct', {
        consignorName: consignor.name, consignorPin: consignor.pin,
        consignorAddressLine1: consignor.addressLine1, consignorAddressLine2: consignor.addressLine2,
        consignorCity: consignor.city, consignorState: consignor.state,
        consignorContactPerson: consignor.contactPerson, consignorPhone: consignor.phone, consignorEmail: consignor.email,
        consigneeName: consignee.name, consigneePin: consignee.pin,
        consigneeAddressLine1: consignee.addressLine1, consigneeAddressLine2: consignee.addressLine2,
        consigneeCity: consignee.city, consigneeState: consignee.state,
        consigneeContactPerson: consignee.contactPerson, consigneePhone: consignee.phone, consigneeEmail: consignee.email,
        ...shipment,
      });
      navigate(`/admin/orders/${res.data.data.order.id}`);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link to="/admin/orders" className="text-sm text-zinc-500 hover:text-zinc-700">← Orders</Link>
        <h1 className="mt-1 text-xl font-bold text-zinc-900">New Direct Booking</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Create a consignment directly without a customer account. An app docket number will be generated for tracking.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors
                ${i < step ? 'bg-green-500 border-green-500 text-white' : i === step ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 font-medium ${i === step ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-4 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="card p-6">
        {step === 0 && (
          <div>
            <h2 className="text-base font-semibold text-zinc-800 mb-4">Consignor Details <span className="text-sm font-normal text-zinc-500">(Sender)</span></h2>
            <AddressForm values={consignor} onChange={handleCr} />
          </div>
        )}
        {step === 1 && (
          <div>
            <h2 className="text-base font-semibold text-zinc-800 mb-4">Consignee Details <span className="text-sm font-normal text-zinc-500">(Receiver)</span></h2>
            <AddressForm values={consignee} onChange={handleCe} />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-zinc-800">Shipment Details</h2>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Service Type</label>
              <div className="flex gap-3 flex-wrap">
                {SERVICE_TYPES.map(s => (
                  <label key={s} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 cursor-pointer text-sm transition-colors
                    ${shipment.serviceType === s ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600'}`}>
                    <input type="radio" name="serviceType" value={s} checked={shipment.serviceType === s} onChange={handleSh} className="sr-only" />{s}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'appointmentDelivery', label: 'Appointment Delivery' },
                { name: 'carrierRisk', label: 'Carrier Risk' },
                { name: 'ownersRisk', label: "Owner's Risk" },
                { name: 'mallDelivery', label: 'Mall Delivery' },
              ].map(opt => (
                <label key={opt.name} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-600">
                  <input type="checkbox" name={opt.name} checked={shipment[opt.name]} onChange={handleSh} className="w-4 h-4 rounded" />
                  {opt.label}
                </label>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Actual Weight (kg) *</label>
                <input type="number" name="actualWeight" value={shipment.actualWeight} onChange={handleSh} placeholder="0.00" step="0.01" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">No. of Packages *</label>
                <input type="number" name="packages" value={shipment.packages} onChange={handleSh} placeholder="1" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Package Type</label>
                <select name="packagesType" value={shipment.packagesType} onChange={handleSh} className="input-field">
                  {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-zinc-700">Dimensions (L × W × H)</label>
                <select name="dimensionUnit" value={shipment.dimensionUnit} onChange={handleSh} className="text-sm border border-gray-300 rounded px-2 py-1">
                  <option value="CMS">CMS</option>
                  <option value="INCHES">INCHES</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input type="number" name="dimensionL" value={shipment.dimensionL} onChange={handleSh} placeholder="Length" className="input-field" />
                <input type="number" name="dimensionW" value={shipment.dimensionW} onChange={handleSh} placeholder="Width" className="input-field" />
                <input type="number" name="dimensionH" value={shipment.dimensionH} onChange={handleSh} placeholder="Height" className="input-field" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Item Description *</label>
              <input type="text" name="itemDescription" value={shipment.itemDescription} onChange={handleSh} placeholder="Contents of shipment" className="input-field" />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Payment Type</label>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_TYPES.map(pt => (
                  <label key={pt.value} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 cursor-pointer text-sm transition-colors
                    ${shipment.paymentType === pt.value ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600'}`}>
                    <input type="radio" name="paymentType" value={pt.value} checked={shipment.paymentType === pt.value} onChange={handleSh} className="sr-only" />
                    {pt.label}
                  </label>
                ))}
              </div>
            </div>

            {shipment.paymentType === 'COD' && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">COD Payee Name *</label>
                <input type="text" name="codPayeeName" value={shipment.codPayeeName} onChange={handleSh} placeholder="Person to collect payment from" className="input-field" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Notes</label>
              <input type="text" name="notes" value={shipment.notes} onChange={handleSh} placeholder="Special instructions" className="input-field" />
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => { setError(''); setStep(s => s - 1); }} disabled={step === 0}
            className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors">
            ← Previous
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Next →
            </button>
          ) : (
            <button onClick={submit} disabled={loading} className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-60 transition-colors">
              {loading ? 'Creating…' : 'Create Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddressForm({ values, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <label className="block text-sm font-medium text-zinc-700 mb-1">Name / Company *</label>
        <input type="text" name="name" value={values.name} onChange={onChange} placeholder="Full name or company" className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Contact Person</label>
        <input type="text" name="contactPerson" value={values.contactPerson} onChange={onChange} placeholder="Authorized person" className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Phone *</label>
        <input type="tel" name="phone" value={values.phone} onChange={onChange} placeholder="10-digit mobile" className="input-field" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
        <input type="email" name="email" value={values.email} onChange={onChange} placeholder="email@example.com" className="input-field" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium text-zinc-700 mb-1">Address Line 1</label>
        <input type="text" name="addressLine1" value={values.addressLine1} onChange={onChange} placeholder="Street, building" className="input-field" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium text-zinc-700 mb-1">Address Line 2</label>
        <input type="text" name="addressLine2" value={values.addressLine2} onChange={onChange} placeholder="Landmark (optional)" className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">City *</label>
        <input type="text" name="city" value={values.city} onChange={onChange} placeholder="City" className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">State *</label>
        <input type="text" name="state" value={values.state} onChange={onChange} placeholder="State" className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">PIN Code *</label>
        <input type="text" name="pin" value={values.pin} onChange={onChange} placeholder="6-digit PIN" maxLength={6} className="input-field" />
      </div>
    </div>
  );
}
