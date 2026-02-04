import HandleidingTemplate from '../../components/HandleidingTemplate';
import { Calculator } from 'lucide-react';

const boekhoudingSteps = [
  {
    title: 'Grootboekrekeningen Instellen',
    subtitle: 'Begin met het opzetten van uw rekeningschema',
    description: 'Het grootboek is de basis van uw boekhouding. Hier worden alle financiële transacties gecategoriseerd.',
    substeps: [
      { title: 'Ga naar "Grootboek" in het menu', description: 'Klik op Grootboek in de zijbalk' },
      { title: 'Bekijk de standaard rekeningen', description: 'Het systeem bevat al basis rekeningen zoals Bank, Kas, Debiteuren, Crediteuren' },
      { title: 'Voeg nieuwe rekeningen toe indien nodig', description: 'Klik op "Nieuwe Rekening" voor specifieke categorieën' },
      { title: 'Stel het rekeningtype in', description: 'Activa, Passiva, Kosten, Opbrengsten, of Eigen Vermogen' },
      { title: 'Geef een rekeningnummer en naam', description: 'Bijv. 1000 - Kas, 1100 - Bank SRD, 4000 - Omzet' }
    ],
    note: 'Tip: Gebruik een logisch nummeringssysteem. 1xxx voor activa, 2xxx voor passiva, 4xxx voor opbrengsten, 8xxx voor kosten'
  },
  {
    title: 'Debiteuren Beheren',
    subtitle: 'Registreer uw klanten en openstaande vorderingen',
    description: 'Debiteuren zijn klanten die nog geld aan u verschuldigd zijn. Houd hier uw openstaande facturen bij.',
    substeps: [
      { title: 'Ga naar "Debiteuren" in het menu' },
      { title: 'Klik op "Nieuwe Debiteur"' },
      { title: 'Vul klantgegevens in', description: 'Bedrijfsnaam, contactpersoon, adres, telefoon, e-mail' },
      { title: 'Voeg BTW-nummer toe indien van toepassing' },
      { title: 'Stel betalingstermijn in', description: 'Standaard 14 of 30 dagen' },
      { title: 'Klik op "Opslaan"' }
    ],
    note: 'Debiteuren worden automatisch gekoppeld aan verkoopfacturen die u maakt'
  },
  {
    title: 'Crediteuren Beheren',
    subtitle: 'Registreer uw leveranciers en openstaande schulden',
    description: 'Crediteuren zijn leveranciers aan wie u nog geld verschuldigd bent.',
    substeps: [
      { title: 'Ga naar "Crediteuren" in het menu' },
      { title: 'Klik op "Nieuwe Crediteur"' },
      { title: 'Vul leveranciersgegevens in', description: 'Bedrijfsnaam, adres, bankrekening' },
      { title: 'Stel standaard betalingstermijn in' },
      { title: 'Voeg eventueel notities toe' },
      { title: 'Klik op "Opslaan"' }
    ],
    note: 'Houd bij elke crediteur de bankgegevens bij voor eenvoudig betalen'
  },
  {
    title: 'Verkoopfacturen Maken',
    subtitle: 'Factureer uw klanten voor geleverde diensten of producten',
    description: 'Maak professionele facturen aan en verstuur deze per e-mail naar uw klanten.',
    substeps: [
      { title: 'Ga naar "Verkoopfacturen" in het menu' },
      { title: 'Klik op "Nieuwe Factuur"' },
      { title: 'Selecteer de debiteur (klant)' },
      { title: 'Kies de valuta', description: 'SRD, USD of EUR' },
      { title: 'Voeg factuurregels toe', description: 'Omschrijving, aantal, prijs per stuk' },
      { title: 'Stel BTW percentage in indien van toepassing' },
      { title: 'Controleer het totaalbedrag' },
      { title: 'Klik op "Opslaan" of "Opslaan & Versturen"' }
    ],
    note: 'Facturen krijgen automatisch een uniek factuurnummer. U kunt het formaat aanpassen in Instellingen'
  },
  {
    title: 'Inkoopfacturen Registreren',
    subtitle: 'Boek facturen van uw leveranciers',
    description: 'Registreer alle inkomende facturen om uw kosten en schulden bij te houden.',
    substeps: [
      { title: 'Ga naar "Inkoopfacturen" in het menu' },
      { title: 'Klik op "Nieuwe Inkoopfactuur"' },
      { title: 'Selecteer de crediteur (leverancier)' },
      { title: 'Vul factuurnummer van de leverancier in' },
      { title: 'Voer factuurdatum en vervaldatum in' },
      { title: 'Voeg factuurregels toe met bedragen' },
      { title: 'Selecteer de juiste kostenrekening', description: 'Bijv. Kantoorkosten, Inkoop, Verzekeringen' },
      { title: 'Klik op "Opslaan"' }
    ],
    note: 'Upload een foto of PDF van de originele factuur voor uw administratie'
  },
  {
    title: 'Bank/Kas Transacties',
    subtitle: 'Registreer alle geldstromen',
    description: 'Houd al uw bankmutaties en contante betalingen bij in het systeem.',
    substeps: [
      { title: 'Ga naar "Bank/Kas" in het menu' },
      { title: 'Selecteer de juiste rekening', description: 'Bank SRD, Bank USD, Kas' },
      { title: 'Klik op "Nieuwe Transactie"' },
      { title: 'Kies het type', description: 'Ontvangst of Betaling' },
      { title: 'Vul bedrag en datum in' },
      { title: 'Selecteer de tegenrekening', description: 'Bijv. Debiteur betaalt: selecteer de debiteur' },
      { title: 'Voeg een omschrijving toe' },
      { title: 'Klik op "Boeken"' }
    ],
    note: 'Bij betaling van een openstaande factuur wordt deze automatisch als betaald gemarkeerd'
  },
  {
    title: 'BTW Aangifte Voorbereiden',
    subtitle: 'Bereken uw BTW verplichtingen',
    description: 'Het systeem berekent automatisch uw af te dragen of terug te vorderen BTW.',
    substeps: [
      { title: 'Ga naar "Rapportages" in het menu' },
      { title: 'Selecteer "BTW Overzicht"' },
      { title: 'Kies de periode', description: 'Maand, kwartaal of jaar' },
      { title: 'Bekijk de berekening', description: 'Verschuldigde BTW minus voorbelasting' },
      { title: 'Exporteer het rapport naar PDF' },
      { title: 'Gebruik dit voor uw BTW aangifte bij de Belastingdienst' }
    ],
    note: 'Zorg dat alle facturen correct zijn geboekt met het juiste BTW percentage'
  },
  {
    title: 'Journaalposten Maken',
    subtitle: 'Boek complexe of correctie transacties',
    description: 'Voor transacties die niet via standaard invoer kunnen, gebruikt u journaalposten.',
    substeps: [
      { title: 'Ga naar "Grootboek" → "Journaalposten"' },
      { title: 'Klik op "Nieuwe Journaalpost"' },
      { title: 'Vul de boekdatum in' },
      { title: 'Voeg boekingsregels toe', description: 'Elke regel: rekening + debet OF credit bedrag' },
      { title: 'Zorg dat debet en credit in balans zijn' },
      { title: 'Voeg een duidelijke omschrijving toe' },
      { title: 'Klik op "Boeken"' }
    ],
    note: 'Journaalposten zijn handig voor afschrijvingen, correcties en bijzondere transacties'
  },
  {
    title: 'Rapportages Bekijken',
    subtitle: 'Analyseer uw financiële situatie',
    description: 'Genereer overzichten om inzicht te krijgen in uw bedrijfsresultaten.',
    substeps: [
      { title: 'Ga naar "Rapportages" in het menu' },
      { title: 'Kies het type rapport', description: 'Balans, Winst & Verlies, Grootboekkaarten, BTW Overzicht' },
      { title: 'Selecteer de periode' },
      { title: 'Klik op "Genereren"' },
      { title: 'Bekijk het rapport op scherm' },
      { title: 'Exporteer naar PDF of Excel indien gewenst' }
    ],
    note: 'De Winst & Verlies rekening toont uw omzet, kosten en netto resultaat'
  },
  {
    title: 'Jaarafsluiting',
    subtitle: 'Sluit het boekjaar af',
    description: 'Aan het einde van het boekjaar maakt u het resultaat op en begint u een nieuw jaar.',
    substeps: [
      { title: 'Controleer of alle transacties zijn geboekt' },
      { title: 'Maak een Balans en Winst & Verlies rapport' },
      { title: 'Controleer openstaande debiteuren en crediteuren' },
      { title: 'Ga naar "Instellingen" → "Boekjaar"' },
      { title: 'Klik op "Jaar Afsluiten"' },
      { title: 'Het resultaat wordt overgeboekt naar Eigen Vermogen' },
      { title: 'Een nieuw boekjaar wordt aangemaakt' }
    ],
    note: 'Maak altijd een backup voordat u het jaar afsluit. Deze actie kan niet ongedaan worden gemaakt.'
  }
];

