import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  FileText, 
  Banknote, 
  Gamepad2, 
  Wallet, 
  Users2, 
  DollarSign
} from 'lucide-react';

export default function SnelleActies() {
  const navigate = useNavigate();

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Snelle Acties</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate('/app/suribet/dagrapporten')}
          >
            <FileText className="w-5 h-5 text-emerald-500" />
            <span className="text-xs">Dagrapporten</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate('/app/suribet/uitbetalingen')}
          >
            <Banknote className="w-5 h-5 text-orange-500" />
            <span className="text-xs">Uitbetalingen</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate('/app/suribet/machines')}
          >
            <Gamepad2 className="w-5 h-5 text-blue-500" />
            <span className="text-xs">Machines</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate('/app/suribet/kasboek')}
          >
            <Wallet className="w-5 h-5 text-purple-500" />
            <span className="text-xs">Kasboek</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate('/app/suribet/werknemers')}
          >
            <Users2 className="w-5 h-5 text-pink-500" />
            <span className="text-xs">Werknemers</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate('/app/suribet/loonuitbetaling')}
          >
            <DollarSign className="w-5 h-5 text-teal-500" />
            <span className="text-xs">Loonuitbetaling</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
