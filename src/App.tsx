/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { SyncProvider, useSync } from './context/SyncContext';
import { AndroidFrame } from './components/AndroidFrame';
import { TopHeader } from './components/TopHeader';
import { BottomNav, ActiveTab } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { TransactionListView } from './components/TransactionListView';
import { MonthlyComparisonView } from './components/MonthlyComparisonView';
import { AIAdvisorView } from './components/AIAdvisorView';
import { SyncView } from './components/SyncView';
import { VoiceInputModal } from './components/VoiceInputModal';
import { ManualTransactionModal } from './components/ManualTransactionModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { ExportImportModal } from './components/ExportImportModal';
import { getCurrentMonthKey, generateSavingRecommendations } from './utils/finance';
import { Transaction, SavingRecommendation } from './types';

function MainApp() {
  const { transactions, addTransaction, updateTransaction } = useSync();

  const [activeTab, setActiveTab] = useState<ActiveTab>('beranda');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthKey());

  // Modals state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState<boolean>(false);
  const [exportImportInitialTab, setExportImportInitialTab] = useState<'export' | 'import'>('export');
  const [initialAIQuestion, setInitialAIQuestion] = useState<string | null>(null);

  // Recommendations for notification drawer
  const recommendations = useMemo(() => {
    return generateSavingRecommendations(transactions, selectedMonth);
  }, [transactions, selectedMonth]);

  const handleOpenManualAdd = (tx?: Transaction) => {
    if (tx) {
      setEditingTransaction(tx);
    } else {
      setEditingTransaction(null);
    }
    setIsManualModalOpen(true);
  };

  const handleOpenExportImport = (tab: 'export' | 'import' = 'export') => {
    setExportImportInitialTab(tab);
    setIsExportImportOpen(true);
  };

  const handleSaveTransaction = async (txData: any) => {
    if (editingTransaction) {
      await updateTransaction({
        ...editingTransaction,
        ...txData,
      });
      setEditingTransaction(null);
    } else {
      await addTransaction(txData);
    }
  };

  const handleSelectRecommendation = (_rec: SavingRecommendation) => {
    setActiveTab('ai');
  };

  const handleAskMonthlySpending = () => {
    setInitialAIQuestion('Apa saja yang telah dihabiskan selama bulan ini?');
    setActiveTab('ai');
  };

  return (
    <AndroidFrame>
      {/* Top Header */}
      <TopHeader
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onOpenExportImport={() => handleOpenExportImport('export')}
        unreadCount={recommendations.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'beranda' && (
          <DashboardView
            selectedMonth={selectedMonth}
            onChangeMonth={setSelectedMonth}
            onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
            onOpenManualModal={() => handleOpenManualAdd()}
            onOpenExportImport={handleOpenExportImport}
            onNavigateToTab={setActiveTab}
            onSelectTransaction={(tx) => handleOpenManualAdd(tx)}
            onAskMonthlySpending={handleAskMonthlySpending}
          />
        )}

        {activeTab === 'transaksi' && (
          <TransactionListView
            selectedMonth={selectedMonth}
            onOpenManualModal={handleOpenManualAdd}
            onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
            onOpenExportImport={handleOpenExportImport}
          />
        )}

        {activeTab === 'matriks' && (
          <MonthlyComparisonView selectedMonth={selectedMonth} />
        )}

        {activeTab === 'ai' && (
          <AIAdvisorView
            selectedMonth={selectedMonth}
            initialQuestion={initialAIQuestion}
            onClearInitialQuestion={() => setInitialAIQuestion(null)}
          />
        )}

        {activeTab === 'sync' && (
          <SyncView onOpenExportImport={handleOpenExportImport} />
        )}
      </main>

      {/* Bottom Android Navigation */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        unreadAlertsCount={recommendations.length}
      />

      {/* Voice Recognition Drawer */}
      <VoiceInputModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSave={handleSaveTransaction}
      />

      {/* Manual Form Modal */}
      <ManualTransactionModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        initialData={editingTransaction}
      />

      {/* Export & Import Data Modal */}
      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        initialTab={exportImportInitialTab}
      />

      {/* Notification Center */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        recommendations={recommendations}
        onSelectRecommendation={handleSelectRecommendation}
        onClearAll={() => setIsNotificationOpen(false)}
      />
    </AndroidFrame>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SyncProvider>
        <MainApp />
      </SyncProvider>
    </ThemeProvider>
  );
}
