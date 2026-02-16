import { useState } from 'react';
import { useAlerts } from '@/contexts/AlertsContext';
import { Bell, Check, Trash2, AlertCircle, TrendingUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function NotificationsPanel() {
  const { notifications, markNotificationAsRead, clearAllNotifications } = useAlerts();
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ALERT':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'ORDER':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'PRICE':
        return <TrendingUp className="h-4 w-4 text-yellow-500" />;
      case 'SYSTEM':
        return <Info className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={clearAllNotifications}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <ScrollArea className="h-64">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
              <p className="text-xs">Alerts and orders will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => markNotificationAsRead(notification.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-secondary/50 transition-colors",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <div className="mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <span className="text-xs text-muted-foreground mt-1">
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {unreadCount > 0 && (
          <div className="px-3 py-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => notifications.filter(n => !n.read).forEach(n => markNotificationAsRead(n.id))}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all as read
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
