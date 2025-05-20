import { ethers } from "ethers";

// Extend the Window interface to include the ethereum property
declare global {
  interface Window {
    ethereum?: any;
  }
}
import { ContractInfo, FlashLoanParams, TransactionItem, WithdrawalParams, CommonTokens } from "./types";

// ABI fragments needed for contract interaction
const ABI_FRAGMENTS = [
  "function requestFlashLoan(address asset, uint256 amount, address tokenB, uint24 fee1, uint24 fee2)",
  "function withdrawToken(address token)",
  "function withdrawETH()",
  "function owner() view returns (address)",
  "event FlashLoanInitiated(address asset, uint256 amount)",
  "event SwapExecuted(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)",
  "event FlashLoanRepaid(address asset, uint256 amount, uint256 premium)"
];

// Provider and signer setup
let provider: ethers.Provider;
let signer: ethers.Signer;
let contract: ethers.Contract;

export const connectWallet = async (): Promise<string> => {
  try {
    // For browser environments with MetaMask
    if (window.ethereum) {
      provider = new ethers.BrowserProvider(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      signer = await (provider as ethers.BrowserProvider).getSigner();
      return await signer.getAddress();
    } else {
      throw new Error("No Ethereum browser extension detected");
    }
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw error;
  }
};

export const getContractInfo = async (): Promise<ContractInfo> => {
  try {
    if (!contract) {
      throw new Error("Contract not initialized");
    }
    
    const contractAddress = await contract.getAddress();
    const ownerAddress = await contract.owner();
    
    return {
      address: contractAddress,
      owner: ownerAddress,
      aavePoolAddress: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", // Aave V3 on Ethereum mainnet
      uniswapRouterAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Uniswap V3 Router
      connected: true
    };
  } catch (error) {
    console.error("Error getting contract info:", error);
    return {
      address: "Not connected",
      owner: "Unknown",
      aavePoolAddress: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
      uniswapRouterAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      connected: false
    };
  }
};

export const initializeContract = async (contractAddress: string): Promise<void> => {
  if (!signer) {
    await connectWallet();
  }
  
  contract = new ethers.Contract(contractAddress, ABI_FRAGMENTS, signer);
};

// Helper to generate a unique ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 10);
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

// Helper to format amount with token decimals
const formatTokenAmount = (amount: bigint, tokenAddress: string): string => {
  let decimals = 18; // Default to 18 decimals
  
  for (const token of Object.values(CommonTokens)) {
    if (token.address.toLowerCase() === tokenAddress.toLowerCase()) {
      decimals = token.decimals;
      break;
    }
  }
  
  return ethers.formatUnits(amount, decimals);
};

export const requestFlashLoan = async (params: FlashLoanParams): Promise<TransactionItem> => {
  try {
    if (!contract) {
      throw new Error("Contract not initialized");
    }
    
    // Create a pending transaction item
    const pendingTx: TransactionItem = {
      id: generateId(),
      type: 'flashloan',
      timestamp: Date.now(),
      asset: getTokenSymbol(params.asset),
      amount: params.amount,
      status: 'pending'
    };
    
    // Parse amount with correct decimals
    let decimals = 18;
    for (const token of Object.values(CommonTokens)) {
      if (token.address.toLowerCase() === params.asset.toLowerCase()) {
        decimals = token.decimals;
        break;
      }
    }
    const amountBigInt = ethers.parseUnits(params.amount, decimals);
    
    // Execute the transaction
    const tx = await contract.requestFlashLoan(
      params.asset,
      amountBigInt,
      params.tokenB,
      params.fee1,
      params.fee2,
      { gasLimit: 1000000 }
    );
    
    pendingTx.hash = tx.hash;
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    // Update status based on receipt
    if (receipt.status === 1) {
      pendingTx.status = 'success';
      
      // Log events if needed
      parseFlashLoanEvents(receipt);
    } else {
      pendingTx.status = 'failed';
    }
    
    return pendingTx;
  } catch (error) {
    console.error("Error requesting flash loan:", error);
    throw error;
  }
};

export const withdrawToken = async (params: WithdrawalParams): Promise<TransactionItem> => {
  try {
    if (!contract) {
      throw new Error("Contract not initialized");
    }
    
    // Create a pending transaction item
    const pendingTx: TransactionItem = {
      id: generateId(),
      type: 'withdrawal',
      timestamp: Date.now(),
      asset: params.isEth ? 'ETH' : getTokenSymbol(params.token),
      status: 'pending'
    };
    
    // Execute the withdrawal
    let tx;
    if (params.isEth) {
      tx = await contract.withdrawETH({ gasLimit: 300000 });
    } else {
      tx = await contract.withdrawToken(params.token, { gasLimit: 300000 });
    }
    
    pendingTx.hash = tx.hash;
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    // Update status based on receipt
    if (receipt.status === 1) {
      pendingTx.status = 'success';
    } else {
      pendingTx.status = 'failed';
    }
    
    return pendingTx;
  } catch (error) {
    console.error("Error withdrawing token:", error);
    throw error;
  }
};

// Parse events from transaction receipt
const parseFlashLoanEvents = (receipt: ethers.TransactionReceipt): TransactionItem[] => {
  const transactions: TransactionItem[] = [];
  
  if (!contract) return transactions;
  
  // Parse logs
  for (const log of receipt.logs) {
    try {
      const event = contract.interface.parseLog({
        topics: log.topics as string[],
        data: log.data
      });
      
      if (!event) continue;
      
      if (event.name === 'FlashLoanInitiated') {
        transactions.push({
          id: generateId(),
          type: 'flashloan',
          timestamp: Date.now(),
          asset: getTokenSymbol(event.args[0]),
          amount: formatTokenAmount(event.args[1], event.args[0]),
          status: 'success',
          hash: receipt.hash
        });
      } else if (event.name === 'SwapExecuted') {
        transactions.push({
          id: generateId(),
          type: 'swap',
          timestamp: Date.now(),
          asset: `${getTokenSymbol(event.args[0])} → ${getTokenSymbol(event.args[1])}`,
          amount: formatTokenAmount(event.args[2], event.args[0]),
          status: 'success',
          hash: receipt.hash
        });
      } else if (event.name === 'FlashLoanRepaid') {
        transactions.push({
          id: generateId(),
          type: 'repay',
          timestamp: Date.now(),
          asset: getTokenSymbol(event.args[0]),
          amount: formatTokenAmount(event.args[1], event.args[0]),
          status: 'success',
          hash: receipt.hash
        });
      }
    } catch (error) {
      console.error("Error parsing event log:", error);
    }
  }
  
  return transactions;
};

// Local storage for transaction history
const STORAGE_KEY = 'flashloan_transactions';

// Save transactions to local storage
const saveTransaction = (tx: TransactionItem): void => {
  try {
    const storedTxs = localStorage.getItem(STORAGE_KEY);
    const transactions: TransactionItem[] = storedTxs ? JSON.parse(storedTxs) : [];
    transactions.unshift(tx);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions.slice(0, 50))); // Keep last 50
  } catch (error) {
    console.error("Error saving transaction:", error);
  }
};

// Get transactions from local storage
export const getTransactionHistory = async (): Promise<TransactionItem[]> => {
  try {
    const storedTxs = localStorage.getItem(STORAGE_KEY);
    if (!storedTxs) {
      return [
        {
          id: "demo1",
          type: 'flashloan',
          timestamp: Date.now() - 86400000, // 1 day ago
          asset: "WETH",
          amount: "10.0",
          status: 'success',
          hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        },
        {
          id: "demo2",
          type: 'swap',
          timestamp: Date.now() - 86400000 + 30000, // 1 day ago + 30s
          asset: "WETH → USDC",
          amount: "10.0",
          status: 'success',
          hash: "0x2345678901abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        },
        {
          id: "demo3",
          type: 'withdrawal',
          timestamp: Date.now() - 43200000, // 12 hours ago
          asset: "WETH",
          amount: "0.5",
          status: 'success',
          hash: "0x3456789012abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        }
      ];
    }
    return JSON.parse(storedTxs);
  } catch (error) {
    console.error("Error getting transaction history:", error);
    return [];
  }
};