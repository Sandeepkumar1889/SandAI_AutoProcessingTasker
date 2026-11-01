import { AutomationRecipe, WebhookIntegrationConfig } from '../types';

export const INITIAL_RECIPES: AutomationRecipe[] = [
  {
    id: 'recipe-invoices',
    name: 'Daily Vendor Invoices & Receipts',
    description: 'Extracts invoice numbers, vendors, tax, totals, due dates and item categories from unstructured vendor emails, receipts or text slips.',
    category: 'Finance & Accounting',
    timesRun: 42,
    lastRunAt: 'Today at 09:15 AM',
    createdAt: '2026-10-15',
    updatedAt: '2026-10-30',
    confidenceThreshold: 85,
    customInstructions: 'If tax is omitted or zero, set tax to 0.00. Normalize all dates to YYYY-MM-DD. Clean amounts into raw numerical values.',
    rules: [
      'Standardize all currencies into USD amounts with 2 decimal places',
      'Format dates as ISO YYYY-MM-DD',
      'Ensure vendor name is title cased and sanitized of "LLC" or "Inc." if redundant'
    ],
    memoryCorrections: [
      {
        id: 'mem-1',
        fieldKey: 'category',
        fieldLabel: 'Category',
        originalValue: 'Office Supplies',
        correctedValue: 'Cloud Infrastructure',
        rule: 'When vendor is AWS, DigitalOcean or Cloudflare, always set category to Cloud Infrastructure',
        patternMatch: 'AWS|DigitalOcean|Cloudflare',
        category: 'mapping',
        createdAt: '2026-10-28',
        appliedCount: 19
      },
      {
        id: 'mem-2',
        fieldKey: 'payment_status',
        fieldLabel: 'Payment Status',
        originalValue: 'Pending',
        correctedValue: 'Paid',
        rule: 'When invoice mentions "Card ending in" or "Receipt for payment", mark Payment Status as Paid',
        patternMatch: 'Card ending|Receipt for payment',
        category: 'mapping',
        createdAt: '2026-10-29',
        appliedCount: 14
      }
    ],
    fields: [
      { id: 'f1', key: 'invoice_number', label: 'Invoice #', type: 'text', required: true, transformation: 'uppercase' },
      { id: 'f2', key: 'vendor_name', label: 'Vendor Name', type: 'text', required: true, transformation: 'titlecase' },
      { id: 'f3', key: 'invoice_date', label: 'Date', type: 'date', required: true },
      { id: 'f4', key: 'due_date', label: 'Due Date', type: 'date', required: false },
      { id: 'f5', key: 'total_amount', label: 'Total Amount', type: 'currency', required: true },
      { id: 'f6', key: 'tax_amount', label: 'Tax Amount', type: 'currency', required: false, defaultValue: '0.00' },
      { id: 'f7', key: 'category', label: 'Category', type: 'select', options: ['Cloud Infrastructure', 'Office Supplies', 'Marketing & Ads', 'Software Licenses', 'Consulting', 'Hardware'], required: true },
      { id: 'f8', key: 'payment_status', label: 'Status', type: 'select', options: ['Paid', 'Pending', 'Overdue'], required: true, defaultValue: 'Pending' }
    ],
    sampleInputs: [
      `Invoice INV-9042 from Amazon Web Services Inc.
Billing Date: Oct 24, 2026. Due date: Nov 15, 2026.
Charges: EC2 and S3 hosting storage services.
Subtotal: $420.50. Tax: $33.64. Total Due: $454.14.
Payment method: Card ending in 4099 processed successfully.`,
      `Got bill #NET-88123 from Cloudflare Inc dated 2026-10-28.
Enterprise DNS and DDoS edge protection for main app domain.
Total $250.00 zero tax. Due within 30 days on Nov 27, 2026. Status is pending bank ACH.`,
      `Receipt from Herman Miller Ergonomics, PO-30291.
Order Date: Oct 29, 2026. Delivered to Floor 4 HQ.
Two Aeron Chairs for developer workstation upgrades.
Amount $1,840.00 + sales tax $147.20 = $1,987.20. Paid via Corporate Amex.`
    ]
  },
  {
    id: 'recipe-leads',
    name: 'Sales Leads & Inbound Inquiries',
    description: 'Converts unstructured inquiry emails, website form submissions, and meeting transcripts into structured CRM lead entries ready for HubSpot / Salesforce.',
    category: 'Sales & CRM',
    timesRun: 28,
    lastRunAt: 'Yesterday at 04:30 PM',
    createdAt: '2026-10-18',
    updatedAt: '2026-10-29',
    confidenceThreshold: 80,
    customInstructions: 'Extract prospective company name, primary contact person, email address, estimated budget or deal size, and determine lead priority (Hot, Warm, Cold).',
    rules: [
      'Extract valid email addresses and lowercase them',
      'Format phone numbers as standard +1 (XXX) XXX-XXXX if present',
      'Assign Lead Priority: Hot if timeline is < 30 days or budget > $25k'
    ],
    memoryCorrections: [
      {
        id: 'mem-3',
        fieldKey: 'lead_priority',
        fieldLabel: 'Priority',
        originalValue: 'Warm',
        correctedValue: 'Hot',
        rule: 'Any lead requesting an urgent security review or SOC2 compliance timeline is always marked Hot',
        patternMatch: 'SOC2|security review',
        category: 'mapping',
        createdAt: '2026-10-25',
        appliedCount: 8
      }
    ],
    fields: [
      { id: 'fl1', key: 'company', label: 'Company Name', type: 'text', required: true, transformation: 'titlecase' },
      { id: 'fl2', key: 'contact_name', label: 'Contact Person', type: 'text', required: true, transformation: 'titlecase' },
      { id: 'fl3', key: 'email', label: 'Email Address', type: 'email', required: true, transformation: 'lowercase' },
      { id: 'fl4', key: 'budget_est', label: 'Budget ($)', type: 'currency', required: false },
      { id: 'fl5', key: 'priority', label: 'Priority', type: 'select', options: ['Hot', 'Warm', 'Cold'], required: true },
      { id: 'fl6', key: 'timeline', label: 'Timeline', type: 'select', options: ['Immediate (< 1 mo)', 'Q4 Target', 'Exploring for 2027'], required: false },
      { id: 'fl7', key: 'key_requirements', label: 'Requirements Summary', type: 'text', required: true }
    ],
    sampleInputs: [
      `Hey team, quick inquiry from Marcus Vance (Head of Ops at Apex Logix, email: m.vance@apexlogix.io).
They want to automate 1,200 daily courier slips and customs records.
Budget is around $35,000 annually. Need this implemented within the next 3 weeks for peak season.`,
      `Website inbound lead:
Name: Elena Rostova, VP Product at FinPulse Labs
Elena.R@finpulse.de
Looking for automated expense auditing for their 150 employees. Exploring vendor solutions for Q1 2027 rollout. Budget around $15,000.`
    ]
  },
  {
    id: 'recipe-support',
    name: 'Customer Service & Ticket Triage',
    description: 'Turns messy chat logs, Zendesk emails, and customer feedback into normalized ticket records with categorizations, sentiment, and action items.',
    category: 'Customer Support',
    timesRun: 65,
    lastRunAt: 'Today at 08:00 AM',
    createdAt: '2026-10-10',
    updatedAt: '2026-10-31',
    confidenceThreshold: 90,
    customInstructions: 'Classify ticket severity accurately. If payment or login failure is detected, escalate to Tier 2 support team.',
    rules: [
      'Extract order numbers matching format ORD-XXXX or #XXXX',
      'Classify issue type into Billing, Technical, Shipping, or General Inquiry'
    ],
    memoryCorrections: [],
    fields: [
      { id: 'fs1', key: 'ticket_id', label: 'Ref #', type: 'text', required: false, defaultValue: 'AUTO-GEN' },
      { id: 'fs2', key: 'customer_name', label: 'Customer', type: 'text', required: true },
      { id: 'fs3', key: 'issue_type', label: 'Issue Type', type: 'select', options: ['Billing', 'Bug/Technical', 'Account Login', 'Feature Request', 'Returns'], required: true },
      { id: 'fs4', key: 'severity', label: 'Severity', type: 'select', options: ['Urgent', 'High', 'Medium', 'Low'], required: true },
      { id: 'fs5', key: 'order_number', label: 'Order ID', type: 'text', required: false },
      { id: 'fs6', key: 'assigned_department', label: 'Department', type: 'select', options: ['Tier 1 Support', 'Tier 2 Engineering', 'Billing Dept', 'Returns Depot'], required: true },
      { id: 'fs7', key: 'action_required', label: 'Action Required', type: 'text', required: true }
    ],
    sampleInputs: [
      `Customer Sarah Jenkins called: "I tried checking out with order #ORD-77492 on Chrome mobile and the screen froze right after clicking submit payment. My credit card shows a pending $89 charge but no confirmation email arrived!"`,
      `Email from Dave Miller (dave@acmedesign.co): "Our whole team cannot log into the dashboard this morning. Error code 503 is flashing on screen. Need urgent fix as we have client presentations today."`
    ]
  }
];

export const INITIAL_WEBHOOKS: WebhookIntegrationConfig[] = [
  {
    id: 'wh-google-sheets',
    name: 'Google Sheets (Apps Script Webhook)',
    type: 'google_sheets',
    url: 'https://script.google.com/macros/s/AKfycbz_SAMPLE_URL/exec',
    method: 'POST',
    enabled: true,
    autoDispatchOnApprove: false,
    lastDispatchStatus: 'idle',
  },
  {
    id: 'wh-zapier',
    name: 'Zapier / Make Automation Catch Hook',
    type: 'zapier',
    url: 'https://hooks.zapier.com/hooks/catch/sample/123456/',
    method: 'POST',
    enabled: true,
    autoDispatchOnApprove: false,
    lastDispatchStatus: 'idle',
  },
  {
    id: 'wh-airtable',
    name: 'Airtable Webhook Intake',
    type: 'airtable',
    url: 'https://api.airtable.com/v0/appSample/tblDataEntry',
    method: 'POST',
    authHeaderKey: 'Authorization',
    authHeaderValue: 'Bearer patSampleToken',
    enabled: false,
    autoDispatchOnApprove: false,
    lastDispatchStatus: 'idle',
  }
];
