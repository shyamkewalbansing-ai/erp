import { useState, useEffect } from 'react';
import { getInvoices, formatCurrency } from '../lib/api';
import { toast } from 'sonner';
import { 
  FileText, 
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Building2,
  TrendingUp,
  TrendingDown,
  Filter,
  Wrench,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Card, CardContent } from '../components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';

export default function Facturen() {
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({
    total_invoices: 0,
    paid: 0,
    partial: 0,
    unpaid: 0,
    total_amount: 0,
    paid_amount: 0,
    unpaid_amount: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await getInvoices();
      setInvoices(response.data.invoices);
      setSummary(response.data.summary);
    } catch (error) {
      toast.error('Fout bij laden facturen');
    } finally {
      setLoading(false);
    }
  };

  // Get unique years from invoices
  const years = [...new Set(invoices.map(inv => inv.year))].sort((a, b) => b - a);

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
      invoice.apartment_name.toLowerCase().includes(search.toLowerCase()) ||
      invoice.period_label.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesYear = yearFilter === 'all' || invoice.year.toString() === yearFilter;
    
    return matchesSearch && matchesStatus && matchesYear;
  });

  // Calculate filtered summary
  const filteredSummary = {
    total: filteredInvoices.length,
    paid: filteredInvoices.filter(i => i.status === 'paid').length,
    partial: filteredInvoices.filter(i => i.status === 'partial').length,
    unpaid: filteredInvoices.filter(i => i.status === 'unpaid').length,
    paidAmount: filteredInvoices.reduce((sum, i) => sum + i.amount_paid, 0),
    unpaidAmount: filteredInvoices.reduce((sum, i) => sum + i.remaining, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="facturen-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" />
            Facturen
          </h1>
          <p className="text-muted-foreground mt-1">
            Overzicht van alle huur-facturen
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totaal Facturen</p>
                <p className="text-2xl font-bold text-foreground">{summary.total_invoices}</p>
              </div>
              <FileText className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Volledig Betaald</p>
                <p className="text-2xl font-bold text-green-600">{summary.paid}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gedeeltelijk</p>
                <p className="text-2xl font-bold text-blue-600">{summary.partial || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Openstaand</p>
                <p className="text-2xl font-bold text-orange-600">{summary.unpaid}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nog te Ontvangen</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.unpaid_amount)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Zoek op huurder, appartement of periode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="invoice-search"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="invoice-status-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle status</SelectItem>
            <SelectItem value="paid">Volledig Betaald</SelectItem>
            <SelectItem value="partial">Gedeeltelijk</SelectItem>
            <SelectItem value="unpaid">Openstaand</SelectItem>
          </SelectContent>
        </Select>

        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[140px]" data-testid="invoice-year-filter">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Jaar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle jaren</SelectItem>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtered Summary */}
      {(search || statusFilter !== 'all' || yearFilter !== 'all') && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <span className="text-muted-foreground">Gefilterd: </span>
          <span className="font-medium">{filteredSummary.total} facturen</span>
          <span className="text-muted-foreground"> • </span>
          <span className="text-green-600">{filteredSummary.paid} betaald</span>
          <span className="text-muted-foreground"> • </span>
          <span className="text-blue-600">{filteredSummary.partial} gedeeltelijk</span>
          <span className="text-muted-foreground"> • </span>
          <span className="text-orange-600">{filteredSummary.unpaid} openstaand ({formatCurrency(filteredSummary.unpaidAmount)})</span>
        </div>
      )}

      {/* Invoices Table */}
      {filteredInvoices.length > 0 ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Huurder</TableHead>
                <TableHead>Appartement</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead className="text-right">Huur</TableHead>
                <TableHead className="text-right">Onderhoud</TableHead>
                <TableHead className="text-right">Totaal</TableHead>
                <TableHead className="text-right">Betaald</TableHead>
                <TableHead className="text-right">Openstaand</TableHead>
                <TableHead className="text-right">Totaal Schuld</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <>
                <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`} className={invoice.maintenance_cost > 0 ? 'bg-amber-50/50' : ''}>
                  <TableCell className="p-1">
                    {invoice.maintenance_items?.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)}
                      >
                        {expandedInvoice === invoice.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{invoice.tenant_name}</p>
                        {invoice.tenant_phone && (
                          <p className="text-xs text-muted-foreground">{invoice.tenant_phone}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      {invoice.apartment_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {invoice.period_label}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(invoice.rent_amount || invoice.amount_due)}
                  </TableCell>
                  <TableCell className="text-right">
                    {invoice.maintenance_cost > 0 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-amber-600 font-medium cursor-help flex items-center justify-end gap-1">
                              <Wrench className="w-3 h-3" />
                              {formatCurrency(invoice.maintenance_cost)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">Onderhoudskosten huurder</p>
                            {invoice.maintenance_items?.map((item, i) => (
                              <p key={i} className="text-xs">{item.category}: {item.description} - {formatCurrency(item.cost)}</p>
                            ))}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(invoice.amount_due)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={invoice.amount_paid > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                      {formatCurrency(invoice.amount_paid)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={invoice.remaining > 0 ? "text-orange-600 font-medium" : "text-green-600"}>
                      {formatCurrency(invoice.remaining)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {invoice.cumulative_balance > 0 ? (
                      <span className="text-red-600 font-bold">
                        {formatCurrency(invoice.cumulative_balance)}
                      </span>
                    ) : (
                      <span className="text-green-600">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {invoice.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800" data-testid={`invoice-status-${invoice.id}`}>
                        <CheckCircle2 className="w-3 h-3" />
                        Betaald
                      </span>
                    ) : invoice.status === 'partial' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800" data-testid={`invoice-status-${invoice.id}`}>
                        <AlertCircle className="w-3 h-3" />
                        Gedeeltelijk
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800" data-testid={`invoice-status-${invoice.id}`}>
                        <AlertCircle className="w-3 h-3" />
                        Openstaand
                      </span>
                    )}
                  </TableCell>
                </TableRow>
                {/* Expanded maintenance details row */}
                {expandedInvoice === invoice.id && invoice.maintenance_items?.length > 0 && (
                  <TableRow className="bg-amber-50">
                    <TableCell colSpan={11} className="py-2">
                      <div className="pl-8">
                        <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          Onderhoudskosten voor huurder:
                        </p>
                        <div className="space-y-1">
                          {invoice.maintenance_items.map((item, i) => (
                            <div key={i} className="flex justify-between text-xs bg-white rounded px-2 py-1 border border-amber-200">
                              <span>
                                <span className="font-medium text-amber-700">{item.category}</span>
                                {item.description && <span className="text-muted-foreground"> - {item.description}</span>}
                                <span className="text-muted-foreground ml-2">({item.date})</span>
                              </span>
                              <span className="font-semibold text-amber-800">{formatCurrency(item.cost)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Geen facturen gevonden</h3>
          <p className="text-muted-foreground">
            {search || statusFilter !== 'all' || yearFilter !== 'all'
              ? 'Probeer andere filters'
              : 'Er zijn nog geen huurders met appartementen'}
          </p>
        </div>
      )}

      {/* Outstanding Summary by Tenant */}
      {(summary.unpaid > 0 || summary.partial > 0) && statusFilter !== 'paid' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-orange-800 flex items-center gap-2 mb-3">
              <TrendingDown className="w-5 h-5" />
              Openstaande Saldi per Huurder
            </h3>
            <div className="space-y-2">
              {Object.entries(
                filteredInvoices
                  .filter(i => i.status === 'unpaid' || i.status === 'partial')
                  .reduce((acc, inv) => {
                    if (!acc[inv.tenant_name]) {
                      acc[inv.tenant_name] = { 
                        count: 0, 
                        totalRemaining: 0, 
                        apartment: inv.apartment_name,
                        latestBalance: 0
                      };
                    }
                    acc[inv.tenant_name].count++;
                    acc[inv.tenant_name].totalRemaining += inv.remaining;
                    // Keep track of the latest (highest) cumulative balance
                    if (inv.cumulative_balance > acc[inv.tenant_name].latestBalance) {
                      acc[inv.tenant_name].latestBalance = inv.cumulative_balance;
                    }
                    return acc;
                  }, {})
              ).map(([tenant, data]) => (
                <div key={tenant} className="flex items-center justify-between text-sm bg-white rounded p-2">
                  <div>
                    <span className="font-medium text-orange-900">{tenant}</span>
                    <span className="text-orange-600 ml-2">({data.apartment})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-red-600">{formatCurrency(data.latestBalance)}</span>
                    <span className="text-orange-600 text-xs ml-2">({data.count} factuur{data.count > 1 ? 'en' : ''})</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
