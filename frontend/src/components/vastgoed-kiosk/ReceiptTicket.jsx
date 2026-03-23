function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_LABELS = {
  rent: 'Huurbetaling',
  partial_rent: 'Gedeeltelijke huurbetaling',
  service_costs: 'Servicekosten (water/stroom)',
  fines: 'Boetes / Achterstand',
  deposit: 'Borgsom',
};

export default function ReceiptTicket({ payment, tenant, preview = false, stampData = null }) {
  if (!payment) return null;

  const date = new Date(payment.created_at);
  const dateStr = date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const kwNr = payment.kwitantie_nummer || payment.receipt_number || '';

  const formatRentMonth = (rm) => {
    if (!rm) return '';
    try {
      const [y, m] = rm.split('-');
      const d = new Date(parseInt(y), parseInt(m) - 1, 1);
      return d.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
    } catch { return rm; }
  };

  // Calculate remaining balance after payment
  const remainingRent = payment.remaining_rent ?? (tenant?.outstanding_rent || 0);
  const remainingService = payment.remaining_service ?? (tenant?.service_costs || 0);
  const remainingFines = payment.remaining_fines ?? (tenant?.fines || 0);
  const totalRemaining = remainingRent + remainingService + remainingFines;
  const hasRemainingBalance = totalRemaining > 0;

  const s = preview ? 0.52 : 1;

  return (
    <div style={{ width: `${210 * s}mm`, minHeight: `${297 * s}mm`, background: 'white', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* ====== HEADER WITH GEOMETRIC SHAPES ====== */}
      <div style={{ position: 'relative', height: `${70 * s}mm`, overflow: 'hidden' }}>
        {/* Dark blue angular shape */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${60 * s}mm`, background: '#1e293b', clipPath: 'polygon(0 0, 100% 0, 100% 70%, 0 100%)' }}></div>
        {/* Orange accent triangle */}
        <div style={{ position: 'absolute', top: `${8 * s}mm`, right: `${15 * s}mm`, width: `${35 * s}mm`, height: `${45 * s}mm`, background: '#f97316', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}></div>
        {/* Content over shapes */}
        <div style={{ position: 'relative', zIndex: 10, padding: `${10 * s}mm ${15 * s}mm`, color: 'white' }}>
          {/* Logo + Company */}
          <div style={{ display: 'flex', alignItems: 'center', gap: `${4 * s}mm`, marginBottom: `${6 * s}mm` }}>
            <div style={{ width: `${14 * s}mm`, height: `${14 * s}mm`, background: '#f97316', borderRadius: `${3 * s}mm`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: `${6 * s}mm`, fontWeight: 'bold', color: 'white' }}>AK</span>
            </div>
            <div>
              <p style={{ fontSize: `${4.5 * s}mm`, fontWeight: 'bold', margin: 0, letterSpacing: '0.05em' }}>APPARTEMENT KIOSK</p>
              <p style={{ fontSize: `${2.5 * s}mm`, color: '#94a3b8', margin: 0 }}>Huurbetalingssysteem · Suriname</p>
            </div>
          </div>
          {/* KWITANTIE label */}
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: `${9 * s}mm`, fontWeight: 'bold', letterSpacing: '0.1em' }}>KWITANTIE</span>
          </div>
        </div>
      </div>

      {/* ====== KWITANTIE INFO BAR ====== */}
      <div style={{ padding: `${5 * s}mm ${15 * s}mm`, display: 'flex', gap: `${6 * s}mm`, borderBottom: `${0.3 * s}mm solid #e2e8f0` }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kwitantie aan</p>
          <p style={{ fontSize: `${4.5 * s}mm`, fontWeight: 'bold', color: '#0f172a', margin: `${1 * s}mm 0` }}>{payment.tenant_name || tenant?.name}</p>
          <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0 }}>
            Appt. {payment.apartment_number || tenant?.apartment_number} · Code: {payment.tenant_code || tenant?.tenant_code}
            {payment.rent_month && (
              <span> · Huurmaand: {formatRentMonth(payment.rent_month)}</span>
            )}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0, textTransform: 'uppercase' }}>Kwitantie Nr.</p>
          <p style={{ fontSize: `${4.5 * s}mm`, fontWeight: 'bold', color: '#f97316', margin: `${1 * s}mm 0` }}>{kwNr}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0, textTransform: 'uppercase' }}>Datum</p>
          <p style={{ fontSize: `${3.5 * s}mm`, fontWeight: '600', color: '#0f172a', margin: `${1 * s}mm 0` }}>{dateStr}</p>
          <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0 }}>{timeStr}</p>
        </div>
      </div>

      {/* ====== TABLE ====== */}
      <div style={{ padding: `${6 * s}mm ${15 * s}mm` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: `${2.5 * s}mm`, textAlign: 'left', fontSize: `${3 * s}mm`, color: '#64748b', fontWeight: '600', borderBottom: `${0.3 * s}mm solid #e2e8f0` }}>Omschrijving</th>
              <th style={{ padding: `${2.5 * s}mm`, textAlign: 'center', fontSize: `${3 * s}mm`, color: '#64748b', fontWeight: '600', borderBottom: `${0.3 * s}mm solid #e2e8f0` }}>Methode</th>
              <th style={{ padding: `${2.5 * s}mm`, textAlign: 'right', fontSize: `${3 * s}mm`, color: '#64748b', fontWeight: '600', borderBottom: `${0.3 * s}mm solid #e2e8f0` }}>Bedrag</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: `${3 * s}mm ${2.5 * s}mm`, fontSize: `${3.5 * s}mm`, color: '#0f172a', fontWeight: '500' }}>
                {TYPE_LABELS[payment.payment_type] || payment.payment_type}
                {payment.description && (
                  <span style={{ display: 'block', fontSize: `${2.5 * s}mm`, color: '#64748b', marginTop: `${0.5 * s}mm` }}>{payment.description}</span>
                )}
              </td>
              <td style={{ padding: `${3 * s}mm ${2.5 * s}mm`, textAlign: 'center', fontSize: `${3 * s}mm`, color: '#64748b' }}>Contant</td>
              <td style={{ padding: `${3 * s}mm ${2.5 * s}mm`, textAlign: 'right', fontSize: `${3.5 * s}mm`, color: '#0f172a', fontWeight: '600' }}>{formatSRD(payment.amount)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ marginTop: `${3 * s}mm`, borderTop: `${0.3 * s}mm solid #e2e8f0`, paddingTop: `${3 * s}mm` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: `${1.5 * s}mm` }}>
            <span style={{ fontSize: `${3 * s}mm`, color: '#64748b' }}>Subtotaal</span>
            <span style={{ fontSize: `${3 * s}mm`, color: '#0f172a' }}>{formatSRD(payment.amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: `${3 * s}mm` }}>
            <span style={{ fontSize: `${3 * s}mm`, color: '#64748b' }}>BTW (0%)</span>
            <span style={{ fontSize: `${3 * s}mm`, color: '#0f172a' }}>SRD 0,00</span>
          </div>
        </div>

        {/* Grand total */}
        <div style={{ background: '#1e293b', borderRadius: `${2.5 * s}mm`, padding: `${4 * s}mm`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: `${4 * s}mm`, color: '#94a3b8', fontWeight: '600' }}>Totaal betaald</span>
          <span style={{ fontSize: `${6 * s}mm`, color: 'white', fontWeight: 'bold' }}>{formatSRD(payment.amount)}</span>
        </div>
      </div>

      {/* ====== OPENSTAANDE SALDO ====== */}
      <div style={{ padding: `${4 * s}mm ${15 * s}mm` }}>
        <div style={{ 
          background: hasRemainingBalance ? '#fef2f2' : '#f0fdf4', 
          border: `${0.5 * s}mm solid ${hasRemainingBalance ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: `${2.5 * s}mm`, 
          padding: `${4 * s}mm` 
        }}>
          <p style={{ 
            fontSize: `${3.5 * s}mm`, 
            fontWeight: 'bold', 
            color: hasRemainingBalance ? '#dc2626' : '#16a34a', 
            margin: 0, 
            marginBottom: `${2 * s}mm`,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {hasRemainingBalance ? 'Openstaand Saldo' : 'Volledig Voldaan'}
          </p>
          
          {hasRemainingBalance ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${4 * s}mm` }}>
              {remainingRent > 0 && (
                <div style={{ flex: 1, minWidth: `${35 * s}mm` }}>
                  <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0 }}>Openstaande Huur</p>
                  <p style={{ fontSize: `${4 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(remainingRent)}</p>
                </div>
              )}
              {remainingService > 0 && (
                <div style={{ flex: 1, minWidth: `${35 * s}mm` }}>
                  <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0 }}>Servicekosten</p>
                  <p style={{ fontSize: `${4 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(remainingService)}</p>
                </div>
              )}
              {remainingFines > 0 && (
                <div style={{ flex: 1, minWidth: `${35 * s}mm` }}>
                  <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0 }}>Boetes</p>
                  <p style={{ fontSize: `${4 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(remainingFines)}</p>
                </div>
              )}
              <div style={{ flex: 1, minWidth: `${35 * s}mm`, background: '#fee2e2', padding: `${2 * s}mm`, borderRadius: `${2 * s}mm` }}>
                <p style={{ fontSize: `${2.5 * s}mm`, color: '#991b1b', margin: 0 }}>Totaal Openstaand</p>
                <p style={{ fontSize: `${5 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(totalRemaining)}</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: `${2 * s}mm` }}>
              <span style={{ fontSize: `${6 * s}mm`, color: '#16a34a' }}>✓</span>
              <p style={{ fontSize: `${3.5 * s}mm`, color: '#16a34a', margin: 0 }}>Geen openstaand saldo - Alles is betaald!</p>
            </div>
          )}
        </div>
      </div>

      {/* ====== STAMP + TERMS ====== */}
      <div style={{ padding: `${4 * s}mm ${15 * s}mm`, display: 'flex', gap: `${8 * s}mm` }}>
        {/* Terms */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: `${3 * s}mm`, fontWeight: '600', color: '#0f172a', marginBottom: `${1.5 * s}mm` }}>Voorwaarden</p>
          <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', lineHeight: 1.4, margin: 0 }}>
            Bewaar deze kwitantie als bewijs van betaling.<br />
            Betalingen worden direct verwerkt en zijn niet restitueerbaar.
          </p>
        </div>

        {/* Stamp / Company Stamp */}
        <div style={{ width: `${45 * s}mm`, textAlign: 'center' }}>
          {stampData && (stampData.stamp_company_name || stampData.stamp_address || stampData.stamp_phone || stampData.stamp_whatsapp) ? (
            <div style={{ border: `${0.5 * s}mm solid #1e293b`, borderRadius: `${2.5 * s}mm`, padding: `${2.5 * s}mm`, background: '#f8fafc' }}>
              {/* House Icon SVG */}
              <svg style={{ width: `${6 * s}mm`, height: `${6 * s}mm`, margin: '0 auto', marginBottom: `${1.5 * s}mm` }} viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {stampData.stamp_company_name && (
                <p style={{ fontSize: `${3 * s}mm`, fontWeight: 'bold', color: '#1e293b', margin: 0, marginBottom: `${0.5 * s}mm` }}>{stampData.stamp_company_name}</p>
              )}
              {stampData.stamp_address && (
                <p style={{ fontSize: `${2 * s}mm`, color: '#64748b', margin: 0, marginBottom: `${0.5 * s}mm` }}>{stampData.stamp_address}</p>
              )}
              {stampData.stamp_phone && (
                <p style={{ fontSize: `${2 * s}mm`, color: '#64748b', margin: 0 }}>Tel: {stampData.stamp_phone}</p>
              )}
            </div>
          ) : (
            <div style={{ border: `${0.5 * s}mm dashed #94a3b8`, borderRadius: `${2.5 * s}mm`, padding: `${3 * s}mm`, background: '#f8fafc' }}>
              <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0, marginBottom: `${1 * s}mm` }}>APPARTEMENT KIOSK</p>
              <p style={{ fontSize: `${3 * s}mm`, fontWeight: 'bold', color: '#16a34a', margin: 0 }}>BETAALD</p>
              <p style={{ fontSize: `${6 * s}mm`, color: '#16a34a', margin: 0 }}>✓</p>
            </div>
          )}
        </div>
      </div>

      {/* ====== BETALINGSREGISTRATIE ====== */}
      <div style={{ padding: `${4 * s}mm ${15 * s}mm`, marginBottom: `${30 * s}mm` }}>
        <div style={{ border: `${0.5 * s}mm solid #e2e8f0`, borderRadius: `${2.5 * s}mm`, overflow: 'hidden' }}>
          <div style={{ background: '#f8fafc', padding: `${2.5 * s}mm ${4 * s}mm`, borderBottom: `${0.3 * s}mm solid #e2e8f0` }}>
            <p style={{ fontSize: `${3 * s}mm`, fontWeight: 'bold', color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Betalingsregistratie
            </p>
          </div>
          <div style={{ padding: `${3 * s}mm ${4 * s}mm` }}>
            <table style={{ width: '100%', fontSize: `${2.5 * s}mm` }}>
              <tbody>
                <tr>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#64748b', width: '40%' }}>Transactie ID</td>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#0f172a', fontWeight: '500', fontFamily: 'monospace' }}>{payment.payment_id || kwNr}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#64748b' }}>Kwitantie Nr.</td>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#f97316', fontWeight: 'bold' }}>{kwNr}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#64748b' }}>Datum & Tijd</td>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#0f172a', fontWeight: '500' }}>{dateStr} om {timeStr}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#64748b' }}>Betaalmethode</td>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#0f172a', fontWeight: '500' }}>Contant</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#64748b' }}>Huurder Code</td>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#0f172a', fontWeight: '500' }}>{payment.tenant_code || tenant?.tenant_code}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#64748b' }}>Appartement</td>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#0f172a', fontWeight: '500' }}>{payment.apartment_number || tenant?.apartment_number}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#64748b' }}>Status</td>
                  <td style={{ padding: `${1 * s}mm 0` }}>
                    <span style={{ 
                      background: '#dcfce7', 
                      color: '#16a34a', 
                      padding: `${0.5 * s}mm ${2 * s}mm`, 
                      borderRadius: `${1 * s}mm`,
                      fontSize: `${2.5 * s}mm`,
                      fontWeight: 'bold'
                    }}>
                      VERWERKT
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ====== FOOTER WITH GEOMETRIC SHAPES ====== */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${25 * s}mm`, overflow: 'hidden' }}>
        {/* Dark blue angular shape */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${20 * s}mm`, background: '#1e293b', clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 100%)' }}></div>
        {/* Orange accent triangle */}
        <div style={{ position: 'absolute', bottom: 0, left: `${15 * s}mm`, width: `${25 * s}mm`, height: `${15 * s}mm`, background: '#f97316', clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }}></div>
        {/* Footer content */}
        <div style={{ position: 'absolute', bottom: `${4 * s}mm`, right: `${15 * s}mm`, zIndex: 10 }}>
          <p style={{ fontSize: `${2.5 * s}mm`, color: '#94a3b8', margin: 0 }}>Bedankt voor uw betaling!</p>
        </div>
      </div>
    </div>
  );
}
