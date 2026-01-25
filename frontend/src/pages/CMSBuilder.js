import { useState, useEffect, useCallback } from 'react';
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
  Layout, ExternalLink, Image, Type, Grid, Phone, Mail, MessageSquare,
  ChevronUp, ChevronDown, Copy, Palette, Globe, Menu, Columns, Upload,
  Home, Info, DollarSign, HelpCircle, Users, Star, Layers
} from 'lucide-react';
import api from '../lib/api';

const SECTION_TYPES = [
  { id: 'hero', name: 'Hero Banner', icon: Image, description: 'Grote banner met titel en knop' },
  { id: 'text', name: 'Tekst Blok', icon: Type, description: 'Tekst met opmaak' },
  { id: 'image_text', name: 'Afbeelding + Tekst', icon: Columns, description: 'Afbeelding naast tekst' },
  { id: 'features', name: 'Features Grid', icon: Grid, description: 'Kaarten met iconen' },
  { id: 'cta', name: 'Call to Action', icon: ExternalLink, description: 'Opvallende actie sectie' },
  { id: 'gallery', name: 'Galerij', icon: Image, description: 'Afbeeldingen grid' },
  { id: 'testimonials', name: 'Testimonials', icon: Star, description: 'Klant reviews' },
  { id: 'faq', name: 'FAQ', icon: HelpCircle, description: 'Veelgestelde vragen' },
  { id: 'contact', name: 'Contact', icon: Mail, description: 'Contactformulier' },
  { id: 'pricing', name: 'Prijzen', icon: DollarSign, description: 'Prijstabellen' },
  { id: 'team', name: 'Team', icon: Users, description: 'Team leden' },
  { id: 'custom_html', name: 'Custom HTML', icon: FileText, description: 'Eigen HTML code' },
];

