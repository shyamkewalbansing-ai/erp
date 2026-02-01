import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  Ticket,
  Receipt,
  Search,
  User,
  Scissors,
  Package
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const paymentMethods = [
  { value: 'cash', label: 'Contant', icon: Banknote },
  { value: 'pin', label: 'PIN', icon: CreditCard },
  { value: 'qr_telesur', label: 'Telesur Pay QR', icon: QrCode },
  { value: 'qr_finabank', label: 'Finabank QR', icon: QrCode },
  { value: 'qr_hakrinbank', label: 'Hakrinbank QR', icon: QrCode },
  { value: 'voucher', label: 'Voucher', icon: Ticket },
];

export default function POSPage() {
  const [clients, setClients] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedClient, setSelectedClient] = useState(null);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [voucherCode, setVoucherCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('treatments');
  const [processing, setProcessing] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [clientRes, treatmentRes, productRes] = await Promise.all([
        axios.get(`${API_URL}/beautyspa/clients`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/beautyspa/treatments`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/beautyspa/products`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setClients(clientRes.data);
      setTreatments(treatmentRes.data);
      setProducts(productRes.data);
    } catch (error) {
      toast.error('Fout bij laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item, type) => {
    const existing = cart.find(c => c.item_id === item.id && c.item_type === type);
    if (existing) {
      setCart(cart.map(c => 
        c.item_id === item.id && c.item_type === type 
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, {
        item_type: type,
        item_id: item.id,
        item_name: item.name,
        quantity: 1,
        unit_price_srd: type === 'treatment' ? item.price_srd : item.selling_price_srd,
        discount_percentage: 0
      }]);
    }
  };

  const updateQuantity = (index, delta) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  const removeFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      return sum + (item.unit_price_srd * item.quantity * (1 - item.discount_percentage / 100));
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal * (1 - discount / 100);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Winkelwagen is leeg');
      return;
    }

    setProcessing(true);
    try {
      const saleData = {
        client_id: selectedClient?.id || null,
        items: cart,
        payment_method: paymentMethod,
        discount_percentage: discount,
        voucher_code: voucherCode || null,
        notes: null
      };

      const res = await axios.post(`${API_URL}/beautyspa/sales`, saleData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Verkoop ${res.data.sale_number} succesvol! Totaal: SRD ${res.data.total_amount.toLocaleString()}`);
      
      // Reset
      setCart([]);
      setSelectedClient(null);
      setDiscount(0);
      setVoucherCode('');
      fetchData(); // Refresh stock
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fout bij afrekenen');
    } finally {
      setProcessing(false);
    }
  };

  const filteredTreatments = treatments.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto" data-testid="beautyspa-pos-page">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Products/Treatments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kassa (POS)</h1>
            <p className="text-slate-600">Registreer verkopen en behandelingen</p>
          </div>

          {/* Search & Tabs */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Zoeken..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={activeTab === 'treatments' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('treatments')}
                  className={activeTab === 'treatments' ? 'bg-gradient-to-r from-pink-500 to-purple-600' : ''}
                >
                  <Scissors className="w-4 h-4 mr-2" />
                  Behandelingen
                </Button>
                <Button
                  variant={activeTab === 'products' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('products')}
                  className={activeTab === 'products' ? 'bg-gradient-to-r from-pink-500 to-purple-600' : ''}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Producten
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Items Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-24 bg-slate-100"></CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {activeTab === 'treatments' ? (
                filteredTreatments.map((treatment) => (
                  <Card 
                    key={treatment.id} 
                    className="cursor-pointer hover:shadow-lg hover:border-pink-300 transition-all"
                    onClick={() => addToCart(treatment, 'treatment')}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">{treatment.name}</h3>
                      <p className="text-sm text-slate-500 mb-2">{treatment.duration_minutes} min</p>
                      <p className="font-bold text-pink-600">SRD {treatment.price_srd?.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                filteredProducts.map((product) => (
                  <Card 
                    key={product.id} 
                    className={`cursor-pointer hover:shadow-lg transition-all ${product.stock_quantity <= 0 ? 'opacity-50' : 'hover:border-pink-300'}`}
                    onClick={() => product.stock_quantity > 0 && addToCart(product, 'product')}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-slate-500 mb-2">
                        Voorraad: {product.stock_quantity}
                        {product.stock_quantity <= product.min_stock_level && (
                          <Badge className="ml-2 bg-amber-100 text-amber-700">Laag</Badge>
                        )}
                      </p>
                      <p className="font-bold text-emerald-600">SRD {product.selling_price_srd?.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Side - Cart */}
        <div className="space-y-6">
          {/* Client Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Klant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedClient?.id || 'walk-in'} 
                onValueChange={(v) => setSelectedClient(v === 'walk-in' ? null : clients.find(c => c.id === v) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer klant (optioneel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in (geen klant)</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} - {client.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClient && (
                <div className="mt-3 p-3 bg-pink-50 rounded-lg">
                  <p className="font-medium text-pink-800">{selectedClient.name}</p>
                  <p className="text-sm text-pink-600">Punten: {selectedClient.loyalty_points || 0}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cart */}
          <Card className="border-2 border-pink-200">
            <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Winkelwagen ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {cart.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  Winkelwagen is leeg
                </p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cart.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 text-sm">{item.item_name}</p>
                        <p className="text-xs text-slate-500">SRD {item.unit_price_srd?.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(index, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(index, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500"
                          onClick={() => removeFromCart(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Discount & Voucher */}
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="w-20">Korting %</Label>
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    min="0"
                    max="100"
                    className="w-20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-20">Voucher</Label>
                  <Input
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="Code"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotaal</span>
                  <span className="font-medium">SRD {calculateSubtotal().toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-pink-600">
                    <span>Korting ({discount}%)</span>
                    <span>-SRD {(calculateSubtotal() * discount / 100).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Totaal</span>
                  <span className="text-emerald-600">SRD {calculateTotal().toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mt-4 pt-4 border-t">
                <Label className="mb-2 block">Betaalmethode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((method) => (
                    <Button
                      key={method.value}
                      variant={paymentMethod === method.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod(method.value)}
                      className={paymentMethod === method.value ? 'bg-gradient-to-r from-pink-500 to-purple-600' : ''}
                    >
                      <method.icon className="w-3 h-3 mr-1" />
                      <span className="text-xs">{method.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                className="w-full mt-6 h-14 text-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                onClick={handleCheckout}
                disabled={cart.length === 0 || processing}
              >
                {processing ? (
                  <span className="animate-pulse">Verwerken...</span>
                ) : (
                  <>
                    <Receipt className="w-5 h-5 mr-2" />
                    Afrekenen - SRD {calculateTotal().toLocaleString()}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
