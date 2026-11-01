import React, { useState } from 'react';
import { Sparkles, Brain, Plus, Trash2, CheckCircle, ArrowRight, Loader2, Wand2, Lightbulb } from 'lucide-react';
import { AutomationRecipe, FieldDefinition, FieldType } from '../types';

interface PatternLearnerProps {
  onRecipeCreated: (recipe: AutomationRecipe) => void;
  onCancel: () => void;
}

const PRESET_SCENARIOS = [
  {
    title: 'Warehouse Logistics & Delivery Slips',
    goal: 'Extract delivery slips, driver notes, package condition, and recipient signatures from daily dispatch logs.',
    samples: [
      `Driver: Miguel Sanchez | Truck #402 | Date: Oct 30, 2026.
Delivered 14 pallets of electronics to BestBuy Distribution Bay 4.
PO Reference: PO-99821.
Condition: 1 pallet damaged packaging (reported to receiver Dave). Recipient signed: Dave Kowalski at 10:45 AM.`,
      `Truck 118 driven by Alicia Chen on 10/30/2026.
Dropping off cold storage medical supplies to St. Jude Hospital loading dock.
Shipment #MED-44102. Total 8 sealed crates.
Temperature log checked: -18C verified intact. Signed by Nurse Jackie at 08:30 AM.`
    ]
  },
  {
    title: 'Dental & Medical Clinic Patient Intake',
    goal: 'Normalize incoming daily patient intake notes into structured electronic records.',
    samples: [
      `New Patient: Robert Downey (DOB: 1984-05-12, Phone: 555-019-2831).
Insurance provider: Delta Dental Premier (Policy ID: DDL-882910).
Chief complaint: Tooth sensitivity on upper right molar for 4 days.
Emergency contact: Susan Downey (Spouse). Needs cleaning + x-ray exam scheduled.`,
      `Patient intake: Maya Patel, born March 3, 1992. Cell 415-555-9081.
Aetna Health PPO #AET-10293.
Reason for visit: Routine annual teeth cleaning and wisdom tooth consultation. No known drug allergies.`
    ]
  },
  {
    title: 'Freelance & Agency Expense Slips',
    goal: 'Process daily contractor receipts, software subscriptions, and travel expenses into tax-ready line items.',
    samples: [
      `Uber receipt on 10/29/2026 for client pitch meeting in downtown.
Ride total $42.50 plus $8.00 driver tip = $50.50. Paid via Visa 9912.
Client project: Apex Branding Campaign. Category: Travel/Transportation.`,
      `Adobe Creative Cloud monthly license renewal invoice #ADB-39120.
Billing date: Oct 28, 2026. $59.99 billed to business Mastercard.
Tax deduction category: Software & Subscriptions. Account email: studio@designflow.io.`
    ]
  }
];

