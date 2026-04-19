import { useEffect, useState, useCallback } from 'react';
import { Bell, BellOff, Smartphone, Monitor, Trash2, Loader2, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import {
  isPushSupported,
  getNotificationPermission,
  getCurrentSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  listDevices,
  toggleDevice,
  deleteDevice,
  sendTestPush,
} from './pushClient';

function detectDeviceLabel(userAgent) {
  if (!userAgent) return 'Onbekend apparaat';
  const ua = userAgent.toLowerCase();
  let os = 'Desktop';
  if (/iphone|ipad|ipod/.test(ua)) os = 'iPhone/iPad';
  else if (/android/.test(ua)) os = 'Android';
  else if (/windows/.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/.test(ua)) os = 'Mac';
  else if (/linux/.test(ua)) os = 'Linux';
  let browser = '';
  if (/edg\//.test(ua)) browser = 'Edge';
  else if (/chrome/.test(ua)) browser = 'Chrome';
  else if (/firefox/.test(ua)) browser = 'Firefox';
  else if (/safari/.test(ua)) browser = 'Safari';
  return `${os}${browser ? ' · ' + browser : ''}`;
}

function PushNotificationsSettings({ token, currentUser }) {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState('default');
  const [thisDeviceSubscribed, setThisDeviceSubscribed] = useState(false);
  const [devices, setDevices] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const sup = isPushSupported();
      setSupported(sup);
      if (sup) {
        setPermission(await getNotificationPermission());
        const sub = await getCurrentSubscription();
        setThisDeviceSubscribed(!!sub);
      }
      const list = await listDevices(token);
      setDevices(list || []);
    } catch { /* noop */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleEnable = async () => {
    setBusy(true); setMsg(null);
    try {
      await subscribeToPush({
        token,
        subscriberType: currentUser?.type || 'company',
        subscriberId: currentUser?.id || null,
        subscriberName: currentUser?.name || '',
        deviceLabel: detectDeviceLabel(navigator.userAgent),
      });
      setMsg({ type: 'success', text: 'Dit apparaat ontvangt nu notificaties!' });
      await refresh();
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Abonneren mislukt' });
    }
    setBusy(false);
  };

  const handleDisableThisDevice = async () => {
    setBusy(true); setMsg(null);
    try {
      await unsubscribeFromPush(token);
      setMsg({ type: 'success', text: 'Dit apparaat ontvangt geen notificaties meer.' });
      await refresh();
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Uitschakelen mislukt' });
    }
    setBusy(false);
  };

  const handleToggle = async (sub) => {
    try {
      await toggleDevice(token, sub.subscription_id, !sub.enabled);
      await refresh();
    } catch { setMsg({ type: 'error', text: 'Wijzigen mislukt' }); }
  };

  const handleDelete = async (sub) => {
    if (!window.confirm(`Apparaat "${sub.device_label || 'onbekend'}" verwijderen?`)) return;
    try {
      await deleteDevice(token, sub.subscription_id);
      await refresh();
    } catch { setMsg({ type: 'error', text: 'Verwijderen mislukt' }); }
  };

  const handleTest = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await sendTestPush(token);
      setMsg({ type: 'success', text: `Test verstuurd naar ${r.sent} apparaat(en). Controleer uw meldingen!` });
    } catch { setMsg({ type: 'error', text: 'Test versturen mislukt' }); }
    setBusy(false);
  };

  if (!supported) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">Push notificaties niet ondersteund</h3>
            <p className="text-sm text-slate-600">Deze browser of apparaat ondersteunt geen Web Push notificaties. Gebruik een moderne browser zoals Chrome, Edge, Firefox of Safari (iOS 16.4+).</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="push-settings">
      {/* Status / Main action */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${thisDeviceSubscribed && permission === 'granted' ? 'bg-green-100' : 'bg-slate-100'}`}>
            {thisDeviceSubscribed && permission === 'granted'
              ? <Bell className="w-6 h-6 text-green-600" />
              : <BellOff className="w-6 h-6 text-slate-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-base">Push Notificaties op dit apparaat</h3>
            <p className="text-sm text-slate-500 mt-1">
              {thisDeviceSubscribed && permission === 'granted'
                ? 'Dit apparaat ontvangt meldingen voor nieuwe kwitanties, goedkeuringen en boetes — ook als de PWA gesloten is.'
                : 'Schakel meldingen in om direct een geluidssignaal te krijgen bij nieuwe Kiosk betalingen en goedkeuringen.'}
            </p>
            {permission === 'denied' && (
              <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-100 rounded-lg p-2">
                ⚠️ U heeft notificaties geblokkeerd in uw browserinstellingen. Sta toestemming toe in de adresbalk/instellingen om door te gaan.
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              {!thisDeviceSubscribed ? (
                <button onClick={handleEnable} disabled={busy || permission === 'denied'}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  data-testid="push-enable-btn">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                  Meldingen inschakelen
                </button>
              ) : (
                <>
                  <button onClick={handleTest} disabled={busy}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                    data-testid="push-test-btn">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Stuur test
                  </button>
                  <button onClick={handleDisableThisDevice} disabled={busy}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold disabled:opacity-50"
                    data-testid="push-disable-btn">
                    <BellOff className="w-4 h-4" /> Op dit apparaat uitschakelen
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {msg && (
          <div className={`mt-4 p-3 rounded-lg text-sm flex items-start gap-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <span>{msg.text}</span>
          </div>
        )}
      </div>

      {/* Device list */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Geregistreerde apparaten</h3>
            <p className="text-xs text-slate-500">Alle apparaten die notificaties ontvangen voor dit bedrijf</p>
          </div>
          <span className="text-xs text-slate-400">{devices.length}</span>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : devices.length === 0 ? (
          <div className="p-10 text-center">
            <Smartphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nog geen apparaten geregistreerd.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {devices.map(d => {
              const Icon = /iphone|android|ipad/i.test(d.device_label || '') ? Smartphone : Monitor;
              return (
                <div key={d.subscription_id} className="p-4 flex items-center gap-3" data-testid={`push-device-${d.subscription_id}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${d.enabled ? 'bg-green-100' : 'bg-slate-100'}`}>
                    <Icon className={`w-5 h-5 ${d.enabled ? 'text-green-600' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">
                      {d.device_label || 'Onbekend apparaat'}
                      {d.subscriber_name && <span className="text-xs text-slate-400 font-normal"> · {d.subscriber_name}</span>}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      Geregistreerd: {d.created_at ? new Date(d.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={!!d.enabled}
                      onChange={() => handleToggle(d)}
                      data-testid={`push-device-toggle-${d.subscription_id}`}
                    />
                    <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-green-500 transition relative">
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${d.enabled ? 'translate-x-5' : 'translate-x-0.5'}`}></span>
                    </div>
                  </label>
                  <button onClick={() => handleDelete(d)} className="text-slate-400 hover:text-red-500 p-1.5" title="Verwijderen">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1">
        <p><b>Welke meldingen komen binnen?</b></p>
        <ul className="list-disc ml-5 space-y-0.5">
          <li>Nieuwe Kiosk betaling door Beheerder (direct goedgekeurd)</li>
          <li>Nieuwe kwitantie wacht op goedkeuring (door Boekhouder/Kiosk Medewerker)</li>
          <li>Kwitantie goedgekeurd door Beheerder</li>
          <li>Boetes toegepast voor achterstallige huur</li>
        </ul>
        <p className="mt-2 text-slate-500">Tip: installeer de PWA op uw telefoon of desktop voor meldingen — ook als de app gesloten is.</p>
      </div>
    </div>
  );
}

export default PushNotificationsSettings;
