const STATUS_CONFIG = {
  PENDING:          { label: 'Pending',          cls: 'bg-zinc-100 text-zinc-600' },
  ASSIGNED:         { label: 'Assigned',         cls: 'bg-blue-100 text-blue-700' },
  BOOKED:           { label: 'Booked',           cls: 'bg-indigo-100 text-indigo-700' },
  IN_TRANSIT:       { label: 'In Transit',       cls: 'bg-amber-100 text-amber-700' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', cls: 'bg-orange-100 text-orange-700' },
  DELIVERED:        { label: 'Delivered',        cls: 'bg-green-100 text-green-700' },
  EXCEPTION:        { label: 'Exception',        cls: 'bg-red-100 text-red-700' },
  CANCELLED:        { label: 'Cancelled',        cls: 'bg-zinc-100 text-zinc-500' },
  DRAFT:            { label: 'Draft',            cls: 'bg-zinc-100 text-zinc-600' },
  SENT:             { label: 'Sent',             cls: 'bg-blue-100 text-blue-700' },
  PAID:             { label: 'Paid',             cls: 'bg-green-100 text-green-700' },
}

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, cls: 'bg-zinc-100 text-zinc-600' }
  return (
    <span className={`badge ${config.cls}`}>{config.label}</span>
  )
}
