import React, { useState } from 'react';
import { Sparkles, Check, X, BrainCircuit, ArrowRight, Loader2 } from 'lucide-react';
import { LearnedCorrection } from '../types';

interface TeachRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldKey: string;
  fieldLabel: string;
  originalValue: any;
  correctedValue: any;
  contextSnippet: string;
  onSaveRule: (correction: LearnedCorrection) => void;
}

export const TeachRuleModal: React.FC<TeachRuleModalProps> = ({
  isOpen,
  onClose,
  fieldKey,
  fieldLabel,
  originalValue,
  correctedValue,
  contextSnippet,
  onSaveRule,
}) => {
  const [ruleText, setRuleText] = useState('');
  const [patternMatch, setPatternMatch] = useState('');
  const [category, setCategory] = useState<'mapping' | 'formatting' | 'enrichment' | 'validation'>('mapping');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-generate rule on open if not already generated
  React.useEffect(() => {
    if (isOpen) {
      generateAiRule();
    } else {
      setHasGenerated(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const generateAiRule = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/learn-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldKey,
          fieldLabel,
          originalValue,
          correctedValue,
          contextSnippet,
        }),
      });
      const data = await res.json();
      if (data.rule) {
        setRuleText(data.rule);
        setPatternMatch(data.patternMatch || String(originalValue));
        setCategory(data.category || 'mapping');
        setHasGenerated(true);
      } else {
        // Fallback rule
        setRuleText(`When extracting ${fieldLabel}, map "${originalValue}" to "${correctedValue}"`);
        setPatternMatch(String(originalValue));
      }
    } catch (err: any) {
      console.warn('Fallback generating rule:', err);
      setRuleText(`When extracting ${fieldLabel}, map "${originalValue}" to "${correctedValue}"`);
      setPatternMatch(String(originalValue));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!ruleText.trim()) return;

    const newCorrection: LearnedCorrection = {
      id: `mem-${Date.now()}`,
      fieldKey,
      fieldLabel,
      originalValue,
      correctedValue,
      rule: ruleText.trim(),
      patternMatch: patternMatch.trim() || undefined,
      category,
      createdAt: new Date().toISOString().split('T')[0],
      appliedCount: 1,
    };

    onSaveRule(newCorrection);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Teach AI from Correction
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automate this decision so you never have to re-enter it manually.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Visual diff: Original -> Corrected */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Field: <span className="font-semibold text-slate-800 dark:text-slate-200">{fieldLabel}</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex-1 p-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded border border-red-200 dark:border-red-900/50 line-through">
                {String(originalValue || '(empty)')}
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-900/50 font-medium">
                {String(correctedValue || '(empty)')}
              </div>
            </div>
            {contextSnippet && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate pt-1">
                Context: &quot;{contextSnippet}&quot;
              </div>
            )}
          </div>

          {/* AI Learned Rule */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Synthesized Learning Rule
              </label>
              {isGenerating && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Formulating pattern...
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={ruleText}
              onChange={(e) => setRuleText(e.target.value)}
              placeholder="e.g. When vendor is Acme Corp, always set category to Cloud Hosting"
              className="w-full text-xs p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              This rule will be permanently saved to this recipe&apos;s memory bank and injected into all future extractions.
            </p>
          </div>

          {/* Optional Match Pattern */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Pattern Trigger Keyword
              </label>
              <input
                type="text"
                value={patternMatch}
                onChange={(e) => setPatternMatch(e.target.value)}
                placeholder="e.g. AWS|Cloudflare"
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Rule Category
              </label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              >
                <option value="mapping">Value Mapping</option>
                <option value="formatting">Formatting &amp; Cleaning</option>
                <option value="enrichment">Enrichment &amp; Lookup</option>
                <option value="validation">Validation Rule</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={generateAiRule}
            disabled={isGenerating}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Regenerate Rule
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!ruleText.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-md shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Save to Recipe Memory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
