import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useKassaAuth } from '../../context/KassaAuthContext';
import { productsAPI, categoriesAPI, ordersAPI, customersAPI } from '../../lib/kassaApi';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { 
  User, Settings, LogOut, Receipt, Percent, Trash2, 
  CreditCard, Banknote, QrCode, Printer, X, Check, Loader2,
  Package, BarChart3, ShoppingBag, Euro, DollarSign
} from 'lucide-react';

const formatCurrency = (amount, symbol = 'SRD') => {
  return `${symbol} ${new Intl.NumberFormat('nl-NL', {
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
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [lastOrder, setLastOrder] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputMode, setInputMode] = useState('quantity'); // quantity, price, discount

  const btw_percentage = business?.btw_percentage || 8;

  // Category colors for the right sidebar
  const categoryColors = [
    '#dc2626', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#6b7280', // gray
    '#78716c', // stone
    '#84cc16', // lime
    '#14b8a6', // teal
  ];

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
      // Assign colors to categories
      const catsWithColors = cats.map((cat, idx) => ({
        ...cat,
        color: cat.color || categoryColors[idx % categoryColors.length]
      }));
      setCategories(catsWithColors);
    } catch (error) {
      toast.error('Fout bij laden gegevens');
    } finally {
      setLoading(false);
    }
  };

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter(p => p.category_id === selectedCategory);
  }, [products, selectedCategory]);

  // Add product to cart
  const addToCart = useCallback((product) => {
    const qty = inputValue ? parseInt(inputValue) || 1 : 1;
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        unit_price: product.price,
        discount: 0
      }];
    });
    setInputValue('');
    
    // Beep sound
    if (business?.settings?.sound_enabled !== false) {
      const audio = new Audio('/beep.mp3');
      audio.volume = 0.2;
      audio.play().catch(() => {});
    }
  }, [inputValue, business]);

  // Numpad handlers
  const handleNumpad = (value) => {
    if (value === 'clear') {
      setInputValue('');
    } else if (value === 'backspace') {
      setInputValue(prev => prev.slice(0, -1));
    } else if (value === 'enter') {
      // Apply input based on mode
      if (inputMode === 'quantity' && cart.length > 0) {
        const lastItem = cart[cart.length - 1];
        const newQty = parseInt(inputValue) || 1;
        setCart(prev => prev.map((item, idx) => 
          idx === prev.length - 1 ? { ...item, quantity: newQty } : item
        ));
      }
      setInputValue('');
    } else if (value === '00') {
      setInputValue(prev => prev + '00');
    } else {
      setInputValue(prev => prev + value);
    }
  };

  // Remove item from cart
  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  // Clear entire cart
  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setInputValue('');
  };

  // Calculate totals
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price - item.discount), 0);
    const btw = subtotal * (btw_percentage / 100);
    const total = subtotal + btw;
    return { subtotal, btw, total, itemCount: cart.reduce((sum, item) => sum + item.quantity, 0) };
  }, [cart, btw_percentage]);

  // Process payment
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden" data-testid="kassa-pos">
      {/* Top Header Bar - Blue */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg">{business?.name || 'Kassa POS'}</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm bg-white/10 px-3 py-1 rounded">
            <span>Kassa 1</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => window.location.href = '/kassa/producten'}>
            <Package className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Producten</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => window.location.href = '/kassa/rapporten'}>
            <BarChart3 className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Rapporten</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => window.location.href = '/kassa/instellingen'}>
            <Settings className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/20">
            <User className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">{user?.name}</span>
          </div>
          <Button variant="ghost" size="sm" className="text-white hover:bg-red-500/50" onClick={logout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Receipt/Cart */}
        <div className="w-72 lg:w-80 bg-white flex flex-col border-r shadow-sm shrink-0">
          {/* Cart Header */}
          <div className="bg-blue-600 text-white px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              <span className="font-medium">Bon</span>
            </div>
            <span className="text-sm">{cart.length} artikel(en)</span>
          </div>

          {/* Cart Items Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 sticky top-0">
                <tr className="text-left">
                  <th className="px-2 py-2 font-medium text-slate-600">Artikel</th>
                  <th className="px-2 py-2 font-medium text-slate-600 text-center w-12">Qty</th>
                  <th className="px-2 py-2 font-medium text-slate-600 text-right w-20">Prijs</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cart.map((item, idx) => (
                  <tr key={item.product_id} className={idx === cart.length - 1 ? 'bg-blue-50' : ''}>
                    <td className="px-2 py-2 truncate max-w-[120px]">{item.product_name}</td>
                    <td className="px-2 py-2 text-center font-medium">{item.quantity}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(item.quantity * item.unit_price)}</td>
                    <td className="px-1">
                      <button 
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-2 py-8 text-center text-slate-400">
                      Geen artikelen
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t bg-slate-50 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotaal</span>
              <span>{formatCurrency(cartTotals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">BTW ({btw_percentage}%)</span>
              <span>{formatCurrency(cartTotals.btw)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t border-slate-200">
              <span>Totaal</span>
              <span className="text-blue-600">{formatCurrency(cartTotals.total)}</span>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="border-t p-2 grid grid-cols-5 gap-1">
            <button className="flex flex-col items-center p-2 rounded hover:bg-slate-100" title="Bon printen">
              <Printer className="w-5 h-5 text-slate-600" />
              <span className="text-[10px] text-slate-500 mt-0.5">Print</span>
            </button>
            <button className="flex flex-col items-center p-2 rounded hover:bg-slate-100" title="Korting">
              <Percent className="w-5 h-5 text-slate-600" />
              <span className="text-[10px] text-slate-500 mt-0.5">Korting</span>
            </button>
            <button className="flex flex-col items-center p-2 rounded hover:bg-slate-100" title="Klant">
              <User className="w-5 h-5 text-slate-600" />
              <span className="text-[10px] text-slate-500 mt-0.5">Klant</span>
            </button>
            <button 
              className="flex flex-col items-center p-2 rounded hover:bg-red-50" 
              title="Wissen"
              onClick={clearCart}
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              <span className="text-[10px] text-red-500 mt-0.5">Wissen</span>
            </button>
            <button className="flex flex-col items-center p-2 rounded bg-blue-600 text-white hover:bg-blue-700" title="Betalen">
              <DollarSign className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">SRD</span>
            </button>
          </div>
        </div>

        {/* Center Panel - Products Grid + Numpad */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Products Grid */}
          <div className="flex-1 p-3 overflow-auto">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Package className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>Geen producten in deze categorie</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {filteredProducts.map(product => {
                  const category = categories.find(c => c.id === product.category_id);
                  const bgColor = category?.color || '#3b82f6';
                  const inCart = cart.find(item => item.product_id === product.id);
                  
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="relative p-3 rounded-lg text-white text-left transition-all hover:scale-105 hover:shadow-lg active:scale-95"
                      style={{ backgroundColor: bgColor }}
                      data-testid={`product-${product.id}`}
                    >
                      {inCart && (
                        <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold shadow">
                          {inCart.quantity}
                        </span>
                      )}
                      <div className="font-medium text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
                        {product.name}
                      </div>
                      <div className="text-white/90 text-xs mt-1">
                        {formatCurrency(product.price)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Numpad + Pay Button */}
          <div className="border-t bg-white p-3 flex gap-3">
            {/* Input Display */}
            <div className="flex-1 flex flex-col">
              <div className="bg-slate-100 rounded px-3 py-2 text-right text-xl font-mono mb-2 h-10">
                {inputValue || '0'}
              </div>
              
              {/* Numpad Grid */}
              <div className="grid grid-cols-4 gap-1">
                {['7', '8', '9', 'X'].map(key => (
                  <button
                    key={key}
                    onClick={() => key === 'X' ? handleNumpad('backspace') : handleNumpad(key)}
                    className={`p-3 rounded text-lg font-medium transition-colors ${
                      key === 'X' 
                        ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {key}
                  </button>
                ))}
                {['4', '5', '6', 'Clear'].map(key => (
                  <button
                    key={key}
                    onClick={() => key === 'Clear' ? handleNumpad('clear') : handleNumpad(key)}
                    className={`p-3 rounded text-lg font-medium transition-colors ${
                      key === 'Clear' 
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 text-sm' 
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {key}
                  </button>
                ))}
                {['1', '2', '3'].map(key => (
                  <button
                    key={key}
                    onClick={() => handleNumpad(key)}
                    className="p-3 rounded bg-slate-100 hover:bg-slate-200 text-lg font-medium"
                  >
                    {key}
                  </button>
                ))}
                <button
                  onClick={() => handleNumpad('enter')}
                  className="p-3 rounded bg-green-500 text-white hover:bg-green-600 text-sm font-medium row-span-2"
                >
                  Enter
                </button>
                <button
                  onClick={() => handleNumpad('0')}
                  className="p-3 rounded bg-slate-100 hover:bg-slate-200 text-lg font-medium"
                >
                  0
                </button>
                <button
                  onClick={() => handleNumpad('00')}
                  className="p-3 rounded bg-slate-100 hover:bg-slate-200 text-lg font-medium"
                >
                  00
                </button>
                <button
                  onClick={() => handleNumpad('.')}
                  className="p-3 rounded bg-slate-100 hover:bg-slate-200 text-lg font-medium"
                >
                  .
                </button>
              </div>
            </div>

            {/* Pay Buttons */}
            <div className="flex flex-col gap-2 w-32">
              <button
                onClick={() => {
                  setPaymentMethod('cash');
                  setAmountPaid(cartTotals.total.toFixed(2));
                  setShowPaymentModal(true);
                }}
                disabled={cart.length === 0}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white rounded-lg flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Banknote className="w-8 h-8" />
                <span className="text-sm font-medium">Contant</span>
              </button>
              <button
                onClick={() => {
                  setPaymentMethod('pin');
                  setAmountPaid(cartTotals.total.toFixed(2));
                  setShowPaymentModal(true);
                }}
                disabled={cart.length === 0}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-lg flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <CreditCard className="w-8 h-8" />
                <span className="text-sm font-medium">PIN</span>
              </button>
              <button
                onClick={() => {
                  setPaymentMethod('qr');
                  setAmountPaid(cartTotals.total.toFixed(2));
                  setShowPaymentModal(true);
                }}
                disabled={cart.length === 0}
                className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-300 text-white rounded-lg flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <QrCode className="w-8 h-8" />
                <span className="text-sm font-medium">QR</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Categories */}
        <div className="w-28 lg:w-32 bg-slate-200 flex flex-col shrink-0 overflow-y-auto">
          {/* All Products Button */}
          <button
            onClick={() => setSelectedCategory(null)}
            className={`p-3 text-center text-sm font-medium transition-colors ${
              selectedCategory === null 
                ? 'bg-slate-700 text-white' 
                : 'bg-slate-300 hover:bg-slate-400 text-slate-700'
            }`}
          >
            Alles
          </button>
          
          {/* Category Buttons */}
          {categories.map((category, idx) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`p-3 text-center text-sm font-medium text-white transition-all hover:brightness-110 ${
                selectedCategory === category.id ? 'ring-2 ring-white ring-inset' : ''
              }`}
              style={{ backgroundColor: category.color || categoryColors[idx % categoryColors.length] }}
              data-testid={`category-btn-${category.id}`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {paymentMethod === 'cash' && <Banknote className="w-5 h-5 text-green-600" />}
              {paymentMethod === 'pin' && <CreditCard className="w-5 h-5 text-blue-600" />}
              {paymentMethod === 'qr' && <QrCode className="w-5 h-5 text-purple-600" />}
              Betaling - {formatCurrency(cartTotals.total)}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {paymentMethod === 'cash' && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-600">Ontvangen bedrag</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full mt-1 px-4 py-3 text-2xl text-center font-bold border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>
                
                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[20, 50, 100, 200, 500, 1000].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setAmountPaid(amount.toString())}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded text-sm font-medium"
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>

                {/* Change */}
                {parseFloat(amountPaid) >= cartTotals.total && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-sm text-green-700">Wisselgeld</div>
                    <div className="text-3xl font-bold text-green-700">
                      {formatCurrency(parseFloat(amountPaid) - cartTotals.total)}
                    </div>
                  </div>
                )}
              </>
            )}

            {paymentMethod === 'pin' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                <p className="text-blue-700">Wacht op PIN betaling...</p>
                <p className="text-2xl font-bold text-blue-700 mt-2">{formatCurrency(cartTotals.total)}</p>
              </div>
            )}

            {paymentMethod === 'qr' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
                <QrCode className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                <p className="text-purple-700">Scan QR code...</p>
                <p className="text-2xl font-bold text-purple-700 mt-2">{formatCurrency(cartTotals.total)}</p>
              </div>
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
              Bevestigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600">✓ Verkoop Voltooid!</DialogTitle>
          </DialogHeader>
          
          {lastOrder && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg text-center">
                <div className="text-sm text-slate-500">Bonnummer</div>
                <div className="text-xl font-bold font-mono">{lastOrder.order_number}</div>
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
                  <div className="flex justify-between text-green-600 font-medium">
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
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => setShowReceiptModal(false)}>
              Nieuwe Verkoop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
