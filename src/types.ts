export type FieldType = 'text' | 'number' | 'currency' | 'date' | 'email' | 'select' | 'boolean';

export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'titlecase' | 'trim';

export interface FieldDefinition {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  description?: string;
  defaultValue?: string;
  transformation?: TextTransform;
}

export interface LearnedCorrection {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  originalValue: any;
  correctedValue: any;
  rule: string;
  patternMatch?: string;
  category?: string;
  createdAt: string;
  appliedCount: number;
}

export interface AutomationRecipe {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: FieldDefinition[];
  rules: string[];
  customInstructions: string;
  confidenceThreshold: number; // e.g. 85 for auto-approval
  memoryCorrections: LearnedCorrection[];
  sampleInputs: string[];
  timesRun: number;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataRecord {
  id: string;
  sourceSnippet: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'exported';
  values: Record<string, any>;
  flags: string[];
  createdAt: string;
  selected?: boolean;
}

export interface WebhookIntegrationConfig {
  id: string;
  name: string;
  type: 'google_sheets' | 'zapier' | 'make' | 'airtable' | 'slack' | 'custom_webhook';
  url: string;
  method: 'POST' | 'PUT';
  authHeaderKey?: string;
  authHeaderValue?: string;
  enabled: boolean;
  autoDispatchOnApprove: boolean;
  lastDispatchStatus?: 'success' | 'failed' | 'idle';
  lastDispatchTime?: string;
}

export interface DailyProcessingStats {
  todayEntriesProcessed: number;
  todayApprovedCount: number;
  totalTimeSavedMinutes: number;
  accuracyRatePercentage: number;
  activeAutomations: number;
}
