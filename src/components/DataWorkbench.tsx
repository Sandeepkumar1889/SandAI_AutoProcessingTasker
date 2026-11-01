import React, { useState } from 'react';
import { 
  Sparkles, Check, Trash2, Copy, Download, Share2, 
  Search, Eye, Edit3, AlertTriangle, 
  Plus, CheckCircle2, RefreshCw, ExternalLink
} from 'lucide-react';
import { AutomationRecipe, DataRecord, FieldDefinition, LearnedCorrection } from '../types';
import { recordsToCSV, recordsToTSV, downloadFile } from '../utils/exportUtils';
import { TeachRuleModal } from './TeachRuleModal';

interface DataWorkbenchProps {
  recipes: AutomationRecipe[];
  selectedRecipeId: string;
  onSelectRecipe: (id: string) => void;
  records: DataRecord[];
  setRecords: React.Dispatch<React.SetStateAction<DataRecord[]>>;
  onOpenBatchDrawer: () => void;
  onOpenLearner: () => void;
  onSaveLearnedRule: (recipeId: string, rule: LearnedCorrection) => void;
  onDispatchWebhook?: (records: DataRecord[]) => void;
}

export const DataWorkbench: React.FC<DataWorkbenchProps> = ({
  recipes,
  selectedRecipeId,
  onSelectRecipe,
  records,
  setRecords,
  onOpenBatchDrawer,
  onOpenLearner,
  onSaveLearnedRule,
  onDispatchWebhook,
}) => {
  const currentRecipe = recipes.find(r => r.id === selectedRecipeId) || recipes[0];
  
  // Filtering & search
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'flagged'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ recordId: string; fieldKey: string } | null>(null);
  const [tempCellValue, setTempCellValue] = useState<string>('');

  // Teach rule modal state
  const [teachModalState, setTeachModalState] = useState<{
    isOpen: boolean;
    fieldKey: string;
    fieldLabel: string;
    originalValue: any;
    correctedValue: any;
    contextSnippet: string;
  }>({
    isOpen: false,
    fieldKey: '',
    fieldLabel: '',
    originalValue: '',
    correctedValue: '',
    contextSnippet: '',
  });

  // Source inspection side drawer
  const [inspectingRecord, setInspectingRecord] = useState<DataRecord | null>(null);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered records
  const filteredRecords = records.filter(r => {
    if (statusFilter === 'pending' && r.status !== 'pending') return false;
    if (statusFilter === 'approved' && r.status !== 'approved') return false;
    if (statusFilter === 'flagged' && (!r.flags || r.flags.length === 0)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchValues = Object.values(r.values).some(v => 
        String(v || '').toLowerCase().includes(q)
      );
      const matchSnippet = r.sourceSnippet.toLowerCase().includes(q);
      return matchValues || matchSnippet;
    }
    return true;
  });

  const selectedRecords = records.filter(r => r.selected);
  const hasSelection = selectedRecords.length > 0;

  // Toggle select all
  const handleToggleSelectAll = () => {
    const allSelected = filteredRecords.every(r => r.selected);
    const updated = records.map(r => {
      const isInFiltered = filteredRecords.some(f => f.id === r.id);
      return isInFiltered ? { ...r, selected: !allSelected } : r;
    });
    setRecords(updated);
  };

  const handleToggleSelectOne = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
  };

  // Bulk actions
  const handleBulkApprove = () => {
    setRecords(prev => prev.map(r => r.selected ? { ...r, status: 'approved', selected: false } : r));
    showToast(`Approved ${selectedRecords.length} records`);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedRecords.length} selected record(s)?`)) {
      setRecords(prev => prev.filter(r => !r.selected));
      showToast(`Deleted ${selectedRecords.length} records`);
    }
  };

  // Copy to Google Sheets (TSV)
  const handleCopyForGoogleSheets = () => {
    const target = hasSelection ? selectedRecords : filteredRecords;
    if (target.length === 0) {
      showToast('No records to copy');
      return;
    }
    const tsv = recordsToTSV(target, currentRecipe.fields);
    navigator.clipboard.writeText(tsv);
    showToast(`Copied ${target.length} rows! Paste (Ctrl+V) directly into Google Sheets`);
  };

  // Export CSV
  const handleDownloadCSV = () => {
    const target = hasSelection ? selectedRecords : filteredRecords;
    if (target.length === 0) {
      showToast('No records to download');
      return;
    }
    const csv = recordsToCSV(target, currentRecipe.fields);
    const safeName = currentRecipe.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    downloadFile(csv, `${safeName}_export_${Date.now()}.csv`, 'text/csv');
    showToast(`Downloaded ${target.length} records as CSV`);
  };

  // Start cell edit
  const handleStartEdit = (recordId: string, fieldKey: string, currentValue: any) => {
    setEditingCell({ recordId, fieldKey });
    setTempCellValue(String(currentValue ?? ''));
  };

  // Commit cell edit
  const handleCommitEdit = (record: DataRecord, field: FieldDefinition) => {
    if (!editingCell) return;
    const original = record.values[field.key];
    const updatedVal = tempCellValue.trim();

    if (String(original ?? '') !== updatedVal) {
      // Update record
      setRecords(prev => prev.map(r => {
        if (r.id === record.id) {
          return {
            ...r,
            values: { ...r.values, [field.key]: updatedVal },
          };
        }
        return r;
      }));

      // Prompt to teach AI
      setTeachModalState({
        isOpen: true,
        fieldKey: field.key,
        fieldLabel: field.label,
        originalValue: original,
        correctedValue: updatedVal,
        contextSnippet: record.sourceSnippet,
      });
    }

    setEditingCell(null);
  };

  // Add manual empty record
  const handleAddManualRow = () => {
    const newRecord: DataRecord = {
      id: `rec-manual-${Date.now()}`,
      sourceSnippet: 'Manually added entry',
      confidence: 100,
      status: 'pending',
      values: {},
      flags: [],
      createdAt: new Date().toISOString(),
      selected: false,
    };
    currentRecipe.fields.forEach(f => {
      newRecord.values[f.key] = f.defaultValue || '';
    });
    setRecords([newRecord, ...records]);
    showToast('New manual entry added');
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg border border-slate-700 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Workspace Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Recipe Switcher */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Active Routine:
            </span>
            <div className="relative">
              <select
                value={selectedRecipeId}
                onChange={(e) => onSelectRecipe(e.target.value)}
                className="text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {recipes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={onOpenLearner}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Teach New Pattern
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleAddManualRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </button>
            <button
              onClick={handleCopyForGoogleSheets}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors whitespace-nowrap border border-emerald-200/60 dark:border-emerald-800/60"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy for Google Sheets
            </button>
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={onOpenBatchDrawer}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Run Batch Ingest
            </button>
          </div>
        </div>

        {/* Filters and Selection Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Segmented Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Records ({records.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === 'pending'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Needs Review ({records.filter(r => r.status === 'pending').length})
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === 'approved'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Approved ({records.filter(r => r.status === 'approved').length})
            </button>
            <button
              onClick={() => setStatusFilter('flagged')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === 'flagged'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Flagged ({records.filter(r => r.flags && r.flags.length > 0).length})
            </button>
          </div>

          {/* Search box & Bulk action buttons */}
          <div className="flex items-center gap-3">
            {hasSelection && (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-200/50 dark:border-emerald-900/40">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 tabular-nums">
                  {selectedRecords.length} selected
                </span>
                <button
                  onClick={handleBulkApprove}
                  className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  Approve All
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-2 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-100/60 rounded"
                >
                  Delete
                </button>
              </div>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search extracted data..."
                className="pl-8 pr-3 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48 sm:w-56"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              No entries found in this view
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Drop daily text, paste raw receipts or ticket logs, or load sample inputs to watch the AI automatically structure and normalize them.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={onOpenBatchDrawer}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Process Sample Batch
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="w-9 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={filteredRecords.length > 0 && filteredRecords.every(r => r.selected)}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3 whitespace-nowrap">Status</th>
                  <th className="px-3 py-3 whitespace-nowrap text-right">Confidence</th>
                  {currentRecipe.fields.map(field => (
                    <th
                      key={field.id}
                      className={`px-3 py-3 whitespace-nowrap ${
                        field.type === 'number' || field.type === 'currency' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <span>{field.label}</span>
                      <span className="ml-1 text-[10px] text-slate-400 font-normal lowercase font-mono">
                        ({field.type})
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filteredRecords.map((record) => {
                  const isPending = record.status === 'pending';
                  const isApproved = record.status === 'approved';
                  const hasFlags = record.flags && record.flags.length > 0;

                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        record.selected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="w-9 px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={!!record.selected}
                          onChange={() => handleToggleSelectOne(record.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setRecords(prev => prev.map(r => r.id === record.id ? {
                              ...r,
                              status: isApproved ? 'pending' : 'approved'
                            } : r));
                          }}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                            isApproved
                              ? 'bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200/70'
                              : 'bg-amber-100/70 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200/70'
                          }`}
                        >
                          {isApproved ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              Approved
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Review
                            </>
                          )}
                        </button>
                        {hasFlags && (
                          <span
                            title={record.flags.join(', ')}
                            className="ml-1.5 inline-flex items-center text-amber-500 cursor-help"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>

                      {/* Confidence */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono tabular-nums text-[11px]">
                        <span className={`font-semibold ${
                          record.confidence >= 85
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : record.confidence >= 70
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-500'
                        }`}>
                          {record.confidence}%
                        </span>
                      </td>

                      {/* Dynamic Field Values */}
                      {currentRecipe.fields.map(field => {
                        const val = record.values[field.key];
                        const isEditingThis = editingCell?.recordId === record.id && editingCell?.fieldKey === field.key;
                        const isNumberLike = field.type === 'number' || field.type === 'currency';

                        return (
                          <td
                            key={field.id}
                            className={`px-3 py-2.5 whitespace-nowrap max-w-xs truncate ${
                              isNumberLike ? 'text-right font-mono tabular-nums' : 'text-left'
                            }`}
                          >
                            {isEditingThis ? (
                              <input
                                autoFocus
                                type={field.type === 'date' ? 'date' : 'text'}
                                value={tempCellValue}
                                onChange={(e) => setTempCellValue(e.target.value)}
                                onBlur={() => handleCommitEdit(record, field)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCommitEdit(record, field);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-emerald-500 rounded text-xs text-slate-900 dark:text-white focus:outline-none ring-1 ring-emerald-500"
                              />
                            ) : (
                              <div
                                onClick={() => handleStartEdit(record.id, field.key, val)}
                                title="Click to edit value"
                                className="cursor-text hover:bg-slate-100 dark:hover:bg-slate-800/80 px-1.5 py-0.5 rounded transition-colors group relative flex items-center justify-between"
                              >
                                <span className={val ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 italic'}>
                                  {val !== undefined && val !== null && String(val).trim() !== ''
                                    ? (field.type === 'currency' ? (String(val).startsWith('$') ? val : `$${val}`) : String(val))
                                    : '—'}
                                </span>
                                <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Actions */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInspectingRecord(record)}
                            title="Inspect source snippet"
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setRecords(prev => prev.filter(r => r.id !== record.id));
                              showToast('Record deleted');
                            }}
                            title="Delete entry"
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side-by-Side Source Inspector Modal */}
      {inspectingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Source Inspection &amp; Extraction Verification
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Compare raw unstructured text directly with AI normalized fields.
                </p>
              </div>
              <button
                onClick={() => setInspectingRecord(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
              {/* Raw Source Text */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Original Source Snippet
                </span>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {inspectingRecord.sourceSnippet}
                </div>
                {inspectingRecord.flags && inspectingRecord.flags.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-semibold block mb-1">Detected Anomaly / Note:</span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {inspectingRecord.flags.map((flag, idx) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Extracted Values */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Extracted Fields &amp; Schema Mapping
                </span>
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/70 p-4 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  {currentRecipe.fields.map(f => (
                    <div key={f.id} className="flex items-center justify-between py-1.5 border-b border-slate-200/50 dark:border-slate-700/50 last:border-0 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">{f.label}:</span>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono">
                        {inspectingRecord.values[f.key] !== undefined && inspectingRecord.values[f.key] !== null
                          ? String(inspectingRecord.values[f.key])
                          : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Confidence: <strong className="text-emerald-600">{inspectingRecord.confidence}%</strong>
              </span>
              <button
                onClick={() => setInspectingRecord(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teach Rule Feedback Modal */}
      <TeachRuleModal
        isOpen={teachModalState.isOpen}
        onClose={() => setTeachModalState(prev => ({ ...prev, isOpen: false }))}
        fieldKey={teachModalState.fieldKey}
        fieldLabel={teachModalState.fieldLabel}
        originalValue={teachModalState.originalValue}
        correctedValue={teachModalState.correctedValue}
        contextSnippet={teachModalState.contextSnippet}
        onSaveRule={(correction) => {
          onSaveLearnedRule(currentRecipe.id, correction);
          showToast(`Saved learned rule: "${correction.rule.slice(0, 40)}..."`);
        }}
      />
    </div>
  );
};
