import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ALL_PERMISSIONS = [
  'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
  'filings.view', 'filings.create', 'filings.edit', 'filings.delete',
  'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete',
  'agents.view', 'agents.manage', 'commissions.view', 'commissions.manage',
  'wallets.view', 'wallets.manage', 'products.manage',
  'users.manage', 'company.manage', 'reports.view'
];

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. User Types (Roles)
  const adminType = await prisma.userType.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'Full access — manage users, settings, and all modules',
      permissions: ALL_PERMISSIONS,
      is_system: true,
    },
  });

  const managerType = await prisma.userType.upsert({
    where: { name: 'Manager' },
    update: {},
    create: {
      name: 'Manager',
      description: 'Manage customers, filings, invoices, and agents',
      permissions: [
        'customers.view', 'customers.create', 'customers.edit',
        'filings.view', 'filings.create', 'filings.edit',
        'invoices.view', 'invoices.create', 'invoices.edit',
        'agents.view', 'commissions.view', 'wallets.view', 'reports.view'
      ],
      is_system: true,
    },
  });

  const agentType = await prisma.userType.upsert({
    where: { name: 'Agent' },
    update: {},
    create: {
      name: 'Agent',
      description: 'View assigned customers, commissions, and agent portal',
      permissions: ['agents.view', 'commissions.view'],
      is_system: true,
    },
  });

  const viewerType = await prisma.userType.upsert({
    where: { name: 'Viewer' },
    update: {},
    create: {
      name: 'Viewer',
      description: 'Read-only access to customer and filing reports',
      permissions: ['customers.view', 'filings.view', 'reports.view'],
      is_system: true,
    },
  });

  // 2. Admin User
  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@betterbooks.local' },
    update: {},
    create: {
      email: 'admin@betterbooks.local',
      name: 'System Administrator',
      password: passwordHash,
      role: 'admin',
      user_type_id: adminType.id,
      status: 'active',
      profile: {
        create: {
          permission_overrides: {},
        },
      },
    },
  });
  console.log(`✅ Admin user seeded: ${adminUser.email}`);

  // 3. Company Settings
  const existingSettings = await prisma.companySettings.findFirst();
  if (!existingSettings) {
    await prisma.companySettings.create({
      data: {
        company_name: 'Better Books Tax Consultancy LLC',
        address: 'Office 402, Business Bay, Dubai, United Arab Emirates',
        phone: '+971 4 123 4567',
        email: 'info@betterbooks.ae',
        website: 'https://betterbooks.ae',
        trn: '100234567800003',
        vat_enabled: true,
        vat_rate: 5.0,
        invoice_prefix: 'INV',
        invoice_payment_terms: '30',
        bank_name: 'Emirates NBD',
        bank_account_name: 'Better Books Tax Consultancy LLC',
        bank_account_number: '1012345678901',
        bank_iban: 'AE1202600001012345678901',
        invoice_footer_notes: 'Thank you for choosing Better Books.',
        invoice_terms_conditions: 'Payment is due within 30 days of invoice date.',
      },
    });
    console.log('✅ Company settings seeded');
  }

  // 4. Default Wallet
  const wallet = await prisma.wallet.upsert({
    where: { id: 'default-wallet-1' },
    update: {},
    create: {
      id: 'default-wallet-1',
      name: 'Main Business Account',
      bank_name: 'Emirates NBD',
      currency: 'AED',
      account_number: '1012345678901',
      iban: 'AE1202600001012345678901',
      balance: 50000.0,
      status: 'active',
    },
  });

  // 5. Products / Services
  const products = [
    { name: 'VAT Return Filing (Quarterly)', code: 'SRV-VAT-Q', type: 'service', price: 750, vat_rate: 5.0, description: 'Quarterly UAE VAT Return preparation, reconciliation, and FTA submission' },
    { name: 'Corporate Tax Registration', code: 'SRV-CT-REG', type: 'service', price: 1200, vat_rate: 5.0, description: 'Corporate Tax registration with Federal Tax Authority' },
    { name: 'Monthly Bookkeeping Service', code: 'SRV-BK-M', type: 'service', price: 1500, vat_rate: 5.0, description: 'Comprehensive monthly transaction posting, reconciliation & ledger maintenance' },
    { name: 'FTA Audit Representation', code: 'SRV-AUDIT', type: 'service', price: 3000, vat_rate: 5.0, description: 'Professional tax consultant representation for FTA tax audit compliance' },
  ];

  for (const prod of products) {
    await prisma.productService.upsert({
      where: { code: prod.code },
      update: {},
      create: prod,
    });
  }
  console.log('✅ Products & Services catalog seeded');

  // 6. Sample Agent
  const agentUser = await prisma.user.upsert({
    where: { email: 'agent.rashid@betterbooks.local' },
    update: {},
    create: {
      email: 'agent.rashid@betterbooks.local',
      name: 'Rashid Al Nuaimi',
      password: passwordHash,
      role: 'agent',
      user_type_id: agentType.id,
      status: 'active',
      agent: {
        create: {
          name: 'Rashid Al Nuaimi',
          email: 'agent.rashid@betterbooks.local',
          phone: '+971 50 123 4567',
          commission_type: 'percentage',
          commission_rate: 10.0,
          status: 'active',
        },
      },
    },
    include: { agent: true },
  });

  // 7. Sample Customers
  const customer1 = await prisma.customer.upsert({
    where: { id: 'sample-cust-1' },
    update: {},
    create: {
      id: 'sample-cust-1',
      name: 'Al Futtaim Trading LLC',
      company_name: 'Al Futtaim Trading LLC',
      trn: '100456789000003',
      email: 'finance@alfuttaim-sample.ae',
      mobile: '+971501112233',
      phone: '+97142223344',
      address: 'Al Garhoud, Dubai, UAE',
      city: 'Dubai',
      contact_person: 'Tariq Mansoor',
      filing_cycle: 'Jan-Apr-Jul-Oct',
      agent_id: agentUser.agent?.id,
      trade_license_number: 'CN-1029384',
      trade_license_expiry: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // expires in 25 days (Warning)
      status: 'active',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: 'sample-cust-2' },
    update: {},
    create: {
      id: 'sample-cust-2',
      name: 'Golden Oasis Contracting',
      company_name: 'Golden Oasis Contracting LLC',
      trn: '100789012300003',
      email: 'accounts@goldenoasis.ae',
      mobile: '+971559988776',
      address: 'Mussafah Industrial Area, Abu Dhabi, UAE',
      city: 'Abu Dhabi',
      contact_person: 'Fatima Zahra',
      filing_cycle: 'Feb-May-Aug-Nov',
      agent_id: agentUser.agent?.id,
      trade_license_number: 'TL-992831',
      trade_license_expiry: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // expires in 8 days (Critical)
      status: 'active',
    },
  });

  // 8. Sample Filing
  await prisma.filing.upsert({
    where: { id: 'sample-filing-1' },
    update: {},
    create: {
      id: 'sample-filing-1',
      customer_id: customer1.id,
      filing_month: 'January 2026',
      period_start: new Date('2025-10-01'),
      period_end: new Date('2025-12-31'),
      filing_date: new Date('2026-01-20'),
      due_date: new Date('2026-01-28'),
      sales_amount: 150000,
      sales_vat: 7500,
      expenses_amount: 60000,
      expenses_vat: 3000,
      net_vat_payable: 4500,
      vat_inclusive: false,
      status: 'filed',
    },
  });

  // Sample Milestones
  await prisma.filingMilestone.upsert({
    where: { customer_id_month_key: { customer_id: customer1.id, month_key: '2026-01' } },
    update: {},
    create: {
      customer_id: customer1.id,
      month_key: '2026-01',
      year: 2026,
      status: 'filed',
      filed_date: new Date('2026-01-20'),
    },
  });

  await prisma.filingMilestone.upsert({
    where: { customer_id_month_key: { customer_id: customer1.id, month_key: '2026-04' } },
    update: {},
    create: {
      customer_id: customer1.id,
      month_key: '2026-04',
      year: 2026,
      status: 'pending',
    },
  });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
