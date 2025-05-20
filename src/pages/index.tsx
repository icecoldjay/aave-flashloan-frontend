import React, { useState } from 'react';
import ContractInfoCard from '@/components/ContractInfoCard';
import FlashLoanForm from '@/components/FlashloanForm';
import WithdrawForm from '@/components/WithdrawForm';
import TransactionHistory from '@/components/TransactionHistory';
import NetworkStatus from '@/components/NetworkStatus';
import { TransactionItem } from '@/utils/types';

const Index = () => {
  const [newTransactions, setNewTransactions] = useState<TransactionItem[]>([]);

  const handleTxAdded = (tx: TransactionItem) => {
    setNewTransactions(prev => [tx, ...prev]);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold gradient-text">
                Flash Swap Craft
              </h1>
              <p className="text-muted-foreground mt-1">
                Execute flash loan arbitrage opportunities on-chain
              </p>
            </div>
            <NetworkStatus />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <ContractInfoCard />
            <FlashLoanForm onTxAdded={handleTxAdded} />
          </div>
          
          <div className="space-y-8">
            <WithdrawForm onTxAdded={handleTxAdded} />
            <TransactionHistory newTransactions={newTransactions} />
          </div>
        </div>
        
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>Flash Swap Craft &copy; {new Date().getFullYear()} - Interface for ArbitrageFlashLoan smart contract</p>
          <p className="mt-1">
            <a 
              href="https://github.com/yourusername/flash-swap-craft" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-primary transition-colors"
            >
              GitHub Repository
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
