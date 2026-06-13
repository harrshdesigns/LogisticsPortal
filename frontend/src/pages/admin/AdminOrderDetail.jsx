import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import { PageLoader } from '../../components/shared/LoadingSpinner';
import { MapPinIcon, SearchIcon, SendIcon, CheckIcon, XMarkIcon, ReceiptIcon } from '../../components/shared/Icons';
import { printDocket } from '../../utils/printDocket';

const PARTNERS = ['DELHIVERY', 'DP_WORLD', 'VRL', 'DTDC', 'MANUAL'];
const ALL_STATUSES = ['PENDING','ASSIGNED','BOOKED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','EXCEPTION','CANCELLED'];
const PAYMENT_TYPES = ['PREPAID', 'TO_PAY', 'TO_BILL', 'COD'];
const SERVICE_TYPES = ['SURFACE', 'AIR', 'WATER', 'EXPRESS'];
const PACKAGE_TYPES = ['PACKAGES', 'BOXES', 'BAGS', 'PACKETS'];
const PICKUP_OPTIONS = ['PICKUP_FROM_CONSIGNOR', 'DROP_AT_BRANCH'];

const emptyPkgRow = () => ({ description: '', reference: '', packages: '', packagesType: 'BAGS', unitWeight: '', dimensionL: '', dimensionW: '', dimensionH: '', dimensionUnit: 'CMS' });

const INTERNAL_EVENT_PATTERN = /charge|invoice updated|label.{0,15}print/i;

function customerVisibleEvents(events = [], partnerDocketNo = null) {
  return events
    .filter(ev => !INTERNAL_EVENT_PATTERN.test(ev.description))
    .map(ev => {
      if (!partnerDocketNo) return ev;
      const cleaned = ev.description
        .replace(new RegExp(`\\b${partnerDocketNo}\\b`, 'g'), 'your shipment')
        .replace(/\bLR\b\s*/gi, '')
        .trim();
      return { ...ev, description: cleaned || ev.description };
    });
}

