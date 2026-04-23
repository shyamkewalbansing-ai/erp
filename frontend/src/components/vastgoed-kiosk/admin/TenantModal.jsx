import { useState, useEffect, useRef } from 'react';
import {
  CreditCard, Check, RotateCcw, AlertTriangle, X, Camera, Upload, Loader2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { API, axios } from './utils';

// Reset billed-through back to current real-world month
function BillingStatusSection({ tenant, token, onReset }) {
  const [busy, setBusy] = useState(false);
  const cur = (tenant?.currency || 'SRD').toUpperCase();
  const billedThrough = tenant?.rent_billed_through || '';
  if (!billedThrough) return null;
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [by, bm] = billedThrough.split('-');
  const billedDate = new Date(parseInt(by), parseInt(bm) - 1);
  const currentDate = new Date(now.getFullYear(), now.getMonth());
  const monthsAhead = (billedDate.getFullYear() - currentDate.getFullYear()) * 12 +
                      (billedDate.getMonth() - currentDate.getMonth());
  const billedLabel = billedDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  const currentLabel = currentDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  const monthlyRent = parseFloat(tenant.monthly_rent || 0);
  const internetCost = parseFloat(tenant.internet_cost || 0);
  const rentRefund = monthlyRent * Math.max(0, monthsAhead);
  const internetRefund = internetCost * Math.max(0, monthsAhead);

  const resetToCurrent = async () => {
    if (!window.confirm(
      `Weet u zeker dat u de factureringsstatus wilt herstellen?\n\n` +
      `Van: ${billedLabel} (${monthsAhead} maand(en) vooruit)\n` +
      `Naar: ${currentLabel}\n\n` +
      `Openstaand saldo wordt verlaagd met:\n` +
      `• Huur: ${cur} ${rentRefund.toLocaleString('nl-NL', {minimumFractionDigits: 2})}` +
      (internetRefund > 0 ? `\n• Internet: ${cur} ${internetRefund.toLocaleString('nl-NL', {minimumFractionDigits: 2})}` : '')
    )) return;
    setBusy(true);
    try {
      const r = await axios.post(
        `${API}/admin/tenants/${tenant.tenant_id}/reset-to-current-month`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(r.data?.message || 'Factureringsstatus hersteld');
      if (onReset) onReset();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Herstellen mislukt');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Factureringsstatus</p>
          <p className="text-sm text-slate-700">
            Gefactureerd t/m: <span className="font-bold">{billedLabel}</span>
          </p>
          {billedThrough > currentMonthKey ? (
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5" />
              {monthsAhead} maand(en) vooruit gefactureerd
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-1">Huidige maand: {currentLabel}</p>
          )}
        </div>
        {billedThrough > currentMonthKey && (
          <button
            type="button"
            onClick={resetToCurrent}
            disabled={busy}
            data-testid="reset-to-current-month-btn"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            {busy ? 'Bezig...' : `Reset naar ${currentLabel}`}
          </button>
        )}
      </div>
    </div>
  );
}

// ID card camera scanner component
function IdCardScanner({ token, onScanned }) {
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef(null);

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Downscale large images before upload (mobile phones produce 10+ MB photos)
  const downscale = (dataUrl, maxDim = 1600) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (Math.max(width, height) > maxDim) {
        const ratio = maxDim / Math.max(width, height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Alleen foto\'s toegestaan');
      return;
    }
    try {
      const raw = await fileToBase64(file);
      const compact = await downscale(raw);
      setPreview(compact);
      // Auto-scan
      await runOcr(compact);
    } catch {
      toast.error('Foto laden mislukt');
    }
  };

  const runOcr = async (img) => {
    setScanning(true);
    try {
      const r = await axios.post(
        `${API}/admin/ocr/id-card`,
        { image_base64: img },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }
      );
      const { id_number, name, dob, raw_text } = r.data;
      onScanned({ id_number, name, dob, raw_text, image: img });
      toast.success('ID kaart gescand!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Scan mislukt — vul handmatig in');
    } finally {
      setScanning(false);
    }
  };

  const rescan = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      {!preview && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
            data-testid="id-card-camera-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            data-testid="id-card-scan-btn"
            className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/50 text-orange-700 font-medium hover:bg-orange-50 disabled:opacity-50 active:scale-[0.98] transition"
          >
            <Camera className="w-5 h-5" />
            <span>Foto van ID-kaart maken</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute('capture');
                  fileInputRef.current.click();
                  // restore capture for next time
                  setTimeout(() => { if (fileInputRef.current) fileInputRef.current.setAttribute('capture', 'environment'); }, 100);
                }
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200"
              data-testid="id-card-upload-btn"
            >
              <Upload className="w-3.5 h-3.5" /> Upload foto
            </button>
            <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" /> AI OCR
            </div>
          </div>
        </>
      )}

      {preview && (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
            <img src={preview} alt="ID kaart" className="w-full max-h-64 object-contain" />
            {scanning && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                <p className="text-white text-sm font-medium">AI leest je ID-kaart...</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={rescan}
            disabled={scanning}
            className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg disabled:opacity-50"
            data-testid="id-card-rescan"
          >
            Opnieuw scannen
          </button>
        </div>
      )}
    </div>
  );
}