export default function CMSBuilder() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [menu, setMenu] = useState({ items: [] });
  const [footer, setFooter] = useState({});
  const [selectedPage, setSelectedPage] = useState(null);
  const [activeTab, setActiveTab] = useState('pages');
  
  // Dialogs
  const [showNewPageDialog, setShowNewPageDialog] = useState(false);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  
  // Form states
  const [newPageForm, setNewPageForm] = useState({ title: '', slug: '', template: 'blank' });
  const [sectionForm, setSectionForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pagesRes, templatesRes, menuRes, footerRes] = await Promise.all([
        api.get('/cms/pages'),
        api.get('/cms/templates'),
        api.get('/cms/menu'),
        api.get('/cms/footer')
      ]);
      setPages(pagesRes.data);
      setTemplates(templatesRes.data);
      setMenu(menuRes.data);
      setFooter(footerRes.data);
    } catch (error) {
      toast.error('Fout bij laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = async () => {
    if (!newPageForm.title || !newPageForm.slug) {
      toast.error('Vul titel en URL slug in');
      return;
    }
    
    setSaving(true);
    try {
      if (newPageForm.template && newPageForm.template !== 'blank') {
        await api.post(`/api/cms/pages/from-template/${newPageForm.template}`, {
          title: newPageForm.title,
          slug: newPageForm.slug,
          show_in_menu: true
        });
      } else {
        await api.post('/api/cms/pages', {
          title: newPageForm.title,
          slug: newPageForm.slug,
          template: 'default',
          sections: [],
          is_published: false,
          show_in_menu: true
        });
      }
      toast.success('Pagina aangemaakt');
      setShowNewPageDialog(false);
      setNewPageForm({ title: '', slug: '', template: 'blank' });
      loadData();
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
      await api.put(`/api/cms/pages/${selectedPage.id}`, selectedPage);
      toast.success('Pagina opgeslagen');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!confirm('Weet u zeker dat u deze pagina wilt verwijderen?')) return;
    
    try {
      await api.delete(`/api/cms/pages/${pageId}`);
      toast.success('Pagina verwijderd');
      setSelectedPage(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij verwijderen');
    }
  };

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
    setShowSectionDialog(true);
  };

  const handleEditSection = (section, index) => {
    setSectionForm({ ...section, _index: index });
    setEditingSection(section);
    setShowSectionDialog(true);
  };

  const handleSaveSection = () => {
    if (!selectedPage) return;
    
    const sections = [...(selectedPage.sections || [])];
    
    if (editingSection) {
      // Update existing
      const index = sectionForm._index;
      sections[index] = { ...sectionForm, id: editingSection.id };
      delete sections[index]._index;
    } else {
      // Add new
      sections.push({
        ...sectionForm,
        id: crypto.randomUUID(),
        order: sections.length
      });
    }
    
    setSelectedPage({ ...selectedPage, sections });
    setShowSectionDialog(false);
    toast.success('Sectie opgeslagen (klik op "Pagina Opslaan" om te bewaren)');
  };

  const handleDeleteSection = (index) => {
    if (!selectedPage) return;
    const sections = [...selectedPage.sections];
    sections.splice(index, 1);
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

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/api/cms/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSectionForm({ ...sectionForm, [field]: res.data.url });
      toast.success('Afbeelding geüpload');
    } catch (error) {
      toast.error('Fout bij uploaden');
    }
  };

  const handleSaveFooter = async () => {
    setSaving(true);
    try {
      await api.put('/api/cms/footer', footer);
      toast.success('Footer opgeslagen');
    } catch (error) {
      toast.error('Fout bij opslaan footer');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMenu = async () => {
    setSaving(true);
    try {
      await api.put('/api/cms/menu', menu);
      toast.success('Menu opgeslagen');
    } catch (error) {
      toast.error('Fout bij opslaan menu');
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-3xl font-bold">Website Builder</h1>
          <p className="text-muted-foreground">Beheer uw volledige website</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open('/', '_blank')}>
            <Eye className="w-4 h-4 mr-2" />
            Website Bekijken
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="pages">
            <FileText className="w-4 h-4 mr-2" />
            Pagina's
          </TabsTrigger>
          <TabsTrigger value="menu">
            <Menu className="w-4 h-4 mr-2" />
            Menu
          </TabsTrigger>
          <TabsTrigger value="footer">
            <Columns className="w-4 h-4 mr-2" />
            Footer
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Layers className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* PAGES TAB */}
        <TabsContent value="pages" className="mt-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Pages List */}
            <div className="col-span-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Pagina's</CardTitle>
                    <Button size="sm" onClick={() => setShowNewPageDialog(true)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Nieuw
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pages.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      Nog geen pagina's. Maak uw eerste pagina!
                    </p>
                  ) : (
                    pages.map(page => (
                      <div
                        key={page.id}
                        onClick={() => setSelectedPage(page)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedPage?.id === page.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{page.title}</p>
                            <p className="text-xs text-muted-foreground">/{page.slug}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {page.is_published ? (
                              <Badge variant="success" className="bg-green-100 text-green-700">Live</Badge>
                            ) : (
                              <Badge variant="secondary">Concept</Badge>
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
                        <CardTitle>{selectedPage.title}</CardTitle>
                        <CardDescription>/{selectedPage.slug}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.open(`/${selectedPage.slug}`, '_blank')}>
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeletePage(selectedPage.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
                        <Label>URL Slug</Label>
                        <Input 
                          value={selectedPage.slug}
                          onChange={e => setSelectedPage({...selectedPage, slug: e.target.value})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Gepubliceerd</Label>
                        <Switch 
                          checked={selectedPage.is_published}
                          onCheckedChange={checked => setSelectedPage({...selectedPage, is_published: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Toon in Menu</Label>
                        <Switch 
                          checked={selectedPage.show_in_menu}
                          onCheckedChange={checked => setSelectedPage({...selectedPage, show_in_menu: checked})}
                        />
                      </div>
                    </div>

                    {/* Sections */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Secties</h3>
                        <Select onValueChange={handleAddSection}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="+ Sectie toevoegen" />
                          </SelectTrigger>
                          <SelectContent>
                            {SECTION_TYPES.map(type => (
                              <SelectItem key={type.id} value={type.id}>
                                <div className="flex items-center gap-2">
                                  <type.icon className="w-4 h-4" />
                                  {type.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedPage.sections?.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                          <Layout className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-muted-foreground">Nog geen secties</p>
                          <p className="text-sm text-muted-foreground">Voeg een sectie toe om te beginnen</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedPage.sections?.map((section, index) => {
                            const sectionType = SECTION_TYPES.find(t => t.id === section.type);
                            const Icon = sectionType?.icon || FileText;
                            
                            return (
                              <div 
                                key={section.id || index}
                                className="flex items-center gap-3 p-4 border rounded-lg bg-card"
                              >
                                <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Icon className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">{section.title || sectionType?.name}</p>
                                  <p className="text-xs text-muted-foreground">{sectionType?.description}</p>
                                </div>
                                <div className="flex items-center gap-1">
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
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Selecteer een pagina</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Kies een pagina uit de lijst of maak een nieuwe aan
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

        {/* MENU TAB */}
        <TabsContent value="menu" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Navigatie Menu</CardTitle>
                  <CardDescription>Beheer de hoofdnavigatie van uw website</CardDescription>
                </div>
                <Button onClick={handleSaveMenu} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Opslaan
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {menu.items?.map((item, index) => (
                  <div key={item.id || index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                    <Input 
                      value={item.label}
                      onChange={e => {
                        const items = [...menu.items];
                        items[index].label = e.target.value;
                        setMenu({...menu, items});
                      }}
                      className="flex-1"
                      placeholder="Menu label"
                    />
                    <Input 
                      value={item.link}
                      onChange={e => {
                        const items = [...menu.items];
                        items[index].link = e.target.value;
                        setMenu({...menu, items});
                      }}
                      className="w-48"
                      placeholder="/pagina-url"
                    />
                    <Switch 
                      checked={item.is_visible !== false}
                      onCheckedChange={checked => {
                        const items = [...menu.items];
                        items[index].is_visible = checked;
                        setMenu({...menu, items});
                      }}
                    />
                    <Button variant="ghost" size="icon" onClick={() => {
                      const items = menu.items.filter((_, i) => i !== index);
                      setMenu({...menu, items});
                    }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={() => {
                  setMenu({
                    ...menu,
                    items: [...(menu.items || []), { id: crypto.randomUUID(), label: '', link: '', is_visible: true }]
                  });
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Menu Item Toevoegen
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FOOTER TAB */}
        <TabsContent value="footer" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Footer Instellingen</CardTitle>
                  <CardDescription>Pas de footer van uw website aan</CardDescription>
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
                <Label className="text-base font-semibold mb-3 block">Footer Kolommen</Label>
                <div className="space-y-4">
                  {footer.columns?.map((column, colIndex) => (
                    <div key={colIndex} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Input 
                          value={column.title}
                          onChange={e => {
                            const columns = [...footer.columns];
                            columns[colIndex].title = e.target.value;
                            setFooter({...footer, columns});
                          }}
                          placeholder="Kolom titel"
                          className="w-48"
                        />
                        <Button variant="ghost" size="sm" onClick={() => {
                          const columns = footer.columns.filter((_, i) => i !== colIndex);
                          setFooter({...footer, columns});
                        }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="space-y-2 pl-4">
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
                              className="w-32"
                            />
                            <Button variant="ghost" size="icon" onClick={() => {
                              const columns = [...footer.columns];
                              columns[colIndex].links = columns[colIndex].links.filter((_, i) => i !== linkIndex);
                              setFooter({...footer, columns});
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => {
                          const columns = [...footer.columns];
                          columns[colIndex].links = [...(columns[colIndex].links || []), { label: '', url: '' }];
                          setFooter({...footer, columns});
                        }}>
                          <Plus className="w-4 h-4 mr-1" />
                          Link toevoegen
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" onClick={() => {
                    setFooter({
                      ...footer,
                      columns: [...(footer.columns || []), { title: 'Nieuwe Kolom', links: [] }]
                    });
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Kolom Toevoegen
                  </Button>
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
                      className="w-12 h-10 p-1"
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
                      className="w-12 h-10 p-1"
                    />
                    <Input 
                      value={footer.text_color || '#ffffff'}
                      onChange={e => setFooter({...footer, text_color: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={footer.show_social_links}
                    onCheckedChange={checked => setFooter({...footer, show_social_links: checked})}
                  />
                  <Label>Sociale Media Links Tonen</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={footer.show_newsletter}
                    onCheckedChange={checked => setFooter({...footer, show_newsletter: checked})}
                  />
                  <Label>Nieuwsbrief Tonen</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="mt-6">
          <div className="grid grid-cols-3 gap-6">
            {templates.map(template => (
              <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
                setNewPageForm({ ...newPageForm, template: template.id });
                setShowNewPageDialog(true);
              }}>
                <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Layers className="w-16 h-16 text-primary/50" />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  <Badge variant="outline" className="mt-2">{template.category}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Page Dialog */}
      <Dialog open={showNewPageDialog} onOpenChange={setShowNewPageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Pagina</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pagina Titel</Label>
              <Input 
                value={newPageForm.title}
                onChange={e => setNewPageForm({...newPageForm, title: e.target.value})}
                placeholder="Bijv. Over Ons"
              />
            </div>
            <div className="space-y-2">
              <Label>URL Slug</Label>
              <Input 
                value={newPageForm.slug}
                onChange={e => setNewPageForm({...newPageForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                placeholder="Bijv. over-ons"
              />
              <p className="text-xs text-muted-foreground">Dit wordt de URL: /{newPageForm.slug}</p>
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={newPageForm.template} onValueChange={v => setNewPageForm({...newPageForm, template: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPageDialog(false)}>Annuleren</Button>
            <Button onClick={handleCreatePage} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Editor Dialog */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Sectie Bewerken' : 'Nieuwe Sectie'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input 
                  value={sectionForm.title || ''}
                  onChange={e => setSectionForm({...sectionForm, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Ondertitel</Label>
                <Input 
                  value={sectionForm.subtitle || ''}
                  onChange={e => setSectionForm({...sectionForm, subtitle: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Inhoud</Label>
              <Textarea 
                value={sectionForm.content || ''}
                onChange={e => setSectionForm({...sectionForm, content: e.target.value})}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Afbeelding</Label>
              <div className="flex gap-2">
                <Input 
                  value={sectionForm.image_url || ''}
                  onChange={e => setSectionForm({...sectionForm, image_url: e.target.value})}
                  placeholder="URL of upload"
                />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'image_url')} />
                  <Button variant="outline" type="button" asChild>
                    <span><Upload className="w-4 h-4" /></span>
                  </Button>
                </label>
              </div>
              {sectionForm.image_url && (
                <img src={sectionForm.image_url} alt="Preview" className="h-32 object-cover rounded-lg mt-2" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Knop Tekst</Label>
                <Input 
                  value={sectionForm.button_text || ''}
                  onChange={e => setSectionForm({...sectionForm, button_text: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Knop Link</Label>
                <Input 
                  value={sectionForm.button_link || ''}
                  onChange={e => setSectionForm({...sectionForm, button_link: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label>Achtergrondkleur</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color"
                    value={sectionForm.background_color || '#ffffff'}
                    onChange={e => setSectionForm({...sectionForm, background_color: e.target.value})}
                    className="w-12 h-10 p-1"
                  />
                  <Input 
                    value={sectionForm.background_color || ''}
                    onChange={e => setSectionForm({...sectionForm, background_color: e.target.value})}
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSectionDialog(false)}>Annuleren</Button>
            <Button onClick={handleSaveSection}>
              <Save className="w-4 h-4 mr-1" />
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
