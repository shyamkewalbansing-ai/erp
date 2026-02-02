import HandleidingTemplate from '../../components/HandleidingTemplate';
import { Car } from 'lucide-react';

const autoDealerSteps = [
  {
    title: 'Voertuig Toevoegen',
    subtitle: 'Registreer voertuigen in uw voorraad',
    description: 'Voeg nieuwe voertuigen toe aan uw voorraad met alle specificaties.',
    substeps: [
      { title: 'Ga naar "Voertuigen" in het menu' },
      { title: 'Klik op "Nieuw Voertuig"' },
      { title: 'Vul basisgegevens in', description: 'Merk, model, bouwjaar, kleur' },
      { title: 'Voer het VIN/chassisnummer in' },
      { title: 'Stel de inkoopprijs in (EUR/USD/SRD)' },
      { title: 'Stel de verkoopprijs in' },
      { title: 'Upload foto\'s van het voertuig' },
      { title: 'Klik op "Opslaan"' }
    ],
    note: 'Voeg meerdere foto\'s toe voor een aantrekkelijke presentatie'
  },
  {
    title: 'Klant Registreren',
    subtitle: 'Voeg nieuwe klanten toe',
    description: 'Registreer klanten met hun contactgegevens en voorkeuren.',
    substeps: [
      { title: 'Ga naar "Klanten" in het menu' },
      { title: 'Klik op "Nieuwe Klant"' },
      { title: 'Vul persoonlijke gegevens in' },
      { title: 'Voeg contactgegevens toe' },
      { title: 'Noteer eventuele voorkeuren', description: 'Gewenst merk, budget, etc.' },
      { title: 'Klik op "Opslaan"' }
    ],
    note: 'Klanten krijgen toegang tot het klantenportaal om hun aankopen te bekijken'
  },
  {
    title: 'Verkoop Registreren',
    subtitle: 'Registreer een voertuigverkoop',
    description: 'Leg de verkoop van een voertuig vast met alle details.',
    substeps: [
      { title: 'Ga naar "Verkopen" in het menu' },
      { title: 'Klik op "Nieuwe Verkoop"' },
      { title: 'Selecteer het voertuig' },
      { title: 'Selecteer of voeg de klant toe' },
      { title: 'Vul de verkoopprijs in', description: 'Kies de valuta: SRD, EUR of USD' },
      { title: 'Stel de betaalwijze in', description: 'Contant, bank, of betalingsregeling' },
      { title: 'Bevestig de verkoop' }
    ],
    note: 'De winstmarge wordt automatisch berekend'
  },
  {
    title: 'Betalingsregeling Instellen',
    subtitle: 'Maak een afbetalingsplan voor de klant',
    description: 'Stel een betalingsregeling in voor klanten die in termijnen betalen.',
    substeps: [
      { title: 'Open de verkoop' },
      { title: 'Klik op "Betalingsregeling"' },
      { title: 'Vul het aantal termijnen in' },
      { title: 'Stel het maandbedrag in' },
      { title: 'Kies de eerste betaaldatum' },
      { title: 'Bevestig de regeling' }
    ],
    note: 'Klanten ontvangen automatisch herinneringen voor betalingen'
  },
  {
    title: 'Betalingen Ontvangen',
    subtitle: 'Registreer ontvangen betalingen',
    description: 'Houd betalingen bij van klanten met betalingsregelingen.',
    substeps: [
      { title: 'Ga naar de verkoop of klantpagina' },
      { title: 'Bekijk openstaande termijnen' },
      { title: 'Klik op "Betaling Registreren"' },
      { title: 'Vul het ontvangen bedrag in' },
      { title: 'Selecteer de betaalmethode' },
      { title: 'Bevestig de betaling' }
    ],
    note: 'Het resterende bedrag wordt automatisch bijgewerkt'
  },
  {
    title: 'Valuta Beheren',
    subtitle: 'Werk met meerdere valuta',
    description: 'Het systeem ondersteunt SRD, EUR en USD voor internationale handel.',
    substeps: [
      { title: 'Prijzen kunnen in elke valuta worden ingevoerd' },
      { title: 'Het systeem rekent automatisch om' },
      { title: 'Wisselkoersen worden regelmatig bijgewerkt' },
      { title: 'Rapporten tonen alle bedragen in SRD' }
    ],
    note: 'Controleer regelmatig de wisselkoersen voor accurate prijzen'
  },
  {
    title: 'Klantenportaal Gebruiken',
    subtitle: 'Laat klanten hun aankopen bekijken',
    description: 'Klanten kunnen via het portaal hun voertuigen en betalingen bekijken.',
    substeps: [
      { title: 'Deel de portaallink met klanten' },
      { title: 'Klanten loggen in met hun e-mail' },
      { title: 'Ze kunnen hun voertuig(en) bekijken' },
      { title: 'Betalingsoverzicht en documenten zijn beschikbaar' }
    ],
    note: 'Het portaal is beschikbaar via de "Klant Portaal" link in het menu'
  }
];

const autoDealerTips = [
  'Voeg altijd meerdere foto\'s toe aan voertuigen voor betere presentatie',
  'Houd de wisselkoersen regelmatig bij voor accurate prijzen',
  'Gebruik het klantenportaal voor transparantie richting klanten',
  'Exporteer verkooprapporten voor uw boekhouding',
  'Stel herinneringen in voor betalingsregelingen'
];

const autoDealerWarnings = [
  'Controleer altijd het VIN-nummer voordat u een voertuig registreert',
  'Verwijder geen voertuigen met openstaande betalingsregelingen',
  'Bewaar kopieën van alle verkoopdocumenten'
];

export default function AutoDealerHandleidingPage() {
  return (
    <HandleidingTemplate
      moduleName="Auto Dealer"
      moduleIcon={Car}
      moduleColor="orange"
      introduction="Welkom bij de Auto Dealer module. Deze handleiding helpt u bij het beheren van uw autohandel, van voorraad tot verkoop en klantenbeheer. Het systeem ondersteunt meerdere valuta (SRD, EUR, USD) voor internationale handel."
      steps={autoDealerSteps}
      tips={autoDealerTips}
      warnings={autoDealerWarnings}
    />
  );
}
