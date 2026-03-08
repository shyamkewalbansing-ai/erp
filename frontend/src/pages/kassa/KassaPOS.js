import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useKassaAuth } from '../../context/KassaAuthContext';
import { productsAPI, categoriesAPI, ordersAPI, customersAPI } from '../../lib/kassaApi';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  Search, Grid3X3, List, Plus, Minus, Trash2, CreditCard, Banknote, 
  QrCode, Receipt, User, Settings, LogOut, BarChart3, Package,
  Users, ShoppingCart, X, Check, Loader2, Printer, Tag
} from 'lucide-react';

const formatCurrency = (amount) => {
  return `SRD ${new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0)}`;
};

export default function KassaPOS() {
  const { user, business, logout } = useKassaAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [lastOrder, setLastOrder] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const searchRef = useRef(null);

  const btw_percentage = business?.btw_percentage || 8;

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prods, cats, custs] = await Promise.all([
        productsAPI.getAll(),
        categoriesAPI.getAll(),
        customersAPI.getAll()
      ]);
      setProducts(prods);
      setCategories([{ id: null, name: 'Alles', color: '#1f2937' }, ...cats]);
      setCustomers(custs);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.includes(query)) ||
        (p.sku && p.sku.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [products, selectedCategory, searchQuery]);

  // Cart functions
  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        discount: 0
      }];
    });
    
    // Play sound
    if (business?.settings?.sound_enabled !== false) {
      const audio = new Audio('/beep.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  }, [business]);

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  // Calculate totals
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price - item.discount), 0);
    const btw = subtotal * (btw_percentage / 100);
    const total = subtotal + btw;
    return { subtotal, btw, total };
  }, [cart, btw_percentage]);

  // Handle barcode scan
  const handleBarcodeSearch = async (e) => {
    if (e.key === 'Enter' && searchQuery) {
      try {
        const product = await productsAPI.getByBarcode(searchQuery);
        addToCart(product);
        setSearchQuery('');
      } catch {
        // Not a barcode, keep as search
      }
    }
  };

  // Process payment
  const processPayment = async () => {
    if (cart.length === 0) return;
    
    const paid = parseFloat(amountPaid) || 0;
    if (paymentMethod === 'cash' && paid < cartTotals.total) {
      toast.error('Onvoldoende betaling');
      return;
    }

    setProcessing(true);
    try {
      const order = await ordersAPI.create({
        items: cart,
        customer_id: selectedCustomer?.id || null,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === 'cash' ? paid : cartTotals.total,
        discount_total: 0,
        notes: null
      });
      
      setLastOrder(order);
      setShowPaymentModal(false);
      setShowReceiptModal(true);
      clearCart();
      setAmountPaid('');
      toast.success('Verkoop voltooid!');
      
    } catch (error) {
      toast.error(error.message || 'Fout bij verwerken');
    } finally {
      setProcessing(false);
    }
  };

  // Quick amount buttons
  const quickAmounts = [10, 20, 50, 100, 200, 500];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden" data-testid="kassa-pos">
      {/* Top Bar */}
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900">{business?.name || 'Kassa'}</h1>
          <Badge variant="outline" className="hidden sm:flex">
            {user?.name}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/kassa/producten'}>
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Producten</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/kassa/rapporten'}>
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Rapporten</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/kassa/instellingen'}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={logout} className="text-red-600">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Products Section - Left */}
        <div className="flex-1 flex flex-col bg-white border-r overflow-hidden">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 p-3 border-b overflow-x-auto shrink-0">
            {categories.map(cat => (
              <Button
                key={cat.id || 'all'}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                className="shrink-0"
                style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
                onClick={() => setSelectedCategory(cat.id)}
                data-testid={`category-${cat.id || 'all'}`}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleBarcodeSearch}
                placeholder="Zoek product of scan barcode..."
                className="pl-10"
                data-testid="search-input"
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-auto p-3">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Geen producten gevonden</p>
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={() => window.location.href = '/kassa/producten'}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Product Toevoegen
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredProducts.map(product => {
                  const inCart = cart.find(item => item.product_id === product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={`relative p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                        inCart ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      data-testid={`product-${product.id}`}
                    >
                      {inCart && (
                        <Badge className="absolute -top-2 -right-2 bg-emerald-500">
                          {inCart.quantity}
                        </Badge>
                      )}
                      {product.stock_quantity <= 5 && product.track_stock && (
                        <Badge variant="outline" className="absolute top-1 left-1 text-xs bg-amber-50 text-amber-700 border-amber-200">
                          {product.stock_quantity <= 0 ? 'Op' : product.stock_quantity}
                        </Badge>
                      )}
                      <div className="font-medium text-gray-900 text-sm line-clamp-2 min-h-[2.5rem]">
                        {product.name}
                      </div>
                      <div className="text-lg font-bold text-gray-900 mt-2">
                        {formatCurrency(product.price)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart Section - Right */}
        <div className="w-80 lg:w-96 bg-gray-50 flex flex-col shrink-0">
          {/* Cart Header */}
          <div className="p-3 border-b bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-medium">{cart.length} items</span>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Customer Selection */}
          <div className="p-3 border-b bg-white shrink-0">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setShowCustomerModal(true)}
            >
              <User className="w-4 h-4 mr-2" />
              {selectedCustomer ? selectedCustomer.name : 'Selecteer klant'}
              {selectedCustomer && (
                <Badge variant="secondary" className="ml-auto">
                  {selectedCustomer.loyalty_points} pts
                </Badge>
              )}
            </Button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Winkelwagen is leeg</p>
              </div>
            ) : (
              <div className="divide-y">
                {cart.map(item => (
                  <div key={item.product_id} className="p-3 bg-white flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.product_name}</div>
                      <div className="text-gray-500 text-xs">{formatCurrency(item.unit_price)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product_id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product_id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="w-20 text-right font-medium">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-red-500 shrink-0"
                      onClick={() => removeFromCart(item.product_id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Totals */}
          <div className="border-t bg-white p-4 shrink-0 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotaal</span>
              <span>{formatCurrency(cartTotals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>BTW ({btw_percentage}%)</span>
              <span>{formatCurrency(cartTotals.btw)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t">
              <span>Totaal</span>
              <span>{formatCurrency(cartTotals.total)}</span>
            </div>
          </div>

          {/* Charge Button */}
          <div className="p-3 bg-white border-t shrink-0">
            <Button 
              className="w-full h-14 text-lg bg-gray-900 hover:bg-gray-800"
              disabled={cart.length === 0}
              onClick={() => {
                setAmountPaid(cartTotals.total.toFixed(2));
                setShowPaymentModal(true);
              }}
              data-testid="charge-btn"
            >
              Afrekenen {formatCurrency(cartTotals.total)}
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Betaling - {formatCurrency(cartTotals.total)}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Payment Method */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('cash')}
                className="h-16 flex-col"
              >
                <Banknote className="w-6 h-6 mb-1" />
                Contant
              </Button>
              <Button
                variant={paymentMethod === 'pin' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('pin')}
                className="h-16 flex-col"
              >
                <CreditCard className="w-6 h-6 mb-1" />
                PIN
              </Button>
              <Button
                variant={paymentMethod === 'qr' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('qr')}
                className="h-16 flex-col"
              >
                <QrCode className="w-6 h-6 mb-1" />
                QR
              </Button>
            </div>

            {/* Amount Input (for cash) */}
            {paymentMethod === 'cash' && (
              <>
                <div>
                  <label className="text-sm font-medium">Ontvangen bedrag</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="text-2xl h-14 text-center font-bold"
                    autoFocus
                  />
                </div>
                
                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map(amount => (
                    <Button
                      key={amount}
                      variant="outline"
                      onClick={() => setAmountPaid(amount.toString())}
                    >
                      {formatCurrency(amount)}
                    </Button>
                  ))}
                </div>

                {/* Change Calculation */}
                {parseFloat(amountPaid) >= cartTotals.total && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-sm text-green-700">Wisselgeld</div>
                    <div className="text-2xl font-bold text-green-700">
                      {formatCurrency(parseFloat(amountPaid) - cartTotals.total)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={processPayment} 
              disabled={processing || (paymentMethod === 'cash' && parseFloat(amountPaid) < cartTotals.total)}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Betaling Bevestigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Modal */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecteer Klant</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <Input placeholder="Zoek klant..." />
            
            <div className="max-h-64 overflow-auto divide-y">
              <button
                className="w-full p-3 text-left hover:bg-gray-50 flex items-center gap-3"
                onClick={() => { setSelectedCustomer(null); setShowCustomerModal(false); }}
              >
                <User className="w-8 h-8 p-1.5 bg-gray-100 rounded-full" />
                <span className="text-gray-500">Geen klant (loopklant)</span>
              </button>
              {customers.map(customer => (
                <button
                  key={customer.id}
                  className="w-full p-3 text-left hover:bg-gray-50 flex items-center gap-3"
                  onClick={() => { setSelectedCustomer(customer); setShowCustomerModal(false); }}
                >
                  <User className="w-8 h-8 p-1.5 bg-emerald-100 text-emerald-700 rounded-full" />
                  <div className="flex-1">
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.phone || customer.email}</div>
                  </div>
                  <Badge variant="secondary">{customer.loyalty_points} pts</Badge>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Verkoop Voltooid!</DialogTitle>
          </DialogHeader>
          
          {lastOrder && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-500">Bonnummer</div>
                <div className="text-xl font-bold">{lastOrder.order_number}</div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotaal</span>
                  <span>{formatCurrency(lastOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>BTW ({lastOrder.btw_percentage}%)</span>
                  <span>{formatCurrency(lastOrder.btw_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Totaal</span>
                  <span>{formatCurrency(lastOrder.total)}</span>
                </div>
                {lastOrder.change > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Wisselgeld</span>
                    <span>{formatCurrency(lastOrder.change)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2">
            <Button variant="outline" className="w-full">
              <Printer className="w-4 h-4 mr-2" />
              Bon Printen
            </Button>
            <Button className="w-full" onClick={() => setShowReceiptModal(false)}>
              Nieuwe Verkoop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
