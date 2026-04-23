import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Globe, Plus, Trash2, RefreshCw, Check, X, Copy, Terminal,
  AlertCircle, Loader2, Server, ShieldCheck, Sparkles, FileSearch
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/kiosk`;

export default function DomainsTab({ token }) {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [commands, setCommands] = useState(null);
  const [verifyResults, setVerifyResults] = useState({}); // { domain: {dns, ssl} }
  const [verifyingDomain, setVerifyingDomain] = useState(null);
  const [showAnalyzer, setShowAnalyzer] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const loadDomains = async () => {
    try {
      const res = await axios.get(`${API}/superadmin/domains`, { headers });
      setDomains(res.data);
    } catch {
      toast.error('Kon domeinen niet laden');
    }
    setLoading(false);
  };

  useEffect(() => { loadDomains(); }, []);

  const handleRemove = async (companyId, domain) => {
    if (!window.confirm(`Domein "${domain}" ontkoppelen van dit bedrijf?`)) return;
    try {
      await axios.delete(`${API}/superadmin/domains/${companyId}`, { headers });
      toast.success('Domein ontkoppeld');
      loadDomains();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ontkoppelen mislukt');
    }
  };

  const handleVerify = async (domain) => {
    setVerifyingDomain(domain);
    try {
      const res = await axios.get(`${API}/superadmin/domains/verify`, {
        headers, params: { domain }
      });
      setVerifyResults(prev => ({ ...prev, [domain]: res.data }));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verificatie mislukt');
    }
    setVerifyingDomain(null);
  };

  const handleGenerateCommands = async (extraDomain = '') => {
    try {
      const extras = extraDomain ? [extraDomain] : [];
      const res = await axios.post(`${API}/superadmin/domains/generate-commands`, {
        main_domain: 'facturatie.sr',
        include_www: true,
        additional_domains: extras,
        email: 'admin@facturatie.sr',
        backend_port: 8001,
        frontend_port: 3000
      }, { headers });
      setCommands(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Genereren mislukt');
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} gekopieerd`);
  };

  const statusBadge = (status) => {
    const cfg = {
      ok: { color: 'bg-green-50 text-green-700 border-green-200', icon: Check },
      valid: { color: 'bg-green-50 text-green-700 border-green-200', icon: ShieldCheck },
      pending: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Loader2 },
      expiring: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertCircle },
      mismatch: { color: 'bg-red-50 text-red-700 border-red-200', icon: X },
      expired: { color: 'bg-red-50 text-red-700 border-red-200', icon: X },
      not_found: { color: 'bg-red-50 text-red-700 border-red-200', icon: X },
      timeout: { color: 'bg-slate-50 text-slate-600 border-slate-200', icon: AlertCircle },
      unavailable: { color: 'bg-slate-50 text-slate-600 border-slate-200', icon: AlertCircle },
      error: { color: 'bg-red-50 text-red-700 border-red-200', icon: X },
      unknown: { color: 'bg-slate-50 text-slate-500 border-slate-200', icon: AlertCircle },
    }[status] || { color: 'bg-slate-50 text-slate-500 border-slate-200', icon: AlertCircle };
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${cfg.color}`}>
        <Icon className="w-3 h-3" /> {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" /> Custom Domeinen
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Beheer subdomeinen per bedrijf + genereer nginx/certbot commando's</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadDomains}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg"
            data-testid="refresh-domains-btn"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold"
            data-testid="open-domain-wizard"
          >
            <Plus className="w-4 h-4" /> Nieuw Domein
          </button>
          <button
            onClick={() => handleGenerateCommands()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold"
            data-testid="regen-all-commands-btn"
            title="Genereer nginx/certbot commando's voor ALLE huidige domeinen"
          >
            <Terminal className="w-4 h-4" /> Commando's
          </button>
          <button
            onClick={() => setShowAnalyzer(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold"
            data-testid="open-config-analyzer"
            title="Plak je huidige nginx config en zie exact wat je moet wijzigen"
          >
            <FileSearch className="w-4 h-4" /> Config Analyzer
          </button>
        </div>
      </div>

      {/* Domains list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300 mx-auto" /></div>
        ) : domains.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Globe className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p>Nog geen custom domeinen gekoppeld</p>
            <button
              onClick={() => setShowWizard(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-indigo-500 hover:underline text-sm"
            >
              <Plus className="w-4 h-4" /> Voeg eerste domein toe
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {domains.map(d => {
              const v = verifyResults[d.custom_domain];
              return (
                <div key={d.company_id + d.custom_domain} className="p-4 flex items-center gap-4 hover:bg-slate-50" data-testid={`domain-row-${d.company_id}`}>
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-bold text-slate-900 truncate">{d.custom_domain}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="font-semibold">{d.name}</span>
                      <span className="text-slate-400"> · {d.company_id}</span>
                      <span className="text-slate-400"> · landing: {d.custom_domain_landing || 'kiosk'}</span>
                    </p>
                    {v && (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-slate-400">DNS:</span>
                        {statusBadge(v.dns.status)}
                        <span className="text-[10px] text-slate-400">SSL:</span>
                        {statusBadge(v.ssl.status)}
                        {v.ip && <span className="text-[10px] text-slate-500 font-mono">→ {v.ip}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleVerify(d.custom_domain)}
                      disabled={verifyingDomain === d.custom_domain}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-xs font-semibold text-slate-600 disabled:opacity-50"
                      data-testid={`verify-domain-${d.company_id}`}
                    >
                      {verifyingDomain === d.custom_domain ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Verifieer'}
                    </button>
                    <button
                      onClick={() => handleRemove(d.company_id, d.custom_domain)}
                      className="p-1.5 rounded-md text-red-500 hover:bg-red-50"
                      data-testid={`remove-domain-${d.company_id}`}
                      title="Domein ontkoppelen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Wizard modal */}
      {showWizard && (
        <DomainWizard
          token={token}
          onClose={() => { setShowWizard(false); loadDomains(); }}
          onGeneratedCommands={(c) => { setCommands(c); setShowWizard(false); loadDomains(); }}
        />
      )}

      {/* Commands modal */}
      {commands && (
        <CommandsModal
          commands={commands}
          onClose={() => setCommands(null)}
          onCopy={copyToClipboard}
        />
      )}

      {/* Config Analyzer modal */}
      {showAnalyzer && (
        <ConfigAnalyzerModal
          token={token}
          onClose={() => setShowAnalyzer(false)}
          onCopy={copyToClipboard}
        />
      )}
    </div>
  );
}


// ============== WIZARD ==============
function DomainWizard({ token, onClose, onGeneratedCommands }) {
  const [step, setStep] = useState(1);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [domain, setDomain] = useState('');
  const [landing, setLanding] = useState('kiosk');
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API}/superadmin/companies-without-domain`, { headers })
      .then(r => setCompanies(r.data))
      .catch(() => toast.error('Kon bedrijven niet laden'));
  }, []);

  const handleAssign = async () => {
    if (!selectedCompany) { toast.error('Kies een bedrijf'); return; }
    if (!domain.trim()) { toast.error('Voer een domein in'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/superadmin/domains/assign`, {
        company_id: selectedCompany,
        custom_domain: domain.trim().toLowerCase(),
        landing
      }, { headers });
      toast.success('Domein gekoppeld');
      // Generate commands including this new domain
      const res = await axios.post(`${API}/superadmin/domains/generate-commands`, {
        main_domain: 'facturatie.sr',
        include_www: true,
        additional_domains: [],
        email: 'admin@facturatie.sr',
        backend_port: 8001,
        frontend_port: 3000
      }, { headers });
      onGeneratedCommands(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Koppelen mislukt');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Custom Domein Wizard</h3>
              <p className="text-xs text-slate-500">Koppel een subdomein aan een bedrijf</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className={step === 1 ? 'font-bold text-indigo-600' : ''}>1. Bedrijf</span>
            <span>›</span>
            <span className={step === 2 ? 'font-bold text-indigo-600' : ''}>2. Domein</span>
            <span>›</span>
            <span className={step === 3 ? 'font-bold text-indigo-600' : ''}>3. Koppelen</span>
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Kies bedrijf</label>
              <select
                value={selectedCompany}
                onChange={e => setSelectedCompany(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                data-testid="wizard-company-select"
              >
                <option value="">— Selecteer —</option>
                {companies.map(c => (
                  <option key={c.company_id} value={c.company_id}>{c.name} ({c.company_id})</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">Alleen bedrijven zonder huidig custom domein verschijnen hier.</p>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium">Annuleren</button>
                <button
                  onClick={() => selectedCompany && setStep(2)}
                  disabled={!selectedCompany}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  data-testid="wizard-step1-next"
                >Volgende →</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Subdomein</label>
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="bv. dadovastgoed.kewalbansing.net"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-400"
                data-testid="wizard-domain-input"
              />
              <p className="text-[11px] text-slate-400">Alleen de hostnaam — geen https:// of paden.</p>

              <label className="block text-sm font-semibold text-slate-700 mt-4">Landing pagina</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: 'kiosk', label: 'Kiosk Terminal', desc: 'Huurders betalen direct' },
                  { v: 'login', label: 'Admin Login', desc: 'Beheerder login pagina' },
                ].map(o => (
                  <button
                    key={o.v}
                    onClick={() => setLanding(o.v)}
                    className={`p-3 rounded-lg border-2 text-left transition ${landing === o.v ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                    data-testid={`wizard-landing-${o.v}`}
                  >
                    <p className="text-sm font-bold text-slate-900">{o.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{o.desc}</p>
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium">← Terug</button>
                <button
                  onClick={() => domain.trim() && setStep(3)}
                  disabled={!domain.trim()}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  data-testid="wizard-step2-next"
                >Volgende →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm space-y-1">
                <p className="text-slate-700"><span className="font-bold">Bedrijf:</span> {companies.find(c => c.company_id === selectedCompany)?.name}</p>
                <p className="text-slate-700"><span className="font-bold">Domein:</span> <span className="font-mono">{domain}</span></p>
                <p className="text-slate-700"><span className="font-bold">Landing:</span> {landing === 'kiosk' ? 'Kiosk Terminal' : 'Admin Login'}</p>
              </div>
              <p className="text-[11px] text-slate-500">Na koppelen worden nginx + certbot commando's automatisch gegenereerd zodat je ze op je productieserver kunt uitvoeren.</p>

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(2)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium">← Terug</button>
                <button
                  onClick={handleAssign}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                  data-testid="wizard-finalize"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Koppel & genereer commando's
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ============== COMMANDS MODAL ==============
function CommandsModal({ commands, onClose, onCopy }) {
  const [activeStep, setActiveStep] = useState(3);  // default to certbot step

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-3xl h-[calc(100dvh-env(safe-area-inset-top,0px))] sm:h-auto sm:max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
              <Terminal className="w-5 h-5 text-green-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900">Productie Commando's</h3>
              <p className="text-xs text-slate-500 truncate">{commands.all_domains.length} domeinen op {commands.main_domain}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="border-b border-slate-100 flex gap-0 overflow-x-auto flex-shrink-0" style={{scrollbarWidth: 'none'}}>
          {commands.steps.map(s => (
            <button
              key={s.step}
              onClick={() => setActiveStep(s.step)}
              className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition ${activeStep === s.step ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              data-testid={`commands-step-${s.step}`}
            >
              {s.step}. {s.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {commands.steps.filter(s => s.step === activeStep).map(s => (
            <div key={s.step} className="space-y-3">
              <p className="text-sm text-slate-600">{s.description}</p>

              {/* Step 2: also show nginx block */}
              {s.step === 2 && (
                <CodeBlock
                  label="Nginx server block"
                  code={commands.nginx_block}
                  onCopy={() => onCopy(commands.nginx_block, 'Nginx block')}
                  testid="copy-nginx-block"
                />
              )}

              {/* Commands list */}
              {s.commands.map((cmd, i) => (
                <CodeBlock
                  key={i}
                  label={s.step === 2 && i === 0 ? 'Schrijf config (heredoc)' : `Commando ${i + 1}`}
                  code={cmd}
                  onCopy={() => onCopy(cmd, 'Commando')}
                  testid={`copy-cmd-${s.step}-${i}`}
                />
              ))}

              {/* Step 1: DNS instructions */}
              {s.step === 1 && commands.dns_instructions.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> DNS-records toevoegen bij je DNS provider
                  </p>
                  {commands.dns_instructions.map((d, i) => (
                    <div key={i} className="bg-white rounded border border-amber-100 p-2">
                      <p className="text-xs font-bold text-slate-900 font-mono mb-1">{d.domain}</p>
                      <p className="text-[10px] text-slate-500 mb-2">Voor: {d.company}</p>
                      {d.records.map((r, j) => (
                        <div key={j} className="text-[11px] text-slate-600 py-0.5">
                          <span className="inline-block w-14 font-bold text-slate-500">{r.type}</span>
                          <span className="font-mono">{r.host}</span>
                          <span className="text-slate-400 mx-1">→</span>
                          <span className="font-mono text-indigo-600">{r.value}</span>
                          <span className="text-[9px] text-slate-400 ml-2">(TTL: {r.ttl})</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Server className="w-3.5 h-3.5" />
            <span>Voer deze commando's uit op je productieserver</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold"
            data-testid="commands-close"
          >Sluiten</button>
        </div>
      </div>
    </div>
  );
}


function CodeBlock({ label, code, onCopy, testid }) {
  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
        <button
          onClick={onCopy}
          data-testid={testid}
          className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-green-400 rounded text-[10px] font-bold"
        >
          <Copy className="w-3 h-3" /> Kopieer
        </button>
      </div>
      <pre className="p-3 text-[11px] text-green-400 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">{code}</pre>
    </div>
  );
}


// ============== CONFIG ANALYZER MODAL ==============
function ConfigAnalyzerModal({ token, onClose, onCopy }) {
  const [configText, setConfigText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const handleAnalyze = async () => {
    if (!configText.trim()) { toast.error('Plak eerst je nginx config'); return; }
    setAnalyzing(true);
    try {
      const res = await axios.post(`${API}/superadmin/domains/analyze-nginx-config`, {
        config_text: configText,
        main_domain: 'facturatie.sr'
      }, { headers });
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Analyse mislukt');
    }
    setAnalyzing(false);
  };

  const renderDiffLine = (line, idx) => {
    let cls = 'text-slate-400';
    if (line.startsWith('+++') || line.startsWith('---')) cls = 'text-slate-500 font-bold';
    else if (line.startsWith('@@')) cls = 'text-indigo-400 font-bold';
    else if (line.startsWith('+')) cls = 'text-green-400 bg-green-500/10';
    else if (line.startsWith('-')) cls = 'text-red-400 bg-red-500/10';
    return <div key={idx} className={`${cls} font-mono text-[11px] px-2 whitespace-pre`}>{line || ' '}</div>;
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-4xl h-[calc(100dvh-env(safe-area-inset-top,0px))] sm:h-auto sm:max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
              <FileSearch className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900">Nginx Config Analyzer</h3>
              <p className="text-xs text-slate-500 truncate">Plak je huidige nginx config → zie exact wat je moet wijzigen</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {!result && (
            <>
              {/* Instructies */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1">
                <p className="font-bold text-amber-900">📋 Hoe werkt dit?</p>
                <ol className="list-decimal list-inside space-y-0.5 text-amber-800">
                  <li>SSH naar je productieserver</li>
                  <li>Kopieer je huidige config: <code className="bg-amber-100 px-1 rounded font-mono">cat /etc/nginx/sites-enabled/facturatie.conf</code></li>
                  <li>Plak hieronder → klik "Analyseer"</li>
                  <li>De app toont exact welke <code className="bg-amber-100 px-1 rounded font-mono">server_name</code> regels je moet wijzigen</li>
                </ol>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Plak je nginx config hier</label>
                <textarea
                  value={configText}
                  onChange={e => setConfigText(e.target.value)}
                  rows={14}
                  placeholder={`server {\n    listen 80;\n    server_name facturatie.sr www.facturatie.sr;\n    ...\n}\n\nserver {\n    listen 443 ssl;\n    server_name facturatie.sr www.facturatie.sr;\n    ssl_certificate ...\n}`}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-400"
                  data-testid="config-analyzer-textarea"
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzing || !configText.trim()}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="run-analyzer-btn"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
                {analyzing ? 'Analyseren...' : 'Analyseer config'}
              </button>
            </>
          )}

          {result && (
            <>
              {/* Status overview */}
              <div className={`rounded-lg p-3 border ${result.all_domains_covered ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {result.all_domains_covered
                    ? <><Check className="w-4 h-4 text-green-600" /><p className="text-sm font-bold text-green-800">Alles in orde!</p></>
                    : <><AlertCircle className="w-4 h-4 text-red-600" /><p className="text-sm font-bold text-red-800">{result.missing_domains.length} domein(en) ontbreken</p></>
                  }
                </div>
                <p className="text-xs text-slate-600">
                  {result.blocks_found} server block(s) gevonden · Vereiste domeinen: {result.required_domains.length}
                </p>
                {result.missing_domains.length > 0 && (
                  <p className="text-xs text-red-700 mt-1 font-mono">Ontbrekend: {result.missing_domains.join(', ')}</p>
                )}
              </div>

              {/* Per block analysis */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Server blocks</h4>
                <div className="space-y-2">
                  {result.analysis.map((b, i) => (
                    <div key={i} className={`rounded-lg p-3 border text-xs ${b.ok ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900">{b.label} — regel {b.start_line}-{b.end_line}</span>
                        {b.ok
                          ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">OK</span>
                          : <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">AANPASSEN</span>
                        }
                      </div>
                      <p className="text-slate-500">Huidig: <span className="font-mono text-slate-700">{b.current_server_names.join(' ')}</span></p>
                      {b.missing.length > 0 && (
                        <p className="text-red-600 mt-0.5">Toe te voegen: <span className="font-mono">{b.missing.join(' ')}</span></p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Changes — inline diff */}
              {result.changes.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Wijzigingen ({result.changes.length})</h4>
                  <div className="space-y-2">
                    {result.changes.map((c, i) => (
                      <div key={i} className="bg-slate-900 rounded-lg overflow-hidden">
                        <div className="px-3 py-1.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-semibold">{c.block_label} · regel {c.block_start_line}</span>
                        </div>
                        <div className="p-2 font-mono text-[11px] leading-relaxed">
                          <div className="text-red-400 bg-red-500/10 px-2 py-0.5">- {c.old}</div>
                          <div className="text-green-400 bg-green-500/10 px-2 py-0.5">+ {c.new}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full unified diff */}
              {result.diff && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Volledige diff</h4>
                  <div className="bg-slate-900 rounded-lg overflow-hidden">
                    <div className="px-3 py-1.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">unified diff</span>
                      <button
                        onClick={() => onCopy(result.diff, 'Diff')}
                        className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-green-400 rounded text-[10px] font-bold"
                      >
                        <Copy className="w-3 h-3" /> Kopieer
                      </button>
                    </div>
                    <div className="py-2 overflow-x-auto max-h-64">
                      {result.diff.split('\n').map((l, i) => renderDiffLine(l, i))}
                    </div>
                  </div>
                </div>
              )}

              {/* New config full */}
              {result.changes.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nieuwe volledige config</h4>
                  <CodeBlock
                    label="Vervang je hele facturatie.conf met dit"
                    code={result.new_config}
                    onCopy={() => onCopy(result.new_config, 'Nieuwe config')}
                    testid="copy-new-config"
                  />
                </div>
              )}

              {/* Next steps */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs space-y-2">
                <p className="font-bold text-indigo-900">🚀 Vervolgstappen op productie</p>
                <CodeBlock
                  label="1. Test + reload"
                  code={result.reload_command}
                  onCopy={() => onCopy(result.reload_command, 'Reload commando')}
                  testid="copy-reload-cmd"
                />
                {!result.all_domains_covered && (
                  <CodeBlock
                    label="2. Certificaat opnieuw installeren (indien nodig)"
                    code={result.install_cert_command}
                    onCopy={() => onCopy(result.install_cert_command, 'Install commando')}
                    testid="copy-install-cmd"
                  />
                )}
              </div>

              <button
                onClick={() => { setResult(null); setConfigText(''); }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium"
                data-testid="analyze-again-btn"
              >
                ↺ Nieuwe analyse
              </button>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-end flex-shrink-0 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold"
            data-testid="analyzer-close"
          >Sluiten</button>
        </div>
      </div>
    </div>
  );
}
