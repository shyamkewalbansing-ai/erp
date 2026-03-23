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

  // Preview is smaller for display, print is full A4
  const s = preview ? 0.38 : 1;

  return (
    <div style={{ 
      width: `${210 * s}mm`, 
      height: `${297 * s}mm`, 
      background: 'white', 
      margin: '0 auto', 
      fontFamily: 'Inter, system-ui, sans-serif', 
      position: 'relative', 
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* ====== HEADER - 75mm ====== */}
      <div style={{ position: 'relative', height: `${75 * s}mm`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${65 * s}mm`, background: '#1e293b', clipPath: 'polygon(0 0, 100% 0, 100% 70%, 0 100%)' }}></div>
        <div style={{ position: 'absolute', top: `${10 * s}mm`, right: `${20 * s}mm`, width: `${45 * s}mm`, height: `${50 * s}mm`, background: '#f97316', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}></div>
        <div style={{ position: 'relative', zIndex: 10, padding: `${15 * s}mm ${20 * s}mm`, color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: `${5 * s}mm`, marginBottom: `${8 * s}mm` }}>
            <div style={{ width: `${18 * s}mm`, height: `${18 * s}mm`, background: '#f97316', borderRadius: `${4 * s}mm`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: `${8 * s}mm`, fontWeight: 'bold', color: 'white' }}>AK</span>
            </div>
            <div>
              <p style={{ fontSize: `${6 * s}mm`, fontWeight: 'bold', margin: 0, letterSpacing: '0.05em' }}>APPARTEMENT KIOSK</p>
              <p style={{ fontSize: `${3.5 * s}mm`, color: '#94a3b8', margin: 0 }}>Huurbetalingssysteem · Suriname</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: `${12 * s}mm`, fontWeight: 'bold', letterSpacing: '0.1em' }}>KWITANTIE</span>
          </div>
        </div>
      </div>

      {/* ====== KWITANTIE INFO - 25mm ====== */}
      <div style={{ padding: `${6 * s}mm ${20 * s}mm`, display: 'flex', gap: `${10 * s}mm`, borderBottom: `${0.5 * s}mm solid #e2e8f0` }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: `${3.5 * s}mm`, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kwitantie aan</p>
          <p style={{ fontSize: `${6 * s}mm`, fontWeight: 'bold', color: '#0f172a', margin: `${2 * s}mm 0` }}>{payment.tenant_name || tenant?.name}</p>
          <p style={{ fontSize: `${3.5 * s}mm`, color: '#64748b', margin: 0 }}>
            Appartement {payment.apartment_number || tenant?.apartment_number} · Code: {payment.tenant_code || tenant?.tenant_code}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: `${3.5 * s}mm`, color: '#64748b', margin: 0, textTransform: 'uppercase' }}>Kwitantie Nr.</p>
          <p style={{ fontSize: `${6 * s}mm`, fontWeight: 'bold', color: '#f97316', margin: `${2 * s}mm 0` }}>{kwNr}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: `${3.5 * s}mm`, color: '#64748b', margin: 0, textTransform: 'uppercase' }}>Datum</p>
          <p style={{ fontSize: `${4.5 * s}mm`, fontWeight: '600', color: '#0f172a', margin: `${2 * s}mm 0` }}>{dateStr}</p>
          <p style={{ fontSize: `${3.5 * s}mm`, color: '#64748b', margin: 0 }}>{timeStr}</p>
        </div>
      </div>

      {/* ====== BETALING DETAILS - 45mm ====== */}
      <div style={{ padding: `${8 * s}mm ${20 * s}mm` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: `${4 * s}mm`, textAlign: 'left', fontSize: `${4 * s}mm`, color: '#64748b', fontWeight: '600', borderBottom: `${0.5 * s}mm solid #e2e8f0` }}>Omschrijving</th>
              <th style={{ padding: `${4 * s}mm`, textAlign: 'center', fontSize: `${4 * s}mm`, color: '#64748b', fontWeight: '600', borderBottom: `${0.5 * s}mm solid #e2e8f0` }}>Methode</th>
              <th style={{ padding: `${4 * s}mm`, textAlign: 'right', fontSize: `${4 * s}mm`, color: '#64748b', fontWeight: '600', borderBottom: `${0.5 * s}mm solid #e2e8f0` }}>Bedrag</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: `${5 * s}mm ${4 * s}mm`, fontSize: `${5 * s}mm`, color: '#0f172a', fontWeight: '500' }}>
                {TYPE_LABELS[payment.payment_type] || payment.payment_type}
                {payment.description && (
                  <span style={{ display: 'block', fontSize: `${3.5 * s}mm`, color: '#64748b', marginTop: `${1 * s}mm` }}>{payment.description}</span>
                )}
              </td>
              <td style={{ padding: `${5 * s}mm ${4 * s}mm`, textAlign: 'center', fontSize: `${4 * s}mm`, color: '#64748b' }}>Contant</td>
              <td style={{ padding: `${5 * s}mm ${4 * s}mm`, textAlign: 'right', fontSize: `${5 * s}mm`, color: '#0f172a', fontWeight: '600' }}>{formatSRD(payment.amount)}</td>
            </tr>
          </tbody>
        </table>

        {/* TOTAAL BETAALD */}
        <div style={{ background: '#1e293b', borderRadius: `${3 * s}mm`, padding: `${6 * s}mm`, marginTop: `${5 * s}mm`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: `${5 * s}mm`, color: '#94a3b8', fontWeight: '600' }}>TOTAAL BETAALD</span>
          <span style={{ fontSize: `${8 * s}mm`, color: 'white', fontWeight: 'bold' }}>{formatSRD(payment.amount)}</span>
        </div>
      </div>

      {/* ====== OPENSTAAND SALDO - 35mm ====== */}
      <div style={{ padding: `${5 * s}mm ${20 * s}mm` }}>
        <div style={{ 
          background: hasRemainingBalance ? '#fef2f2' : '#f0fdf4', 
          border: `${0.8 * s}mm solid ${hasRemainingBalance ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: `${3 * s}mm`, 
          padding: `${5 * s}mm` 
        }}>
          <p style={{ 
            fontSize: `${4 * s}mm`, 
            fontWeight: 'bold', 
            color: hasRemainingBalance ? '#dc2626' : '#16a34a', 
            margin: 0, 
            marginBottom: `${3 * s}mm`,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {hasRemainingBalance ? 'Openstaand Saldo Na Betaling' : 'Volledig Voldaan'}
          </p>
          
          {hasRemainingBalance ? (
            <div style={{ display: 'flex', gap: `${8 * s}mm`, alignItems: 'flex-end' }}>
              {remainingRent > 0 && (
                <div>
                  <p style={{ fontSize: `${3 * s}mm`, color: '#64748b', margin: 0 }}>Openstaande Huur</p>
                  <p style={{ fontSize: `${5 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(remainingRent)}</p>
                </div>
              )}
              {remainingService > 0 && (
                <div>
                  <p style={{ fontSize: `${3 * s}mm`, color: '#64748b', margin: 0 }}>Servicekosten</p>
                  <p style={{ fontSize: `${5 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(remainingService)}</p>
                </div>
              )}
              {remainingFines > 0 && (
                <div>
                  <p style={{ fontSize: `${3 * s}mm`, color: '#64748b', margin: 0 }}>Boetes</p>
                  <p style={{ fontSize: `${5 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(remainingFines)}</p>
                </div>
              )}
              <div style={{ marginLeft: 'auto', background: '#fee2e2', padding: `${3 * s}mm ${5 * s}mm`, borderRadius: `${2 * s}mm` }}>
                <p style={{ fontSize: `${3 * s}mm`, color: '#991b1b', margin: 0 }}>Totaal Openstaand</p>
                <p style={{ fontSize: `${7 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(totalRemaining)}</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: `${3 * s}mm` }}>
              <span style={{ fontSize: `${8 * s}mm`, color: '#16a34a' }}>✓</span>
              <p style={{ fontSize: `${5 * s}mm`, color: '#16a34a', margin: 0 }}>Geen openstaand saldo - Alles is betaald!</p>
            </div>
          )}
        </div>
      </div>

      {/* ====== BETALINGSREGISTRATIE - 50mm ====== */}
      <div style={{ padding: `${5 * s}mm ${20 * s}mm` }}>
        <div style={{ border: `${0.8 * s}mm solid #e2e8f0`, borderRadius: `${3 * s}mm`, overflow: 'hidden' }}>
          <div style={{ background: '#1e293b', padding: `${4 * s}mm ${6 * s}mm` }}>
            <p style={{ fontSize: `${4.5 * s}mm`, fontWeight: 'bold', color: 'white', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Betalingsregistratie
            </p>
          </div>
          <div style={{ padding: `${5 * s}mm ${6 * s}mm`, background: '#f8fafc' }}>
            <table style={{ width: '100%', fontSize: `${3.5 * s}mm`, borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: `${2 * s}mm 0`, color: '#64748b', width: '35%' }}>Transactie ID</td>
                  <td style={{ padding: `${2 * s}mm 0`, color: '#0f172a', fontWeight: '500', fontFamily: 'monospace', fontSize: `${3 * s}mm` }}>{payment.payment_id || kwNr}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${2 * s}mm 0`, color: '#64748b' }}>Kwitantie Nr.</td>
                  <td style={{ padding: `${2 * s}mm 0`, color: '#f97316', fontWeight: 'bold', fontSize: `${4 * s}mm` }}>{kwNr}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${2 * s}mm 0`, color: '#64748b' }}>Datum & Tijd</td>
                  <td style={{ padding: `${2 * s}mm 0`, color: '#0f172a', fontWeight: '500' }}>{dateStr} om {timeStr}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${2 * s}mm 0`, color: '#64748b' }}>Betaalmethode</td>
                  <td style={{ padding: `${2 * s}mm 0`, color: '#0f172a', fontWeight: '500' }}>Contant</td>
                </tr>
                <tr>
                  <td style={{ padding: `${2 * s}mm 0`, color: '#64748b' }}>Huurder Code</td>
                  <td style={{ padding: `${2 * s}mm 0`, color: '#0f172a', fontWeight: '500' }}>{payment.tenant_code || tenant?.tenant_code}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${2 * s}mm 0`, color: '#64748b' }}>Appartement</td>
                  <td style={{ padding: `${2 * s}mm 0`, color: '#0f172a', fontWeight: '500' }}>{payment.apartment_number || tenant?.apartment_number}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${2 * s}mm 0`, color: '#64748b' }}>Status</td>
                  <td style={{ padding: `${2 * s}mm 0` }}>
                    <span style={{ 
                      background: '#dcfce7', 
                      color: '#16a34a', 
                      padding: `${1 * s}mm ${3 * s}mm`, 
                      borderRadius: `${1.5 * s}mm`,
                      fontSize: `${3.5 * s}mm`,
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

      {/* ====== VOORWAARDEN + STEMPEL - 35mm ====== */}
      <div style={{ padding: `${5 * s}mm ${20 * s}mm`, display: 'flex', gap: `${10 * s}mm` }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: `${4 * s}mm`, fontWeight: '600', color: '#0f172a', marginBottom: `${2 * s}mm` }}>Voorwaarden</p>
          <p style={{ fontSize: `${3.5 * s}mm`, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
            Bewaar deze kwitantie als bewijs van betaling.<br />
            Betalingen worden direct verwerkt en zijn niet restitueerbaar.
          </p>
        </div>
        <div style={{ width: `${55 * s}mm`, textAlign: 'center' }}>
          {stampData && stampData.stamp_company_name ? (
            <div style={{ border: `${0.8 * s}mm solid #1e293b`, borderRadius: `${3 * s}mm`, padding: `${4 * s}mm`, background: '#f8fafc' }}>
              <svg style={{ width: `${10 * s}mm`, height: `${10 * s}mm`, margin: '0 auto', marginBottom: `${2 * s}mm` }} viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <p style={{ fontSize: `${4 * s}mm`, fontWeight: 'bold', color: '#1e293b', margin: 0, marginBottom: `${1 * s}mm` }}>{stampData.stamp_company_name}</p>
              {stampData.stamp_address && <p style={{ fontSize: `${3 * s}mm`, color: '#64748b', margin: 0 }}>{stampData.stamp_address}</p>}
              {stampData.stamp_phone && <p style={{ fontSize: `${3 * s}mm`, color: '#64748b', margin: 0 }}>Tel: {stampData.stamp_phone}</p>}
            </div>
          ) : (
            <div style={{ border: `${0.8 * s}mm dashed #94a3b8`, borderRadius: `${3 * s}mm`, padding: `${5 * s}mm`, background: '#f8fafc' }}>
              <p style={{ fontSize: `${3.5 * s}mm`, color: '#64748b', margin: 0, marginBottom: `${2 * s}mm` }}>APPARTEMENT KIOSK</p>
              <p style={{ fontSize: `${5 * s}mm`, fontWeight: 'bold', color: '#16a34a', margin: 0 }}>BETAALD</p>
              <p style={{ fontSize: `${10 * s}mm`, color: '#16a34a', margin: 0 }}>✓</p>
            </div>
          )}
        </div>
      </div>

      {/* ====== FOOTER - 25mm ====== */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${25 * s}mm`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${20 * s}mm`, background: '#1e293b', clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 100%)' }}></div>
        <div style={{ position: 'absolute', bottom: 0, left: `${20 * s}mm`, width: `${30 * s}mm`, height: `${18 * s}mm`, background: '#f97316', clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }}></div>
        <div style={{ position: 'absolute', bottom: `${5 * s}mm`, right: `${20 * s}mm`, zIndex: 10 }}>
          <p style={{ fontSize: `${3.5 * s}mm`, color: '#94a3b8', margin: 0 }}>Bedankt voor uw betaling!</p>
        </div>
      </div>
    </div>
  );
}
