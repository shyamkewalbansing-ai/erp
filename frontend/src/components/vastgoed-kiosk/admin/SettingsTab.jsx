import { useState, useEffect } from 'react';
import { 
  CreditCard, Loader2, Settings, ExternalLink, Zap, AlertTriangle, 
  FileText, Save, Eye, Phone, Bell, Check, Search, Crown, Mail, MessageSquare,
  Trash2, TrendingUp, TrendingDown, Plus, X, Globe, Copy, RefreshCw,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { API, axios } from './utils';
import PushNotificationsSettings from './PushNotificationsSettings';

function SettingsTab({ company, token, onRefresh, tenants }) {
  const [settingsSubTab, setSettingsSubTab] = useState('general');
  const [billingDay, setBillingDay] = useState(company?.billing_day || 1);
  const [billingNextMonth, setBillingNextMonth] = useState(company?.billing_next_month !== false);
  const [fineAmount, setFineAmount] = useState(company?.fine_amount || 0);
  const [powerCutoffDays, setPowerCutoffDays] = useState(company?.power_cutoff_days || 0);
  const [stampName, setStampName] = useState(company?.stamp_company_name || '');
  const [stampAddress, setStampAddress] = useState(company?.stamp_address || '');
  const [stampPhone, setStampPhone] = useState(company?.stamp_phone || '');
  const [stampWhatsapp, setStampWhatsapp] = useState(company?.stamp_whatsapp || '');
  const [kioskPin, setKioskPin] = useState(company?.kiosk_pin || '');
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyingFines, setApplyingFines] = useState(false);
  // Bank/betaalmethode
  const [bankName, setBankName] = useState(company?.bank_name || '');
  const [bankAccountName, setBankAccountName] = useState(company?.bank_account_name || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(company?.bank_account_number || '');
  const [bankDescription, setBankDescription] = useState(company?.bank_description || '');
  // WhatsApp Business API
  const [waApiUrl, setWaApiUrl] = useState(company?.wa_api_url || 'https://graph.facebook.com/v21.0');
  const [waApiToken, setWaApiToken] = useState(company?.wa_api_token || '');
  const [waPhoneId, setWaPhoneId] = useState(company?.wa_phone_id || '');
  const [waEnabled, setWaEnabled] = useState(company?.wa_enabled || false);
  const [waTesting, setWaTesting] = useState(false);
  const [waTestResult, setWaTestResult] = useState(null);
  // SumUp Payment Integration
  const [sumupApiKey, setSumupApiKey] = useState(company?.sumup_api_key || '');
  const [sumupMerchantCode, setSumupMerchantCode] = useState(company?.sumup_merchant_code || '');
  const [sumupEnabled, setSumupEnabled] = useState(company?.sumup_enabled || false);
  const [sumupCurrency, setSumupCurrency] = useState(company?.sumup_currency || 'EUR');
  const [sumupExchangeRate, setSumupExchangeRate] = useState(company?.sumup_exchange_rate || '');
  // Mope Payment Integration
  const [mopeApiKey, setMopeApiKey] = useState(company?.mope_api_key || '');
  const [mopeEnabled, setMopeEnabled] = useState(company?.mope_enabled || false);
  // Uni5Pay Payment Integration
  const [uni5MerchantId, setUni5MerchantId] = useState(company?.uni5pay_merchant_id || '');
  const [uni5Enabled, setUni5Enabled] = useState(company?.uni5pay_enabled || false);
  // Start screen setting
  const [startScreen, setStartScreen] = useState(company?.start_screen || 'kiosk');
  // Twilio SMS Integration
  const [twilioSid, setTwilioSid] = useState(company?.twilio_account_sid || '');
  const [twilioToken, setTwilioToken] = useState(company?.twilio_auth_token || '');
  const [twilioPhone, setTwilioPhone] = useState(company?.twilio_phone_number || '');
  const [twilioEnabled, setTwilioEnabled] = useState(company?.twilio_enabled || false);
  const [twilioSmsNumber, setTwilioSmsNumber] = useState(company?.twilio_sms_number || '');
  const [twilioMode, setTwilioMode] = useState(company?.twilio_mode || 'whatsapp');  // whatsapp | sms | both
  const [twilioTestPhone, setTwilioTestPhone] = useState('');
  const [twilioTesting, setTwilioTesting] = useState(false);
  const [twilioTestResult, setTwilioTestResult] = useState(null);

  const handleSaveStamp = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        stamp_company_name: stampName,
        stamp_address: stampAddress,
        stamp_phone: stampPhone,
        stamp_whatsapp: stampWhatsapp,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        bank_name: bankName,
        bank_account_name: bankAccountName,
        bank_account_number: bankAccountNumber,
        bank_description: bankDescription,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWhatsApp = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        wa_api_url: waApiUrl,
        wa_api_token: waApiToken,
        wa_phone_id: waPhoneId,
        wa_enabled: waEnabled,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setWaTesting(true);
    setWaTestResult(null);
    try {
      // Save first, then test
      await handleSaveWhatsApp();
      const res = await axios.post(`${API}/admin/whatsapp/test`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setWaTestResult(res.data);
    } catch (err) {
      setWaTestResult({ status: 'error', message: 'Test mislukt' });
    } finally {
      setWaTesting(false);
    }
  };

  const handleSaveTwilio = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        twilio_account_sid: twilioSid,
        twilio_auth_token: twilioToken,
        twilio_phone_number: twilioPhone,
        twilio_sms_number: twilioSmsNumber,
        twilio_mode: twilioMode,
        twilio_enabled: twilioEnabled,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleTestTwilio = async () => {
    if (!twilioTestPhone || !twilioTestPhone.trim()) {
      alert('Vul eerst een test-telefoonnummer in (bv. +597XXXXXXX)');
      return;
    }
    setTwilioTesting(true);
    setTwilioTestResult(null);
    try {
      await handleSaveTwilio();
      const res = await axios.post(`${API}/auth/twilio/test`, {
        phone: twilioTestPhone.trim(),
        mode: twilioMode,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setTwilioTestResult(res.data);
    } catch (err) {
      setTwilioTestResult({
        success: false,
        error: err.response?.data?.detail || err.message || 'Test mislukt',
        results: []
      });
    } finally {
      setTwilioTesting(false);
    }
  };

  const handleSaveSumUp = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        sumup_api_key: sumupApiKey,
        sumup_merchant_code: sumupMerchantCode,
        sumup_enabled: sumupEnabled,
        sumup_currency: sumupCurrency,
        sumup_exchange_rate: parseFloat(sumupExchangeRate) || 1.0
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
      alert('SumUp instellingen opgeslagen!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMope = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        mope_api_key: mopeApiKey,
        mope_enabled: mopeEnabled,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
      alert('Mope instellingen opgeslagen!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUni5Pay = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        uni5pay_merchant_id: uni5MerchantId,
        uni5pay_enabled: uni5Enabled,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
      alert('Uni5Pay instellingen opgeslagen!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        billing_day: billingDay,
        billing_next_month: billingNextMonth,
        fine_amount: fineAmount,
        power_cutoff_days: powerCutoffDays
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyFines = async () => {
    if (!confirm('Weet u zeker dat u boetes wilt toepassen op alle huurders met achterstand?')) return;
    setApplyingFines(true);
    try {
      await axios.post(`${API}/admin/apply-fines`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      onRefresh();
      alert('Boetes zijn toegepast');
    } catch (err) {
      alert('Boetes toepassen mislukt');
    } finally {
      setApplyingFines(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab selector */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto" style={{scrollbarWidth: 'none'}}>
        <button
          onClick={() => setSettingsSubTab('general')}
          data-testid="settings-subtab-general"
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${settingsSubTab === 'general' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Settings className="w-4 h-4" /> Instellingen
        </button>
        <button
          onClick={() => setSettingsSubTab('notifications')}
          data-testid="settings-subtab-notifications"
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${settingsSubTab === 'notifications' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Bell className="w-4 h-4" /> <span className="hidden sm:inline">Notificaties</span><span className="sm:hidden">Notif.</span>
        </button>
        <button
          onClick={() => setSettingsSubTab('push')}
          data-testid="settings-subtab-push"
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${settingsSubTab === 'push' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Bell className="w-4 h-4" /> Push
        </button>
        <button
          onClick={() => setSettingsSubTab('subscription')}
          data-testid="settings-subtab-subscription"
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${settingsSubTab === 'subscription' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Crown className="w-4 h-4" /> Abonnement
        </button>
        <button
          onClick={() => setSettingsSubTab('domain')}
          data-testid="settings-subtab-domain"
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${settingsSubTab === 'domain' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Globe className="w-4 h-4" /> Domein
        </button>
      </div>

      {settingsSubTab === 'notifications' ? (
        <MessagesTab token={token} />
      ) : settingsSubTab === 'push' ? (
        <PushNotificationsSettings token={token} />
      ) : settingsSubTab === 'subscription' ? (
        <SubscriptionTab company={company} token={token} />
      ) : settingsSubTab === 'domain' ? (
        <DomainSettings company={company} token={token} onRefresh={onRefresh} />
      ) : (
      <>
      {/* Bedrijfsgegevens */}
      <CompanyDetailsSection company={company} token={token} onRefresh={onRefresh} />

      {/* Facturering & Boetes */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Facturering & Boetes</h3>
            <p className="text-sm text-slate-500">Configureer wanneer huur vervalt en het boetebedrag</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Huur vervalt op dag
            </label>
            <div className="flex items-center gap-4 mb-3">
              <input
                type="number"
                min="1"
                max="31"
                value={billingDay}
                onChange={(e) => setBillingDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-24 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 text-center text-lg font-bold"
                data-testid="billing-day-input"
              />
              <span className="text-sm text-slate-500">van de</span>
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setBillingNextMonth(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!billingNextMonth ? 'bg-orange-500 text-white' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  Dezelfde maand
                </button>
                <button
                  type="button"
                  onClick={() => setBillingNextMonth(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billingNextMonth ? 'bg-orange-500 text-white' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  Volgende maand
                </button>
              </div>
            </div>

            {/* Live vervaldata preview — toont echte einde-van-maand clamping */}
            <div className="bg-slate-50 rounded-lg p-3 mb-2 border border-slate-200" data-testid="due-dates-preview">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vervaldata preview (volgende 6 maanden)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {(() => {
                  const monthsNl = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
                  const now = new Date();
                  const rows = [];
                  for (let i = 0; i < 6; i++) {
                    // "Huur voor maand X vervalt op dag Y van maand X (dezelfde) of maand X+1 (volgende)"
                    const rentMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
                    const dueMonth = new Date(rentMonth.getFullYear(), rentMonth.getMonth() + (billingNextMonth ? 1 : 0), 1);
                    const lastDay = new Date(dueMonth.getFullYear(), dueMonth.getMonth() + 1, 0).getDate();
                    const actualDay = Math.min(billingDay, lastDay);
                    const clamped = actualDay !== billingDay;
                    rows.push(
                      <div key={i} className="bg-white rounded px-2 py-1.5 border border-slate-100">
                        <p className="text-[10px] text-slate-400">Huur {monthsNl[rentMonth.getMonth()]}</p>
                        <p className="font-bold text-slate-800">
                          {actualDay} {monthsNl[dueMonth.getMonth()]}
                          {clamped && <span className="text-amber-600 ml-1" title={`Dag ${billingDay} bestaat niet in ${monthsNl[dueMonth.getMonth()]} — gekapt naar ${actualDay}`}>*</span>}
                        </p>
                      </div>
                    );
                  }
                  return rows;
                })()}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">* = dag {billingDay} bestaat niet in die maand, wordt automatisch de laatste dag gebruikt.</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-3 text-sm text-slate-600 border border-orange-100">
              <span className="font-medium">Voorbeeld:</span> Huur van maart moet betaald zijn voor{' '}
              <span className="font-bold text-orange-600">
                {billingDay} {billingNextMonth ? 'april' : 'maart'}
              </span>
              . Na die datum wordt de nieuwe maandhuur automatisch bij het saldo opgeteld.
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Boetebedrag (SRD)
            </label>
            <p className="text-xs text-slate-400 mb-2">Vast bedrag dat eenmalig wordt toegevoegd bij te late betaling</p>
            <input
              type="number"
              value={fineAmount}
              onChange={(e) => setFineAmount(parseFloat(e.target.value))}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-red-500" />
                Stroombreker automatisch uitschakelen
              </div>
            </label>
            <p className="text-xs text-slate-400 mb-2">Aantal dagen na de vervaldatum waarna de stroombreker automatisch wordt uitgeschakeld. Zet op 0 om uit te schakelen.</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="90"
                value={powerCutoffDays}
                onChange={(e) => setPowerCutoffDays(parseInt(e.target.value) || 0)}
                data-testid="power-cutoff-days"
                className="w-24 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 text-center text-lg font-bold"
              />
              <span className="text-sm text-slate-500">dagen na vervaldatum</span>
            </div>
            {powerCutoffDays > 0 && (
              <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700 mt-3 flex items-start gap-2">
                <Zap className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>
                  <span className="font-medium">Let op:</span> Als een huurder {powerCutoffDays} dag{powerCutoffDays !== 1 ? 'en' : ''} na de vervaldatum nog niet betaald heeft, wordt de stroombreker van het gekoppelde appartement automatisch uitgeschakeld.
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
          <button
            onClick={handleApplyFines}
            disabled={applyingFines}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4" />
            {applyingFines ? 'Toepassen...' : 'Boetes nu toepassen'}
          </button>
        </div>
      </div>

      {/* Kiosk PIN Beveiliging */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Kiosk PIN Beveiliging</h3>
            <p className="text-sm text-slate-500">Beveilig uw kiosk met een 4-cijferige PIN code</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              4-cijferige PIN
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Huurders moeten deze PIN invoeren om de kiosk te gebruiken. Laat leeg om PIN uit te schakelen.
            </p>
            <div className="flex gap-2">
              <input
                type={showPin ? "text" : "password"}
                maxLength={4}
                value={kioskPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setKioskPin(val);
                }}
                placeholder="bijv. 1234"
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 text-2xl tracking-widest font-mono text-center"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                <Eye className={`w-5 h-5 ${showPin ? 'text-orange-500' : 'text-slate-400'}`} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <div className={`p-4 rounded-xl border ${kioskPin && kioskPin.length === 4 ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
              {kioskPin && kioskPin.length === 4 ? (
                <div className="flex items-center gap-2 text-green-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="font-medium">PIN beveiliging actief</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  <span>Geen PIN - Kiosk is open voor iedereen</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 mt-6"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Opslaan...' : 'PIN Opslaan'}
        </button>
      </div>

      {/* Startscherm na inloggen */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Startscherm na inloggen</h3>
            <p className="text-sm text-slate-500">Kies waar u terecht komt na het inloggen op de kiosk</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={async () => {
              setStartScreen('kiosk');
              try {
                await axios.put(`${API}/auth/settings`, { start_screen: 'kiosk' }, { headers: { Authorization: `Bearer ${token}` } });
                onRefresh();
              } catch {}
            }}
            className={`flex-1 p-4 rounded-xl border-2 transition ${startScreen === 'kiosk' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="text-2xl mb-2">
              <svg className={`w-8 h-8 mx-auto ${startScreen === 'kiosk' ? 'text-orange-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <p className={`font-bold text-center ${startScreen === 'kiosk' ? 'text-orange-700' : 'text-slate-700'}`}>Kiosk</p>
            <p className="text-xs text-slate-400 text-center mt-1">Huurders kiezen hun appartement</p>
          </button>
          <button
            type="button"
            onClick={async () => {
              setStartScreen('dashboard');
              try {
                await axios.put(`${API}/auth/settings`, { start_screen: 'dashboard' }, { headers: { Authorization: `Bearer ${token}` } });
                onRefresh();
              } catch {}
            }}
            className={`flex-1 p-4 rounded-xl border-2 transition ${startScreen === 'dashboard' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="text-2xl mb-2">
              <svg className={`w-8 h-8 mx-auto ${startScreen === 'dashboard' ? 'text-orange-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
            </div>
            <p className={`font-bold text-center ${startScreen === 'dashboard' ? 'text-orange-700' : 'text-slate-700'}`}>Dashboard</p>
            <p className="text-xs text-slate-400 text-center mt-1">Direct naar het beheerder dashboard</p>
          </button>
        </div>
      </div>

      {/* Bedrijfsstempel */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-red-700" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Bedrijfsstempel</h3>
            <p className="text-sm text-slate-500">Configureer de stempel die op kwitanties en huurovereenkomsten wordt getoond</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Bedrijfsnaam</label>
              <input
                type="text"
                value={stampName}
                onChange={(e) => setStampName(e.target.value)}
                placeholder="bijv. Uw Bedrijfsnaam"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Adres</label>
              <input
                type="text"
                value={stampAddress}
                onChange={(e) => setStampAddress(e.target.value)}
                placeholder="bijv. Straatnaam nr.1"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Telefoon</label>
              <input
                type="text"
                value={stampPhone}
                onChange={(e) => setStampPhone(e.target.value)}
                placeholder="bijv. 1234567"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">WhatsApp</label>
              <input
                type="text"
                value={stampWhatsapp}
                onChange={(e) => setStampWhatsapp(e.target.value)}
                placeholder="bijv. 0000000000"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Stamp Preview - matches physical stamp */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Voorbeeld</label>
            <div className="bg-slate-50 rounded-xl p-8 border border-slate-200 flex items-center justify-center min-h-[220px]">
              <div style={{ transform: 'rotate(-5deg)' }}>
                <div style={{
                  border: '2.5px solid #991b1b',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  background: 'rgba(255,255,255,0.6)',
                }}>
                  {/* House icon - SVG matching the physical stamp */}
                  <svg width="52" height="48" viewBox="0 0 52 48" fill="none" style={{ flexShrink: 0 }}>
                    {/* Back house */}
                    <polygon points="12,18 28,6 44,18" fill="#991b1b"/>
                    <rect x="14" y="18" width="28" height="20" fill="#991b1b"/>
                    <rect x="18" y="22" width="6" height="6" fill="white" rx="0.5"/>
                    <rect x="28" y="22" width="6" height="6" fill="white" rx="0.5"/>
                    {/* Front house */}
                    <polygon points="2,28 16,18 30,28" fill="#7f1d1d"/>
                    <rect x="4" y="28" width="24" height="16" fill="#7f1d1d"/>
                    <rect x="8" y="31" width="5" height="5" fill="white" rx="0.5"/>
                    <rect x="16" y="31" width="5" height="5" fill="white" rx="0.5"/>
                    <rect x="8" y="38" width="5" height="6" fill="white" rx="0.5"/>
                    <rect x="16" y="38" width="5" height="6" fill="white" rx="0.5"/>
                  </svg>
                  {/* Text */}
                  <div style={{ lineHeight: 1.4 }}>
                    <p style={{ color: '#991b1b', fontWeight: 700, fontSize: '13px', margin: 0 }}>
                      {stampName || 'Bedrijfsnaam'}
                    </p>
                    <p style={{ color: '#1a1a1a', fontSize: '12px', margin: 0, fontWeight: 500 }}>
                      {stampAddress || 'Adres'}
                    </p>
                    <p style={{ color: '#1a1a1a', fontSize: '12px', margin: 0, fontWeight: 500 }}>
                      Tel : {stampPhone || '0000000'}
                    </p>
                    <p style={{ color: '#1a1a1a', fontSize: '12px', margin: 0, fontWeight: 500 }}>
                      Whatsapp : {stampWhatsapp || '0000000'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveStamp}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-red-700 text-white rounded-xl hover:bg-red-800 disabled:opacity-50 mt-6"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Opslaan...' : 'Stempel opslaan'}
        </button>
      </div>

      {/* Betaalmethoden / Bankoverschrijving */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Betaalmethoden</h3>
            <p className="text-sm text-slate-500">Bankgegevens voor overschrijving — wordt getoond op kwitanties</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Banknaam</label>
            <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="bijv. De Surinaamsche Bank" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rekeninghouder</label>
            <input type="text" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} placeholder="bijv. Uw Bedrijfsnaam" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rekeningnummer</label>
            <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} placeholder="bijv. 1234567890" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Omschrijving (optioneel)</label>
            <input type="text" value={bankDescription} onChange={e => setBankDescription(e.target.value)} placeholder="bijv. Vermeld uw huurderscode" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        {(bankName || bankAccountNumber) && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-bold text-blue-800 mb-2">Voorbeeld op kwitantie:</p>
            <div className="text-sm text-blue-700">
              <p>Bank: {bankName || '—'}</p>
              <p>Rekening: {bankAccountNumber || '—'}</p>
              <p>T.n.v.: {bankAccountName || '—'}</p>
              {bankDescription && <p className="text-xs text-blue-500 mt-1">{bankDescription}</p>}
            </div>
          </div>
        )}
        <button onClick={handleSaveBank} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 mt-4">
          <Save className="w-4 h-4" />
          {saving ? 'Opslaan...' : 'Bankgegevens opslaan'}
        </button>
      </div>

      {/* WhatsApp Business API */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">WhatsApp Business API</h3>
            <p className="text-sm text-slate-500">Stuur automatisch herinneringen en boete-meldingen naar huurders</p>
          </div>
        </div>

        {/* Enable toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl mb-4">
          <div>
            <p className="font-medium text-slate-800">WhatsApp berichten activeren</p>
            <p className="text-xs text-slate-500">Schakel in om berichten te kunnen versturen via uw WhatsApp Business account</p>
          </div>
          <button onClick={() => setWaEnabled(!waEnabled)} className={`w-12 h-6 rounded-full transition-all relative ${waEnabled ? 'bg-green-500' : 'bg-slate-300'}`}>
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow ${waEnabled ? 'left-[26px]' : 'left-0.5'}`} />
          </button>
        </div>

        {waEnabled && (
          <>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">API URL</label>
                <input type="text" value={waApiUrl} onChange={e => setWaApiUrl(e.target.value)} placeholder="https://graph.facebook.com/v21.0" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-green-500 font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Access Token</label>
                <input type="password" value={waApiToken} onChange={e => setWaApiToken(e.target.value)} placeholder="Uw WhatsApp Business API token" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-green-500 font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number ID</label>
                <input type="text" value={waPhoneId} onChange={e => setWaPhoneId(e.target.value)} placeholder="bijv. 123456789012345" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-green-500 font-mono text-sm" />
              </div>
            </div>

            {/* Test result */}
            {waTestResult && (
              <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${waTestResult.status === 'connected' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {waTestResult.message}
              </div>
            )}

            {/* Setup guide */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="font-medium text-slate-700 text-sm mb-2">Hoe krijgt u deze gegevens?</p>
              <ol className="text-xs text-slate-500 space-y-1.5 list-decimal pl-4">
                <li>Ga naar <span className="font-mono text-slate-700">developers.facebook.com</span> en maak een Meta app aan</li>
                <li>Voeg de <b>WhatsApp</b> product toe aan uw app</li>
                <li>Kopieer de <b>Phone Number ID</b> en <b>Permanent Access Token</b></li>
                <li>Voeg uw bedrijfs WhatsApp nummer toe en verifieer het</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button onClick={handleTestWhatsApp} disabled={waTesting || !waApiToken || !waPhoneId} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50 text-sm font-medium">
                {waTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {waTesting ? 'Testen...' : 'Verbinding testen'}
              </button>
              <button onClick={handleSaveWhatsApp} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
                <Save className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'WhatsApp opslaan'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Twilio SMS + WhatsApp Integration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6" data-testid="twilio-integration-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Phone className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Twilio WhatsApp & SMS</h3>
            <p className="text-xs text-slate-500">Verstuur WhatsApp én/of SMS naar huurders via Twilio</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl mb-4">
          <div>
            <p className="font-medium text-slate-800">Twilio activeren</p>
            <p className="text-xs text-slate-500">Schakel in om berichten te versturen via Twilio</p>
          </div>
          <button onClick={() => setTwilioEnabled(!twilioEnabled)} className={`w-12 h-6 rounded-full transition-all relative ${twilioEnabled ? 'bg-red-500' : 'bg-slate-300'}`}>
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow ${twilioEnabled ? 'left-[26px]' : 'left-0.5'}`} />
          </button>
        </div>

        {twilioEnabled && (
          <>
            {/* Channel mode selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Verzendkanaal</label>
              <div className="grid grid-cols-3 gap-2" data-testid="twilio-mode-selector">
                {[
                  { value: 'whatsapp', label: 'WhatsApp', desc: 'Alleen WhatsApp' },
                  { value: 'sms', label: 'SMS', desc: 'Alleen SMS' },
                  { value: 'both', label: 'Beide', desc: 'WhatsApp + SMS' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTwilioMode(opt.value)}
                    data-testid={`twilio-mode-${opt.value}`}
                    className={`p-3 border-2 rounded-xl text-left transition ${twilioMode === opt.value ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <p className={`font-bold text-sm ${twilioMode === opt.value ? 'text-red-700' : 'text-slate-700'}`}>{opt.label}</p>
                    <p className="text-[11px] text-slate-500">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account SID</label>
                <input type="text" value={twilioSid} onChange={e => setTwilioSid(e.target.value)} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Auth Token</label>
                <input type="password" value={twilioToken} onChange={e => setTwilioToken(e.target.value)} placeholder="Uw Twilio Auth Token" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 font-mono text-sm" />
              </div>
              {(twilioMode === 'whatsapp' || twilioMode === 'both') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Nummer <span className="text-red-500">*</span></label>
                  <input type="text" value={twilioPhone} onChange={e => setTwilioPhone(e.target.value)} placeholder="+14155238886 (sandbox) of uw goedgekeurde WA nummer" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 font-mono text-sm" />
                  <p className="text-[11px] text-slate-400 mt-1">Sandbox: <code className="bg-slate-100 px-1 rounded">+14155238886</code>. Het "whatsapp:"-voorvoegsel wordt automatisch toegevoegd.</p>
                </div>
              )}
              {(twilioMode === 'sms' || twilioMode === 'both') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SMS Nummer {twilioMode === 'both' && <span className="text-slate-400 text-xs font-normal">(optioneel — anders gebruik WA-nummer)</span>}</label>
                  <input type="text" value={twilioSmsNumber} onChange={e => setTwilioSmsNumber(e.target.value)} placeholder="+1XXXXXXXXXX (uw Twilio SMS-nummer)" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 font-mono text-sm" />
                  <p className="text-[11px] text-slate-400 mt-1">Koop een Twilio nummer met SMS-capability voor uw land in Twilio Console &gt; Phone Numbers.</p>
                </div>
              )}
            </div>

            {/* Test sectie */}
            <div className="border border-slate-200 rounded-xl p-4 mb-4 bg-slate-50">
              <p className="font-semibold text-slate-700 mb-2 text-sm">Test verzenden</p>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  value={twilioTestPhone}
                  onChange={(e) => setTwilioTestPhone(e.target.value)}
                  placeholder="+597XXXXXXX (uw eigen nummer)"
                  data-testid="twilio-test-phone"
                  className="flex-1 min-w-[200px] px-3 py-2.5 border border-slate-200 rounded-xl font-mono text-sm bg-white"
                />
                <button
                  onClick={handleTestTwilio}
                  disabled={twilioTesting || !twilioSid || !twilioToken}
                  data-testid="twilio-test-btn"
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 text-sm font-medium"
                >
                  {twilioTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {twilioTesting ? 'Versturen...' : 'Stuur testbericht'}
                </button>
              </div>
            </div>

            {twilioTestResult && (
              <div className={`mb-4 p-4 rounded-xl border ${twilioTestResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`} data-testid="twilio-test-result">
                <p className={`font-bold text-sm mb-2 ${twilioTestResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {twilioTestResult.success ? '✓ Testbericht succesvol verstuurd' : '✗ Test mislukt'}
                </p>
                {twilioTestResult.error && (
                  <p className="text-sm text-red-700 font-medium mb-2">{twilioTestResult.error}</p>
                )}
                {(twilioTestResult.results || []).map((r, i) => (
                  <div key={i} className={`mt-2 p-3 rounded-lg ${r.status === 'sent' ? 'bg-white border border-green-200' : 'bg-white border border-red-200'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs uppercase">{r.channel}</span>
                      <span className={`text-xs font-bold ${r.status === 'sent' ? 'text-green-600' : 'text-red-600'}`}>{r.status === 'sent' ? 'VERSTUURD' : 'MISLUKT'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">From: {r.from} → To: {r.to}</p>
                    {r.sid && <p className="text-[11px] text-slate-400 font-mono">SID: {r.sid}</p>}
                    {r.error && <p className="text-xs text-red-600 mt-1 break-all">{r.error}</p>}
                    {r.hint && <p className="text-xs text-amber-700 mt-1 bg-amber-50 px-2 py-1 rounded">💡 {r.hint}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="font-medium text-slate-700 text-sm mb-2">Veelvoorkomende oorzaken waarom WhatsApp niet werkt:</p>
              <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4">
                <li><b>Sandbox opt-in vereist</b>: ontvanger moet eerst <code className="bg-white px-1 rounded">join &lt;uw-code&gt;</code> sturen naar uw sandbox-nummer (zie Twilio Console &gt; WhatsApp Sandbox)</li>
                <li><b>Trial account</b>: bij een trial-account moet elk ontvanger-nummer eerst "verified" worden in Twilio Console</li>
                <li><b>Production WhatsApp</b>: vereist goedgekeurde message-templates, tenzij u binnen 24u na laatste klant-reactie verstuurt</li>
                <li><b>Verkeerd format</b>: WhatsApp nummer moet <code className="bg-white px-1 rounded">+landcode nummer</code> zijn, bv. <code className="bg-white px-1 rounded">+14155238886</code></li>
                <li><b>Auth token expired</b>: als u het token geroteerd heeft in Twilio, moet u hier ook de nieuwe invullen</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button onClick={handleSaveTwilio} disabled={saving} data-testid="twilio-save-btn" className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm font-medium">
                <Save className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* SumUp Payment Integration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900">SumUp Pinbetaling</h3>
            <p className="text-sm text-slate-500">Koppel SumUp voor kaartbetalingen op de kiosk</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500">Schakel in om pinbetalingen via SumUp te activeren</p>
            <button onClick={() => setSumupEnabled(!sumupEnabled)} className={`w-12 h-6 rounded-full transition-all relative ${sumupEnabled ? 'bg-orange-500' : 'bg-slate-300'}`}>
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow ${sumupEnabled ? 'left-[26px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
        {sumupEnabled && (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">API Key</label>
                <input 
                  type="password" 
                  value={sumupApiKey} 
                  onChange={e => setSumupApiKey(e.target.value)} 
                  placeholder="sup_sk_..." 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-mono text-sm" 
                  data-testid="sumup-api-key"
                />
                <p className="text-xs text-slate-400 mt-1">Te vinden in SumUp Dashboard &rarr; Ontwikkelaars &rarr; API Keys</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Merchant Code</label>
                <input 
                  type="text" 
                  value={sumupMerchantCode} 
                  onChange={e => setSumupMerchantCode(e.target.value)} 
                  placeholder="bijv. MH4H92C7" 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-mono text-sm" 
                  data-testid="sumup-merchant-code"
                />
                <p className="text-xs text-slate-400 mt-1">Te vinden in SumUp Dashboard &rarr; Profiel</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Valuta</label>
                <select 
                  value={sumupCurrency} 
                  onChange={e => setSumupCurrency(e.target.value)} 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
                  data-testid="sumup-currency"
                >
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="GBP">GBP - Brits Pond</option>
                  <option value="BRL">BRL - Braziliaanse Real</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">Valuta van uw SumUp account (SRD wordt niet ondersteund door SumUp)</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Wisselkoers (SRD per 1 {sumupCurrency})</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  value={sumupExchangeRate} 
                  onChange={e => setSumupExchangeRate(e.target.value)} 
                  placeholder="bijv. 40 (als 40 SRD = 1 EUR)" 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 text-sm" 
                  data-testid="sumup-exchange-rate"
                />
                <p className="text-xs text-slate-400 mt-1">Hoeveel SRD is 1 {sumupCurrency}? Bijv. als 1 EUR = 40 SRD, vul dan 40 in</p>
                {sumupExchangeRate && parseFloat(sumupExchangeRate) > 0 && (
                  <p className="text-xs text-orange-600 mt-1 font-medium">Voorbeeld: SRD 100,00 = {sumupCurrency} {(100 / parseFloat(sumupExchangeRate)).toFixed(2)}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSaveSumUp} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 text-sm font-medium">
                <Save className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'SumUp opslaan'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mope Payment Integration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900">Mope Betaling</h3>
            <p className="text-sm text-slate-500">Koppel Mope voor QR-code betalingen op de kiosk (SRD)</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500">Schakel in om Mope betalingen te activeren</p>
            <button onClick={() => setMopeEnabled(!mopeEnabled)} className={`w-12 h-6 rounded-full transition-all relative ${mopeEnabled ? 'bg-green-500' : 'bg-slate-300'}`} data-testid="mope-toggle">
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow ${mopeEnabled ? 'left-[26px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
        {mopeEnabled && (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">API Key</label>
                <input 
                  type="password" 
                  value={mopeApiKey} 
                  onChange={e => setMopeApiKey(e.target.value)} 
                  placeholder="test_9b0ba11923bc45b5be82eb4f3117ba0a" 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-green-500 font-mono text-sm" 
                  data-testid="mope-api-key"
                />
                <p className="text-xs text-slate-400 mt-1">Ontvangen van Mope/Hakrinbank na activatie webshop functionaliteit</p>
                <p className="text-xs text-blue-500 mt-1">Tip: Gebruik een key met <code>test_</code> prefix om te testen zonder echte betalingen</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSaveMope} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 text-sm font-medium" data-testid="mope-save-btn">
                <Save className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'Mope opslaan'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Uni5Pay Payment Integration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900">Uni5Pay Betaling</h3>
            <p className="text-sm text-slate-500">Koppel Uni5Pay+ voor QR-code betalingen op de kiosk (SRD)</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500">Schakel in om Uni5Pay te activeren</p>
            <button onClick={() => setUni5Enabled(!uni5Enabled)} className={`w-12 h-6 rounded-full transition-all relative ${uni5Enabled ? 'bg-green-500' : 'bg-slate-300'}`} data-testid="uni5pay-toggle">
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow ${uni5Enabled ? 'left-[26px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
        {uni5Enabled && (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Merchant ID</label>
                <input 
                  type="text" 
                  value={uni5MerchantId} 
                  onChange={e => setUni5MerchantId(e.target.value)} 
                  placeholder="UNI5_MERCHANT_12345" 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 font-mono text-sm" 
                  data-testid="uni5pay-merchant-id"
                />
                <p className="text-xs text-slate-400 mt-1">Ontvangen van Uni5Pay+ na goedkeuring merchant account</p>
                <p className="text-xs text-blue-500 mt-1">Nog geen account? Registreer via uni5pay.sr/merchants</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSaveUni5Pay} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm font-medium" data-testid="uni5pay-save-btn">
                <Save className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'Uni5Pay opslaan'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Email SMTP Section */}
      <SmtpSettings company={company} token={token} onRefresh={onRefresh} />
      </>
      )}
    </div>
  );
}

// ============== WERKNEMERS TAB ==============
function EmployeesTab({ token, formatSRD }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [name, setName] = useState('');
  const [functie, setFunctie] = useState('');
  const [maandloon, setMaandloon] = useState('');
  const [telefoon, setTelefoon] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(null);

  const loadEmployees = async () => {
    try {
      const resp = await axios.get(`${API}/admin/employees`, { headers: { Authorization: `Bearer ${token}` } });
      setEmployees(resp.data || []);
    } catch { /* skip */ }
    setLoading(false);
  };

  useEffect(() => { loadEmployees(); }, []);

  const resetForm = () => {
    setName(''); setFunctie(''); setMaandloon(''); setTelefoon(''); setEmail('');
    setEditingEmp(null); setShowForm(false);
  };

  const openEdit = (emp) => {
    setEditingEmp(emp);
    setName(emp.name); setFunctie(emp.functie || ''); setMaandloon(emp.maandloon?.toString() || '');
    setTelefoon(emp.telefoon || ''); setEmail(emp.email || '');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingEmp) {
        await axios.put(`${API}/admin/employees/${editingEmp.employee_id}`, {
          name, functie, maandloon: parseFloat(maandloon) || 0, telefoon, email
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API}/admin/employees`, {
          name, functie, maandloon: parseFloat(maandloon) || 0, telefoon, email
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      resetForm();
      loadEmployees();
    } catch { alert('Opslaan mislukt'); }
    setSaving(false);
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`"${emp.name}" verwijderen?`)) return;
    try {
      await axios.delete(`${API}/admin/employees/${emp.employee_id}`, { headers: { Authorization: `Bearer ${token}` } });
      loadEmployees();
    } catch { alert('Verwijderen mislukt'); }
  };

  const [payModal, setPayModal] = useState(null); // { emp, amount }

  const handlePay = async () => {
    if (!payModal) return;
    const { emp, amount } = payModal;
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) { alert('Voer een geldig bedrag in'); return; }
    setPaying(emp.employee_id);
    try {
      await axios.post(`${API}/admin/employees/${emp.employee_id}/pay`, { amount: payAmount }, { headers: { Authorization: `Bearer ${token}` } });
      loadEmployees();
      setPayModal(null);
      alert(`Loon uitbetaald: SRD ${payAmount.toFixed(2)}`);
    } catch (err) { alert(err.response?.data?.detail || 'Uitbetaling mislukt'); }
    setPaying(null);
  };

  const activeEmps = employees.filter(e => e.status === 'active');
  const totalLoon = activeEmps.reduce((sum, e) => sum + (e.maandloon || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6">
      {/* Samenvatting */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-slate-500">Werknemers</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeEmps.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm text-slate-500">Totaal Maandloon</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatSRD(totalLoon)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-slate-500">Totaal Uitbetaald</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatSRD(activeEmps.reduce((s, e) => s + (e.total_paid || 0), 0))}</p>
        </div>
      </div>

      {/* Werknemers Tabel */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-semibold text-slate-900">Werknemers ({activeEmps.length})</h2>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600" data-testid="add-employee-btn">
            <Plus className="w-4 h-4" /> Nieuwe Werknemer
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Naam *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" required data-testid="emp-name-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Functie</label>
                <input value={functie} onChange={e => setFunctie(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" data-testid="emp-functie-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Maandloon (SRD)</label>
                <input type="number" step="0.01" value={maandloon} onChange={e => setMaandloon(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" data-testid="emp-loon-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Telefoon</label>
                <input value={telefoon} onChange={e => setTelefoon(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50" data-testid="emp-submit-btn">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editingEmp ? 'Bijwerken' : 'Opslaan')}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-300">
                  Annuleer
                </button>
              </div>
            </div>
          </form>
        )}

        {activeEmps.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">Nog geen werknemers</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Werknemer</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Functie</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Maandloon</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Totaal Betaald</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Telefoon</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
                </tr>
              </thead>
              <tbody>
                {activeEmps.map(emp => (
                  <tr key={emp.employee_id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {emp.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{emp.name}</p>
                          {emp.email && <p className="text-xs text-slate-400">{emp.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">{emp.functie || '-'}</td>
                    <td className="p-4 text-right font-bold text-slate-900">{formatSRD(emp.maandloon)}</td>
                    <td className="p-4 text-right font-bold text-slate-900">{formatSRD(emp.total_paid || 0)}</td>
                    <td className="p-4 text-slate-600">{emp.telefoon || '-'}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPayModal({ emp, amount: emp.maandloon?.toString() || '0' })}
                          disabled={paying === emp.employee_id || !emp.maandloon}
                          className="text-green-500 hover:text-green-700 p-1.5 rounded hover:bg-green-50 disabled:opacity-50"
                          title="Loon uitbetalen"
                          data-testid={`pay-emp-${emp.employee_id}`}
                        >
                          {paying === emp.employee_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                        </button>
                        <button onClick={() => openEdit(emp)} className="text-slate-400 hover:text-orange-500 p-1" title="Bewerken">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(emp)} className="text-slate-400 hover:text-red-500 p-1" title="Verwijderen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Uitbetaling Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPayModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Loon uitbetalen</h3>
              <p className="text-sm text-slate-500 mt-1">{payModal.emp.name} — {payModal.emp.functie || 'Werknemer'}</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                <span className="text-sm text-slate-500">Maandloon</span>
                <span className="text-sm font-bold text-slate-900">{formatSRD(payModal.emp.maandloon)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Uit te betalen bedrag (SRD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={payModal.amount}
                  onChange={e => setPayModal({ ...payModal, amount: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-lg font-bold text-slate-900 focus:border-orange-500 focus:outline-none"
                  data-testid="pay-amount-input"
                  autoFocus
                />
              </div>
              <p className="text-xs text-slate-400">Dit bedrag wordt afgeschreven van de kas</p>
            </div>
            <div className="flex gap-3 p-4 border-t border-slate-100">
              <button
                onClick={handlePay}
                disabled={paying}
                data-testid="confirm-pay-btn"
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50"
              >
                {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                Uitbetalen
              </button>
              <button
                onClick={() => setPayModal(null)}
                className="px-6 py-3 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl font-medium"
              >
                Annuleer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function PowerTab({ apartments, tenants, token, onRefresh }) {
  const [shellyDevices, setShellyDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [newDevice, setNewDevice] = useState({ apartment_id: '', device_ip: '', device_name: '', device_type: 'gen1', channel: 0 });

  const loadDevices = async () => {
    try {
      const res = await axios.get(`${API}/admin/shelly-devices`, { headers: { Authorization: `Bearer ${token}` } });
      setShellyDevices(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadDevices(); }, []);

  const handleControl = async (deviceId, action) => {
    setUpdating(deviceId);
    try {
      const res = await axios.post(`${API}/admin/shelly-devices/${deviceId}/control?action=${action}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setShellyDevices(prev => prev.map(d => d.device_id === deviceId ? { ...d, last_status: res.data.status } : d));
    } catch (err) { alert('Schakelen mislukt'); }
    setUpdating(null);
  };

  const handleRefreshAll = async () => {
    setUpdating('all');
    try {
      const res = await axios.post(`${API}/admin/shelly-devices/refresh-all`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setShellyDevices(prev => prev.map(d => {
        const upd = res.data.find(r => r.device_id === d.device_id);
        return upd ? { ...d, last_status: upd.status, online: upd.online } : d;
      }));
    } catch (err) { console.error(err); }
    setUpdating(null);
  };

  const handleAddDevice = async () => {
    if (!newDevice.apartment_id || !newDevice.device_ip) return;
    try {
      await axios.post(`${API}/admin/shelly-devices`, newDevice, { headers: { Authorization: `Bearer ${token}` } });
      setShowAddModal(false);
      setNewDevice({ apartment_id: '', device_ip: '', device_name: '', device_type: 'gen1', channel: 0 });
      loadDevices();
    } catch (err) { alert('Toevoegen mislukt'); }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (!window.confirm('Weet u zeker dat u dit apparaat wilt verwijderen?')) return;
    try {
      await axios.delete(`${API}/admin/shelly-devices/${deviceId}`, { headers: { Authorization: `Bearer ${token}` } });
      loadDevices();
    } catch (err) { alert('Verwijderen mislukt'); }
  };

  const activeTenants = tenants.filter(t => t.status === 'active');

  // Group devices by apartment
  const devicesByApt = {};
  shellyDevices.forEach(d => {
    if (!devicesByApt[d.apartment_id]) devicesByApt[d.apartment_id] = [];
    devicesByApt[d.apartment_id].push(d);
  });

  return (
    <div className="space-y-6">
      {/* Main Panel - Realistic circuit breaker box */}
      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
        {/* Panel header strip */}
        <div className="px-6 py-3 flex items-center justify-between bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-bold text-slate-700 tracking-wider uppercase">Stroombrekers Paneel</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleRefreshAll} disabled={updating === 'all'} className="text-xs text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-md">
              <Loader2 className={`w-3.5 h-3.5 ${updating === 'all' ? 'animate-spin' : ''}`} />
              Status verversen
            </button>
            <button onClick={() => setShowAddModal(true)} className="text-xs text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition font-medium">
              <Plus className="w-3.5 h-3.5" />
              Shelly toevoegen
            </button>
          </div>
        </div>

        {/* Breaker grid */}
        <div className="p-6 bg-slate-50">
          {shellyDevices.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-medium mb-2">Geen Shelly apparaten gekoppeld</p>
              <p className="text-slate-400 text-sm mb-6">Voeg Shelly relais toe om stroombrekers per appartement te bedienen</p>
              <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium">
                <Plus className="w-4 h-4 inline mr-2" />
                Eerste apparaat toevoegen
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {shellyDevices.map(device => {
                const apt = apartments.find(a => a.apartment_id === device.apartment_id);
                const tenant = activeTenants.find(t => t.apartment_id === device.apartment_id);
                const powerOn = device.last_status === 'on';
                const unknown = !device.last_status || device.last_status === 'unknown';
                const unreachable = device.last_status === 'unreachable';
                const hasDebt = tenant && ((tenant.outstanding_rent || 0) + (tenant.service_costs || 0) + (tenant.fines || 0) > 0);
                const isUpdating = updating === device.device_id;

                return (
                  <div key={device.device_id} className="flex flex-col items-center group" data-testid={`breaker-${device.device_id}`}>
                    {/* Circuit breaker unit */}
                    <div className="w-28 rounded-md overflow-hidden relative" style={{
                      background: 'linear-gradient(180deg, #e8e8e8 0%, #d0d0d0 100%)',
                      boxShadow: '0 3px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.7)'
                    }}>
                      {/* Brand label */}
                      <div className="text-center pt-1.5">
                        <span className="text-[7px] font-bold text-slate-400 tracking-[0.15em] uppercase">Shelly</span>
                      </div>

                      {/* Top screw */}
                      <div className="flex justify-center pt-1">
                        <div className="w-3.5 h-3.5 rounded-full" style={{ background: 'linear-gradient(135deg, #c0c0c0 0%, #888 100%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.5)' }}>
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-2 h-[1px] bg-slate-500/60 rotate-45" />
                          </div>
                        </div>
                      </div>

                      {/* Switch housing */}
                      <div className="px-3 py-2">
                        <div className="relative w-full h-28 rounded" style={{
                          background: 'linear-gradient(180deg, #b8b8b8 0%, #989898 100%)',
                          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.25), inset 0 -1px 0 rgba(255,255,255,0.3)'
                        }}>
                          {/* ON / OFF labels */}
                          <div className="absolute top-2 left-0 right-0 text-center">
                            <span className="text-[7px] font-black text-slate-500/70 tracking-[0.2em]">ON</span>
                            <div className="w-3 h-[1px] bg-slate-500/40 mx-auto mt-0.5" />
                          </div>
                          <div className="absolute bottom-2 left-0 right-0 text-center">
                            <div className="w-3 h-[1px] bg-slate-500/40 mx-auto mb-0.5" />
                            <span className="text-[7px] font-black text-slate-500/70 tracking-[0.2em]">OFF</span>
                          </div>

                          {/* Toggle lever */}
                          <button
                            onClick={() => handleControl(device.device_id, 'toggle')}
                            disabled={isUpdating}
                            data-testid={`breaker-toggle-${device.device_id}`}
                            className="absolute left-2 right-2 h-12 cursor-pointer transition-all duration-300 ease-in-out disabled:cursor-wait"
                            style={{
                              top: (powerOn && !unknown) ? '10px' : 'auto',
                              bottom: (powerOn && !unknown) ? 'auto' : '10px',
                              background: unknown || unreachable
                                ? 'linear-gradient(180deg, #a3a3a3 0%, #737373 40%, #525252 100%)'
                                : powerOn
                                  ? 'linear-gradient(180deg, #fb923c 0%, #ea580c 40%, #c2410c 100%)'
                                  : 'linear-gradient(180deg, #94a3b8 0%, #64748b 40%, #475569 100%)',
                              borderRadius: '4px',
                              boxShadow: powerOn && !unknown
                                ? '0 4px 10px rgba(234,88,12,0.5), inset 0 1px 0 rgba(255,255,255,0.3)'
                                : '0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                            }}
                          >
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3px]">
                              {isUpdating ? (
                                <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
                              ) : (
                                <>
                                  <div className="w-8 h-[1.5px] rounded-full bg-white/25" />
                                  <div className="w-8 h-[1.5px] rounded-full bg-white/25" />
                                  <div className="w-8 h-[1.5px] rounded-full bg-white/25" />
                                </>
                              )}
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Bottom: screw + LED */}
                      <div className="flex items-center justify-between px-4 pb-2">
                        <div className="w-3.5 h-3.5 rounded-full" style={{ background: 'linear-gradient(135deg, #c0c0c0 0%, #888 100%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.5)' }}>
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-2 h-[1px] bg-slate-500/60 -rotate-45" />
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full border transition-all duration-500 ${
                          unknown || unreachable ? 'bg-yellow-400 border-yellow-500' :
                          powerOn ? 'bg-green-400 border-green-500' : 'bg-red-500 border-red-600'
                        }`} style={{
                          boxShadow: unknown || unreachable ? '0 0 8px rgba(250,204,21,0.6)' :
                            powerOn ? '0 0 8px rgba(74,222,128,0.7)' : '0 0 8px rgba(239,68,68,0.6)'
                        }} />
                      </div>
                    </div>

                    {/* Label */}
                    <div className="mt-3 text-center">
                      <p className="text-sm font-bold text-slate-800">Appt. {apt?.number || '?'}</p>
                      <p className="text-xs text-slate-400">{tenant?.name || 'Geen huurder'}</p>
                      <span className={`text-[10px] font-bold tracking-wider ${
                        unknown || unreachable ? 'text-yellow-400' :
                        powerOn ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {isUpdating ? 'BEZIG...' : unknown ? 'ONBEKEND' : unreachable ? 'OFFLINE' : powerOn ? 'AAN' : 'UIT'}
                      </span>
                      {hasDebt && (
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3 text-orange-400" />
                          <span className="text-[10px] text-orange-400 font-medium">SCHULD</span>
                        </div>
                      )}
                      {/* Delete button */}
                      <button onClick={() => handleDeleteDevice(device.device_id)} className="mt-1 text-[10px] text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                        Verwijderen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel footer */}
        <div className="px-6 py-3 flex items-center justify-between bg-slate-100 border-t border-slate-200">
          <span className="text-[10px] text-slate-400 font-mono">{shellyDevices.length} apparaten gekoppeld</span>
          <span className="text-[10px] text-slate-400">SHELLY LOCAL API</span>
        </div>
      </div>


      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-4 sm:p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Shelly Apparaat Toevoegen</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Appartement</label>
                <select value={newDevice.apartment_id} onChange={e => setNewDevice({...newDevice, apartment_id: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500">
                  <option value="">Selecteer appartement...</option>
                  {apartments.map(a => <option key={a.apartment_id} value={a.apartment_id}>Appt. {a.number} - {a.description}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">IP-adres van Shelly</label>
                <input type="text" value={newDevice.device_ip} onChange={e => setNewDevice({...newDevice, device_ip: e.target.value})} placeholder="bijv. 192.168.1.100" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Naam (optioneel)</label>
                <input type="text" value={newDevice.device_name} onChange={e => setNewDevice({...newDevice, device_name: e.target.value})} placeholder="bijv. Meterkast A-101" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select value={newDevice.device_type} onChange={e => setNewDevice({...newDevice, device_type: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500">
                    <option value="gen1">Gen1 (Shelly 1)</option>
                    <option value="gen2">Gen2+ (Plus/Pro)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kanaal</label>
                  <input type="number" min="0" max="3" value={newDevice.channel} onChange={e => setNewDevice({...newDevice, channel: parseInt(e.target.value) || 0})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Annuleren</button>
              <button onClick={handleAddDevice} disabled={!newDevice.apartment_id || !newDevice.device_ip} className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:bg-slate-300 disabled:text-slate-500 font-medium">Toevoegen</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}








// ============== INTERNET TAB ==============
function InternetTab({ token, tenants, formatSRD, onRefresh }) {
  const [plans, setPlans] = useState([]);
  const [connections, setConnections] = useState([]);
  const [routers, setRouters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [planName, setPlanName] = useState('');
  const [planSpeed, setPlanSpeed] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [showRouterModal, setShowRouterModal] = useState(false);
  const [routerTenantId, setRouterTenantId] = useState('');
  const [routerIp, setRouterIp] = useState('');
  const [routerPassword, setRouterPassword] = useState('');
  const [routerName, setRouterName] = useState('');
  const [controlling, setControlling] = useState(null);
  const [checking, setChecking] = useState(null);
  const [deviceModal, setDeviceModal] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, connRes, routerRes] = await Promise.all([
        axios.get(`${API}/admin/internet/plans`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/internet/connections`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/tenda/routers`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setPlans(plansRes.data);
      setConnections(connRes.data);
      setRouters(routerRes.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSavePlan = async () => {
    if (!planName || !planSpeed || !planPrice) return alert('Vul alle velden in');
    setSaving(true);
    try {
      if (editPlan) {
        await axios.put(`${API}/admin/internet/plans/${editPlan.plan_id}`, {
          name: planName, speed: planSpeed, price: parseFloat(planPrice),
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API}/admin/internet/plans`, {
          name: planName, speed: planSpeed, price: parseFloat(planPrice),
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      setShowPlanModal(false); setEditPlan(null);
      setPlanName(''); setPlanSpeed(''); setPlanPrice('');
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Fout bij opslaan'); }
    setSaving(false);
  };

  const deletePlan = async (planId) => {
    if (!confirm('Plan verwijderen? Gekoppelde huurders worden ontkoppeld.')) return;
    try {
      await axios.delete(`${API}/admin/internet/plans/${planId}`, { headers: { Authorization: `Bearer ${token}` } });
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Fout'); }
  };

  const handleAssign = async (tenantId, planId) => {
    setSaving(true);
    try {
      await axios.post(`${API}/admin/internet/assign?tenant_id=${tenantId}&plan_id=${planId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setAssignModal(null);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err) { alert(err.response?.data?.detail || 'Fout'); }
    setSaving(false);
  };

  const handleUnassign = async (tenantId) => {
    setSaving(true);
    try {
      await axios.post(`${API}/admin/internet/assign?tenant_id=${tenantId}&plan_id=none`, {}, { headers: { Authorization: `Bearer ${token}` } });
      loadData();
      if (onRefresh) onRefresh();
    } catch (err) { alert(err.response?.data?.detail || 'Fout'); }
    setSaving(false);
  };

  const handleAddRouter = async () => {
    if (!routerTenantId || !routerIp || !routerPassword) return alert('Vul alle velden in');
    setSaving(true);
    try {
      await axios.post(`${API}/admin/tenda/routers`, {
        tenant_id: routerTenantId, router_ip: routerIp, admin_password: routerPassword, router_name: routerName,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setShowRouterModal(false);
      setRouterTenantId(''); setRouterIp(''); setRouterPassword(''); setRouterName('');
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Fout bij toevoegen'); }
    setSaving(false);
  };

  const handleDeleteRouter = async (routerId) => {
    if (!confirm('Router verwijderen?')) return;
    try {
      await axios.delete(`${API}/admin/tenda/routers/${routerId}`, { headers: { Authorization: `Bearer ${token}` } });
      loadData();
    } catch (err) { alert('Verwijderen mislukt'); }
  };

  const handleControlInternet = async (routerId, action) => {
    setControlling(routerId);
    try {
      const res = await axios.post(`${API}/admin/tenda/routers/${routerId}/control?action=${action}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        toast.success(res.data.message);
        loadData();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) { toast.error('Verbinding mislukt'); }
    setControlling(null);
  };

  const handleCheckStatus = async (routerId) => {
    setChecking(routerId);
    try {
      const res = await axios.post(`${API}/admin/tenda/routers/${routerId}/status`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.status === 'online') {
        toast.success(`Online — ${res.data.device_count} apparaten`);
        setDeviceModal({ routerId, devices: res.data.connected_devices });
      } else {
        toast.error('Router offline');
      }
      loadData();
    } catch (err) { toast.error('Status controle mislukt'); }
    setChecking(null);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6" data-testid="internet-tab">
      {/* Plans Section */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Internet Plannen</h3>
          <button
            onClick={() => { setEditPlan(null); setPlanName(''); setPlanSpeed(''); setPlanPrice(''); setShowPlanModal(true); }}
            data-testid="internet-add-plan"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" /> Nieuw plan
          </button>
        </div>
        {plans.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Wifi className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Geen plannen aangemaakt</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {plans.map(p => (
              <div key={p.plan_id} className="border border-slate-200 rounded-xl p-4 hover:border-orange-300 transition" data-testid={`plan-${p.plan_id}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900">{p.name}</h4>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditPlan(p); setPlanName(p.name); setPlanSpeed(p.speed); setPlanPrice(p.price.toString()); setShowPlanModal(true); }}
                      className="p-1 rounded hover:bg-slate-100 transition"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button onClick={() => deletePlan(p.plan_id)} className="p-1 rounded hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-orange-600 font-medium">{p.speed}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{formatSRD(p.price)}<span className="text-xs font-normal text-slate-400"> /maand</span></p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connections Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Aansluitingen per Huurder</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Huurder</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">App.</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Internet Plan</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600">Kosten/maand</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600">Actie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {connections.map(c => (
                <tr key={c.tenant_id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-medium text-slate-900">{c.name}</td>
                  <td className="py-3 px-4 text-slate-500">{c.apartment_number}</td>
                  <td className="py-3 px-4">
                    {c.internet_plan_name ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">{c.internet_plan_name}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">Geen plan</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {c.internet_cost > 0 ? formatSRD(c.internet_cost) : '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setAssignModal(c)}
                        data-testid={`internet-assign-${c.tenant_id}`}
                        className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition"
                      >
                        {c.internet_plan_id ? 'Wijzigen' : 'Toewijzen'}
                      </button>
                      {c.internet_plan_id && (
                        <button
                          onClick={() => handleUnassign(c.tenant_id)}
                          data-testid={`internet-remove-${c.tenant_id}`}
                          className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenda Router Management */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Router Beheer (Tenda AC1200)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Internet aan/uit per huurder, verbonden apparaten</p>
          </div>
          <button
            onClick={() => setShowRouterModal(true)}
            data-testid="tenda-add-router"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" /> Router toevoegen
          </button>
        </div>
        {routers.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Wifi className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Geen routers gekoppeld</p>
            <p className="text-xs mt-1">Voeg een Tenda router toe per huurder</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {routers.map(r => (
              <div key={r.router_id} className={`border rounded-xl p-4 transition ${r.internet_enabled ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`} data-testid={`router-${r.router_id}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${r.status === 'online' ? 'bg-green-500 animate-pulse' : r.status === 'offline' ? 'bg-red-500' : 'bg-slate-300'}`} />
                    <h4 className="font-bold text-slate-900 text-sm">{r.router_name || r.router_ip}</h4>
                  </div>
                  <button onClick={() => handleDeleteRouter(r.router_id)} className="p-1 rounded hover:bg-red-100 transition">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
                <div className="space-y-1 mb-3 text-xs text-slate-500">
                  <p>Huurder: <span className="font-semibold text-slate-700">{r.tenant_name}</span></p>
                  <p>App: <span className="font-semibold text-slate-700">{r.apartment_number}</span></p>
                  <p>IP: <span className="font-mono text-slate-700">{r.router_ip}</span></p>
                  {r.connected_devices?.length > 0 && (
                    <p>Apparaten: <span className="font-semibold text-slate-700">{r.connected_devices.length} verbonden</span></p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleControlInternet(r.router_id, r.internet_enabled ? 'disable' : 'enable')}
                    disabled={controlling === r.router_id}
                    data-testid={`tenda-toggle-${r.router_id}`}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      r.internet_enabled
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    } disabled:opacity-50`}
                  >
                    {controlling === r.router_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                      r.internet_enabled ? <><Power className="w-3.5 h-3.5" /> Uitzetten</> : <><Power className="w-3.5 h-3.5" /> Aanzetten</>
                    )}
                  </button>
                  <button
                    onClick={() => handleCheckStatus(r.router_id)}
                    disabled={checking === r.router_id}
                    data-testid={`tenda-status-${r.router_id}`}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-600 transition disabled:opacity-50"
                  >
                    {checking === r.router_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><RefreshCw className="w-3.5 h-3.5" /> Status</>}
                  </button>
                </div>
                <div className="mt-2 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.internet_enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {r.internet_enabled ? 'INTERNET AAN' : 'INTERNET UIT'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan Create/Edit Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPlanModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-900" data-testid="plan-modal-title">{editPlan ? 'Plan Bewerken' : 'Nieuw Internet Plan'}</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Naam *</label>
                <input type="text" value={planName} onChange={e => setPlanName(e.target.value)}
                  data-testid="plan-name" placeholder="Bijv. Basis" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Snelheid *</label>
                <input type="text" value={planSpeed} onChange={e => setPlanSpeed(e.target.value)}
                  data-testid="plan-speed" placeholder="Bijv. 25 Mbps" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prijs per maand (SRD) *</label>
                <input type="number" value={planPrice} onChange={e => setPlanPrice(e.target.value)}
                  data-testid="plan-price" placeholder="0.00" min="0" step="0.01" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setShowPlanModal(false)} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Annuleren</button>
              <button onClick={handleSavePlan} disabled={saving} data-testid="plan-save"
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Plan Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAssignModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-900" data-testid="assign-modal-title">Internet — {assignModal.name}</h3>
              <p className="text-sm text-slate-500 mt-1">App. {assignModal.apartment_number}</p>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={() => handleAssign(assignModal.tenant_id, 'none')}
                data-testid="assign-none"
                className={`w-full text-left p-3 rounded-xl border transition ${!assignModal.internet_plan_id ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <p className="font-medium text-slate-700">Geen internet</p>
                <p className="text-xs text-slate-400">Aansluiting verwijderen</p>
              </button>
              {plans.map(p => (
                <button
                  key={p.plan_id}
                  onClick={() => handleAssign(assignModal.tenant_id, p.plan_id)}
                  data-testid={`assign-plan-${p.plan_id}`}
                  className={`w-full text-left p-3 rounded-xl border transition ${assignModal.internet_plan_id === p.plan_id ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-orange-600">{p.speed}</p>
                    </div>
                    <span className="font-bold text-slate-900">{formatSRD(p.price)}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-5 border-t border-slate-200">
              <button onClick={() => setAssignModal(null)} className="w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Sluiten</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Router Modal */}
      {showRouterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRouterModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-900" data-testid="router-modal-title">Tenda Router Toevoegen</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Huurder *</label>
                <select value={routerTenantId} onChange={e => setRouterTenantId(e.target.value)}
                  data-testid="router-tenant-select"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                  <option value="">Selecteer huurder...</option>
                  {tenants.filter(t => t.status === 'active' && !routers.find(r => r.tenant_id === t.tenant_id)).map(t => (
                    <option key={t.tenant_id} value={t.tenant_id}>{t.name} — {t.apartment_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Router IP-adres *</label>
                <input type="text" value={routerIp} onChange={e => setRouterIp(e.target.value)}
                  data-testid="router-ip" placeholder="bijv. 192.168.1.1 of publiek IP" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admin Wachtwoord *</label>
                <input type="password" value={routerPassword} onChange={e => setRouterPassword(e.target.value)}
                  data-testid="router-password" placeholder="Router admin wachtwoord" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Naam (optioneel)</label>
                <input type="text" value={routerName} onChange={e => setRouterName(e.target.value)}
                  data-testid="router-name" placeholder="bijv. Router App. A1" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setShowRouterModal(false)} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Annuleren</button>
              <button onClick={handleAddRouter} disabled={saving} data-testid="router-save"
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Toevoegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connected Devices Modal */}
      {deviceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeviceModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-900" data-testid="devices-modal-title">Verbonden Apparaten</h3>
              <p className="text-sm text-slate-500 mt-1">{deviceModal.devices.length} apparaten online</p>
            </div>
            <div className="p-5 max-h-80 overflow-y-auto">
              {deviceModal.devices.length === 0 ? (
                <p className="text-center text-slate-400 py-4">Geen apparaten verbonden</p>
              ) : (
                <div className="space-y-2">
                  {deviceModal.devices.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{d.name || 'Onbekend apparaat'}</p>
                        <p className="text-xs text-slate-400 font-mono">{d.mac}</p>
                      </div>
                      <span className="text-xs font-mono text-slate-500">{d.ip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-slate-200">
              <button onClick={() => setDeviceModal(null)} className="w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Sluiten</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function LoansTab({ token, tenants, formatSRD, onShowDetail }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(null); // loan object
  const [filterStatus, setFilterStatus] = useState('all');

  const loadLoans = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/loans`, { headers: { Authorization: `Bearer ${token}` } });
      setLoans(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadDetail = async (loanId) => {
    try {
      const res = await axios.get(`${API}/admin/loans/${loanId}`, { headers: { Authorization: `Bearer ${token}` } });
      onShowDetail(res.data);
    } catch (err) { console.error(err); }
  };

  const deleteLoan = async (loanId) => {
    if (!confirm('Weet u zeker dat u deze lening wilt verwijderen? Alle aflossingen worden ook verwijderd.')) return;
    try {
      await axios.delete(`${API}/admin/loans/${loanId}`, { headers: { Authorization: `Bearer ${token}` } });
      loadLoans();
      onShowDetail(null);
    } catch (err) { alert(err.response?.data?.detail || 'Fout bij verwijderen'); }
  };

  useEffect(() => { loadLoans(); }, []);

  const filtered = filterStatus === 'all' ? loans : loans.filter(l => l.status === filterStatus);

  const stats = {
    totalLoaned: loans.filter(l => l.status === 'active').reduce((s, l) => s + l.amount, 0),
    totalRemaining: loans.filter(l => l.status === 'active').reduce((s, l) => s + l.remaining, 0),
    totalPaid: loans.reduce((s, l) => s + l.total_paid, 0),
    activeCount: loans.filter(l => l.status === 'active').length,
    paidOffCount: loans.filter(l => l.status === 'paid_off').length,
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6" data-testid="loans-tab">
      {/* Actions bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          data-testid="loans-filter-status"
          className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
        >
          <option value="all">Alle leningen ({loans.length})</option>
          <option value="active">Actief ({stats.activeCount})</option>
          <option value="paid_off">Afgelost ({stats.paidOffCount})</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={() => setShowCreateModal(true)}
          data-testid="loans-create-btn"
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" /> Nieuwe lening
        </button>
      </div>

      {/* Loans list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Geen leningen gevonden</p>
            <p className="text-sm text-slate-400 mt-1">Maak een nieuwe lening aan via de knop hierboven</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Huurder</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">App.</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Leningbedrag</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Maand. aflossing</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Afgelost</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Openstaand</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(loan => {
                  const progress = loan.amount > 0 ? Math.min(100, (loan.total_paid / loan.amount) * 100) : 0;
                  return (
                    <tr key={loan.loan_id} className="hover:bg-slate-50 transition" data-testid={`loan-row-${loan.loan_id}`}>
                      <td className="py-3 px-4 font-medium text-slate-900">{loan.tenant_name}</td>
                      <td className="py-3 px-4 text-slate-500">{loan.apartment_number}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatSRD(loan.amount)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatSRD(loan.monthly_payment)}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">{formatSRD(loan.total_paid)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={loan.remaining > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{formatSRD(loan.remaining)}</span>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                          <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${loan.status === 'active' ? 'bg-blue-100 text-blue-700' : loan.status === 'paid_off' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {loan.status === 'active' ? 'Actief' : loan.status === 'paid_off' ? 'Afgelost' : 'Geannuleerd'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {loan.status === 'active' && (
                            <button
                              onClick={() => setShowPayModal(loan)}
                              data-testid={`loan-pay-${loan.loan_id}`}
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                              title="Aflossing registreren"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => loadDetail(loan.loan_id)}
                            data-testid={`loan-detail-${loan.loan_id}`}
                            className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
                            title="Details bekijken"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteLoan(loan.loan_id)}
                            data-testid={`loan-delete-${loan.loan_id}`}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Loan Modal */}
      {showCreateModal && (
        <LoanCreateModal
          tenants={tenants}
          token={token}
          formatSRD={formatSRD}
          onClose={() => setShowCreateModal(false)}
          onSave={() => { setShowCreateModal(false); loadLoans(); }}
        />
      )}

      {/* Pay Loan Modal */}
      {showPayModal && (
        <LoanPayModal
          loan={showPayModal}
          token={token}
          formatSRD={formatSRD}
          onClose={() => setShowPayModal(null)}
          onSave={() => { setShowPayModal(null); loadLoans(); }}
        />
      )}
    </div>
  );
}

function LoanCreateModal({ tenants, token, formatSRD, onClose, onSave }) {
  const [tenantId, setTenantId] = useState('');
  const [amount, setAmount] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const activeTenants = tenants.filter(t => t.status === 'active');

  const handleSave = async () => {
    if (!tenantId || !amount || !monthlyPayment) return alert('Vul alle verplichte velden in');
    if (parseFloat(amount) <= 0 || parseFloat(monthlyPayment) <= 0) return alert('Bedragen moeten groter dan 0 zijn');
    setSaving(true);
    try {
      await axios.post(`${API}/admin/loans`, {
        tenant_id: tenantId,
        amount: parseFloat(amount),
        monthly_payment: parseFloat(monthlyPayment),
        start_date: startDate,
        description,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onSave();
    } catch (err) { alert(err.response?.data?.detail || 'Fout bij aanmaken'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900" data-testid="loan-create-title">Nieuwe Lening</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Huurder *</label>
            <select
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
              data-testid="loan-tenant-select"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">Selecteer huurder...</option>
              {activeTenants.map(t => (
                <option key={t.tenant_id} value={t.tenant_id}>
                  {t.name} — {t.apartment_number}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Leningbedrag (SRD) *</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                data-testid="loan-amount-input"
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Maand. aflossing (SRD) *</label>
              <input
                type="number"
                value={monthlyPayment}
                onChange={e => setMonthlyPayment(e.target.value)}
                data-testid="loan-monthly-input"
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Startdatum</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              data-testid="loan-start-date"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Omschrijving</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              data-testid="loan-description"
              placeholder="Bijv. Voorschot verbouwing"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          {amount && monthlyPayment && parseFloat(monthlyPayment) > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              Geschatte looptijd: <strong>{Math.ceil(parseFloat(amount) / parseFloat(monthlyPayment))} maanden</strong>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Annuleren</button>
          <button
            onClick={handleSave}
            disabled={saving}
            data-testid="loan-save-btn"
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lening aanmaken'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoanPayModal({ loan, token, formatSRD, onClose, onSave }) {
  const [amount, setAmount] = useState(loan.monthly_payment?.toString() || '');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saving, setSaving] = useState(false);

  const handlePay = async () => {
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) return alert('Voer een geldig bedrag in');
    if (payAmount > loan.remaining) return alert(`Bedrag kan niet hoger zijn dan het openstaande saldo (${formatSRD(loan.remaining)})`);
    setSaving(true);
    try {
      await axios.post(`${API}/admin/loans/${loan.loan_id}/pay`, {
        amount: payAmount,
        description: description || 'Aflossing',
        payment_method: paymentMethod,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onSave();
    } catch (err) { alert(err.response?.data?.detail || 'Fout bij registreren'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900" data-testid="loan-pay-title">Aflossing — {loan.tenant_name}</h2>
          <p className="text-sm text-slate-500 mt-1">Openstaand: <span className="font-bold text-red-600">{formatSRD(loan.remaining)}</span></p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bedrag (SRD) *</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              data-testid="loan-pay-amount"
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setAmount(loan.monthly_payment?.toString())} className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 transition">
                Maandelijks ({formatSRD(loan.monthly_payment)})
              </button>
              <button onClick={() => setAmount(loan.remaining?.toString())} className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 transition">
                Volledig ({formatSRD(loan.remaining)})
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Betaalmethode</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              data-testid="loan-pay-method"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="cash">Contant</option>
              <option value="bank">Bank</option>
              <option value="pin">Pinpas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Omschrijving</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              data-testid="loan-pay-description"
              placeholder="Aflossing"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Annuleren</button>
          <button
            onClick={handlePay}
            disabled={saving}
            data-testid="loan-pay-submit"
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aflossing registreren'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoanDetailModal({ loan, formatSRD, onClose, onPay }) {
  const progress = loan.amount > 0 ? Math.min(100, (loan.total_paid / loan.amount) * 100) : 0;

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return d; }
  };
  const formatDateTime = (d) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900" data-testid="loan-detail-title">Lening — {loan.tenant_name}</h2>
            <p className="text-sm text-slate-500 mt-1">App. {loan.apartment_number} | Aangemaakt: {formatDate(loan.start_date)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${loan.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              {loan.status === 'active' ? 'Actief' : 'Afgelost'}
            </span>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition">
              <XCircle className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
        <div className="p-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Leningbedrag</p>
              <p className="text-lg font-bold text-slate-900">{formatSRD(loan.amount)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
              <p className="text-xs text-slate-500 mb-1">Afgelost</p>
              <p className="text-lg font-bold text-green-600">{formatSRD(loan.total_paid)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
              <p className="text-xs text-slate-500 mb-1">Openstaand</p>
              <p className="text-lg font-bold text-red-600">{formatSRD(loan.remaining)}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Voortgang</span>
              <span className="font-bold">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {loan.description && (
            <div className="bg-slate-50 rounded-lg p-3 mb-5 text-sm text-slate-600 border border-slate-200">
              <span className="font-medium">Omschrijving:</span> {loan.description}
            </div>
          )}

          <p className="text-sm font-semibold text-slate-700 mb-4">Maandelijkse aflossing: <span className="text-orange-600">{formatSRD(loan.monthly_payment)}</span></p>

          {/* Payment history */}
          <h3 className="text-sm font-bold text-slate-700 mb-3">Betaalgeschiedenis ({loan.payments?.length || 0})</h3>
          {(!loan.payments || loan.payments.length === 0) ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nog geen aflossingen geregistreerd</p>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Datum</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Bedrag</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Methode</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Resterend</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Omschrijving</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loan.payments.map(p => (
                    <tr key={p.payment_id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-600">{formatDateTime(p.created_at)}</td>
                      <td className="py-2 px-3 text-right font-medium text-green-600">{formatSRD(p.amount)}</td>
                      <td className="py-2 px-3 text-slate-500 capitalize">{p.payment_method}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{formatSRD(p.remaining_after)}</td>
                      <td className="py-2 px-3 text-slate-500">{p.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Sluiten</button>
          {loan.status === 'active' && (
            <button
              onClick={onPay}
              data-testid="loan-detail-pay-btn"
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
            >
              Aflossing registreren
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// ============== SUBSCRIPTION TAB ==============
function MessagesTab({ token }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const PAGE_SIZE = 50;

  const loadMessages = async (pageNum = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: PAGE_SIZE, skip: pageNum * PAGE_SIZE });
      if (filterType !== 'all') params.set('msg_type', filterType);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (searchQuery) params.set('search', searchQuery);
      const res = await axios.get(`${API}/admin/whatsapp/history?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data.messages || res.data);
      setTotal(res.data.total || 0);
      setPage(pageNum);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadMessages(0); }, [filterType, filterStatus]);

  const handleSearch = () => loadMessages(0);

  const handleTriggerDaily = async () => {
    if (!confirm('Wilt u nu handmatig huur-herinneringen en contract-waarschuwingen versturen naar alle huurders?')) return;
    setTriggerLoading(true);
    try {
      const res = await axios.post(`${API}/admin/daily-notifications`, {}, { headers: { Authorization: `Bearer ${token}` } });
      const d = res.data;
      alert(`Klaar! ${d.rent_reminders} huur-herinnering(en) en ${d.lease_warnings} contract-waarschuwing(en) verstuurd.`);
      loadMessages(0);
    } catch (err) {
      alert(err.response?.data?.detail || 'Fout bij versturen notificaties');
    }
    setTriggerLoading(false);
  };

  const handleClearMessages = async () => {
    if (!window.confirm('Weet u zeker dat u alle berichten wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
    setClearLoading(true);
    try {
      const res = await axios.delete(`${API}/admin/messages/clear`, { headers: { Authorization: `Bearer ${token}` } });
      alert(res.data.message);
      loadMessages(0);
    } catch (err) {
      alert(err.response?.data?.detail || 'Verschonen mislukt');
    }
    setClearLoading(false);
  };

  const typeLabels = {
    payment_confirmation: { label: 'Betaling', color: 'bg-green-100 text-green-700' },
    new_invoice: { label: 'Factuur', color: 'bg-blue-100 text-blue-700' },
    fine_applied: { label: 'Boete', color: 'bg-red-100 text-red-700' },
    overdue: { label: 'Achterstand', color: 'bg-orange-100 text-orange-700' },
    auto: { label: 'Automatisch', color: 'bg-slate-100 text-slate-600' },
    manual: { label: 'Handmatig', color: 'bg-purple-100 text-purple-700' },
    salary_paid: { label: 'Salaris', color: 'bg-indigo-100 text-indigo-700' },
    rent_updated: { label: 'Huurwijziging', color: 'bg-amber-100 text-amber-700' },
    lease_created: { label: 'Huurcontract', color: 'bg-cyan-100 text-cyan-700' },
    lease_expiring: { label: 'Contract verloopt', color: 'bg-rose-100 text-rose-700' },
    loan_created: { label: 'Lening', color: 'bg-indigo-100 text-indigo-700' },
    loan_payment: { label: 'Leningaflossing', color: 'bg-teal-100 text-teal-700' },
    shelly_on: { label: 'Stroom AAN', color: 'bg-emerald-100 text-emerald-700' },
    shelly_off: { label: 'Stroom UIT', color: 'bg-zinc-200 text-zinc-700' },
    rent_reminder: { label: 'Herinnering', color: 'bg-yellow-100 text-yellow-700' },
    rent_due_today: { label: 'Vervaldatum', color: 'bg-orange-100 text-orange-700' },
    rent_reminder_manual: { label: 'Herinnering (handmatig)', color: 'bg-violet-100 text-violet-700' },
  };

  const statusLabels = {
    sent: { label: 'Verzonden', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    failed: { label: 'Mislukt', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    pending: { label: 'Wachtend', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  };

  const filtered = messages;

  const formatDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  };

  const stats = {
    total: total,
    sent: messages.filter(m => m.status === 'sent').length,
    failed: messages.filter(m => m.status === 'failed').length,
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6" data-testid="messages-tab">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500">Totaal berichten</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              <p className="text-xs text-slate-500">Verzonden</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
              <p className="text-xs text-slate-500">Mislukt</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Zoek op huurder of telefoon..."
              data-testid="messages-search"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            data-testid="messages-filter-type"
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-orange-400"
          >
            <option value="all">Alle types</option>
            <option value="payment_confirmation">Betaling</option>
            <option value="new_invoice">Factuur</option>
            <option value="fine_applied">Boete</option>
            <option value="overdue">Achterstand</option>
            <option value="salary_paid">Salaris</option>
            <option value="rent_updated">Huurwijziging</option>
            <option value="lease_created">Huurcontract</option>
            <option value="lease_expiring">Contract verloopt</option>
            <option value="loan_created">Lening</option>
            <option value="loan_payment">Leningaflossing</option>
            <option value="shelly_on">Stroom AAN</option>
            <option value="shelly_off">Stroom UIT</option>
            <option value="rent_reminder">Herinnering</option>
            <option value="rent_due_today">Vervaldatum</option>
            <option value="rent_reminder_manual">Herinnering (handmatig)</option>
            <option value="manual">Handmatig</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            data-testid="messages-filter-status"
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-orange-400"
          >
            <option value="all">Alle statussen</option>
            <option value="sent">Verzonden</option>
            <option value="failed">Mislukt</option>
            <option value="pending">Wachtend</option>
          </select>
          <button
            onClick={() => loadMessages(0)}
            data-testid="messages-refresh"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition"
          >
            <Loader2 className="w-4 h-4" />
            Vernieuwen
          </button>
          <button
            onClick={handleTriggerDaily}
            disabled={triggerLoading}
            data-testid="messages-trigger-daily"
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {triggerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            Herinneringen versturen
          </button>
          <button
            onClick={handleClearMessages}
            disabled={clearLoading || messages.length === 0}
            data-testid="messages-clear"
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {clearLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Verschonen
          </button>
        </div>
      </div>

      {/* Messages list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Geen berichten gevonden</p>
            <p className="text-sm text-slate-400 mt-1">
              {messages.length === 0 ? 'WhatsApp berichten verschijnen hier zodra ze automatisch worden verstuurd' : 'Pas uw filters aan om berichten te zien'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((msg) => {
              const typeInfo = typeLabels[msg.message_type] || typeLabels.auto;
              const statusInfo = statusLabels[msg.status] || statusLabels.pending;
              const isExpanded = expandedId === msg.message_id;
              return (
                <div
                  key={msg.message_id}
                  data-testid={`message-row-${msg.message_id}`}
                  className="hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : msg.message_id)}
                >
                  <div className="px-5 py-4 flex items-center gap-4">
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusInfo.dot}`} />
                    {/* Tenant info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">{msg.tenant_name || 'Onbekend'}</span>
                        <span className="text-xs text-slate-400">{msg.phone}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(msg.created_at)}</p>
                    </div>
                    {/* Channel badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${msg.channel === 'twilio_whatsapp' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      {msg.channel === 'twilio_whatsapp' ? 'Twilio' : 'WhatsApp'}
                    </span>
                    {/* Type badge */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    {/* Status badge */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  {/* Expanded message content */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pl-12">
                      <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
                        {msg.message}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-5 py-3">
          <p className="text-sm text-slate-500">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} van {total} berichten
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => loadMessages(page - 1)}
              data-testid="messages-prev-page"
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Vorige
            </button>
            <button
              disabled={(page + 1) * PAGE_SIZE >= total}
              onClick={() => loadMessages(page + 1)}
              data-testid="messages-next-page"
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Volgende
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SmtpSettings({ company, token, onRefresh }) {
  const [smtpHost, setSmtpHost] = useState(company?.smtp_host || '');
  const [smtpPort, setSmtpPort] = useState(company?.smtp_port || 587);
  const [smtpEmail, setSmtpEmail] = useState(company?.smtp_email || '');
  const [smtpPassword, setSmtpPassword] = useState(company?.smtp_password || '');
  const [smtpEnabled, setSmtpEnabled] = useState(company?.smtp_enabled || false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        smtp_host: smtpHost, smtp_port: parseInt(smtpPort), smtp_email: smtpEmail,
        smtp_password: smtpPassword, smtp_enabled: smtpEnabled,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('SMTP instellingen opgeslagen');
      onRefresh();
    } catch (err) { toast.error('Opslaan mislukt'); }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await axios.post(`${API}/admin/email/test`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(res.data.message);
    } catch (err) { toast.error(err.response?.data?.detail || 'Test mislukt'); }
    setTesting(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
            <Mail className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Email SMTP</h3>
            <p className="text-xs text-slate-400">Notificaties ook via email versturen</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer" data-testid="smtp-toggle">
          <input type="checkbox" checked={smtpEnabled} onChange={e => setSmtpEnabled(e.target.checked)} className="sr-only peer" />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
        </label>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
            <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)}
              data-testid="smtp-host" placeholder="bijv. smtp.gmail.com, smtp.outlook.com"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Poort</label>
            <input type="number" value={smtpPort} onChange={e => setSmtpPort(e.target.value)}
              data-testid="smtp-port" placeholder="587"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Adres (afzender)</label>
            <input type="email" value={smtpEmail} onChange={e => setSmtpEmail(e.target.value)}
              data-testid="smtp-email" placeholder="info@uwbedrijf.com"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Wachtwoord / App Password</label>
            <input type="password" value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)}
              data-testid="smtp-password" placeholder="SMTP wachtwoord"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleSave} disabled={saving} data-testid="smtp-save"
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
          <button onClick={handleTest} disabled={testing || !smtpEnabled} data-testid="smtp-test"
            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-600 transition disabled:opacity-50">
            {testing ? 'Testen...' : 'Test Email Versturen'}
          </button>
        </div>
        <p className="text-xs text-slate-400">Werkt met alle email providers: Gmail, Outlook, Yahoo, eigen SMTP server, etc. Bij Gmail: gebruik een App Password.</p>
      </div>
    </div>
  );
}

function SubscriptionTab({ company, token }) {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    try {
      const r = await axios.get(`${API}/admin/subscription`, { headers: { Authorization: `Bearer ${token}` } });
      setSub(r.data);
    } catch { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  const formatSRD = (v) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'SRD', minimumFractionDigits: 2 }).format(v || 0);

  const handleInitiate = async (invoiceId, method) => {
    const labels = { mope: 'Mope', uni5pay: 'Uni5Pay', bank_transfer: 'Bankoverschrijving' };
    if (method === 'bank_transfer') {
      if (!window.confirm(`Betaling via ${labels[method]} starten?\n\nDe factuur krijgt status "Wacht op review" totdat de superadmin uw betaling bevestigt.`)) return;
      setBusy(`${invoiceId}:${method}`);
      try {
        const r = await axios.post(`${API}/admin/subscription/invoices/${invoiceId}/initiate-payment`,
          { method }, { headers: { Authorization: `Bearer ${token}` } });
        alert(r.data.message || 'Betaling gestart');
        await load();
      } catch (e) { alert('Mislukt: ' + (e.response?.data?.detail || e.message)); }
      setBusy(null);
      return;
    }

    // Real gateway checkout (Mope / Uni5Pay)
    setBusy(`${invoiceId}:${method}`);
    try {
      const endpoint = method === 'mope' ? 'mope-checkout' : 'uni5pay-checkout';
      const r = await axios.post(`${API}/admin/subscription/invoices/${invoiceId}/${endpoint}`, {},
        { headers: { Authorization: `Bearer ${token}` } });
      const { payment_url, payment_id, mock } = r.data;
      if (!payment_url) throw new Error('Geen betaal-URL ontvangen');

      // Open payment URL in new window
      window.open(payment_url, '_blank', 'noopener,noreferrer');

      // Poll status every 4s up to 5 min (or dismiss button)
      const statusEndpoint = method === 'mope' ? 'mope-status' : 'uni5pay-status';
      const maxPolls = 75; // ~5 min
      let polls = 0;
      const poll = async () => {
        polls++;
        try {
          const sr = await axios.get(`${API}/admin/subscription/invoices/${invoiceId}/${statusEndpoint}/${payment_id}`,
            { headers: { Authorization: `Bearer ${token}` } });
          if (sr.data.status === 'paid' || sr.data.invoice_status === 'paid') {
            alert(`✅ Betaling via ${labels[method]} succesvol ontvangen! Uw factuur is nu bijgewerkt.`);
            await load();
            setBusy(null);
            return;
          }
        } catch { /* skip */ }
        if (polls < maxPolls) {
          setTimeout(poll, 4000);
        } else {
          setBusy(null);
          if (window.confirm(`Wij hebben uw ${labels[method]} betaling nog niet gezien. Status opnieuw controleren?`)) {
            // Restart polling once
            polls = 0;
            setBusy(`${invoiceId}:${method}`);
            setTimeout(poll, 2000);
          } else {
            await load();
          }
        }
      };
      // Show info toast-ish alert, start polling
      if (mock) {
        alert(`Mock betaling gestart (betaling wordt NIET automatisch bevestigd met test-API). Sluit dit venster en wacht op bevestiging van superadmin, of activeer live API key.`);
        setBusy(null);
        await load();
      } else {
        // Start polling silently
        setTimeout(poll, 3000);
      }
    } catch (e) {
      alert('Checkout mislukt: ' + (e.response?.data?.detail || e.message));
      setBusy(null);
    }
  };

  const handleUploadProof = async (invoiceId, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Bestand te groot (max 5MB)'); return; }
    setBusy(`${invoiceId}:upload`);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await axios.post(`${API}/admin/subscription/invoices/${invoiceId}/upload-proof`,
        { payment_proof_url: dataUrl, notes: 'Betaalbewijs geüpload' },
        { headers: { Authorization: `Bearer ${token}` } });
      alert('Betaalbewijs succesvol geüpload. Superadmin zal uw betaling controleren.');
      await load();
    } catch (e) { alert('Upload mislukt: ' + (e.response?.data?.detail || e.message)); }
    setBusy(null);
  };

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><div className="text-slate-400">Laden...</div></div>;
  }
  if (!sub) {
    return <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Abonnement informatie kon niet worden geladen.</div>;
  }

  const isLifetime = sub.lifetime;
  const status = sub.subscription_status || 'trial';
  const statusMeta = {
    lifetime: { label: 'LIFETIME PRO', color: 'from-purple-500 to-purple-600', text: 'U heeft levenslang Pro toegang. Geen verdere betalingen nodig.' },
    active: { label: 'Pro Actief', color: 'from-green-500 to-green-600', text: 'Uw abonnement is actief. Dank voor uw betaling!' },
    trial: { label: `Proef · nog ${sub.days_left_trial ?? 0} dagen`, color: 'from-blue-500 to-blue-600', text: 'U bent in de 14-daagse proefperiode.' },
    overdue: { label: 'Achterstallig', color: 'from-red-500 to-red-600', text: 'Uw betaling is overschreden. Maak het openstaande bedrag over om uw abonnement te verlengen.' },
  }[status] || { label: status, color: 'from-slate-500 to-slate-600', text: '' };

  const bd = sub.bank_details || {};
  const pm = sub.payment_methods || { bank_transfer_enabled: true };
  const hasBank = bd.bank_name || bd.account_number;
  const invoices = sub.invoices || [];
  const openInvoices = invoices.filter(i => i.status !== 'paid');

  return (
    <div className="space-y-4">
      {/* Hero status card */}
      <div className={`rounded-2xl p-6 text-white bg-gradient-to-br ${statusMeta.color} shadow-lg`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-6 h-6" />
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">{statusMeta.label}</span>
            </div>
            <p className="text-sm opacity-90 max-w-md">{statusMeta.text}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80">Maandelijks</p>
            <p className="text-3xl font-extrabold">{isLifetime ? 'GRATIS' : formatSRD(sub.monthly_price)}</p>
            {!isLifetime && <p className="text-xs opacity-80">per maand</p>}
          </div>
        </div>
        {sub.trial_ends_at && !isLifetime && (
          <div className="mt-4 pt-4 border-t border-white/20 text-xs opacity-90">
            Proefperiode eindigt: {new Date(sub.trial_ends_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        )}
      </div>

      {/* Bank details */}
      {!isLifetime && pm.bank_transfer_enabled && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 mb-1">Bankgegevens voor betaling</h3>
          <p className="text-xs text-slate-500 mb-4">Maak het bedrag over via bankoverschrijving. Vermeld uw bedrijfsnaam als omschrijving.</p>
          {hasBank ? (
            <div className="space-y-2 text-sm bg-slate-50 rounded-lg p-4">
              {bd.bank_name && <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Bank</span><span className="font-semibold text-slate-900">{bd.bank_name}</span></div>}
              {bd.account_holder && <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Ten name van</span><span className="font-semibold text-slate-900">{bd.account_holder}</span></div>}
              {bd.account_number && <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Rekening</span><span className="font-mono font-semibold text-slate-900">{bd.account_number}</span></div>}
              {bd.swift && <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">SWIFT</span><span className="font-mono font-semibold text-slate-900">{bd.swift}</span></div>}
              <div className="flex justify-between"><span className="text-slate-500">Omschrijving</span><span className="font-semibold text-slate-900">{sub.name || company?.name}</span></div>
              {bd.reference_hint && <p className="text-xs text-slate-500 pt-2 border-t border-slate-200 mt-2">{bd.reference_hint}</p>}
            </div>
          ) : (
            <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4">
              De bankgegevens zijn nog niet ingesteld. Neem contact op met de beheerder van Facturatie.sr.
            </p>
          )}
        </div>
      )}

      {/* Alternative payment methods */}
      {!isLifetime && (pm.mope_enabled || pm.uni5pay_enabled) && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 mb-1">Alternatieve betaalmethoden</h3>
          <p className="text-xs text-slate-500 mb-4">U kunt ook via onderstaande mobiele betaaldiensten betalen.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pm.mope_enabled && (
              <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl p-4 text-white">
                <p className="font-bold text-lg">Mope</p>
                {pm.mope_merchant_name && <p className="text-xs opacity-90 mt-1">Merchant: {pm.mope_merchant_name}</p>}
                {pm.mope_merchant_id && <p className="text-xs font-mono opacity-90">ID: {pm.mope_merchant_id}</p>}
                {pm.mope_phone && <p className="text-xs opacity-90">Tel: {pm.mope_phone}</p>}
              </div>
            )}
            {pm.uni5pay_enabled && (
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
                <p className="font-bold text-lg">Uni5Pay</p>
                {pm.uni5pay_merchant_name && <p className="text-xs opacity-90 mt-1">Merchant: {pm.uni5pay_merchant_name}</p>}
                {pm.uni5pay_merchant_id && <p className="text-xs font-mono opacity-90">ID: {pm.uni5pay_merchant_id}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoices */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Uw facturen</h3>
            <p className="text-xs text-slate-500">{invoices.length} in totaal · {openInvoices.length} openstaand</p>
          </div>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Geen facturen beschikbaar.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {invoices.map(inv => {
              const statusLabel = { paid: 'Betaald', unpaid: 'Onbetaald', pending_review: 'Wacht op review' }[inv.status] || inv.status;
              const statusColor = {
                paid: 'bg-green-50 text-green-700 border-green-200',
                unpaid: inv.is_overdue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200',
                pending_review: 'bg-blue-50 text-blue-700 border-blue-200',
              }[inv.status] || 'bg-slate-50 text-slate-600 border-slate-200';
              const canPay = inv.status !== 'paid';
              return (
                <div key={inv.invoice_id} className="p-4" data-testid={`inv-row-${inv.invoice_id}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-bold text-slate-900">{inv.period}</p>
                      <p className="text-xs text-slate-500">Vervalt: {inv.due_date ? new Date(inv.due_date).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        {inv.paid_at && ` · Betaald: ${new Date(inv.paid_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-slate-900">{formatSRD(inv.amount)}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusColor}`}>
                        {statusLabel}{inv.is_overdue && ` (+${inv.days_overdue}d)`}
                      </span>
                    </div>
                  </div>
                  {inv.payment_method && (
                    <p className="text-xs text-slate-400 mt-2">Betaalmethode: <span className="font-semibold">{inv.payment_method}</span></p>
                  )}
                  {inv.payment_proof_url && (
                    <a href={inv.payment_proof_url} target="_blank" rel="noreferrer" className="inline-block text-xs text-indigo-600 hover:underline mt-1" data-testid={`proof-link-${inv.invoice_id}`}>
                      📎 Betaalbewijs bekijken
                    </a>
                  )}

                  {canPay && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pm.bank_transfer_enabled && (
                        <button
                          onClick={() => handleInitiate(inv.invoice_id, 'bank_transfer')}
                          disabled={busy !== null}
                          data-testid={`pay-bank-${inv.invoice_id}`}
                          className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-50"
                        >
                          🏦 Bank gestart
                        </button>
                      )}
                      {pm.mope_enabled && (
                        <button
                          onClick={() => handleInitiate(inv.invoice_id, 'mope')}
                          disabled={busy !== null}
                          data-testid={`pay-mope-${inv.invoice_id}`}
                          className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 text-white rounded-lg disabled:opacity-50"
                        >
                          Betaal via Mope
                        </button>
                      )}
                      {pm.uni5pay_enabled && (
                        <button
                          onClick={() => handleInitiate(inv.invoice_id, 'uni5pay')}
                          disabled={busy !== null}
                          data-testid={`pay-uni5pay-${inv.invoice_id}`}
                          className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 text-white rounded-lg disabled:opacity-50"
                        >
                          Betaal via Uni5Pay
                        </button>
                      )}
                      <label className="px-3 py-1.5 text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg cursor-pointer inline-flex items-center gap-1">
                        <input type="file" accept="image/*,application/pdf" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadProof(inv.invoice_id, f); e.target.value=''; }}
                          data-testid={`upload-proof-${inv.invoice_id}`}
                          disabled={busy !== null}
                        />
                        📎 Betaalbewijs uploaden
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-center text-slate-400 pt-2">
        Bedrijfs-ID: <span className="font-mono">{company?.company_id}</span>
      </p>
    </div>
  );
}



// ============== SHARED INPUT FIELD ==============
function SettingsInput({ label, value, onChange, placeholder, type = 'text', disabled = false }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 ${disabled ? 'bg-slate-50 text-slate-400' : ''}`}
      />
    </div>
  );
}

// ============== COMPANY DETAILS SECTION ==============
function CompanyDetailsSection({ company, token, onRefresh }) {
  const [name, setName] = useState(company?.name || '');
  const [email, setEmail] = useState(company?.email || '');
  const originalEmail = (company?.email || '').toLowerCase();
  const [telefoon, setTelefoon] = useState(company?.telefoon || '');
  const [adres, setAdres] = useState(company?.adres || '');
  const [stampName, setStampName] = useState(company?.stamp_company_name || '');
  const [stampAddress, setStampAddress] = useState(company?.stamp_address || '');
  const [stampPhone, setStampPhone] = useState(company?.stamp_phone || '');
  const [stampWhatsapp, setStampWhatsapp] = useState(company?.stamp_whatsapp || '');
  const [bankName, setBankName] = useState(company?.bank_name || '');
  const [bankAccountName, setBankAccountName] = useState(company?.bank_account_name || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(company?.bank_account_number || '');
  const [bankDescription, setBankDescription] = useState(company?.bank_description || '');
  const [saving, setSaving] = useState(false);

  // Auto-sync: wijzigingen in Algemeen → Stempel velden meenemen
  const updateName = (val) => {
    setName(val);
    if (!stampName || stampName === name) setStampName(val);
  };
  const updateTelefoon = (val) => {
    setTelefoon(val);
    if (!stampPhone || stampPhone === telefoon) setStampPhone(val);
  };
  const updateAdres = (val) => {
    setAdres(val);
    if (!stampAddress || stampAddress === adres) setStampAddress(val);
  };

  const handleSave = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const emailChanged = normalizedEmail && normalizedEmail !== originalEmail;
    if (emailChanged) {
      // Basic email sanity check
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        toast.error('Ongeldig e-mailadres');
        return;
      }
      const ok = window.confirm(
        `Weet u zeker dat u het login e-mailadres wilt wijzigen?\n\n` +
        `Van: ${originalEmail}\n` +
        `Naar: ${normalizedEmail}\n\n` +
        `U logt vanaf nu in met dit nieuwe adres. Uw wachtwoord blijft hetzelfde.`
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const res = await axios.put(`${API}/auth/settings`, {
        name: name.trim() || undefined,
        email: emailChanged ? normalizedEmail : undefined,
        telefoon: telefoon.trim() || undefined,
        adres: adres.trim() || undefined,
        stamp_company_name: stampName.trim() || undefined,
        stamp_address: stampAddress.trim() || undefined,
        stamp_phone: stampPhone.trim() || undefined,
        stamp_whatsapp: stampWhatsapp.trim() || undefined,
        bank_name: bankName.trim() || undefined,
        bank_account_name: bankAccountName.trim() || undefined,
        bank_account_number: bankAccountNumber.trim() || undefined,
        bank_description: bankDescription.trim() || undefined,
      }, { headers: { Authorization: `Bearer ${token}` } });
      // If company name changed, backend returns new token + company_id
      if (res.data.token && res.data.company_id) {
        localStorage.setItem('kiosk_token', res.data.token);
        toast.success(`Bedrijfsgegevens opgeslagen. URL bijgewerkt naar /vastgoed/${res.data.company_id}`);
        // Navigate to new URL after brief delay
        setTimeout(() => {
          window.location.href = `/vastgoed/admin`;
        }, 800);
        return;
      }
      if (emailChanged) {
        toast.success(`Login e-mail bijgewerkt naar ${normalizedEmail}`);
      } else {
        toast.success('Bedrijfsgegevens opgeslagen');
      }
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Opslaan mislukt');
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
      <div className="flex items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Bedrijfsgegevens</h3>
            <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Uw bedrijfsinformatie en contactgegevens</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          data-testid="company-details-save"
          className="flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 bg-orange-500 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold hover:bg-orange-600 disabled:opacity-50 flex-shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Opslaan
        </button>
      </div>

      <div className="space-y-5">
        {/* Basis informatie */}
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-3">Algemeen</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <SettingsInput label="Bedrijfsnaam" value={name} onChange={updateName} placeholder="Uw bedrijfsnaam" />
              {(() => {
                const slug = name.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/[\s]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                const currentSlug = company?.company_id;
                if (slug && slug !== currentSlug) {
                  return (
                    <p className="text-xs text-orange-600 mt-1" data-testid="url-preview">
                      URL wordt: <span className="font-mono font-bold">/vastgoed/{slug}</span>
                    </p>
                  );
                }
                return (
                  <p className="text-xs text-slate-400 mt-1">
                    Huidige URL: <span className="font-mono">/vastgoed/{currentSlug}</span>
                  </p>
                );
              })()}
            </div>
            <div>
              <SettingsInput label="Email (login)" value={email} onChange={setEmail} placeholder="naam@bedrijf.com" type="email" />
              <p className="text-xs text-slate-400 mt-1">Let op: u logt hierna in met dit adres.</p>
            </div>
            <SettingsInput label="Telefoonnummer" value={telefoon} onChange={updateTelefoon} placeholder="+597 ..." />
            <SettingsInput label="Adres" value={adres} onChange={updateAdres} placeholder="Straat, Stad" />
          </div>
        </div>

        {/* Kwitantie / Bon gegevens */}
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-700 mb-1">Kwitantie / Bon Gegevens</h4>
          <p className="text-xs text-slate-400 mb-3">Deze gegevens verschijnen op uw kwitanties en bonnen</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingsInput label="Bedrijfsnaam (op bon)" value={stampName} onChange={setStampName} placeholder="Naam op kwitantie" />
            <SettingsInput label="Adres (op bon)" value={stampAddress} onChange={setStampAddress} placeholder="Adres op kwitantie" />
            <SettingsInput label="Telefoon (op bon)" value={stampPhone} onChange={setStampPhone} placeholder="+597 ..." />
            <SettingsInput label="WhatsApp (op bon)" value={stampWhatsapp} onChange={setStampWhatsapp} placeholder="+597 ..." />
          </div>
        </div>

        {/* Bankgegevens */}
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-700 mb-1">Bankgegevens</h4>
          <p className="text-xs text-slate-400 mb-3">Voor betalingsinstructies aan huurders</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingsInput label="Bank" value={bankName} onChange={setBankName} placeholder="bijv. Hakrinbank, DSB" />
            <SettingsInput label="Rekeningnaam" value={bankAccountName} onChange={setBankAccountName} placeholder="T.n.v." />
            <SettingsInput label="Rekeningnummer" value={bankAccountNumber} onChange={setBankAccountNumber} placeholder="123456789" />
            <SettingsInput label="Omschrijving" value={bankDescription} onChange={setBankDescription} placeholder="bijv. Huur + appartementnr" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== DOMAIN SETTINGS ==============
function DomainSettings({ company, token, onRefresh }) {
  const [domain, setDomain] = useState(company?.custom_domain || '');
  const [landing, setLanding] = useState(company?.custom_domain_landing || 'kiosk');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const appDomain = window.location.hostname;

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/settings`, {
        custom_domain: domain.trim().toLowerCase(),
        custom_domain_landing: landing,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Domein instellingen opgeslagen');
      setVerifyResult(null);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Opslaan mislukt');
    }
    setSaving(false);
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await axios.post(`${API}/admin/domain/verify`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVerifyResult(res.data);
    } catch (err) {
      setVerifyResult({
        status: 'error',
        domain: domain,
        details: [err.response?.data?.detail || 'Verificatie mislukt']
      });
    }
    setVerifying(false);
  };

  const copyValue = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors = {
    active: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'Actief', icon: <Check className="w-4 h-4" /> },
    pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'In afwachting', icon: <Loader2 className="w-4 h-4" /> },
    misconfigured: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Fout in configuratie', icon: <AlertTriangle className="w-4 h-4" /> },
    not_found: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Domein niet gevonden', icon: <AlertTriangle className="w-4 h-4" /> },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Fout', icon: <AlertTriangle className="w-4 h-4" /> },
    unknown: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', label: 'Onbekend', icon: <Globe className="w-4 h-4" /> },
  };

  return (
    <div className="space-y-6">
      {/* Domein Instellen */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Globe className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Custom Domein</h2>
            <p className="text-sm text-slate-500">Koppel uw eigen domeinnaam aan uw kiosk</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Domain input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Domeinnaam</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="bijv. huur.uwbedrijf.com"
                data-testid="domain-input"
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                data-testid="domain-save"
                className="px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Opslaan'}
              </button>
            </div>
          </div>

          {/* Landing page selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Landingspagina</label>
            <p className="text-xs text-slate-400 mb-2">Waar komen bezoekers terecht via uw custom domein?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setLanding('kiosk')}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border-2 transition ${
                  landing === 'kiosk'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="font-bold mb-0.5">Kiosk Betaalpagina</div>
                <div className="text-xs opacity-70">Huurdersoverzicht met betaalopties</div>
              </button>
              <button
                onClick={() => setLanding('login')}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border-2 transition ${
                  landing === 'login'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="font-bold mb-0.5">Login Pagina</div>
                <div className="text-xs opacity-70">Wachtwoord / PIN verificatie</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DNS Instructies */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">DNS Configuratie</h2>
            <p className="text-sm text-slate-500">Voeg dit DNS record toe bij uw domeinprovider</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Type</p>
              <p className="font-bold text-slate-900">CNAME</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Naam / Host</p>
              <div className="flex items-center gap-2">
                <p className="font-mono font-bold text-slate-900">{domain ? domain.split('.')[0] : 'uw-subdomein'}</p>
                <button onClick={() => copyValue(domain ? domain.split('.')[0] : '')} className="text-slate-400 hover:text-indigo-500">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Waarde / Doel</p>
              <div className="flex items-center gap-2">
                <p className="font-mono font-bold text-indigo-600">{appDomain}</p>
                <button onClick={() => copyValue(appDomain)} className="text-slate-400 hover:text-indigo-500">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 space-y-1 mb-4">
          <p>1. Log in bij uw domeinprovider (bijv. GoDaddy, Namecheap, TransIP, Cloudflare)</p>
          <p>2. Ga naar DNS beheer voor uw domein</p>
          <p>3. Voeg een nieuw <strong>CNAME</strong> record toe met bovenstaande gegevens</p>
          <p>4. Wacht 5-30 minuten tot de DNS wijziging is doorgevoerd</p>
          <p>5. Klik hieronder op "Verifiëren" om te controleren of alles correct is ingesteld</p>
        </div>

        {/* Verify button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleVerify}
            disabled={verifying || !domain.trim()}
            data-testid="domain-verify"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 disabled:opacity-50 transition"
          >
            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Verifiëren
          </button>
          {!domain.trim() && (
            <p className="text-xs text-slate-400">Voer eerst een domeinnaam in</p>
          )}
        </div>

        {/* Verify result */}
        {verifyResult && (
          <div className={`mt-4 rounded-xl border p-4 ${statusColors[verifyResult.status]?.bg} ${statusColors[verifyResult.status]?.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={statusColors[verifyResult.status]?.text}>
                {statusColors[verifyResult.status]?.icon}
              </span>
              <p className={`font-bold text-sm ${statusColors[verifyResult.status]?.text}`}>
                {statusColors[verifyResult.status]?.label}: {verifyResult.domain}
              </p>
            </div>
            {verifyResult.details?.map((d, i) => (
              <p key={i} className={`text-xs ${statusColors[verifyResult.status]?.text} opacity-80`}>{d}</p>
            ))}
          </div>
        )}

        {/* SSL Certificate result */}
        {verifyResult?.ssl && (
          <div className={`mt-4 rounded-xl border p-4 ${
            verifyResult.ssl.status === 'valid' ? 'bg-green-50 border-green-200' :
            verifyResult.ssl.status === 'expiring' ? 'bg-yellow-50 border-yellow-200' :
            verifyResult.ssl.status === 'unavailable' || verifyResult.ssl.status === 'timeout' ? 'bg-slate-50 border-slate-200' :
            'bg-red-50 border-red-200'
          }`} data-testid="ssl-result">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                verifyResult.ssl.status === 'valid' ? 'bg-green-200' :
                verifyResult.ssl.status === 'expiring' ? 'bg-yellow-200' :
                verifyResult.ssl.status === 'unavailable' || verifyResult.ssl.status === 'timeout' ? 'bg-slate-200' :
                'bg-red-200'
              }`}>
                {verifyResult.ssl.status === 'valid' ? (
                  <svg className="w-3.5 h-3.5 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z"/></svg>
                ) : verifyResult.ssl.status === 'expiring' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-700" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                )}
              </div>
              <p className={`font-bold text-sm ${
                verifyResult.ssl.status === 'valid' ? 'text-green-700' :
                verifyResult.ssl.status === 'expiring' ? 'text-yellow-700' :
                verifyResult.ssl.status === 'unavailable' || verifyResult.ssl.status === 'timeout' ? 'text-slate-600' :
                'text-red-700'
              }`}>
                SSL Certificaat: {
                  verifyResult.ssl.status === 'valid' ? 'Geldig' :
                  verifyResult.ssl.status === 'expiring' ? 'Verloopt binnenkort' :
                  verifyResult.ssl.status === 'expired' ? 'Verlopen' :
                  verifyResult.ssl.status === 'invalid' ? 'Ongeldig' :
                  verifyResult.ssl.status === 'mismatch' ? 'Domein komt niet overeen' :
                  verifyResult.ssl.status === 'timeout' ? 'Niet bereikbaar' :
                  verifyResult.ssl.status === 'unavailable' ? 'Niet beschikbaar' :
                  'Fout'
                }
              </p>
            </div>
            {(Array.isArray(verifyResult.ssl.details) ? verifyResult.ssl.details : [verifyResult.ssl.details]).filter(Boolean).map((d, i) => (
              <p key={i} className={`text-xs opacity-80 ${
                verifyResult.ssl.status === 'valid' ? 'text-green-600' :
                verifyResult.ssl.status === 'expiring' ? 'text-yellow-600' :
                verifyResult.ssl.status === 'unavailable' || verifyResult.ssl.status === 'timeout' ? 'text-slate-500' :
                'text-red-600'
              }`}>{typeof d === 'string' ? d : JSON.stringify(d)}</p>
            ))}
          </div>
        )}
      </div>

      {/* Huidige status */}
      {company?.custom_domain && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Uw Custom URL</h2>
              <p className="text-sm text-slate-500">Deel deze link met uw huurders</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
            <p className="font-mono text-sm font-bold text-indigo-600">https://{company.custom_domain}</p>
            <button
              onClick={() => copyValue(`https://${company.custom_domain}`)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              Kopiëren
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Landingspagina: <strong>{company.custom_domain_landing === 'login' ? 'Login Pagina' : 'Kiosk Betaalpagina'}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

export default SettingsTab;
