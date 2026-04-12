import { useState, useEffect, useRef } from 'react';
import { CreditCard, Trash2, Check, ScanFace, Camera } from 'lucide-react';
import { API, axios } from './utils';
import FaceCapture from '../FaceCapture';

function TenantModal({ tenant, apartments, onClose, onSave, token, companyId }) {
  const [name, setName] = useState(tenant?.name || '');
  const [apartmentId, setApartmentId] = useState(tenant?.apartment_id || '');
  const [email, setEmail] = useState(tenant?.email || '');
  const [telefoon, setTelefoon] = useState(tenant?.telefoon || '');
  const [tenantCode, setTenantCode] = useState(tenant?.tenant_code || '');
  const [monthlyRent, setMonthlyRent] = useState(tenant?.monthly_rent || 0);
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
  const [cardReaderActive, setCardReaderActive] = useState(false);
  const cardBufferRef = useRef('');
  const cardTimerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [faceRegistered, setFaceRegistered] = useState(!!tenant?.face_id_enabled);
  const [faceSaving, setFaceSaving] = useState(false);

  const availableApartments = apartments.filter(a => a.status !== 'occupied' || a.apartment_id === tenant?.apartment_id);

  // USB Card Reader listener - captures rapid keyboard input
  useEffect(() => {
    if (!cardReaderActive) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        const raw = cardBufferRef.current.trim();
        if (raw.length > 5) {
          setIdCardRaw(raw);
          // Parse card data - try common delimiters
          const parts = raw.split(/[;^|=\t]+/).filter(Boolean);
          if (parts.length >= 1) setIdCardNumber(parts[0]);
          if (parts.length >= 2) setIdCardName(parts[1]);
          if (parts.length >= 3) setIdCardDob(parts[2]);
        }
        cardBufferRef.current = '';
        setCardReaderActive(false);
        return;
      }
      if (e.key.length === 1) {
        cardBufferRef.current += e.key;
        clearTimeout(cardTimerRef.current);
        cardTimerRef.current = setTimeout(() => { cardBufferRef.current = ''; }, 500);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cardReaderActive]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const data = { name, apartment_id: apartmentId, email: email || null, telefoon: telefoon || null,
        monthly_rent: parseFloat(monthlyRent), deposit_required: parseFloat(depositRequired),
        tenant_code: tenantCode || null,
        id_card_number: idCardNumber || null, id_card_name: idCardName || null,
        id_card_dob: idCardDob || null, id_card_raw: idCardRaw || null };
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
      onSave();
    } catch (err) {
      alert('Opslaan mislukt');
    } finally {
      setLoading(false);
    }
  };

  const handleFaceRegister = async (descriptor) => {
    if (!tenant || !companyId) return;
    setFaceSaving(true);
    try {
      await axios.post(`${API}/public/${companyId}/tenant/${tenant.tenant_id}/face/register`, { descriptor });
      setFaceRegistered(true);
      setShowFaceCapture(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Face ID registratie mislukt');
    } finally { setFaceSaving(false); }
  };

  const handleFaceDelete = async () => {
    if (!tenant || !companyId) return;
    if (!window.confirm('Face ID verwijderen voor deze huurder?')) return;
    try {
      await axios.delete(`${API}/public/${companyId}/tenant/${tenant.tenant_id}/face`);
      setFaceRegistered(false);
    } catch { alert('Verwijderen mislukt'); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg sm:max-w-4xl mx-3 sm:mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{tenant ? 'Bewerk' : 'Nieuwe'} Huurder</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Naam *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full px-4 py-3 border rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Appartement *</label>
              <select value={apartmentId} onChange={(e) => {
                  const id = e.target.value;
                  setApartmentId(id);
                  if (id) {
                    const apt = apartments.find(a => a.apartment_id === id);
                    if (apt && apt.monthly_rent) {
                      setMonthlyRent(apt.monthly_rent);
                      setDepositRequired(apt.monthly_rent);
                    }
                  }
                }} required
                className="w-full px-4 py-3 border rounded-xl">
                <option value="">Selecteer...</option>
                {apartments.filter(a => a.status !== 'occupied' || a.apartment_id === tenant?.apartment_id).map(a => <option key={a.apartment_id} value={a.apartment_id}>{a.number}{a.monthly_rent ? ` - SRD ${a.monthly_rent.toLocaleString('nl-NL')}` : ''}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefoon</label>
              <input type="tel" value={telefoon} onChange={(e) => setTelefoon(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Huurderscode</label>
              <input type="text" value={tenantCode} onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                placeholder="bijv. A101"
                data-testid="tenant-code-input"
                className="w-full px-4 py-3 border rounded-xl font-mono uppercase" />
              <p className="text-xs text-slate-400 mt-1">Leeg = automatisch</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Maandhuur (SRD)</label>
              <input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Borgsom (SRD)</label>
              <input type="number" value={depositRequired} onChange={(e) => setDepositRequired(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl" />
            </div>
          </div>
          {tenant && (
            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Financieel</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Openstaande huur</label>
                  <input type="number" step="0.01" value={outstandingRent} onChange={(e) => setOutstandingRent(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Servicekosten</label>
                  <input type="number" step="0.01" value={serviceCosts} onChange={(e) => setServiceCosts(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Boetes</label>
                  <input type="number" step="0.01" value={fines} onChange={(e) => setFines(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                </div>
              </div>
            </div>
          )}
          {!tenant && (
            <>
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">Huurovereenkomst</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Startdatum</label>
                    <input type="date" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)}
                      data-testid="tenant-lease-start"
                      className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Einddatum</label>
                    <input type="date" value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)}
                      data-testid="tenant-lease-end"
                      className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">Automatisch een huurovereenkomst aanmaken</p>
              </div>
            </>
          )}
          {/* ID Kaart Section */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-600" />
                <p className="text-sm font-semibold text-slate-700">ID Kaart</p>
              </div>
              {idCardNumber && (
                <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <Check className="w-3 h-3" /> Geregistreerd
                </span>
              )}
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => { setCardReaderActive(!cardReaderActive); cardBufferRef.current = ''; }}
                data-testid="card-reader-toggle"
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed text-sm font-medium transition ${
                  cardReaderActive
                    ? 'border-orange-400 bg-orange-50 text-orange-700 animate-pulse'
                    : 'border-slate-300 text-slate-500 hover:border-orange-300 hover:text-orange-600'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                {cardReaderActive ? 'Wacht op kaart... (scan nu)' : 'ID Kaart Scannen'}
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Kaartnummer / ID</label>
                  <input type="text" value={idCardNumber} onChange={e => setIdCardNumber(e.target.value)}
                    data-testid="id-card-number" placeholder="Wordt automatisch ingevuld"
                    className="w-full px-3 py-2.5 border rounded-xl text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Naam op kaart</label>
                  <input type="text" value={idCardName} onChange={e => setIdCardName(e.target.value)}
                    data-testid="id-card-name" placeholder="Wordt automatisch ingevuld"
                    className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Geboortedatum</label>
                  <input type="text" value={idCardDob} onChange={e => setIdCardDob(e.target.value)}
                    data-testid="id-card-dob" placeholder="Wordt automatisch ingevuld"
                    className="w-full px-3 py-2.5 border rounded-xl text-sm" />
                </div>
              </div>
              <p className="text-xs text-slate-400">Scan de ID kaart met de USB kaartlezer of vul handmatig in</p>
            </div>
          </div>
          {/* Face ID Section - only when editing existing tenant */}
          {tenant && companyId && (
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ScanFace className="w-4 h-4 text-violet-600" />
                  <p className="text-sm font-semibold text-slate-700">Face ID</p>
                </div>
                {faceRegistered && (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <Check className="w-3 h-3" /> Geregistreerd
                  </span>
                )}
              </div>
              {showFaceCapture ? (
                <div className="bg-slate-50 rounded-xl p-4">
                  <FaceCapture
                    mode="register"
                    onCapture={handleFaceRegister}
                    onCancel={() => setShowFaceCapture(false)}
                    buttonLabel={`Registreer ${tenant.name}`}
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowFaceCapture(true)} data-testid="tenant-modal-face-register-btn"
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium transition">
                    <Camera className="w-4 h-4" />
                    {faceRegistered ? 'Opnieuw registreren' : 'Gezicht registreren'}
                  </button>
                  {faceRegistered && (
                    <button type="button" onClick={handleFaceDelete} data-testid="tenant-modal-face-delete-btn"
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium transition">
                      <Trash2 className="w-4 h-4" /> Verwijderen
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl">Annuleren</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-orange-500 text-white rounded-xl disabled:opacity-50">
              {loading ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



export default TenantModal;
