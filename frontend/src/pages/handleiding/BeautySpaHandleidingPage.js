import HandleidingTemplate from '../../components/HandleidingTemplate';
import { Sparkles } from 'lucide-react';

const beautySpSteps = [
  {
    title: 'Behandelingen Toevoegen',
    subtitle: 'Stel uw behandelmenu samen',
    description: 'Voeg alle behandelingen toe die uw spa aanbiedt.',
    substeps: [
      { title: 'Ga naar "Behandelingen" in het menu' },
      { title: 'Klik op "Nieuwe Behandeling"' },
      { title: 'Vul de naam en beschrijving in' },
      { title: 'Stel de duur in (in minuten)' },
      { title: 'Voer de prijs in' },
      { title: 'Selecteer de categorie', description: 'Massage, gezicht, lichaam, etc.' },
      { title: 'Klik op "Opslaan"' }
    ],
    note: 'Voeg ook combinatiepakketten toe voor populaire behandelcombinaties'
  },
  {
    title: 'Personeel Registreren',
    subtitle: 'Voeg medewerkers toe met hun specialisaties',
    description: 'Registreer uw spa-medewerkers en hun expertisegebieden.',
    substeps: [
      { title: 'Ga naar "Personeel" in het menu' },
      { title: 'Klik op "Nieuwe Medewerker"' },
      { title: 'Vul persoonlijke gegevens in' },
      { title: 'Selecteer specialisaties', description: 'Welke behandelingen kan deze medewerker uitvoeren' },
      { title: 'Stel werkdagen en -tijden in' },
      { title: 'Klik op "Opslaan"' }
    ],
    note: 'Medewerkers kunnen commissie ontvangen per behandeling'
  },
  {
    title: 'Klant Registreren',
    subtitle: 'Voeg klanten toe met hun voorkeuren',
    description: 'Registreer klanten met hun huidtype, allergieën en voorkeuren.',
    substeps: [
      { title: 'Ga naar "Klanten" in het menu' },
      { title: 'Klik op "Nieuwe Klant"' },
      { title: 'Vul contactgegevens in' },
      { title: 'Noteer huidtype en allergieën' },
      { title: 'Voeg eventuele notities toe' },
      { title: 'Selecteer een lidmaatschapsniveau', description: 'Bronze, Silver, Gold, Platinum' }
    ],
    note: 'Klanten bouwen loyaliteitspunten op bij elke behandeling'
  },
  {
    title: 'Afspraak Maken',
    subtitle: 'Plan afspraken in voor klanten',
    description: 'Boek behandelingen in voor klanten op beschikbare tijden.',
    substeps: [
      { title: 'Ga naar "Afspraken" in het menu' },
      { title: 'Klik op "Nieuwe Afspraak"' },
      { title: 'Selecteer de klant' },
      { title: 'Kies de behandeling(en)' },
      { title: 'Selecteer de medewerker' },
      { title: 'Kies datum en tijd' },
      { title: 'Bevestig de afspraak' }
    ],
    note: 'Klanten kunnen ook zelf online afspraken maken via het booking portaal'
  },
  {
    title: 'Wachtrij Beheren',
    subtitle: 'Beheer walk-in klanten',
    description: 'Voor klanten zonder afspraak: voeg ze toe aan de wachtrij.',
    substeps: [
      { title: 'Ga naar "Wachtrij" in het menu' },
      { title: 'Klik op "Toevoegen aan Wachtrij"' },
      { title: 'Selecteer of registreer de klant' },
      { title: 'Kies de gewenste behandeling' },
      { title: 'De klant wordt in de rij geplaatst' },
      { title: 'Roep de volgende klant op wanneer een medewerker vrij is' }
    ],
    note: 'De geschatte wachttijd wordt automatisch berekend'
  },
  {
    title: 'Kassa (POS) Gebruiken',
    subtitle: 'Reken behandelingen af',
    description: 'Gebruik de kassa om behandelingen en producten af te rekenen.',
    substeps: [
      { title: 'Ga naar "Kassa (POS)" in het menu' },
      { title: 'Selecteer de klant' },
      { title: 'Voeg behandelingen toe aan de bon' },
      { title: 'Voeg eventueel producten toe' },
      { title: 'Pas kortingen of vouchers toe indien van toepassing' },
      { title: 'Selecteer de betaalmethode', description: 'Contant, PIN, QR (Telesur/Finabank/Hakrinbank)' },
      { title: 'Bevestig de betaling' }
    ],
    note: 'Loyaliteitspunten worden automatisch bijgeschreven'
  },
  {
    title: 'Producten Beheren',
    subtitle: 'Beheer uw productvoorraad',
    description: 'Houd uw spa-producten bij met voorraad en vervaldatums.',
    substeps: [
      { title: 'Ga naar "Producten" in het menu' },
      { title: 'Klik op "Nieuw Product"' },
      { title: 'Vul productdetails in' },
      { title: 'Stel inkoop- en verkoopprijs in' },
      { title: 'Voer de voorraad in' },
      { title: 'Stel een minimum voorraadniveau in voor waarschuwingen' }
    ],
    note: 'U ontvangt meldingen wanneer producten bijna op zijn of verlopen'
  },
  {
    title: 'Vouchers Aanmaken',
    subtitle: 'Maak cadeaubonnen en kortingscodes',
    description: 'Creëer vouchers voor promoties of als cadeau.',
    substeps: [
      { title: 'Ga naar "Vouchers" in het menu' },
      { title: 'Klik op "Nieuwe Voucher"' },
      { title: 'Kies het type', description: 'Cadeaubon of kortingscode' },
      { title: 'Stel de waarde of korting in' },
      { title: 'Stel een eventuele vervaldatum in' },
      { title: 'Genereer de vouchercode' }
    ],
    note: 'Vouchers kunnen worden uitgeprint of per e-mail verstuurd'
  },
  {
    title: 'Rapportages Bekijken',
    subtitle: 'Analyseer uw bedrijfsprestaties',
    description: 'Bekijk omzet, populaire behandelingen en medewerker prestaties.',
    substeps: [
      { title: 'Ga naar "Rapportages" in het menu' },
      { title: 'Selecteer de gewenste periode' },
      { title: 'Bekijk omzet per dag/week/maand' },
      { title: 'Analyseer populaire behandelingen' },
      { title: 'Bekijk prestaties per medewerker' },
      { title: 'Exporteer rapporten naar PDF of Excel' }
    ],
    note: 'Gebruik de inzichten om uw dienstverlening te optimaliseren'
  }
];

const beautySpaTips = [
  'Stel het online booking portaal in zodat klanten zelf afspraken kunnen maken',
  'Gebruik het loyaliteitsprogramma om terugkerende klanten te belonen',
  'Houd vervaldatums van producten bij voor kwaliteitsgarantie',
  'Analyseer rapportages om te zien welke behandelingen het populairst zijn',
  'Train personeel in het gebruik van het kassasysteem'
];

const beautySpaWarnings = [
  'Controleer altijd allergieën voordat u een behandeling uitvoert',
  'Houd producten met vervaldatums goed in de gaten',
  'Maak regelmatig backups van klantgegevens'
];

export default function BeautySpaHandleidingPage() {
  return (
    <HandleidingTemplate
      moduleName="Beauty Spa"
      moduleIcon={Sparkles}
      moduleColor="pink"
      introduction="Welkom bij de Beauty Spa module. Deze handleiding helpt u bij het beheren van uw schoonheidssalon of spa, van afspraken tot kassabeheer. Speciaal ontwikkeld voor de Surinaamse markt met lokale betaalmethoden."
      steps={beautySpSteps}
      tips={beautySpaTips}
      warnings={beautySpaWarnings}
    />
  );
}
