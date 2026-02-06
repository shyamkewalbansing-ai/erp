import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  Link, 
  Copy, 
  ExternalLink, 
  QrCode,
  Smartphone,
  CheckCircle2,
  Users2,
  Gamepad2
} from 'lucide-react';
import { toast } from 'sonner';

export default function PortaalLinkPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  
  const getPortalUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/portal/suribet/${user?.id}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(getPortalUrl());
    setCopied(true);
    toast.success('Link gekopieerd naar klembord!');
    setTimeout(() => setCopied(false), 3000);
  };

  const openPortal = () => {
    window.open(getPortalUrl(), '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 lg:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Link className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Shift Portaal</h1>
            <p className="text-emerald-100">Deel deze link met uw werknemers</p>
          </div>
        </div>
      </div>

      {/* Portal Link Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-500" />
            Portaal Link voor Werknemers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Met deze link kunnen uw werknemers inloggen op het shift portaal om zelf hun shifts te starten en stoppen.
            Deel deze link via WhatsApp, SMS of e-mail.
          </p>

          <div className="flex gap-2">
            <Input 
              value={getPortalUrl()} 
              readOnly 
              className="font-mono text-sm"
            />
            <Button 
              onClick={copyLink}
              className={copied ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Gekopieerd!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Kopiëren
                </>
              )}
            </Button>
            <Button variant="outline" onClick={openPortal}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Openen
            </Button>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Users2 className="w-4 h-4 text-emerald-500" />
              Hoe het werkt
            </h4>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Maak een werknemer aan met een <strong>gebruikersnaam</strong> en <strong>wachtwoord</strong> (bij Werknemers → Nieuwe Werknemer)</li>
              <li>Deel de portaal link hierboven met de werknemer</li>
              <li>De werknemer opent de link en logt in met zijn/haar gegevens</li>
              <li>De werknemer kan nu zelf shifts starten en stoppen</li>
            </ol>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Gamepad2 className="w-4 h-4" />
              Tip: Bookmark op telefoon
            </h4>
            <p className="text-sm text-blue-600 dark:text-blue-300">
              Werknemers kunnen de portaal link als bookmark of "Toevoegen aan startscherm" op hun telefoon zetten voor snelle toegang.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
