import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, GripVertical, Building2 } from 'lucide-react';
import { API, axios, formatAmount } from './utils';

function ApartmentsTab({ apartments, tenants, formatSRD, onAdd, onEdit, onDelete, token, onRefresh }) {
  const [aptSearch, setAptSearch] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const sortedApartments = [...apartments].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  const filteredApartments = sortedApartments.filter(apt => {
    if (!aptSearch) return true;
    const q = aptSearch.toLowerCase();
    const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
    return apt.number?.toLowerCase().includes(q) ||
      apt.description?.toLowerCase().includes(q) ||
      tenant?.name?.toLowerCase().includes(q);
  });

  const handleDragStart = (idx) => { setDragIndex(idx); };
  const handleDragOver = (e, idx) => { e.preventDefault(); setOverIndex(idx); };
  const handleDragEnd = () => { setDragIndex(null); setOverIndex(null); };
  const handleDrop = async (dropIdx) => {
    if (dragIndex === null || dragIndex === dropIdx) { setDragIndex(null); setOverIndex(null); return; }
    const reordered = [...filteredApartments];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIdx, 0, moved);
    const order = reordered.map((a, i) => ({ apartment_id: a.apartment_id, sort_order: i }));
    setDragIndex(null); setOverIndex(null);
    try {
      await axios.put(`${API}/admin/apartments/reorder`, { order }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err) { console.error(err); }
  };

  // Group income per currency (since appartementen verschillende valuta's kunnen hebben)
  const incomeByCurrency = filteredApartments.reduce((acc, apt) => {
    const cur = (apt.currency || 'SRD').toUpperCase();
    acc[cur] = (acc[cur] || 0) + (apt.monthly_rent || 0);
    return acc;
  }, {});
  const incomeEntries = Object.entries(incomeByCurrency).filter(([, v]) => v > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center gap-2 sm:gap-4">
        <div className="flex-1 min-w-[140px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={aptSearch}
            onChange={(e) => setAptSearch(e.target.value)}
            placeholder="Zoek..."
            data-testid="apartment-search-input"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="text-right px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg" data-testid="total-income">
          <p className="text-[10px] text-green-600">Totale maandinkomen</p>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 justify-end">
            {incomeEntries.length === 0 ? (
              <p className="text-sm sm:text-lg font-bold text-green-700">SRD 0,00</p>
            ) : incomeEntries.map(([cur, total]) => (
              <p key={cur} className="text-sm sm:text-lg font-bold text-green-700">{formatAmount(total, cur)}</p>
            ))}
          </div>
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap">{filteredApartments.length} appt.</span>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nieuw Appartement</span>
          <span className="sm:hidden">Nieuw</span>
        </button>
      </div>
      {/* Desktop table */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full min-w-[600px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-10 p-4"></th>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Nummer</th>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Locatie</th>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Omschrijving</th>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Huurder</th>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Huur</th>
              <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
              <th className="text-right p-4 text-sm font-medium text-slate-500">Acties</th>
            </tr>
          </thead>
          <tbody>
            {filteredApartments.map((apt, idx) => {
              const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
              return (
                <tr
                  key={apt.apartment_id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDrop={() => handleDrop(idx)}
                  className={`border-t border-slate-100 transition-all ${
                    dragIndex === idx ? 'opacity-40 bg-orange-50' :
                    overIndex === idx ? 'border-t-2 border-t-orange-400' : ''
                  }`}
                  style={{ cursor: 'grab' }}
                >
                  <td className="p-2 text-center text-slate-300 hover:text-slate-500">
                    <GripVertical className="w-4 h-4 mx-auto" />
                  </td>
                  <td className="p-4 font-bold text-slate-900">{apt.number}</td>
                  <td className="p-4 text-slate-500">{apt.location_name || <span className="text-slate-300">—</span>}</td>
                  <td className="p-4 text-slate-500">{apt.description || '-'}</td>
                  <td className="p-4">{tenant?.name || <span className="text-slate-400">-</span>}</td>
                  <td className="p-4">{formatAmount(apt.monthly_rent, apt.currency)}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      apt.status === 'occupied' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {apt.status === 'occupied' ? 'Bezet' : 'Beschikbaar'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onEdit(apt)} className="text-slate-400 hover:text-orange-500 p-1">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(apt.apartment_id)} className="text-slate-400 hover:text-red-500 p-1" data-testid={`delete-apt-${apt.apartment_id}`}>
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
      <div className="md:hidden divide-y divide-slate-100 overflow-hidden">
        {filteredApartments.map((apt) => {
          const tenant = tenants.find(t => t.apartment_id === apt.apartment_id && t.status === 'active');
          const isOccupied = apt.status === 'occupied';
          return (
            <div key={apt.apartment_id} className="p-3 flex items-center gap-3 min-w-0">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isOccupied ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'}`}>
                <Building2 className={`w-5 h-5 ${isOccupied ? 'text-red-500' : 'text-green-600'}`} />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 mb-0.5 min-w-0">
                  <span className="font-bold text-slate-900 text-sm truncate flex-1 min-w-0">{apt.number}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${isOccupied ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {isOccupied ? 'Bezet' : 'Vrij'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 truncate">{tenant?.name || <span className="text-slate-400">Beschikbaar</span>}</p>
                {apt.location_name && <p className="text-[11px] text-violet-500 font-semibold truncate">{apt.location_name}</p>}
                {apt.description && <p className="text-[11px] text-slate-400 truncate">{apt.description}</p>}
                <p className="text-sm font-bold text-orange-600 truncate">{formatAmount(apt.monthly_rent, apt.currency)}</p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button onClick={() => onEdit(apt)} className="text-slate-400 hover:text-orange-500 p-2"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => onDelete(apt.apartment_id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


export default ApartmentsTab;
