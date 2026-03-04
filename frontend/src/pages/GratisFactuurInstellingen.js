import React, { useState, useEffect } from 'react';
import { 
  Settings, Building2, Mail, CreditCard, Save, TestTube, Bell, Send
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { DashboardLayout } from './GratisFactuurDashboard';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('gratis_factuur_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export default function GratisFactuurInstellingen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState('bedrijf');
  
  const [formData, setFormData] = useState({
    bedrijfsnaam: '',
    adres: '',
    postcode: '',
    plaats: '',
    telefoon: '',
    email: '',
    kvk_nummer: '',
    btw_nummer: '',
    bank_naam: '',
    iban: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    auto_herinnering_enabled: false,
    auto_herinnering_dagen: 7
  });
  
  useEffect(() => {
    loadProfile();
  }, []);
  
  const loadProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/gratis-factuur/auth/me`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormData({
          bedrijfsnaam: data.bedrijfsnaam || '',
          adres: data.adres || '',
          postcode: data.postcode || '',
          plaats: data.plaats || '',
          telefoon: data.telefoon || '',
          email: data.email || '',
          kvk_nummer: data.kvk_nummer || '',
          btw_nummer: data.btw_nummer || '',
          bank_naam: data.bank_naam || '',
          iban: data.iban || '',
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || '',
          smtp_password: data.smtp_password || '',
          auto_herinnering_enabled: data.auto_herinnering_enabled || false,
          auto_herinnering_dagen: data.auto_herinnering_dagen || 7
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    setSaving(true);
    
    try {
      const response = await fetch(`${API_URL}/api/gratis-factuur/auth/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Fout bij opslaan');
      
      toast.success('Instellingen opgeslagen');
      
      // Update local storage
      const storedUser = JSON.parse(localStorage.getItem('gratis_factuur_user') || '{}');
      storedUser.bedrijfsnaam = formData.bedrijfsnaam;
      localStorage.setItem('gratis_factuur_user', JSON.stringify(storedUser));
      
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };
  
  const testEmailConfig = async () => {
    if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_password) {
      toast.error('Vul eerst alle SMTP gegevens in');
      return;
    }
    
    setTestingEmail(true);
    
    // First save the settings
    try {
      await fetch(`${API_URL}/api/gratis-factuur/auth/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      
      toast.success('SMTP instellingen opgeslagen. Test een factuur om te verifiëren.');
      
    } catch (error) {
      toast.error('Fout bij opslaan SMTP instellingen');
    } finally {
      setTestingEmail(false);
    }
  };
  
  const [sendingReminders, setSendingReminders] = useState(false);
  
  const sendAutoReminders = async () => {
    setSendingReminders(true);
    try {
      const response = await fetch(`${API_URL}/api/gratis-factuur/auto-herinneringen`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Fout bij versturen herinneringen');
    } finally {
      setSendingReminders(false);
    }
  };
  
  const tabs = [
    { id: 'bedrijf', label: 'Bedrijfsgegevens', icon: Building2 },
    { id: 'bank', label: 'Bankgegevens', icon: CreditCard },
    { id: 'email', label: 'Email (SMTP)', icon: Mail },
    { id: 'herinneringen', label: 'Herinneringen', icon: Bell },
  ];
  
  if (loading) {
    return (
      <DashboardLayout activeTab="instellingen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout activeTab="instellingen">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Instellingen</h1>
            <p className="text-slate-500">Beheer uw account en voorkeuren</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            {saving ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Opslaan
          </Button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {activeTab === 'bedrijf' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bedrijfsnaam</label>
                <Input
                  value={formData.bedrijfsnaam}
                  onChange={(e) => setFormData({...formData, bedrijfsnaam: e.target.value})}
                  placeholder="Uw bedrijfsnaam"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Adres</label>
                  <Input
                    value={formData.adres}
                    onChange={(e) => setFormData({...formData, adres: e.target.value})}
                    placeholder="Straatnaam en huisnummer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Postcode</label>
                  <Input
                    value={formData.postcode}
                    onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                    placeholder="Postcode"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Plaats</label>
                  <Input
                    value={formData.plaats}
                    onChange={(e) => setFormData({...formData, plaats: e.target.value})}
                    placeholder="Stad"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Telefoon</label>
                  <Input
                    value={formData.telefoon}
                    onChange={(e) => setFormData({...formData, telefoon: e.target.value})}
                    placeholder="Telefoonnummer"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">KvK Nummer</label>
                  <Input
                    value={formData.kvk_nummer}
                    onChange={(e) => setFormData({...formData, kvk_nummer: e.target.value})}
                    placeholder="KvK nummer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">BTW Nummer</label>
                  <Input
                    value={formData.btw_nummer}
                    onChange={(e) => setFormData({...formData, btw_nummer: e.target.value})}
                    placeholder="BTW nummer"
                  />
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'bank' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bank Naam</label>
                <Input
                  value={formData.bank_naam}
                  onChange={(e) => setFormData({...formData, bank_naam: e.target.value})}
                  placeholder="Naam van uw bank"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">IBAN / Rekeningnummer</label>
                <Input
                  value={formData.iban}
                  onChange={(e) => setFormData({...formData, iban: e.target.value})}
                  placeholder="IBAN of rekeningnummer"
                />
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Deze gegevens worden automatisch op uw facturen getoond, zodat klanten weten waar ze naar kunnen overmaken.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 rounded-lg mb-6">
                <p className="text-sm text-amber-800">
                  <strong>SMTP Server Configuratie</strong><br />
                  Configureer uw email server om facturen en herinneringen te kunnen versturen naar uw klanten.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SMTP Host</label>
                  <Input
                    value={formData.smtp_host}
                    onChange={(e) => setFormData({...formData, smtp_host: e.target.value})}
                    placeholder="bijv. smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SMTP Port</label>
                  <Input
                    type="number"
                    value={formData.smtp_port}
                    onChange={(e) => setFormData({...formData, smtp_port: parseInt(e.target.value) || 587})}
                    placeholder="587"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">SMTP Gebruikersnaam / Email</label>
                <Input
                  value={formData.smtp_user}
                  onChange={(e) => setFormData({...formData, smtp_user: e.target.value})}
                  placeholder="uw-email@voorbeeld.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">SMTP Wachtwoord / App Password</label>
                <Input
                  type="password"
                  value={formData.smtp_password}
                  onChange={(e) => setFormData({...formData, smtp_password: e.target.value})}
                  placeholder="••••••••••••"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={testEmailConfig}
                  disabled={testingEmail}
                  variant="outline"
                  className="border-teal-600 text-teal-600 hover:bg-teal-50"
                >
                  {testingEmail ? (
                    <div className="animate-spin w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full mr-2" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  Instellingen Opslaan
                </Button>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-2"><strong>Populaire SMTP servers:</strong></p>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li>• Gmail: smtp.gmail.com, port 587 (gebruik App Password)</li>
                  <li>• Outlook: smtp.office365.com, port 587</li>
                  <li>• Yahoo: smtp.mail.yahoo.com, port 587</li>
                </ul>
              </div>
            </div>
          )}
          
          {activeTab === 'herinneringen' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Automatische Betalingsherinneringen</strong><br />
                  Configureer automatische herinneringen voor verlopen facturen. Herinneringen worden verstuurd naar klanten met een email adres.
                </p>
              </div>
              
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">Automatische herinneringen</p>
                  <p className="text-sm text-slate-500">Verstuur automatisch herinneringen voor verlopen facturen</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_herinnering_enabled}
                    onChange={(e) => setFormData({...formData, auto_herinnering_enabled: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>
              
              {/* Days setting */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Verstuur herinnering na X dagen na vervaldatum
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    max="90"
                    value={formData.auto_herinnering_dagen}
                    onChange={(e) => setFormData({...formData, auto_herinnering_dagen: parseInt(e.target.value) || 7})}
                    className="w-24"
                  />
                  <span className="text-slate-500">dagen</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Bijvoorbeeld: bij 7 dagen wordt een herinnering verstuurd 7 dagen na de vervaldatum
                </p>
              </div>
              
              {/* Manual trigger */}
              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-3">Handmatig herinneringen versturen</p>
                <Button
                  onClick={sendAutoReminders}
                  disabled={sendingReminders || !formData.smtp_host}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {sendingReminders ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Nu herinneringen versturen
                </Button>
                <p className="text-xs text-slate-500 mt-2">
                  Dit verstuurt direct herinneringen naar alle klanten met verlopen facturen (ouder dan {formData.auto_herinnering_dagen} dagen)
                </p>
              </div>
              
              {!formData.smtp_host && (
                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Let op:</strong> Configureer eerst uw SMTP instellingen in het "Email (SMTP)" tabblad voordat u herinneringen kunt versturen.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
