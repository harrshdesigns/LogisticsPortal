import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import { PageLoader } from '../../components/shared/LoadingSpinner';

export default function OrderDetail() {
  const { docketNo } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/orders/${docketNo}`)
      .then(({ data }) => setOrder(data.data.order))
      .catch(() => setError('Order not found'))
      .finally(() => setLoading(false));
  }, [docketNo]);

  if (loading) return <PageLoader />;
  if (error || !order) return (
    <div className="max-w-2xl">
      <div className="card p-8 text-center">
        <p className="text-zinc-500">{error || 'Order not found'}</p>
        <Link to="/orders" className="mt-4 btn-secondary inline-flex">← Back to Orders</Link>
      </div>
    </div>
  );

  const events = order.shipment?.trackingEvents || [];

  return (
      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Link to="/orders" className="text-sm text-zinc-500 hover:text-zinc-700">← Orders</Link>
            <h1 className="mt-1 font-mono text-2xl font-bold text-zinc-900">{order.clientDocketNo}</h1>
            <p className="text-sm text-zinc-500">
              Booked on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Consignor / Consignee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Consignor (Sender)</p>
            <p className="font-semibold text-zinc-900">{order.consignorName || '—'}</p>
            {order.consignorContactPerson && <p className="text-sm text-zinc-600 mt-0.5">Attn: {order.consignorContactPerson}</p>}
            {order.consignorPhone && <p className="text-sm text-zinc-600 mt-0.5">📞 {order.consignorPhone}</p>}
            {order.consignorEmail && <p className="text-sm text-zinc-600">✉ {order.consignorEmail}</p>}
            {order.consignorAddressLine1 && <p className="text-sm text-zinc-600 mt-1">{order.consignorAddressLine1}</p>}
            {order.consignorAddressLine2 && <p className="text-sm text-zinc-600">{order.consignorAddressLine2}</p>}
            <p className="text-sm text-zinc-600">{[order.consignorCity, order.consignorState].filter(Boolean).join(', ')}{order.consignorPin ? ` – ${order.consignorPin}` : ''}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Consignee (Receiver)</p>
            <p className="font-semibold text-zinc-900">{order.consigneeName || '—'}</p>
            {order.consigneeContactPerson && <p className="text-sm text-zinc-600 mt-0.5">Attn: {order.consigneeContactPerson}</p>}
            {order.consigneePhone && <p className="text-sm text-zinc-600 mt-0.5">📞 {order.consigneePhone}</p>}
            {order.consigneeEmail && <p className="text-sm text-zinc-600">✉ {order.consigneeEmail}</p>}
            {order.consigneeAddressLine1 && <p className="text-sm text-zinc-600 mt-1">{order.consigneeAddressLine1}</p>}
            {order.consigneeAddressLine2 && <p className="text-sm text-zinc-600">{order.consigneeAddressLine2}</p>}
            <p className="text-sm text-zinc-600">{[order.consigneeCity, order.consigneeState].filter(Boolean).join(', ')}{order.consigneePin ? ` – ${order.consigneePin}` : ''}</p>
          </div>
        </div>

        {/* Shipment Details */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Shipment Information</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <InfoRow label="Service Type" value={order.serviceType} />
            <InfoRow label="Payment Type" value={order.paymentType?.replace(/_/g, ' ')} />
            {order.paymentType === 'COD' && <InfoRow label="COD Payee" value={order.codPayeeName} />}
            {order.codAmount && <InfoRow label="COD Amount" value={`₹${Number(order.codAmount).toLocaleString('en-IN')}`} />}
            <InfoRow label="Actual Weight" value={order.actualWeight ? `${order.actualWeight} kg` : null} />
            <InfoRow label="Packages" value={order.packages ? `${order.packages} ${order.packagesType || ''}` : null} />
            {order.quantity && <InfoRow label="Quantity" value={order.quantity} />}
            {order.unitWeight && <InfoRow label="Unit Weight" value={`${order.unitWeight} kg`} />}
            {(order.dimensionL || order.dimensionW || order.dimensionH) && (
              <InfoRow label="Dimensions" value={`${order.dimensionL || '?'} × ${order.dimensionW || '?'} × ${order.dimensionH || '?'} ${order.dimensionUnit || 'CMS'}`} />
            )}
            {order.itemDescription && <InfoRow label="Item Description" value={order.itemDescription} full />}
          </dl>

          {/* Invoice / Commercial Details */}
          {(order.invoiceValue || order.ewayBillNo || order.hsnCode || order.invoiceDate || order.invoiceNo || order.codAmount || order.quantity) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-zinc-500 mb-3">Invoice &amp; Commercial Details</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {order.invoiceValue && <InfoRow label="Invoice Value" value={`₹${Number(order.invoiceValue).toLocaleString('en-IN')}`} />}
                {order.ewayBillNo && <InfoRow label="E-Way Bill No." value={order.ewayBillNo} />}
                {order.hsnCode && <InfoRow label="HSN Code" value={order.hsnCode} />}
                {order.invoiceDate && <InfoRow label="Invoice Date" value={new Date(order.invoiceDate).toLocaleDateString('en-IN')} />}
                {order.invoiceNo && <InfoRow label="Invoice No." value={order.invoiceNo} />}
                {order.codAmount && <InfoRow label="COD Amount" value={`₹${Number(order.codAmount).toLocaleString('en-IN')}`} />}
                {order.quantity && <InfoRow label="Quantity" value={order.quantity} />}
              </dl>
            </div>
          )}

          {/* Delivery Options */}
          {(order.appointmentDelivery || order.carrierRisk || order.ownersRisk || order.mallDelivery) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-zinc-500 mb-2">Delivery Options</p>
              <div className="flex flex-wrap gap-2">
                {order.appointmentDelivery && <span className="tag">Appointment Delivery</span>}
                {order.carrierRisk && <span className="tag">Carrier Risk</span>}
                {order.ownersRisk && <span className="tag">Owner's Risk</span>}
                {order.mallDelivery && <span className="tag">Mall Delivery</span>}
              </div>
            </div>
          )}

          {order.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-zinc-500 mb-1">Notes</p>
              <p className="text-sm text-zinc-600">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Tracking Timeline */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-5">Tracking Timeline</h2>
          <p className="text-xs text-zinc-400 mb-4 font-mono">Docket: {order.clientDocketNo}</p>
          {events.length === 0 ? (
            <p className="text-sm text-zinc-400">No tracking events yet. Check back once your shipment is picked up.</p>
          ) : (
            <div>
              {events.map((ev, i) => (
                <div key={ev.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold
                      ${i === 0 ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                      {i === 0 ? '●' : '○'}
                    </div>
                    {i < events.length - 1 && <div className="w-0.5 flex-1 bg-zinc-200 my-1" />}
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={`text-sm font-semibold ${i === 0 ? 'text-blue-700' : 'text-zinc-700'}`}>
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
  );
}

function InfoRow({ label, value, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-zinc-400">{label}</dt>
      <dd className="font-medium text-zinc-800 mt-0.5">{value || '—'}</dd>
    </div>
  );
}
