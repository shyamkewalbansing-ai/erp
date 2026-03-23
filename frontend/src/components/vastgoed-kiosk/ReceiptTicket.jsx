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

  const s = preview ? 0.48 : 1;

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
      {/* ====== HEADER ====== */}
      <div style={{ position: 'relative', height: `${50 * s}mm`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${45 * s}mm`, background: '#1e293b', clipPath: 'polygon(0 0, 100% 0, 100% 70%, 0 100%)' }}></div>
        <div style={{ position: 'absolute', top: `${5 * s}mm`, right: `${12 * s}mm`, width: `${28 * s}mm`, height: `${35 * s}mm`, background: '#f97316', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}></div>
        <div style={{ position: 'relative', zIndex: 10, padding: `${8 * s}mm ${12 * s}mm`, color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: `${3 * s}mm`, marginBottom: `${4 * s}mm` }}>
            <div style={{ width: `${10 * s}mm`, height: `${10 * s}mm`, background: '#f97316', borderRadius: `${2 * s}mm`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: `${5 * s}mm`, fontWeight: 'bold', color: 'white' }}>AK</span>
            </div>
            <div>
              <p style={{ fontSize: `${3.5 * s}mm`, fontWeight: 'bold', margin: 0 }}>APPARTEMENT KIOSK</p>
              <p style={{ fontSize: `${2 * s}mm`, color: '#94a3b8', margin: 0 }}>Huurbetalingssysteem</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: `${7 * s}mm`, fontWeight: 'bold', letterSpacing: '0.1em' }}>KWITANTIE</span>
          </div>
        </div>
      </div>

      {/* ====== KWITANTIE INFO ====== */}
      <div style={{ padding: `${3 * s}mm ${12 * s}mm`, display: 'flex', gap: `${4 * s}mm`, borderBottom: `${0.3 * s}mm solid #e2e8f0` }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: `${2 * s}mm`, color: '#64748b', margin: 0, textTransform: 'uppercase' }}>Kwitantie aan</p>
          <p style={{ fontSize: `${3.5 * s}mm`, fontWeight: 'bold', color: '#0f172a', margin: `${0.5 * s}mm 0` }}>{payment.tenant_name || tenant?.name}</p>
          <p style={{ fontSize: `${2 * s}mm`, color: '#64748b', margin: 0 }}>
            Appt. {payment.apartment_number || tenant?.apartment_number} · {payment.tenant_code || tenant?.tenant_code}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: `${2 * s}mm`, color: '#64748b', margin: 0 }}>Kwitantie Nr.</p>
          <p style={{ fontSize: `${3.5 * s}mm`, fontWeight: 'bold', color: '#f97316', margin: `${0.5 * s}mm 0` }}>{kwNr}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: `${2 * s}mm`, color: '#64748b', margin: 0 }}>Datum</p>
          <p style={{ fontSize: `${2.5 * s}mm`, fontWeight: '600', color: '#0f172a', margin: `${0.5 * s}mm 0` }}>{dateStr}</p>
          <p style={{ fontSize: `${2 * s}mm`, color: '#64748b', margin: 0 }}>{timeStr}</p>
        </div>
      </div>

      {/* ====== BETALING DETAILS ====== */}
      <div style={{ padding: `${4 * s}mm ${12 * s}mm` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: `${2 * s}mm`, textAlign: 'left', fontSize: `${2.5 * s}mm`, color: '#64748b', fontWeight: '600', borderBottom: `${0.3 * s}mm solid #e2e8f0` }}>Omschrijving</th>
              <th style={{ padding: `${2 * s}mm`, textAlign: 'center', fontSize: `${2.5 * s}mm`, color: '#64748b', fontWeight: '600', borderBottom: `${0.3 * s}mm solid #e2e8f0` }}>Methode</th>
              <th style={{ padding: `${2 * s}mm`, textAlign: 'right', fontSize: `${2.5 * s}mm`, color: '#64748b', fontWeight: '600', borderBottom: `${0.3 * s}mm solid #e2e8f0` }}>Bedrag</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: `${2 * s}mm`, fontSize: `${3 * s}mm`, color: '#0f172a', fontWeight: '500' }}>
                {TYPE_LABELS[payment.payment_type] || payment.payment_type}
              </td>
              <td style={{ padding: `${2 * s}mm`, textAlign: 'center', fontSize: `${2.5 * s}mm`, color: '#64748b' }}>Contant</td>
              <td style={{ padding: `${2 * s}mm`, textAlign: 'right', fontSize: `${3 * s}mm`, color: '#0f172a', fontWeight: '600' }}>{formatSRD(payment.amount)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totaal */}
        <div style={{ background: '#1e293b', borderRadius: `${2 * s}mm`, padding: `${3 * s}mm`, marginTop: `${3 * s}mm`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: `${3 * s}mm`, color: '#94a3b8', fontWeight: '600' }}>TOTAAL BETAALD</span>
          <span style={{ fontSize: `${5 * s}mm`, color: 'white', fontWeight: 'bold' }}>{formatSRD(payment.amount)}</span>
        </div>
      </div>

      {/* ====== OPENSTAAND SALDO ====== */}
      <div style={{ padding: `${3 * s}mm ${12 * s}mm` }}>
        <div style={{ 
          background: hasRemainingBalance ? '#fef2f2' : '#f0fdf4', 
          border: `${0.4 * s}mm solid ${hasRemainingBalance ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: `${2 * s}mm`, 
          padding: `${3 * s}mm` 
        }}>
          <p style={{ 
            fontSize: `${2.5 * s}mm`, 
            fontWeight: 'bold', 
            color: hasRemainingBalance ? '#dc2626' : '#16a34a', 
            margin: 0, 
            marginBottom: `${2 * s}mm`,
            textTransform: 'uppercase'
          }}>
            {hasRemainingBalance ? 'Openstaand Saldo' : 'Volledig Voldaan'}
          </p>
          
          {hasRemainingBalance ? (
            <div style={{ display: 'flex', gap: `${3 * s}mm`, flexWrap: 'wrap' }}>
              {remainingRent > 0 && (
                <div>
                  <p style={{ fontSize: `${2 * s}mm`, color: '#64748b', margin: 0 }}>Huur</p>
                  <p style={{ fontSize: `${3 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(remainingRent)}</p>
                </div>
              )}
              {remainingService > 0 && (
                <div>
                  <p style={{ fontSize: `${2 * s}mm`, color: '#64748b', margin: 0 }}>Service</p>
                  <p style={{ fontSize: `${3 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(remainingService)}</p>
                </div>
              )}
              {remainingFines > 0 && (
                <div>
                  <p style={{ fontSize: `${2 * s}mm`, color: '#64748b', margin: 0 }}>Boetes</p>
                  <p style={{ fontSize: `${3 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(remainingFines)}</p>
                </div>
              )}
              <div style={{ marginLeft: 'auto', background: '#fee2e2', padding: `${1.5 * s}mm ${3 * s}mm`, borderRadius: `${1.5 * s}mm` }}>
                <p style={{ fontSize: `${2 * s}mm`, color: '#991b1b', margin: 0 }}>Totaal</p>
                <p style={{ fontSize: `${4 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(totalRemaining)}</p>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: `${3 * s}mm`, color: '#16a34a', margin: 0 }}>✓ Geen openstaand saldo</p>
          )}
        </div>
      </div>

      {/* ====== BETALINGSREGISTRATIE ====== */}
      <div style={{ padding: `${3 * s}mm ${12 * s}mm` }}>
        <div style={{ border: `${0.4 * s}mm solid #e2e8f0`, borderRadius: `${2 * s}mm`, overflow: 'hidden' }}>
          <div style={{ background: '#1e293b', padding: `${2 * s}mm ${3 * s}mm` }}>
            <p style={{ fontSize: `${2.5 * s}mm`, fontWeight: 'bold', color: 'white', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Betalingsregistratie
            </p>
          </div>
          <div style={{ padding: `${2 * s}mm ${3 * s}mm`, background: '#f8fafc' }}>
            <table style={{ width: '100%', fontSize: `${2.2 * s}mm`, borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#64748b', width: '35%' }}>Transactie ID</td>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#0f172a', fontWeight: '500', fontFamily: 'monospace', fontSize: `${2 * s}mm` }}>{(payment.payment_id || kwNr).substring(0, 20)}...</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#64748b' }}>Kwitantie Nr.</td>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#f97316', fontWeight: 'bold' }}>{kwNr}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#64748b' }}>Datum & Tijd</td>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#0f172a', fontWeight: '500' }}>{dateStr} {timeStr}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#64748b' }}>Betaalmethode</td>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#0f172a', fontWeight: '500' }}>Contant</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#64748b' }}>Huurder</td>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#0f172a', fontWeight: '500' }}>{payment.tenant_code || tenant?.tenant_code} · Appt. {payment.apartment_number || tenant?.apartment_number}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1 * s}mm 0`, color: '#64748b' }}>Status</td>
                  <td style={{ padding: `${1 * s}mm 0` }}>
                    <span style={{ 
                      background: '#dcfce7', 
                      color: '#16a34a', 
                      padding: `${0.5 * s}mm ${2 * s}mm`, 
                      borderRadius: `${1 * s}mm`,
                      fontSize: `${2 * s}mm`,
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

      {/* ====== VOORWAARDEN + STEMPEL ====== */}
      <div style={{ padding: `${2 * s}mm ${12 * s}mm`, display: 'flex', gap: `${6 * s}mm` }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: `${2.5 * s}mm`, fontWeight: '600', color: '#0f172a', marginBottom: `${1 * s}mm` }}>Voorwaarden</p>
          <p style={{ fontSize: `${2 * s}mm`, color: '#64748b', lineHeight: 1.3, margin: 0 }}>
            Bewaar deze kwitantie als bewijs van betaling.<br />
            Betalingen zijn niet restitueerbaar.
          </p>
        </div>
        <div style={{ width: `${35 * s}mm`, textAlign: 'center' }}>
          {stampData && stampData.stamp_company_name ? (
            <div style={{ border: `${0.4 * s}mm solid #1e293b`, borderRadius: `${2 * s}mm`, padding: `${2 * s}mm`, background: '#f8fafc' }}>
              <p style={{ fontSize: `${2.5 * s}mm`, fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{stampData.stamp_company_name}</p>
              {stampData.stamp_phone && <p style={{ fontSize: `${2 * s}mm`, color: '#64748b', margin: 0 }}>{stampData.stamp_phone}</p>}
            </div>
          ) : (
            <div style={{ border: `${0.4 * s}mm dashed #94a3b8`, borderRadius: `${2 * s}mm`, padding: `${2 * s}mm`, background: '#f8fafc' }}>
              <p style={{ fontSize: `${3 * s}mm`, fontWeight: 'bold', color: '#16a34a', margin: 0 }}>BETAALD ✓</p>
            </div>
          )}
        </div>
      </div>

      {/* ====== FOOTER ====== */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${18 * s}mm`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${15 * s}mm`, background: '#1e293b', clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 100%)' }}></div>
        <div style={{ position: 'absolute', bottom: 0, left: `${12 * s}mm`, width: `${20 * s}mm`, height: `${12 * s}mm`, background: '#f97316', clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }}></div>
        <div style={{ position: 'absolute', bottom: `${3 * s}mm`, right: `${12 * s}mm`, zIndex: 10 }}>
          <p style={{ fontSize: `${2 * s}mm`, color: '#94a3b8', margin: 0 }}>Bedankt voor uw betaling!</p>
        </div>
      </div>
    </div>
  );
}
