import React, { useState } from 'react';
import { 
  Share2, Copy, Check, ExternalLink, Send, 
  Terminal, Globe, FileSpreadsheet, Code2, AlertCircle, Loader2, Database
} from 'lucide-react';
import { AutomationRecipe, DataRecord, WebhookIntegrationConfig } from '../types';
import { recordsToCSV, recordsToTSV, recordsToJSON, downloadFile } from '../utils/exportUtils';

interface IntegrationsHubProps {
  webhooks: WebhookIntegrationConfig[];
  onUpdateWebhooks: (webhooks: WebhookIntegrationConfig[]) => void;
  recipes: AutomationRecipe[];
  selectedRecipeId: string;
  records: DataRecord[];
}

export const IntegrationsHub: React.FC<IntegrationsHubProps> = ({
  webhooks,
  onUpdateWebhooks,
  recipes,
  selectedRecipeId,
  records,
}) => {
  const currentRecipe = recipes.find(r => r.id === selectedRecipeId) || recipes[0];
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Webhook test state
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    statusCode?: number;
    durationMs?: number;
    responseBody?: any;
    error?: string;
  } | null>(null);

  // New webhook modal
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookType, setNewWebhookType] = useState<WebhookIntegrationConfig['type']>('custom_webhook');
  const [showAddWebhook, setShowAddWebhook] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Dispatch live webhook test
  const handleTestWebhook = async (wh: WebhookIntegrationConfig) => {
    setTestingWebhookId(wh.id);
    setTestResult(null);

    const testPayload = {
      event: 'data_entry_batch_completed',
      recipe: {
        id: currentRecipe.id,
        name: currentRecipe.name,
      },
      timestamp: new Date().toISOString(),
      entriesCount: records.length,
      records: records.slice(0, 5).map(r => ({
        id: r.id,
        confidence: r.confidence,
        values: r.values,
      })),
    };

    try {
      const res = await fetch('/api/integrations/dispatch-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: wh.url,
          method: wh.method,
          headers: wh.authHeaderKey && wh.authHeaderValue ? { [wh.authHeaderKey]: wh.authHeaderValue } : {},
          payload: testPayload,
        }),
      });

      const data = await res.json();
      setTestResult(data);

      // Update webhook last status
      const updated = webhooks.map(w => w.id === wh.id ? {
        ...w,
        lastDispatchStatus: data.success ? ('success' as const) : ('failed' as const),
        lastDispatchTime: new Date().toLocaleTimeString(),
      } : w);
      onUpdateWebhooks(updated);
    } catch (err: any) {
      setTestResult({
        success: false,
        statusCode: 500,
        error: err.message,
      });
    } finally {
      setTestingWebhookId(null);
    }
  };

  const handleAddWebhook = () => {
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) return;

    const newWh: WebhookIntegrationConfig = {
      id: `wh-${Date.now()}`,
      name: newWebhookName.trim(),
      url: newWebhookUrl.trim(),
      type: newWebhookType,
      method: 'POST',
      enabled: true,
      autoDispatchOnApprove: false,
      lastDispatchStatus: 'idle',
    };

    onUpdateWebhooks([...webhooks, newWh]);
    setNewWebhookName('');
    setNewWebhookUrl('');
    setShowAddWebhook(false);
  };

  const handleDeleteWebhook = (id: string) => {
    onUpdateWebhooks(webhooks.filter(w => w.id !== id));
  };

  // Google Apps Script Snippet for direct Google Sheets ingest
  const googleAppsScriptCode = `/**
 * Google Sheets Webhook Receiver for AutoEntry AI
 * Paste this in Extensions > Apps Script in your Google Sheet,
 * then click Deploy > New Deployment > Web App.
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var records = data.records || [];
    
    // Auto-create headers if sheet is empty
    if (sheet.getLastRow() === 0 && records.length > 0) {
      var headers = Object.keys(records[0].values);
      sheet.appendRow(headers);
    }
    
    // Append each structured data row
    records.forEach(function(item) {
      var row = Object.values(item.values);
      sheet.appendRow(row);
    });
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", added: records.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  // cURL snippet for automated daily batch ingestion via CLI or cron
  const curlSnippet = `curl -X POST "${window.location.origin}/api/ai/process-batch" \\
  -H "Content-Type: application/json" \\
  -d '{
    "rawInput": "Invoice INV-902 from Acme Corp dated 2026-10-31 total $450.00",
    "fields": ${JSON.stringify(currentRecipe.fields.map(f => ({ key: f.key, label: f.label, type: f.type })))},
    "customInstructions": "${currentRecipe.customInstructions}"
  }'`;

  // SQL Insert Statements
  const generateSqlInserts = () => {
    if (records.length === 0) return '-- No records currently loaded in Workbench';
    const tableName = currentRecipe.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const cols = currentRecipe.fields.map(f => f.key).join(', ');
    const lines = records.map(r => {
      const vals = currentRecipe.fields.map(f => {
        const val = r.values[f.key];
        if (val === undefined || val === null) return 'NULL';
        if (f.type === 'number' || f.type === 'currency') {
          const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
          return isNaN(num) ? 'NULL' : num;
        }
        return `'${String(val).replace(/'/g, "''")}'`;
      }).join(', ');
      return `INSERT INTO ${tableName} (${cols}) VALUES (${vals});`;
    });
    return lines.join('\n');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
          Ecosystem &amp; Integrations
        </span>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Connect with Google Sheets, Webhooks &amp; Popular Tools
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Send structured data seamlessly to spreadsheets, CRMs, Zapier, Make, Airtable, or internal databases.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: Google Sheets Direct Integration */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Google Sheets Integration
              </h3>
              <p className="text-xs text-slate-500">
                Direct cell clipboard copy or real-time Webhook Receiver.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              1. One-Click Clipboard Paste (Instant)
            </span>
            <p className="text-[11px] text-slate-500">
              Copies table data in native Tab-Separated Values (TSV). Simply open any Google Sheet or Excel workbook and press <kbd className="font-mono bg-white dark:bg-slate-700 px-1 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-[10px]">Ctrl + V</kbd> or <kbd className="font-mono bg-white dark:bg-slate-700 px-1 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-[10px]">Cmd + V</kbd>.
            </p>
            <button
              onClick={() => {
                const tsv = recordsToTSV(records, currentRecipe.fields);
                copyToClipboard(tsv, 'sheets-tsv');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 rounded-md transition-colors"
            >
              {copiedKey === 'sheets-tsv' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === 'sheets-tsv' ? 'Copied to Clipboard!' : `Copy ${records.length} Rows for Sheets`}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                2. Automated Live Google Apps Script Receiver
              </span>
              <button
                onClick={() => copyToClipboard(googleAppsScriptCode, 'apps-script')}
                className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1"
              >
                {copiedKey === 'apps-script' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedKey === 'apps-script' ? 'Copied Code' : 'Copy Apps Script'}
              </button>
            </div>
            <pre className="text-[11px] font-mono bg-slate-900 text-slate-200 p-3 rounded-lg overflow-x-auto max-h-48 border border-slate-800">
              {googleAppsScriptCode}
            </pre>
            <p className="text-[10px] text-slate-500">
              Paste this in Google Sheets: Extensions &gt; Apps Script &gt; Deploy as Web App. Copy the deployed URL and add it below as a Webhook!
            </p>
          </div>
        </div>

        {/* SECTION 2: Webhooks (Zapier, Make, Airtable, Slack) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Webhooks &amp; Automation Catch Hooks
                </h3>
                <p className="text-xs text-slate-500">
                  Trigger Zapier, Make, Airtable, Slack, or REST APIs.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAddWebhook(true)}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              + Add Webhook
            </button>
          </div>

          {/* Webhooks list */}
          <div className="space-y-3">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {wh.name}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                      {wh.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTestWebhook(wh)}
                      disabled={testingWebhookId === wh.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 rounded disabled:opacity-50"
                    >
                      {testingWebhookId === wh.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      Test Dispatch
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(wh.id)}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                  {wh.url}
                </div>

                {wh.lastDispatchStatus && wh.lastDispatchStatus !== 'idle' && (
                  <div className="text-[10px] flex items-center gap-2">
                    <span className={`font-semibold ${
                      wh.lastDispatchStatus === 'success' ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {wh.lastDispatchStatus === 'success' ? '✓ Dispatched Successfully' : '⚠ Last Dispatch Failed'}
                    </span>
                    {wh.lastDispatchTime && (
                      <span className="text-slate-400">at {wh.lastDispatchTime}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Test result display */}
          {testResult && (
            <div className={`p-3 rounded-lg border text-xs ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800 dark:text-red-300'
            }`}>
              <div className="font-semibold flex items-center justify-between mb-1">
                <span>Webhook Test Result: HTTP {testResult.statusCode}</span>
                {testResult.durationMs && <span className="font-mono">{testResult.durationMs}ms</span>}
              </div>
              <p className="text-[11px] font-mono truncate">
                {testResult.error || JSON.stringify(testResult.responseBody || 'Success response')}
              </p>
            </div>
          )}

          {/* Add Webhook Form */}
          {showAddWebhook && (
            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-emerald-300 dark:border-emerald-700 space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Add New Webhook Integration
              </span>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newWebhookName}
                  onChange={(e) => setNewWebhookName(e.target.value)}
                  placeholder="Webhook Name (e.g. Zapier Inbound Orders)"
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white"
                />
                <input
                  type="url"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  placeholder="Endpoint URL (https://...)"
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white font-mono"
                />
                <div className="flex items-center justify-between">
                  <select
                    value={newWebhookType}
                    onChange={(e: any) => setNewWebhookType(e.target.value)}
                    className="text-xs px-2 py-1 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white"
                  >
                    <option value="custom_webhook">Custom Webhook</option>
                    <option value="zapier">Zapier Hook</option>
                    <option value="make">Make.com Hook</option>
                    <option value="google_sheets">Google Sheets Apps Script</option>
                    <option value="airtable">Airtable API</option>
                    <option value="slack">Slack Incoming</option>
                  </select>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddWebhook(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddWebhook}
                      disabled={!newWebhookName || !newWebhookUrl}
                      className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded"
                    >
                      Save Webhook
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: Code & API Snippets (cURL / SQL / JSON) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Developer API &amp; Automated Pipeline Integration
              </h3>
              <p className="text-xs text-slate-500">
                Trigger this exact AI processing recipe from your CLI, bash scripts, or backend services.
              </p>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(curlSnippet, 'curl')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md"
          >
            {copiedKey === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey === 'curl' ? 'Copied cURL' : 'Copy cURL Command'}
          </button>
        </div>

        <pre className="text-[11px] font-mono bg-slate-900 text-slate-200 p-4 rounded-lg overflow-x-auto border border-slate-800 leading-relaxed">
          {curlSnippet}
        </pre>

        {/* Database SQL statements */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              SQL Insert Statements for Extracted Records ({records.length})
            </span>
            <button
              onClick={() => copyToClipboard(generateSqlInserts(), 'sql')}
              className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
            >
              {copiedKey === 'sql' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedKey === 'sql' ? 'Copied SQL' : 'Copy SQL Inserts'}
            </button>
          </div>
          <pre className="text-[11px] font-mono bg-slate-900 text-slate-200 p-3 rounded-lg overflow-x-auto max-h-36 border border-slate-800">
            {generateSqlInserts()}
          </pre>
        </div>
      </div>
    </div>
  );
};
