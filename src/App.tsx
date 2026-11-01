import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DataWorkbench } from './components/DataWorkbench';
import { PatternLearner } from './components/PatternLearner';
import { RecipeManager } from './components/RecipeManager';
import { IntegrationsHub } from './components/IntegrationsHub';
import { BatchDrawer } from './components/BatchDrawer';
import { INITIAL_RECIPES, INITIAL_WEBHOOKS } from './data/defaultRecipes';
import { AutomationRecipe, DataRecord, LearnedCorrection, WebhookIntegrationConfig } from './types';

// Initial pre-populated data records for instant demonstration
const SEED_RECORDS: DataRecord[] = [
  {
    id: 'rec-init-1',
    sourceSnippet: `Invoice INV-9042 from Amazon Web Services Inc.\nBilling Date: Oct 24, 2026. Due date: Nov 15, 2026.\nCharges: EC2 and S3 hosting storage services.\nSubtotal: $420.50. Tax: $33.64. Total Due: $454.14.\nPayment method: Card ending in 4099 processed successfully.`,
    confidence: 98,
    status: 'approved',
    values: {
      invoice_number: 'INV-9042',
      vendor_name: 'Amazon Web Services',
      invoice_date: '2026-10-24',
      due_date: '2026-11-15',
      total_amount: '454.14',
      tax_amount: '33.64',
      category: 'Cloud Infrastructure',
      payment_status: 'Paid',
    },
    flags: [],
    createdAt: '2026-10-31T08:15:00Z',
    selected: false,
  },
  {
    id: 'rec-init-2',
    sourceSnippet: `Got bill #NET-88123 from Cloudflare Inc dated 2026-10-28.\nEnterprise DNS and DDoS edge protection for main app domain.\nTotal $250.00 zero tax. Due within 30 days on Nov 27, 2026. Status is pending bank ACH.`,
    confidence: 94,
    status: 'pending',
    values: {
      invoice_number: 'NET-88123',
      vendor_name: 'Cloudflare Inc',
      invoice_date: '2026-10-28',
      due_date: '2026-11-27',
      total_amount: '250.00',
      tax_amount: '0.00',
      category: 'Cloud Infrastructure',
      payment_status: 'Pending',
    },
    flags: ['Payment method pending ACH clearance'],
    createdAt: '2026-10-31T08:16:00Z',
    selected: false,
  },
  {
    id: 'rec-init-3',
    sourceSnippet: `Receipt from Herman Miller Ergonomics, PO-30291.\nOrder Date: Oct 29, 2026. Delivered to Floor 4 HQ.\nTwo Aeron Chairs for developer workstation upgrades.\nAmount $1,840.00 + sales tax $147.20 = $1,987.20. Paid via Corporate Amex.`,
    confidence: 91,
    status: 'approved',
    values: {
      invoice_number: 'PO-30291',
      vendor_name: 'Herman Miller Ergonomics',
      invoice_date: '2026-10-29',
      due_date: '2026-10-29',
      total_amount: '1987.20',
      tax_amount: '147.20',
      category: 'Hardware',
      payment_status: 'Paid',
    },
    flags: [],
    createdAt: '2026-10-31T08:18:00Z',
    selected: false,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'workbench' | 'learner' | 'recipes' | 'integrations'>('workbench');
  
  // Theme state with local persistence
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('autoentry_dark_mode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('autoentry_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('autoentry_dark_mode', 'false');
    }
  }, [darkMode]);

  // Recipes state
  const [recipes, setRecipes] = useState<AutomationRecipe[]>(() => {
    const saved = localStorage.getItem('autoentry_recipes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_RECIPES;
      }
    }
    return INITIAL_RECIPES;
  });

  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(recipes[0]?.id || 'recipe-invoices');

  // Extracted Data Records
  const [records, setRecords] = useState<DataRecord[]>(() => {
    const saved = localStorage.getItem('autoentry_records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return SEED_RECORDS;
      }
    }
    return SEED_RECORDS;
  });

  // Webhooks
  const [webhooks, setWebhooks] = useState<WebhookIntegrationConfig[]>(() => {
    const saved = localStorage.getItem('autoentry_webhooks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_WEBHOOKS;
      }
    }
    return INITIAL_WEBHOOKS;
  });

  // Batch Ingest Drawer
  const [isBatchDrawerOpen, setIsBatchDrawerOpen] = useState(false);

  // Daily statistics
  const [todayProcessedCount, setTodayProcessedCount] = useState<number>(() => {
    return records.length + 8;
  });
  const [timeSavedMinutes, setTimeSavedMinutes] = useState<number>(34);

  // Local persistence sync
  useEffect(() => {
    localStorage.setItem('autoentry_recipes', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem('autoentry_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('autoentry_webhooks', JSON.stringify(webhooks));
  }, [webhooks]);

  // Handlers
  const handleBatchProcessed = (newRecords: DataRecord[], stats: { timeSaved: number }) => {
    setRecords(prev => [...newRecords, ...prev]);
    setTodayProcessedCount(prev => prev + newRecords.length);
    setTimeSavedMinutes(prev => prev + stats.timeSaved);
    setActiveTab('workbench');
  };

  const handleRecipeCreated = (newRecipe: AutomationRecipe) => {
    setRecipes(prev => [newRecipe, ...prev]);
    setSelectedRecipeId(newRecipe.id);
    setActiveTab('workbench');
    setIsBatchDrawerOpen(true);
  };

  const handleSaveLearnedRule = (recipeId: string, rule: LearnedCorrection) => {
    setRecipes(prev => prev.map(r => {
      if (r.id === recipeId) {
        return {
          ...r,
          memoryCorrections: [rule, ...(r.memoryCorrections || [])],
          updatedAt: new Date().toISOString().split('T')[0],
        };
      }
      return r;
    }));
  };

  const handleUpdateRecipe = (updated: AutomationRecipe) => {
    setRecipes(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const handleCreateRecipe = (newRecipe: AutomationRecipe) => {
    setRecipes(prev => [...prev, newRecipe]);
  };

  const handleDeleteRecipe = (recipeId: string) => {
    if (recipes.length <= 1) {
      alert('You must keep at least one recipe.');
      return;
    }
    const remaining = recipes.filter(r => r.id !== recipeId);
    setRecipes(remaining);
    setSelectedRecipeId(remaining[0].id);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenBatchDrawer={() => setIsBatchDrawerOpen(true)}
        todayProcessedCount={todayProcessedCount}
        timeSavedMinutes={timeSavedMinutes}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'workbench' && (
          <DataWorkbench
            recipes={recipes}
            selectedRecipeId={selectedRecipeId}
            onSelectRecipe={setSelectedRecipeId}
            records={records}
            setRecords={setRecords}
            onOpenBatchDrawer={() => setIsBatchDrawerOpen(true)}
            onOpenLearner={() => setActiveTab('learner')}
            onSaveLearnedRule={handleSaveLearnedRule}
          />
        )}

        {activeTab === 'learner' && (
          <PatternLearner
            onRecipeCreated={handleRecipeCreated}
            onCancel={() => setActiveTab('workbench')}
          />
        )}

        {activeTab === 'recipes' && (
          <RecipeManager
            recipes={recipes}
            selectedRecipeId={selectedRecipeId}
            onSelectRecipe={setSelectedRecipeId}
            onUpdateRecipe={handleUpdateRecipe}
            onCreateRecipe={handleCreateRecipe}
            onDeleteRecipe={handleDeleteRecipe}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsHub
            webhooks={webhooks}
            onUpdateWebhooks={setWebhooks}
            recipes={recipes}
            selectedRecipeId={selectedRecipeId}
            records={records}
          />
        )}
      </main>

      {/* Slide-over Batch Processor Drawer */}
      <BatchDrawer
        isOpen={isBatchDrawerOpen}
        onClose={() => setIsBatchDrawerOpen(false)}
        recipes={recipes}
        selectedRecipeId={selectedRecipeId}
        onSelectRecipe={setSelectedRecipeId}
        onBatchProcessed={handleBatchProcessed}
      />
    </div>
  );
}
