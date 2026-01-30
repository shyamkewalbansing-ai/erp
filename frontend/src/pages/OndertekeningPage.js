import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { getContractForSigning, signContract, formatCurrency } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { 
  FileText, 
  CheckCircle2, 
  Loader2,
  Building2,
  User,
  Calendar,
  Banknote,
  AlertCircle,
  Eraser,
  FileSignature
} from 'lucide-react';

export default function OndertekeningPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const sigCanvas = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contractData, setContractData] = useState(null);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    fetchContract(); // eslint-disable-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchContract = async () => {
    try {
      const response = await getContractForSigning(token);
      setContractData(response.data);
    } catch (error) {
      if (error.response?.status === 400) {
        setError('Dit contract is al ondertekend.');
        setSigned(true);
      } else {
        setError('Contract niet gevonden of de link is verlopen.');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSign = async () => {
    if (sigCanvas.current?.isEmpty()) {
      toast.error('Plaats eerst uw handtekening');
      return;
    }

    setSigning(true);
    try {
      const signatureData = sigCanvas.current.toDataURL('image/png');
      await signContract(token, signatureData);
      setSigned(true);
      toast.success('Contract succesvol ondertekend!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij ondertekenen');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Contract Ondertekend!</h2>
            <p className="text-muted-foreground mb-6">
              Bedankt voor het ondertekenen van uw huurcontract. U ontvangt een kopie per e-mail.
            </p>
            <Button variant="outline" onClick={() => window.close()}>
              Venster Sluiten
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Fout</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { contract, tenant, apartment, landlord } = contractData;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <FileSignature className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Huurcontract Ondertekenen</h1>
          <p className="text-muted-foreground mt-2">
            Controleer de gegevens en plaats uw handtekening onderaan
          </p>
        </div>

        {/* Contract Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Contractgegevens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Landlord Info */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Verhuurder
              </h3>
              <div className="space-y-1">
                <p className="font-medium">{landlord?.company_name || landlord?.name}</p>
                {landlord?.company_name && <p className="text-sm text-muted-foreground">{landlord?.name}</p>}
                <p className="text-sm text-muted-foreground">{landlord?.email}</p>
              </div>
            </div>

            {/* Tenant Info */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Huurder
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="font-medium">{tenant?.name}</p>
                    <p className="text-sm text-muted-foreground">ID: {tenant?.id_number || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{tenant?.email}</p>
                  <p className="text-sm text-muted-foreground">{tenant?.phone}</p>
                </div>
              </div>
            </div>

            {/* Apartment Info */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Het Gehuurde
              </h3>
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="font-medium">{apartment?.name}</p>
                  <p className="text-sm text-muted-foreground">{apartment?.address || 'Adres niet opgegeven'}</p>
                </div>
              </div>
            </div>

            {/* Contract Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Huurperiode</h3>
                </div>
                <p className="text-sm">
                  Vanaf: <span className="font-medium">{contract?.start_date}</span>
                </p>
                <p className="text-sm">
                  Tot: <span className="font-medium">{contract?.end_date || 'Onbepaalde tijd'}</span>
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Financieel</h3>
                </div>
                <p className="text-sm">
                  Huur: <span className="font-medium">{formatCurrency(contract?.rent_amount)}/maand</span>
                </p>
                <p className="text-sm">
                  Borg: <span className="font-medium">{formatCurrency(contract?.deposit_amount)}</span>
                </p>
              </div>
            </div>

            {/* Payment Terms */}
            <div className="p-4 border border-primary/20 bg-primary/5 rounded-lg">
              <h3 className="font-semibold text-sm text-primary mb-2">Betaalvoorwaarden</h3>
              <p className="text-sm">
                De huur is verschuldigd op de <span className="font-medium">{contract?.payment_due_day}e</span> van elke maand.
                {contract?.payment_deadline_day > 0 && (
                  <> Uiterste betaaldatum: de <span className="font-medium">{contract?.payment_deadline_day}e</span> van {contract?.payment_deadline_month_offset === 1 ? 'de volgende maand' : 'dezelfde maand'}.</>
                )}
              </p>
            </div>

            {/* Additional Terms */}
            {contract?.additional_terms && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                  Bijzondere Bepalingen
                </h3>
                <p className="text-sm whitespace-pre-wrap">{contract.additional_terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle>Uw Handtekening</CardTitle>
            <CardDescription>
              Plaats uw handtekening in het vak hieronder met uw muis of vinger
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg bg-white overflow-hidden">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  className: 'w-full h-48 cursor-crosshair',
                  style: { width: '100%', height: '200px' }
                }}
                backgroundColor="white"
                penColor="black"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={clearSignature} type="button">
                <Eraser className="w-4 h-4 mr-2" />
                Wissen
              </Button>
              
              <Button onClick={handleSign} disabled={signing} data-testid="sign-contract-btn">
                {signing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Contract Ondertekenen
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Door te ondertekenen gaat u akkoord met de voorwaarden van dit huurcontract.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
