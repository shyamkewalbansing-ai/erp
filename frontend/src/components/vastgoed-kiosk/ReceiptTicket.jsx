function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_LABELS = {
  rent: 'Huurbetaling',
  monthly_rent: 'Huurbetaling',
  partial_rent: 'Gedeeltelijke huurbetaling',
  service_costs: 'Servicekosten (water/stroom)',
  fines: 'Boetes / Achterstand',
  fine: 'Boetes / Achterstand',
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
  
  // Covered months from backend auto-calculation
  const coveredMonths = payment.covered_months || [];

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

      {/* ====== HUURMAAND INFO (alleen bij huur betalingen) ====== */}
      {(coveredMonths.length > 0 || rentMonth) && (payment.payment_type === 'rent' || payment.payment_type === 'monthly_rent' || payment.payment_type === 'partial_rent') && (
        <div style={{ padding: `${3 * s}mm ${15 * s}mm` }}>
          <div style={{ 
            background: '#fff7ed', 
            border: `${0.5 * s}mm solid #fdba74`,
            borderRadius: `${2.5 * s}mm`, 
            padding: `${4 * s}mm`,
            display: 'flex',
            alignItems: 'center',
            gap: `${4 * s}mm`
          }}>
            <div style={{ 
              width: `${12 * s}mm`, 
              height: `${12 * s}mm`, 
              background: '#f97316', 
              borderRadius: `${2 * s}mm`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <span style={{ fontSize: `${5 * s}mm`, color: 'white', fontWeight: 'bold' }}>&#128197;</span>
            </div>
            <div>
              <p style={{ fontSize: `${3 * s}mm`, color: '#9a3412', margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>
                {payment.payment_type === 'partial_rent' ? 'Gedeeltelijke betaling voor' : 'Huurbetaling voor'}
              </p>
              {coveredMonths.length > 0 ? (
                <p style={{ fontSize: `${5 * s}mm`, color: '#c2410c', margin: 0, fontWeight: 'bold' }}>
                  {coveredMonths.join(', ')}
                </p>
              ) : (
                <p style={{ fontSize: `${5.5 * s}mm`, color: '#c2410c', margin: 0, fontWeight: 'bold' }}>
                  {rentMonth}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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


      {/* ====== VOORWAARDEN + STEMPEL - 28mm ====== */}
      <div style={{ padding: `${3 * s}mm ${15 * s}mm`, display: 'flex', gap: `${8 * s}mm` }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: `${3.2 * s}mm`, fontWeight: '600', color: '#0f172a', marginBottom: `${1.5 * s}mm` }}>Voorwaarden</p>
          <p style={{ fontSize: `${2.8 * s}mm`, color: '#64748b', lineHeight: 1.4, margin: 0 }}>
            Bewaar deze kwitantie als bewijs van betaling.<br />
            Betalingen zijn niet restitueerbaar.
          </p>
        </div>
        <div style={{ width: `${55 * s}mm`, textAlign: 'center' }}>
          {stampData && stampData.stamp_company_name ? (
            <div style={{ transform: 'rotate(-5deg)', display: 'inline-block' }}>
              <div style={{
                border: `${0.6 * s}mm solid #991b1b`,
                padding: `${2.5 * s}mm ${3.5 * s}mm`,
                display: 'flex',
                alignItems: 'center',
                gap: `${2.5 * s}mm`,
                background: 'rgba(255,255,255,0.5)',
              }}>
                <svg width={12 * s} height={11 * s} viewBox="0 0 52 48" fill="none" style={{ flexShrink: 0 }}>
                  <polygon points="12,18 28,6 44,18" fill="#991b1b"/>
                  <rect x="14" y="18" width="28" height="20" fill="#991b1b"/>
                  <rect x="18" y="22" width="6" height="6" fill="white"/>
                  <rect x="28" y="22" width="6" height="6" fill="white"/>
                  <polygon points="2,28 16,18 30,28" fill="#7f1d1d"/>
                  <rect x="4" y="28" width="24" height="16" fill="#7f1d1d"/>
                  <rect x="8" y="31" width="5" height="5" fill="white"/>
                  <rect x="16" y="31" width="5" height="5" fill="white"/>
                </svg>
                <div style={{ lineHeight: 1.3, textAlign: 'left' }}>
                  <p style={{ color: '#991b1b', fontWeight: 'bold', fontSize: `${2.8 * s}mm`, margin: 0 }}>{stampData.stamp_company_name}</p>
                  {stampData.stamp_address && <p style={{ color: '#1a1a1a', fontSize: `${2.3 * s}mm`, margin: 0, fontWeight: 500 }}>{stampData.stamp_address}</p>}
                  {stampData.stamp_phone && <p style={{ color: '#1a1a1a', fontSize: `${2.3 * s}mm`, margin: 0, fontWeight: 500 }}>Tel : {stampData.stamp_phone}</p>}
                  {stampData.stamp_whatsapp && <p style={{ color: '#1a1a1a', fontSize: `${2.3 * s}mm`, margin: 0, fontWeight: 500 }}>Whatsapp : {stampData.stamp_whatsapp}</p>}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ border: `${0.5 * s}mm dashed #94a3b8`, borderRadius: `${2 * s}mm`, padding: `${3 * s}mm`, background: '#f8fafc' }}>
              <p style={{ fontSize: `${3.5 * s}mm`, fontWeight: 'bold', color: '#16a34a', margin: 0 }}>BETAALD</p>
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