function fmtIST(utcStr) {
  if (!utcStr) return '—';
  const d = new Date(utcStr);
  if (isNaN(d)) return String(utcStr);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function fmtINR(val) {
  const n = parseFloat(val);
  if (val === null || val === undefined || val === '' || isNaN(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState({});
  const [error, setError] = useState('');

  const [packageRows, setPackageRows] = useState([emptyPkgRow()]);

  const [booking, setBooking] = useState({
    partnerName: 'DELHIVERY', loginId: '', partnerDocketNo: '',
    docketDate: new Date().toISOString().split('T')[0], docketTime: '', docketAmPm: 'AM',
    pickupOption: 'PICKUP_FROM_CONSIGNOR', billToParty: '',
    materialHold: false, waitingPermit: false, deliveryCode: '', codPayeeName: '',
    consignorName: '', consignorPin: '', consignorAddressLine1: '', consignorAddressLine2: '',
    consignorCity: '', consignorState: '', consignorContactPerson: '', consignorPhone: '', consignorEmail: '',
    consigneeName: '', consigneePin: '', consigneeAddressLine1: '', consigneeAddressLine2: '',
    consigneeCity: '', consigneeState: '', consigneeContactPerson: '', consigneePhone: '', consigneeEmail: '',
    serviceType: 'SURFACE', appointmentDelivery: false, carrierRisk: false, ownersRisk: false, mallDelivery: false,
    actualWeight: '', paymentType: 'PREPAID', codAmount: '',
    invoiceValue: '', invoiceNo: '', invoiceDate: '', ewayBillNo: '', hsnCode: '', quantity: '', notes: '',
  });
  const [ratesData, setRatesData] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMsg, setBookingMsg] = useState({ type: '', text: '' });

  const [trackForm, setTrackForm] = useState({ status: '', description: '', location: '', timestamp: '' });
  const [trackLoading, setTrackLoading] = useState(false);
  const [statusValue, setStatusValue] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const [liveDetail, setLiveDetail] = useState(null);
  const [liveDetailLoading, setLiveDetailLoading] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [chargesOpen, setChargesOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [dpwPrintLoading, setDpwPrintLoading] = useState(false);

  const fetchOrder = useCallback(() => {
    api.get(`/admin/orders/${id}`)
      .then(({ data }) => {
        const o = data.data.order;
        setOrder(o);
        setStatusValue(o.status);
        setPackageRows(o.items?.length
          ? o.items.map(item => ({
              description: item.description || '', reference: item.reference || '',
              packages: item.packages || '', packagesType: item.packagesType || 'BAGS',
              unitWeight: item.unitWeight || '', dimensionL: item.dimensionL || '',
              dimensionW: item.dimensionW || '', dimensionH: item.dimensionH || '',
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
          consignorName: o.consignorName || '', consignorPin: o.consignorPin || '',
          consignorAddressLine1: o.consignorAddressLine1 || '', consignorAddressLine2: o.consignorAddressLine2 || '',
          consignorCity: o.consignorCity || '', consignorState: o.consignorState || '',
          consignorContactPerson: o.consignorContactPerson || '',
          consignorPhone: o.consignorPhone || '', consignorEmail: o.consignorEmail || '',
          consigneeName: o.consigneeName || '', consigneePin: o.consigneePin || '',
          consigneeAddressLine1: o.consigneeAddressLine1 || '', consigneeAddressLine2: o.consigneeAddressLine2 || '',
          consigneeCity: o.consigneeCity || '', consigneeState: o.consigneeState || '',
          consigneeContactPerson: o.consigneeContactPerson || '',
          consigneePhone: o.consigneePhone || '', consigneeEmail: o.consigneeEmail || '',
          serviceType: o.serviceType || 'SURFACE',
          appointmentDelivery: !!o.appointmentDelivery, carrierRisk: !!o.carrierRisk,
          ownersRisk: !!o.ownersRisk, mallDelivery: !!o.mallDelivery,
          actualWeight: o.actualWeight || '', paymentType: o.paymentType || 'PREPAID',
          codPayeeName: o.codPayeeName || '', codAmount: o.codAmount || '',
          invoiceValue: o.invoiceValue || '', invoiceNo: o.invoiceNo || '',
          invoiceDate: o.invoiceDate ? o.invoiceDate.split('T')[0] : '',
          ewayBillNo: o.ewayBillNo || '', hsnCode: o.hsnCode || '',
          quantity: o.quantity || '', notes: o.notes || '',
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

  useEffect(() => {
    if (!order?.shipment?.bookedAt) return;
    if (order.shipment?.partnerName !== 'DP_WORLD') return;
    fetchLiveDetail();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.shipment?.bookedAt, id]);

  const handleBookingChange = e => {
    const { name, value, type, checked } = e.target;
    setBooking(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleServiceCheck = name => {
    setBooking(prev => {
      const next = { ...prev, [name]: !prev[name] };
      if (name === 'carrierRisk' && next.carrierRisk) next.ownersRisk = false;
      if (name === 'ownersRisk' && next.ownersRisk) next.carrierRisk = false;
      return next;
    });
  };

  const setPkgRow = (i, k, v) => setPackageRows(rows => rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const addPkgRow = () => setPackageRows(rows => [...rows, emptyPkgRow()]);
  const removePkgRow = i => setPackageRows(rows => rows.filter((_, idx) => idx !== i));

  const handleCheckRates = async () => {
    setRatesLoading(true); setRatesData(null); setBookingMsg({ type: '', text: '' });
    try {
      const { data } = await api.post(`/admin/orders/${id}/check-rates`, { ...booking, items: packageRows });
      setRatesData(data.data.rates);
    } catch (err) {
      const raw = err.response?.data?.data;
      setBookingMsg({ type: 'error', text: err.response?.data?.message || 'Failed to fetch rates', raw: raw ? JSON.stringify(raw, null, 2) : null });
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
      const { data } = await api.post(`/admin/orders/${id}/assign`, { ...booking, docketDate: fullDocketDate, items: packageRows });
      setBookingMsg({ type: 'success', text: 'Shipment booked successfully!', raw: data.data?.shipment?.bookingResponse ? JSON.stringify(data.data.shipment.bookingResponse, null, 2) : null });
      fetchOrder();
    } catch (err) {
      const raw = err.response?.data?.data;
      setBookingMsg({ type: 'error', text: err.response?.data?.message || 'Booking failed', raw: raw ? JSON.stringify(raw, null, 2) : null });
    } finally { setBookingLoading(false); }
  };

  const handleAddTracking = async e => {
    e.preventDefault(); setTrackLoading(true);
    try {
      await api.post(`/admin/orders/${id}/tracking`, trackForm);
      setTrackForm({ status: '', description: '', location: '', timestamp: '' });
      fetchOrder();
    } catch (err) { alert(err.response?.data?.message || 'Failed to add event'); }
    finally { setTrackLoading(false); }
  };

  const handleStatusUpdate = async () => {
    setStatusLoading(true);
    try { await api.patch(`/admin/orders/${id}/status`, { status: statusValue }); fetchOrder(); }
    catch (err) { alert(err.response?.data?.message || 'Failed to update status'); }
    finally { setStatusLoading(false); }
  };

  const fetchLiveDetail = () => {
    setLiveDetailLoading(true);
    api.get(`/admin/orders/${id}/live-detail`)
      .then(({ data }) => setLiveDetail(data.data.detail))
      .catch(() => setLiveDetail(null))
      .finally(() => setLiveDetailLoading(false));
  };

  const handleDPWorldPrint = async () => {
    setDpwPrintLoading(true);
    try {
      const { data } = await api.get(`/admin/orders/${id}/dpworld-print`);
      const { html, printUrl, requiresPortalLogin } = data.data;

      if (html) {
        // API key auth worked — open proxied HTML in new window, print triggers automatically
        const w = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
        if (w) { w.document.write(html); w.document.close(); }
      } else if (printUrl) {
        // Portal session required — open direct URL (admin must be logged into DP World portal)
        window.open(printUrl, '_blank');
        if (requiresPortalLogin) {
          alert('Opened DP World print page. If a login screen appears, please log in to the DP World ExpressTMS portal first, then try again.');
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Could not fetch DP World print');
    } finally {
      setDpwPrintLoading(false);
    }
  };

  const handleSyncTracking = async () => {
    setSyncLoading(true);
    setSyncMsg('');
    try {
      const { data } = await api.post(`/admin/orders/${id}/sync-tracking`);
      const added = data.data.newEvents;
      setSyncMsg(added > 0 ? `${added} new event${added !== 1 ? 's' : ''}` : 'Already up to date');
      fetchOrder();
      if (order?.shipment?.partnerName === 'DP_WORLD') fetchLiveDetail();
    } catch (err) {
      setSyncMsg(err.response?.data?.message || 'Sync failed');
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncMsg(''), 4000);
    }
  };

  if (loading) return <PageLoader />;
  if (error || !order) return (
    <div className="card p-8 text-center text-zinc-500">
      {error}<br /><Link to="/admin/orders" className="btn-secondary mt-4 inline-flex">← Back</Link>
    </div>
  );

  const allEvents = order.shipment?.trackingEvents || [];
  const partnerDocketNo = order.shipment?.partnerDocketNo || null;
  const custEvents = customerVisibleEvents(allEvents, partnerDocketNo);
  const isBooked = !!order.shipment?.bookedAt;
  const isDPWorld = order.shipment?.partnerName === 'DP_WORLD';

  const ld = liveDetail;
  const ldInvoice = ld?.consignment_invoices?.consignment_invoice?.[0];
  const ldReachedEvent = ld?.events?.find(e => e.event_type === 'REACHED_AT_PICKUP_BRANCH');
  const dpwInvoiceId = ld?.events?.find(e => e.event_type === 'INVOICE_UPDATED')?.description?.match(/invoice ID - (\d+)/i)?.[1] || null;
  const volumetricWeight = ld?.volume ? (parseFloat(ld.volume) * 6).toFixed(2) : null;

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
        {/* ── LEFT: Order Info + Customer Timeline ── */}
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
              ].filter(([, v]) => v).map(([k, v]) => (
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

          {/* Customer Timeline (filtered — what customer sees) */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <p className="text-xs font-semibold text-zinc-400 uppercase">Customer Timeline</p>
              {isBooked && (
                <div className="flex items-center gap-2">
                  {syncMsg && <span className="text-xs text-zinc-500 italic">{syncMsg}</span>}
                  <button onClick={handleSyncTracking} disabled={syncLoading}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50 disabled:opacity-50 transition-colors">
                    {syncLoading ? '…' : '↻ Refresh'}
                  </button>
                  <button onClick={() => printDocket(order, liveDetail, true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 border border-zinc-200 rounded px-2 py-1 hover:bg-zinc-50 transition-colors">
                    🖨 Print Docket
                  </button>
                </div>
              )}
            </div>
            {custEvents.length === 0 ? (
              <p className="text-sm text-zinc-400">No customer-visible events yet</p>
            ) : (
              <div>
                {custEvents.map((ev, i) => (
                  <div key={ev.id} className="flex gap-3 mb-2">
                    <div className="flex flex-col items-center">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center text-xs ${i === 0 ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-400'}`}>●</div>
                      {i < custEvents.length - 1 && <div className="w-0.5 flex-1 bg-zinc-200 my-1 min-h-3" />}
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
                        <p className="text-xs text-zinc-400 shrink-0">
                          {new Date(ev.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
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

        {/* ── RIGHT: Booking Form or Booked Info Blocks ── */}
        <div className="lg:col-span-3 space-y-4">
          {!isBooked ? (
            /* ── NOT BOOKED: full booking form ── */
            <div className="card p-5 space-y-5">
              <h3 className="text-sm font-semibold text-zinc-800">Assign &amp; Book with Partner</h3>

              {bookingMsg.text && (
                <div className={`rounded-lg text-sm ${bookingMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  <p className="p-3 font-medium">{bookingMsg.text}</p>
                  {bookingMsg.raw && (
                    <pre className={`px-3 pb-3 text-xs font-mono whitespace-pre-wrap break-all border-t ${bookingMsg.type === 'success' ? 'border-green-200 text-green-800' : 'border-red-200 text-red-800'}`}>
                      {bookingMsg.raw}
                    </pre>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Partner <span className="text-red-500">*</span></label>
                  <select name="partnerName" value={booking.partnerName} onChange={handleBookingChange} className="input text-sm">
                    {PARTNERS.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Login ID {credentials[booking.partnerName]?.loginId && <span className="ml-1 text-green-600">(auto-filled)</span>}
                  </label>
                  <input type="text" name="loginId" value={booking.loginId} onChange={handleBookingChange} placeholder="Partner login ID" className="input text-sm" />
                </div>
              </div>

              <hr className="border-zinc-100" />

              <div className="border-l-4 border-blue-400 pl-4">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Invoice &amp; Commercial Details</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['invoiceValue', 'a. Invoice Value (₹)', 'number', '0.00'],
                    ['ewayBillNo', 'b. E-Way Bill No.', 'text', '12-digit number'],
                    ['hsnCode', 'c. HSN Code', 'text', 'e.g. 6203'],
                    ['invoiceDate', 'd. Invoice Date', 'date', ''],
                    ['invoiceNo', 'e. Invoice No.', 'text', 'e.g. INV-2024-001'],
                    ['codAmount', 'f. COD Amount (₹)', 'number', '0.00'],
                    ['quantity', 'g. Quantity', 'number', 'No. of items'],
                  ].map(([name, label, type, ph]) => (
                    <div key={name}>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">{label}</label>
                      <input type={type} name={name} value={booking[name]} onChange={handleBookingChange}
                        placeholder={ph} className="input text-sm" {...(type === 'number' ? { step: '0.01', min: '0' } : {})} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Partner Docket # <span className="text-red-500">*</span></label>
                <input type="text" name="partnerDocketNo" value={booking.partnerDocketNo} onChange={handleBookingChange}
                  placeholder="Enter partner's pre-allocated docket number" className="input text-sm font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  ['consignor', 'Consignor'],
                  ['consignee', 'Consignee'],
                ].map(([prefix, title]) => (
                  <div key={prefix} className="space-y-2">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      {title} <span className="ml-1 normal-case text-blue-500 font-normal text-xs">(pre-filled)</span>
                    </p>
                    {[
                      [`${prefix}Name`, 'Name / Company', 'text', `${title} name`],
                      [`${prefix}Pin`, 'PIN', 'text', 'PIN code'],
                      [`${prefix}AddressLine1`, 'Address 1', 'text', 'Street, building'],
                      [`${prefix}AddressLine2`, 'Address 2', 'text', 'Landmark (optional)'],
                      [`${prefix}City`, 'City', 'text', 'City'],
                      [`${prefix}State`, 'State', 'text', 'State'],
                      [`${prefix}ContactPerson`, 'Contact Person', 'text', 'Authorized person'],
                      [`${prefix}Phone`, 'Phone', 'text', 'Phone'],
                      [`${prefix}Email`, 'Email', 'email', 'Email'],
                    ].map(([name, label, type, ph]) => (
                      <div key={name}>
                        <label className="block text-xs font-medium text-zinc-600 mb-0.5">{label}</label>
                        <input type={type} name={name} value={booking[name]} onChange={handleBookingChange} placeholder={ph} className="input text-xs" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Service</label>
                <select name="serviceType" value={booking.serviceType} onChange={handleBookingChange} className="input text-sm mb-3">
                  {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  {[['appointmentDelivery', 'Appointment Delivery'], ['carrierRisk', 'Carrier Risk'], ['ownersRisk', "Owner's Risk"], ['mallDelivery', 'Mall Delivery']].map(([name, label]) => (
                    <label key={name} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-600">
                      <input type="checkbox" checked={booking[name]} onChange={() => handleServiceCheck(name)} className="w-4 h-4 rounded border-zinc-300 accent-red-600" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Actual Weight (kg)</label>
                <input type="number" name="actualWeight" value={booking.actualWeight} onChange={handleBookingChange}
                  placeholder="0.00" step="0.01" min="0" className="input text-sm w-40" />
              </div>

              <div className="border-l-4 border-green-400 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Package Details</p>
                  <button type="button" onClick={addPkgRow} className="text-xs font-medium text-green-600 hover:text-green-700 border border-green-300 rounded px-2 py-0.5 hover:bg-green-50">
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

              <div>
                <p className="text-xs font-semibold text-zinc-600 mb-2">Pickup Options</p>
                <div className="flex gap-6">
                  {PICKUP_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-600">
                      <input type="radio" name="pickupOption" value={opt} checked={booking.pickupOption === opt} onChange={handleBookingChange} className="accent-red-600" />
                      {opt.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-zinc-600 mb-2">Payment Mode</p>
                <div className="flex flex-wrap gap-4">
                  {PAYMENT_TYPES.map(pt => (
                    <label key={pt} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-600">
                      <input type="radio" name="paymentType" value={pt} checked={booking.paymentType === pt} onChange={handleBookingChange} className="accent-red-600" />
                      {pt.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Bill To Party</label>
                <input type="text" name="billToParty" value={booking.billToParty} onChange={handleBookingChange} placeholder="Billing party name" className="input text-sm" />
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">COD Payee Name</label>
                  <input type="text" name="codPayeeName" value={booking.codPayeeName} placeholder="Linked to COD payment" className="input text-sm opacity-40 cursor-not-allowed" disabled />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Delivery Code</label>
                  <input type="text" name="deliveryCode" value={booking.deliveryCode} onChange={handleBookingChange} placeholder="OTP / delivery code" className="input text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Notes / Instructions</label>
                <textarea name="notes" value={booking.notes} onChange={handleBookingChange} rows={2} placeholder="Special handling instructions" className="input text-sm resize-none" />
              </div>

              {ratesData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                  <p className="px-4 pt-3 pb-2 text-xs font-semibold text-blue-700 flex items-center gap-2 flex-wrap">
                    <span>{ratesData.partner?.replace(/_/g, ' ')} — checked at {new Date(ratesData.checkedAt).toLocaleTimeString('en-IN')}</span>
                    {ratesData.draftId && <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-blue-800">Draft #{ratesData.draftId}</span>}
                  </p>
                  {(ratesData.deliveryBranch || ratesData.serviceOption) && (
                    <div className="px-4 pb-3 grid grid-cols-2 gap-3">
                      {ratesData.deliveryBranch && (
                        <div className="bg-white rounded border border-blue-200 px-3 py-2">
                          <p className="text-xs text-blue-500 font-medium mb-0.5">Delivery Branch</p>
                          <p className="text-sm font-semibold text-zinc-800">{ratesData.deliveryBranch}</p>
                        </div>
                      )}
                      {ratesData.serviceOption && (
                        <div className="bg-white rounded border border-blue-200 px-3 py-2">
                          <p className="text-xs text-blue-500 font-medium mb-0.5">Service Lane</p>
                          <p className="text-sm font-semibold text-zinc-800">{ratesData.serviceOption}</p>
                        </div>
                      )}
                      <p className="col-span-2 text-xs text-blue-600">DP World API confirms route only — pricing is billed separately per contract.</p>
                    </div>
                  )}
                  {ratesData.options && (
                    <div className="space-y-2 px-4 pb-3">
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
          ) : (
            /* ── BOOKED: info blocks ── */
            <>
              {/* Booked header */}
              <div className="card p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <CheckIcon className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-700">Booked via {order.shipment.partnerName?.replace(/_/g, ' ')}</span>
                  </div>
                  {order.shipment.bookedAt && <p className="text-xs text-zinc-400">{fmtIST(order.shipment.bookedAt)}</p>}
                  {order.shipment.bookedByAdmin && <p className="text-xs text-zinc-400">by {order.shipment.bookedByAdmin.name}</p>}
                </div>
                <div className="flex items-end gap-4 flex-wrap">
                  {isDPWorld && partnerDocketNo && (
                    <div className="text-right">
                      <p className="text-xs text-zinc-400 mb-0.5">LR Number <span className="bg-amber-100 text-amber-600 text-xs px-1.5 py-0.5 rounded ml-1">Admin Only</span></p>
                      <p className="text-xl font-mono font-bold text-zinc-900 tracking-wider">{partnerDocketNo}</p>
                    </div>
                  )}
                  {isDPWorld && partnerDocketNo && (
                    <button
                      onClick={handleDPWorldPrint}
                      disabled={dpwPrintLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {dpwPrintLoading ? (
                        <><div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Fetching…</>
                      ) : (
                        <>🖨 DP World Print</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Live data loading */}
              {liveDetailLoading && (
                <div className="card p-6 flex items-center justify-center gap-3 text-zinc-400 text-sm">
                  <div className="h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Fetching live data from DP World…
                </div>
              )}

              {/* Block 1: Invoice & Commercial */}
              {(ld || order.invoiceNo) && !liveDetailLoading && (
                <div className="card p-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Invoice &amp; Commercial</p>
                  <dl className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-zinc-400 mb-0.5">Product Invoice</dt>
                      <dd className="font-semibold text-blue-700">{ldInvoice?.invoice_number || order.invoiceNo || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-400 mb-0.5">E-Way Bill</dt>
                      <dd className="font-medium">{ldInvoice?.eway_bill_number || order.ewayBillNo || <span className="text-zinc-400 text-xs">Not required</span>}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-400 mb-0.5">Consignment Value</dt>
                      <dd className="font-medium">{fmtINR(ldInvoice?.invoice_value || order.invoiceValue)}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Block 2: Logistics */}
              {ld && !liveDetailLoading && (
                <div className="card p-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Logistics</p>
                  {ld.display_eta && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-500 font-medium mb-0.5">ETA</p>
                      <p className="text-xl font-bold text-blue-700">{ld.display_eta}</p>
                    </div>
                  )}
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {[
                      ['Docket Date', fmtIST(ld.ready_for_pickup_at || order.shipment.docketDate)],
                      ['Expected Pickup', fmtIST(ld.ready_for_pickup_at)],
                      ['Reached Pickup Branch', ldReachedEvent ? fmtIST(ldReachedEvent.occurred_at) : '—'],
                      ['Dispatch Date', fmtIST(ld.dispatch_date)],
                      ['Pickup Branch', ld.pickup_branch_facility_name || '—'],
                      ['Delivery Branch', ld.delivery_branch_facility_name || '—'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs text-zinc-400">{k}</dt>
                        <dd className="font-medium text-zinc-800 text-sm">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Block 3: Consignor (live) */}
              {ld && !liveDetailLoading && (
                <div className="card p-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Consignor (Live)</p>
                  <p className="font-semibold text-zinc-900">{ld.consignor_company_name}</p>
                  <p className="text-sm text-zinc-600 mt-0.5">{[ld.consignor_address_line1, ld.consignor_address_line2].filter(Boolean).join(', ')}</p>
                  <p className="text-sm text-zinc-600">{[ld.consignor_city, ld.consignor_state].filter(Boolean).join(', ')}{ld.consignor_pin ? ` – ${ld.consignor_pin}` : ''}</p>
                  {ld.consignor_phone && <p className="text-sm text-zinc-500 mt-0.5">{ld.consignor_phone}</p>}
                </div>
              )}

              {/* Block 4: Consignee (live) */}
              {ld && !liveDetailLoading && (
                <div className="card p-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Consignee (Live)</p>
                  <p className="font-semibold text-zinc-900">{ld.consignee_company_name}</p>
                  <p className="text-sm text-zinc-600 mt-0.5">{[ld.consignee_address_line1, ld.consignee_address_line2].filter(Boolean).join(', ')}</p>
                  <p className="text-sm text-zinc-600">{[ld.consignee_city, ld.consignee_state].filter(Boolean).join(', ')}{ld.consignee_pin ? ` – ${ld.consignee_pin}` : ''}</p>
                  {ld.consignee_phone && <p className="text-sm text-zinc-500 mt-0.5">{ld.consignee_phone}</p>}
                </div>
              )}

              {/* Block 5: Weight & Products */}
              {ld && !liveDetailLoading && (
                <div className="card p-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Weight &amp; Shipment</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      ['Billable Weight', `${ld.chargable_weight} Kgs`],
                      ['Total Units', ld.number_of_items || '—'],
                      ['Actual Weight', `${ld.weight} Kgs`],
                      ['Volumetric Weight', volumetricWeight ? `${volumetricWeight} Kgs` : '—'],
                      ['Volume', `${ld.volume} CFT`],
                      ['Billed Weight', `${ld.chargable_weight} Kgs`],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs text-zinc-400">{k}</p>
                        <p className="text-sm font-semibold text-zinc-800">{v}</p>
                      </div>
                    ))}
                  </div>
                  {ld.products?.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 border-y border-zinc-100">
                            {['Product Name', 'Reference', 'Units', 'Dimensions', 'Unit Weight'].map(h => (
                              <th key={h} className="text-left p-2 text-zinc-500 font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ld.products.map((p, i) => {
                            const dbItem = order.items?.[i];
                            const dims = dbItem && (dbItem.dimensionL || dbItem.dimensionW || dbItem.dimensionH)
                              ? `${dbItem.dimensionL || '?'}×${dbItem.dimensionW || '?'}×${dbItem.dimensionH || '?'} ${dbItem.dimensionUnit || 'CMS'}`
                              : '—';
                            return (
                              <tr key={i} className="border-b border-zinc-50">
                                <td className="p-2 font-medium text-zinc-800">{p.product_name}</td>
                                <td className="p-2 text-zinc-500">{dbItem?.reference || '—'}</td>
                                <td className="p-2">{p.units} {p.unit_type}</td>
                                <td className="p-2 text-zinc-500">{dims}</td>
                                <td className="p-2 text-zinc-500">{dbItem?.unitWeight ? `${dbItem.unitWeight} Kgs` : '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Block 6: Total Charge (collapsible) */}
              {ld && !liveDetailLoading && (
                <div className="card overflow-hidden">
                  <button onClick={() => setChargesOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <ReceiptIcon className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm font-semibold text-zinc-700">Total Charge</span>
                      <span className="text-lg font-bold text-zinc-900">{fmtINR(ld.total_charge)}</span>
                      {dpwInvoiceId && <span className="text-xs text-zinc-400 font-mono">#{dpwInvoiceId}</span>}
                    </div>
                    <span className="text-zinc-400 text-xs">{chargesOpen ? '▲' : '▼'}</span>
                  </button>
                  {chargesOpen && (
                    <div className="border-t border-zinc-100 px-4 py-3">
                      <dl className="space-y-2 text-sm">
                        {[
                          ['Payment Mode', (ld.payment_mode || '—').toUpperCase()],
                          ['Invoice #', ldInvoice?.invoice_number || order.invoiceNo || '—'],
                          ['DP World Invoice ID', dpwInvoiceId ? `#${dpwInvoiceId}` : '—'],
                          ['Balance To Pay', fmtINR(ld.balance_to_pay_amount)],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between items-center">
                            <dt className="text-zinc-400">{k}</dt>
                            <dd className="font-medium text-zinc-800">{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="text-xs text-zinc-400 mt-3 pt-2 border-t border-zinc-50">
                        Detailed charge breakdown (freight, fuel surcharge, GST, etc.) is available on the DP World ExpressTMS portal.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Events (all events, collapsible) */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-transparent hover:bg-zinc-50 transition-colors">
                  <button onClick={() => setEventsOpen(o => !o)} className="flex items-center gap-2 flex-1 text-left">
                    <span className="text-sm font-semibold text-zinc-700">All Events</span>
                    <span className="text-xs bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-full font-medium">{allEvents.length}</span>
                    <span className="text-xs text-zinc-400">(Admin View)</span>
                  </button>
                  <div className="flex items-center gap-2 ml-2">
                    <button onClick={handleSyncTracking} disabled={syncLoading}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50 disabled:opacity-50 transition-colors">
                      {syncLoading ? '…' : '↻ Refresh'}
                    </button>
                    <button onClick={() => setEventsOpen(o => !o)} className="text-zinc-400 text-xs">{eventsOpen ? '▲' : '▼'}</button>
                  </div>
                </div>
                {eventsOpen && (
                  <div className="border-t border-zinc-100">
                    {allEvents.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-zinc-400">No events yet.</p>
                    ) : (
                      <div className="divide-y divide-zinc-50 max-h-96 overflow-y-auto">
                        {allEvents.map(ev => (
                          <div key={ev.id} className="px-4 py-2.5 flex gap-4 text-xs">
                            <div className="flex-1 min-w-0">
                              <span className={`inline-block px-1.5 py-0.5 rounded font-medium mr-2 mb-0.5 ${
                                ev.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                ev.status === 'AT_HUB' ? 'bg-indigo-100 text-indigo-700' :
                                ev.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
                                ev.status === 'OUT_FOR_DELIVERY' ? 'bg-amber-100 text-amber-700' :
                                ev.status === 'EXCEPTION' ? 'bg-red-100 text-red-700' :
                                'bg-zinc-100 text-zinc-600'
                              }`}>
                                {ev.status.replace(/_/g, ' ')}
                              </span>
                              <span className="text-zinc-700 break-words">{ev.description}</span>
                              {ev.location && <span className="text-zinc-400 ml-1">@ {ev.location}</span>}
                            </div>
                            <div className="text-zinc-400 shrink-0 text-right whitespace-nowrap">
                              <p>{new Date(ev.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</p>
                              <span className={`text-xs ${ev.source === 'MANUAL' ? 'text-amber-500' : 'text-blue-400'}`}>{ev.source}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
