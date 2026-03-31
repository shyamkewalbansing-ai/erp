import { useState, useEffect } from 'react';
import { 
  Users, CreditCard, Home, DollarSign, AlertTriangle, FileText, Wifi
} from 'lucide-react';

function DashboardTab({ dashboard, payments, leases, formatSRD }) {
  // Suriname time (UTC-3) — hooks must be before any conditional return
  const [srTime, setSrTime] = useState('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setSrTime(now.toLocaleString('nl-NL', {
        timeZone: 'America/Paramaribo',
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }));
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  if (!dashboard) return null;

  // Check expiring leases (within 30 days)
  const now = new Date();
  const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringLeases = (leases || []).filter(l => {
    if (l.status === 'terminated') return false;
    const end = new Date(l.end_date);
    return end >= now && end <= in30days;
  });
  const expiredLeases = (leases || []).filter(l => {
    if (l.status === 'terminated') return false;
    return new Date(l.end_date) < now;
  });

  const stats = [
    { icon: Home, label: 'Appartementen', value: dashboard.total_apartments },
    { icon: Users, label: 'Actieve Huurders', value: dashboard.total_tenants },
    { icon: DollarSign, label: 'Openstaande Huur', value: formatSRD(dashboard.total_outstanding) },
    { icon: FileText, label: 'Open Servicekosten', value: formatSRD(dashboard.total_service_costs) },
    { icon: AlertTriangle, label: 'Open Boetes', value: formatSRD(dashboard.total_fines) },
    { icon: Wifi, label: 'Open Internet', value: formatSRD(dashboard.total_internet || 0) },
    { icon: CreditCard, label: 'Ontvangen (maand)', value: formatSRD(dashboard.total_received_month) },
  ];

  const recentPayments = (payments || []).slice(0, 6);

  return (
    <div>
      {/* Lease warnings removed from dashboard - status shown in Huurovereenkomsten tab */}

      {/* Stat Cards */}
      <div className="bg-white rounded-xl border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Overzicht</h2>
          <span className="text-sm text-slate-500">{srTime}</span>
        </div>
        {/* Mobile: grid cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:hidden gap-px bg-slate-100">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="w-4 h-4 text-orange-500" />
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
              <p className="text-base font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
        {/* Desktop: table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50">
              <tr>
                {stats.map((stat, i) => (
                  <th key={i} className="p-4 text-sm font-medium text-slate-500 text-left whitespace-nowrap">{stat.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                {stats.map((stat, i) => (
                  <td key={i} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <stat.icon className="w-4 h-4 text-orange-500" />
                      </div>
                      <p className="text-lg font-bold text-slate-900 whitespace-nowrap">{stat.value}</p>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recente betalingen - zelfde tabel-stijl */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Recente betalingen</h2>
        </div>
        {recentPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Nog geen betalingen</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Huurder</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Appartement</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Type</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Bedrag</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Kwitantie</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p, i) => (
                  <tr key={p.payment_id || i} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">{p.tenant_name}</td>
                    <td className="p-4 text-slate-600">{p.apartment_number}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-xs font-semibold">
                        {p.payment_type === 'rent' ? 'Huur'
                          : p.payment_type === 'service' ? 'Service'
                          : p.payment_type === 'fine' ? 'Boetes'
                          : p.payment_type === 'partial_rent' ? 'Gedeeltelijke huur'
                          : p.payment_type === 'deposit' ? 'Borgsom'
                          : p.payment_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">{formatSRD(p.amount)}</td>
                    <td className="p-4 text-right text-sm text-slate-400 font-mono">{p.kwitantie_nummer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


export default DashboardTab;
