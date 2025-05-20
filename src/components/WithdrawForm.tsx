import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WithdrawalParams, CommonTokens } from '@/utils/types';
import { withdrawToken } from '@/utils/contractInteraction';
import { useToast } from '@/components/ui/use-toast';
import { Wallet } from 'lucide-react';

const WithdrawForm: React.FC<{ onTxAdded: (tx: any) => void }> = ({ onTxAdded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [withdrawParams, setWithdrawParams] = useState<WithdrawalParams>({
    token: CommonTokens.WETH.address,
    isEth: false,
  });
  const { toast } = useToast();

  const handleSelectChange = (name: keyof WithdrawalParams, value: string) => {
    setWithdrawParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setWithdrawParams(prev => ({ 
      ...prev, 
      isEth: checked,
      token: checked ? 'ETH' : CommonTokens.WETH.address
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setWithdrawParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      const tx = await withdrawToken(withdrawParams);
      toast({
        title: "Withdrawal Requested",
        description: `Transaction: ${tx.hash?.substring(0, 10)}...`,
      });
      onTxAdded(tx);
    } catch (error) {
      console.error("Withdrawal request failed:", error);
      toast({
        title: "Withdrawal Failed",
        description: "There was an error processing the withdrawal",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="gradient-border">
      <CardHeader>
        <CardTitle className="gradient-text">Withdraw Funds</CardTitle>
        <CardDescription>Withdraw tokens or ETH from the contract</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <div className="flex items-center space-x-2">
              <Switch 
                id="eth-mode" 
                checked={withdrawParams.isEth}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="eth-mode">Withdraw ETH</Label>
            </div>
            
            {!withdrawParams.isEth && (
              <div className="space-y-2">
                <Tabs defaultValue="simple" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="simple">Simple</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>
                  <TabsContent value="simple" className="mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="token">Token to withdraw</Label>
                      <Select 
                        value={withdrawParams.token} 
                        onValueChange={(value) => handleSelectChange('token', value)}
                        disabled={withdrawParams.isEth}
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
                  </TabsContent>
                  
                  <TabsContent value="advanced" className="mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="tokenAddress">Token Address</Label>
                      <Input
                        id="tokenAddress"
                        name="token"
                        placeholder="0x..."
                        value={withdrawParams.token}
                        onChange={handleInputChange}
                        disabled={withdrawParams.isEth}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
          
          <CardFooter className="flex justify-between pt-6 px-0">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <div className="flex items-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-background border-t-transparent rounded-full"></span>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center">
                  <Wallet className="mr-2 h-4 w-4" />
                  {withdrawParams.isEth ? "Withdraw All ETH" : "Withdraw All Tokens"}
                </div>
              )}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
};

export default WithdrawForm;
