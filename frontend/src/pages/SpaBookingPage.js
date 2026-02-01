import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Loader2,
  MapPin,
  Scissors,
  Heart,
  Star
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Step indicator component
const StepIndicator = ({ currentStep, steps }) => {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
            index < currentStep 
              ? 'bg-pink-500 border-pink-500 text-white' 
              : index === currentStep 
                ? 'border-pink-500 text-pink-500 bg-pink-50' 
                : 'border-gray-300 text-gray-400'
          }`}>
            {index < currentStep ? (
              <Check className="w-5 h-5" />
            ) : (
              <span className="text-sm font-semibold">{index + 1}</span>
            )}
          </div>
          <span className={`hidden sm:block ml-2 text-sm font-medium ${
            index <= currentStep ? 'text-pink-600' : 'text-gray-400'
          }`}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div className={`w-8 sm:w-16 h-0.5 mx-2 ${
              index < currentStep ? 'bg-pink-500' : 'bg-gray-300'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
};

// Treatment selection component
const TreatmentSelector = ({ categories, selectedTreatment, onSelect }) => {
  const categoryIcons = {
    massage: "💆",
    facial: "✨",
    manicure: "💅",
    pedicure: "🦶",
    waxing: "🌸",
    hair: "💇",
    body: "🧴",
    package: "🎁",
    other: "⭐"
  };

  const categoryNames = {
    massage: "Massage",
    facial: "Gezichtsbehandelingen",
    manicure: "Manicure",
    pedicure: "Pedicure",
    waxing: "Harsen",
    hair: "Haar",
    body: "Lichaamsbehandelingen",
    package: "Pakketten",
    other: "Overige"
  };

  return (
    <div className="space-y-6">
      {Object.entries(categories).map(([category, treatments]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span>{categoryIcons[category] || "⭐"}</span>
            {categoryNames[category] || category}
          </h3>
          <div className="grid gap-3">
            {treatments.map((treatment) => (
              <div
                key={treatment.id}
                onClick={() => onSelect(treatment)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                  selectedTreatment?.id === treatment.id
                    ? 'border-pink-500 bg-pink-50 shadow-md'
                    : 'border-gray-200 hover:border-pink-300 bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{treatment.name}</h4>
                      {treatment.is_surinamese_special && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                          Surinaams Speciaal
                        </span>
                      )}
                      {treatment.is_package && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                          Pakket
                        </span>
                      )}
                    </div>
                    {treatment.description && (
                      <p className="text-sm text-gray-600 mt-1">{treatment.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {treatment.duration_minutes} min
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-pink-600">
                      SRD {treatment.price_srd?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Date and time selection component
const DateTimeSelector = ({ selectedDate, selectedTime, availability, onDateChange, onTimeChange, loading }) => {
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30); // Can book up to 30 days in advance

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold mb-3 block">Kies een datum</Label>
        <Input
          type="date"
          value={selectedDate}
          min={formatDate(today)}
          max={formatDate(maxDate)}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full p-3 text-lg"
        />
      </div>

      {selectedDate && (
        <div>
          <Label className="text-base font-semibold mb-3 block">Kies een tijdstip</Label>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
              <span className="ml-2 text-gray-600">Beschikbaarheid laden...</span>
            </div>
          ) : availability?.slots ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {availability.slots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => slot.available && onTimeChange(slot.time)}
                  disabled={!slot.available}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    selectedTime === slot.time
                      ? 'bg-pink-500 text-white border-pink-500'
                      : slot.available
                        ? 'bg-white border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                        : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span className="text-sm font-medium">{slot.time}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Selecteer eerst een datum</p>
          )}
        </div>
      )}
    </div>
  );
};

// Customer details form
const CustomerForm = ({ formData, onChange, errors }) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-base font-semibold">
          Naam <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          name="client_name"
          value={formData.client_name}
          onChange={(e) => onChange('client_name', e.target.value)}
          placeholder="Uw volledige naam"
          className={`mt-1 ${errors.client_name ? 'border-red-500' : ''}`}
        />
        {errors.client_name && (
          <p className="text-red-500 text-sm mt-1">{errors.client_name}</p>
        )}
      </div>

      <div>
        <Label htmlFor="phone" className="text-base font-semibold">
          Telefoonnummer <span className="text-red-500">*</span>
        </Label>
        <Input
          id="phone"
          name="client_phone"
          type="tel"
          value={formData.client_phone}
          onChange={(e) => onChange('client_phone', e.target.value)}
          placeholder="+597 xxx xxxx"
          className={`mt-1 ${errors.client_phone ? 'border-red-500' : ''}`}
        />
        {errors.client_phone && (
          <p className="text-red-500 text-sm mt-1">{errors.client_phone}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email" className="text-base font-semibold">
          E-mailadres <span className="text-gray-400">(optioneel)</span>
        </Label>
        <Input
          id="email"
          name="client_email"
          type="email"
          value={formData.client_email}
          onChange={(e) => onChange('client_email', e.target.value)}
          placeholder="uw@email.com"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="notes" className="text-base font-semibold">
          Opmerkingen <span className="text-gray-400">(optioneel)</span>
        </Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Eventuele bijzonderheden of wensen..."
          className="mt-1"
          rows={3}
        />
      </div>
    </div>
  );
};

// Confirmation component
const BookingConfirmation = ({ booking }) => {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
        <Check className="w-10 h-10 text-green-600" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Boeking Bevestigd!</h2>
        <p className="text-gray-600">Uw afspraak is succesvol geboekt.</p>
      </div>

      <Card className="bg-pink-50 border-pink-200">
        <CardContent className="p-6 space-y-4">
          <div className="text-left">
            <p className="text-sm text-gray-500">Behandeling</p>
            <p className="font-semibold text-gray-900">{booking.confirmation?.treatment}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div>
              <p className="text-sm text-gray-500">Datum</p>
              <p className="font-semibold text-gray-900">{booking.confirmation?.date}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tijd</p>
              <p className="font-semibold text-gray-900">{booking.confirmation?.time}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div>
              <p className="text-sm text-gray-500">Duur</p>
              <p className="font-semibold text-gray-900">{booking.confirmation?.duration}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Medewerker</p>
              <p className="font-semibold text-gray-900">{booking.confirmation?.staff}</p>
            </div>
          </div>
          <div className="text-left pt-2 border-t border-pink-200">
            <p className="text-sm text-gray-500">Totaal</p>
            <p className="text-xl font-bold text-pink-600">{booking.confirmation?.price}</p>
          </div>
        </CardContent>
      </Card>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
        <p className="text-sm text-amber-800">
          <strong>Belangrijk:</strong> Bewaar uw boekingsnummer: <span className="font-mono">{booking.booking_id?.slice(0, 8)}</span>
        </p>
        <p className="text-sm text-amber-700 mt-1">
          Neem contact op met de spa als u uw afspraak wilt wijzigen of annuleren.
        </p>
      </div>
    </div>
  );
};

// Main booking page component
export default function SpaBookingPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [spaInfo, setSpaInfo] = useState(null);
  const [categories, setCategories] = useState({});
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  const steps = [
    { id: 'treatment', label: 'Behandeling' },
    { id: 'datetime', label: 'Datum & Tijd' },
    { id: 'details', label: 'Gegevens' },
    { id: 'confirm', label: 'Bevestiging' }
  ];

  // Fetch spa info and treatments
  useEffect(() => {
    const fetchData = async () => {
      if (!workspaceId) return;

      try {
        setLoading(true);

        // Fetch spa info
        const infoRes = await fetch(`${API_URL}/api/spa-booking/spa/${workspaceId}/info`);
        if (!infoRes.ok) throw new Error('Spa niet gevonden');
        const infoData = await infoRes.json();
        setSpaInfo(infoData);

        // Fetch treatments
        const treatmentsRes = await fetch(`${API_URL}/api/spa-booking/spa/${workspaceId}/treatments`);
        if (treatmentsRes.ok) {
          const treatmentsData = await treatmentsRes.json();
          setCategories(treatmentsData.categories || {});
        }
      } catch (err) {
        toast.error(err.message || 'Kon spa informatie niet laden');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspaceId]);

  // Fetch availability when date or treatment changes
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedDate || !selectedTreatment || !workspaceId) return;

      try {
        setAvailabilityLoading(true);
        const res = await fetch(
          `${API_URL}/api/spa-booking/spa/${workspaceId}/availability?date=${selectedDate}&treatment_id=${selectedTreatment.id}`
        );
        if (res.ok) {
          const data = await res.json();
          setAvailability(data);
        }
      } catch (err) {
        console.error('Error fetching availability:', err);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAvailability();
  }, [selectedDate, selectedTreatment, workspaceId]);

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.client_name.trim()) {
      newErrors.client_name = 'Naam is verplicht';
    }
    if (!formData.client_phone.trim()) {
      newErrors.client_phone = 'Telefoonnummer is verplicht';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 0 && !selectedTreatment) {
      toast.error('Selecteer eerst een behandeling');
      return;
    }
    if (currentStep === 1 && (!selectedDate || !selectedTime)) {
      toast.error('Selecteer een datum en tijdstip');
      return;
    }
    if (currentStep === 2) {
      if (!validateForm()) {
        toast.error('Vul alle verplichte velden in');
        return;
      }
      handleSubmit();
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const bookingData = {
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        client_email: formData.client_email || null,
        treatment_id: selectedTreatment.id,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        notes: formData.notes || null
      };

      const res = await fetch(`${API_URL}/api/spa-booking/spa/${workspaceId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Boeking mislukt');
      }

      const result = await res.json();
      setBooking(result);
      setCurrentStep(3);
      toast.success('Afspraak succesvol geboekt!');
    } catch (err) {
      toast.error(err.message || 'Er ging iets mis bij het boeken');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-pink-500 mx-auto mb-4" />
            <p className="text-gray-600">Spa informatie laden...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!spaInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md mx-4">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Spa Niet Gevonden</h2>
              <p className="text-gray-600 mb-4">
                Deze spa heeft geen actief online boekingsportaal.
              </p>
              <Button onClick={() => navigate('/')} variant="outline">
                Terug
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-pink-50">
      {/* Spa Branded Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-pink-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-pink-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">{spaInfo.spa_name}</h1>
              <p className="text-xs text-gray-500">Online Reserveren</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Spa Info Header */}
        <div className="text-center mb-8">
          {spaInfo.address && (
            <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
              <MapPin className="w-4 h-4" />
              {spaInfo.address}
            </p>
          )}
          {(spaInfo.phone || spaInfo.email) && (
            <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-500">
              {spaInfo.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {spaInfo.phone}
                </span>
              )}
              {spaInfo.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {spaInfo.email}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Step Indicator */}
        {currentStep < 3 && <StepIndicator currentStep={currentStep} steps={steps} />}

        {/* Step Content */}
        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-gradient-to-r from-pink-50 to-purple-50">
            <CardTitle className="flex items-center gap-2">
              {currentStep === 0 && <><Scissors className="w-5 h-5 text-pink-500" /> Kies uw behandeling</>}
              {currentStep === 1 && <><Calendar className="w-5 h-5 text-pink-500" /> Kies datum & tijd</>}
              {currentStep === 2 && <><User className="w-5 h-5 text-pink-500" /> Uw gegevens</>}
              {currentStep === 3 && <><Heart className="w-5 h-5 text-green-500" /> Boeking Bevestigd</>}
            </CardTitle>
            {currentStep === 0 && (
              <CardDescription>Selecteer de behandeling die u wilt boeken</CardDescription>
            )}
            {currentStep === 1 && selectedTreatment && (
              <CardDescription>
                Geselecteerd: {selectedTreatment.name} - SRD {selectedTreatment.price_srd?.toLocaleString()}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="p-6">
            {currentStep === 0 && (
              <TreatmentSelector
                categories={categories}
                selectedTreatment={selectedTreatment}
                onSelect={setSelectedTreatment}
              />
            )}

            {currentStep === 1 && (
              <DateTimeSelector
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                availability={availability}
                onDateChange={(date) => {
                  setSelectedDate(date);
                  setSelectedTime('');
                }}
                onTimeChange={setSelectedTime}
                loading={availabilityLoading}
              />
            )}

            {currentStep === 2 && (
              <CustomerForm
                formData={formData}
                onChange={handleFormChange}
                errors={errors}
              />
            )}

            {currentStep === 3 && booking && (
              <BookingConfirmation booking={booking} />
            )}
          </CardContent>

          {/* Navigation Buttons */}
          {currentStep < 3 && (
            <div className="p-6 border-t bg-gray-50 flex justify-between">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Terug
              </Button>

              <Button
                onClick={handleNext}
                disabled={submitting}
                className="gap-2 bg-pink-500 hover:bg-pink-600"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Bezig met boeken...
                  </>
                ) : currentStep === 2 ? (
                  <>
                    Bevestig Boeking
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Volgende
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* After confirmation */}
          {currentStep === 3 && (
            <div className="p-6 border-t bg-gray-50 flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
              >
                Terug naar Home
              </Button>
              <Button
                onClick={() => {
                  setCurrentStep(0);
                  setSelectedTreatment(null);
                  setSelectedDate('');
                  setSelectedTime('');
                  setFormData({
                    client_name: '',
                    client_phone: '',
                    client_email: '',
                    notes: ''
                  });
                  setBooking(null);
                }}
                className="bg-pink-500 hover:bg-pink-600"
              >
                Nieuwe Boeking
              </Button>
            </div>
          )}
        </Card>
      </main>

      {/* Spa Branded Footer */}
      <footer className="bg-white border-t border-pink-100 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">{spaInfo.spa_name}</span>
            </div>
            <p className="text-sm text-gray-500 mb-2">Vragen over uw boeking?</p>
            <div className="flex items-center justify-center gap-4 text-sm">
              {spaInfo.phone && (
                <a href={`tel:${spaInfo.phone}`} className="text-pink-600 hover:text-pink-700 flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {spaInfo.phone}
                </a>
              )}
              {spaInfo.email && (
                <a href={`mailto:${spaInfo.email}`} className="text-pink-600 hover:text-pink-700 flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {spaInfo.email}
                </a>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Powered by Facturatie.sr
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
