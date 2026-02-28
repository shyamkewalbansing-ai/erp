import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Grid3X3, 
  User, 
  Trash2, 
  Plus, 
  Minus,
  CreditCard,
  Banknote,
  X,
  Check,
  Loader2,
  ShoppingCart,
  Package,
  Coffee,
  UtensilsCrossed,
  GlassWater,
  Tag,
  Receipt
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Categorie iconen mapping
const categoryIcons = {
  'all': Grid3X3,
  'koffie': Coffee,
  'coffee': Coffee,
  'dranken': GlassWater,
  'beverages': GlassWater,
  'drinks': GlassWater,
  'eten': UtensilsCrossed,
  'food': UtensilsCrossed,
  'desserts': UtensilsCrossed,
  'producten': Package,
  'products': Package,
  'overig': Tag,
  'other': Tag,
};

const POSPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/boekhouding/artikelen`, {
        headers: { ...getAuthHeader() }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.filter(p => p.type !== 'dienst' && (p.is_actief !== false)));
        
        // Extract unique categories
        const cats = [...new Set(data.map(p => p.categorie || 'Overig').filter(Boolean))];
        setCategories(['all', ...cats]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || 
      (p.categorie || 'Overig').toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = !searchQuery || 
      p.naam?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.verkoopprijs * item.quantity), 0);
  const btwPercentage = 10; // Default BTW
  const btwAmount = subtotal * (btwPercentage / 100);
  const total = subtotal + btwAmount;

  const handlePayment = async (method) => {
    setPaymentMethod(method);
    setProcessing(true);

    try {
      // Create a sale/invoice
      const saleData = {
        type: 'pos',
        betaalmethode: method,
        regels: cart.map(item => ({
          artikel_id: item.id,
          artikel_naam: item.naam,
          aantal: item.quantity,
          prijs_per_stuk: item.verkoopprijs,
          btw_percentage: btwPercentage,
          totaal: item.verkoopprijs * item.quantity
        })),
        subtotaal: subtotal,
        btw_bedrag: btwAmount,
        totaal: total,
        status: 'betaald'
      };

      const response = await fetch(`${API_URL}/api/boekhouding/pos/verkopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(saleData)
      });

      if (response.ok) {
        const sale = await response.json();
        setLastSale(sale);
        setShowPaymentDialog(false);
        setShowSuccessDialog(true);
        setCart([]);
        toast.success('Betaling succesvol!');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fout bij verwerken betaling');
      }
    } catch (error) {
      toast.error('Fout bij verwerken betaling');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-SR', { 
      style: 'currency', 
      currency: 'SRD',
      minimumFractionDigits: 2 
    }).format(amount);
  };

  const getCategoryIcon = (cat) => {
    const IconComponent = categoryIcons[cat.toLowerCase()] || Tag;
    return IconComponent;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-100 flex items-center justify-center" data-testid="pos-page">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500">POS laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-100 flex" data-testid="pos-page">
      {/* Left Side - Products */}
      <div className="flex-1 flex flex-col">
        {/* Header with Categories */}
        <div className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Home Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/app/boekhouding')}
              className="shrink-0 w-10 h-10 rounded-full bg-slate-900 text-white hover:bg-slate-800"
              data-testid="pos-home-btn"
            >
              <Home className="w-5 h-5" />
            </Button>

            {/* Categories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {categories.map(cat => {
                const IconComponent = getCategoryIcon(cat);
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      isActive 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    data-testid={`pos-category-${cat}`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {cat === 'all' ? 'Alles' : cat}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative ml-auto w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zoeken..."
                className="pl-10 bg-slate-50 border-slate-200"
                data-testid="pos-search-input"
              />
            </div>

            {/* User */}
            <Button variant="ghost" size="icon" className="shrink-0">
              <User className="w-5 h-5 text-slate-500" />
            </Button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 hover:border-slate-200"
                data-testid={`pos-product-${product.code || product.id}`}
              >
                {/* Product Image */}
                <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center overflow-hidden">
                  {product.foto_url ? (
                    <img 
                      src={product.foto_url.startsWith('http') ? product.foto_url : `${API_URL}${product.foto_url}`}
                      alt={product.naam}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <Package className="w-12 h-12 text-slate-300" />
                  )}
                </div>
                
                {/* Product Info */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-slate-900 truncate">{product.naam}</h3>
                  <p className="text-sm font-bold text-slate-700 mt-1">
                    {formatCurrency(product.verkoopprijs)}
                  </p>
                </div>

                {/* Quantity Badge (if in cart) */}
                {cart.find(item => item.id === product.id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {cart.find(item => item.id === product.id).quantity}
                  </div>
                )}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Package className="w-16 h-16 mb-4" />
              <p className="text-lg">Geen producten gevonden</p>
              <p className="text-sm">Pas je filters aan of voeg producten toe in Voorraad</p>
            </div>
          )}
        </div>

        {/* Left Sidebar Icons */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-white rounded-r-xl shadow-lg py-2 border border-l-0 border-slate-200">
          <div className="flex flex-col gap-1 px-2">
            <button className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
              <Receipt className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
              <Tag className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Cart/Receipt */}
      <div className="w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-500">{cart.length} items</span>
          </div>
          <button 
            onClick={clearCart}
            className="text-sm text-slate-400 hover:text-red-500 transition-colors"
            data-testid="pos-clear-cart-btn"
          >
            Wissen
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <ShoppingCart className="w-12 h-12 mb-3" />
              <p className="text-sm">Winkelwagen is leeg</p>
            </div>
          ) : (
            cart.map(item => (
              <div 
                key={item.id} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 group"
                data-testid={`pos-cart-item-${item.id}`}
              >
                {/* Quantity Circle */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-sm font-medium text-slate-700">
                    {item.quantity}
                  </div>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{item.naam}</p>
                  <p className="text-xs text-slate-400">{formatCurrency(item.verkoopprijs)}</p>
                </div>

                {/* Item Total */}
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(item.verkoopprijs * item.quantity)}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer - Totals & Charge Button */}
        <div className="border-t border-slate-100 p-4 space-y-3">
          {/* Subtotals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotaal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>BTW ({btwPercentage}%)</span>
              <span>{formatCurrency(btwAmount)}</span>
            </div>
          </div>

          {/* Charge Button */}
          <button
            onClick={() => cart.length > 0 && setShowPaymentDialog(true)}
            disabled={cart.length === 0}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-between px-6 ${
              cart.length > 0
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
            data-testid="pos-charge-btn"
          >
            <span>Afrekenen</span>
            <span className="text-emerald-400 font-bold">{formatCurrency(total)}</span>
          </button>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Kies betaalmethode</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="text-center mb-6">
              <p className="text-3xl font-bold text-slate-900">{formatCurrency(total)}</p>
              <p className="text-sm text-slate-500 mt-1">{cart.length} items</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handlePayment('contant')}
                disabled={processing}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                data-testid="pos-pay-cash-btn"
              >
                <Banknote className="w-10 h-10 text-emerald-600" />
                <span className="font-medium text-slate-700">Contant</span>
              </button>
              <button
                onClick={() => handlePayment('pin')}
                disabled={processing}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
                data-testid="pos-pay-card-btn"
              >
                <CreditCard className="w-10 h-10 text-blue-600" />
                <span className="font-medium text-slate-700">Pin/Kaart</span>
              </button>
            </div>
          </div>
          {processing && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-sm">
          <div className="py-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Betaling Succesvol!</h2>
            <p className="text-slate-500">
              {lastSale && formatCurrency(lastSale.totaal || total)} ontvangen
            </p>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setShowSuccessDialog(false)} 
              className="w-full"
              data-testid="pos-success-close-btn"
            >
              Volgende klant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSPage;
