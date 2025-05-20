import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTransactionHistory } from '@/utils/contractInteraction';
import { TransactionItem } from '@/utils/types';
import { Badge } from '@/components/ui/badge';
import { Check, X, Copy, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface TransactionHistoryProps {
  newTransactions: TransactionItem[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ newTransactions }) => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const history = await getTransactionHistory();
        setTransactions(history);
      } catch (error) {
        console.error("Error fetching transaction history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Add new transactions from props when they come in
  useEffect(() => {
    if (newTransactions.length > 0) {
      setTransactions(prev => [...newTransactions, ...prev]);
    }
  }, [newTransactions]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'flashloan':
        return 'Flash Loan';
      case 'swap':
        return 'Swap';
      case 'repay':
        return 'Repayment';
      case 'withdrawal':
        return 'Withdrawal';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Pending</Badge>;
      case 'success':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500">Success</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Transaction hash has been copied",
      duration: 3000,
    });
  };

  const getTxLink = (hash: string) => {
    return `https://etherscan.io/tx/${hash}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gradient-text">Transaction History</CardTitle>
          <CardDescription>Loading transaction history...</CardDescription>
        </CardHeader>
        <CardContent className="h-32 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gradient-border">
      <CardHeader>
        <CardTitle className="gradient-text">Transaction History</CardTitle>
        <CardDescription>Recent contract interactions</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2 -mr-2">
            {transactions.map((tx) => (
              <div 
                key={tx.id} 
                className="p-4 border border-border bg-card/40 rounded-lg space-y-2 hover:bg-card/60 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getTypeLabel(tx.type)}</span>
                    {getStatusBadge(tx.status)}
                  </div>
                  <span className="text-sm text-muted-foreground">{formatDate(tx.timestamp)}</span>
                </div>
                
                {tx.hash && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground truncate max-w-[220px]">
                      {tx.hash}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(tx.hash!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6"
                      asChild
                    >
                      <a href={getTxLink(tx.hash)} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                )}
                
                {tx.asset && tx.amount && (
                  <div className="text-sm">
                    Amount: <span className="font-medium">{tx.amount}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;
