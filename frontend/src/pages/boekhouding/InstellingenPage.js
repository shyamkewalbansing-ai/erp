import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings, Building2, User, Globe, Bell, Shield, Database } from 'lucide-react';

export default function InstellingenPage() {
  const { user } = useAuth();

  const sections = [
    { icon: Building2, title: 'Bedrijfsgegevens', description: 'Naam, adres, BTW-nummer' },
    { icon: User, title: 'Gebruikers & Rollen', description: 'Toegangsbeheer' },
    { icon: Globe, title: 'Valuta & Koersen', description: 'Standaard valuta instellingen' },
    { icon: Bell, title: 'Notificaties', description: 'Email herinneringen' },
    { icon: Shield, title: 'Beveiliging', description: 'Wachtwoord en 2FA' },
    { icon: Database, title: 'Data & Backup', description: 'Export en backup' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Instellingen</h1>
        <p className="text-gray-500">Configureer uw boekhouding</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{s.title}</p>
                  <p className="text-sm text-gray-500">{s.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Huidige Gebruiker</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Naam</span>
            <span className="font-medium">{user?.name || '-'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Email</span>
            <span className="font-medium">{user?.email || '-'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Bedrijf</span>
            <span className="font-medium">{user?.company_name || '-'}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Rol</span>
            <span className="font-medium">{user?.role || '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