export const PatternLearner: React.FC<PatternLearnerProps> = ({ onRecipeCreated, onCancel }) => {
  const [goalDescription, setGoalDescription] = useState('');
  const [sample1, setSample1] = useState('');
  const [sample2, setSample2] = useState('');
  const [sample3, setSample3] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result of analysis
  const [learnedResult, setLearnedResult] = useState<{
    name: string;
    description: string;
    confidence: number;
    fields: FieldDefinition[];
    rules: string[];
    summary: string;
  } | null>(null);

  const handleLoadScenario = (scenario: typeof PRESET_SCENARIOS[0]) => {
    setGoalDescription(scenario.goal);
    setSample1(scenario.samples[0] || '');
    setSample2(scenario.samples[1] || '');
    setSample3('');
    setError(null);
    setLearnedResult(null);
  };

  const handleAnalyzePattern = async () => {
    const samples = [sample1.trim(), sample2.trim(), sample3.trim()].filter(Boolean);
    if (samples.length === 0) {
      setError('Please provide at least one sample input (or load a preset scenario).');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/learn-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalDescription,
          samples,
        }),
      });

      if (!response.ok) {
        throw new Error('Pattern synthesis failed');
      }

      const data = await response.json();
      
      const fields: FieldDefinition[] = (data.fields || []).map((f: any, idx: number) => ({
        id: `field-${Date.now()}-${idx}`,
        key: f.key || `field_${idx}`,
        label: f.label || `Field ${idx + 1}`,
        type: (f.type as FieldType) || 'text',
        required: f.required ?? true,
        options: Array.isArray(f.options) && f.options.length > 0 ? f.options : undefined,
        description: f.description || '',
      }));

      setLearnedResult({
        name: data.name || 'Custom Daily Routine',
        description: data.description || 'Learned schema from daily samples',
        confidence: data.confidence || 95,
        fields,
        rules: data.rules || [
          'Normalize dates into YYYY-MM-DD',
          'Trim extra whitespace and sanitize special characters'
        ],
        summary: data.summary || 'Learned fields and rules from provided samples.',
      });
    } catch (err: any) {
      console.error('Error analyzing pattern:', err);
      setError(err.message || 'Could not synthesize pattern.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddField = () => {
    if (!learnedResult) return;
    const newField: FieldDefinition = {
      id: `field-${Date.now()}`,
      key: `custom_field_${learnedResult.fields.length + 1}`,
      label: `Custom Field ${learnedResult.fields.length + 1}`,
      type: 'text',
      required: false,
    };
    setLearnedResult({
      ...learnedResult,
      fields: [...learnedResult.fields, newField],
    });
  };

  const handleRemoveField = (id: string) => {
    if (!learnedResult) return;
    setLearnedResult({
      ...learnedResult,
      fields: learnedResult.fields.filter(f => f.id !== id),
    });
  };

  const handleSaveRecipe = () => {
    if (!learnedResult) return;
    const samples = [sample1.trim(), sample2.trim(), sample3.trim()].filter(Boolean);

    const recipe: AutomationRecipe = {
      id: `recipe-learned-${Date.now()}`,
      name: learnedResult.name,
      description: learnedResult.description,
      category: 'Learned Automation',
      fields: learnedResult.fields,
      rules: learnedResult.rules,
      customInstructions: 'Extract every distinct entry cleanly. Use learned normalization rules.',
      confidenceThreshold: 85,
      memoryCorrections: [],
      sampleInputs: samples,
      timesRun: 0,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    onRecipeCreated(recipe);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Intro Hero */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md">
              <Sparkles className="w-3.5 h-3.5" />
              AI Pattern Learner
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white pt-1">
              Teach AI Your Daily Repetitive Processing
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Never manually configure forms or complex regex rules. Just paste 2 or 3 examples of what you do every day (daily emails, notes, receipts, manifests). The AI automatically infers fields, formats, and creates an automated recipe.
            </p>
          </div>

          <div className="hidden sm:block text-right">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold ml-auto">
              <Brain className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Quick presets */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
            Try a Preset Daily Routine:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {PRESET_SCENARIOS.map((sc, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleLoadScenario(sc)}
                className="text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50/50 dark:hover:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  <span>{sc.title}</span>
                  <Wand2 className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {sc.goal}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Stage */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            1. Describe Your Daily Objective (Optional)
          </label>
          <input
            type="text"
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
            placeholder="e.g. Turn daily courier delivery slips into clean inventory shipment logs"
            className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            2. Paste 2 or 3 Real Sample Inputs From Your Daily Workflow
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-medium text-slate-500 mb-1 block">Sample 1 (Required)</span>
              <textarea
                rows={5}
                value={sample1}
                onChange={(e) => setSample1(e.target.value)}
                placeholder="Paste first raw email, message, slip, or log entry..."
                className="w-full text-xs font-mono p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 mb-1 block">Sample 2 (Recommended for contrast)</span>
              <textarea
                rows={5}
                value={sample2}
                onChange={(e) => setSample2(e.target.value)}
                placeholder="Paste second raw example showing different data or values..."
                className="w-full text-xs font-mono p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Gemini will compare recurring data structures, formats, and field bounds.
          </span>
          <button
            type="button"
            onClick={handleAnalyzePattern}
            disabled={isAnalyzing || !sample1.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Synthesizing Recipe...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Discover Pattern &amp; Create Recipe
              </>
            )}
          </button>
        </div>
      </div>

      {/* Synthesized Recipe Preview */}
      {learnedResult && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-emerald-300 dark:border-emerald-700/60 shadow-md space-y-5 animate-in fade-in duration-300">
          <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded font-mono">
                  {learnedResult.confidence}% Schema Confidence
                </span>
                <span className="text-xs text-slate-500">Synthesized Recipe</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {learnedResult.name}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {learnedResult.description}
              </p>
            </div>
            <button
              onClick={handleSaveRecipe}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Activate &amp; Launch in Workbench
            </button>
          </div>

          {/* Fields Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Discovered Data Fields ({learnedResult.fields.length})
              </span>
              <button
                type="button"
                onClick={handleAddField}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Field
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {learnedResult.fields.map((field) => (
                <div
                  key={field.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-1.5 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {field.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(field.id)}
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                      {field.type}
                    </span>
                    <span>{field.key}</span>
                  </div>
                  {field.options && field.options.length > 0 && (
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      Options: {field.options.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Inferred Normalization Rules */}
          {learnedResult.rules.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block mb-2">
                Inferred Data Cleaning &amp; Formatting Rules
              </span>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {learnedResult.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded border border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveRecipe}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Save Recipe &amp; Launch Workbench
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
