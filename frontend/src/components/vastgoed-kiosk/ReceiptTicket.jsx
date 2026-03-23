function formatSRD(amount) {
  return `SRD ${Number(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  const s = preview ? 0.52 : 1;

  return (
    <div style={{ width: `${210 * s}mm`, minHeight: `${297 * s}mm`, background: 'white', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* ====== HEADER WITH GEOMETRIC SHAPES ====== */}
      <div style={{ position: 'relative', height: `${80 * s}mm`, overflow: 'hidden' }}>
        {/* Dark blue angular shape */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${70 * s}mm`, background: '#1e293b', clipPath: 'polygon(0 0, 100% 0, 100% 70%, 0 100%)' }}></div>
        {/* Orange accent triangle */}
        <div style={{ position: 'absolute', top: `${10 * s}mm`, right: `${20 * s}mm`, width: `${40 * s}mm`, height: `${50 * s}mm`, background: '#f97316', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}></div>
        {/* Content over shapes */}
        <div style={{ position: 'relative', zIndex: 10, padding: `${12 * s}mm ${15 * s}mm`, color: 'white' }}>
          {/* Logo + Company */}
          <div style={{ display: 'flex', alignItems: 'center', gap: `${4 * s}mm`, marginBottom: `${8 * s}mm` }}>
            <div style={{ width: `${16 * s}mm`, height: `${16 * s}mm`, background: '#f97316', borderRadius: `${3 * s}mm`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: `${7 * s}mm`, fontWeight: 'bold', color: 'white' }}>AK</span>
            </div>
            <div>
              <p style={{ fontSize: `${5 * s}mm`, fontWeight: 'bold', margin: 0, letterSpacing: '0.05em' }}>APPARTEMENT KIOSK</p>
              <p style={{ fontSize: `${3 * s}mm`, color: '#94a3b8', margin: 0 }}>Huurbetalingssysteem · Suriname</p>
            </div>
          </div>
          {/* KWITANTIE label */}
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: `${10 * s}mm`, fontWeight: 'bold', letterSpacing: '0.1em' }}>KWITANTIE</span>
          </div>
        </div>
      </div>

      {/* ====== KWITANTIE INFO BAR ====== */}
      <div style={{ padding: `${6 * s}mm ${15 * s}mm`, display: 'flex', gap: `${8 * s}mm`, borderBottom: `${0.3 * s}mm solid #e2e8f0` }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: `${3 * s}mm`, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kwitantie aan</p>
          <p style={{ fontSize: `${5 * s}mm`, fontWeight: 'bold', color: '#0f172a', margin: `${1 * s}mm 0` }}>{payment.tenant_name || tenant?.name}</p>
          <p style={{ fontSize: `${3 * s}mm`, color: '#64748b', margin: 0 }}>
            Appt. {payment.apartment_number || tenant?.apartment_number} · Code: {payment.tenant_code || tenant?.tenant_code}
            {payment.rent_month && (
              <span> · Huurmaand: {formatRentMonth(payment.rent_month)}</span>
            )}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: `${3 * s}mm`, color: '#64748b', margin: 0, textTransform: 'uppercase' }}>Kwitantie Nr.</p>
          <p style={{ fontSize: `${5 * s}mm`, fontWeight: 'bold', color: '#f97316', margin: `${1 * s}mm 0` }}>{kwNr}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: `${3 * s}mm`, color: '#64748b', margin: 0, textTransform: 'uppercase' }}>Datum</p>
          <p style={{ fontSize: `${4 * s}mm`, fontWeight: '600', color: '#0f172a', margin: `${1 * s}mm 0` }}>{dateStr}</p>
          <p style={{ fontSize: `${3 * s}mm`, color: '#64748b', margin: 0 }}>{timeStr}</p>
        </div>
      </div>

      {/* ====== TABLE ====== */}
      <div style={{ padding: `${8 * s}mm ${15 * s}mm` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: `${3 * s}mm`, textAlign: 'left', fontSize: `${3.5 * s}mm`, color: '#64748b', fontWeight: '600', borderBottom: `${0.3 * s}mm solid #e2e8f0` }}>Omschrijving</th>
              <th style={{ padding: `${3 * s}mm`, textAlign: 'center', fontSize: `${3.5 * s}mm`, color: '#64748b', fontWeight: '600', borderBottom: `${0.3 * s}mm solid #e2e8f0` }}>Methode</th>
              <th style={{ padding: `${3 * s}mm`, textAlign: 'right', fontSize: `${3.5 * s}mm`, color: '#64748b', fontWeight: '600', borderBottom: `${0.3 * s}mm solid #e2e8f0` }}>Bedrag</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: `${4 * s}mm ${3 * s}mm`, fontSize: `${4 * s}mm`, color: '#0f172a', fontWeight: '500' }}>
                {TYPE_LABELS[payment.payment_type] || payment.payment_type}
                {payment.description && (
                  <span style={{ display: 'block', fontSize: `${3 * s}mm`, color: '#64748b', marginTop: `${1 * s}mm` }}>{payment.description}</span>
                )}
              </td>
              <td style={{ padding: `${4 * s}mm ${3 * s}mm`, textAlign: 'center', fontSize: `${3.5 * s}mm`, color: '#64748b' }}>Contant</td>
              <td style={{ padding: `${4 * s}mm ${3 * s}mm`, textAlign: 'right', fontSize: `${4 * s}mm`, color: '#0f172a', fontWeight: '600' }}>{formatSRD(payment.amount)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ marginTop: `${4 * s}mm`, borderTop: `${0.3 * s}mm solid #e2e8f0`, paddingTop: `${4 * s}mm` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: `${2 * s}mm` }}>
            <span style={{ fontSize: `${3.5 * s}mm`, color: '#64748b' }}>Subtotaal</span>
            <span style={{ fontSize: `${3.5 * s}mm`, color: '#0f172a' }}>{formatSRD(payment.amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: `${4 * s}mm` }}>
            <span style={{ fontSize: `${3.5 * s}mm`, color: '#64748b' }}>BTW (0%)</span>
            <span style={{ fontSize: `${3.5 * s}mm`, color: '#0f172a' }}>SRD 0,00</span>
          </div>
        </div>

        {/* Grand total */}
        <div style={{ background: '#1e293b', borderRadius: `${3 * s}mm`, padding: `${5 * s}mm`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: `${4.5 * s}mm`, color: '#94a3b8', fontWeight: '600' }}>Totaal bedrag</span>
          <span style={{ fontSize: `${7 * s}mm`, color: 'white', fontWeight: 'bold' }}>{formatSRD(payment.amount)}</span>
        </div>
      </div>

      {/* ====== STAMP + SIGNATURE ====== */}
      <div style={{ padding: `${8 * s}mm ${15 * s}mm`, display: 'flex', gap: `${10 * s}mm` }}>
        {/* Terms */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: `${3.5 * s}mm`, fontWeight: '600', color: '#0f172a', marginBottom: `${2 * s}mm` }}>Voorwaarden</p>
          <p style={{ fontSize: `${3 * s}mm`, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
            Bewaar deze kwitantie als bewijs van betaling.<br />
            Betalingen worden direct verwerkt en zijn niet restitueerbaar.
          </p>
        </div>

        {/* Stamp / Company Stamp */}
        <div style={{ width: `${50 * s}mm`, textAlign: 'center' }}>
          {stampData && (stampData.stamp_company_name || stampData.stamp_address || stampData.stamp_phone || stampData.stamp_whatsapp) ? (
            <div style={{ border: `${0.5 * s}mm solid #1e293b`, borderRadius: `${3 * s}mm`, padding: `${3 * s}mm`, background: '#f8fafc' }}>
              {/* House Icon SVG */}
              <svg style={{ width: `${8 * s}mm`, height: `${8 * s}mm`, margin: '0 auto', marginBottom: `${2 * s}mm` }} viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {stampData.stamp_company_name && (
                <p style={{ fontSize: `${3.5 * s}mm`, fontWeight: 'bold', color: '#1e293b', margin: 0, marginBottom: `${1 * s}mm` }}>{stampData.stamp_company_name}</p>
              )}
              {stampData.stamp_address && (
                <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0, marginBottom: `${0.5 * s}mm` }}>{stampData.stamp_address}</p>
              )}
              {stampData.stamp_phone && (
                <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0, marginBottom: `${0.5 * s}mm` }}>Tel : {stampData.stamp_phone}</p>
              )}
              {stampData.stamp_whatsapp && (
                <p style={{ fontSize: `${2.5 * s}mm`, color: '#64748b', margin: 0 }}>Whatsapp : {stampData.stamp_whatsapp}</p>
              )}
            </div>
          ) : (
            <div style={{ border: `${0.5 * s}mm dashed #94a3b8`, borderRadius: `${3 * s}mm`, padding: `${5 * s}mm`, background: '#f8fafc' }}>
              <p style={{ fontSize: `${3 * s}mm`, color: '#64748b', margin: 0, marginBottom: `${2 * s}mm` }}>APPARTEMENT KIOSK</p>
              <p style={{ fontSize: `${3.5 * s}mm`, fontWeight: 'bold', color: '#16a34a', margin: 0 }}>BETAALD · VOLDAAN</p>
              <p style={{ fontSize: `${8 * s}mm`, color: '#16a34a', margin: 0, marginTop: `${2 * s}mm` }}>✓</p>
            </div>
          )}
        </div>
      </div>

      {/* ====== FOOTER WITH GEOMETRIC SHAPES ====== */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${30 * s}mm`, overflow: 'hidden' }}>
        {/* Dark blue angular shape */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${25 * s}mm`, background: '#1e293b', clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 100%)' }}></div>
        {/* Orange accent triangle */}
        <div style={{ position: 'absolute', bottom: 0, left: `${15 * s}mm`, width: `${30 * s}mm`, height: `${20 * s}mm`, background: '#f97316', clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }}></div>
        {/* Footer content */}
        <div style={{ position: 'absolute', bottom: `${5 * s}mm`, right: `${15 * s}mm`, zIndex: 10 }}>
          <p style={{ fontSize: `${3 * s}mm`, color: '#94a3b8', margin: 0 }}>Bedankt voor uw betaling!</p>
        </div>
      </div>
    </div>
  );
}
