import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { 
  FileText, 
  Banknote, 
  Gamepad2, 
  Wallet, 
  Users2, 
  DollarSign,
  LayoutDashboard
} from 'lucide-react';

const actions = [
  { path: '/app/suribet/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-emerald-500' },
  { path: '/app/suribet/dagrapporten', label: 'Dagrapporten', icon: FileText, color: 'text-emerald-500' },
  { path: '/app/suribet/uitbetalingen', label: 'Uitbetalingen', icon: Banknote, color: 'text-orange-500' },
  { path: '/app/suribet/machines', label: 'Machines', icon: Gamepad2, color: 'text-blue-500' },
  { path: '/app/suribet/kasboek', label: 'Kasboek', icon: Wallet, color: 'text-purple-500' },
  { path: '/app/suribet/werknemers', label: 'Werknemers', icon: Users2, color: 'text-pink-500' },
  { path: '/app/suribet/loonuitbetaling', label: 'Loonuitbetaling', icon: DollarSign, color: 'text-teal-500' },
];

export default function SnelleActies() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            const isActive = location.pathname === action.path;
            
            return (
              <Button
                key={action.path}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={`flex items-center gap-2 ${isActive ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                onClick={() => navigate(action.path)}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : action.color}`} />
                <span className="text-xs">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
