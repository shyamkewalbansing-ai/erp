import { useState, useEffect, memo, useCallback, lazy, Suspense } from 'react';
import api from '../lib/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../components/ui/tabs';
import { 
  Globe,
  Edit,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  FileText,
  Home,
  DollarSign,
  Users,
  Shield,
  Lock,
  GripVertical,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  Settings
} from 'lucide-react';

// Memoized section editor for performance
const SectionEditor = memo(({ section, index, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="border rounded-lg bg-white">
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
        <div className="flex-1">
          <span className="font-medium">{section.title || `Sectie ${index + 1}`}</span>
          <Badge variant="outline" className="ml-2 text-xs">{section.type || 'text'}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={isFirst}
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={isLast}
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-500 hover:text-red-700"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 pt-0 space-y-4 border-t">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Titel</Label>
              <Input
                value={section.title || ''}
                onChange={(e) => onUpdate({ ...section, title: e.target.value })}
                placeholder="Sectie titel"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={section.type || 'text'}
                onChange={(e) => onUpdate({ ...section, type: e.target.value })}
              >
                <option value="text">Tekst</option>
                <option value="hero">Hero Banner</option>
                <option value="features">Features Grid</option>
                <option value="cta">Call to Action</option>
                <option value="cards">Kaarten</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Inhoud</Label>
            <Textarea
              value={section.content || ''}
              onChange={(e) => onUpdate({ ...section, content: e.target.value })}
              placeholder="Sectie inhoud..."
              rows={6}
            />
          </div>
        </div>
      )}
    </div>
  );
});

SectionEditor.displayName = 'SectionEditor';

