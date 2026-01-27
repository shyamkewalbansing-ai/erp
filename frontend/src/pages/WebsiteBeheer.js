import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { 
  Plus, Trash2, Loader2, Save, Eye, EyeOff, GripVertical, Settings, FileText,
  Layout, ExternalLink, Image, Type, Grid, Phone, Mail, Globe,
  ChevronUp, ChevronDown, Palette, Menu, Upload, Home, Star, HelpCircle, 
  Users, DollarSign, Layers, X, Check
} from 'lucide-react';
import api from '../lib/api';

const SECTION_TYPES = [
  { id: 'hero', name: 'Hero Banner', icon: Image, description: 'Grote banner met titel en knop' },
  { id: 'text', name: 'Tekst Blok', icon: Type, description: 'Tekst met opmaak' },
  { id: 'image_text', name: 'Afbeelding + Tekst', icon: Layout, description: 'Afbeelding naast tekst' },
  { id: 'features', name: 'Features/Kaarten', icon: Grid, description: 'Kaarten met iconen' },
  { id: 'cta', name: 'Call to Action', icon: ExternalLink, description: 'Opvallende actie sectie' },
  { id: 'gallery', name: 'Galerij', icon: Image, description: 'Afbeeldingen grid' },
  { id: 'testimonials', name: 'Reviews', icon: Star, description: 'Klant reviews' },
  { id: 'faq', name: 'FAQ', icon: HelpCircle, description: 'Veelgestelde vragen' },
  { id: 'contact', name: 'Contact Info', icon: Mail, description: 'Contactgegevens' },
  { id: 'pricing', name: 'Prijzen', icon: DollarSign, description: 'Prijstabellen' },
  { id: 'team', name: 'Team', icon: Users, description: 'Team leden' },
];

