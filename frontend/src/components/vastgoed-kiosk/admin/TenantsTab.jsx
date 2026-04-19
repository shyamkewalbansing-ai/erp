import { useState } from 'react';
import { 
  Users, CreditCard, Plus, Pencil, Trash2, DollarSign, Search, 
  FileText, Mail, Eye, XCircle, CheckCircle
} from 'lucide-react';
import { API, axios, formatSRD } from './utils';
import LeaseModal from './LeaseModal';

function TenantsTab({ tenants, apartments, leases, formatSRD, getInitials, onAddTenant, onEditTenant, onAddRent, onRefresh, token }) {
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantsSubTab, setTenantsSubTab] = useState('huurders');
  const [actionModal, setActionModal] = useState(null); // { type: 'whatsapp'|'email', tenant, total }
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const activeTenants = tenants.filter(t => {
    if (t.status !== 'active') return false;
    if (!tenantSearch) return true;
    const q = tenantSearch.toLowerCase();
    return t.name?.toLowerCase().includes(q) ||
      t.apartment_number?.toLowerCase().includes(q) ||
      t.tenant_code?.toLowerCase().includes(q);
  });
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (tenant) => {
    if (!window.confirm(`Weet u zeker dat u "${tenant.name}" wilt verwijderen?`)) return;
    setDeleting(tenant.tenant_id);
    try {
      await axios.put(`${API}/admin/tenants/${tenant.tenant_id}`, { status: 'inactive' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } catch {
      alert('Verwijderen mislukt');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteLease = async (leaseId) => {
    if (!window.confirm('Weet u zeker dat u deze huurovereenkomst wilt verwijderen?')) return;
    try {
      await axios.delete(`${API}/admin/leases/${leaseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } catch {
      alert('Verwijderen mislukt');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab selector */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
        <button
          onClick={() => setTenantsSubTab('huurders')}
          data-testid="tenants-subtab-huurders"
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${tenantsSubTab === 'huurders' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Users className="w-4 h-4" /> Huurders
        </button>
        <button
          onClick={() => setTenantsSubTab('contracten')}
          data-testid="tenants-subtab-contracten"
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${tenantsSubTab === 'contracten' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Huurovereenkomsten</span><span className="sm:hidden">Contracten</span>
        </button>
        <button
          onClick={() => setTenantsSubTab('idkaart')}
          data-testid="tenants-subtab-idkaart"
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${tenantsSubTab === 'idkaart' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <CreditCard className="w-4 h-4" /> ID Kaart
        </button>
      </div>

      {tenantsSubTab === 'contracten' ? (
        <LeasesTab leases={leases} tenants={tenants} apartments={apartments} formatSRD={formatSRD} onRefresh={onRefresh} token={token} />
      ) : tenantsSubTab === 'idkaart' ? (
        <IdCardTab tenants={tenants} token={token} onRefresh={onRefresh} />
      ) : (
      <>
      {/* Huurders tabel */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex-1 min-w-[140px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
              placeholder="Zoek..."
              data-testid="tenant-search-input"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap">{activeTenants.length} huurder{activeTenants.length !== 1 ? 's' : ''}</span>
          <button
            onClick={onAddTenant}
            data-testid="add-tenant-button"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nieuwe Huurder</span>
            <span className="sm:hidden">Nieuw</span>
          </button>
        </div>
        {activeTenants.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">Nog geen huurders</p>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Huurder</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Appartement</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Huurmaand</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500 whitespace-nowrap">Huur</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500 whitespace-nowrap">Service</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500 whitespace-nowrap">Boetes</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500 whitespace-nowrap">Internet</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500 whitespace-nowrap">Totaal</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
                </tr>
              </thead>
              <tbody>
                {activeTenants.map(tenant => {
                  const rent = tenant.outstanding_rent || 0;
                  const service = tenant.service_costs || 0;
                  const fines = tenant.fines || 0;
                  const internet = tenant.internet_outstanding || tenant.internet_cost || 0;
                  const total = rent + service + fines + internet;
                  const hasArrears = rent > (tenant.monthly_rent || 0);

                  // Format billed month
                  const billedMonth = tenant.rent_billed_through || '';
                  let billedLabel = '';
                  if (billedMonth) {
                    const [y, m] = billedMonth.split('-');
                    const d = new Date(parseInt(y), parseInt(m) - 1);
                    billedLabel = d.toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' });
                  }

                  // Overdue months from API
                  const overdueMonths = tenant.overdue_months || [];

                  return (
                    <tr key={tenant.tenant_id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`tenant-row-${tenant.tenant_id}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {getInitials(tenant.name)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 whitespace-nowrap">{tenant.name}</p>
                            <p className="text-xs text-slate-400">{tenant.tenant_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">{tenant.apartment_number}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                          t/m {billedLabel}
                        </span>
                        {overdueMonths.length > 0 && (
                          <div className="mt-1">
                            <span className="text-[11px] text-red-500 font-medium">
                              Achterstand: {overdueMonths.join(', ')}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className={`p-4 text-right font-bold whitespace-nowrap ${rent > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        {formatSRD(rent)}
                      </td>
                      <td className={`p-4 text-right font-bold whitespace-nowrap ${service > 0 ? 'text-orange-600' : 'text-slate-800'}`}>
                        {formatSRD(service)}
                      </td>
                      <td className={`p-4 text-right font-bold whitespace-nowrap ${fines > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        {formatSRD(fines)}
                      </td>
                      <td className={`p-4 text-right font-bold whitespace-nowrap ${internet > 0 ? 'text-slate-900' : 'text-slate-800'}`}>
                        {internet > 0 ? formatSRD(internet) : '-'}
                        {tenant.internet_plan_name && <p className="text-[10px] text-slate-400 mt-0.5">{tenant.internet_plan_name}</p>}
                      </td>
                      <td className={`p-4 text-right font-black whitespace-nowrap ${total > 0 ? 'text-orange-600' : 'text-slate-800'}`}>
                        {formatSRD(total)}
                      </td>
                      <td className="p-4">
                        {hasArrears ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">Achterstand</span>
                        ) : total === 0 ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">Betaald</span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">Open</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => onAddRent(tenant)} data-testid={`add-rent-${tenant.tenant_id}`} className="text-slate-400 hover:text-orange-500 p-1" title="Maandhuur toevoegen">
                            <DollarSign className="w-4 h-4" />
                          </button>
                          {total > 0 && (
                            <button 
                              onClick={() => setActionModal({ type: 'whatsapp', tenant, total })}
                              data-testid={`wa-send-${tenant.tenant_id}`} 
                              className="text-slate-400 hover:text-green-500 p-1" 
                              title="WhatsApp herinnering sturen"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </button>
                          )}
                          {total > 0 && tenant.email && (
                            <button 
                              onClick={() => setActionModal({ type: 'email', tenant, total })}
                              data-testid={`email-send-${tenant.tenant_id}`} 
                              className="text-slate-400 hover:text-orange-500 p-1" 
                              title={`Email herinnering sturen naar ${tenant.email}`}
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => onEditTenant(tenant)} data-testid={`edit-tenant-${tenant.tenant_id}`} className="text-slate-400 hover:text-orange-500 p-1" title="Bewerken">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(tenant)} data-testid={`delete-tenant-${tenant.tenant_id}`} disabled={deleting === tenant.tenant_id} className="text-slate-400 hover:text-red-500 p-1 disabled:opacity-50" title="Verwijderen">
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
          {/* Mobile card layout */}
          <div className="md:hidden divide-y divide-slate-100">
            {activeTenants.map(tenant => {
              const rent = tenant.outstanding_rent || 0;
              const service = tenant.service_costs || 0;
              const fines = tenant.fines || 0;
              const internet = tenant.internet_outstanding || tenant.internet_cost || 0;
              const total = rent + service + fines + internet;
              const hasArrears = rent > (tenant.monthly_rent || 0);
              const overdueMonths = tenant.overdue_months || [];
              const billedMonth = tenant.rent_billed_through || '';
              let billedLabel = '';
              if (billedMonth) {
                const [y, m] = billedMonth.split('-');
                const d = new Date(parseInt(y), parseInt(m) - 1);
                billedLabel = d.toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' });
              }
              return (
                <div key={tenant.tenant_id} className="p-4" data-testid={`tenant-card-${tenant.tenant_id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {getInitials(tenant.name)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{tenant.name}</p>
                        <p className="text-xs text-slate-400">{tenant.apartment_number} · {tenant.tenant_code}</p>
                      </div>
                    </div>
                    {hasArrears ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600">Achterstand</span>
                    ) : total === 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-600">Betaald</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-600">Open</span>
                    )}
                  </div>
                  {overdueMonths.length > 0 && (
                    <p className="text-[11px] text-red-500 font-medium mb-2">Achterstand: {overdueMonths.join(', ')}</p>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                    <div className="flex justify-between"><span className="text-slate-400">Huur</span><span className={rent > 0 ? 'font-bold text-red-600' : 'text-slate-600'}>{formatSRD(rent)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Service</span><span className={service > 0 ? 'font-bold text-orange-600' : 'text-slate-600'}>{formatSRD(service)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Boetes</span><span className={fines > 0 ? 'font-bold text-red-600' : 'text-slate-600'}>{formatSRD(fines)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Internet</span><span className="text-slate-600">{internet > 0 ? formatSRD(internet) : '-'}</span></div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div>
                      <span className="text-xs text-slate-400">Totaal: </span>
                      <span className={`text-sm font-black ${total > 0 ? 'text-orange-600' : 'text-slate-800'}`}>{formatSRD(total)}</span>
                      {billedLabel && <span className="text-[10px] text-slate-400 ml-2">t/m {billedLabel}</span>}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => onAddRent(tenant)} className="text-slate-400 hover:text-orange-500 p-1.5"><DollarSign className="w-4 h-4" /></button>
                      {total > 0 && <button onClick={() => setActionModal({ type: 'whatsapp', tenant, total })} className="text-slate-400 hover:text-green-500 p-1.5"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></button>}
                      <button onClick={() => onEditTenant(tenant)} className="text-slate-400 hover:text-orange-500 p-1.5"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(tenant)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>
      </>
      )}

      {/* Action Modal - WhatsApp / Email herinnering */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { if (!actionLoading) { setActionModal(null); setActionResult(null); } }}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            {actionResult ? (
              <div className="text-center">
                <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${actionResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                  {actionResult.success ? <CheckCircle className="w-7 h-7 text-green-600" /> : <XCircle className="w-7 h-7 text-red-600" />}
                </div>
                <h3 className={`text-lg font-bold mb-2 ${actionResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {actionResult.success ? 'Verstuurd!' : 'Mislukt'}
                </h3>
                <p className="text-sm text-slate-600 mb-4">{actionResult.message}</p>
                <button onClick={() => { setActionModal(null); setActionResult(null); }} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium">
                  Sluiten
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${actionModal.type === 'whatsapp' ? 'bg-green-100' : 'bg-orange-100'}`}>
                    {actionModal.type === 'whatsapp' ? (
                      <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    ) : (
                      <Mail className="w-6 h-6 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {actionModal.type === 'whatsapp' ? 'WhatsApp Herinnering' : 'Email Herinnering'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {actionModal.type === 'whatsapp' ? 'Stuur een herinneringsbericht via WhatsApp' : `Stuur naar ${actionModal.tenant.email}`}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-slate-600"><span className="font-bold">Huurder:</span> {actionModal.tenant.name}</p>
                  <p className="text-sm text-slate-600"><span className="font-bold">Appartement:</span> {actionModal.tenant.apartment_number}</p>
                  <p className="text-sm text-slate-600"><span className="font-bold">Openstaand:</span> <span className="font-bold text-red-600">{formatSRD(actionModal.total)}</span></p>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => { setActionModal(null); setActionResult(null); }} 
                    disabled={actionLoading}
                    className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        if (actionModal.type === 'whatsapp') {
                          const res = await axios.post(`${API}/admin/whatsapp/send`, { tenant_id: actionModal.tenant.tenant_id, message_type: 'overdue' }, { headers: { Authorization: `Bearer ${token}` } });
                          setActionResult({ success: true, message: res.data.message || 'WhatsApp herinnering verstuurd' });
                        } else {
                          const t = actionModal.tenant;
                          const msg = `Beste ${t.name},\n\nU heeft een openstaand saldo van SRD ${actionModal.total.toFixed(2)}.\n\nVriendelijk verzoek dit zo spoedig mogelijk te voldoen.`;
                          const res = await axios.post(`${API}/admin/email/send?tenant_id=${t.tenant_id}&subject=Huurherinnering&message=${encodeURIComponent(msg)}`, {}, { headers: { Authorization: `Bearer ${token}` } });
                          setActionResult({ success: true, message: res.data.message || 'Email herinnering verstuurd' });
                        }
                      } catch (err) {
                        const detail = err.response?.data?.detail || (actionModal.type === 'whatsapp' ? 'Configureer WhatsApp in Instellingen.' : 'Configureer SMTP in Instellingen.');
                        setActionResult({ success: false, message: detail });
                      }
                      setActionLoading(false);
                    }}
                    disabled={actionLoading}
                    className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 ${actionModal.type === 'whatsapp' ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'}`}
                  >
                    {actionLoading ? 'Versturen...' : 'Versturen'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
// ============== ID KAART TAB ==============
function IdCardTab({ tenants, token, onRefresh }) {
  const activeTenants = tenants.filter(t => t.status === 'active');
  const registered = activeTenants.filter(t => t.id_card_number);
  const notRegistered = activeTenants.filter(t => !t.id_card_number);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 mb-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
          <CheckCircle className="w-3.5 h-3.5" /> {registered.length} Geregistreerd
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
          <XCircle className="w-3.5 h-3.5" /> {notRegistered.length} Niet geregistreerd
        </span>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Huurder</th>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Appartement</th>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Kaartnummer</th>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Naam op kaart</th>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Geboortedatum</th>
              <th className="text-center p-4 text-sm font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {activeTenants.map(t => (
              <tr key={t.tenant_id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`idcard-row-${t.tenant_id}`}>
                <td className="p-4 font-bold text-slate-900">{t.name}</td>
                <td className="p-4 text-slate-600">{t.apartment_number}</td>
                <td className="p-4 font-mono text-sm text-slate-700">{t.id_card_number || '-'}</td>
                <td className="p-4 text-slate-700">{t.id_card_name || '-'}</td>
                <td className="p-4 text-slate-700">{t.id_card_dob || '-'}</td>
                <td className="p-4 text-center">
                  {t.id_card_number ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3" /> Geregistreerd
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600">
                      <XCircle className="w-3 h-3" /> Niet geregistreerd
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">ID kaart registratie gaat via Huurder bewerken (Huurders tab) of bij het aanmaken van een nieuwe huurder.</p>
    </div>
  );
}

function LeasesTab({ leases, tenants, apartments, formatSRD, onRefresh, token }) {
  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const [editingLease, setEditingLease] = useState(null);
  const activeTenants = tenants.filter(t => t.status === 'active');

  const openLeaseDoc = async (leaseId) => {
    window.open(`${API}/admin/leases/${leaseId}/document?token=${token}`, '_blank');
  };

  const handleDeleteLease = async (leaseId) => {
    if (!window.confirm('Huurovereenkomst verwijderen?')) return;
    try {
      await axios.delete(`${API}/admin/leases/${leaseId}`, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err) { alert('Verwijderen mislukt'); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-semibold text-slate-900">Huurovereenkomsten ({(leases || []).length})</h2>
          <button
            onClick={() => { setEditingLease(null); setShowLeaseModal(true); }}
            data-testid="add-lease-button"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
          >
            <Plus className="w-4 h-4" />
            Nieuwe Overeenkomst
          </button>
        </div>
        {(leases || []).length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">Nog geen huurovereenkomsten</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Huurder</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Appartement</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Startdatum</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Einddatum</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Maandhuur</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
                </tr>
              </thead>
              <tbody>
                {(leases || []).slice().sort((a, b) => (a.tenant_name || '').localeCompare(b.tenant_name || '')).map(lease => {
                  const isExpired = new Date(lease.end_date) < new Date();
                  const status = lease.status === 'terminated' ? 'terminated' : isExpired ? 'expired' : 'active';
                  return (
                    <tr key={lease.lease_id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`lease-row-${lease.lease_id}`}>
                      <td className="p-4 font-bold text-slate-900">{lease.tenant_name}</td>
                      <td className="p-4 text-slate-600">{lease.apartment_number}</td>
                      <td className="p-4 text-slate-600">{lease.start_date}</td>
                      <td className="p-4 text-slate-600">{lease.end_date}</td>
                      <td className="p-4 text-right font-bold text-slate-900">{formatSRD(lease.monthly_rent)}</td>
                      <td className="p-4">
                        {status === 'active' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">Actief</span>
                        ) : status === 'expired' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">Verlopen</span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Beëindigd</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openLeaseDoc(lease.lease_id)} data-testid={`lease-doc-${lease.lease_id}`} className="text-slate-400 hover:text-orange-500 p-1" title="Document genereren">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingLease(lease); setShowLeaseModal(true); }} data-testid={`lease-edit-${lease.lease_id}`} className="text-slate-400 hover:text-orange-500 p-1" title="Bewerken">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteLease(lease.lease_id)} data-testid={`lease-delete-${lease.lease_id}`} className="text-slate-400 hover:text-red-500 p-1" title="Verwijderen">
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

      {showLeaseModal && (
        <LeaseModal
          lease={editingLease}
          tenants={activeTenants}
          apartments={apartments}
          onClose={() => { setShowLeaseModal(false); setEditingLease(null); }}
          onSave={() => { setShowLeaseModal(false); setEditingLease(null); onRefresh(); }}
          token={token}
        />
      )}
    </div>
  );
}


export default TenantsTab;
