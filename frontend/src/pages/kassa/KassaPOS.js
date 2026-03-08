import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useKassaAuth } from '../../context/KassaAuthContext';
import { productsAPI, categoriesAPI, ordersAPI } from '../../lib/kassaApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { 
  Search, RotateCcw, Grid3X3, Receipt, Trash2, X, Loader2,
  CreditCard, Banknote, QrCode, Check, Printer, Settings, LogOut,
  Package, BarChart3, User, Clock, Calculator, Menu
} from 'lucide-react';

const formatPrice = (amount) => {
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

export default function KassaPOS() {
  const { user, business, logout } = useKassaAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [lastOrder, setLastOrder] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const btw_percentage = business?.btw_percentage || 8;

  // Product images mapping
  const productImages = {
    'flat white': 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=300&h=300&fit=crop',
    'cappuccino': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=300&h=300&fit=crop',
    'americano': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&h=300&fit=crop',
    'espresso': 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=300&h=300&fit=crop',
    'latte': 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=300&h=300&fit=crop',
    'macchiato': 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=300&h=300&fit=crop',
    'croissant': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&h=300&fit=crop',
    'muffin': 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=300&h=300&fit=crop',
    'apple crumble': 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=300&h=300&fit=crop',
    'fruitcake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=300&fit=crop',
    'smoothie': 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=300&h=300&fit=crop',
    'sinaasappelsap': 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=300&h=300&fit=crop',
    'water': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=300&fit=crop',
    'cola': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&h=300&fit=crop',
    'koffie': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&h=300&fit=crop',
    'thee': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300&h=300&fit=crop',
    'default': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop'
  };

  const getProductImage = (name) => {
    const lowerName = name.toLowerCase();
    for (const [key, url] of Object.entries(productImages)) {
      if (lowerName.includes(key)) return url;
    }
    return productImages.default;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prods, cats] = await Promise.all([
        productsAPI.getAll(),
        categoriesAPI.getAll()
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (error) {
      toast.error('Fout bij laden');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [products, selectedCategory, searchQuery]);

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
  }, []);

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

  const clearCart = () => setCart([]);

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const btw = subtotal * (btw_percentage / 100);
    const total = subtotal + btw;
    return { subtotal, btw, total, items: cart.reduce((s, i) => s + i.quantity, 0) };
  }, [cart, btw_percentage]);

  const processPayment = async () => {
    if (cart.length === 0) return;
    const paid = parseFloat(amountPaid) || cartTotals.total;
    if (paymentMethod === 'cash' && paid < cartTotals.total) {
      toast.error('Onvoldoende betaling');
      return;
    }
    setProcessing(true);
    try {
      const order = await ordersAPI.create({
        items: cart,
        customer_id: null,
        payment_method: paymentMethod,
        amount_paid: paid,
        discount_total: 0
      });
      setLastOrder(order);
      setShowPaymentModal(false);
      setShowReceiptModal(true);
      setCart([]);
      setAmountPaid('');
      toast.success('Verkoop voltooid!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const currentTime = new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });

  if (loading) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden" data-testid="kassa-pos">
      {/* LEFT: Cart/Receipt Panel */}
      <div className="w-64 bg-white flex flex-col border-r">
        {/* Cart Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800">Huidige Bestelling</h2>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-red-500 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">{cartTotals.items} artikelen</p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Receipt className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Geen artikelen</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product_id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-800 flex-1 pr-2">
                      {item.product_name}
                    </span>
                    <button 
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateQuantity(item.product_id, -1)}
                        className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600"
                      >
                        -
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product_id, 1)}
                        className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-semibold">
                      SRD {formatPrice(item.quantity * item.unit_price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="border-t p-4 bg-gray-50">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotaal</span>
              <span>SRD {formatPrice(cartTotals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">BTW ({btw_percentage}%)</span>
              <span>SRD {formatPrice(cartTotals.btw)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Totaal</span>
              <span className="text-blue-600">SRD {formatPrice(cartTotals.total)}</span>
            </div>
          </div>
          
          <button
            onClick={() => { setAmountPaid(cartTotals.total.toFixed(2)); setShowPaymentModal(true); }}
            disabled={cart.length === 0}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-semibold transition-colors"
          >
            Afrekenen
          </button>
        </div>
      </div>

      {/* CENTER: Products Grid */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-xl text-gray-800">{business?.name || 'POS'}</h1>
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {currentTime} • {currentDate}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg" title="Ververs">
              <RotateCcw className="w-5 h-5 text-gray-500" />
            </button>
            <button 
              onClick={() => window.location.href = '/kassa/producten'}
              className="p-2 hover:bg-gray-100 rounded-lg text-blue-600" 
              title="Producten"
            >
              <Package className="w-5 h-5" />
            </button>
            <button 
              onClick={() => window.location.href = '/kassa/rapporten'}
              className="p-2 bg-blue-600 text-white rounded-lg" 
              title="Rapporten"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 p-4 overflow-auto">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg mb-2">Geen producten gevonden</p>
                <button 
                  onClick={() => window.location.href = '/kassa/producten'}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Producten toevoegen
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {filteredProducts.map(product => {
                const inCart = cart.find(item => item.product_id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 aspect-square"
                    data-testid={`product-${product.id}`}
                  >
                    {/* Product Image */}
                    <img
                      src={product.image_url || getProductImage(product.name)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.target.src = productImages.default; }}
                    />
                    
                    {/* Product Name - Vertical on left */}
                    <div className="absolute top-3 left-0 bg-white/95 backdrop-blur-sm rounded-r-lg px-2 py-1">
                      <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">
                        {product.name}
                      </span>
                    </div>

                    {/* Price - Bottom */}
                    <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1">
                      <span className="text-sm font-bold text-gray-900">
                        SRD {formatPrice(product.price)}
                      </span>
                    </div>

                    {/* Cart Badge */}
                    {inCart && (
                      <div className="absolute top-3 right-3 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                        {inCart.quantity}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="bg-white border-t px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.location.href = '/kassa/instellingen'}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={logout}
              className="p-2 hover:bg-red-50 rounded-lg text-red-500"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Categories Panel */}
      <div className="w-48 bg-white border-l flex flex-col">
        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek producten..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1 p-3 space-y-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full py-3 px-4 rounded-xl text-left font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Alles
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full py-3 px-4 rounded-xl text-left font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              <span className="text-3xl font-bold">SRD {formatPrice(cartTotals.total)}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'cash', icon: Banknote, label: 'Contant' },
                { id: 'pin', icon: CreditCard, label: 'PIN' },
                { id: 'qr', icon: QrCode, label: 'QR' }
              ].map(method => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    paymentMethod === method.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <method.icon className={`w-7 h-7 ${paymentMethod === method.id ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${paymentMethod === method.id ? 'text-blue-700' : 'text-gray-600'}`}>
                    {method.label}
                  </span>
                </button>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Ontvangen bedrag</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full px-4 py-3 text-2xl text-center font-bold border-2 rounded-xl focus:outline-none focus:border-blue-600"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[20, 50, 100, 200].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setAmountPaid(amt.toString())}
                      className="py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
                {parseFloat(amountPaid) >= cartTotals.total && (
                  <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-sm text-green-600 mb-1">Wisselgeld</p>
                    <p className="text-2xl font-bold text-green-700">
                      SRD {formatPrice(parseFloat(amountPaid) - cartTotals.total)}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">
              Annuleren
            </Button>
            <Button 
              onClick={processPayment}
              disabled={processing || (paymentMethod === 'cash' && parseFloat(amountPaid) < cartTotals.total)}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Bevestigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-sm">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Betaling Geslaagd!</h2>
            {lastOrder && (
              <>
                <p className="text-gray-500 text-sm mb-4">#{lastOrder.order_number}</p>
                <p className="text-3xl font-bold text-blue-600 mb-2">SRD {formatPrice(lastOrder.total)}</p>
                {lastOrder.change > 0 && (
                  <p className="text-green-600">Wisselgeld: SRD {formatPrice(lastOrder.change)}</p>
                )}
              </>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Bon
            </Button>
            <Button onClick={() => setShowReceiptModal(false)} className="flex-1 bg-blue-600 hover:bg-blue-700">
              Nieuwe Verkoop
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
