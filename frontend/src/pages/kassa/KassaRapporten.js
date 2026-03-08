import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKassaAuth } from '../../context/KassaAuthContext';
import { reportsAPI, ordersAPI } from '../../lib/kassaApi';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { 
  ArrowLeft, BarChart3, TrendingUp, ShoppingCart, CreditCard, 
  Banknote, QrCode, Package, AlertTriangle, Loader2, Calendar
} from 'lucide-react';

const formatCurrency = (amount) => `SRD ${new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2 }).format(amount || 0)}`;

export default function KassaRapporten() {
  const navigate = useNavigate();
  const { business } = useKassaAuth();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyReport, setDailyReport] = useState(null);
  const [inventoryReport, setInventoryReport] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('dagelijks');

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [daily, inventory, orders] = await Promise.all([
        reportsAPI.daily(selectedDate),
        reportsAPI.inventory(),
        ordersAPI.getAll(selectedDate, selectedDate)
      ]);
      setDailyReport(daily);
      setInventoryReport(inventory);
      setRecentOrders(orders);
    } catch (error) {
      toast.error('Fout bij laden rapporten');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'cash': return <Banknote className="w-4 h-4" />;
      case 'pin': return <CreditCard className="w-4 h-4" />;
      case 'qr': return <QrCode className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/kassa/pos')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug naar Kassa
            </Button>
            <div>
              <h1 className="text-xl font-bold">Rapporten</h1>
              <p className="text-sm text-gray-500">{business?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </header>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="dagelijks">
                <BarChart3 className="w-4 h-4 mr-2" />
                Dagelijks Overzicht
              </TabsTrigger>
              <TabsTrigger value="transacties">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Transacties
              </TabsTrigger>
              <TabsTrigger value="voorraad">
                <Package className="w-4 h-4 mr-2" />
                Voorraad
              </TabsTrigger>
            </TabsList>

            {/* Daily Overview */}
            <TabsContent value="dagelijks" className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">Totaal Omzet</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(dailyReport?.total_sales)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <ShoppingCart className="w-4 h-4" />
                      <span className="text-sm">Transacties</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {dailyReport?.total_orders || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <BarChart3 className="w-4 h-4" />
                      <span className="text-sm">Gem. per Bon</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(dailyReport?.average_order)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm">BTW</span>
                    </div>
                    <div className="text-2xl font-bold text-amber-600">
                      {formatCurrency(dailyReport?.total_btw)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Payment Methods */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Betaalmethodes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dailyReport?.payment_methods && Object.entries(dailyReport.payment_methods).map(([method, data]) => (
                        <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getPaymentIcon(method)}
                            <div>
                              <div className="font-medium capitalize">{method === 'cash' ? 'Contant' : method === 'pin' ? 'PIN' : 'QR'}</div>
                              <div className="text-sm text-gray-500">{data.count} transacties</div>
                            </div>
                          </div>
                          <div className="text-right font-medium">
                            {formatCurrency(data.total)}
                          </div>
                        </div>
                      ))}
                      {(!dailyReport?.payment_methods || Object.keys(dailyReport.payment_methods).length === 0) && (
                        <p className="text-center text-gray-500 py-4">Geen transacties vandaag</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Products */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top Producten</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dailyReport?.top_products?.slice(0, 5).map((product, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </span>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-500">{product.quantity}x verkocht</div>
                            </div>
                          </div>
                          <div className="font-medium">
                            {formatCurrency(product.revenue)}
                          </div>
                        </div>
                      ))}
                      {(!dailyReport?.top_products || dailyReport.top_products.length === 0) && (
                        <p className="text-center text-gray-500 py-4">Geen verkoop vandaag</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Transactions */}
            <TabsContent value="transacties">
              <Card>
                <CardHeader>
                  <CardTitle>Transacties op {selectedDate}</CardTitle>
                  <CardDescription>{recentOrders.length} transacties</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bonnummer</TableHead>
                        <TableHead>Tijd</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Betaalmethode</TableHead>
                        <TableHead className="text-right">Totaal</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono">{order.order_number}</TableCell>
                          <TableCell>{new Date(order.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                          <TableCell>{order.items?.length || 0} items</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getPaymentIcon(order.payment_method)}
                              <span className="capitalize">{order.payment_method === 'cash' ? 'Contant' : order.payment_method}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell>
                          <TableCell>
                            <Badge variant={order.status === 'completed' ? 'default' : 'destructive'}>
                              {order.status === 'completed' ? 'Voltooid' : 'Geretourneerd'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {recentOrders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            Geen transacties op deze datum
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventory */}
            <TabsContent value="voorraad" className="space-y-6">
              {/* Inventory Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500 mb-1">Totaal Producten</div>
                    <div className="text-2xl font-bold">{inventoryReport?.total_products || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500 mb-1">Voorraadwaarde</div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(inventoryReport?.total_inventory_value)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50">
                  <CardContent className="p-4">
                    <div className="text-sm text-amber-700 mb-1">Lage Voorraad</div>
                    <div className="text-2xl font-bold text-amber-700">
                      {inventoryReport?.low_stock_count || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-red-50">
                  <CardContent className="p-4">
                    <div className="text-sm text-red-700 mb-1">Uitverkocht</div>
                    <div className="text-2xl font-bold text-red-700">
                      {inventoryReport?.out_of_stock_count || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Low Stock Items */}
              {inventoryReport?.low_stock_items?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="w-5 h-5" />
                      Lage Voorraad Alert
                    </CardTitle>
                    <CardDescription>Deze producten moeten worden bijbesteld</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Huidige Voorraad</TableHead>
                          <TableHead className="text-right">Prijs</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryReport.low_stock_items.map(product => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={product.stock_quantity <= 0 ? 'destructive' : 'warning'}>
                                {product.stock_quantity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