function TenantModal({ tenant, apartments, onClose, onSave, token }) {
  const [name, setName] = useState(tenant?.name || '');
  const [apartmentId, setApartmentId] = useState(tenant?.apartment_id || '');
  const [email, setEmail] = useState(tenant?.email || '');
  const [telefoon, setTelefoon] = useState(tenant?.telefoon || '');
  const [tenantCode, setTenantCode] = useState(tenant?.tenant_code || '');
  const [monthlyRent, setMonthlyRent] = useState(tenant?.monthly_rent || 0);
  const selectedApt = tenant?.apartment_id
    ? apartments.find(a => a.apartment_id === tenant.apartment_id)
    : null;
  const initialCurrency = (tenant?.currency || selectedApt?.currency || 'SRD').toUpperCase();
  const [currency, setCurrency] = useState(initialCurrency);
  const [depositRequired, setDepositRequired] = useState(tenant?.deposit_required || 0);
  const [outstandingRent, setOutstandingRent] = useState(tenant?.outstanding_rent || 0);
  const [serviceCosts, setServiceCosts] = useState(tenant?.service_costs || 0);
  const [fines, setFines] = useState(tenant?.fines || 0);
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [idCardNumber, setIdCardNumber] = useState(tenant?.id_card_number || '');
  const [idCardName, setIdCardName] = useState(tenant?.id_card_name || '');
  const [idCardDob, setIdCardDob] = useState(tenant?.id_card_dob || '');
  const [idCardRaw, setIdCardRaw] = useState('');
  const [idCardPhoto, setIdCardPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  // Section tabs for mobile — keeps form compact
  const [section, setSection] = useState('basis');

  const handleOcrResult = ({ id_number, name: ocrName, dob, raw_text, image }) => {
    if (id_number) setIdCardNumber(id_number);
    if (ocrName) {
      setIdCardName(ocrName);
      // If main name is empty and we got one from card, prefill
      if (!name) setName(ocrName);
    }
    if (dob) setIdCardDob(dob);
    if (raw_text) setIdCardRaw(raw_text);
    if (image) setIdCardPhoto(image);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Naam is verplicht'); setSection('basis'); return; }
    if (!apartmentId) { toast.error('Kies een appartement'); setSection('basis'); return; }

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const data = {
        name, apartment_id: apartmentId,
        email: email || null, telefoon: telefoon || null,
        monthly_rent: parseFloat(monthlyRent),
        deposit_required: parseFloat(depositRequired),
        currency,
        tenant_code: tenantCode || null,
        id_card_number: idCardNumber || null,
        id_card_name: idCardName || null,
        id_card_dob: idCardDob || null,
        id_card_raw: idCardRaw || null,
      };
      if (tenant) {
        data.outstanding_rent = parseFloat(outstandingRent);
        data.service_costs = parseFloat(serviceCosts);
        data.fines = parseFloat(fines);
        await axios.put(`${API}/admin/tenants/${tenant.tenant_id}`, data, { headers });
      } else {
        if (leaseStart && leaseEnd) {
          data.lease_start_date = leaseStart;
          data.lease_end_date = leaseEnd;
        }
        await axios.post(`${API}/admin/tenants`, data, { headers });
      }
      toast.success(tenant ? 'Huurder bijgewerkt' : 'Huurder toegevoegd');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basis', label: 'Basis' },
    { id: 'id', label: 'ID Kaart' },
    ...(tenant ? [{ id: 'saldo', label: 'Saldo' }] : [{ id: 'lease', label: 'Contract' }]),
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-stretch sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">{tenant ? 'Huurder bewerken' : 'Nieuwe huurder'}</h3>
            <p className="text-[11px] text-slate-400">{tenant ? tenant.name : 'Vul onderstaande velden in'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center active:scale-95"
            data-testid="tenant-modal-close"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-0 border-b border-slate-100 flex-shrink-0 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSection(t.id)}
              className={`flex-1 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                section === t.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-500'
              }`}
              data-testid={`tenant-tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0">
          {section === 'basis' && (
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Naam *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                  data-testid="tenant-name"
                  placeholder="Volledige naam"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Appartement *</label>
                <select
                  value={apartmentId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setApartmentId(id);
                    if (id) {
                      const apt = apartments.find(a => a.apartment_id === id);
                      if (apt) {
                        if (apt.monthly_rent) {
                          setMonthlyRent(apt.monthly_rent);
                          setDepositRequired(apt.monthly_rent);
                        }
                        setCurrency((apt.currency || 'SRD').toUpperCase());
                      }
                    }
                  }}
                  required
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                  data-testid="tenant-apartment"
                >
                  <option value="">Selecteer appartement...</option>
                  {apartments.filter(a => a.status !== 'occupied' || a.apartment_id === tenant?.apartment_id).map(a => {
                    const aCur = (a.currency || 'SRD').toUpperCase();
                    return (
                      <option key={a.apartment_id} value={a.apartment_id}>
                        {a.number}{a.monthly_rent ? ` — ${aCur} ${a.monthly_rent.toLocaleString('nl-NL')}` : ''}
                      </option>
                    );
                  })}
                </select>
                {apartmentId && (
                  <p className="text-[11px] text-slate-400 mt-1">Valuta: <span className="font-bold text-slate-600">{currency}</span></p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Maandhuur</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                    data-testid="tenant-rent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Borg</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={depositRequired}
                    onChange={(e) => setDepositRequired(e.target.value)}
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                    data-testid="tenant-deposit"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telefoon</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={telefoon}
                  onChange={(e) => setTelefoon(e.target.value)}
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                  data-testid="tenant-phone"
                  placeholder="+597 ..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail</label>
                <input
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                  data-testid="tenant-email"
                  placeholder="huurder@email.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Huurdercode (optioneel)</label>
                <input
                  type="text"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:border-orange-400"
                  data-testid="tenant-code"
                  placeholder="Automatisch als leeg"
                />
              </div>

              {tenant && (
                <BillingStatusSection tenant={tenant} token={token} onReset={onSave} />
              )}
            </div>
          )}

          {section === 'id' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-orange-500" />
                <p className="text-sm font-semibold text-slate-700">ID Kaart Registratie</p>
                {idCardNumber && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> Gescand
                  </span>
                )}
              </div>

              <IdCardScanner token={token} onScanned={handleOcrResult} />

              {idCardPhoto && (
                <details className="bg-slate-50 rounded-lg p-2">
                  <summary className="text-xs text-slate-500 cursor-pointer">Foto bekijken</summary>
                  <img src={idCardPhoto} alt="ID" className="mt-2 rounded-lg max-h-40" />
                </details>
              )}

              <div className="space-y-3 border-t border-slate-100 pt-3">
                <p className="text-[11px] text-slate-400">
                  Wordt automatisch ingevuld na scannen. Controleer of alles klopt.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">ID-nummer</label>
                  <input
                    type="text"
                    value={idCardNumber}
                    onChange={(e) => setIdCardNumber(e.target.value)}
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-orange-400"
                    data-testid="id-card-number"
                    placeholder="Wordt ingevuld na scan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Naam op kaart</label>
                  <input
                    type="text"
                    value={idCardName}
                    onChange={(e) => setIdCardName(e.target.value)}
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                    data-testid="id-card-name"
                    placeholder="Wordt ingevuld na scan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Geboortedatum</label>
                  <input
                    type="text"
                    value={idCardDob}
                    onChange={(e) => setIdCardDob(e.target.value)}
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                    data-testid="id-card-dob"
                    placeholder="DD-MM-JJJJ"
                  />
                </div>
              </div>
            </div>
          )}

          {section === 'lease' && !tenant && (
            <div className="p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700 mb-2">Huurovereenkomst</p>
              <p className="text-xs text-slate-500">Optioneel — automatisch een contract aanmaken</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Startdatum</label>
                  <input
                    type="date"
                    value={leaseStart}
                    onChange={(e) => setLeaseStart(e.target.value)}
                    data-testid="tenant-lease-start"
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Einddatum</label>
                  <input
                    type="date"
                    value={leaseEnd}
                    onChange={(e) => setLeaseEnd(e.target.value)}
                    data-testid="tenant-lease-end"
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>
            </div>
          )}

          {section === 'saldo' && tenant && (
            <div className="p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700 mb-2">Openstaand Saldo</p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Openstaande huur ({currency})</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={outstandingRent}
                  onChange={(e) => setOutstandingRent(e.target.value)}
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Service kosten</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={serviceCosts}
                    onChange={(e) => setServiceCosts(e.target.value)}
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Boetes</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={fines}
                    onChange={(e) => setFines(e.target.value)}
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Sticky footer with action buttons */}
        <div
          className="flex gap-2 p-3 border-t border-slate-100 flex-shrink-0 bg-white sm:bg-slate-50"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 active:scale-[0.98] transition"
            data-testid="tenant-cancel-btn"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition flex items-center justify-center gap-1.5"
            data-testid="tenant-save-btn"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {loading ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TenantModal;
