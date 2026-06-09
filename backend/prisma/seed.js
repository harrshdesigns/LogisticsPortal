const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Initialize counters
  await prisma.counter.upsert({ where: { id: 'order' }, update: {}, create: { id: 'order', value: 0 } });
  await prisma.counter.upsert({ where: { id: 'invoice' }, update: {}, create: { id: 'invoice', value: 0 } });

  const hashedAdmin = await bcrypt.hash('Admin@123', 12);
  const hashedCustomer = await bcrypt.hash('Customer@123', 12);

  // Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@shipease.in' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@shipease.in',
      password: hashedAdmin,
      company: 'ShipEase',
      role: 'SUPER_ADMIN',
      phone: '9999999999',
    },
  });

  await prisma.adminRole.upsert({
    where: { userId: superAdmin.id },
    update: {},
    create: {
      userId: superAdmin.id,
      permissions: ['VIEW_ORDERS', 'ASSIGN_ORDERS', 'MANAGE_BILLING', 'VIEW_CUSTOMERS', 'MANAGE_TEAM', 'VIEW_MIS'],
    },
  });

  // Admin - Ops
  const opsAdmin = await prisma.user.upsert({
    where: { email: 'ops@shipease.in' },
    update: {},
    create: {
      name: 'Ops Admin',
      email: 'ops@shipease.in',
      password: hashedAdmin,
      company: 'ShipEase',
      role: 'ADMIN',
      phone: '9888888888',
    },
  });

  await prisma.adminRole.upsert({
    where: { userId: opsAdmin.id },
    update: {},
    create: {
      userId: opsAdmin.id,
      permissions: ['VIEW_ORDERS', 'ASSIGN_ORDERS', 'VIEW_CUSTOMERS'],
    },
  });

  // Admin - Billing
  const billingAdmin = await prisma.user.upsert({
    where: { email: 'billing@shipease.in' },
    update: {},
    create: {
      name: 'Billing Admin',
      email: 'billing@shipease.in',
      password: hashedAdmin,
      company: 'ShipEase',
      role: 'ADMIN',
      phone: '9777777777',
    },
  });

  await prisma.adminRole.upsert({
    where: { userId: billingAdmin.id },
    update: {},
    create: {
      userId: billingAdmin.id,
      permissions: ['VIEW_ORDERS', 'MANAGE_BILLING', 'VIEW_MIS'],
    },
  });

  // Customers
  const customers = [
    { name: 'Rajan Mehta', email: 'rajan@mehthatextiles.in', company: 'Mehta Textiles', gstin: '27AABCM1234F1Z5', phone: '9876543210' },
    { name: 'Priya Patel', email: 'priya@patelelectronics.in', company: 'Patel Electronics', gstin: '24AABCP5678G1Z3', phone: '9765432109' },
    { name: 'Gurpreet Singh', email: 'gurpreet@singhpharma.in', company: 'Singh Pharma', gstin: '07AABCS9012H1Z1', phone: '9654321098' },
  ];

  const createdCustomers = [];
  for (const c of customers) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: { ...c, password: hashedCustomer, role: 'CUSTOMER' },
    });
    createdCustomers.push(user);

    await prisma.address.create({
      data: {
        userId: user.id,
        label: 'Main Office',
        contactName: c.name,
        phone: c.phone,
        addressLine1: '123 Industrial Area',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        isDefault: true,
      },
    });
  }

  // Generate orders for each customer
  const statuses = ['PENDING', 'ASSIGNED', 'BOOKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERED', 'EXCEPTION', 'CANCELLED', 'PENDING'];
  const partners = ['DELHIVERY', 'DP_WORLD', 'VRL', 'DTDC', null, null];
  const commodities = ['Cotton Fabric', 'Electronic Components', 'Pharmaceutical Drugs', 'Garments', 'Mobile Accessories', 'Medical Supplies'];
  const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'];

  let orderCount = 0;
  let invoiceCount = 0;

  for (const customer of createdCustomers) {
    for (let i = 0; i < 10; i++) {
      orderCount++;
      const status = statuses[i % statuses.length];
      const partnerName = partners[i % partners.length];
      const docketNo = `CLT-2026-${String(orderCount).padStart(5, '0')}`;
      const createdAt = new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000);

      const pickupCity = cities[i % cities.length];
      const deliveryCity = cities[(i + 3) % cities.length];

      const order = await prisma.order.create({
        data: {
          clientDocketNo: docketNo,
          userId: customer.id,
          pickupAddressSnapshot: {
            contactName: customer.name,
            phone: customer.phone,
            addressLine1: `${100 + i} Main Road`,
            city: pickupCity,
            state: 'Maharashtra',
            pincode: '400001',
          },
          deliveryAddressSnapshot: {
            contactName: 'Receiver Name',
            phone: '9111111111',
            addressLine1: `${200 + i} Market Street`,
            city: deliveryCity,
            state: 'Delhi',
            pincode: '110001',
          },
          commodity: commodities[i % commodities.length],
          weight: parseFloat((Math.random() * 20 + 1).toFixed(2)),
          dimensions: { l: Math.floor(Math.random() * 50 + 10), w: Math.floor(Math.random() * 40 + 10), h: Math.floor(Math.random() * 30 + 5) },
          declaredValue: parseFloat((Math.random() * 10000 + 500).toFixed(2)),
          serviceType: ['SURFACE', 'AIR', 'EXPRESS'][i % 3],
          paymentType: ['PREPAID', 'COD', 'TO_PAY'][i % 3],
          status,
          createdAt,
          updatedAt: createdAt,
        },
      });

      // Create shipment for orders with a partner
      if (partnerName && ['ASSIGNED', 'BOOKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION'].includes(status)) {
        const prefixes = { DELHIVERY: 'DLVR', DP_WORLD: 'DPW', VRL: 'VRL', DTDC: 'DTDC' };
        const prefix = prefixes[partnerName];
        const partnerDocket = `${prefix}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        const shipment = await prisma.shipment.create({
          data: {
            orderId: order.id,
            partnerName,
            partnerDocketNo: partnerDocket,
            bookedAt: createdAt,
            bookedByAdminId: opsAdmin.id,
            bookingResponse: { success: true, partnerDocketNo: partnerDocket },
          },
        });

        // Tracking events for in-transit/delivered
        if (['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)) {
          const events = [
            { status: 'PICKED_UP', description: 'Shipment picked up from origin', location: pickupCity, hoursAgo: 72 },
            { status: 'IN_TRANSIT', description: 'Shipment in transit to hub', location: 'Nagpur', hoursAgo: 48 },
            { status: 'AT_HUB', description: 'Arrived at delivery hub', location: deliveryCity, hoursAgo: 24 },
          ];

          if (status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED') {
            events.push({ status: 'OUT_FOR_DELIVERY', description: 'Out for delivery', location: deliveryCity, hoursAgo: 8 });
          }
          if (status === 'DELIVERED') {
            events.push({ status: 'DELIVERED', description: 'Delivered successfully', location: deliveryCity, hoursAgo: 2 });
          }

          for (const ev of events) {
            await prisma.trackingEvent.create({
              data: {
                shipmentId: shipment.id,
                status: ev.status,
                description: ev.description,
                location: ev.location,
                timestamp: new Date(Date.now() - ev.hoursAgo * 3600 * 1000),
                source: 'API',
              },
            });
          }
        }
      }

      // Update counter
      await prisma.counter.update({ where: { id: 'order' }, data: { value: { increment: 1 } } });
    }

    // Create sample invoice for first two customers
    if (createdCustomers.indexOf(customer) < 2) {
      invoiceCount++;
      const invoiceNo = `INV-2026-${String(invoiceCount).padStart(5, '0')}`;
      const lineItems = [
        { docketNo: `CLT-2026-00001`, date: new Date().toISOString(), commodity: 'Cotton Fabric', weight: 5.5, serviceType: 'SURFACE', amount: 850 },
        { docketNo: `CLT-2026-00002`, date: new Date().toISOString(), commodity: 'Garments', weight: 3.2, serviceType: 'AIR', amount: 1200 },
      ];
      const subtotal = lineItems.reduce((s, l) => s + l.amount, 0);
      const tax = parseFloat((subtotal * 0.18).toFixed(2));

      await prisma.invoice.create({
        data: {
          invoiceNo,
          userId: customer.id,
          dateFrom: new Date(Date.now() - 30 * 24 * 3600 * 1000),
          dateTo: new Date(),
          lineItems,
          subtotal,
          tax,
          totalAmount: parseFloat((subtotal + tax).toFixed(2)),
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      await prisma.counter.update({ where: { id: 'invoice' }, data: { value: { increment: 1 } } });
    }
  }

  console.log('Seeding complete!');
  console.log('\nDemo Credentials:');
  console.log('Super Admin: superadmin@shipease.in / Admin@123');
  console.log('Ops Admin:   ops@shipease.in / Admin@123');
  console.log('Billing:     billing@shipease.in / Admin@123');
  console.log('Customer 1:  rajan@mehthatextiles.in / Customer@123');
  console.log('Customer 2:  priya@patelelectronics.in / Customer@123');
  console.log('Customer 3:  gurpreet@singhpharma.in / Customer@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
