import React, { useState } from 'react';
import { 
  Sparkles, Plus, Trash2, Edit2, Check, X, 
  BrainCircuit, Sliders, Settings2, ShieldCheck, HelpCircle
} from 'lucide-react';
import { AutomationRecipe, FieldDefinition, FieldType, LearnedCorrection, TextTransform } from '../types';

interface RecipeManagerProps {
  recipes: AutomationRecipe[];
  onUpdateRecipe: (recipe: AutomationRecipe) => void;
  onCreateRecipe: (recipe: AutomationRecipe) => void;
  onDeleteRecipe: (recipeId: string) => void;
  selectedRecipeId: string;
  onSelectRecipe: (id: string) => void;
}

export const RecipeManager: React.FC<RecipeManagerProps> = ({
  recipes,
  onUpdateRecipe,
  onCreateRecipe,
  onDeleteRecipe,
  selectedRecipeId,
  onSelectRecipe,
}) => {
  const currentRecipe = recipes.find(r => r.id === selectedRecipeId) || recipes[0];
  const [activeTab, setActiveTab] = useState<'fields' | 'behavior' | 'memory'>('fields');

  // Editing field modal / state
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
  const [isNewField, setIsNewField] = useState(false);

  // New Memory Rule state
  const [newMemoryRule, setNewMemoryRule] = useState('');
  const [newMemoryPattern, setNewMemoryPattern] = useState('');
  const [newMemoryFieldKey, setNewMemoryFieldKey] = useState('');

  // Handle field update or creation
  const handleSaveField = (field: FieldDefinition) => {
    let updatedFields: FieldDefinition[];
    if (isNewField) {
      updatedFields = [...currentRecipe.fields, field];
    } else {
      updatedFields = currentRecipe.fields.map(f => f.id === field.id ? field : f);
    }

    onUpdateRecipe({
      ...currentRecipe,
      fields: updatedFields,
      updatedAt: new Date().toISOString().split('T')[0],
    });
    setEditingField(null);
  };

  const handleDeleteField = (fieldId: string) => {
    if (currentRecipe.fields.length <= 1) {
      alert('A recipe must have at least one field.');
      return;
    }
    const updatedFields = currentRecipe.fields.filter(f => f.id !== fieldId);
    onUpdateRecipe({
      ...currentRecipe,
      fields: updatedFields,
      updatedAt: new Date().toISOString().split('T')[0],
    });
  };

  // Add Manual Memory Rule
  const handleAddMemoryRule = () => {
    if (!newMemoryRule.trim()) return;

    const newCorrection: LearnedCorrection = {
      id: `mem-${Date.now()}`,
      fieldKey: newMemoryFieldKey || (currentRecipe.fields[0]?.key ?? 'general'),
      fieldLabel: currentRecipe.fields.find(f => f.key === newMemoryFieldKey)?.label || 'General',
      originalValue: 'Custom Rule',
      correctedValue: 'Learned Mapping',
      rule: newMemoryRule.trim(),
      patternMatch: newMemoryPattern.trim() || undefined,
      category: 'mapping',
      createdAt: new Date().toISOString().split('T')[0],
      appliedCount: 0,
    };

    onUpdateRecipe({
      ...currentRecipe,
      memoryCorrections: [newCorrection, ...(currentRecipe.memoryCorrections || [])],
      updatedAt: new Date().toISOString().split('T')[0],
    });

    setNewMemoryRule('');
    setNewMemoryPattern('');
  };

  const handleDeleteMemoryRule = (ruleId: string) => {
    onUpdateRecipe({
      ...currentRecipe,
      memoryCorrections: currentRecipe.memoryCorrections.filter(m => m.id !== ruleId),
      updatedAt: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header & Recipe Selector */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
            Customization Engine
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Automation Recipes, Schema &amp; Learning Memory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure schemas, transformation rules, confidence thresholds, and review adaptive memory.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedRecipeId}
            onChange={(e) => onSelectRecipe(e.target.value)}
            className="text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
          >
            {recipes.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.category})
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const newRecipe: AutomationRecipe = {
                id: `recipe-custom-${Date.now()}`,
                name: 'New Custom Recipe',
                description: 'Custom daily data processing template',
                category: 'Operations',
                fields: [
                  { id: `f-${Date.now()}-1`, key: 'item_name', label: 'Item Name', type: 'text', required: true },
                  { id: `f-${Date.now()}-2`, key: 'date', label: 'Date', type: 'date', required: true },
                  { id: `f-${Date.now()}-3`, key: 'amount', label: 'Amount', type: 'currency', required: false },
                ],
                rules: ['Normalize dates to YYYY-MM-DD'],
                customInstructions: 'Extract all entries cleanly.',
                confidenceThreshold: 85,
                memoryCorrections: [],
                sampleInputs: [],
                timesRun: 0,
                createdAt: new Date().toISOString().split('T')[0],
                updatedAt: new Date().toISOString().split('T')[0],
              };
              onCreateRecipe(newRecipe);
              onSelectRecipe(newRecipe.id);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            New Recipe
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('fields')}
          className={`pb-3 text-xs font-semibold px-2 transition-colors flex items-center gap-1.5 border-b-2 -mb-px ${
            activeTab === 'fields'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          Field Schema &amp; Types ({currentRecipe.fields.length})
        </button>
        <button
          onClick={() => setActiveTab('behavior')}
          className={`pb-3 text-xs font-semibold px-2 transition-colors flex items-center gap-1.5 border-b-2 -mb-px ${
            activeTab === 'behavior'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          AI Behavior &amp; Rules
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`pb-3 text-xs font-semibold px-2 transition-colors flex items-center gap-1.5 border-b-2 -mb-px ${
            activeTab === 'memory'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          Learned Memory Bank ({currentRecipe.memoryCorrections?.length || 0})
        </button>
      </div>

      {/* TAB 1: Field Schema Customizer */}
      {activeTab === 'fields' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Fields in &quot;{currentRecipe.name}&quot;
              </h3>
              <p className="text-xs text-slate-500">
                Define the columns and data types extracted for this daily routine.
              </p>
            </div>
            <button
              onClick={() => {
                setIsNewField(true);
                setEditingField({
                  id: `f-${Date.now()}`,
                  key: '',
                  label: '',
                  type: 'text',
                  required: false,
                  transformation: 'none',
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Field
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            {currentRecipe.fields.map((field) => (
              <div
                key={field.id}
                className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {field.label}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      ({field.key})
                    </span>
                    {field.required && (
                      <span className="text-[10px] bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">
                        Required
                      </span>
                    )}
                    {field.transformation && field.transformation !== 'none' && (
                      <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-mono">
                        {field.transformation}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Type:</span> {field.type}
                    {field.options && field.options.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Options: {field.options.join(', ')}</span>
                      </>
                    )}
                    {field.defaultValue && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Default: &quot;{field.defaultValue}&quot;</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setIsNewField(false);
                      setEditingField(field);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Edit Field"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteField(field.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Delete Field"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: AI Behavior & Rules */}
      {activeTab === 'behavior' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
          {/* Confidence Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white">
                Auto-Approval Confidence Threshold
              </label>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {currentRecipe.confidenceThreshold}%
              </span>
            </div>
            <input
              type="range"
              min={60}
              max={98}
              value={currentRecipe.confidenceThreshold}
              onChange={(e) => {
                onUpdateRecipe({
                  ...currentRecipe,
                  confidenceThreshold: parseInt(e.target.value, 10),
                });
              }}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Entries extracted with confidence score equal to or higher than {currentRecipe.confidenceThreshold}% are automatically marked as Approved for one-click export.
            </p>
          </div>

          {/* Custom Prompt Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 dark:text-white block">
              Custom AI Processing Instructions
            </label>
            <textarea
              rows={4}
              value={currentRecipe.customInstructions}
              onChange={(e) => {
                onUpdateRecipe({
                  ...currentRecipe,
                  customInstructions: e.target.value,
                });
              }}
              placeholder="e.g. Always normalize tax to 0 if not stated. If currency is in EUR or GBP, convert note to USD..."
              className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
            />
          </div>

          {/* General Normalization Rules */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 dark:text-white block">
              Active Normalization Rules
            </label>
            <ul className="space-y-1.5 text-xs">
              {currentRecipe.rules.map((rule, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700/60"
                >
                  <span className="text-slate-800 dark:text-slate-200">{rule}</span>
                  <button
                    onClick={() => {
                      const updatedRules = currentRecipe.rules.filter((_, i) => i !== idx);
                      onUpdateRecipe({ ...currentRecipe, rules: updatedRules });
                    }}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TAB 3: Learned Memory Bank */}
      {activeTab === 'memory' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-emerald-600" />
              Adaptive Learning Memory Bank
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Every time you correct an extracted field in the Data Workbench, the AI formulates a persistent rule. These rules are injected directly into Gemini&apos;s processing pipeline so the error never repeats.
            </p>
          </div>

          {/* Add Manual Memory Rule */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Add New Memory Rule Manually
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={newMemoryRule}
                  onChange={(e) => setNewMemoryRule(e.target.value)}
                  placeholder="e.g. When vendor is Acme Corp, always set category to Hardware"
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={newMemoryPattern}
                  onChange={(e) => setNewMemoryPattern(e.target.value)}
                  placeholder="Trigger word (e.g. Acme)"
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAddMemoryRule}
                disabled={!newMemoryRule.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-md shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Learning Rule
              </button>
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Current Learned Rules ({currentRecipe.memoryCorrections?.length || 0})
            </span>

            {(!currentRecipe.memoryCorrections || currentRecipe.memoryCorrections.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                No learned memory rules yet. When you edit cells in the Data Workbench, click &quot;Teach AI&quot; to auto-generate persistent memory.
              </div>
            ) : (
              <div className="space-y-2">
                {currentRecipe.memoryCorrections.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          {mem.rule}
                        </span>
                        {mem.patternMatch && (
                          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                            Match: &quot;{mem.patternMatch}&quot;
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Target: {mem.fieldLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>Applied {mem.appliedCount} times</span>
                        <span aria-hidden="true">·</span>
                        <span>Learned on {mem.createdAt}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteMemoryRule(mem.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Field Edit / Add Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isNewField ? 'Add New Field' : 'Edit Field'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Field Label
                </label>
                <input
                  type="text"
                  value={editingField.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    setEditingField({
                      ...editingField,
                      label,
                      key: isNewField ? key : editingField.key,
                    });
                  }}
                  placeholder="e.g. Due Date or Customer Email"
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Field Key (snake_case identifier)
                </label>
                <input
                  type="text"
                  value={editingField.key}
                  onChange={(e) => setEditingField({ ...editingField, key: e.target.value })}
                  placeholder="e.g. customer_email"
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data Type
                  </label>
                  <select
                    value={editingField.type}
                    onChange={(e) => setEditingField({ ...editingField, type: e.target.value as FieldType })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="currency">Currency ($)</option>
                    <option value="date">Date</option>
                    <option value="email">Email</option>
                    <option value="select">Dropdown / Select</option>
                    <option value="boolean">Boolean</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Text Transformation
                  </label>
                  <select
                    value={editingField.transformation || 'none'}
                    onChange={(e) => setEditingField({ ...editingField, transformation: e.target.value as TextTransform })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                  >
                    <option value="none">None</option>
                    <option value="uppercase">UPPERCASE</option>
                    <option value="titlecase">Title Case</option>
                    <option value="lowercase">lowercase</option>
                    <option value="trim">Trim Whitespace</option>
                  </select>
                </div>
              </div>

              {editingField.type === 'select' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dropdown Options (comma separated)
                  </label>
                  <input
                    type="text"
                    value={editingField.options?.join(', ') || ''}
                    onChange={(e) => setEditingField({
                      ...editingField,
                      options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="e.g. Paid, Pending, Overdue"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="required-checkbox"
                  checked={editingField.required}
                  onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="required-checkbox" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  This field is strictly required
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveField(editingField)}
                disabled={!editingField.label || !editingField.key}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-md shadow-xs"
              >
                Save Field
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
