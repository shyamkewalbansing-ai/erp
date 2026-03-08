import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useKassaAuth } from '../../context/KassaAuthContext';
import { productsAPI, categoriesAPI, ordersAPI } from '../../lib/kassaApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { 
  Search, RotateCcw, Receipt, Trash2, X, Loader2,
  CreditCard, Banknote, QrCode, Check, Printer, Settings, LogOut,
  Package, BarChart3, Clock, User, ShoppingCart
} from 'lucide-react';

const formatPrice = (amount) => {
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

// Product images mapping for demo
const productImages = {
  'flat white': 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400&h=400&fit=crop',
  'cappuccino': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=400&fit=crop',
  'americano': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop',
  'espresso': 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&h=400&fit=crop',
  'caffe macchiato': 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400&h=400&fit=crop',
  'latte': 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=400&h=400&fit=crop',
  'croissant': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop',
  'muffin': 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&h=400&fit=crop',
  'apple crumble': 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=400&h=400&fit=crop',
  'fruitcake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop',
  'smoothie': 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400&h=400&fit=crop',
  'sinaasappelsap': 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400&h=400&fit=crop',
  'water': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop',
  'cola': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=400&fit=crop',
  'koffie': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop',
  'thee': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop',
  'default': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop'
};

const getProductImage = (name) => {
  const lowerName = name.toLowerCase();
  for (const [key, url] of Object.entries(productImages)) {
    if (lowerName.includes(key)) return url;
  }
  return productImages.default;
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
  const currentDate = new Date().toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });

  if (loading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden" data-testid="kassa-pos">
      {/* LEFT SIDEBAR - Categories & Search */}
      <div className="w-52 bg-gray-50 border-r border-gray-100 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek producten..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1 p-3 overflow-auto">
          <div className="space-y-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full py-3 px-4 rounded-xl text-left font-medium transition-all duration-200 ${
                selectedCategory === null
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-100'
              }`}
              data-testid="category-all"
            >
              Alles
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full py-3 px-4 rounded-xl text-left font-medium transition-all duration-200 ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-100'
                }`}
                data-testid={`category-${cat.id}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="p-3 border-t border-gray-100 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <span className="text-xs text-gray-600 truncate">{user?.name}</span>
            </div>
            <button 
              onClick={logout}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              title="Uitloggen"
            >
              <LogOut className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT - Products */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Top Header Bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Business Name */}
            <h1 className="font-bold text-xl text-gray-900">{business?.name || 'Kassa POS'}</h1>
          </div>
          
          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <button 
              onClick={loadData}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors" 
              title="Ververs"
            >
              <RotateCcw className="w-5 h-5 text-gray-500" />
            </button>
            <button 
              onClick={() => window.location.href = '/kassa/rapporten'}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors" 
              title="Rapporten"
            >
              <BarChart3 className="w-5 h-5 text-gray-500" />
            </button>
            <button 
              onClick={() => window.location.href = '/kassa/instellingen'}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors" 
              title="Instellingen"
              data-testid="settings-btn"
            >
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
            <button 
              onClick={() => window.location.href = '/kassa/producten'}
              className="p-2.5 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors" 
              title="Producten beheren"
            >
              <Package className="w-5 h-5 text-blue-600" />
            </button>
            <button 
              onClick={() => window.location.href = '/kassa/rapporten'}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors" 
              title="Rapporten"
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </button>
            
            {/* Time Display */}
            <div className="ml-4 text-right">
              <div className="text-sm font-medium text-gray-900">{currentTime}</div>
              <div className="text-xs text-gray-500">{currentDate}</div>
            </div>
          </div>
        </div>

        {/* Products Grid Area */}
        <div className="flex-1 p-6 overflow-auto">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-12 h-12 text-gray-300" />
                </div>
                <p className="text-lg font-medium text-gray-700 mb-2">Geen producten gevonden</p>
                <p className="text-sm text-gray-500 mb-4">Voeg producten toe via productbeheer</p>
                <button 
                  onClick={() => window.location.href = '/kassa/producten'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
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
                    className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 aspect-square border border-gray-100"
                    data-testid={`product-${product.id}`}
                  >
                    {/* Product Image */}
                    <img
                      src={product.image_url || getProductImage(product.name)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { e.target.src = productImages.default; }}
                    />
                    
                    {/* Product Name Label - Vertical on left side */}
                    <div className="absolute top-0 left-0 h-full flex items-start pt-3">
                      <div 
                        className="bg-white/95 backdrop-blur-sm px-2 py-1.5 rounded-r-lg shadow-sm"
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
                      >
                        <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">
                          {product.name}
                        </span>
                      </div>
                    </div>

                    {/* Price Label - Bottom left */}
                    <div className="absolute bottom-3 left-3">
                      <div className="bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-lg shadow-sm">
                        <span className="text-xs font-bold text-blue-600">SRD</span>
                        <span className="text-sm font-bold text-gray-900 ml-1">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                    </div>

                    {/* Cart Quantity Badge */}
                    {inCart && (
                      <div className="absolute top-3 right-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                        {inCart.quantity}
                      </div>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors duration-300" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-2 flex items-center justify-between text-xs text-gray-500">
          <span>Totaal producten: {products.length}</span>
          <span>{business?.name} - Kassa POS</span>
        </div>
      </div>

      {/* RIGHT SIDEBAR - Cart/Bestelling */}
      <div className="w-80 bg-white flex flex-col border-l border-gray-100 shadow-sm">
        {/* Cart Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Bestelling</h2>
                <p className="text-xs text-gray-500">{cartTotals.items} artikel{cartTotals.items !== 1 ? 'en' : ''}</p>
              </div>
            </div>
            {cart.length > 0 && (
              <button 
                onClick={clearCart} 
                className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                title="Alles verwijderen"
              >
                <Trash2 className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
              </button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto px-4 py-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-sm font-medium">Geen artikelen</p>
              <p className="text-xs text-gray-400 mt-1">Selecteer producten om te beginnen</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div 
                  key={item.product_id} 
                  className="bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-800 flex-1 pr-2 line-clamp-1">
                      {item.product_name}
                    </span>
                    <button 
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => updateQuantity(item.product_id, -1)}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 hover:border-gray-300 flex items-center justify-center text-gray-600 font-medium transition-colors"
                      >
                        -
                      </button>
                      <span className="text-sm font-semibold w-8 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product_id, 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 hover:border-gray-300 flex items-center justify-center text-gray-600 font-medium transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      SRD {formatPrice(item.quantity * item.unit_price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals & Checkout */}
        <div className="border-t border-gray-100 p-4 bg-white">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotaal</span>
              <span className="text-gray-700">SRD {formatPrice(cartTotals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">BTW ({btw_percentage}%)</span>
              <span className="text-gray-700">SRD {formatPrice(cartTotals.btw)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-gray-100">
              <span className="text-lg font-bold text-gray-900">Totaal</span>
              <span className="text-lg font-bold text-blue-600">SRD {formatPrice(cartTotals.total)}</span>
            </div>
          </div>
          
          <button
            onClick={() => { setAmountPaid(cartTotals.total.toFixed(2)); setShowPaymentModal(true); }}
            disabled={cart.length === 0}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-600/25 disabled:shadow-none"
            data-testid="checkout-btn"
          >
            Afrekenen
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              <span className="text-3xl font-bold text-gray-900">SRD {formatPrice(cartTotals.total)}</span>
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
                  data-testid={`payment-${method.id}`}
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
                    data-testid="amount-paid-input"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[20, 50, 100, 200].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setAmountPaid(amt.toString())}
                      className="py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
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
              data-testid="confirm-payment-btn"
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
