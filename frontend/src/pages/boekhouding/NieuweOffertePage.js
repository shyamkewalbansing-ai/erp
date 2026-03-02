import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  Calculator,
  Plus,
  Trash2,
  MoreHorizontal,
  Settings,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Save,
  Send,
  FileText,
  Copy,
  TrendingUp,
  Percent
} from 'lucide-react';

// Format currency
const formatCurrency = (amount, currency = 'EUR') => {
  const formatted = new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount || 0));
  return `${formatted} €`;
};

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Item types
const ITEM_TYPES = [
  { value: 'T', label: 'Totaal' },
  { value: 'Ts', label: 'Tussentotaal' },
  { value: 'M', label: 'Materiaal' },
  { value: 'P', label: 'Product' },
  { value: 'D', label: 'Dienst' },
];

// Units
const UNITS = [
  { value: 'm2', label: 'm²' },
  { value: 'm', label: 'm' },
  { value: 'stuk', label: 'stuk' },
  { value: 'uur', label: 'uur' },
  { value: 'dag', label: 'dag' },
  { value: 'vast', label: 'vaste prijs' },
  { value: 'kg', label: 'kg' },
  { value: 'liter', label: 'liter' },
];

// BTW rates
const BTW_RATES = [
  { value: 0, label: '0%' },
  { value: 9, label: '9%' },
  { value: 20, label: '20%' },
  { value: 21, label: '21%' },
];