export default function WebsiteBeheer() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('pages');
  
  // Data
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [settings, setSettings] = useState({});
  const [footer, setFooter] = useState({ columns: [], copyright_text: '', background_color: '#1f2937', text_color: '#ffffff' });
  
  // Dialogs
  const [showNewPageDialog, setShowNewPageDialog] = useState(false);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editingSectionIndex, setEditingSectionIndex] = useState(null);
  
  // Forms
  const [newPageForm, setNewPageForm] = useState({ title: '', slug: '' });
  const [sectionForm, setSectionForm] = useState({});

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    // Select first page when pages are loaded and no page is selected
    if (pages.length > 0 && selectedPage === null) {
      setSelectedPage(pages[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length]);

  const loadAllData = async () => {
    try {
      const [pagesRes, settingsRes, footerRes] = await Promise.all([
        api.get('/cms/pages').catch(() => ({ data: [] })),
        api.get('/admin/landing/settings').catch(() => ({ data: {} })),
        api.get('/cms/footer').catch(() => ({ data: {} }))
      ]);
      
      setPages(pagesRes.data || []);
      setSettings(settingsRes.data || {});
      setFooter(footerRes.data || { columns: [], copyright_text: '', background_color: '#1f2937', text_color: '#ffffff' });
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Fout bij laden');
    } finally {
      setLoading(false);
    }
  };

  // ============ PAGE FUNCTIONS ============
  const handleCreatePage = async () => {
    if (!newPageForm.title || !newPageForm.slug) {
      toast.error('Vul titel en URL in');
      return;
    }
    
    setSaving(true);
    try {
      const response = await api.post('/cms/pages', {
        title: newPageForm.title,
        slug: newPageForm.slug.toLowerCase().replace(/\s+/g, '-'),
        sections: [
          {
            id: crypto.randomUUID(),
            type: 'hero',
            title: newPageForm.title,
            subtitle: 'Pas deze tekst aan',
            layout: 'center',
            is_visible: true,
            order: 0
          }
        ],
        is_published: true,
        show_in_menu: true,
        menu_order: pages.length,
        show_header: true,
        show_footer: true
      });
      
      toast.success('Pagina aangemaakt!');
      setShowNewPageDialog(false);
      setNewPageForm({ title: '', slug: '' });
      await loadAllData();
      setSelectedPage(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij aanmaken');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePage = async () => {
    if (!selectedPage) return;
    
    setSaving(true);
    try {
      await api.put(`/cms/pages/${selectedPage.id}`, selectedPage);
      toast.success('Pagina opgeslagen!');
      await loadAllData();
    } catch (error) {
      toast.error('Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!confirm('Weet u zeker dat u deze pagina wilt verwijderen?')) return;
    
    try {
      await api.delete(`/cms/pages/${pageId}`);
      toast.success('Pagina verwijderd');
      setSelectedPage(null);
      await loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kan niet verwijderen');
    }
  };

  // ============ SECTION FUNCTIONS ============
  const handleAddSection = (type) => {
    const sectionType = SECTION_TYPES.find(t => t.id === type);
    setSectionForm({
      type,
      title: sectionType?.name || '',
      subtitle: '',
      content: '',
      image_url: '',
      background_color: '',
      text_color: '',
      button_text: '',
      button_link: '',
      layout: 'center',
      items: [],
      is_visible: true
    });
    setEditingSection(null);
    setEditingSectionIndex(null);
    setShowSectionDialog(true);
  };

  const handleEditSection = (section, index) => {
    setSectionForm({ ...section });
    setEditingSection(section);
    setEditingSectionIndex(index);
    setShowSectionDialog(true);
  };

  const handleSaveSection = () => {
    if (!selectedPage) return;
    
    const sections = [...(selectedPage.sections || [])];
    const newSection = {
      ...sectionForm,
      id: editingSection?.id || crypto.randomUUID(),
      order: editingSectionIndex ?? sections.length
    };
    
    if (editingSectionIndex !== null) {
      sections[editingSectionIndex] = newSection;
    } else {
      sections.push(newSection);
    }
    
    setSelectedPage({ ...selectedPage, sections });
    setShowSectionDialog(false);
    toast.success('Sectie toegevoegd - klik op "Pagina Opslaan" om te bewaren');
  };

  const handleDeleteSection = (index) => {
    if (!selectedPage) return;
    const sections = selectedPage.sections.filter((_, i) => i !== index);
    setSelectedPage({ ...selectedPage, sections });
  };

  const handleMoveSection = (index, direction) => {
    if (!selectedPage) return;
    const sections = [...selectedPage.sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
    setSelectedPage({ ...selectedPage, sections });
  };

  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e, field, targetSetter = null) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Alleen afbeeldingen zijn toegestaan');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Afbeelding mag maximaal 5MB zijn');
      return;
    }
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/cms/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const imageUrl = response.data.url;
      
      if (targetSetter) {
        targetSetter(imageUrl);
      } else {
        setSectionForm({ ...sectionForm, [field]: imageUrl });
      }
      
      toast.success('Afbeelding geüpload!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Fout bij uploaden');
    } finally {
      setUploading(false);
    }
  };

  // ============ SETTINGS FUNCTIONS ============
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/admin/landing/settings', settings);
      toast.success('Instellingen opgeslagen!');
    } catch (error) {
      toast.error('Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  // ============ FOOTER FUNCTIONS ============
  const handleSaveFooter = async () => {
    setSaving(true);
    try {
      await api.put('/cms/footer', footer);
      toast.success('Footer opgeslagen!');
    } catch (error) {
      toast.error('Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const addFooterColumn = () => {
    setFooter({
      ...footer,
      columns: [...(footer.columns || []), { title: 'Nieuwe Kolom', links: [] }]
    });
  };

  const addFooterLink = (colIndex) => {
    const columns = [...footer.columns];
    columns[colIndex].links = [...(columns[colIndex].links || []), { label: '', url: '' }];
    setFooter({ ...footer, columns });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Website Beheer</h1>
          <p className="text-muted-foreground">Beheer uw volledige website - pagina's, menu, footer en instellingen</p>
        </div>
        <Button variant="outline" onClick={() => window.open('/', '_blank')}>
          <Eye className="w-4 h-4 mr-2" />
          Website Bekijken
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="pages"><FileText className="w-4 h-4 mr-2" />Pagina's</TabsTrigger>
          <TabsTrigger value="footer"><Layout className="w-4 h-4 mr-2" />Footer</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" />Instellingen</TabsTrigger>
          <TabsTrigger value="design"><Palette className="w-4 h-4 mr-2" />Design</TabsTrigger>
        </TabsList>

        {/* ==================== PAGES TAB ==================== */}
        <TabsContent value="pages" className="mt-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Pages List */}
            <div className="col-span-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Alle Pagina's</CardTitle>
                    <Button size="sm" onClick={() => setShowNewPageDialog(true)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Nieuw
                    </Button>
                  </div>
                  <CardDescription>Klik op een pagina om te bewerken</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pages.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Nog geen pagina's</p>
                      <Button className="mt-4" onClick={() => setShowNewPageDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Eerste Pagina Maken
                      </Button>
                    </div>
                  ) : (
                    pages.map(page => (
                      <div
                        key={page.id}
                        onClick={() => setSelectedPage(page)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedPage?.id === page.id 
                            ? 'border-primary bg-primary/5 shadow-sm' 
                            : 'hover:bg-muted/50 hover:border-muted-foreground/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {page.slug === 'home' && <Home className="w-4 h-4 text-primary" />}
                            <div>
                              <p className="font-medium">{page.title}</p>
                              <p className="text-xs text-muted-foreground">/{page.slug}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {page.show_in_menu && (
                              <Badge variant="outline" className="text-xs">Menu</Badge>
                            )}
                            {page.is_published ? (
                              <Badge className="bg-green-100 text-green-700 text-xs">Live</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Concept</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Page Editor */}
            <div className="col-span-8">
              {selectedPage ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {selectedPage.title}
                          {selectedPage.is_published && <Badge className="bg-green-100 text-green-700">Live</Badge>}
                        </CardTitle>
                        <CardDescription>/{selectedPage.slug}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.open(`/${selectedPage.slug === 'home' ? '' : selectedPage.slug}`, '_blank')}>
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                        {selectedPage.slug !== 'home' && (
                          <Button variant="destructive" size="sm" onClick={() => handleDeletePage(selectedPage.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button onClick={handleSavePage} disabled={saving}>
                          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                          Opslaan
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Page Settings */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                      <div className="space-y-2">
                        <Label>Pagina Titel</Label>
                        <Input 
                          value={selectedPage.title}
                          onChange={e => setSelectedPage({...selectedPage, title: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>URL</Label>
                        <Input 
                          value={selectedPage.slug}
                          onChange={e => setSelectedPage({...selectedPage, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                          disabled={selectedPage.slug === 'home'}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-background rounded border">
                        <div>
                          <Label>Gepubliceerd</Label>
                          <p className="text-xs text-muted-foreground">Pagina is zichtbaar voor bezoekers</p>
                        </div>
                        <Switch 
                          checked={selectedPage.is_published}
                          onCheckedChange={checked => setSelectedPage({...selectedPage, is_published: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-background rounded border">
                        <div>
                          <Label>Toon in Menu</Label>
                          <p className="text-xs text-muted-foreground">Pagina verschijnt in navigatie</p>
                        </div>
                        <Switch 
                          checked={selectedPage.show_in_menu}
                          onCheckedChange={checked => setSelectedPage({...selectedPage, show_in_menu: checked})}
                        />
                      </div>
                    </div>

                    {/* Sections */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">Pagina Secties</h3>
                          <p className="text-sm text-muted-foreground">Sleep om te herschikken, klik om te bewerken</p>
                        </div>
                        <Select onValueChange={handleAddSection}>
                          <SelectTrigger className="w-52">
                            <Plus className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Sectie Toevoegen" />
                          </SelectTrigger>
                          <SelectContent>
                            {SECTION_TYPES.map(type => (
                              <SelectItem key={type.id} value={type.id}>
                                <div className="flex items-center gap-2">
                                  <type.icon className="w-4 h-4" />
                                  <span>{type.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {(!selectedPage.sections || selectedPage.sections.length === 0) ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                          <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                          <p className="font-medium">Nog geen secties</p>
                          <p className="text-sm text-muted-foreground mb-4">Voeg een sectie toe om uw pagina te bouwen</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedPage.sections.map((section, index) => {
                            const sectionType = SECTION_TYPES.find(t => t.id === section.type);
                            const Icon = sectionType?.icon || FileText;
                            
                            return (
                              <div 
                                key={section.id || index}
                                className="flex items-center gap-3 p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow"
                              >
                                <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Icon className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{section.title || sectionType?.name || 'Sectie'}</p>
                                  <p className="text-xs text-muted-foreground">{sectionType?.description}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  {!section.is_visible && <EyeOff className="w-4 h-4 text-muted-foreground" />}
                                  <Button variant="ghost" size="icon" onClick={() => handleMoveSection(index, 'up')} disabled={index === 0}>
                                    <ChevronUp className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleMoveSection(index, 'down')} disabled={index === selectedPage.sections.length - 1}>
                                    <ChevronDown className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleEditSection(section, index)}>
                                    <Settings className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteSection(index)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Selecteer een pagina</h3>
                    <p className="text-muted-foreground text-center mb-6">
                      Kies een pagina uit de lijst om te bewerken<br/>of maak een nieuwe pagina aan
                    </p>
                    <Button onClick={() => setShowNewPageDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nieuwe Pagina
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ==================== FOOTER TAB ==================== */}
        <TabsContent value="footer" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Footer Instellingen</CardTitle>
                  <CardDescription>De footer verschijnt onderaan elke pagina</CardDescription>
                </div>
                <Button onClick={handleSaveFooter} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Opslaan
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Footer Columns */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold">Footer Kolommen</Label>
                  <Button variant="outline" size="sm" onClick={addFooterColumn}>
                    <Plus className="w-4 h-4 mr-1" />
                    Kolom Toevoegen
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {footer.columns?.map((column, colIndex) => (
                    <div key={colIndex} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <Input 
                          value={column.title}
                          onChange={e => {
                            const columns = [...footer.columns];
                            columns[colIndex].title = e.target.value;
                            setFooter({...footer, columns});
                          }}
                          placeholder="Kolom titel"
                          className="flex-1"
                        />
                        <Button variant="ghost" size="icon" onClick={() => {
                          const columns = footer.columns.filter((_, i) => i !== colIndex);
                          setFooter({...footer, columns});
                        }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {column.links?.map((link, linkIndex) => (
                          <div key={linkIndex} className="flex items-center gap-2">
                            <Input 
                              value={link.label}
                              onChange={e => {
                                const columns = [...footer.columns];
                                columns[colIndex].links[linkIndex].label = e.target.value;
                                setFooter({...footer, columns});
                              }}
                              placeholder="Label"
                              className="flex-1"
                            />
                            <Input 
                              value={link.url}
                              onChange={e => {
                                const columns = [...footer.columns];
                                columns[colIndex].links[linkIndex].url = e.target.value;
                                setFooter({...footer, columns});
                              }}
                              placeholder="/url"
                              className="w-24"
                            />
                            <Button variant="ghost" size="icon" onClick={() => {
                              const columns = [...footer.columns];
                              columns[colIndex].links = columns[colIndex].links.filter((_, i) => i !== linkIndex);
                              setFooter({...footer, columns});
                            }}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => addFooterLink(colIndex)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Link
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Copyright */}
              <div className="space-y-2">
                <Label>Copyright Tekst</Label>
                <Input 
                  value={footer.copyright_text || ''}
                  onChange={e => setFooter({...footer, copyright_text: e.target.value})}
                  placeholder="© 2024 Uw Bedrijf. Alle rechten voorbehouden."
                />
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Achtergrondkleur</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color"
                      value={footer.background_color || '#1f2937'}
                      onChange={e => setFooter({...footer, background_color: e.target.value})}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input 
                      value={footer.background_color || '#1f2937'}
                      onChange={e => setFooter({...footer, background_color: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tekstkleur</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color"
                      value={footer.text_color || '#ffffff'}
                      onChange={e => setFooter({...footer, text_color: e.target.value})}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input 
                      value={footer.text_color || '#ffffff'}
                      onChange={e => setFooter({...footer, text_color: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== SETTINGS TAB ==================== */}
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Algemene Instellingen</CardTitle>
                  <CardDescription>Bedrijfsgegevens en website configuratie</CardDescription>
                </div>
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Opslaan
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bedrijfsnaam</Label>
                  <Input 
                    value={settings.company_name || ''}
                    onChange={e => setSettings({...settings, company_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    value={settings.company_email || ''}
                    onChange={e => setSettings({...settings, company_email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefoon</Label>
                  <Input 
                    value={settings.company_phone || ''}
                    onChange={e => setSettings({...settings, company_phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adres</Label>
                  <Input 
                    value={settings.company_address || ''}
                    onChange={e => setSettings({...settings, company_address: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex gap-2">
                  <Input 
                    value={settings.logo_url || ''}
                    onChange={e => setSettings({...settings, logo_url: e.target.value})}
                    placeholder="https://... of upload"
                    className="flex-1"
                  />
                  <label className="cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={e => handleImageUpload(e, 'logo_url', (url) => setSettings({...settings, logo_url: url}))}
                    />
                    <Button variant="outline" type="button" asChild disabled={uploading}>
                      <span>{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</span>
                    </Button>
                  </label>
                </div>
                {settings.logo_url && (
                  <img src={settings.logo_url} alt="Logo" className="h-16 mt-2" />
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Login/Registratie Afbeeldingen</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Login Pagina Afbeelding</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={settings.login_image_url || ''}
                        onChange={e => setSettings({...settings, login_image_url: e.target.value})}
                        placeholder="URL of upload"
                        className="flex-1"
                      />
                      <label className="cursor-pointer">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={e => handleImageUpload(e, 'login_image_url', (url) => setSettings({...settings, login_image_url: url}))}
                        />
                        <Button variant="outline" type="button" asChild disabled={uploading}>
                          <span>{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</span>
                        </Button>
                      </label>
                    </div>
                    {settings.login_image_url && (
                      <img src={settings.login_image_url} alt="Login" className="h-32 w-full object-cover rounded mt-2" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Registratie Pagina Afbeelding</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={settings.register_image_url || ''}
                        onChange={e => setSettings({...settings, register_image_url: e.target.value})}
                        placeholder="URL of upload"
                        className="flex-1"
                      />
                      <label className="cursor-pointer">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={e => handleImageUpload(e, 'register_image_url', (url) => setSettings({...settings, register_image_url: url}))}
                        />
                        <Button variant="outline" type="button" asChild disabled={uploading}>
                          <span>{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</span>
                        </Button>
                      </label>
                    </div>
                    {settings.register_image_url && (
                      <img src={settings.register_image_url} alt="Register" className="h-32 w-full object-cover rounded mt-2" />
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Sociale Media</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Facebook URL</Label>
                    <Input 
                      value={settings.social_links?.facebook || ''}
                      onChange={e => setSettings({...settings, social_links: {...(settings.social_links || {}), facebook: e.target.value}})}
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram URL</Label>
                    <Input 
                      value={settings.social_links?.instagram || ''}
                      onChange={e => setSettings({...settings, social_links: {...(settings.social_links || {}), instagram: e.target.value}})}
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== DESIGN TAB ==================== */}
        <TabsContent value="design" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Design Instellingen</CardTitle>
                  <CardDescription>Kleuren en typografie voor uw website</CardDescription>
                </div>
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Opslaan
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Primaire Kleur</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color"
                      value={settings.primary_color || '#3b82f6'}
                      onChange={e => setSettings({...settings, primary_color: e.target.value})}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input 
                      value={settings.primary_color || '#3b82f6'}
                      onChange={e => setSettings({...settings, primary_color: e.target.value})}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Hoofdkleur voor knoppen en accenten</p>
                </div>
                <div className="space-y-2">
                  <Label>Secundaire Kleur</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color"
                      value={settings.secondary_color || '#1e40af'}
                      onChange={e => setSettings({...settings, secondary_color: e.target.value})}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input 
                      value={settings.secondary_color || '#1e40af'}
                      onChange={e => setSettings({...settings, secondary_color: e.target.value})}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Secundaire kleur voor hover states</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================== NEW PAGE DIALOG ==================== */}
      <Dialog open={showNewPageDialog} onOpenChange={setShowNewPageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Pagina Aanmaken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pagina Titel *</Label>
              <Input 
                value={newPageForm.title}
                onChange={e => {
                  setNewPageForm({
                    ...newPageForm, 
                    title: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                  });
                }}
                placeholder="Bijv. Over Ons, Diensten, Blog"
              />
            </div>
            <div className="space-y-2">
              <Label>URL *</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">/</span>
                <Input 
                  value={newPageForm.slug}
                  onChange={e => setNewPageForm({...newPageForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')})}
                  placeholder="over-ons"
                />
              </div>
              <p className="text-xs text-muted-foreground">De URL wordt: /{newPageForm.slug || 'pagina-naam'}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPageDialog(false)}>Annuleren</Button>
            <Button onClick={handleCreatePage} disabled={saving || !newPageForm.title || !newPageForm.slug}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== SECTION EDITOR DIALOG ==================== */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Sectie Bewerken' : 'Nieuwe Sectie'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input 
                  value={sectionForm.title || ''}
                  onChange={e => setSectionForm({...sectionForm, title: e.target.value})}
                  placeholder="Sectie titel"
                />
              </div>
              <div className="space-y-2">
                <Label>Ondertitel</Label>
                <Input 
                  value={sectionForm.subtitle || ''}
                  onChange={e => setSectionForm({...sectionForm, subtitle: e.target.value})}
                  placeholder="Korte beschrijving"
                />
              </div>
            </div>
            
            {/* Content */}
            <div className="space-y-2">
              <Label>Inhoud / Tekst</Label>
              <Textarea 
                value={sectionForm.content || ''}
                onChange={e => setSectionForm({...sectionForm, content: e.target.value})}
                placeholder="Voer hier uw tekst in..."
                rows={4}
              />
            </div>

            {/* Image */}
            <div className="space-y-2">
              <Label>Afbeelding</Label>
              <div className="flex gap-2">
                <Input 
                  value={sectionForm.image_url || ''}
                  onChange={e => setSectionForm({...sectionForm, image_url: e.target.value})}
                  placeholder="URL of upload een afbeelding"
                  className="flex-1"
                />
                <label className="cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={e => handleImageUpload(e, 'image_url')} 
                  />
                  <Button variant="outline" type="button" asChild disabled={uploading}>
                    <span>{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</span>
                  </Button>
                </label>
              </div>
              {sectionForm.image_url && (
                <img src={sectionForm.image_url} alt="Preview" className="h-40 w-full object-cover rounded-lg mt-2" />
              )}
            </div>

            {/* Button */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Knop Tekst</Label>
                <Input 
                  value={sectionForm.button_text || ''}
                  onChange={e => setSectionForm({...sectionForm, button_text: e.target.value})}
                  placeholder="Bijv. Meer Info, Contact"
                />
              </div>
              <div className="space-y-2">
                <Label>Knop Link</Label>
                <Input 
                  value={sectionForm.button_link || ''}
                  onChange={e => setSectionForm({...sectionForm, button_link: e.target.value})}
                  placeholder="/contact of https://..."
                />
              </div>
            </div>

            {/* Layout & Colors */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Layout</Label>
                <Select value={sectionForm.layout || 'center'} onValueChange={v => setSectionForm({...sectionForm, layout: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Links</SelectItem>
                    <SelectItem value="center">Gecentreerd</SelectItem>
                    <SelectItem value="right">Rechts</SelectItem>
                    <SelectItem value="image-left">Afbeelding Links</SelectItem>
                    <SelectItem value="image-right">Afbeelding Rechts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Achtergrond</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color"
                    value={sectionForm.background_color || '#ffffff'}
                    onChange={e => setSectionForm({...sectionForm, background_color: e.target.value})}
                    className="w-14 h-10 p-1"
                  />
                  <Input 
                    value={sectionForm.background_color || ''}
                    onChange={e => setSectionForm({...sectionForm, background_color: e.target.value})}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tekstkleur</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color"
                    value={sectionForm.text_color || '#000000'}
                    onChange={e => setSectionForm({...sectionForm, text_color: e.target.value})}
                    className="w-14 h-10 p-1"
                  />
                  <Input 
                    value={sectionForm.text_color || ''}
                    onChange={e => setSectionForm({...sectionForm, text_color: e.target.value})}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Visibility */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <Label>Sectie Zichtbaar</Label>
                <p className="text-xs text-muted-foreground">Verberg de sectie zonder te verwijderen</p>
              </div>
              <Switch 
                checked={sectionForm.is_visible !== false}
                onCheckedChange={checked => setSectionForm({...sectionForm, is_visible: checked})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSectionDialog(false)}>Annuleren</Button>
            <Button onClick={handleSaveSection}>
              <Check className="w-4 h-4 mr-1" />
              {editingSection ? 'Bijwerken' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
