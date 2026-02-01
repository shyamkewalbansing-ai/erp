import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard,
  Banknote,
  QrCode,
  Receipt,
  Fuel,
  Package,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const paymentMethods = [
  { value: 'cash', label: 'Contant', icon: Banknote },
  { value: 'pin', label: 'PIN', icon: CreditCard },
  { value: 'credit_card', label: 'Creditcard', icon: CreditCard },
  { value: 'qr', label: 'QR Betaling', icon: QrCode },
];

export default function POSPage() {
  const [loading, setLoading] = useState(true);
  const [pumps, setPumps] = useState([]);
  const [products, setProducts] = useState([]);
  const [prices, setPrices] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedPump, setSelectedPump] = useState(null);
  const [fuelQuantity, setFuelQuantity] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [pumpsRes, productsRes, pricesRes] = await Promise.all([
        fetch(`${API_URL}/api/pompstation/pumps`, { headers }),
        fetch(`${API_URL}/api/pompstation/products`, { headers }),
        fetch(`${API_URL}/api/pompstation/prices`, { headers })
      ]);

      if (!pumpsRes.ok || !productsRes.ok || !pricesRes.ok) {
        throw new Error('Kon data niet laden');
      }

      setPumps(await pumpsRes.json());
      setProducts(await productsRes.json());
      const priceData = await pricesRes.json();
      setPrices(priceData.prices || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getFuelPrice = (fuelType) => {
    const price = prices.find(p => p.fuel_type === fuelType);
    return price?.price_per_liter || 0;
  };

  const addFuelToCart = () => {
    if (!selectedPump || !fuelQuantity || parseFloat(fuelQuantity) <= 0) {
      toast.error('Selecteer een pomp en voer een hoeveelheid in');
      return;
    }

    const pump = pumps.find(p => p.number === parseInt(selectedPump));
    if (!pump) return;

    const pricePerLiter = getFuelPrice(pump.fuel_type);
    const quantity = parseFloat(fuelQuantity);

    const existingIndex = cart.findIndex(
      item => item.item_type === 'fuel' && item.pump_number === pump.number
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity = quantity;
      newCart[existingIndex].total = quantity * pricePerLiter;
      setCart(newCart);
    } else {
      setCart([...cart, {
        item_type: 'fuel',
        name: `${pump.fuel_type} - Pomp ${pump.number}`,
        pump_number: pump.number,
        quantity: quantity,
        unit_price: pricePerLiter,
        total: quantity * pricePerLiter,
        discount: 0
      }]);
    }

    setFuelQuantity('');
    toast.success('Brandstof toegevoegd');
  };

  const addProductToCart = (product) => {
    const existingIndex = cart.findIndex(
      item => item.item_type === 'shop_item' && item.item_id === product.id
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      newCart[existingIndex].total = newCart[existingIndex].quantity * product.selling_price;
      setCart(newCart);
    } else {
      setCart([...cart, {
        item_type: 'shop_item',
        item_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.selling_price,
        total: product.selling_price,
        discount: 0
      }]);
    }
  };

  const updateCartQuantity = (index, delta) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    } else {
      newCart[index].total = newCart[index].quantity * newCart[index].unit_price;
    }
    
    setCart(newCart);
  };

  const removeFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Winkelwagen is leeg');
      return;
    }

    try {
      setProcessing(true);
      const token = localStorage.getItem('token');

      const fuelItem = cart.find(item => item.item_type === 'fuel');
      const pumpNumber = fuelItem?.pump_number || null;

      const saleData = {
        items: cart.map(item => ({
          item_type: item.item_type,
          item_id: item.item_id || null,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount
        })),
        payment_method: paymentMethod,
        pump_number: pumpNumber
      };

      const res = await fetch(`${API_URL}/api/pompstation/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(saleData)
      });

      if (!res.ok) throw new Error('Kon verkoop niet verwerken');

      const sale = await res.json();
      toast.success(`Verkoop voltooid! Bon: ${sale.receipt_number}`);
      setCart([]);
      setSelectedPump(null);
      fetchData(); // Refresh data
    } catch (err) {
      toast.error(err.message);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pompstation-pos">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-orange-500" />
            Kassa (POS)
          </h1>
          <p className="text-muted-foreground mt-1">
            Brandstof en winkelartikelen afrekenen
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="fuel">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fuel" className="flex items-center gap-2">
                <Fuel className="w-4 h-4" />
                Brandstof
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Winkel
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fuel" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Brandstof Verkoop</CardTitle>
                  <CardDescription>Selecteer een pomp en voer de hoeveelheid in</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pump Selection */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {pumps.filter(p => p.status === 'active').map((pump) => (
                      <Button
                        key={pump.number}
                        variant={selectedPump === pump.number.toString() ? 'default' : 'outline'}
                        className={`h-20 flex-col ${selectedPump === pump.number.toString() ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                        onClick={() => setSelectedPump(pump.number.toString())}
                      >
                        <span className="text-lg font-bold">Pomp {pump.number}</span>
                        <span className="text-xs capitalize">{pump.fuel_type}</span>
                        <span className="text-xs">{formatCurrency(getFuelPrice(pump.fuel_type))}/L</span>
                      </Button>
                    ))}
                  </div>

                  {pumps.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      Geen actieve pompen gevonden
                    </p>
                  )}

                  {/* Fuel Quantity */}
                  {selectedPump && (
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <Label>Liters</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={fuelQuantity}
                          onChange={(e) => setFuelQuantity(e.target.value)}
                          placeholder="0.00"
                          className="text-xl h-12"
                        />
                      </div>
                      <Button 
                        onClick={addFuelToCart}
                        className="h-12 bg-orange-600 hover:bg-orange-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Toevoegen
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Winkel Producten</CardTitle>
                  <CardDescription>Klik om toe te voegen aan de kassa</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {products.filter(p => p.stock_quantity > 0).map((product) => (
                      <Button
                        key={product.id}
                        variant="outline"
                        className="h-24 flex-col text-left p-2"
                        onClick={() => addProductToCart(product)}
                      >
                        <span className="font-medium text-sm line-clamp-2">{product.name}</span>
                        <span className="text-muted-foreground text-xs">{product.category}</span>
                        <span className="text-orange-600 font-bold">{formatCurrency(product.selling_price)}</span>
                      </Button>
                    ))}
                  </div>

                  {products.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      Geen producten gevonden
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Cart */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Kassabon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cart Items */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} x {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatCurrency(item.total)}</span>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={() => updateCartQuantity(index, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={() => updateCartQuantity(index, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6 text-red-500"
                          onClick={() => removeFromCart(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Winkelwagen is leeg
                  </p>
                )}
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Totaal</span>
                  <span className="text-orange-600">{formatCurrency(getCartTotal())}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <Label>Betaalmethode</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {paymentMethods.map((method) => (
                    <Button
                      key={method.value}
                      variant={paymentMethod === method.value ? 'default' : 'outline'}
                      className={paymentMethod === method.value ? 'bg-orange-600 hover:bg-orange-700' : ''}
                      onClick={() => setPaymentMethod(method.value)}
                    >
                      <method.icon className="w-4 h-4 mr-2" />
                      {method.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Checkout Button */}
              <Button 
                className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
                onClick={handleCheckout}
                disabled={cart.length === 0 || processing}
              >
                {processing ? (
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <ShoppingCart className="w-5 h-5 mr-2" />
                )}
                Afrekenen
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