const NieuweOffertePage = () => {
  const navigate = useNavigate();
  
  // State for quote items - hierarchical structure
  const [sections, setSections] = useState([
    {
      id: generateId(),
      type: 'T',
      name: '',
      expanded: true,
      items: []
    }
  ]);
  
  const [selectedItems, setSelectedItems] = useState([]);
  const [saving, setSaving] = useState(false);

  // Add new section
  const addSection = () => {
    setSections([...sections, {
      id: generateId(),
      type: 'T',
      name: '',
      expanded: true,
      items: []
    }]);
  };

  // Add item to section
  const addItemToSection = (sectionId) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: [...section.items, {
            id: generateId(),
            type: 'M',
            category: '',
            description: '',
            quantity: 1,
            unit: 'stuk',
            unitPrice: 0,
            btwRate: 20,
            isSubSection: false,
            subItems: []
          }]
        };
      }
      return section;
    }));
  };

  // Add sub-section (like Voorgevel under Buitenschilderwerk)
  const addSubSection = (sectionId) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: [...section.items, {
            id: generateId(),
            type: 'Ts',
            category: '',
            description: '',
            quantity: 0,
            unit: '',
            unitPrice: 0,
            btwRate: 20,
            isSubSection: true,
            expanded: true,
            subItems: []
          }]
        };
      }
      return section;
    }));
  };

  // Add item to sub-section
  const addItemToSubSection = (sectionId, subSectionId) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: section.items.map(item => {
            if (item.id === subSectionId && item.isSubSection) {
              return {
                ...item,
                subItems: [...item.subItems, {
                  id: generateId(),
                  type: 'M',
                  category: '',
                  description: '',
                  quantity: 1,
                  unit: 'stuk',
                  unitPrice: 0,
                  btwRate: 20
                }]
              };
            }
            return item;
          })
        };
      }
      return section;
    }));
  };

  // Update section
  const updateSection = (sectionId, field, value) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return { ...section, [field]: value };
      }
      return section;
    }));
  };

  // Update item in section
  const updateItem = (sectionId, itemId, field, value) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: section.items.map(item => {
            if (item.id === itemId) {
              return { ...item, [field]: value };
            }
            return item;
          })
        };
      }
      return section;
    }));
  };

  // Update sub-item
  const updateSubItem = (sectionId, subSectionId, subItemId, field, value) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: section.items.map(item => {
            if (item.id === subSectionId && item.isSubSection) {
              return {
                ...item,
                subItems: item.subItems.map(subItem => {
                  if (subItem.id === subItemId) {
                    return { ...subItem, [field]: value };
                  }
                  return subItem;
                })
              };
            }
            return item;
          })
        };
      }
      return section;
    }));
  };

  // Delete section
  const deleteSection = (sectionId) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  // Delete item
  const deleteItem = (sectionId, itemId) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: section.items.filter(item => item.id !== itemId)
        };
      }
      return section;
    }));
  };

  // Delete sub-item
  const deleteSubItem = (sectionId, subSectionId, subItemId) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: section.items.map(item => {
            if (item.id === subSectionId && item.isSubSection) {
              return {
                ...item,
                subItems: item.subItems.filter(si => si.id !== subItemId)
              };
            }
            return item;
          })
        };
      }
      return section;
    }));
  };

  // Toggle section expanded
  const toggleSection = (sectionId) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return { ...section, expanded: !section.expanded };
      }
      return section;
    }));
  };

  // Toggle sub-section expanded
  const toggleSubSection = (sectionId, subSectionId) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: section.items.map(item => {
            if (item.id === subSectionId && item.isSubSection) {
              return { ...item, expanded: !item.expanded };
            }
            return item;
          })
        };
      }
      return section;
    }));
  };

  // Calculate item total
  const calculateItemTotal = (item) => {
    return (item.quantity || 0) * (item.unitPrice || 0);
  };

  // Calculate sub-section total
  const calculateSubSectionTotal = (subSection) => {
    if (!subSection.subItems || subSection.subItems.length === 0) return 0;
    return subSection.subItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  // Calculate section total
  const calculateSectionTotal = (section) => {
    return section.items.reduce((sum, item) => {
      if (item.isSubSection) {
        return sum + calculateSubSectionTotal(item);
      }
      return sum + calculateItemTotal(item);
    }, 0);
  };

  // Calculate all totals
  const calculateTotals = useCallback(() => {
    let subtotalExclBTW = 0;
    let totalBTW = 0;

    sections.forEach(section => {
      section.items.forEach(item => {
        if (item.isSubSection) {
          item.subItems?.forEach(subItem => {
            const itemTotal = calculateItemTotal(subItem);
            subtotalExclBTW += itemTotal;
            totalBTW += itemTotal * (subItem.btwRate / 100);
          });
        } else {
          const itemTotal = calculateItemTotal(item);
          subtotalExclBTW += itemTotal;
          totalBTW += itemTotal * (item.btwRate / 100);
        }
      });
    });

    return {
      subtotalExclBTW,
      totalBTW,
      totalInclBTW: subtotalExclBTW + totalBTW
    };
  }, [sections]);

  const totals = calculateTotals();

  // Toggle item selection
  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Increase all prices by percentage
  const increasePrices = (percentage) => {
    const factor = 1 + (percentage / 100);
    setSections(sections.map(section => ({
      ...section,
      items: section.items.map(item => {
        if (item.isSubSection) {
          return {
            ...item,
            subItems: item.subItems.map(si => ({
              ...si,
              unitPrice: si.unitPrice * factor
            }))
          };
        }
        return {
          ...item,
          unitPrice: item.unitPrice * factor
        };
      })
    })));
    toast.success(`Prijzen verhoogd met ${percentage}%`);
  };

  // Save quote
  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Implement API call to save quote
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Offerte opgeslagen');
    } catch (error) {
      toast.error('Fout bij opslaan offerte');
    } finally {
      setSaving(false);
    }
  };

  // Render item row
  const renderItemRow = (sectionId, item, isSubItem = false, parentId = null) => {
    const itemTotal = calculateItemTotal(item);
    
    return (
      <tr 
        key={item.id}
        className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${isSubItem ? 'bg-gray-50/30' : ''}`}
      >
        <td className="px-3 py-2">
          <Checkbox 
            checked={selectedItems.includes(item.id)}
            onCheckedChange={() => toggleItemSelection(item.id)}
          />
        </td>
        <td className="px-2 py-2">
          <Select 
            value={item.type} 
            onValueChange={(value) => isSubItem 
              ? updateSubItem(sectionId, parentId, item.id, 'type', value)
              : updateItem(sectionId, item.id, 'type', value)
            }
          >
            <SelectTrigger className="w-16 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEM_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-2 py-2">
          <Input
            value={item.category}
            onChange={(e) => isSubItem 
              ? updateSubItem(sectionId, parentId, item.id, 'category', e.target.value)
              : updateItem(sectionId, item.id, 'category', e.target.value)
            }
            placeholder="Categorie"
            className="h-8 text-sm"
          />
        </td>
        <td className="px-2 py-2">
          <Input
            value={item.description}
            onChange={(e) => isSubItem 
              ? updateSubItem(sectionId, parentId, item.id, 'description', e.target.value)
              : updateItem(sectionId, item.id, 'description', e.target.value)
            }
            placeholder="Omschrijving"
            className="h-8 text-sm min-w-[200px]"
          />
        </td>
        <td className="px-2 py-2">
          <Input
            type="number"
            value={item.quantity}
            onChange={(e) => isSubItem 
              ? updateSubItem(sectionId, parentId, item.id, 'quantity', parseFloat(e.target.value) || 0)
              : updateItem(sectionId, item.id, 'quantity', parseFloat(e.target.value) || 0)
            }
            className="h-8 text-sm w-20 text-right"
          />
        </td>
        <td className="px-2 py-2">
          <Select 
            value={item.unit} 
            onValueChange={(value) => isSubItem 
              ? updateSubItem(sectionId, parentId, item.id, 'unit', value)
              : updateItem(sectionId, item.id, 'unit', value)
            }
          >
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map(unit => (
                <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-2 py-2">
          <Input
            type="number"
            step="0.01"
            value={item.unitPrice}
            onChange={(e) => isSubItem 
              ? updateSubItem(sectionId, parentId, item.id, 'unitPrice', parseFloat(e.target.value) || 0)
              : updateItem(sectionId, item.id, 'unitPrice', parseFloat(e.target.value) || 0)
            }
            className="h-8 text-sm w-24 text-right"
          />
        </td>
        <td className="px-2 py-2 text-right font-medium text-gray-900">
          {formatCurrency(itemTotal)}
        </td>
        <td className="px-2 py-2">
          <Select 
            value={item.btwRate.toString()} 
            onValueChange={(value) => isSubItem 
              ? updateSubItem(sectionId, parentId, item.id, 'btwRate', parseInt(value))
              : updateItem(sectionId, item.id, 'btwRate', parseInt(value))
            }
          >
            <SelectTrigger className="w-16 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BTW_RATES.map(rate => (
                <SelectItem key={rate.value} value={rate.value.toString()}>{rate.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-2 py-2">
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Copy className="w-4 h-4 mr-2" />
                  Dupliceren
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => isSubItem 
                ? deleteSubItem(sectionId, parentId, item.id)
                : deleteItem(sectionId, item.id)
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {!isSubItem && !item.isSubSection && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                onClick={() => addItemToSection(sectionId)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // Render sub-section
  const renderSubSection = (sectionId, subSection) => {
    const subTotal = calculateSubSectionTotal(subSection);
    
    return (
      <React.Fragment key={subSection.id}>
        {/* Sub-section header */}
        <tr className="bg-slate-100 border-b border-slate-200">
          <td className="px-3 py-2">
            <Checkbox 
              checked={selectedItems.includes(subSection.id)}
              onCheckedChange={() => toggleItemSelection(subSection.id)}
            />
          </td>
          <td className="px-2 py-2">
            <Select value={subSection.type} onValueChange={(value) => updateItem(sectionId, subSection.id, 'type', value)}>
              <SelectTrigger className="w-16 h-8 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>
          <td colSpan={5} className="px-2 py-2">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => toggleSubSection(sectionId, subSection.id)}
                className="text-gray-500 hover:text-gray-700"
              >
                {subSection.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <Input
                value={subSection.description}
                onChange={(e) => updateItem(sectionId, subSection.id, 'description', e.target.value)}
                placeholder="Naam subsectie (bijv. Voorgevel)"
                className="h-8 text-sm font-semibold bg-white"
              />
            </div>
          </td>
          <td className="px-2 py-2 text-right font-bold text-gray-900">
            {formatCurrency(subTotal)}
          </td>
          <td className="px-2 py-2"></td>
          <td className="px-2 py-2">
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Copy className="w-4 h-4 mr-2" />
                    Dupliceren
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => deleteItem(sectionId, subSection.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                onClick={() => addItemToSubSection(sectionId, subSection.id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </td>
        </tr>
        
        {/* Sub-section items */}
        {subSection.expanded && subSection.subItems?.map(subItem => 
          renderItemRow(sectionId, subItem, true, subSection.id)
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900" data-testid="nieuwe-offerte-page">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/app/boekhouding/verkoop')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Nieuwe offerte aanmaken</h1>
                <p className="text-sm text-slate-400">Maak een gedetailleerde offerte met secties en sub-items</p>
              </div>
            </div>
          </div>
          
          {/* Actions dropdown */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                  <Settings className="w-4 h-4 mr-2" />
                  Acties op de offerte
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => increasePrices(5)}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Verhoog verkoopprijs (+5%)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => increasePrices(10)}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Verhoog verkoopprijs (+10%)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => increasePrices(-5)}>
                  <Percent className="w-4 h-4 mr-2" />
                  Verlaag prijzen (-5%)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Opslaan...' : 'Opslaan'}
            </Button>
            
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="w-4 h-4 mr-2" />
              Versturen
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Quote Builder - Main Area */}
          <div className="col-span-9">
            {sections.map((section, sectionIndex) => (
              <Card 
                key={section.id} 
                className="mb-4 bg-white border border-gray-200 overflow-hidden"
                style={{
                  boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }}
              >
                {/* Section Header */}
                <div className="bg-slate-700 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <button 
                      onClick={() => toggleSection(section.id)}
                      className="text-slate-300 hover:text-white"
                    >
                      {section.expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    <Checkbox 
                      checked={selectedItems.includes(section.id)}
                      onCheckedChange={() => toggleItemSelection(section.id)}
                    />
                    <Select value={section.type} onValueChange={(value) => updateSection(section.id, 'type', value)}>
                      <SelectTrigger className="w-16 h-8 text-xs bg-slate-600 border-slate-500 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEM_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={section.name}
                      onChange={(e) => updateSection(section.id, 'name', e.target.value)}
                      placeholder="Naam sectie (bijv. Buitenschilderwerk)"
                      className="flex-1 h-8 bg-slate-600 border-slate-500 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white">
                      {formatCurrency(calculateSectionTotal(section))}
                    </span>
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-600">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" />
                            Dupliceren sectie
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-slate-600"
                        onClick={() => deleteSection(section.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-slate-600"
                        onClick={() => addSubSection(section.id)}
                        title="Subsectie toevoegen"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Section Content */}
                {section.expanded && (
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="w-10 px-3 py-2"></th>
                            <th className="text-left px-2 py-2 text-xs font-medium text-gray-600 uppercase tracking-wide">Type</th>
                            <th className="text-left px-2 py-2 text-xs font-medium text-gray-600 uppercase tracking-wide">Categorie</th>
                            <th className="text-left px-2 py-2 text-xs font-medium text-gray-600 uppercase tracking-wide">Omschrijving</th>
                            <th className="text-right px-2 py-2 text-xs font-medium text-gray-600 uppercase tracking-wide">HVH</th>
                            <th className="text-left px-2 py-2 text-xs font-medium text-gray-600 uppercase tracking-wide">Eenheid</th>
                            <th className="text-right px-2 py-2 text-xs font-medium text-gray-600 uppercase tracking-wide">EP (€)</th>
                            <th className="text-right px-2 py-2 text-xs font-medium text-gray-600 uppercase tracking-wide">Totaal (€)</th>
                            <th className="text-left px-2 py-2 text-xs font-medium text-gray-600 uppercase tracking-wide">BTW</th>
                            <th className="w-28 px-2 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.items.map(item => 
                            item.isSubSection 
                              ? renderSubSection(section.id, item)
                              : renderItemRow(section.id, item)
                          )}
                          
                          {/* Empty state / Add first item */}
                          {section.items.length === 0 && (
                            <tr>
                              <td colSpan={10} className="px-4 py-8 text-center">
                                <div className="flex flex-col items-center gap-3">
                                  <FileText className="w-10 h-10 text-gray-300" />
                                  <p className="text-gray-500">Nog geen items toegevoegd</p>
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => addSubSection(section.id)}
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Subsectie toevoegen
                                    </Button>
                                    <Button 
                                      size="sm"
                                      className="bg-emerald-600 hover:bg-emerald-700"
                                      onClick={() => addItemToSection(section.id)}
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Item toevoegen
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Add buttons at bottom */}
                    {section.items.length > 0 && (
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => addSubSection(section.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Subsectie
                        </Button>
                        <Button 
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => addItemToSection(section.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Item
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}

            {/* Add new section button */}
            <Button 
              variant="outline" 
              className="w-full border-dashed border-2 border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800"
              onClick={addSection}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe sectie toevoegen
            </Button>
          </div>

          {/* Summary Panel */}
          <div className="col-span-3">
            <Card 
              className="sticky top-6 bg-white border border-gray-200"
              style={{
                boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }}
            >
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-600" />
                  Samenvatting
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Subtotaal Excl. BTW</span>
                    <span className="font-medium text-gray-900">{formatCurrency(totals.subtotalExclBTW)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">BTW</span>
                    <span className="font-medium text-gray-900">{formatCurrency(totals.totalBTW)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 bg-emerald-50 -mx-5 px-5 rounded-lg mt-4">
                    <span className="font-semibold text-gray-900">Totaal te betalen incl. BTW</span>
                    <span className="text-xl font-bold text-emerald-600">{formatCurrency(totals.totalInclBTW)}</span>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Offerte statistieken</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">{sections.length}</p>
                      <p className="text-xs text-gray-500">Secties</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {sections.reduce((sum, s) => {
                          let count = s.items.filter(i => !i.isSubSection).length;
                          s.items.filter(i => i.isSubSection).forEach(sub => {
                            count += sub.subItems?.length || 0;
                          });
                          return sum + count;
                        }, 0)}
                      </p>
                      <p className="text-xs text-gray-500">Items</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NieuweOffertePage;
