import HandleidingTemplate from '../../components/HandleidingTemplate';
import { Building2 } from 'lucide-react';

const vastgoedSteps = [
  {
    title: 'Appartement Toevoegen',
    subtitle: 'Begin met het registreren van uw panden',
    description: 'Voordat u huurders kunt toevoegen, moet u eerst uw appartementen/panden registreren in het systeem.',
    substeps: [
      { title: 'Ga naar "Appartementen" in het menu', description: 'Klik op het Appartementen icoon in de zijbalk' },
      { title: 'Klik op "Nieuw Appartement"', description: 'De groene knop rechtsboven' },
      { title: 'Vul de gegevens in', description: 'Naam, adres, aantal kamers, huurprijs per maand' },
      { title: 'Klik op "Opslaan"', description: 'Het appartement is nu beschikbaar voor verhuur' }
    ],
    note: 'Tip: Voeg foto\'s toe aan uw appartementen voor een beter overzicht'
  },
  {
    title: 'Huurder Registreren',
    subtitle: 'Voeg nieuwe huurders toe aan het systeem',
    description: 'Registreer huurders met hun persoonlijke gegevens en contactinformatie.',
    substeps: [
      { title: 'Ga naar "Huurders" in het menu' },
      { title: 'Klik op "Nieuwe Huurder"' },
      { title: 'Vul persoonlijke gegevens in', description: 'Naam, e-mail, telefoon, ID-nummer' },
      { title: 'Selecteer een beschikbaar appartement' },
      { title: 'Stel de huurprijs en ingangsdatum in' },
      { title: 'Klik op "Opslaan"' }
    ],
    note: 'De huurder ontvangt automatisch een e-mail met inloggegevens voor het huurdersportaal'
  },
  {
    title: 'Contract Aanmaken',
    subtitle: 'Maak een huurcontract voor de huurder',
    description: 'Genereer automatisch een huurcontract met alle afspraken.',
    substeps: [
      { title: 'Ga naar "Contracten" in het menu' },
      { title: 'Klik op "Nieuw Contract"' },
      { title: 'Selecteer de huurder' },
      { title: 'Vul contractdetails in', description: 'Startdatum, einddatum, huurprijs, borg' },
      { title: 'Voeg eventuele bijzondere voorwaarden toe' },
      { title: 'Genereer het contract als PDF' }
    ],
    note: 'Contracten kunnen digitaal ondertekend worden via de ondertekeningspagina'
  },
  {
    title: 'Betalingen Registreren',
    subtitle: 'Houd betalingen bij en verstuur herinneringen',
    description: 'Registreer ontvangen huurbetalingen en bekijk openstaande bedragen.',
    substeps: [
      { title: 'Ga naar "Betalingen" in het menu' },
      { title: 'Bekijk openstaande betalingen' },
      { title: 'Klik op "Betaling Toevoegen" bij een huurder' },
      { title: 'Vul het betaalde bedrag en datum in' },
      { title: 'Selecteer de betaalmethode', description: 'Contant, bank, of digitaal' },
      { title: 'Bevestig de betaling' }
    ],
    note: 'Automatische herinneringen worden verstuurd bij achterstallige betalingen'
  },
  {
    title: 'Facturen Genereren',
    subtitle: 'Maak facturen aan voor uw huurders',
    description: 'Genereer maandelijkse facturen automatisch of handmatig.',
    substeps: [
      { title: 'Ga naar "Facturen" in het menu' },
      { title: 'Klik op "Nieuwe Factuur" of "Bulk Facturen"' },
      { title: 'Selecteer de periode en huurders' },
      { title: 'Controleer de bedragen' },
      { title: 'Genereer en verstuur de facturen' }
    ],
    note: 'Facturen kunnen automatisch per e-mail verstuurd worden'
  },
  {
    title: 'Meterstanden Invoeren',
    subtitle: 'Registreer EBS en SWM meterstanden',
    description: 'Houd het verbruik van elektriciteit en water bij per appartement.',
    substeps: [
      { title: 'Ga naar "Meterstanden" in het menu' },
      { title: 'Selecteer het appartement' },
      { title: 'Voer de nieuwe meterstand in', description: 'EBS (elektriciteit) en/of SWM (water)' },
      { title: 'Het systeem berekent automatisch het verbruik' },
      { title: 'Kosten worden doorberekend aan de huurder' }
    ],
    note: 'Vergelijk verbruik met vorige maanden in de grafieken'
  },
  {
    title: 'Onderhoudsverzoeken Beheren',
    subtitle: 'Ontvang en behandel onderhoudsmeldingen',
    description: 'Huurders kunnen onderhoudsverzoeken indienen via het portaal.',
    substeps: [
      { title: 'Ga naar "Onderhoud" in het menu' },
      { title: 'Bekijk nieuwe verzoeken' },
      { title: 'Open een verzoek voor details' },
      { title: 'Wijs toe aan een aannemer of behandel zelf' },
      { title: 'Update de status', description: 'In behandeling, voltooid, etc.' },
      { title: 'Registreer eventuele kosten' }
    ],
    note: 'Huurders worden automatisch geïnformeerd over statuswijzigingen'
  },
  {
    title: 'Borg Beheren',
    subtitle: 'Registreer en beheer borgbetalingen',
    description: 'Houd borgbetalingen bij en verwerk terugbetalingen bij vertrek.',
    substeps: [
      { title: 'Ga naar "Borg" in het menu' },
      { title: 'Bekijk borgstatus per huurder' },
      { title: 'Registreer ontvangen borg bij nieuwe huurders' },
      { title: 'Bij vertrek: verwerk terugbetaling of inhoudingen' }
    ],
    note: 'Documenteer eventuele schade met foto\'s voor inhoudingen'
  }
];

const vastgoedTips = [
  'Stel automatische betalingsherinneringen in via Huurinstellingen',
  'Gebruik het huurdersportaal om huurders zelf betalingen te laten bekijken',
  'Maak regelmatig backups van belangrijke documenten',
  'Controleer maandelijks de openstaande betalingen via het Dashboard',
  'Voeg notities toe aan huurderprofielen voor belangrijke afspraken'
];

const vastgoedWarnings = [
  'Verwijder nooit huurders met openstaande betalingen zonder deze eerst af te handelen',
  'Controleer altijd de meterstanden voordat u facturen verstuurt',
  'Bewaar kopieën van ondertekende contracten'
];

export default function VastgoedHandleidingPage() {
  return (
    <HandleidingTemplate
      moduleName="Vastgoed Beheer"
      moduleIcon={Building2}
      moduleColor="emerald"
      introduction="Welkom bij de Vastgoed Beheer module. Deze handleiding helpt u stap voor stap bij het beheren van uw huurwoningen, appartementen en huurders. Volg de stappen in volgorde voor het beste resultaat."
      steps={vastgoedSteps}
      tips={vastgoedTips}
      warnings={vastgoedWarnings}
    />
  );
}
