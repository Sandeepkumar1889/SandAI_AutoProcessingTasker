import React, { useState } from 'react';
import { Play, X, FileText, Upload, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { AutomationRecipe, DataRecord } from '../types';

interface BatchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: AutomationRecipe[];
  selectedRecipeId: string;
  onSelectRecipe: (id: string) => void;
  onBatchProcessed: (records: DataRecord[], stats: { timeSaved: number }) => void;
}

export const BatchDrawer: React.FC<BatchDrawerProps> = ({
  isOpen,
  onClose,
  recipes,
  selectedRecipeId,
  onSelectRecipe,
  onBatchProcessed,
}) => {
  const currentRecipe = recipes.find(r => r.id === selectedRecipeId) || recipes[0];
  const [rawText, setRawText] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync default custom instructions when recipe changes
  React.useEffect(() => {
    if (currentRecipe) {
      setCustomInstructions(currentRecipe.customInstructions || '');
    }
  }, [currentRecipe?.id]);

  const handleLoadSamples = () => {
    if (!currentRecipe || !currentRecipe.sampleInputs.length) return;
    setRawText(currentRecipe.sampleInputs.join('\n\n--- NEXT ENTRY ---\n\n'));
    setError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        setError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRunBatch = async () => {
    if (!rawText.trim()) {
      setError('Please provide unstructured text or load sample inputs to process.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/process-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawInput: rawText,
          fields: currentRecipe.fields,
          rules: currentRecipe.rules,
          customInstructions: customInstructions,
          memoryCorrections: currentRecipe.memoryCorrections,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Batch processing failed');
      }

      const result = await response.json();
      const recordsData = result.records || [];

      // Map to DataRecord
      const newRecords: DataRecord[] = recordsData.map((rec: any, idx: number) => {
        const confidence = rec.confidence || 90;
        const autoApproved = confidence >= (currentRecipe.confidenceThreshold || 85);
        return {
          id: `rec-${Date.now()}-${idx}`,
          sourceSnippet: rec.sourceSnippet || rawText.slice(0, 100),
          confidence,
          status: autoApproved ? 'approved' : 'pending',
          values: rec.values || {},
          flags: rec.flags || [],
          createdAt: new Date().toISOString(),
          selected: false,
        };
      });

      const timeSaved = result.stats?.timeSavedEstimateMinutes || Math.max(5, newRecords.length * 4);
      onBatchProcessed(newRecords, { timeSaved });
      onClose();
    } catch (err: any) {
      console.error('Batch error:', err);
      setError(err.message || 'An error occurred during batch processing.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Process Daily Batch
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Extract, clean, and normalize messy daily text into structured records.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Recipe Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Automation Recipe
            </label>
            <select
              value={selectedRecipeId}
              onChange={(e) => onSelectRecipe(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.category}) — {r.fields.length} fields
                </option>
              ))}
            </select>
            {currentRecipe && (
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{currentRecipe.fields.length} target fields</span>
                <span aria-hidden="true">·</span>
                <span>{currentRecipe.memoryCorrections?.length || 0} learned memory rules</span>
                <span aria-hidden="true">·</span>
                <span>Auto-approve at &ge;{currentRecipe.confidenceThreshold}%</span>
              </div>
            )}
          </div>

          {/* Input text area & actions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Raw Unstructured Input
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSamples}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <Sparkles className="w-3 h-3" />
                  Load Sample Batch
                </button>
                <label className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                  <Upload className="w-3 h-3" />
                  Upload File
                  <input
                    type="file"
                    accept=".txt,.csv,.json,.log"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <textarea
              rows={9}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw emails, vendor receipts, customer messages, shipping slips, or timesheet dumps here. You can paste multiple entries separated by lines or paragraphs..."
              className="w-full text-xs font-mono p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>{rawText.length} characters · {rawText ? rawText.trim().split(/\s+/).length : 0} words</span>
              <span>Multiple items separated automatically</span>
            </div>
          </div>

          {/* Custom Processing Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Specific Instructions for this Run (Optional)
            </label>
            <input
              type="text"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Set priority to Hot if budget > $20k; default country to US if missing"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Active learned rules indicator */}
          {currentRecipe?.memoryCorrections && currentRecipe.memoryCorrections.length > 0 && (
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40">
              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Active Learned Memory Rules ({currentRecipe.memoryCorrections.length})
              </div>
              <ul className="space-y-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                {currentRecipe.memoryCorrections.map((m) => (
                  <li key={m.id} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>{m.rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRunBatch}
            disabled={isLoading || !rawText.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing with Gemini...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Execute Automated Ingest
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
