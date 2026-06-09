import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../services/api'
import StatusBadge from '../../components/shared/StatusBadge'
import { PageLoader } from '../../components/shared/LoadingSpinner'

const PARTNERS = ['DELHIVERY', 'DP_WORLD', 'VRL', 'DTDC', 'MANUAL']
const ALL_STATUSES = ['PENDING','ASSIGNED','BOOKED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','EXCEPTION','CANCELLED']

export default function AdminOrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState({ partnerName: 'DELHIVERY' })
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingMsg, setBookingMsg] = useState('')
  const [trackForm, setTrackForm] = useState({ status: '', description: '', location: '', timestamp: '' })
  const [trackLoading, setTrackLoading] = useState(false)
  const [statusValue, setStatusValue] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [error, setError] = useState('')

  const fetch = () => {
    api.get(`/admin/orders/${id}`).then(({ data }) => {
      const o = data.data.order
      setOrder(o)
      setStatusValue(o.status)
      const p = o.pickupAddressSnapshot
      const d = o.deliveryAddressSnapshot
      setBooking({
        partnerName: o.shipment?.partnerName || 'DELHIVERY',
        senderName: p?.contactName || '', senderPhone: p?.phone || '',
        senderAddress: [p?.addressLine1, p?.city, p?.state, p?.pincode].filter(Boolean).join(', '),
        receiverName: d?.contactName || '', receiverPhone: d?.phone || '',
        receiverAddress: [d?.addressLine1, d?.city, d?.state, d?.pincode].filter(Boolean).join(', '),
        weight: o.weight, dimensions: o.dimensions,
        declaredValue: o.declaredValue, serviceType: o.serviceType, paymentType: o.paymentType,
      })
    }).catch(() => setError('Order not found')).finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [id])

  const handleBook = async () => {
    setBookingLoading(true); setBookingMsg('')
    try {
      const { data } = await api.put(`/admin/orders/${id}/assign`, booking)
      setBookingMsg(`✅ Booked! Partner docket: ${data.data.partnerDocketNo}`)
      fetch()
    } catch (err) {
      setBookingMsg(`❌ ${err.response?.data?.message || 'Booking failed'}`)
    } finally {
      setBookingLoading(false)
    }
  }

  const handleAddTracking = async (e) => {
    e.preventDefault(); setTrackLoading(true)
    try {
      await api.post(`/admin/orders/${id}/tracking`, trackForm)
      setTrackForm({ status: '', description: '', location: '', timestamp: '' })
      fetch()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed')
    } finally {
      setTrackLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    setStatusLoading(true)
    try {
      await api.put(`/admin/orders/${id}/status`, { status: statusValue })
      fetch()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed')
    } finally {
      setStatusLoading(false)
    }
  }

  if (loading) return <PageLoader />
  if (error || !order) return <div className="card p-8 text-center text-zinc-500">{error}<br /><Link to="/admin/orders" className="btn-secondary mt-4 inline-flex">Back</Link></div>

  const pickup = order.pickupAddressSnapshot
  const delivery = order.deliveryAddressSnapshot
  const events = order.shipment?.trackingEvents || []

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/admin/orders" className="text-sm text-zinc-500 hover:text-zinc-700">← Orders</Link>
          <h1 className="mt-1 font-mono text-xl font-bold text-zinc-900">{order.clientDocketNo}</h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <div className="flex gap-2">
            <select className="input text-sm w-44" value={statusValue} onChange={e => setStatusValue(e.target.value)}>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <button onClick={handleStatusUpdate} className="btn-secondary text-sm" disabled={statusLoading}>
              {statusLoading ? '…' : 'Update'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Order info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3">Customer</h3>
            <p className="font-semibold">{order.user?.company || order.user?.name}</p>
            <p className="text-sm text-zinc-500">{order.user?.email}</p>
            <p className="text-sm text-zinc-500">{order.user?.phone}</p>
            {order.user?.gstin && <p className="text-sm text-zinc-400">GSTIN: {order.user.gstin}</p>}
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Pickup</p>
              <p className="font-medium text-sm">{pickup.contactName}</p>
              <p className="text-xs text-zinc-500 mt-1">{pickup.phone}</p>
              <p className="text-xs text-zinc-600 mt-1">{pickup.addressLine1}, {pickup.city}, {pickup.state} {pickup.pincode}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Delivery</p>
              <p className="font-medium text-sm">{delivery.contactName}</p>
              <p className="text-xs text-zinc-500 mt-1">{delivery.phone}</p>
              <p className="text-xs text-zinc-600 mt-1">{delivery.addressLine1}, {delivery.city}, {delivery.state} {delivery.pincode}</p>
            </div>
          </div>

          {/* Shipment */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3">Shipment Details</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Commodity', order.commodity], ['Weight', `${order.weight} kg`],
                ['Service', order.serviceType], ['Payment', order.paymentType],
                ['Declared Value', `₹${Number(order.declaredValue).toLocaleString('en-IN')}`],
                ['Dimensions', order.dimensions ? `${order.dimensions.l}×${order.dimensions.w}×${order.dimensions.h} cm` : '—'],
              ].map(([k, v]) => (
                <div key={k}><dt className="text-zinc-400">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
              {order.specialInstructions && <div className="col-span-2"><dt className="text-zinc-400">Instructions</dt><dd className="font-medium">{order.specialInstructions}</dd></div>}
            </dl>
          </div>

          {/* Tracking Timeline */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-zinc-700 mb-4">Tracking Timeline</h3>
            {events.length === 0 ? <p className="text-sm text-zinc-400">No events yet</p> : (
              <div>
                {events.map((ev, i) => (
                  <div key={ev.id} className="flex gap-3 mb-3">
                    <div className="flex flex-col items-center">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${i === 0 ? 'bg-red-600 text-white' : 'bg-zinc-100 text-zinc-500'}`}>●</div>
                      {i < events.length - 1 && <div className="w-0.5 flex-1 bg-zinc-200 my-1 min-h-4" />}
                    </div>
                    <div className="pb-3 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-zinc-800">{ev.status.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-zinc-600">{ev.description}</p>
                          {ev.location && <p className="text-xs text-zinc-400">📍 {ev.location}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-zinc-400">{new Date(ev.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                          <span className={`badge text-xs mt-1 ${ev.source === 'MANUAL' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{ev.source}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Tracking */}
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <p className="text-xs font-semibold text-zinc-600 mb-3">Add Manual Update</p>
              <form onSubmit={handleAddTracking} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input className="input text-sm" placeholder="Status (e.g. AT_HUB)" value={trackForm.status}
                      onChange={e => setTrackForm(f => ({ ...f, status: e.target.value }))} required />
                  </div>
                  <div>
                    <input className="input text-sm" placeholder="Location / City" value={trackForm.location}
                      onChange={e => setTrackForm(f => ({ ...f, location: e.target.value }))} />
                  </div>
                </div>
                <input className="input text-sm" placeholder="Description" value={trackForm.description}
                  onChange={e => setTrackForm(f => ({ ...f, description: e.target.value }))} required />
                <div className="flex gap-3">
                  <input className="input text-sm flex-1" type="datetime-local" value={trackForm.timestamp}
                    onChange={e => setTrackForm(f => ({ ...f, timestamp: e.target.value }))} />
                  <button type="submit" className="btn-primary text-sm shrink-0" disabled={trackLoading}>
                    {trackLoading ? '…' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right: Assign & Book */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-zinc-700 mb-4">Assign & Book Courier</h3>
            {bookingMsg && (
              <div className={`rounded-lg p-3 text-sm mb-4 ${bookingMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {bookingMsg}
              </div>
            )}
            {order.shipment?.partnerDocketNo && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="text-xs font-semibold text-green-700">Already Booked</p>
                <p className="text-sm font-mono text-green-800 mt-1">{order.shipment.partnerDocketNo}</p>
                <p className="text-xs text-green-600">via {order.shipment.partnerName}</p>
              </div>
            )}
            <div className="space-y-3 text-sm">
              <div>
                <label className="label text-xs">Partner *</label>
                <select className="input text-sm" value={booking.partnerName || 'DELHIVERY'}
                  onChange={e => setBooking(b => ({ ...b, partnerName: e.target.value }))}>
                  {PARTNERS.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
                </select>
              </div>
              {[
                ['senderName', 'Sender Name'], ['senderPhone', 'Sender Phone'],
                ['senderAddress', 'Sender Address'],
                ['receiverName', 'Receiver Name'], ['receiverPhone', 'Receiver Phone'],
                ['receiverAddress', 'Receiver Address'],
              ].map(([k, label]) => (
                <div key={k}>
                  <label className="label text-xs">{label}</label>
                  <input className="input text-sm" value={booking[k] || ''} onChange={e => setBooking(b => ({ ...b, [k]: e.target.value }))} />
                </div>
              ))}
              <button onClick={handleBook} className="btn-primary w-full text-sm" disabled={bookingLoading}>
                {bookingLoading ? 'Booking…' : '🚀 Book Shipment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
