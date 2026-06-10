import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const STEPS = ['Consignor Details', 'Consignee Details', 'Shipment Details'];

const SERVICE_TYPES = ['SURFACE', 'AIR', 'WATER', 'EXPRESS'];
const PAYMENT_TYPES = [
  { value: 'PREPAID', label: 'Prepaid' },
  { value: 'TO_PAY', label: 'To Pay' },
  { value: 'TO_BILL', label: 'To Bill' },
  { value: 'COD', label: 'COD (Cash on Delivery)' },
];
const PACKAGE_TYPES = ['PACKAGES', 'BOXES', 'BAGS'];

const emptyAddress = {
  name: '', pin: '', addressLine1: '', addressLine2: '',
  city: '', state: '', contactPerson: '', phone: '', email: '',
};

export default function BookShipment() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [consignor, setConsignor] = useState({ ...emptyAddress });
  const [consignee, setConsignee] = useState({ ...emptyAddress });
  const [shipment, setShipment] = useState({
    serviceType: 'SURFACE',
    appointmentDelivery: false,
    carrierRisk: false,
    ownersRisk: false,
    mallDelivery: false,
    actualWeight: '',
    itemDescription: '',
    packages: '',
    packagesType: 'BAGS',
    unitWeight: '',
    dimensionL: '', dimensionW: '', dimensionH: '',
    dimensionUnit: 'CMS',
    paymentType: 'PREPAID',
    codPayeeName: '',
    codAmount: '',
    invoiceValue: '',
    invoiceNo: '',
    invoiceDate: '',
    ewayBillNo: '',
    hsnCode: '',
    quantity: '',
    notes: '',
  });

  useEffect(() => {
    api.get('/addresses').then(r => setAddresses(r.data.data.addresses || [])).catch(() => {});
  }, []);

  function fillFromAddress(target, addr) {
    const setter = target === 'consignor' ? setConsignor : setConsignee;
    setter({
      name: addr.contactName || '',
      pin: addr.pincode || '',
      addressLine1: addr.addressLine1 || '',
      addressLine2: addr.addressLine2 || '',
      city: addr.city || '',
      state: addr.state || '',
      contactPerson: addr.contactName || '',
      phone: addr.phone || '',
      email: addr.email || '',
    });
  }

  const handleConsignorChange = e => setConsignor(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleConsigneeChange = e => setConsignee(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleShipmentChange = e => {
    const { name, value, type, checked } = e.target;
    setShipment(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  function validateStep() {
    if (step === 0) {
      if (!consignor.name || !consignor.city || !consignor.state || !consignor.pin || !consignor.phone)
        return 'Please fill Consignor Name, PIN, City, State, and Phone.';
    }
    if (step === 1) {
      if (!consignee.name || !consignee.city || !consignee.state || !consignee.pin || !consignee.phone)
        return 'Please fill Consignee Name, PIN, City, State, and Phone.';
    }
    if (step === 2) {
      if (!shipment.actualWeight) return 'Please enter actual weight.';
      if (!shipment.packages) return 'Please enter number of packages.';
      if (!shipment.itemDescription) return 'Please enter item description.';
      if (shipment.paymentType === 'COD' && !shipment.codPayeeName) return 'Please enter COD Payee Name.';
    }
    return '';
  }

  function nextStep() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  }

  async function handleSubmit() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      const payload = {
        consignorName: consignor.name,
        consignorPin: consignor.pin,
        consignorAddressLine1: consignor.addressLine1,
        consignorAddressLine2: consignor.addressLine2,
        consignorCity: consignor.city,
        consignorState: consignor.state,
        consignorContactPerson: consignor.contactPerson,
        consignorPhone: consignor.phone,
        consignorEmail: consignor.email,
        consigneeName: consignee.name,
        consigneePin: consignee.pin,
        consigneeAddressLine1: consignee.addressLine1,
        consigneeAddressLine2: consignee.addressLine2,
        consigneeCity: consignee.city,
        consigneeState: consignee.state,
        consigneeContactPerson: consignee.contactPerson,
        consigneePhone: consignee.phone,
        consigneeEmail: consignee.email,
        ...shipment,
      };
      const res = await api.post('/orders', payload);
      navigate(`/orders/${res.data.data.order.clientDocketNo}`);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Book Shipment</h1>

        {/* Stepper */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors
                  ${i < step ? 'bg-green-500 border-green-500 text-white'
                    : i === step ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs mt-1 text-center font-medium ${i === step ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

          {/* STEP 0: Consignor */}
          {step === 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Consignor Details <span className="text-sm font-normal text-gray-500">(Sender)</span>
              </h2>
              {addresses.length > 0 && (
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Fill from saved address</label>
                  <select className="input-field" onChange={e => { if (e.target.value) fillFromAddress('consignor', addresses.find(a => a.id === e.target.value)); }}>
                    <option value="">-- Select saved address --</option>
                    {addresses.map(a => <option key={a.id} value={a.id}>{a.label} — {a.city}</option>)}
                  </select>
                </div>
              )}
              <AddressForm values={consignor} onChange={handleConsignorChange} />
            </div>
          )}

          {/* STEP 1: Consignee */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Consignee Details <span className="text-sm font-normal text-gray-500">(Receiver)</span>
              </h2>
              {addresses.length > 0 && (
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Fill from saved address</label>
                  <select className="input-field" onChange={e => { if (e.target.value) fillFromAddress('consignee', addresses.find(a => a.id === e.target.value)); }}>
                    <option value="">-- Select saved address --</option>
                    {addresses.map(a => <option key={a.id} value={a.id}>{a.label} — {a.city}</option>)}
                  </select>
                </div>
              )}
              <AddressForm values={consignee} onChange={handleConsigneeChange} />
            </div>
          )}

          {/* STEP 2: Shipment Details */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800">Shipment Details</h2>

              {/* Service Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Type <span className="text-red-500">*</span></label>
                <div className="flex gap-3 flex-wrap">
                  {SERVICE_TYPES.map(s => (
                    <label key={s} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors
                      ${shipment.serviceType === s ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <input type="radio" name="serviceType" value={s} checked={shipment.serviceType === s} onChange={handleShipmentChange} className="sr-only" />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              {/* Delivery Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Options</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'appointmentDelivery', label: 'Appointment Delivery' },
                    { name: 'carrierRisk', label: 'Carrier Risk' },
                    { name: 'ownersRisk', label: "Owner's Risk" },
                    { name: 'mallDelivery', label: 'Mall Delivery' },
                  ].map(opt => (
                    <label key={opt.name} className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" name={opt.name} checked={shipment[opt.name]} onChange={handleShipmentChange} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Weight & Packages */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actual Weight (kg) <span className="text-red-500">*</span></label>
                  <input type="number" name="actualWeight" value={shipment.actualWeight} onChange={handleShipmentChange} placeholder="0.00" step="0.01" min="0" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. of Packages <span className="text-red-500">*</span></label>
                  <input type="number" name="packages" value={shipment.packages} onChange={handleShipmentChange} placeholder="1" min="1" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Package Type</label>
                  <select name="packagesType" value={shipment.packagesType} onChange={handleShipmentChange} className="input-field">
                    {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Weight (kg)</label>
                  <input type="number" name="unitWeight" value={shipment.unitWeight} onChange={handleShipmentChange} placeholder="0.00" step="0.01" min="0" className="input-field" />
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Dimensions (L × W × H)</label>
                  <select name="dimensionUnit" value={shipment.dimensionUnit} onChange={handleShipmentChange} className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                    <option value="CMS">CMS</option>
                    <option value="INCHES">INCHES</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input type="number" name="dimensionL" value={shipment.dimensionL} onChange={handleShipmentChange} placeholder="Length" step="0.1" min="0" className="input-field" />
                  <input type="number" name="dimensionW" value={shipment.dimensionW} onChange={handleShipmentChange} placeholder="Width" step="0.1" min="0" className="input-field" />
                  <input type="number" name="dimensionH" value={shipment.dimensionH} onChange={handleShipmentChange} placeholder="Height" step="0.1" min="0" className="input-field" />
                </div>
              </div>

              {/* Item Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Description <span className="text-red-500">*</span></label>
                <textarea name="itemDescription" value={shipment.itemDescription} onChange={handleShipmentChange} rows={2} placeholder="Describe the contents..." className="input-field resize-none" />
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_TYPES.map(pt => (
                    <label key={pt.value} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors
                      ${shipment.paymentType === pt.value ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <input type="radio" name="paymentType" value={pt.value} checked={shipment.paymentType === pt.value} onChange={handleShipmentChange} className="sr-only" />
                      {pt.label}
                    </label>
                  ))}
                </div>
              </div>

              {shipment.paymentType === 'COD' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">COD Payee Name <span className="text-red-500">*</span></label>
                    <input type="text" name="codPayeeName" value={shipment.codPayeeName} onChange={handleShipmentChange} placeholder="Person to collect payment from" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">COD Amount (₹)</label>
                    <input type="number" name="codAmount" value={shipment.codAmount} onChange={handleShipmentChange} placeholder="0.00" step="0.01" min="0" className="input-field" />
                  </div>
                </div>
              )}

              {/* Invoice / Commercial Details */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Invoice &amp; Commercial Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Value (₹)</label>
                    <input type="number" name="invoiceValue" value={shipment.invoiceValue} onChange={handleShipmentChange} placeholder="0.00" step="0.01" min="0" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice No.</label>
                    <input type="text" name="invoiceNo" value={shipment.invoiceNo} onChange={handleShipmentChange} placeholder="e.g. INV-2024-001" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                    <input type="date" name="invoiceDate" value={shipment.invoiceDate} onChange={handleShipmentChange} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-Way Bill No.</label>
                    <input type="text" name="ewayBillNo" value={shipment.ewayBillNo} onChange={handleShipmentChange} placeholder="12-digit e-way bill number" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                    <input type="text" name="hsnCode" value={shipment.hsnCode} onChange={handleShipmentChange} placeholder="e.g. 6203" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input type="number" name="quantity" value={shipment.quantity} onChange={handleShipmentChange} placeholder="No. of items" min="1" className="input-field" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions / Notes</label>
                <textarea name="notes" value={shipment.notes} onChange={handleShipmentChange} rows={2} placeholder="Any special handling or delivery instructions..." className="input-field resize-none" />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => { setError(''); setStep(s => s - 1); }} disabled={step === 0}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ← Previous
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={nextStep}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Next →
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                {loading ? 'Submitting…' : 'Submit Order'}
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Name / Company <span className="text-red-500">*</span></label>
        <input type="text" name="name" value={values.name} onChange={onChange} placeholder="Full name or company name" className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
        <input type="text" name="contactPerson" value={values.contactPerson} onChange={onChange} placeholder="Authorized person" className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
        <input type="tel" name="phone" value={values.phone} onChange={onChange} placeholder="10-digit mobile" className="input-field" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input type="email" name="email" value={values.email} onChange={onChange} placeholder="email@example.com" className="input-field" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
        <input type="text" name="addressLine1" value={values.addressLine1} onChange={onChange} placeholder="Street, building, area" className="input-field" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
        <input type="text" name="addressLine2" value={values.addressLine2} onChange={onChange} placeholder="Landmark, locality (optional)" className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
        <input type="text" name="city" value={values.city} onChange={onChange} placeholder="City" className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">State <span className="text-red-500">*</span></label>
        <input type="text" name="state" value={values.state} onChange={onChange} placeholder="State" className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">PIN Code <span className="text-red-500">*</span></label>
        <input type="text" name="pin" value={values.pin} onChange={onChange} placeholder="6-digit PIN" maxLength={6} className="input-field" />
      </div>
    </div>
  );
}