export default function WebsiteEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPage, setNewPage] = useState({ title: '', slug: '', meta_description: '' });
  
  // Site settings
  const [siteSettings, setSiteSettings] = useState({
    company_name: 'Facturatie N.V.',
    phone: '+597 893-4982',
    email: 'info@facturatie.sr',
    address: 'Paramaribo, Suriname'
  });

  useEffect(() => {
    loadPages();
    loadSettings();
  }, []);

  const loadPages = async () => {
    try {
      const res = await api.get('/cms/pages');
      setPages(res.data || []);
    } catch (error) {
      console.error('Error loading pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.get('/public/landing/settings');
      if (res.data) {
        setSiteSettings(prev => ({ ...prev, ...res.data }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSavePage = async () => {
    if (!selectedPage) return;
    setSaving(true);
    try {
      await api.put(`/cms/pages/${selectedPage.id}`, selectedPage);
      toast.success('Pagina opgeslagen!');
      loadPages();
      setEditDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePage = async () => {
    if (!newPage.title || !newPage.slug) {
      toast.error('Titel en URL slug zijn verplicht');
      return;
    }
    setSaving(true);
    try {
      await api.post('/cms/pages', {
        ...newPage,
        sections: [],
        show_in_menu: false,
        is_published: true
      });
      toast.success('Pagina aangemaakt!');
      loadPages();
      setCreateDialogOpen(false);
      setNewPage({ title: '', slug: '', meta_description: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!window.confirm('Weet u zeker dat u deze pagina wilt verwijderen?')) return;
    try {
      await api.delete(`/cms/pages/${pageId}`);
      toast.success('Pagina verwijderd');
      loadPages();
    } catch (error) {
      toast.error('Fout bij verwijderen');
    }
  };

  const openEditDialog = (page) => {
    setSelectedPage({ ...page });
    setEditDialogOpen(true);
  };

  const addSection = () => {
    setSelectedPage(prev => ({
      ...prev,
      sections: [
        ...(prev.sections || []),
        { id: Date.now().toString(), type: 'text', title: 'Nieuwe Sectie', content: '' }
      ]
    }));
  };

  const updateSection = useCallback((index, updatedSection) => {
    setSelectedPage(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => i === index ? updatedSection : s)
    }));
  }, []);

  const deleteSection = useCallback((index) => {
    setSelectedPage(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  }, []);

  const moveSection = useCallback((index, direction) => {
    setSelectedPage(prev => {
      const sections = [...prev.sections];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= sections.length) return prev;
      [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
      return { ...prev, sections };
    });
  }, []);

  const getPageIcon = (slug) => {
    switch (slug) {
      case 'home': return Home;
      case 'prijzen': return DollarSign;
      case 'over-ons': return Users;
      case 'voorwaarden': return FileText;
      case 'privacy': return Lock;
      default: return Globe;
    }
  };

  const getPageUrl = (slug) => {
    if (slug === 'home') return '/';
    return `/${slug}`;
  };

  // Fixed pages that always exist
  const fixedPages = [
    { slug: 'home', title: 'Home', description: 'Landing page met hero en features' },
    { slug: 'prijzen', title: 'Prijzen', description: 'Module prijzen en bestellen' },
    { slug: 'over-ons', title: 'Over Ons', description: 'Bedrijfsinformatie' },
    { slug: 'voorwaarden', title: 'Algemene Voorwaarden', description: 'Juridische voorwaarden' },
    { slug: 'privacy', title: 'Privacybeleid', description: 'Privacy informatie' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fixed Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-600" />
            Vaste Pagina's
          </CardTitle>
          <CardDescription>
            Klik op "Bewerken" om de inhoud van een pagina aan te passen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fixedPages.map((page) => {
              const Icon = getPageIcon(page.slug);
              const cmsPage = pages.find(p => p.slug === page.slug);
              return (
                <div key={page.slug} className="p-4 bg-gray-50 rounded-lg border hover:border-emerald-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-emerald-600" />
                      <span className="font-medium">{page.title}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Vast</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{page.description}</p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => cmsPage ? openEditDialog(cmsPage) : toast.info('Deze pagina heeft nog geen CMS content')}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Bewerken
                    </Button>
                    <a href={getPageUrl(page.slug)} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost">
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom CMS Pages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Extra Pagina's</CardTitle>
              <CardDescription>
                Maak extra pagina's aan voor uw website
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Pagina
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pages.filter(p => !fixedPages.find(f => f.slug === p.slug)).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nog geen extra pagina's aangemaakt</p>
              <p className="text-sm">Klik op "Nieuwe Pagina" om te beginnen</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pages.filter(p => !fixedPages.find(f => f.slug === p.slug)).map((page) => (
                <div key={page.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{page.title}</span>
                    <span className="text-gray-500 text-sm ml-2">/{page.slug}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(page)}>
                      <Edit className="w-3 h-3 mr-1" />
                      Bewerken
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-red-500"
                      onClick={() => handleDeletePage(page.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Site Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Website Instellingen
          </CardTitle>
          <CardDescription>
            Algemene instellingen voor de website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bedrijfsnaam</Label>
              <Input value={siteSettings.company_name} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>Telefoonnummer</Label>
              <Input value={siteSettings.phone} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={siteSettings.email} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>Adres</Label>
              <Input value={siteSettings.address} disabled className="bg-gray-50" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Neem contact op met support om deze instellingen aan te passen.
          </p>
        </CardContent>
      </Card>

      {/* Edit Page Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pagina Bewerken: {selectedPage?.title}</DialogTitle>
            <DialogDescription>
              Bewerk de inhoud en secties van deze pagina
            </DialogDescription>
          </DialogHeader>
          
          {selectedPage && (
            <Tabs defaultValue="content" className="space-y-4">
              <TabsList>
                <TabsTrigger value="content">Inhoud</TabsTrigger>
                <TabsTrigger value="sections">Secties ({selectedPage.sections?.length || 0})</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Titel</Label>
                    <Input
                      value={selectedPage.title || ''}
                      onChange={(e) => setSelectedPage({ ...selectedPage, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL Slug</Label>
                    <Input
                      value={selectedPage.slug || ''}
                      onChange={(e) => setSelectedPage({ ...selectedPage, slug: e.target.value })}
                      disabled={fixedPages.find(f => f.slug === selectedPage.slug)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subtitel / Intro</Label>
                  <Textarea
                    value={selectedPage.subtitle || ''}
                    onChange={(e) => setSelectedPage({ ...selectedPage, subtitle: e.target.value })}
                    placeholder="Korte introductie voor de pagina..."
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="sections" className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Voeg secties toe en bewerk de volgorde
                  </p>
                  <Button onClick={addSection} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Sectie Toevoegen
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {(selectedPage.sections || []).map((section, index) => (
                    <SectionEditor
                      key={section.id || index}
                      section={section}
                      index={index}
                      onUpdate={(updated) => updateSection(index, updated)}
                      onDelete={() => deleteSection(index)}
                      onMoveUp={() => moveSection(index, -1)}
                      onMoveDown={() => moveSection(index, 1)}
                      isFirst={index === 0}
                      isLast={index === (selectedPage.sections?.length || 0) - 1}
                    />
                  ))}
                </div>

                {(!selectedPage.sections || selectedPage.sections.length === 0) && (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                    <p>Nog geen secties</p>
                    <Button onClick={addSection} variant="link">
                      Voeg eerste sectie toe
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="seo" className="space-y-4">
                <div className="space-y-2">
                  <Label>Meta Beschrijving</Label>
                  <Textarea
                    value={selectedPage.meta_description || ''}
                    onChange={(e) => setSelectedPage({ ...selectedPage, meta_description: e.target.value })}
                    placeholder="Korte beschrijving voor zoekmachines (max 160 tekens)"
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-gray-500">
                    {(selectedPage.meta_description || '').length}/160 tekens
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={selectedPage.show_in_menu || false}
                      onCheckedChange={(checked) => setSelectedPage({ ...selectedPage, show_in_menu: checked })}
                    />
                    <Label>Toon in navigatie menu</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={selectedPage.is_published !== false}
                      onCheckedChange={(checked) => setSelectedPage({ ...selectedPage, is_published: checked })}
                    />
                    <Label>Gepubliceerd</Label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSavePage} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Page Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Pagina Aanmaken</DialogTitle>
            <DialogDescription>
              Maak een nieuwe pagina voor uw website
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titel *</Label>
              <Input
                value={newPage.title}
                onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
                placeholder="Pagina titel"
              />
            </div>
            <div className="space-y-2">
              <Label>URL Slug *</Label>
              <div className="flex items-center">
                <span className="text-gray-500 mr-1">/</span>
                <Input
                  value={newPage.slug}
                  onChange={(e) => setNewPage({ ...newPage, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="pagina-url"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Meta Beschrijving</Label>
              <Textarea
                value={newPage.meta_description}
                onChange={(e) => setNewPage({ ...newPage, meta_description: e.target.value })}
                placeholder="Beschrijving voor zoekmachines"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleCreatePage} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
