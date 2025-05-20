import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { connectWallet } from '@/utils/contractInteraction';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  Network, 
  Power, 
  Copy, 
  Check, 
  AlertTriangle, 
  ExternalLink,
  ChevronRight,
  Shield
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Supported networks
const NETWORKS = [
  { id: '1', name: 'Ethereum', hexId: '0x1', color: 'bg-blue-500' },
  { id: '56', name: 'BNB Chain', hexId: '0x38', color: 'bg-yellow-500' },
  { id: '137', name: 'Polygon', hexId: '0x89', color: 'bg-purple-500' },
  { id: '42161', name: 'Arbitrum', hexId: '0xa4b1', color: 'bg-blue-700' },
  { id: '10', name: 'Optimism', hexId: '0xa', color: 'bg-red-500' }
];

const NetworkStatus: React.FC = () => {
  const [walletInfo, setWalletInfo] = useState({
    isConnected: false,
    address: '',
    chainId: '',
    balance: '0',
    network: { name: 'Unknown', color: 'bg-gray-500' }
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  
  // Find network info by chain ID
  const getNetworkInfo = (chainId: string) => {
    const network = NETWORKS.find(n => n.id === chainId || n.hexId === chainId);
    return network || { name: 'Unknown Network', color: 'bg-gray-500' };
  };

  // Handle wallet connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check if wallet is already connected
        if (window.ethereum && window.ethereum.selectedAddress) {
          const address = window.ethereum.selectedAddress;
          const chainId = window.ethereum.chainId;
          
          // Parse chainId to decimal if it's hex
          const decimalChainId = chainId.startsWith('0x') 
            ? parseInt(chainId, 16).toString() 
            : chainId;
            
          const network = getNetworkInfo(chainId);
          
          setWalletInfo({
            isConnected: true,
            address,
            chainId: decimalChainId,
            balance: '0', // We'll fetch this later
            network
          });
          
          // Get balance
          const balance = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [address, 'latest']
          });
          
          setWalletInfo(prev => ({
            ...prev,
            balance: (parseInt(balance, 16) / 1e18).toFixed(4)
          }));
        }
      } catch (err) {
        console.error("Error checking wallet connection:", err);
      }
    };
    
    checkConnection();
    
    // Set up event listeners for wallet changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected wallet
          setWalletInfo({
            isConnected: false,
            address: '',
            chainId: '',
            balance: '0',
            network: { name: 'Unknown', color: 'bg-gray-500' }
          });
        } else {
          // Account changed
          setWalletInfo(prev => ({
            ...prev,
            isConnected: true,
            address: accounts[0]
          }));
        }
      });
      
      window.ethereum.on('chainChanged', (chainId: string) => {
        // Network changed
        const decimalChainId = chainId.startsWith('0x') 
          ? parseInt(chainId, 16).toString() 
          : chainId;
          
        const network = getNetworkInfo(chainId);
        
        setWalletInfo(prev => ({
          ...prev,
          chainId: decimalChainId,
          network
        }));
      });
    }
    
    return () => {
      // Remove event listeners
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);
  
  // Handle wallet connection
  const handleConnect = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      const address = await connectWallet();
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      // Parse chainId to decimal if it's hex
      const decimalChainId = chainId.startsWith('0x') 
        ? parseInt(chainId, 16).toString() 
        : chainId;
        
      const network = getNetworkInfo(chainId);
      
      // Get balance
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      
      setWalletInfo({
        isConnected: true,
        address,
        chainId: decimalChainId,
        balance: (parseInt(balance, 16) / 1e18).toFixed(4),
        network
      });
      
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been successfully connected.",
        duration: 3000,
      });
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setError(err.message || 'Failed to connect wallet');
      
      toast({
        title: "Connection Failed",
        description: err.message || 'Failed to connect wallet',
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Handle wallet disconnection
  const handleDisconnect = () => {
    setWalletInfo({
      isConnected: false,
      address: '',
      chainId: '',
      balance: '0',
      network: { name: 'Unknown', color: 'bg-gray-500' }
    });
    
    setIsDialogOpen(false);
    
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected.",
      duration: 3000,
    });
  };
  
  // Handle network switch
  const switchNetwork = async (hexChainId: string) => {
    if (!window.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
      
      // Update will happen via chainChanged event
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error switching network:", error);
      
      // If the chain is not added to MetaMask
      if (error.code === 4902) {
        toast({
          title: "Network Not Found",
          description: "This network needs to be added to your wallet first.",
          variant: "destructive",
          duration: 5000,
        });
      } else {
        toast({
          title: "Network Switch Failed",
          description: error.message || "Failed to switch network",
          variant: "destructive",
          duration: 5000,
        });
      }
    }
  };
  
  // Handle address copy
  const copyAddress = () => {
    navigator.clipboard.writeText(walletInfo.address);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };
  
  // Format address for display
  const formatAddress = (address: string) => {
    return address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';
  };
  
  // Get etherscan link
  const getExplorerLink = () => {
    const baseUrl = walletInfo.chainId === '1' ? 'https://etherscan.io' :
                   walletInfo.chainId === '56' ? 'https://bscscan.com' :
                   walletInfo.chainId === '137' ? 'https://polygonscan.com' :
                   walletInfo.chainId === '42161' ? 'https://arbiscan.io' :
                   walletInfo.chainId === '10' ? 'https://optimistic.etherscan.io' :
                   'https://etherscan.io';
                   
    return `${baseUrl}/address/${walletInfo.address}`;
  };

  return (
    <>
      <Button
        variant={walletInfo.isConnected ? "outline" : "default"}
        size="sm"
        className={cn(
          "flex items-center gap-2",
          walletInfo.isConnected && "border-green-500/30 hover:border-green-500/50"
        )}
        onClick={() => setIsDialogOpen(true)}
      >
        <div 
          className={cn(
            "w-2 h-2 rounded-full",
            walletInfo.isConnected ? walletInfo.network.color : "bg-red-500"
          )}
        />
        {walletInfo.isConnected ? (
          <span>{formatAddress(walletInfo.address)}</span>
        ) : (
          <span>Connect Wallet</span>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {walletInfo.isConnected ? "Wallet Connected" : "Connect Wallet"}
            </DialogTitle>
            <DialogDescription>
              {walletInfo.isConnected 
                ? "Your wallet is connected to the application"
                : "Connect your wallet to use the application"
              }
            </DialogDescription>
          </DialogHeader>
          
          {walletInfo.isConnected ? (
            <div className="space-y-4 py-2">
              {/* Connected Wallet Info */}
              <div className="flex flex-col space-y-2 border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      walletInfo.network.color
                    )} />
                    <span className="font-medium">{walletInfo.network.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Chain ID: {walletInfo.chainId}</span>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{formatAddress(walletInfo.address)}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={copyAddress}
                  >
                    {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-muted-foreground">Balance</span>
                  <span className="font-medium">{walletInfo.balance} ETH</span>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => window.open(getExplorerLink(), '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </Button>
              </div>
              
              {/* Switch Network */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Switch Network</h3>
                <div className="space-y-2">
                  {NETWORKS.map((network) => (
                    <Button
                      key={network.id}
                      variant="ghost"
                      className="w-full justify-between"
                      disabled={walletInfo.chainId === network.id}
                      onClick={() => switchNetwork(network.hexId)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", network.color)} />
                        <span>{network.name}</span>
                      </div>
                      {walletInfo.chainId === network.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Disconnect Button */}
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={handleDisconnect}
              >
                <Power className="h-4 w-4 mr-2" />
                Disconnect Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Wallet Connection Options */}
              <Button
                className="w-full flex items-center justify-center gap-2"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5" />
                    <span>Connect with MetaMask</span>
                  </>
                )}
              </Button>
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-700">{error}</p>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-2">
                By connecting your wallet, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NetworkStatus;