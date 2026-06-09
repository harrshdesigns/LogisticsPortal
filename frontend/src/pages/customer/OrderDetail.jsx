import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../services/api'
import StatusBadge from '../../components/shared/StatusBadge'
import { PageLoader } from '../../components/shared/LoadingSpinner'

export default function OrderDetail() {
  const { docketNo } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/orders/${docketNo}`).then(({ data }) => setOrder(data.data.order))
      .catch(() => setError('Order not found')).finally(() => setLoading(false))
  }, [docketNo])

  if (loading) return <PageLoader />
  if (error || !order) return (
    <div className="max-w-2xl">
      <div className="card p-8 text-center">
        <p className="text-zinc-500">{error || 'Order not found'}</p>
        <Link to="/orders" className="mt-4 btn-secondary inline-flex">Back to Orders</Link>
      </div>
    </div>
  )

  const pickup = order.pickupAddressSnapshot
  const delivery = order.deliveryAddressSnapshot
  const events = order.shipment?.trackingEvents || []

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to="/orders" className="text-sm text-zinc-500 hover:text-zinc-700">← Orders</Link>
          <h1 className="mt-1 font-mono text-2xl font-bold text-zinc-900">{order.clientDocketNo}</h1>
          <p className="text-sm text-zinc-500">Booked on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AddressCard label="Pickup From" addr={pickup} />
        <AddressCard label="Deliver To" addr={delivery} />
      </div>

      {/* Shipment Info */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-zinc-700 mb-4">Shipment Information</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <InfoRow label="Commodity" value={order.commodity} />
          <InfoRow label="Weight" value={`${order.weight} kg`} />
          <InfoRow label="Dimensions" value={order.dimensions ? `${order.dimensions.l}×${order.dimensions.w}×${order.dimensions.h} cm` : '—'} />
          <InfoRow label="Declared Value" value={order.declaredValue ? `₹${Number(order.declaredValue).toLocaleString('en-IN')}` : '—'} />
          <InfoRow label="Service Type" value={order.serviceType} />
          <InfoRow label="Payment Type" value={order.paymentType} />
          {order.specialInstructions && <InfoRow label="Instructions" value={order.specialInstructions} full />}
        </dl>
      </div>

      {/* Tracking Timeline */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-zinc-700 mb-5">Tracking Timeline</h2>
        {events.length === 0 ? (
          <p className="text-sm text-zinc-400">No tracking events yet. Check back once your shipment is picked up.</p>
        ) : (
          <div className="space-y-0">
            {events.map((ev, i) => (
              <div key={ev.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold
                    ${i === 0 ? 'bg-red-600 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                    {i === 0 ? '●' : '○'}
                  </div>
                  {i < events.length - 1 && <div className="w-0.5 flex-1 bg-zinc-200 my-1" />}
                </div>
                <div className="pb-4 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-sm font-semibold ${i === 0 ? 'text-red-700' : 'text-zinc-700'}`}>
                        {ev.status.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-zinc-600 mt-0.5">{ev.description}</p>
                      {ev.location && <p className="text-xs text-zinc-400 mt-0.5">📍 {ev.location}</p>}
                    </div>
                    <time className="text-xs text-zinc-400 shrink-0">
                      {new Date(ev.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AddressCard({ label, addr }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">{label}</p>
      <p className="font-semibold text-zinc-900">{addr.contactName}</p>
      <p className="text-sm text-zinc-600 mt-1">{addr.phone}</p>
      <p className="text-sm text-zinc-600 mt-1">{addr.addressLine1}</p>
      {addr.addressLine2 && <p className="text-sm text-zinc-600">{addr.addressLine2}</p>}
      <p className="text-sm text-zinc-600">{addr.city}, {addr.state} – {addr.pincode}</p>
    </div>
  )
}

function InfoRow({ label, value, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-zinc-400">{label}</dt>
      <dd className="font-medium text-zinc-800 mt-0.5">{value || '—'}</dd>
    </div>
  )
}
