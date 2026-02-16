import { useWallet, formatAddress, getNetworkName } from '@/hooks/useWallet';
import { NotificationsPanel } from './Notifications';
import { FolderPopup } from './FolderPopup';
import { ScalpingTracker } from './ScalpingTracker';

import { LiveMomentumTracker } from './LiveMomentumTracker';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, ChevronDown, ExternalLink, LogOut, Settings, Zap } from 'lucide-react';

interface HeaderProps {
  onSelectCoin: (symbol: string) => void;
}

export function Header({ onSelectCoin }: HeaderProps) {
  const { isConnected, address, chainId, balance, connect, disconnect, isConnecting } = useWallet();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-lg hidden sm:block">ScalpTracker Pro</span>
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-1">
        <LiveMomentumTracker onSelectCoin={onSelectCoin} />
        <ScalpingTracker onSelectCoin={onSelectCoin} />
        <FolderPopup onSelectCoin={onSelectCoin} />
      </nav>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationsPanel />

        {/* Wallet Connection */}
        {isConnected ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="hidden sm:inline">{formatAddress(address)}</span>
                <span className="sm:hidden">{formatAddress(address, 3)}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Cüzdanım</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-3 py-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Adres</span>
                  <span className="font-mono">{formatAddress(address, 6)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ağ</span>
                  <span>{getNetworkName(chainId)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bakiye</span>
                  <span className="font-mono">{parseFloat(balance || '0').toFixed(4)} ETH</span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <ExternalLink className="h-4 w-4" />
                Explorer'da Görüntüle
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Ayarlar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
                onClick={disconnect}
              >
                <LogOut className="h-4 w-4" />
                Bağlantıyı Kes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            onClick={connect}
            disabled={isConnecting}
            className="gap-2"
          >
            <Wallet className="h-4 w-4" />
            {isConnecting ? 'Bağlanıyor...' : 'Cüzdan Bağla'}
          </Button>
        )}
      </div>
    </header>
  );
}
