import HandleidingTemplate from '../../components/HandleidingTemplate';
import { Users } from 'lucide-react';

const hrmSteps = [
  {
    title: 'Werknemer Toevoegen',
    subtitle: 'Registreer nieuwe werknemers in het systeem',
    description: 'Begin met het toevoegen van uw personeel aan het HRM systeem met alle relevante gegevens.',
    substeps: [
      { title: 'Ga naar "Personeel" in het menu' },
      { title: 'Klik op "Nieuwe Werknemer"' },
      { title: 'Vul persoonlijke gegevens in', description: 'Naam, geboortedatum, adres, ID-nummer' },
      { title: 'Voeg contactgegevens toe', description: 'E-mail, telefoon, noodcontact' },
      { title: 'Vul bankgegevens in voor salarisuitbetaling' },
      { title: 'Selecteer de afdeling en functie' },
      { title: 'Klik op "Opslaan"' }
    ],
    note: 'Upload een pasfoto voor het werknemersprofiel'
  },
  {
    title: 'Contract Aanmaken',
    subtitle: 'Maak een arbeidscontract voor de werknemer',
    description: 'Genereer arbeidscontracten met alle arbeidsvoorwaarden.',
    substeps: [
      { title: 'Ga naar "Contracten" in het HRM menu' },
      { title: 'Klik op "Nieuw Contract"' },
      { title: 'Selecteer de werknemer' },
      { title: 'Kies het contracttype', description: 'Vast, tijdelijk, of oproep' },
      { title: 'Vul salaris en arbeidsuren in' },
      { title: 'Stel start- en einddatum in' },
      { title: 'Genereer het contract als PDF' }
    ],
    note: 'Contracten kunnen digitaal ondertekend worden'
  },
  {
    title: 'Verlofaanvragen Beheren',
    subtitle: 'Behandel verlofaanvragen van werknemers',
    description: 'Werknemers kunnen via het portaal verlof aanvragen. U keurt deze goed of af.',
    substeps: [
      { title: 'Ga naar "Verlof" in het menu' },
      { title: 'Bekijk openstaande aanvragen' },
      { title: 'Klik op een aanvraag voor details' },
      { title: 'Controleer het verlofsaldo' },
      { title: 'Keur goed of wijs af met reden' }
    ],
    note: 'Het verlofsaldo wordt automatisch bijgewerkt na goedkeuring'
  },
  {
    title: 'Aanwezigheid Registreren',
    subtitle: 'Houd werktijden en aanwezigheid bij',
    description: 'Registreer wanneer werknemers in- en uitklokken.',
    substeps: [
      { title: 'Ga naar "Aanwezigheid" in het menu' },
      { title: 'Bekijk het overzicht per dag of week' },
      { title: 'Werknemers klokken in via het portaal' },
      { title: 'Controleer en corrigeer indien nodig' },
      { title: 'Exporteer rapporten voor de salarisadministratie' }
    ],
    note: 'Overwerk wordt automatisch berekend op basis van ingestelde werkuren'
  },
  {
    title: 'Loonstroken Genereren',
    subtitle: 'Maak maandelijkse loonstroken aan',
    description: 'Genereer loonstroken met salaris, toeslagen en inhoudingen.',
    substeps: [
      { title: 'Ga naar "Loonlijst" in het menu' },
      { title: 'Selecteer de maand' },
      { title: 'Controleer de gewerkte uren per werknemer' },
      { title: 'Voeg eventuele toeslagen of inhoudingen toe' },
      { title: 'Klik op "Loonstroken Genereren"' },
      { title: 'Download of verstuur de loonstroken per e-mail' }
    ],
    note: 'Loonstroken worden als PDF gegenereerd met uw bedrijfslogo'
  },
  {
    title: 'Documenten Beheren',
    subtitle: 'Upload en organiseer personeelsdocumenten',
    description: 'Bewaar belangrijke documenten zoals ID-kopieën, diploma\'s en certificaten.',
    substeps: [
      { title: 'Ga naar "Documenten" in het menu' },
      { title: 'Selecteer een werknemer' },
      { title: 'Klik op "Document Uploaden"' },
      { title: 'Selecteer het documenttype' },
      { title: 'Upload het bestand' },
      { title: 'Stel eventueel een vervaldatum in' }
    ],
    note: 'U ontvangt een melding wanneer documenten bijna verlopen'
  },
  {
    title: 'Werving Beheren',
    subtitle: 'Beheer vacatures en sollicitaties',
    description: 'Publiceer vacatures en volg sollicitaties.',
    substeps: [
      { title: 'Ga naar "Werving" in het menu' },
      { title: 'Klik op "Nieuwe Vacature"' },
      { title: 'Vul de functie-eisen in' },
      { title: 'Publiceer de vacature' },
      { title: 'Bekijk en beoordeel sollicitaties' },
      { title: 'Plan gesprekken in en update de status' }
    ],
    note: 'Geselecteerde kandidaten kunnen direct als werknemer worden toegevoegd'
  },
  {
    title: 'HRM Instellingen Configureren',
    subtitle: 'Pas de module aan uw bedrijf aan',
    description: 'Stel afdelingen, functies, verloftypes en andere opties in.',
    substeps: [
      { title: 'Ga naar "HRM Instellingen"' },
      { title: 'Configureer afdelingen en functies' },
      { title: 'Stel verloftypes en saldi in' },
      { title: 'Definieer werktijden en pauzes' },
      { title: 'Configureer salarisschalen' }
    ],
    note: 'Neem de tijd om alle instellingen goed te configureren voordat u begint'
  }
];

const hrmTips = [
  'Stel automatische verlofopbouw in per jaar',
  'Gebruik het werknemersportaal om werknemers zelf verlof te laten aanvragen',
  'Exporteer aanwezigheidsrapporten voor uw boekhouding',
  'Houd vervaldatums van documenten bij voor compliance',
  'Plan regelmatig functioneringsgesprekken in via de agenda'
];

const hrmWarnings = [
  'Verwijder nooit werknemers met openstaande loonstroken',
  'Controleer altijd de gewerkte uren voordat u loonstroken genereert',
  'Bewaar kopieën van ondertekende contracten minimaal 7 jaar'
];

export default function HRMHandleidingPage() {
  return (
    <HandleidingTemplate
      moduleName="HRM"
      moduleIcon={Users}
      moduleColor="blue"
      introduction="Welkom bij de HRM module. Deze handleiding helpt u bij het beheren van uw personeel, van werving tot salarisadministratie. Volg de stappen in volgorde voor een complete personeelsadministratie."
      steps={hrmSteps}
      tips={hrmTips}
      warnings={hrmWarnings}
    />
  );
}
