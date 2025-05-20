// Contract types
export interface ContractInfo {
    address: string;
    owner: string;
    aavePoolAddress: string;
    uniswapRouterAddress: string;
    connected: boolean;
  }
  
  export interface FlashLoanParams {
    asset: string;
    amount: string;
    tokenB: string;
    fee1: number;
    fee2: number;
  }
  
  export interface WithdrawalParams {
    token: string;
    isEth: boolean;
  }
  
  export interface TransactionItem {
    id: string;
    type: 'flashloan' | 'swap' | 'repay' | 'withdrawal';
    timestamp: number;
    asset?: string;
    amount?: string;
    status: 'pending' | 'success' | 'failed';
    hash?: string;
  }
  
  // Common fee tiers in Uniswap V3
  export const FeeTiers = {
    LOWEST: 100,   // 0.01%
    LOW: 500,      // 0.05%
    MEDIUM: 3000,  // 0.3%
    HIGH: 10000    // 1%
  };
  
  // Example token list
  export const CommonTokens = {
    ETH: {
      symbol: 'ETH',
      name: 'Ethereum',
      address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Pseudo-address for ETH
      decimals: 18
    },
    WETH: {
      symbol: 'WETH',
      name: 'Wrapped Ethereum',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      decimals: 18
    },
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6
    },
    DAI: {
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      decimals: 18
    },
    USDT: {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6
    }
  };
  