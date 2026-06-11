import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import { PageLoader } from '../../components/shared/LoadingSpinner';
import { MapPinIcon, SearchIcon, SendIcon, CheckIcon, XMarkIcon } from '../../components/shared/Icons';

const PARTNERS = ['DELHIVERY', 'DP_WORLD', 'VRL', 'DTDC', 'MANUAL'];
const ALL_STATUSES = ['PENDING','ASSIGNED','BOOKED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','EXCEPTION','CANCELLED'];
const PAYMENT_TYPES = ['PREPAID', 'TO_PAY', 'TO_BILL', 'COD'];
const SERVICE_TYPES = ['SURFACE', 'AIR', 'WATER', 'EXPRESS'];
const PACKAGE_TYPES = ['PACKAGES', 'BOXES', 'BAGS', 'PACKETS'];
const PICKUP_OPTIONS = ['PICKUP_FROM_CONSIGNOR', 'DROP_AT_BRANCH'];

const emptyPkgRow = () => ({ description: '', reference: '', packages: '', packagesType: 'BAGS', unitWeight: '', dimensionL: '', dimensionW: '', dimensionH: '', dimensionUnit: 'CMS' });

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState({});
  const [error, setError] = useState('');

  const [packageRows, setPackageRows] = useState([emptyPkgRow()]);

  const [booking, setBooking] = useState({
    partnerName: 'DELHIVERY',
    loginId: '',
    partnerDocketNo: '',
    docketDate: new Date().toISOString().split('T')[0],
    docketTime: '',
    docketAmPm: 'AM',
    pickupOption: 'PICKUP_FROM_CONSIGNOR',
    billToParty: '',
    materialHold: false,
    waitingPermit: false,
    deliveryCode: '',
    codPayeeName: '',
    consignorName: '', consignorPin: '', consignorAddressLine1: '', consignorAddressLine2: '',
    consignorCity: '', consignorState: '', consignorContactPerson: '', consignorPhone: '', consignorEmail: '',
    consigneeName: '', consigneePin: '', consigneeAddressLine1: '', consigneeAddressLine2: '',
    consigneeCity: '', consigneeState: '', consigneeContactPerson: '', consigneePhone: '', consigneeEmail: '',
    serviceType: 'SURFACE',
    appointmentDelivery: false,
    carrierRisk: false,
    ownersRisk: false,
    mallDelivery: false,
    actualWeight: '',
    paymentType: 'PREPAID',
    codAmount: '',
    invoiceValue: '', invoiceNo: '', invoiceDate: '', ewayBillNo: '', hsnCode: '', quantity: '',
    notes: '',
  });
  const [ratesData, setRatesData] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMsg, setBookingMsg] = useState({ type: '', text: '' });

  const [trackForm, setTrackForm] = useState({ status: '', description: '', location: '', timestamp: '' });
  const [trackLoading, setTrackLoading] = useState(false);
  const [statusValue, setStatusValue] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchOrder = useCallback(() => {
    api.get(`/admin/orders/${id}`)
      .then(({ data }) => {
        const o = data.data.order;
        setOrder(o);
        setStatusValue(o.status);
        setPackageRows(o.items?.length
          ? o.items.map(item => ({
              description: item.description || '',
              reference: item.reference || '',
              packages: item.packages || '',
              packagesType: item.packagesType || 'BAGS',
              unitWeight: item.unitWeight || '',
              dimensionL: item.dimensionL || '',
              dimensionW: item.dimensionW || '',
              dimensionH: item.dimensionH || '',
              dimensionUnit: item.dimensionUnit || 'CMS',
            }))
          : [emptyPkgRow()]
        );
        setBooking(prev => ({
          ...prev,
          partnerName: o.shipment?.partnerName || 'DELHIVERY',
          loginId: o.shipment?.loginId || '',
          partnerDocketNo: o.shipment?.partnerDocketNo || '',
          pickupOption: o.shipment?.pickupOption || 'PICKUP_FROM_CONSIGNOR',
          deliveryCode: o.shipment?.deliveryCode || '',
          billToParty: o.shipment?.billToParty || o.billToParty || '',
          materialHold: !!(o.shipment?.materialHold || o.materialHold),
          waitingPermit: !!(o.shipment?.waitingPermit || o.waitingPermit),
          consignorName: o.consignorName || '',
          consignorPin: o.consignorPin || '',
          consignorAddressLine1: o.consignorAddressLine1 || '',
          consignorAddressLine2: o.consignorAddressLine2 || '',
          consignorCity: o.consignorCity || '',
          consignorState: o.consignorState || '',
          consignorContactPerson: o.consignorContactPerson || '',
          consignorPhone: o.consignorPhone || '',
          consignorEmail: o.consignorEmail || '',
          consigneeName: o.consigneeName || '',
          consigneePin: o.consigneePin || '',
          consigneeAddressLine1: o.consigneeAddressLine1 || '',
          consigneeAddressLine2: o.consigneeAddressLine2 || '',
          consigneeCity: o.consigneeCity || '',
          consigneeState: o.consigneeState || '',
          consigneeContactPerson: o.consigneeContactPerson || '',
          consigneePhone: o.consigneePhone || '',
          consigneeEmail: o.consigneeEmail || '',
          serviceType: o.serviceType || 'SURFACE',
          appointmentDelivery: !!o.appointmentDelivery,
          carrierRisk: !!o.carrierRisk,
          ownersRisk: !!o.ownersRisk,
          mallDelivery: !!o.mallDelivery,
          actualWeight: o.actualWeight || '',
          paymentType: o.paymentType || 'PREPAID',
          codPayeeName: o.codPayeeName || '',
          codAmount: o.codAmount || '',
          invoiceValue: o.invoiceValue || '',
          invoiceNo: o.invoiceNo || '',
          invoiceDate: o.invoiceDate ? o.invoiceDate.split('T')[0] : '',
          ewayBillNo: o.ewayBillNo || '',
          hsnCode: o.hsnCode || '',
          quantity: o.quantity || '',
          notes: o.notes || '',
        }));
      })
      .catch(() => setError('Order not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

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

  const handleServiceCheck = (name) => {
    setBooking(prev => {
      const next = { ...prev, [name]: !prev[name] };
      if (name === 'carrierRisk' && next.carrierRisk) next.ownersRisk = false;
      if (name === 'ownersRisk' && next.ownersRisk) next.carrierRisk = false;
      return next;
    });
  };

  const setPkgRow = (i, k, v) => setPackageRows(rows => rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const addPkgRow = () => setPackageRows(rows => [...rows, emptyPkgRow()]);
  const removePkgRow = (i) => setPackageRows(rows => rows.filter((_, idx) => idx !== i));

  const handleCheckRates = async () => {
    setRatesLoading(true); setRatesData(null);
    try {
      const { data } = await api.post(`/admin/orders/${id}/check-rates`, { partnerName: booking.partnerName });
      setRatesData(data.data.rates);
    } catch (err) {
      setBookingMsg({ type: 'error', text: err.response?.data?.message || 'Failed to fetch rates' });
    } finally { setRatesLoading(false); }
  };

  const handleBook = async () => {
    setBookingLoading(true); setBookingMsg({ type: '', text: '' });
    try {
      let fullDocketDate = booking.docketDate;
      if (booking.docketTime) {
        let [hours, minutes] = booking.docketTime.split(':').map(Number);
        if (booking.docketAmPm === 'PM' && hours !== 12) hours += 12;
        if (booking.docketAmPm === 'AM' && hours === 12) hours = 0;
        fullDocketDate = `${booking.docketDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
      }
      await api.post(`/admin/orders/${id}/assign`, { ...booking, docketDate: fullDocketDate, items: packageRows });
      setBookingMsg({ type: 'success', text: 'Shipment booked successfully with partner!' });
      fetchOrder();
    } catch (err) {
      setBookingMsg({ type: 'error', text: err.response?.data?.message || 'Booking failed' });
    } finally { setBookingLoading(false); }
  };

  const handleAddTracking = async e => {
    e.preventDefault(); setTrackLoading(true);
    try {
      await api.post(`/admin/orders/${id}/tracking`, trackForm);
      setTrackForm({ status: '', description: '', location: '', timestamp: '' });
      fetchOrder();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add event');
    } finally { setTrackLoading(false); }
  };

  const handleStatusUpdate = async () => {
    setStatusLoading(true);
    try {
      await api.patch(`/admin/orders/${id}/status`, { status: statusValue });
      fetchOrder();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally { setStatusLoading(false); }
  };

  if (loading) return <PageLoader />;
  if (error || !order) return (
    <div className="card p-8 text-center text-zinc-500">
      {error}<br />
      <Link to="/admin/orders" className="btn-secondary mt-4 inline-flex">← Back</Link>
    </div>
  );

  const events = order.shipment?.trackingEvents || [];
  const isBooked = !!order.shipment?.bookedAt;

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
          {order.user && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Customer</p>
              <p className="font-semibold text-zinc-900">{order.user.company || order.user.name}</p>
              <p className="text-sm text-zinc-500">{order.user.email}</p>
              {order.user.phone && <p className="text-sm text-zinc-500">{order.user.phone}</p>}
              {order.user.gstin && <p className="text-xs text-zinc-400 mt-1">GSTIN: {order.user.gstin}</p>}
            </div>
          )}

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

          <div className="card p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Shipment Summary</p>
            <dl className="space-y-1 text-sm">
              {[
                ['Service', order.serviceType],
                ['Payment', order.paymentType?.replace(/_/g, ' ')],
                ['Weight', order.actualWeight ? `${order.actualWeight} kg` : null],
                ['Invoice Value', order.invoiceValue ? `₹${Number(order.invoiceValue).toLocaleString('en-IN')}` : null],
                ['E-Way Bill', order.ewayBillNo || null],
                ['Invoice No.', order.invoiceNo || null],
                ['Quantity', order.quantity || null],
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
                          {ev.location && (
                            <p className="flex items-center gap-1 text-xs text-zinc-400">
                              <MapPinIcon className="h-3 w-3 shrink-0" /> {ev.location}
                            </p>
                          )}
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
              {isBooked && (
                <span className="inline-flex items-center gap-1.5 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                  <CheckIcon className="h-3.5 w-3.5" /> Booked via {order.shipment.partnerName?.replace('_', ' ')}
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

            <hr className="border-zinc-100" />

            {/* Invoice & Commercial Details */}
            <div className="border-l-4 border-blue-400 pl-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Invoice &amp; Commercial Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">a. Invoice Value (₹)</label>
                  <input type="number" name="invoiceValue" value={booking.invoiceValue} onChange={handleBookingChange}
                    placeholder="0.00" step="0.01" min="0" className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">b. E-Way Bill No.</label>
                  <input type="text" name="ewayBillNo" value={booking.ewayBillNo} onChange={handleBookingChange}
                    placeholder="12-digit number" className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">c. HSN Code</label>
                  <input type="text" name="hsnCode" value={booking.hsnCode} onChange={handleBookingChange}
                    placeholder="e.g. 6203" className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">d. Invoice Date</label>
                  <input type="date" name="invoiceDate" value={booking.invoiceDate} onChange={handleBookingChange} className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">e. Invoice No.</label>
                  <input type="text" name="invoiceNo" value={booking.invoiceNo} onChange={handleBookingChange}
                    placeholder="e.g. INV-2024-001" className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">f. COD Amount (₹)</label>
                  <input type="number" name="codAmount" value={booking.codAmount} onChange={handleBookingChange}
                    placeholder="0.00" step="0.01" min="0" className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">g. Quantity</label>
                  <input type="number" name="quantity" value={booking.quantity} onChange={handleBookingChange}
                    placeholder="No. of items" min="1" className="input text-sm" />
                </div>
              </div>
            </div>

            {/* Partner Docket # */}
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Partner Docket # <span className="text-red-500">*</span></label>
              <input type="text" name="partnerDocketNo" value={booking.partnerDocketNo} onChange={handleBookingChange}
                placeholder="Enter partner's pre-allocated docket number"
                className="input text-sm font-mono" />
            </div>

            {/* Consignor + Consignee side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Consignor
                  <span className="ml-1 normal-case text-blue-500 font-normal text-xs">(pre-filled, edit if needed)</span>
                </p>
                {[
                  ['consignorName', 'Name / Company', 'text', 'Consignor name'],
                  ['consignorPin', 'PIN', 'text', 'PIN code'],
                  ['consignorAddressLine1', 'Address 1', 'text', 'Street, building'],
                  ['consignorAddressLine2', 'Address 2', 'text', 'Landmark (optional)'],
                  ['consignorCity', 'City', 'text', 'City'],
                  ['consignorState', 'State', 'text', 'State'],
                  ['consignorContactPerson', 'Contact Person', 'text', 'Authorized person'],
                  ['consignorPhone', 'Phone', 'text', 'Phone'],
                  ['consignorEmail', 'Email', 'email', 'Email'],
                ].map(([name, label, type, ph]) => (
                  <div key={name}>
                    <label className="block text-xs font-medium text-zinc-600 mb-0.5">{label}</label>
                    <input type={type} name={name} value={booking[name]} onChange={handleBookingChange} placeholder={ph} className="input text-xs" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Consignee
                  <span className="ml-1 normal-case text-blue-500 font-normal text-xs">(pre-filled, edit if needed)</span>
                </p>
                {[
                  ['consigneeName', 'Name / Company', 'text', 'Consignee name'],
                  ['consigneePin', 'PIN', 'text', 'PIN code'],
                  ['consigneeAddressLine1', 'Address 1', 'text', 'Street, building'],
                  ['consigneeAddressLine2', 'Address 2', 'text', 'Landmark (optional)'],
                  ['consigneeCity', 'City', 'text', 'City'],
                  ['consigneeState', 'State', 'text', 'State'],
                  ['consigneeContactPerson', 'Contact Person', 'text', 'Authorized person'],
                  ['consigneePhone', 'Phone', 'text', 'Phone'],
                  ['consigneeEmail', 'Email', 'email', 'Email'],
                ].map(([name, label, type, ph]) => (
                  <div key={name}>
                    <label className="block text-xs font-medium text-zinc-600 mb-0.5">{label}</label>
                    <input type={type} name={name} value={booking[name]} onChange={handleBookingChange} placeholder={ph} className="input text-xs" />
                  </div>
                ))}
              </div>
            </div>

            {/* Service + Checkboxes */}
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Service</label>
              <select name="serviceType" value={booking.serviceType} onChange={handleBookingChange} className="input text-sm mb-3">
                {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['appointmentDelivery', 'Appointment Delivery'],
                  ['carrierRisk', 'Carrier Risk'],
                  ['ownersRisk', "Owner's Risk"],
                  ['mallDelivery', 'Mall Delivery'],
                ].map(([name, label]) => (
                  <label key={name} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-600">
                    <input type="checkbox" checked={booking[name]} onChange={() => handleServiceCheck(name)} className="w-4 h-4 rounded border-zinc-300 accent-red-600" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Actual Weight */}
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Actual Weight (kg)</label>
              <input type="number" name="actualWeight" value={booking.actualWeight} onChange={handleBookingChange}
                placeholder="0.00" step="0.01" min="0" className="input text-sm w-40" />
            </div>

            {/* Package Rows */}
            <div className="border-l-4 border-green-400 pl-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Package Details</p>
                <button type="button" onClick={addPkgRow}
                  className="text-xs font-medium text-green-600 hover:text-green-700 border border-green-300 rounded px-2 py-0.5 hover:bg-green-50">
                  + Add Row
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      {['Description', 'Ref', 'Pkgs', 'Type', 'Wt(kg)', 'L', 'W', 'H', 'Unit', ''].map(h => (
                        <th key={h} className="pb-1.5 text-left font-medium text-zinc-400 pr-1.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {packageRows.map((row, i) => (
                      <tr key={i} className="border-b border-zinc-50">
                        <td className="pr-1.5 py-1"><input value={row.description} onChange={e => setPkgRow(i, 'description', e.target.value)} placeholder="Contents" className="input text-xs w-24" /></td>
                        <td className="pr-1.5 py-1"><input value={row.reference} onChange={e => setPkgRow(i, 'reference', e.target.value)} placeholder="Ref" className="input text-xs w-16" /></td>
                        <td className="pr-1.5 py-1"><input type="number" value={row.packages} onChange={e => setPkgRow(i, 'packages', e.target.value)} placeholder="1" min="1" className="input text-xs w-10" /></td>
                        <td className="pr-1.5 py-1">
                          <select value={row.packagesType} onChange={e => setPkgRow(i, 'packagesType', e.target.value)} className="input text-xs w-20">
                            {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td className="pr-1.5 py-1"><input type="number" value={row.unitWeight} onChange={e => setPkgRow(i, 'unitWeight', e.target.value)} placeholder="0.0" step="0.01" className="input text-xs w-14" /></td>
                        <td className="pr-1.5 py-1"><input type="number" value={row.dimensionL} onChange={e => setPkgRow(i, 'dimensionL', e.target.value)} placeholder="L" step="0.1" className="input text-xs w-12" /></td>
                        <td className="pr-1.5 py-1"><input type="number" value={row.dimensionW} onChange={e => setPkgRow(i, 'dimensionW', e.target.value)} placeholder="W" step="0.1" className="input text-xs w-12" /></td>
                        <td className="pr-1.5 py-1"><input type="number" value={row.dimensionH} onChange={e => setPkgRow(i, 'dimensionH', e.target.value)} placeholder="H" step="0.1" className="input text-xs w-12" /></td>
                        <td className="pr-1.5 py-1">
                          <select value={row.dimensionUnit} onChange={e => setPkgRow(i, 'dimensionUnit', e.target.value)} className="input text-xs w-14">
                            <option value="CMS">CM</option>
                            <option value="INCHES">IN</option>
                          </select>
                        </td>
                        <td className="py-1">
                          {packageRows.length > 1 && (
                            <button type="button" onClick={() => removePkgRow(i)} className="text-zinc-300 hover:text-red-500 transition-colors">
                              <XMarkIcon className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pickup Options */}
            <div>
              <p className="text-xs font-semibold text-zinc-600 mb-2">Pickup Options</p>
              <div className="flex gap-6">
                {PICKUP_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-600">
                    <input type="radio" name="pickupOption" value={opt} checked={booking.pickupOption === opt}
                      onChange={handleBookingChange} className="accent-red-600" />
                    {opt.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <p className="text-xs font-semibold text-zinc-600 mb-2">Payment Mode</p>
              <div className="flex flex-wrap gap-4">
                {PAYMENT_TYPES.map(pt => (
                  <label key={pt} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-600">
                    <input type="radio" name="paymentType" value={pt} checked={booking.paymentType === pt}
                      onChange={handleBookingChange} className="accent-red-600" />
                    {pt.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </div>

            {/* Bill To Party */}
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Bill To Party</label>
              <input type="text" name="billToParty" value={booking.billToParty} onChange={handleBookingChange}
                placeholder="Billing party name" className="input text-sm" />
            </div>

            {/* Docket Date + Time + AM/PM */}
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Docket Date</label>
              <div className="flex gap-2">
                <input type="date" name="docketDate" value={booking.docketDate} onChange={handleBookingChange} className="input text-sm flex-1" />
                <input type="time" name="docketTime" value={booking.docketTime} onChange={handleBookingChange} className="input text-sm w-28" />
                <select name="docketAmPm" value={booking.docketAmPm} onChange={handleBookingChange} className="input text-sm w-20">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            {/* Material Hold + Waiting Permits */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-600">
                <input type="checkbox" name="materialHold" checked={booking.materialHold} onChange={handleBookingChange} className="w-4 h-4 rounded accent-red-600" />
                Material Hold
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-600">
                <input type="checkbox" name="waitingPermit" checked={booking.waitingPermit} onChange={handleBookingChange} className="w-4 h-4 rounded accent-red-600" />
                Waiting for Permits
              </label>
            </div>

            {/* COD Payee + Delivery Code */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">COD Payee Name</label>
                <input type="text" name="codPayeeName" value={booking.codPayeeName}
                  placeholder="Linked to COD payment" className="input text-sm opacity-40 cursor-not-allowed" disabled />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Delivery Code</label>
                <input type="text" name="deliveryCode" value={booking.deliveryCode} onChange={handleBookingChange}
                  placeholder="OTP / delivery code" className="input text-sm" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Notes / Instructions</label>
              <textarea name="notes" value={booking.notes} onChange={handleBookingChange}
                rows={2} placeholder="Special handling instructions" className="input text-sm resize-none" />
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
                className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 border-2 border-blue-500 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors text-sm">
                <SearchIcon className="h-4 w-4" />
                {ratesLoading ? 'Checking…' : 'Check Rates'}
              </button>
              <button onClick={handleBook} disabled={bookingLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm">
                <SendIcon className="h-4 w-4" />
                {bookingLoading ? 'Booking…' : 'Book Shipment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
