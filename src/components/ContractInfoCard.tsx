import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getContractInfo } from '@/utils/contractInteraction';
import { ContractInfo } from '@/utils/types';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const ContractInfoCard: React.FC = () => {
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const info = await getContractInfo();
        setContractInfo(info);
      } catch (error) {
        console.error("Error fetching contract info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${label} has been copied to your clipboard.`,
      duration: 3000,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gradient-text">Contract Information</CardTitle>
          <CardDescription>Loading contract details...</CardDescription>
        </CardHeader>
        <CardContent className="h-32 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  if (!contractInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gradient-text">Contract Information</CardTitle>
          <CardDescription>Failed to load contract information</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="gradient-border">
      <CardHeader>
        <CardTitle className="gradient-text">Contract Information</CardTitle>
        <CardDescription>Flash loan arbitrage contract details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Contract Address:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">{contractInfo.address}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => copyToClipboard(contractInfo.address, "Contract address")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Owner:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">{contractInfo.owner}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => copyToClipboard(contractInfo.owner, "Owner address")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Aave Pool:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono truncate max-w-[200px]">
                {contractInfo.aavePoolAddress}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => copyToClipboard(contractInfo.aavePoolAddress, "Aave Pool address")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Uniswap Router:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono truncate max-w-[200px]">
                {contractInfo.uniswapRouterAddress}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => copyToClipboard(contractInfo.uniswapRouterAddress, "Uniswap Router address")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractInfoCard;
