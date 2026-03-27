function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_LABELS = {
  rent: 'Huurbetaling',
  monthly_rent: 'Huurbetaling',
  partial_rent: 'Gedeelt. huurbetaling',
  service_costs: 'Servicekosten',
  fines: 'Boetes / Achterstand',
  fine: 'Boetes / Achterstand',
  deposit: 'Borgsom',
};

const METHOD_LABELS = {
  cash: 'Contant',
  card: 'Pinpas',
  mope: 'Mope',
  bank: 'Bank',
  pin: 'PIN',
};

export default function ReceiptTicket({ payment, tenant, preview = false, stampData = null }) {
  if (!payment) return null;

  const date = new Date(payment.created_at);
  const dateStr = date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const kwNr = payment.kwitantie_nummer || payment.receipt_number || '';
  const companyName = stampData?.stamp_company_name || 'Vastgoed Beheer';

  const formatRentMonth = (monthStr) => {
    if (!monthStr) return null;
    if (monthStr.includes('-')) {
      const [year, month] = monthStr.split('-');
      const names = ['Jan','Feb','Mrt','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
      const idx = parseInt(month, 10) - 1;
      if (idx >= 0 && idx < 12) return `${names[idx]} ${year}`;
    }
    return monthStr;
  };
  const rentMonth = formatRentMonth(payment.rent_month);
  const coveredMonths = payment.covered_months || [];

  const remainingRent = payment.remaining_rent ?? (tenant?.outstanding_rent || 0);
  const remainingService = payment.remaining_service ?? (tenant?.service_costs || 0);
  const remainingFines = payment.remaining_fines ?? (tenant?.fines || 0);
  const totalRemaining = remainingRent + remainingService + remainingFines;

  const font = "'Courier New', 'Courier', monospace";
  // Width: 80mm for print, scaled for preview
  const w = preview ? 300 : 302; // px width

  const sectionBar = (text) => (
    <div style={{ background: '#1a1a1a', color: '#fff', padding: '5px 10px', margin: '10px 0 6px', fontFamily: font, fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
      {text}
    </div>
  );

  const dashedLine = () => (
    <div style={{ borderBottom: '1px dashed #999', margin: '8px 0' }} />
  );

  const solidLine = () => (
    <div style={{ borderBottom: '1.5px solid #333', margin: '8px 0' }} />
  );

  const row = (left, right, bold = false, size = '12px') => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: font, fontSize: size, fontWeight: bold ? 'bold' : 'normal', color: '#1a1a1a', padding: '1px 0' }}>
      <span>{left}</span>
      <span style={{ textAlign: 'right' }}>{right}</span>
    </div>
  );

  return (
    <div data-testid="receipt-ticket" style={{
      width: `${w}px`,
      background: '#fff',
      margin: '0 auto',
      fontFamily: font,
      color: '#1a1a1a',
      padding: preview ? '20px 16px' : '8mm 6mm',
      boxSizing: 'border-box',
      boxShadow: preview ? '0 2px 20px rgba(0,0,0,0.08)' : 'none',
    }}>

      {/* ====== HEADER ====== */}
      <div style={{ textAlign: 'center', paddingBottom: '6px' }}>
        <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '4px' }}>
          {companyName.toUpperCase()}
        </div>
        {stampData?.stamp_address && (
          <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.5 }}>
            {stampData.stamp_address}
          </div>
        )}
        {stampData?.stamp_phone && (
          <div style={{ fontSize: '10px', color: '#555' }}>Tel: {stampData.stamp_phone}</div>
        )}
        {stampData?.stamp_whatsapp && (
          <div style={{ fontSize: '10px', color: '#555' }}>WhatsApp: {stampData.stamp_whatsapp}</div>
        )}
      </div>

      {/* ====== KWITANTIE HEADER BAR ====== */}
      {sectionBar('KWITANTIE')}

      <div style={{ padding: '0 2px' }}>
        {row('Bonnr.', kwNr, true, '12px')}
        {row('Datum', `${dateStr}  ${timeStr}`, false, '11px')}
        {row('Huurder', payment.tenant_name || tenant?.name || '', false, '11px')}
        {row('Appt.', `${payment.apartment_number || tenant?.apartment_number || ''} / ${payment.tenant_code || tenant?.tenant_code || ''}`, false, '11px')}
      </div>

      {/* ====== HUURMAAND ====== */}
      {(coveredMonths.length > 0 || rentMonth) && (payment.payment_type === 'rent' || payment.payment_type === 'monthly_rent' || payment.payment_type === 'partial_rent') && (
        <>
          {dashedLine()}
          <div style={{ padding: '0 2px', fontSize: '11px' }}>
            <div style={{ color: '#555', marginBottom: '2px' }}>
              {payment.payment_type === 'partial_rent' ? 'Gedeelt. betaling voor:' : 'Betaling voor:'}
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
              {coveredMonths.length > 0 ? coveredMonths.join(', ') : rentMonth}
            </div>
          </div>
        </>
      )}

      {/* ====== BETALINGSREGELS ====== */}
      {dashedLine()}
      <div style={{ padding: '0 2px' }}>
        {row(
          `1  ${TYPE_LABELS[payment.payment_type] || payment.payment_type}`,
          formatSRD(payment.amount).replace('SRD ', ''),
          false,
          '12px'
        )}
      </div>

      {/* ====== TOTALEN BAR ====== */}
      {sectionBar('TOTALEN :')}

      <div style={{ padding: '0 2px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: font, padding: '4px 0' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>TOTAAL</span>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>SRD {Number(payment.amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        {solidLine()}
        {row('Ontvangen', formatSRD(payment.amount).replace('SRD ', ''))}
        {row('Retour', '0,00')}
        {dashedLine()}
        {row('BetaalWijze', METHOD_LABELS[payment.payment_method] || payment.payment_method || 'Contant', true)}
      </div>

      {/* ====== OPENSTAAND SALDO ====== */}
      {dashedLine()}
      <div style={{ padding: '0 2px' }}>
        {totalRemaining > 0 ? (
          <>
            <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px', textTransform: 'uppercase' }}>Openstaand na betaling:</div>
            {remainingRent > 0 && row('  Huur', formatSRD(remainingRent).replace('SRD ', ''), false, '11px')}
            {remainingService > 0 && row('  Servicekosten', formatSRD(remainingService).replace('SRD ', ''), false, '11px')}
            {remainingFines > 0 && row('  Boetes', formatSRD(remainingFines).replace('SRD ', ''), false, '11px')}
            {solidLine()}
            {row('OPENSTAAND', formatSRD(totalRemaining), true, '13px')}
          </>
        ) : (
          <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: 'bold', padding: '4px 0' }}>
            *** VOLLEDIG VOLDAAN ***
          </div>
        )}
      </div>

      {/* ====== BANK INFO ====== */}
      {stampData && stampData.bank_name && stampData.bank_account_number && (
        <>
          {dashedLine()}
          <div style={{ padding: '0 2px', fontSize: '10px', color: '#555' }}>
            <div style={{ marginBottom: '2px' }}>Bankgegevens:</div>
            <div>{stampData.bank_name} - {stampData.bank_account_number}</div>
            {stampData.bank_account_name && <div>T.n.v.: {stampData.bank_account_name}</div>}
          </div>
        </>
      )}

      {/* ====== FOOTER ====== */}
      {dashedLine()}
      <div style={{ textAlign: 'center', padding: '8px 0 4px', fontSize: '11px', color: '#555', lineHeight: 1.6 }}>
        Bedankt voor uw betaling en<br />
        tot ziens!
      </div>

      {/* Stempel */}
      {stampData && stampData.stamp_company_name && (
        <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
          <div style={{
            display: 'inline-block',
            border: '2px solid #991b1b',
            padding: '4px 12px',
            transform: 'rotate(-3deg)',
            fontSize: '10px',
            fontWeight: 'bold',
            color: '#991b1b',
            letterSpacing: '0.5px'
          }}>
            {stampData.stamp_company_name}
          </div>
        </div>
      )}

      {/* Zigzag tear edge at bottom */}
      <div style={{ marginTop: '12px', height: '8px', overflow: 'hidden' }}>
        <svg width="100%" height="8" viewBox="0 0 300 8" preserveAspectRatio="none">
          <path d={Array.from({length: 30}, (_, i) => `${i === 0 ? 'M' : 'L'}${i * 10},${i % 2 === 0 ? 0 : 8}`).join(' ')} stroke="#ccc" strokeWidth="1" fill="none" />
        </svg>
      </div>
    </div>
  );
}
