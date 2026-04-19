import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

// Convert a URL-safe base64 string to a Uint8Array (required by PushManager.subscribe)
function urlB64ToUint8Array(b64) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  const res = await Notification.requestPermission();
  return res;
}

async function getSwRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    try {
      reg = await navigator.serviceWorker.register('/service-worker.js');
    } catch (e) {
      return null;
    }
  }
  await navigator.serviceWorker.ready;
  return reg;
}

export async function getCurrentSubscription() {
  const reg = await getSwRegistration();
  if (!reg) return null;
  return await reg.pushManager.getSubscription();
}

export async function subscribeToPush({ token, subscriberType = 'company', subscriberId = null, subscriberName = '', deviceLabel = '' }) {
  if (!isPushSupported()) throw new Error('Push notifications niet ondersteund door deze browser');

  const reg = await getSwRegistration();
  if (!reg) throw new Error('Service worker niet beschikbaar');

  // Permission
  if (Notification.permission !== 'granted') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') throw new Error('Notificatie toestemming geweigerd');
  }

  // Existing subscription?
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { data } = await axios.get(`${API}/public/push/vapid-public-key`);
    const appServerKey = urlB64ToUint8Array(data.public_key);
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey,
    });
  }

  const body = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
      auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    },
    subscriber_type: subscriberType,
    subscriber_id: subscriberId,
    subscriber_name: subscriberName,
    device_label: deviceLabel,
    user_agent: navigator.userAgent,
  };

  const res = await axios.post(`${API}/admin/push/subscribe`, body, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}

export async function unsubscribeFromPush(token) {
  const reg = await getSwRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    try {
      await axios.post(`${API}/admin/push/unsubscribe`, { endpoint: sub.endpoint }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) { /* noop */ }
    try { await sub.unsubscribe(); } catch (e) { /* noop */ }
  }
}

export async function listDevices(token) {
  const { data } = await axios.get(`${API}/admin/push/subscriptions`, { headers: { Authorization: `Bearer ${token}` } });
  return data;
}

export async function toggleDevice(token, subscriptionId, enabled) {
  await axios.patch(`${API}/admin/push/subscriptions/${subscriptionId}`, { enabled }, { headers: { Authorization: `Bearer ${token}` } });
}

export async function deleteDevice(token, subscriptionId) {
  await axios.delete(`${API}/admin/push/subscriptions/${subscriptionId}`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function sendTestPush(token) {
  const { data } = await axios.post(`${API}/admin/push/test`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return data;
}
