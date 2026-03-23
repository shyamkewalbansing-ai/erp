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
  
  // Company name from stamp data or fallback
  const companyName = stampData?.stamp_company_name || 'Vastgoed Beheer';
  const companyInitials = companyName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  
  // Rent month display - format nicely
  const formatRentMonth = (monthStr) => {
    if (!monthStr) return null;
    // Handle YYYY-MM format
    if (monthStr.includes('-')) {
      const [year, month] = monthStr.split('-');
      const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                          'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
      const monthIndex = parseInt(month, 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${monthNames[monthIndex]} ${year}`;
      }
    }
    return monthStr;
  };
  const rentMonth = formatRentMonth(payment.rent_month);

  // Calculate remaining balance
  const remainingRent = payment.remaining_rent ?? (tenant?.outstanding_rent || 0);
  const remainingService = payment.remaining_service ?? (tenant?.service_costs || 0);
  const remainingFines = payment.remaining_fines ?? (tenant?.fines || 0);
  const totalRemaining = remainingRent + remainingService + remainingFines;
  const hasRemainingBalance = totalRemaining > 0;

  // Preview fills the panel (scale to fit screen height ~800px), print is full A4
  // Screen: 100vh ~= 800-900px, A4 = 297mm, so preview scale ~0.85 to fill height
  const s = preview ? 0.85 : 1;

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
      {/* ====== HEADER - 55mm ====== */}
      <div style={{ position: 'relative', height: `${55 * s}mm`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${48 * s}mm`, background: '#1e293b', clipPath: 'polygon(0 0, 100% 0, 100% 70%, 0 100%)' }}></div>
        <div style={{ position: 'absolute', top: `${6 * s}mm`, right: `${15 * s}mm`, width: `${35 * s}mm`, height: `${38 * s}mm`, background: '#f97316', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}></div>
        <div style={{ position: 'relative', zIndex: 10, padding: `${10 * s}mm ${15 * s}mm`, color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: `${4 * s}mm`, marginBottom: `${5 * s}mm` }}>
            <div style={{ width: `${14 * s}mm`, height: `${14 * s}mm`, background: '#f97316', borderRadius: `${3 * s}mm`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: `${6 * s}mm`, fontWeight: 'bold', color: 'white' }}>{companyInitials}</span>
            </div>
            <div>
              <p style={{ fontSize: `${5 * s}mm`, fontWeight: 'bold', margin: 0, letterSpacing: '0.05em' }}>{companyName.toUpperCase()}</p>
              <p style={{ fontSize: `${2.8 * s}mm`, color: '#94a3b8', margin: 0 }}>Huurbetalingssysteem · Suriname</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: `${9 * s}mm`, fontWeight: 'bold', letterSpacing: '0.1em' }}>KWITANTIE</span>
          </div>
        </div>
      </div>

      {/* ====== KLANT INFO - 22mm ====== */}
      <div style={{ padding: `${4 * s}mm ${15 * s}mm`, display: 'flex', gap: `${6 * s}mm`, borderBottom: `${0.4 * s}mm solid #e2e8f0` }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: `${2.8 * s}mm`, color: '#64748b', margin: 0, textTransform: 'uppercase' }}>Kwitantie aan</p>
          <p style={{ fontSize: `${5 * s}mm`, fontWeight: 'bold', color: '#0f172a', margin: `${1.5 * s}mm 0` }}>{payment.tenant_name || tenant?.name}</p>
          <p style={{ fontSize: `${2.8 * s}mm`, color: '#64748b', margin: 0 }}>
            Appt. {payment.apartment_number || tenant?.apartment_number} · Code: {payment.tenant_code || tenant?.tenant_code}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: `${2.8 * s}mm`, color: '#64748b', margin: 0 }}>Kwitantie Nr.</p>
          <p style={{ fontSize: `${5 * s}mm`, fontWeight: 'bold', color: '#f97316', margin: `${1.5 * s}mm 0` }}>{kwNr}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: `${2.8 * s}mm`, color: '#64748b', margin: 0 }}>Datum</p>
          <p style={{ fontSize: `${3.5 * s}mm`, fontWeight: '600', color: '#0f172a', margin: `${1.5 * s}mm 0` }}>{dateStr}</p>
          <p style={{ fontSize: `${2.8 * s}mm`, color: '#64748b', margin: 0 }}>{timeStr}</p>
        </div>
      </div>

      {/* ====== BETALING DETAILS - 38mm ====== */}
      <div style={{ padding: `${5 * s}mm ${15 * s}mm` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: `${3 * s}mm`, textAlign: 'left', fontSize: `${3.2 * s}mm`, color: '#64748b', fontWeight: '600', borderBottom: `${0.4 * s}mm solid #e2e8f0` }}>Omschrijving</th>
              <th style={{ padding: `${3 * s}mm`, textAlign: 'center', fontSize: `${3.2 * s}mm`, color: '#64748b', fontWeight: '600', borderBottom: `${0.4 * s}mm solid #e2e8f0` }}>Methode</th>
              <th style={{ padding: `${3 * s}mm`, textAlign: 'right', fontSize: `${3.2 * s}mm`, color: '#64748b', fontWeight: '600', borderBottom: `${0.4 * s}mm solid #e2e8f0` }}>Bedrag</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: `${4 * s}mm ${3 * s}mm`, fontSize: `${4 * s}mm`, color: '#0f172a', fontWeight: '500' }}>
                {TYPE_LABELS[payment.payment_type] || payment.payment_type}
                {rentMonth && (payment.payment_type === 'rent' || payment.payment_type === 'partial_rent') && (
                  <span style={{ display: 'block', fontSize: `${3 * s}mm`, color: '#f97316', fontWeight: '600', marginTop: `${1 * s}mm` }}>
                    Maand: {rentMonth}
                  </span>
                )}
              </td>
              <td style={{ padding: `${4 * s}mm ${3 * s}mm`, textAlign: 'center', fontSize: `${3.5 * s}mm`, color: '#64748b' }}>Contant</td>
              <td style={{ padding: `${4 * s}mm ${3 * s}mm`, textAlign: 'right', fontSize: `${4 * s}mm`, color: '#0f172a', fontWeight: '600' }}>{formatSRD(payment.amount)}</td>
            </tr>
          </tbody>
        </table>

        {/* TOTAAL */}
        <div style={{ background: '#1e293b', borderRadius: `${2.5 * s}mm`, padding: `${4 * s}mm`, marginTop: `${4 * s}mm`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: `${4 * s}mm`, color: '#94a3b8', fontWeight: '600' }}>TOTAAL BETAALD</span>
          <span style={{ fontSize: `${6.5 * s}mm`, color: 'white', fontWeight: 'bold' }}>{formatSRD(payment.amount)}</span>
        </div>
      </div>

      {/* ====== OPENSTAAND SALDO - 30mm ====== */}
      <div style={{ padding: `${4 * s}mm ${15 * s}mm` }}>
        <div style={{ 
          background: hasRemainingBalance ? '#fef2f2' : '#f0fdf4', 
          border: `${0.5 * s}mm solid ${hasRemainingBalance ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: `${2.5 * s}mm`, 
          padding: `${4 * s}mm` 
        }}>
          <p style={{ 
            fontSize: `${3.2 * s}mm`, 
            fontWeight: 'bold', 
            color: hasRemainingBalance ? '#dc2626' : '#16a34a', 
            margin: 0, 
            marginBottom: `${2 * s}mm`,
            textTransform: 'uppercase'
          }}>
            {hasRemainingBalance ? 'Openstaand Saldo Na Betaling' : 'Volledig Voldaan'}
          </p>
          
          {hasRemainingBalance ? (
            <div style={{ display: 'flex', gap: `${5 * s}mm`, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {remainingRent > 0 && (
                <div>
                  <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0 }}>Huur</p>
                  <p style={{ fontSize: `${4 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(remainingRent)}</p>
                </div>
              )}
              {remainingService > 0 && (
                <div>
                  <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0 }}>Service</p>
                  <p style={{ fontSize: `${4 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(remainingService)}</p>
                </div>
              )}
              {remainingFines > 0 && (
                <div>
                  <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0 }}>Boetes</p>
                  <p style={{ fontSize: `${4 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(remainingFines)}</p>
                </div>
              )}
              <div style={{ marginLeft: 'auto', background: '#fee2e2', padding: `${2 * s}mm ${4 * s}mm`, borderRadius: `${2 * s}mm` }}>
                <p style={{ fontSize: `${2.5 * s}mm`, color: '#991b1b', margin: 0 }}>Totaal</p>
                <p style={{ fontSize: `${5.5 * s}mm`, fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{formatSRD(totalRemaining)}</p>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: `${4 * s}mm`, color: '#16a34a', margin: 0 }}>✓ Geen openstaand saldo - Alles is betaald!</p>
          )}
        </div>
      </div>

      {/* ====== BETALINGSREGISTRATIE - 42mm ====== */}
      <div style={{ padding: `${4 * s}mm ${15 * s}mm` }}>
        <div style={{ border: `${0.5 * s}mm solid #e2e8f0`, borderRadius: `${2.5 * s}mm`, overflow: 'hidden' }}>
          <div style={{ background: '#1e293b', padding: `${3 * s}mm ${4 * s}mm` }}>
            <p style={{ fontSize: `${3.5 * s}mm`, fontWeight: 'bold', color: 'white', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Betalingsregistratie
            </p>
          </div>
          <div style={{ padding: `${3 * s}mm ${4 * s}mm`, background: '#f8fafc' }}>
            <table style={{ width: '100%', fontSize: `${2.8 * s}mm`, borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: `${1.5 * s}mm 0`, color: '#64748b', width: '35%' }}>Transactie ID</td>
                  <td style={{ padding: `${1.5 * s}mm 0`, color: '#0f172a', fontWeight: '500', fontFamily: 'monospace', fontSize: `${2.5 * s}mm` }}>{(payment.payment_id || kwNr).substring(0, 24)}...</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1.5 * s}mm 0`, color: '#64748b' }}>Kwitantie Nr.</td>
                  <td style={{ padding: `${1.5 * s}mm 0`, color: '#f97316', fontWeight: 'bold', fontSize: `${3.2 * s}mm` }}>{kwNr}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1.5 * s}mm 0`, color: '#64748b' }}>Datum & Tijd</td>
                  <td style={{ padding: `${1.5 * s}mm 0`, color: '#0f172a', fontWeight: '500' }}>{dateStr} om {timeStr}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1.5 * s}mm 0`, color: '#64748b' }}>Betaalmethode</td>
                  <td style={{ padding: `${1.5 * s}mm 0`, color: '#0f172a', fontWeight: '500' }}>Contant</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1.5 * s}mm 0`, color: '#64748b' }}>Huurder</td>
                  <td style={{ padding: `${1.5 * s}mm 0`, color: '#0f172a', fontWeight: '500' }}>{payment.tenant_code || tenant?.tenant_code} · Appt. {payment.apartment_number || tenant?.apartment_number}</td>
                </tr>
                <tr>
                  <td style={{ padding: `${1.5 * s}mm 0`, color: '#64748b' }}>Status</td>
                  <td style={{ padding: `${1.5 * s}mm 0` }}>
                    <span style={{ 
                      background: '#dcfce7', 
                      color: '#16a34a', 
                      padding: `${0.8 * s}mm ${2.5 * s}mm`, 
                      borderRadius: `${1 * s}mm`,
                      fontSize: `${2.8 * s}mm`,
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

      {/* ====== VOORWAARDEN + STEMPEL - 28mm ====== */}
      <div style={{ padding: `${3 * s}mm ${15 * s}mm`, display: 'flex', gap: `${8 * s}mm` }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: `${3.2 * s}mm`, fontWeight: '600', color: '#0f172a', marginBottom: `${1.5 * s}mm` }}>Voorwaarden</p>
          <p style={{ fontSize: `${2.8 * s}mm`, color: '#64748b', lineHeight: 1.4, margin: 0 }}>
            Bewaar deze kwitantie als bewijs van betaling.<br />
            Betalingen zijn niet restitueerbaar.
          </p>
        </div>
        <div style={{ width: `${45 * s}mm`, textAlign: 'center' }}>
          {stampData && stampData.stamp_company_name ? (
            <div style={{ border: `${0.5 * s}mm solid #1e293b`, borderRadius: `${2 * s}mm`, padding: `${3 * s}mm`, background: '#f8fafc' }}>
              <p style={{ fontSize: `${3.2 * s}mm`, fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{stampData.stamp_company_name}</p>
              {stampData.stamp_phone && <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0 }}>Tel: {stampData.stamp_phone}</p>}
            </div>
          ) : (
            <div style={{ border: `${0.5 * s}mm dashed #94a3b8`, borderRadius: `${2 * s}mm`, padding: `${3 * s}mm`, background: '#f8fafc' }}>
              <p style={{ fontSize: `${3.5 * s}mm`, fontWeight: 'bold', color: '#16a34a', margin: 0 }}>BETAALD ✓</p>
            </div>
          )}
        </div>
      </div>

      {/* ====== FOOTER - 20mm ====== */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${20 * s}mm`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${16 * s}mm`, background: '#1e293b', clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 100%)' }}></div>
        <div style={{ position: 'absolute', bottom: 0, left: `${15 * s}mm`, width: `${22 * s}mm`, height: `${14 * s}mm`, background: '#f97316', clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }}></div>
        <div style={{ position: 'absolute', bottom: `${4 * s}mm`, right: `${15 * s}mm`, zIndex: 10 }}>
          <p style={{ fontSize: `${2.8 * s}mm`, color: '#94a3b8', margin: 0 }}>Bedankt voor uw betaling!</p>
        </div>
      </div>
    </div>
  );
}
