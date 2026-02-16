import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { WalletState } from '@/types';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (params: any) => void) => void;
      removeListener: (event: string, callback: (params: any) => void) => void;
      isMetaMask?: boolean;
      selectedAddress?: string;
    };
  }
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    balance: '0',
  });
  const [isConnecting, setIsConnecting] = useState(false);

  const checkConnection = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [accounts[0], 'latest'],
        });
        
        setState({
          isConnected: true,
          address: accounts[0],
          chainId: parseInt(chainId, 16),
          balance: (parseInt(balance, 16) / 1e18).toFixed(4),
        });
      }
    } catch (error) {
      console.error('Failed to check connection:', error);
    }
  }, []);

  useEffect(() => {
    checkConnection();

    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setState({
            isConnected: false,
            address: null,
            chainId: null,
            balance: '0',
          });
          toast.info('Wallet disconnected');
        } else {
          checkConnection();
          toast.success('Wallet account changed');
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [checkConnection]);

  const connect = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      toast.error('MetaMask not detected', {
        description: 'Please install MetaMask to connect your wallet',
        action: {
          label: 'Install',
          onClick: () => window.open('https://metamask.io/download/', '_blank'),
        },
      });
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      if (accounts.length > 0) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [accounts[0], 'latest'],
        });
        
        setState({
          isConnected: true,
          address: accounts[0],
          chainId: parseInt(chainId, 16),
          balance: (parseInt(balance, 16) / 1e18).toFixed(4),
        });
        
        toast.success('Wallet connected successfully!', {
          description: `Connected to ${formatAddress(accounts[0])}`,
        });
      }
    } catch (error: any) {
      console.error('Failed to connect:', error);
      if (error.code === 4001) {
        toast.error('Connection rejected', {
          description: 'You rejected the connection request',
        });
      } else {
        toast.error('Failed to connect wallet', {
          description: error.message || 'Please try again',
        });
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      address: null,
      chainId: null,
      balance: '0',
    });
    toast.info('Wallet disconnected');
  }, []);

  const switchNetwork = useCallback(async (chainId: number) => {
    if (typeof window.ethereum === 'undefined') {
      toast.error('MetaMask not installed');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      toast.success(`Switched to ${getNetworkName(chainId)}`);
    } catch (error: any) {
      if (error.code === 4902) {
        toast.error('Network not available', {
          description: 'Please add this network to MetaMask manually',
        });
      } else {
        toast.error('Failed to switch network');
      }
    }
  }, []);

  return {
    ...state,
    isConnecting,
    connect,
    disconnect,
    switchNetwork,
    isMetaMaskInstalled: typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask === true,
  };
}

export function formatAddress(address: string | null, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getNetworkName(chainId: number | null): string {
  if (!chainId) return 'Unknown';
  
  const networks: Record<number, string> = {
    1: 'Ethereum Mainnet',
    56: 'BSC Mainnet',
    137: 'Polygon',
    42161: 'Arbitrum',
    10: 'Optimism',
    43114: 'Avalanche',
    250: 'Fantom',
    5: 'Goerli Testnet',
    97: 'BSC Testnet',
    1337: 'Localhost',
    31337: 'Hardhat',
  };
  
  return networks[chainId] || `Chain ${chainId}`;
}