const boekhoudingTips = [
  'Boek transacties zo snel mogelijk - liefst dezelfde dag',
  'Gebruik duidelijke omschrijvingen bij elke boeking',
  'Controleer wekelijks of uw banksaldo klopt met de administratie',
  'Maak maandelijks een Winst & Verlies rapport om uw resultaat te volgen',
  'Bewaar alle originele facturen (digitaal of fysiek) minimaal 7 jaar',
  'Stel betalingsherinneringen in voor openstaande debiteuren',
  'Gebruik de multi-valuta functie voor buitenlandse transacties',
  'Maak regelmatig backups van uw administratie',
  'Controleer de BTW berekeningen voor de aangifte deadline'
];

const boekhoudingWarnings = [
  'Verwijder nooit geboekte transacties - maak een correctieboeking',
  'Zorg dat debet en credit altijd in balans zijn bij journaalposten',
  'Boek geen privé-uitgaven op zakelijke rekeningen',
  'Let op de juiste BTW percentages (0%, 10% of vrijgesteld)',
  'Sluit het boekjaar niet af voordat alle transacties zijn gecontroleerd',
  'Houd rekening met wisselkoersverschillen bij multi-valuta transacties'
];

const boekhoudingGlossary = [
  { term: 'Debet', description: 'Linkerzijde van een boeking. Toename van activa of afname van passiva/eigen vermogen.' },
  { term: 'Credit', description: 'Rechterzijde van een boeking. Afname van activa of toename van passiva/eigen vermogen.' },
  { term: 'Grootboek', description: 'Het totaaloverzicht van alle rekeningen en transacties in uw administratie.' },
  { term: 'Debiteur', description: 'Een klant die nog geld aan u verschuldigd is (u heeft een vordering).' },
  { term: 'Crediteur', description: 'Een leverancier aan wie u nog geld verschuldigd bent (u heeft een schuld).' },
  { term: 'BTW', description: 'Belasting Toegevoegde Waarde - omzetbelasting die u int en afdraagt aan de overheid.' },
  { term: 'Voorbelasting', description: 'BTW die u heeft betaald aan leveranciers en mag verrekenen met af te dragen BTW.' },
  { term: 'Balans', description: 'Overzicht van bezittingen (activa) en schulden (passiva) op een bepaald moment.' },
  { term: 'Winst & Verlies', description: 'Overzicht van omzet en kosten over een bepaalde periode, resulterend in winst of verlies.' },
  { term: 'Journaalpost', description: 'Een handmatige boeking met debet- en creditregels voor complexe transacties.' },
  { term: 'Boekjaar', description: 'De periode waarover u uw administratie voert, meestal een kalenderjaar.' },
  { term: 'Afschrijving', description: 'Het verdelen van de kosten van een investering over meerdere jaren.' }
];

export default function BoekhoudingHandleidingPage() {
  return (
    <HandleidingTemplate
      moduleName="Boekhouding"
      moduleIcon={Calculator}
      introduction="Welkom bij de Boekhouding module. Deze gratis module biedt een complete financiële administratie voor uw Surinaamse onderneming. Met ondersteuning voor meerdere valuta (SRD, USD, EUR), BTW berekeningen en uitgebreide rapportages. Volg deze handleiding stap voor stap om uw boekhouding professioneel op te zetten."
      steps={boekhoudingSteps}
      tips={boekhoudingTips}
      warnings={boekhoudingWarnings}
      glossary={boekhoudingGlossary}
    />
  );
}
