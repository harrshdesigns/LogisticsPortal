import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import LoadingSpinner from '../../components/shared/LoadingSpinner'

const STEPS = ['Pickup Details', 'Delivery Details', 'Shipment Info']

const emptyAddr = { contactName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' }
const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Chandigarh','Jammu & Kashmir','Ladakh','Puducherry']

function AddressForm({ value, onChange, savedAddresses }) {
  const fillFromSaved = (addr) => {
    onChange({
      contactName: addr.contactName, phone: addr.phone,
      addressLine1: addr.addressLine1, addressLine2: addr.addressLine2 || '',
      city: addr.city, state: addr.state, pincode: addr.pincode,
    })
  }
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })

  return (
    <div className="space-y-4">
      {savedAddresses?.length > 0 && (
        <div>
          <label className="label">Saved Addresses</label>
          <div className="grid gap-2">
            {savedAddresses.map(addr => (
              <button key={addr.id} type="button" onClick={() => fillFromSaved(addr)}
                className="text-left rounded-lg border border-zinc-200 px-4 py-3 text-sm hover:border-red-300 hover:bg-red-50 transition">
                <span className="font-medium text-zinc-700">{addr.label}</span>
                <span className="ml-2 text-zinc-500">{addr.contactName}, {addr.city}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
            <div className="flex-1 h-px bg-zinc-200" />or fill manually<div className="flex-1 h-px bg-zinc-200" />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Contact Name *</label>
          <input className="input" placeholder="Full name" value={value.contactName} onChange={set('contactName')} required />
        </div>
        <div>
          <label className="label">Phone *</label>
          <input className="input" placeholder="10-digit number" value={value.phone} onChange={set('phone')} required maxLength={10} pattern="[6-9][0-9]{9}" />
        </div>
        <div className="col-span-2">
          <label className="label">Address Line 1 *</label>
          <input className="input" placeholder="House/Flat no, Street name" value={value.addressLine1} onChange={set('addressLine1')} required />
        </div>
        <div className="col-span-2">
          <label className="label">Address Line 2</label>
          <input className="input" placeholder="Landmark, Area (optional)" value={value.addressLine2} onChange={set('addressLine2')} />
        </div>
        <div>
          <label className="label">City *</label>
          <input className="input" placeholder="Mumbai" value={value.city} onChange={set('city')} required />
        </div>
        <div>
          <label className="label">Pincode *</label>
          <input className="input" placeholder="6-digit pincode" value={value.pincode} onChange={set('pincode')} required maxLength={6} pattern="[1-9][0-9]{5}" />
        </div>
        <div className="col-span-2">
          <label className="label">State *</label>
          <select className="input" value={value.state} onChange={set('state')} required>
            <option value="">Select state</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

export default function BookShipment() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [pickup, setPickup] = useState(emptyAddr)
  const [delivery, setDelivery] = useState(emptyAddr)
  const [shipment, setShipment] = useState({
    commodity: '', weight: '', dimensions: { l: '', w: '', h: '' },
    declaredValue: '', serviceType: 'SURFACE', paymentType: 'PREPAID', specialInstructions: '',
  })
  const [savedAddresses, setSavedAddresses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    api.get('/addresses').then(({ data }) => setSavedAddresses(data.data.addresses)).catch(() => {})
  }, [])

  const setShipField = (k) => (e) => setShipment(s => ({ ...s, [k]: e.target.value }))
  const setDim = (k) => (e) => setShipment(s => ({ ...s, dimensions: { ...s.dimensions, [k]: e.target.value } }))

  const handleSubmit = async () => {
    setError(''); setLoading(true)
    try {
      const { data } = await api.post('/orders', {
        pickupAddress: pickup,
        deliveryAddress: delivery,
        commodity: shipment.commodity,
        weight: parseFloat(shipment.weight),
        dimensions: { l: parseFloat(shipment.dimensions.l || 0), w: parseFloat(shipment.dimensions.w || 0), h: parseFloat(shipment.dimensions.h || 0) },
        declaredValue: parseFloat(shipment.declaredValue || 0),
        serviceType: shipment.serviceType,
        paymentType: shipment.paymentType,
        specialInstructions: shipment.specialInstructions,
      })
      setSuccess(data.data.order)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Order Booked!</h2>
          <p className="mt-2 text-sm text-zinc-500">Your shipment has been booked successfully.</p>
          <div className="mt-4 rounded-lg bg-zinc-50 p-4">
            <p className="text-xs text-zinc-500">Docket Number</p>
            <p className="mt-1 font-mono text-2xl font-bold text-red-600 tracking-widest">{success.clientDocketNo}</p>
          </div>
          <div className="mt-6 flex gap-3 justify-center">
            <button onClick={() => navigate(`/orders/${success.clientDocketNo}`)} className="btn-primary">View Order</button>
            <button onClick={() => { setSuccess(null); setStep(0); setPickup(emptyAddr); setDelivery(emptyAddr) }} className="btn-secondary">Book Another</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-zinc-900 mb-6">Book a Shipment</h1>

      {/* Progress */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition
              ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-red-600 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`ml-2 text-sm font-medium hidden sm:block ${i === step ? 'text-zinc-900' : 'text-zinc-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-3 ${i < step ? 'bg-green-500' : 'bg-zinc-200'}`} />}
          </div>
        ))}
      </div>

      <div className="card p-6">
        {step === 0 && (
          <>
            <h2 className="text-base font-semibold text-zinc-900 mb-4">Pickup Details</h2>
            <AddressForm value={pickup} onChange={setPickup} savedAddresses={savedAddresses} />
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="text-base font-semibold text-zinc-900 mb-4">Delivery Details</h2>
            <AddressForm value={delivery} onChange={setDelivery} savedAddresses={savedAddresses} />
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-base font-semibold text-zinc-900 mb-4">Shipment Details</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Commodity Description *</label>
                <input className="input" placeholder="e.g. Cotton fabric, electronic components" value={shipment.commodity} onChange={setShipField('commodity')} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Weight (kg) *</label>
                  <input className="input" type="number" step="0.1" min="0.1" placeholder="5.0" value={shipment.weight} onChange={setShipField('weight')} required />
                </div>
                <div>
                  <label className="label">Declared Value (₹)</label>
                  <input className="input" type="number" placeholder="5000" value={shipment.declaredValue} onChange={setShipField('declaredValue')} />
                </div>
              </div>
              <div>
                <label className="label">Dimensions (cm) — L × W × H</label>
                <div className="grid grid-cols-3 gap-3">
                  <input className="input" type="number" placeholder="Length" value={shipment.dimensions.l} onChange={setDim('l')} />
                  <input className="input" type="number" placeholder="Width" value={shipment.dimensions.w} onChange={setDim('w')} />
                  <input className="input" type="number" placeholder="Height" value={shipment.dimensions.h} onChange={setDim('h')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Service Type *</label>
                  <select className="input" value={shipment.serviceType} onChange={setShipField('serviceType')}>
                    <option value="SURFACE">Surface</option>
                    <option value="AIR">Air</option>
                    <option value="EXPRESS">Express</option>
                  </select>
                </div>
                <div>
                  <label className="label">Payment Type *</label>
                  <select className="input" value={shipment.paymentType} onChange={setShipField('paymentType')}>
                    <option value="PREPAID">Prepaid</option>
                    <option value="COD">COD</option>
                    <option value="TO_PAY">To Pay</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Special Instructions</label>
                <textarea className="input resize-none" rows={3} placeholder="Handle with care, fragile items, etc."
                  value={shipment.specialInstructions} onChange={setShipField('specialInstructions')} />
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4 space-y-2 text-sm">
                <p className="font-semibold text-zinc-700">Review Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-600">
                  <span className="text-zinc-400">From:</span><span>{pickup.city}, {pickup.state}</span>
                  <span className="text-zinc-400">To:</span><span>{delivery.city}, {delivery.state}</span>
                  <span className="text-zinc-400">Recipient:</span><span>{delivery.contactName}</span>
                  <span className="text-zinc-400">Weight:</span><span>{shipment.weight} kg</span>
                </div>
              </div>

              {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
            </div>
          </>
        )}

        <div className="flex justify-between mt-6">
          <button onClick={() => setStep(s => s - 1)} className="btn-secondary" disabled={step === 0}>← Previous</button>
          {step < 2
            ? <button onClick={() => setStep(s => s + 1)} className="btn-primary">Next →</button>
            : <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
                {loading ? <><LoadingSpinner size="sm" />Booking…</> : 'Book Shipment'}
              </button>
          }
        </div>
      </div>
    </div>
  )
}
