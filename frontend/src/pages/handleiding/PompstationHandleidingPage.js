import HandleidingTemplate from '../../components/HandleidingTemplate';
import { Fuel } from 'lucide-react';

const pompstationSteps = [
  {
    title: 'Brandstoftanks Configureren',
    subtitle: 'Stel uw brandstoftanks in',
    description: 'Begin met het registreren van uw brandstoftanks en hun capaciteit.',
    substeps: [
      { title: 'Ga naar "Brandstoftanks" in het menu' },
      { title: 'Klik op "Nieuwe Tank"' },
      { title: 'Vul de tankgegevens in', description: 'Naam, brandstoftype (Benzine/Diesel/LPG)' },
      { title: 'Stel de capaciteit in (liters)' },
      { title: 'Voer het huidige vulniveau in' },
      { title: 'Stel waarschuwingsniveaus in', description: 'Minimum niveau voor bestelling' },
      { title: 'Klik op "Opslaan"' }
    ],
    note: 'U ontvangt automatisch meldingen wanneer tanks bijna leeg zijn'
  },
  {
    title: 'Pompen Configureren',
    subtitle: 'Registreer uw brandstofpompen',
    description: 'Koppel pompen aan tanks en stel prijzen in.',
    substeps: [
      { title: 'Ga naar "Pompen" in het menu' },
      { title: 'Klik op "Nieuwe Pomp"' },
      { title: 'Vul pompgegevens in', description: 'Nummer, locatie' },
      { title: 'Koppel aan een brandstoftank' },
      { title: 'Stel de huidige literprijs in' },
      { title: 'Klik op "Opslaan"' }
    ],
    note: 'Prijzen kunnen eenvoudig worden bijgewerkt wanneer brandstofprijzen veranderen'
  },
  {
    title: 'Levering Registreren',
    subtitle: 'Registreer brandstof leveringen',
    description: 'Houd bij wanneer brandstof wordt geleverd aan uw tanks.',
    substeps: [
      { title: 'Ga naar "Leveringen" in het menu' },
      { title: 'Klik op "Nieuwe Levering"' },
      { title: 'Selecteer de tank' },
      { title: 'Vul het geleverde volume in (liters)' },
      { title: 'Voer de inkoopprijs per liter in' },
      { title: 'Upload de leveringsbon' },
      { title: 'Selecteer de leverancier' },
      { title: 'Bevestig de levering' }
    ],
    note: 'Tankniveaus worden automatisch bijgewerkt na registratie'
  },
  {
    title: 'Winkelvoorraad Beheren',
    subtitle: 'Beheer producten in uw shop',
    description: 'Houd uw winkelvoorraad bij met automatische waarschuwingen.',
    substeps: [
      { title: 'Ga naar "Winkel Voorraad" in het menu' },
      { title: 'Klik op "Nieuw Product"' },
      { title: 'Vul productdetails in', description: 'Naam, categorie, barcode' },
      { title: 'Stel inkoop- en verkoopprijs in' },
      { title: 'Voer de huidige voorraad in' },
      { title: 'Stel minimum voorraadniveau in' }
    ],
    note: 'Producten met lage voorraad worden gemarkeerd in het overzicht'
  },
  {
    title: 'Kassa Gebruiken',
    subtitle: 'Reken brandstof en producten af',
    description: 'Gebruik het kassasysteem voor alle verkopen.',
    substeps: [
      { title: 'Ga naar "Kassa (POS)" in het menu' },
      { title: 'Voor brandstof: selecteer de pomp' },
      { title: 'Voer het aantal liters of bedrag in' },
      { title: 'Voor producten: scan of zoek het product' },
      { title: 'Selecteer de betaalmethode', description: 'Contant, PIN, of digitaal' },
      { title: 'Bevestig de verkoop' }
    ],
    note: 'Tankvoorraad wordt automatisch bijgewerkt na brandstofverkoop'
  },
  {
    title: 'Diensten Plannen',
    subtitle: 'Maak roosters voor personeel',
    description: 'Plan diensten in en houd aanwezigheid bij.',
    substeps: [
      { title: 'Ga naar "Diensten" in het menu' },
      { title: 'Bekijk het weekrooster' },
      { title: 'Klik op een dag om diensten toe te voegen' },
      { title: 'Selecteer medewerkers per dienst' },
      { title: 'Stel begin- en eindtijden in' },
      { title: 'Publiceer het rooster' }
    ],
    note: 'Medewerkers kunnen het rooster bekijken via het personeelsportaal'
  },
  {
    title: 'Personeel Beheren',
    subtitle: 'Registreer en beheer medewerkers',
    description: 'Voeg medewerkers toe en beheer hun gegevens.',
    substeps: [
      { title: 'Ga naar "Personeel" in het menu' },
      { title: 'Klik op "Nieuwe Medewerker"' },
      { title: 'Vul persoonlijke gegevens in' },
      { title: 'Stel functie en uurloon in' },
      { title: 'Geef toegangsrechten', description: 'Kassa, voorraad, etc.' },
      { title: 'Klik op "Opslaan"' }
    ],
    note: 'Medewerkers krijgen eigen inloggegevens voor het kassasysteem'
  },
  {
    title: 'Veiligheid Beheren',
    subtitle: 'Voer veiligheidsinspecties uit',
    description: 'Houd veiligheidsinspecties en incidenten bij.',
    substeps: [
      { title: 'Ga naar "Veiligheid" in het menu' },
      { title: 'Plan regelmatige inspecties in' },
      { title: 'Vul inspectie checklists in' },
      { title: 'Registreer eventuele incidenten' },
      { title: 'Upload certificaten', description: 'Brandveiligheid, milieuvergunningen' },
      { title: 'Stel vervaldatums in voor certificaten' }
    ],
    note: 'U ontvangt meldingen wanneer certificaten bijna verlopen'
  },
  {
    title: 'Rapportages Analyseren',
    subtitle: 'Bekijk bedrijfsprestaties',
    description: 'Analyseer omzet, verbruik en winstmarges.',
    substeps: [
      { title: 'Ga naar "Rapportages" in het menu' },
      { title: 'Selecteer de rapportperiode' },
      { title: 'Bekijk omzet per brandstoftype' },
      { title: 'Analyseer winkelverkoop' },
      { title: 'Bekijk verbruikstrends' },
      { title: 'Exporteer rapporten naar PDF/Excel' }
    ],
    note: 'Gebruik AI-analyse voor voorspellingen en optimalisatie suggesties'
  }
];

const pompstationTips = [
  'Controleer dagelijks de tankniveaus om tekorten te voorkomen',
  'Voer prijswijzigingen direct door in het systeem',
  'Houd veiligheidscertificaten up-to-date voor compliance',
  'Analyseer verkooprapporten om piekmomenten te identificeren',
  'Train al het personeel in veiligheidsprocedures'
];

const pompstationWarnings = [
  'Controleer altijd leveringsbonnen voordat u leveringen bevestigt',
  'Voer nooit brandstofverkoop uit met niet-gekalibreerde pompen',
  'Houd noodprocedures up-to-date en toegankelijk voor personeel',
  'Rapporteer alle veiligheidsincidenten direct'
];

export default function PompstationHandleidingPage() {
  return (
    <HandleidingTemplate
      moduleName="Pompstation"
      moduleIcon={Fuel}
      moduleColor="amber"
      introduction="Welkom bij de Pompstation module. Deze handleiding helpt u bij het beheren van uw tankstation, van brandstofbeheer tot winkelverkoop en veiligheidscompliance. Speciaal ontwikkeld voor de Surinaamse markt."
      steps={pompstationSteps}
      tips={pompstationTips}
      warnings={pompstationWarnings}
    />
  );
}
