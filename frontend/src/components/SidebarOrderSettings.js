import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { 
  GripVertical, 
  Loader2, 
  Save,
  ArrowUp,
  ArrowDown,
  LayoutList,
  Check
} from 'lucide-react';
import { getSidebarOrder, updateSidebarOrder, getMyAddons } from '../lib/api';

export default function SidebarOrderSettings() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get user's active modules
      const addonsRes = await getUserAddons();
      const activeModules = addonsRes.data.filter(a => 
        a.status === 'active' || a.status === 'trial'
      );

      // Always add boekhouding as it's free for everyone
      const hasBoekhouding = activeModules.some(m => m.addon_slug === 'boekhouding');
      if (!hasBoekhouding) {
        activeModules.push({
          addon_slug: 'boekhouding',
          addon_name: 'Boekhouding (Gratis)',
          status: 'active'
        });
      }

      // Get saved order
      const orderRes = await getSidebarOrder();
      const savedOrder = orderRes.data.module_order || [];

      // Sort modules based on saved order
      const sortedModules = [...activeModules].sort((a, b) => {
        const indexA = savedOrder.indexOf(a.addon_slug);
        const indexB = savedOrder.indexOf(b.addon_slug);
        
        // Items not in savedOrder go to the end
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        
        return indexA - indexB;
      });

      setModules(sortedModules);
    } catch (error) {
      console.error('Error loading modules:', error);
      toast.error('Fout bij laden van modules');
    } finally {
      setLoading(false);
    }
  };

  const moveModule = (index, direction) => {
    const newModules = [...modules];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= modules.length) return;
    
    // Swap
    [newModules[index], newModules[newIndex]] = [newModules[newIndex], newModules[index]];
    
    setModules(newModules);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const moduleOrder = modules.map(m => m.addon_slug);
      await updateSidebarOrder(moduleOrder);
      toast.success('Module volgorde opgeslagen! Herlaad de pagina om de wijzigingen te zien.');
      setHasChanges(false);
    } catch (error) {
      toast.error('Fout bij opslaan van volgorde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutList className="w-5 h-5 text-primary" />
              Module Volgorde
            </CardTitle>
            <CardDescription>
              Bepaal de volgorde van modules in de zijbalk
            </CardDescription>
          </div>
          {hasChanges && (
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opslaan...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Opslaan</>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {modules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <LayoutList className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Geen actieve modules gevonden</p>
          </div>
        ) : (
          <div className="space-y-2">
            {modules.map((module, index) => (
              <div
                key={module.addon_slug || module.id}
                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {index + 1}
                </div>
                
                <GripVertical className="w-5 h-5 text-slate-400" />
                
                <div className="flex-1">
                  <p className="font-medium">{module.addon_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {module.status === 'trial' ? 'Proefperiode' : 'Actief'}
                  </p>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveModule(index, 'up')}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveModule(index, 'down')}
                    disabled={index === modules.length - 1}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
              <Check className="w-3 h-3 inline mr-1" />
              Gebruik de pijltjes om modules omhoog of omlaag te verplaatsen. 
              Na opslaan verschijnen de modules in deze volgorde in de zijbalk.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
