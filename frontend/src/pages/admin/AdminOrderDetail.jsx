import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import { PageLoader } from '../../components/shared/LoadingSpinner';

const PARTNERS = ['DELHIVERY', 'DP_WORLD', 'VRL', 'DTDC', 'MANUAL'];
const ALL_STATUSES = ['PENDING','ASSIGNED','BOOKED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','EXCEPTION','CANCELLED'];
const PAYMENT_TYPES = ['PREPAID', 'TO_PAY', 'TO_BILL', 'COD'];
const SERVICE_TYPES = ['SURFACE', 'AIR', 'WATER', 'EXPRESS'];
const PACKAGE_TYPES = ['PACKAGES', 'BOXES', 'BAGS'];
const PICKUP_OPTIONS = ['PICKUP_FROM_CONSIGNOR', 'DROP_AT_BRANCH'];

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState({});
  const [error, setError] = useState('');

  // Booking form
  const [booking, setBooking] = useState({
    partnerName: 'DELHIVERY',
    loginId: '',
    docketDate: new Date().toISOString().split('T')[0],
    pickupOption: 'PICKUP_FROM_CONSIGNOR',
    billToParty: '',
    materialHold: false,
    waitingPermit: false,
    deliveryCode: '',
    serviceType: 'SURFACE',
    paymentType: 'PREPAID',
    codPayeeName: '',
    actualWeight: '',
    packages: '',
    packagesType: 'BAGS',
    unitWeight: '',
    dimensionL: '', dimensionW: '', dimensionH: '', dimensionUnit: 'CMS',
    itemDescription: '',
    appointmentDelivery: false,
    carrierRisk: false,
    ownersRisk: false,
    mallDelivery: false,
    notes: '',
  });
  const [ratesData, setRatesData] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMsg, setBookingMsg] = useState({ type: '', text: '' });

  // Tracking
  const [trackForm, setTrackForm] = useState({ status: '', description: '', location: '', timestamp: '' });
  const [trackLoading, setTrackLoading] = useState(false);

  // Status
  const [statusValue, setStatusValue] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchOrder = useCallback(() => {
    api.get(`/admin/orders/${id}`)
      .then(({ data }) => {
        const o = data.data.order;
        setOrder(o);
        setStatusValue(o.status);
        setBooking(prev => ({
          ...prev,
          partnerName: o.shipment?.partnerName || 'DELHIVERY',
          serviceType: o.serviceType || 'SURFACE',
          paymentType: o.paymentType || 'PREPAID',
          codPayeeName: o.codPayeeName || '',
          actualWeight: o.actualWeight || '',
          packages: o.packages || '',
          packagesType: o.packagesType || 'BAGS',
          unitWeight: o.unitWeight || '',
          dimensionL: o.dimensionL || '',
          dimensionW: o.dimensionW || '',
          dimensionH: o.dimensionH || '',
          dimensionUnit: o.dimensionUnit || 'CMS',
          itemDescription: o.itemDescription || '',
          appointmentDelivery: !!o.appointmentDelivery,
          carrierRisk: !!o.carrierRisk,
          ownersRisk: !!o.ownersRisk,
          mallDelivery: !!o.mallDelivery,
          notes: o.notes || '',
          pickupOption: o.shipment?.pickupOption || 'PICKUP_FROM_CONSIGNOR',
          loginId: o.shipment?.loginId || '',
          deliveryCode: o.shipment?.deliveryCode || '',
        }));
      })
      .catch(() => setError('Order not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // When partner changes, autofill loginId from credentials
  useEffect(() => {
    api.get('/admin/partner-credentials')
      .then(({ data }) => {
        const creds = {};
        (data.data.credentials || []).forEach(c => { creds[c.partner] = c; });
        setCredentials(creds);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (credentials[booking.partnerName]) {
      setBooking(prev => ({ ...prev, loginId: credentials[booking.partnerName].loginId || '' }));
    }
  }, [booking.partnerName, credentials]);

  const setB = (name, value) => setBooking(prev => ({ ...prev, [name]: value }));
  const handleBookingChange = e => {
    const { name, value, type, checked } = e.target;
    setB(name, type === 'checkbox' ? checked : value);
  };

  const handleCheckRates = async () => {
    setRatesLoading(true);
    setRatesData(null);
    try {
      const { data } = await api.post(`/admin/orders/${id}/check-rates`, { partnerName: booking.partnerName });
      setRatesData(data.data.rates);
    } catch (err) {
      setBookingMsg({ type: 'error', text: err.response?.data?.message || 'Failed to fetch rates' });
    } finally {
      setRatesLoading(false);
    }
  };

  const handleBook = async () => {
    setBookingLoading(true);
    setBookingMsg({ type: '', text: '' });
    try {
      await api.post(`/admin/orders/${id}/assign`, booking);
      setBookingMsg({ type: 'success', text: 'Shipment booked successfully with partner!' });
      fetchOrder();
    } catch (err) {
      setBookingMsg({ type: 'error', text: err.response?.data?.message || 'Booking failed' });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleAddTracking = async e => {
    e.preventDefault();
    setTrackLoading(true);
    try {
      await api.post(`/admin/orders/${id}/tracking`, trackForm);
      setTrackForm({ status: '', description: '', location: '', timestamp: '' });
      fetchOrder();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add event');
    } finally {
      setTrackLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    setStatusLoading(true);
    try {
      await api.patch(`/admin/orders/${id}/status`, { status: statusValue });
      fetchOrder();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error || !order) return (
    <div className="card p-8 text-center text-zinc-500">
      {error}<br />
      <Link to="/admin/orders" className="btn-secondary mt-4 inline-flex">← Back</Link>
    </div>
  );

  const events = order.shipment?.trackingEvents || [];

  return (
    <div className="max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/admin/orders" className="text-sm text-zinc-500 hover:text-zinc-700">← Orders</Link>
          <h1 className="mt-1 font-mono text-xl font-bold text-zinc-900">{order.clientDocketNo}</h1>
          {order.isDirectBooking && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Direct Booking</span>}
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <select className="input text-sm w-44" value={statusValue} onChange={e => setStatusValue(e.target.value)}>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <button onClick={handleStatusUpdate} disabled={statusLoading} className="btn-secondary text-sm">
            {statusLoading ? '…' : 'Update Status'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── LEFT: Order Info ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer */}
          {order.user && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Customer</p>
              <p className="font-semibold text-zinc-900">{order.user.company || order.user.name}</p>
              <p className="text-sm text-zinc-500">{order.user.email}</p>
              {order.user.phone && <p className="text-sm text-zinc-500">{order.user.phone}</p>}
              {order.user.gstin && <p className="text-xs text-zinc-400 mt-1">GSTIN: {order.user.gstin}</p>}
            </div>
          )}

          {/* Consignor */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Consignor (Sender)</p>
            <p className="font-medium text-sm text-zinc-900">{order.consignorName}</p>
            {order.consignorContactPerson && <p className="text-xs text-zinc-500">Attn: {order.consignorContactPerson}</p>}
            <p className="text-xs text-zinc-500 mt-0.5">{order.consignorPhone}</p>
            {order.consignorEmail && <p className="text-xs text-zinc-500">{order.consignorEmail}</p>}
            <p className="text-xs text-zinc-600 mt-1">
              {[order.consignorAddressLine1, order.consignorAddressLine2, order.consignorCity, order.consignorState, order.consignorPin].filter(Boolean).join(', ')}
            </p>
          </div>

          {/* Consignee */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Consignee (Receiver)</p>
            <p className="font-medium text-sm text-zinc-900">{order.consigneeName}</p>
            {order.consigneeContactPerson && <p className="text-xs text-zinc-500">Attn: {order.consigneeContactPerson}</p>}
            <p className="text-xs text-zinc-500 mt-0.5">{order.consigneePhone}</p>
            {order.consigneeEmail && <p className="text-xs text-zinc-500">{order.consigneeEmail}</p>}
            <p className="text-xs text-zinc-600 mt-1">
              {[order.consigneeAddressLine1, order.consigneeAddressLine2, order.consigneeCity, order.consigneeState, order.consigneePin].filter(Boolean).join(', ')}
            </p>
          </div>

          {/* Shipment Summary */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Shipment Summary</p>
            <dl className="space-y-1 text-sm">
              {[
                ['Service', order.serviceType],
                ['Payment', order.paymentType?.replace(/_/g, ' ')],
                ['Weight', order.actualWeight ? `${order.actualWeight} kg` : null],
                ['Packages', order.packages ? `${order.packages} ${order.packagesType || ''}` : null],
                ['Dimensions', order.dimensionL ? `${order.dimensionL}×${order.dimensionW}×${order.dimensionH} ${order.dimensionUnit}` : null],
                ['Item', order.itemDescription],
              ].filter(([,v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-zinc-400">{k}</dt>
                  <dd className="font-medium text-zinc-700 text-right max-w-[60%]">{v}</dd>
                </div>
              ))}
            </dl>
            {(order.appointmentDelivery || order.carrierRisk || order.ownersRisk || order.mallDelivery) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {order.appointmentDelivery && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Appt Delivery</span>}
                {order.carrierRisk && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Carrier Risk</span>}
                {order.ownersRisk && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Owner's Risk</span>}
                {order.mallDelivery && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Mall Delivery</span>}
              </div>
            )}
          </div>

          {/* Tracking Timeline */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase mb-3">Tracking Timeline</p>
            {events.length === 0 ? (
              <p className="text-sm text-zinc-400">No events yet</p>
            ) : (
              <div>
                {events.map((ev, i) => (
                  <div key={ev.id} className="flex gap-3 mb-2">
                    <div className="flex flex-col items-center">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center text-xs ${i === 0 ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-400'}`}>●</div>
                      {i < events.length - 1 && <div className="w-0.5 flex-1 bg-zinc-200 my-1 min-h-3" />}
                    </div>
                    <div className="pb-2 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-zinc-800">{ev.status.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-zinc-500">{ev.description}</p>
                          {ev.location && <p className="text-xs text-zinc-400">📍 {ev.location}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-zinc-400">{new Date(ev.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${ev.source === 'MANUAL' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{ev.source}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Tracking Event */}
            <div className="mt-3 pt-3 border-t border-zinc-100">
              <p className="text-xs font-semibold text-zinc-600 mb-2">Add Manual Update</p>
              <form onSubmit={handleAddTracking} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input className="input text-xs" placeholder="Status (e.g. AT_HUB)" value={trackForm.status}
                    onChange={e => setTrackForm(f => ({ ...f, status: e.target.value }))} required />
                  <input className="input text-xs" placeholder="Location" value={trackForm.location}
                    onChange={e => setTrackForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <input className="input text-xs" placeholder="Description" value={trackForm.description}
                  onChange={e => setTrackForm(f => ({ ...f, description: e.target.value }))} required />
                <div className="flex gap-2">
                  <input className="input text-xs flex-1" type="datetime-local" value={trackForm.timestamp}
                    onChange={e => setTrackForm(f => ({ ...f, timestamp: e.target.value }))} />
                  <button type="submit" className="btn-primary text-xs shrink-0 px-3" disabled={trackLoading}>
                    {trackLoading ? '…' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Assign & Book Panel ── */}
        <div className="lg:col-span-3">
          <div className="card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-800">Assign & Book with Partner</h3>
              {order.shipment?.bookedAt && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  ✓ Booked via {order.shipment.partnerName?.replace('_', ' ')}
                </span>
              )}
            </div>

            {bookingMsg.text && (
              <div className={`p-3 rounded-lg text-sm ${bookingMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {bookingMsg.text}
              </div>
            )}

            {/* Partner + Login ID */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Partner <span className="text-red-500">*</span></label>
                <select name="partnerName" value={booking.partnerName} onChange={handleBookingChange} className="input text-sm">
                  {PARTNERS.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Login ID
                  {credentials[booking.partnerName]?.loginId && <span className="ml-1 text-green-600">(auto-filled)</span>}
                </label>
                <input type="text" name="loginId" value={booking.loginId} onChange={handleBookingChange}
                  placeholder="Partner login ID" className="input text-sm" />
              </div>
            </div>

            {/* Docket Date + Pickup Option */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Docket Date</label>
                <input type="date" name="docketDate" value={booking.docketDate} onChange={handleBookingChange} className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Pickup Option</label>
                <select name="pickupOption" value={booking.pickupOption} onChange={handleBookingChange} className="input text-sm">
                  {PICKUP_OPTIONS.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>

            {/* Bill to Party + Delivery Code */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Bill To Party</label>
                <input type="text" name="billToParty" value={booking.billToParty} onChange={handleBookingChange}
                  placeholder="Billing party name" className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Delivery Code</label>
                <input type="text" name="deliveryCode" value={booking.deliveryCode} onChange={handleBookingChange}
                  placeholder="OTP / delivery code" className="input text-sm" />
              </div>
            </div>

            {/* Flags */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-600">
                <input type="checkbox" name="materialHold" checked={booking.materialHold} onChange={handleBookingChange} className="w-4 h-4 rounded" />
                Material Hold
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-600">
                <input type="checkbox" name="waitingPermit" checked={booking.waitingPermit} onChange={handleBookingChange} className="w-4 h-4 rounded" />
                Waiting Permit
              </label>
            </div>

            <hr className="border-zinc-100" />

            {/* Service & Payment */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Service Type</label>
                <select name="serviceType" value={booking.serviceType} onChange={handleBookingChange} className="input text-sm">
                  {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Payment Type</label>
                <select name="paymentType" value={booking.paymentType} onChange={handleBookingChange} className="input text-sm">
                  {PAYMENT_TYPES.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>

            {booking.paymentType === 'COD' && (
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">COD Payee Name</label>
                <input type="text" name="codPayeeName" value={booking.codPayeeName} onChange={handleBookingChange}
                  placeholder="Person to collect COD from" className="input text-sm" />
              </div>
            )}

            {/* Weight & Packages */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Actual Wt (kg)</label>
                <input type="number" name="actualWeight" value={booking.actualWeight} onChange={handleBookingChange}
                  placeholder="0.00" step="0.01" min="0" className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">No. of Pkgs</label>
                <input type="number" name="packages" value={booking.packages} onChange={handleBookingChange}
                  placeholder="1" min="1" className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Pkg Type</label>
                <select name="packagesType" value={booking.packagesType} onChange={handleBookingChange} className="input text-sm">
                  {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Unit Weight + Dimensions */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Unit Wt (kg)</label>
                <input type="number" name="unitWeight" value={booking.unitWeight} onChange={handleBookingChange}
                  placeholder="0.00" step="0.01" min="0" className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">L</label>
                <input type="number" name="dimensionL" value={booking.dimensionL} onChange={handleBookingChange}
                  placeholder="L" step="0.1" className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">W</label>
                <input type="number" name="dimensionW" value={booking.dimensionW} onChange={handleBookingChange}
                  placeholder="W" step="0.1" className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">H</label>
                <input type="number" name="dimensionH" value={booking.dimensionH} onChange={handleBookingChange}
                  placeholder="H" step="0.1" className="input text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Dimension Unit</label>
                <select name="dimensionUnit" value={booking.dimensionUnit} onChange={handleBookingChange} className="input text-sm">
                  <option value="CMS">CMS</option>
                  <option value="INCHES">INCHES</option>
                </select>
              </div>
            </div>

            {/* Item Description */}
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Item Description</label>
              <input type="text" name="itemDescription" value={booking.itemDescription} onChange={handleBookingChange}
                placeholder="Contents of shipment" className="input text-sm" />
            </div>

            {/* Delivery Options */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'appointmentDelivery', label: 'Appointment Delivery' },
                { name: 'carrierRisk', label: 'Carrier Risk' },
                { name: 'ownersRisk', label: "Owner's Risk" },
                { name: 'mallDelivery', label: 'Mall Delivery' },
              ].map(opt => (
                <label key={opt.name} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-600">
                  <input type="checkbox" name={opt.name} checked={booking[opt.name]} onChange={handleBookingChange} className="w-4 h-4 rounded border-gray-300" />
                  {opt.label}
                </label>
              ))}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Notes / Instructions</label>
              <input type="text" name="notes" value={booking.notes} onChange={handleBookingChange}
                placeholder="Special handling instructions" className="input text-sm" />
            </div>

            {/* Rates Display */}
            {ratesData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-700 mb-2">
                  Rates from {ratesData.partner?.replace('_', ' ')} — checked at {new Date(ratesData.checkedAt).toLocaleTimeString('en-IN')}
                </p>
                <div className="space-y-2">
                  {ratesData.options?.map(opt => (
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
                </div>
                {ratesData.note && <p className="text-xs text-zinc-400 mt-2">{ratesData.note}</p>}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button onClick={handleCheckRates} disabled={ratesLoading}
                className="flex-1 py-2 px-4 border-2 border-blue-500 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors text-sm">
                {ratesLoading ? 'Checking…' : '🔍 Check Rates'}
              </button>
              <button onClick={handleBook} disabled={bookingLoading}
                className="flex-1 py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm">
                {bookingLoading ? 'Booking…' : '🚀 Book Shipment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
