import { useState } from 'react';
import { useFolders } from '@/contexts/FolderContext';
import { useBinanceTickers } from '@/hooks/useBinance';
import { Folder, Plus, Trash2, ChevronDown, ChevronRight, TrendingUp, TrendingDown, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FolderPopupProps {
  onSelectCoin: (symbol: string) => void;
}

const FOLDER_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

export function FolderPopup({ onSelectCoin }: FolderPopupProps) {
  const { folders, addFolder, removeFolder, addCoinToFolder, getFolderPerformance } = useFolders();
  const { coins } = useBinanceTickers();
  const [isOpen, setIsOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [isAddCoinOpen, setIsAddCoinOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCoin, setNewCoin] = useState({ symbol: '', entryPrice: '', amount: '' });

  const prices = Object.fromEntries(coins.map(c => [c.symbol, c.price]));

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    addFolder(newFolderName, selectedColor);
    setNewFolderName('');
  };

  const handleAddCoin = (folderId: string) => {
    const price = parseFloat(newCoin.entryPrice);
    const amount = parseFloat(newCoin.amount);
    if (!newCoin.symbol || isNaN(price) || isNaN(amount)) return;

    addCoinToFolder(folderId, {
      symbol: newCoin.symbol,
      entryPrice: price,
      amount,
    });
    setNewCoin({ symbol: '', entryPrice: '', amount: '' });
    setIsAddCoinOpen(null);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    });
  };

  const filteredCoins = coins.filter(c =>
    c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <FolderOpen className="h-4 w-4" />
          <span className="hidden sm:inline">My Folders</span>
          {folders.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {folders.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              My Coin Folders
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="New folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-40 h-8 text-sm"
              />
              <div className="flex gap-1">
                {FOLDER_COLORS.slice(0, 4).map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "w-5 h-5 rounded-full border-2",
                      selectedColor === color ? "border-white" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          {folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Folder className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No folders yet</p>
              <p className="text-sm">Create a folder to organize your coins</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {folders.map((folder) => {
                const performance = getFolderPerformance(folder.id, prices);
                const isExpanded = expandedFolders.includes(folder.id);

                return (
                  <div key={folder.id} className="bg-card">
                    {/* Folder Header */}
                    <button
                      onClick={() => toggleFolder(folder.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: folder.color }}
                        />
                        <span className="font-medium">{folder.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {folder.coins.length} coins
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4">
                        {performance && folder.coins.length > 0 && (
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-sm font-mono">
                                ${formatPrice(performance.totalValue)}
                              </div>
                              <div className={cn(
                                "text-xs flex items-center gap-1",
                                performance.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'
                              )}>
                                {performance.totalPnl >= 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {performance.totalPnl >= 0 ? '+' : ''}
                                {formatPrice(performance.totalPnl)}
                                <span>({performance.totalPnlPercent >= 0 ? '+' : ''}{performance.totalPnlPercent.toFixed(2)}%)</span>
                              </div>
                            </div>
                            <div className="w-24">
                              <Progress
                                value={Math.min(100, Math.max(0, 50 + performance.totalPnlPercent / 2))}
                                className="h-2"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <Popover open={isAddCoinOpen === folder.id} onOpenChange={(open) => setIsAddCoinOpen(open ? folder.id : null)}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                              <div className="space-y-3">
                                <div className="font-medium">Add Coin to {folder.name}</div>
                                <Input
                                  placeholder="Search coin..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="h-8"
                                />
                                <ScrollArea className="h-32">
                                  <div className="space-y-1">
                                    {filteredCoins.slice(0, 10).map(coin => (
                                      <button
                                        key={coin.symbol}
                                        onClick={() => setNewCoin(prev => ({ ...prev, symbol: coin.symbol }))}
                                        className={cn(
                                          "w-full flex items-center justify-between p-2 rounded hover:bg-secondary text-left",
                                          newCoin.symbol === coin.symbol && "bg-primary/10"
                                        )}
                                      >
                                        <span className="font-medium">{coin.symbol}</span>
                                        <span className="text-sm text-muted-foreground">
                                          ${formatPrice(coin.price)}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </ScrollArea>
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    placeholder="Entry Price"
                                    type="number"
                                    value={newCoin.entryPrice}
                                    onChange={(e) => setNewCoin(prev => ({ ...prev, entryPrice: e.target.value }))}
                                  />
                                  <Input
                                    placeholder="Amount"
                                    type="number"
                                    value={newCoin.amount}
                                    onChange={(e) => setNewCoin(prev => ({ ...prev, amount: e.target.value }))}
                                  />
                                </div>
                                <Button
                                  className="w-full"
                                  onClick={() => handleAddCoin(folder.id)}
                                  disabled={!newCoin.symbol || !newCoin.entryPrice || !newCoin.amount}
                                >
                                  Add {newCoin.symbol || 'Coin'}
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFolder(folder.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>

                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Folder Content */}
                    {isExpanded && performance && (
                      <div className="px-4 pb-3">
                        <div className="bg-secondary/30 rounded-lg overflow-hidden">
                          <div className="grid grid-cols-6 gap-2 px-3 py-2 text-xs text-muted-foreground border-b border-border">
                            <span>Coin</span>
                            <span className="text-right">Entry</span>
                            <span className="text-right">Current</span>
                            <span className="text-right">Amount</span>
                            <span className="text-right">Value</span>
                            <span className="text-right">P&L</span>
                          </div>
                          {performance.coinPerformances.map((coin) => (
                            <div
                              key={coin.symbol}
                              className="grid grid-cols-6 gap-2 px-3 py-2 text-sm hover:bg-secondary/50 cursor-pointer"
                              onClick={() => {
                                onSelectCoin(coin.symbol);
                                setIsOpen(false);
                              }}
                            >
                              <span className="font-medium">{coin.symbol}</span>
                              <span className="text-right font-mono">${formatPrice(coin.entryPrice)}</span>
                              <span className="text-right font-mono">${formatPrice(coin.currentPrice)}</span>
                              <span className="text-right font-mono">{coin.amount}</span>
                              <span className="text-right font-mono">${formatPrice(coin.value)}</span>
                              <span className={cn(
                                "text-right font-mono flex items-center justify-end gap-1",
                                coin.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                              )}>
                                {coin.pnl >= 0 ? '+' : ''}{formatPrice(coin.pnl)}
                                <span className="text-xs">({coin.pnlPercent >= 0 ? '+' : ''}{coin.pnlPercent.toFixed(1)}%)</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
