import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlashLoanParams, FeeTiers, CommonTokens, TransactionItem } from '@/utils/types';
import { requestFlashLoan } from '@/utils/contractInteraction';
import { useToast } from '@/components/ui/use-toast';
import { Wallet, Send, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Binance Smart Chain network parameters
const BSC_CHAIN_ID = '0x38'; // 56 in decimal
const BSC_TESTNET_CHAIN_ID = '0x61'; // 97 in decimal

// For development, we'll support both mainnet and testnet
const SUPPORTED_CHAIN_IDS = [BSC_CHAIN_ID, BSC_TESTNET_CHAIN_ID];

interface FlashLoanFormProps {
  onTxAdded: (tx: TransactionItem) => void;
}

const FlashLoanForm: React.FC<FlashLoanFormProps> = ({ onTxAdded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<string | null>(null);
  
  const [flashLoanParams, setFlashLoanParams] = useState<FlashLoanParams>({
    asset: CommonTokens.WETH.address,
    amount: '',
    tokenB: CommonTokens.USDC.address,
    fee1: FeeTiers.MEDIUM,
    fee2: FeeTiers.MEDIUM,
  });
  
  const { toast } = useToast();

  // Check if the wallet is connected to the right network
  useEffect(() => {
    checkNetwork();
    
    // Listen for chain changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', () => {
        checkNetwork();
      });
    }
    
    return () => {
      // Clean up listeners
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', checkNetwork);
      }
    };
  }, []);

  const checkNetwork = async () => {
    if (window.ethereum) {
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setCurrentChainId(chainId);
        
        if (!SUPPORTED_CHAIN_IDS.includes(chainId)) {
          setNetworkError('Please connect to Binance Smart Chain to use this feature');
        } else {
          setNetworkError(null);
        }
      } catch (error) {
        console.error("Error checking network:", error);
        setNetworkError('Unable to detect current network');
      }
    } else {
      setNetworkError('No Ethereum wallet detected');
    }
  };

  const switchToBSC = async () => {
    if (!window.ethereum) return;
    
    try {
      // Try to switch to BSC
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: BSC_CHAIN_ID,
                chainName: 'Binance Smart Chain',
                nativeCurrency: {
                  name: 'BNB',
                  symbol: 'BNB',
                  decimals: 18,
                },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com/'],
              },
            ],
          });
        } catch (addError) {
          console.error("Error adding BSC network:", addError);
          toast({
            title: "Network Error",
            description: "Could not add BSC network to your wallet",
            variant: "destructive",
          });
        }
      } else {
        console.error("Error switching network:", switchError);
        toast({
          title: "Network Error",
          description: "Could not switch to BSC network",
          variant: "destructive",
        });
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFlashLoanParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof FlashLoanParams, value: string) => {
    setFlashLoanParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if connected to BSC before proceeding
    if (networkError) {
      toast({
        title: "Network Error",
        description: networkError,
        variant: "destructive",
      });
      return;
    }
    
    if (!flashLoanParams.amount || parseFloat(flashLoanParams.amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const tx = await requestFlashLoan(flashLoanParams);
      toast({
        title: "Flash Loan Requested",
        description: `Transaction: ${tx.hash?.substring(0, 10)}...`,
      });
      onTxAdded(tx);
      // Clear amount after successful request
      setFlashLoanParams(prev => ({ ...prev, amount: '' }));
    } catch (error: any) {
      console.error("Flash loan request failed:", error);
      toast({
        title: "Flash Loan Failed",
        description: error.message || "There was an error executing the flash loan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get token symbol from address
  const getTokenSymbol = (address: string): string => {
    for (const [symbol, token] of Object.entries(CommonTokens)) {
      if (token.address.toLowerCase() === address.toLowerCase()) {
        return symbol;
      }
    }
    return address.substring(0, 6) + "..." + address.substring(address.length - 4);
  };

  return (
    <Card className="gradient-border">
      <CardHeader>
        <CardTitle className="gradient-text">Request Flash Loan</CardTitle>
        <CardDescription>Execute arbitrage with flash loan</CardDescription>
      </CardHeader>
      <CardContent>
        {networkError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Network Error</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{networkError}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={switchToBSC}
                className="ml-2"
              >
                Switch to BSC
              </Button>
            </AlertDescription>
          </Alert>
        )}
      
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Tabs defaultValue="simple" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="simple">Simple</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              <TabsContent value="simple" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="asset">Asset to Borrow</Label>
                    <Select 
                      value={flashLoanParams.asset} 
                      onValueChange={(value) => handleSelectChange('asset', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select token" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CommonTokens.WETH.address}>{CommonTokens.WETH.symbol}</SelectItem>
                        <SelectItem value={CommonTokens.DAI.address}>{CommonTokens.DAI.symbol}</SelectItem>
                        <SelectItem value={CommonTokens.USDC.address}>{CommonTokens.USDC.symbol}</SelectItem>
                        <SelectItem value={CommonTokens.USDT.address}>{CommonTokens.USDT.symbol}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tokenB">Second Token</Label>
                    <Select 
                      value={flashLoanParams.tokenB} 
                      onValueChange={(value) => handleSelectChange('tokenB', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select token" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CommonTokens.WETH.address}>{CommonTokens.WETH.symbol}</SelectItem>
                        <SelectItem value={CommonTokens.DAI.address}>{CommonTokens.DAI.symbol}</SelectItem>
                        <SelectItem value={CommonTokens.USDC.address}>{CommonTokens.USDC.symbol}</SelectItem>
                        <SelectItem value={CommonTokens.USDT.address}>{CommonTokens.USDT.symbol}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.000001"
                      placeholder="0.0"
                      value={flashLoanParams.amount}
                      onChange={handleInputChange}
                      className="pr-16"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-sm text-muted-foreground">
                        {getTokenSymbol(flashLoanParams.asset)}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="advanced" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="asset">Asset to Borrow</Label>
                    <Input
                      id="assetAddress"
                      name="asset"
                      placeholder="0x..."
                      value={flashLoanParams.asset}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tokenB">Second Token</Label>
                    <Input
                      id="tokenBAddress"
                      name="tokenB"
                      placeholder="0x..."
                      value={flashLoanParams.tokenB}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="text"
                    placeholder="0.0"
                    value={flashLoanParams.amount}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fee1">Fee Tier 1</Label>
                    <Select 
                      value={flashLoanParams.fee1.toString()} 
                      onValueChange={(value) => handleSelectChange('fee1', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select fee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={FeeTiers.LOWEST.toString()}>0.01%</SelectItem>
                        <SelectItem value={FeeTiers.LOW.toString()}>0.05%</SelectItem>
                        <SelectItem value={FeeTiers.MEDIUM.toString()}>0.3%</SelectItem>
                        <SelectItem value={FeeTiers.HIGH.toString()}>1%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fee2">Fee Tier 2</Label>
                    <Select 
                      value={flashLoanParams.fee2.toString()} 
                      onValueChange={(value) => handleSelectChange('fee2', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select fee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={FeeTiers.LOWEST.toString()}>0.01%</SelectItem>
                        <SelectItem value={FeeTiers.LOW.toString()}>0.05%</SelectItem>
                        <SelectItem value={FeeTiers.MEDIUM.toString()}>0.3%</SelectItem>
                        <SelectItem value={FeeTiers.HIGH.toString()}>1%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <CardFooter className="flex justify-between pt-6 px-0">
            <Button 
              type="submit" 
              disabled={isLoading || !!networkError} 
              className="w-full"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-background border-t-transparent rounded-full"></span>
                  Processing...
                </div>
              ) : networkError ? (
                <div className="flex items-center">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Connect to BSC
                </div>
              ) : (
                <div className="flex items-center">
                  <Send className="mr-2 h-4 w-4" />
                  Request Flash Loan
                </div>
              )}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
};

export default FlashLoanForm;