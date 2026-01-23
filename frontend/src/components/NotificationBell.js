import { useState, useEffect } from 'react';
import { getNotifications, formatCurrency } from '../lib/api';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { 
  Bell, 
  CreditCard, 
  Wallet, 
  FileText, 
  HandCoins, 
  Users2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

const typeIcons = {
  rent_due: CreditCard,
  outstanding_balance: Wallet,
  contract_expiring: FileText,
  loan_outstanding: HandCoins,
  salary_due: Users2
};

const typeColors = {
  rent_due: 'text-orange-600 bg-orange-100',
  outstanding_balance: 'text-red-600 bg-red-100',
  contract_expiring: 'text-blue-600 bg-blue-100',
  loan_outstanding: 'text-purple-600 bg-purple-100',
  salary_due: 'text-teal-600 bg-teal-100'
};

const priorityColors = {
  high: 'border-l-red-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500'
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [highPriority, setHighPriority] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await getNotifications();
      setNotifications(response.data.notifications || []);
      setTotal(response.data.total || 0);
      setHighPriority(response.data.high_priority || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    const Icon = typeIcons[type] || Bell;
    return Icon;
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'high') return <AlertTriangle className="w-3 h-3 text-red-500" />;
    if (priority === 'medium') return <Clock className="w-3 h-3 text-yellow-500" />;
    return <CheckCircle2 className="w-3 h-3 text-green-500" />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          data-testid="notification-bell"
        >
          <Bell className="h-5 w-5" />
          {total > 0 && (
            <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${highPriority > 0 ? 'bg-red-500' : 'bg-primary'}`}>
              {total > 9 ? '9+' : total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-foreground">Notificaties & Reminders</h3>
            <p className="text-xs text-muted-foreground">
              {total} {total === 1 ? 'melding' : 'meldingen'}
              {highPriority > 0 && <span className="text-red-500 ml-1">({highPriority} urgent)</span>}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchNotifications}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-foreground">Geen meldingen</p>
              <p className="text-sm text-muted-foreground">Alles is up-to-date!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = getIcon(notification.type);
                const colorClass = typeColors[notification.type] || 'text-gray-600 bg-gray-100';
                const borderClass = priorityColors[notification.priority] || 'border-l-gray-300';
                
                return (
                  <div 
                    key={notification.id} 
                    className={`p-4 hover:bg-muted/50 cursor-pointer border-l-4 ${borderClass}`}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-lg ${colorClass} shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-foreground truncate">
                            {notification.title}
                          </span>
                          {getPriorityIcon(notification.priority)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {notification.amount && (
                            <span className="font-medium text-foreground">
                              {formatCurrency(notification.amount)}
                            </span>
                          )}
                          {notification.due_date && (
                            <span>
                              {notification.type === 'contract_expiring' ? 'Vervalt' : 'Vervaldatum'}: {notification.due_date}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-3 border-t bg-muted/30">
            <p className="text-xs text-center text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> Urgent
              </span>
              <span className="mx-2">•</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Aandacht
              </span>
              <span className="mx-2">•</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Info
              </span>
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
