import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('demo123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'analyst@driftguard.io' },
    update: {},
    create: {
      email: 'analyst@driftguard.io',
      name: 'Alex Chen',
      role: 'analyst',
      passwordHash,
    },
  });

  console.log('✅ User created:', user.email);

  // Seed dataset 1: Orders & Revenue
  const dataset1 = await prisma.dataset.create({
    data: {
      name: 'Daily Orders & Revenue - Q2 2026',
      sourceName: 'orders_pipeline',
      rowCount: 30,
      columnNames: ['date', 'orders', 'revenue'],
      status: 'COMPLETED',
      healthScore: 72.5,
      uploadedBy: user.id,
    },
  });

  // Generate 30 days of data with some anomalies baked in
  const orderRows = [];
  const baseOrders = 1200;
  const baseRevenue = 34000;

  for (let i = 0; i < 30; i++) {
    const date = new Date('2026-04-01');
    date.setDate(date.getDate() + i);

    let orders = baseOrders + Math.floor(Math.random() * 100 - 50);
    let revenue = baseRevenue + Math.floor(Math.random() * 2000 - 1000);

    // Inject anomalies at specific points
    if (i === 10) { orders = 450; revenue = 11000; } // big drop
    if (i === 20) { orders = 2100; revenue = 62000; } // big spike
    if (i === 25) { orders = orders; revenue = 0; } // revenue missing

    orderRows.push({
      datasetId: dataset1.id,
      rowIndex: i,
      rowData: {
        date: date.toISOString().split('T')[0],
        orders: i === 25 ? null : orders,
        revenue: i === 25 ? null : revenue,
      },
    });
  }

  await prisma.dataRow.createMany({ data: orderRows });

  // Anomalies for dataset 1
  const anomaly1 = await prisma.anomaly.create({
    data: {
      datasetId: dataset1.id,
      type: 'Revenue Drop',
      severity: 'HIGH',
      message: 'Revenue dropped 67% below 7-day moving average on 2026-04-11',
      confidence: 0.94,
      columnName: 'revenue',
      rowIndex: 10,
      metadata: { zScore: -4.2, movingAvg: 33800, value: 11000 },
    },
  });

  const anomaly2 = await prisma.anomaly.create({
    data: {
      datasetId: dataset1.id,
      type: 'Order Spike',
      severity: 'MEDIUM',
      message: 'Orders 75% above 7-day average detected on 2026-04-21',
      confidence: 0.87,
      columnName: 'orders',
      rowIndex: 20,
      metadata: { zScore: 3.8, movingAvg: 1200, value: 2100 },
    },
  });

  const anomaly3 = await prisma.anomaly.create({
    data: {
      datasetId: dataset1.id,
      type: 'Missing Values',
      severity: 'HIGH',
      message: '2 columns have null values on row 26 (2026-04-26)',
      confidence: 1.0,
      columnName: 'revenue',
      rowIndex: 25,
      metadata: { affectedColumns: ['orders', 'revenue'] },
    },
  });

  // Alerts for dataset 1
  await prisma.alert.createMany({
    data: [
      {
        anomalyId: anomaly1.id,
        datasetId: dataset1.id,
        title: 'Revenue Drop: orders_pipeline',
        severity: 'HIGH',
      },
      {
        anomalyId: anomaly2.id,
        datasetId: dataset1.id,
        title: 'Order Spike Detected: orders_pipeline',
        severity: 'MEDIUM',
      },
      {
        anomalyId: anomaly3.id,
        datasetId: dataset1.id,
        title: 'Missing Values Found: orders_pipeline',
        severity: 'HIGH',
      },
    ],
  });

  // Seed dataset 2: User Signups
  const dataset2 = await prisma.dataset.create({
    data: {
      name: 'User Signups & Conversions - May 2026',
      sourceName: 'signup_funnel',
      rowCount: 19,
      columnNames: ['date', 'signups', 'conversions', 'conversion_rate'],
      status: 'COMPLETED',
      healthScore: 91.0,
      uploadedBy: user.id,
    },
  });

  const signupRows = [];
  for (let i = 0; i < 19; i++) {
    const date = new Date('2026-05-01');
    date.setDate(date.getDate() + i);
    const signups = 800 + Math.floor(Math.random() * 200);
    const conversions = Math.floor(signups * (0.12 + Math.random() * 0.05));
    signupRows.push({
      datasetId: dataset2.id,
      rowIndex: i,
      rowData: {
        date: date.toISOString().split('T')[0],
        signups,
        conversions,
        conversion_rate: parseFloat((conversions / signups).toFixed(4)),
      },
    });
  }
  await prisma.dataRow.createMany({ data: signupRows });

  const anomaly4 = await prisma.anomaly.create({
    data: {
      datasetId: dataset2.id,
      type: 'Conversion Drop',
      severity: 'MEDIUM',
      message: 'Conversion rate dropped 22% below 5-day average on 2026-05-08',
      confidence: 0.81,
      columnName: 'conversion_rate',
      rowIndex: 7,
      metadata: { zScore: -2.6, movingAvg: 0.145, value: 0.113 },
    },
  });

  await prisma.alert.create({
    data: {
      anomalyId: anomaly4.id,
      datasetId: dataset2.id,
      title: 'Conversion Rate Drop: signup_funnel',
      severity: 'MEDIUM',
    },
  });

  // Seed dataset 3: Ad Spend
  const dataset3 = await prisma.dataset.create({
    data: {
      name: 'Ad Spend & ROAS - Campaign Alpha',
      sourceName: 'marketing_pipeline',
      rowCount: 14,
      columnNames: ['date', 'spend', 'impressions', 'clicks', 'roas'],
      status: 'COMPLETED',
      healthScore: 88.0,
      uploadedBy: user.id,
    },
  });

  const adRows = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date('2026-05-05');
    date.setDate(date.getDate() + i);
    const spend = 5000 + Math.floor(Math.random() * 1000);
    const impressions = 100000 + Math.floor(Math.random() * 20000);
    const clicks = Math.floor(impressions * 0.025);
    const roas = parseFloat((2.5 + Math.random() * 0.8).toFixed(2));
    adRows.push({
      datasetId: dataset3.id,
      rowIndex: i,
      rowData: { date: date.toISOString().split('T')[0], spend, impressions, clicks, roas },
    });
  }
  await prisma.dataRow.createMany({ data: adRows });

  // Processing jobs
  await prisma.processingJob.createMany({
    data: [
      {
        datasetId: dataset1.id,
        bullJobId: 'bull-001',
        status: 'COMPLETED',
        progress: 100,
        startedAt: new Date(Date.now() - 300000),
        completedAt: new Date(Date.now() - 295000),
      },
      {
        datasetId: dataset2.id,
        bullJobId: 'bull-002',
        status: 'COMPLETED',
        progress: 100,
        startedAt: new Date(Date.now() - 200000),
        completedAt: new Date(Date.now() - 194000),
      },
      {
        datasetId: dataset3.id,
        bullJobId: 'bull-003',
        status: 'COMPLETED',
        progress: 100,
        startedAt: new Date(Date.now() - 100000),
        completedAt: new Date(Date.now() - 93000),
      },
    ],
  });

  console.log('✅ Seed complete!');
  console.log('📊 Datasets created:', 3);
  console.log('🔍 Anomalies created:', 4);
  console.log('🚨 Alerts created:', 4);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
