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

  const handleSelectRecommendation = (rec: SavingRecommendation) => {
    setActiveTab('ai');
  };

  return (
    <AndroidFrame>
      {/* Top Header */}
      <TopHeader
        onOpenNotifications={() => setIsNotificationOpen(true)}
        unreadCount={recommendations.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-6">
        {activeTab === 'beranda' && (
          <DashboardView
            selectedMonth={selectedMonth}
            onChangeMonth={setSelectedMonth}
            onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
            onOpenManualModal={() => handleOpenManualAdd()}
            onNavigateToTab={setActiveTab}
            onSelectTransaction={(tx) => handleOpenManualAdd(tx)}
          />
        )}

        {activeTab === 'transaksi' && (
          <TransactionListView
            selectedMonth={selectedMonth}
            onOpenManualModal={handleOpenManualAdd}
            onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
          />
        )}

        {activeTab === 'matriks' && (
          <MonthlyComparisonView selectedMonth={selectedMonth} />
        )}

        {activeTab === 'ai' && (
          <AIAdvisorView selectedMonth={selectedMonth} />
        )}

        {activeTab === 'sync' && <SyncView />}
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
