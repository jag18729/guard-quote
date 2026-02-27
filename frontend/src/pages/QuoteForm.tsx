import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Shield, MapPin, Calendar, Users, Clock, DollarSign, Loader2, CheckCircle2, Building2, User, PartyPopper, ChevronRight, Phone, Mail } from "lucide-react";

interface EventType { id: number; name: string; code: string; }
interface Location { id: number; city: string; state: string; risk_score: number; }

export default function QuoteForm() {
  const { type } = useParams();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ price: number; priceRange: { low: number; high: number }; quoteNumber?: string } | null>(null);
  const [step, setStep] = useState(0); // 0 = choose type, 1 = details, 2 = contact, 3 = result
  
  const [form, setForm] = useState({
    quoteType: type || "",
    eventType: "",
    location: "",
    guestCount: 50,
    duration: 4,
    date: "",
    description: "",
    name: "",
    email: "",
    phone: "",
  });
  
  useEffect(() => {
    Promise.all([
      fetch("/api/event-types").then(r => r.json()),
      fetch("/api/locations").then(r => r.json()),
    ]).then(([et, loc]) => {
      setEventTypes(Array.isArray(et) ? et : et.data || []);
      setLocations(Array.isArray(loc) ? loc : loc.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (type) {
      setForm(f => ({ ...f, quoteType: type }));
      setStep(1);
    }
  }, [type]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: parseInt(form.eventType) || 1,
          location_id: parseInt(form.location) || 1,
          guest_count: form.guestCount,
          duration_hours: form.duration,
          guard_count: Math.ceil(form.guestCount / 50),
          email: form.email,
          name: form.name,
          date: form.date,
        }),
      });
      const data = await res.json();
      const basePrice = data.predicted_price || data.price || 1500;
      
      setResult({ 
        price: basePrice,
        priceRange: { low: Math.round(basePrice * 0.85), high: Math.round(basePrice * 1.15) },
        quoteNumber: data.quote_number,
      });
      setStep(3);
    } catch {
      setResult({ price: 1500, priceRange: { low: 1275, high: 1725 } });
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  const quoteTypes = [
    { id: "individual", icon: User, title: "Personal / Home", desc: "Residential security, personal protection, or private events" },
    { id: "business", icon: Building2, title: "Business / Office", desc: "Stores, offices, warehouses, or commercial properties" },
    { id: "security", icon: PartyPopper, title: "Event / Venue", desc: "Weddings, conferences, festivals, or special events" },
  ];
  
  return (
    <div className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        
        {/* Progress indicator */}
        {step > 0 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {["Type", "Details", "Contact", "Quote"].map((_, i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition ${
                  i < step ? "bg-emerald-500 text-white" : 
                  i === step ? "bg-accent text-black" : 
                  "bg-zinc-800 text-zinc-500"
                }`}>
                  {i < step ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                {i < 3 && <div className={`w-8 h-0.5 ${i < step ? "bg-emerald-500" : "bg-zinc-800"}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Step 0: Choose type */}
        {step === 0 && (
          <div className="animate-fadeIn">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">What do you need protected?</h1>
              <p className="text-zinc-400">Choose the option that best describes your situation</p>
            </div>
            
            <div className="space-y-4">
              {quoteTypes.map((qt) => (
                <button
                  key={qt.id}
                  onClick={() => { setForm({ ...form, quoteType: qt.id }); setStep(1); }}
                  className="w-full p-6 bg-zinc-900 border border-zinc-800 hover:border-accent rounded-xl text-left transition-all hover:-translate-y-1 flex items-center gap-4"
                >
                  <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <qt.icon className="w-7 h-7 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{qt.title}</h3>
                    <p className="text-sm text-zinc-400">{qt.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="animate-fadeIn">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Tell us the basics</h1>
              <p className="text-zinc-400">Just a few details to calculate your quote</p>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  What kind of {form.quoteType === "security" ? "event" : "protection"} is this?
                </label>
                <select
                  value={form.eventType}
                  onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:border-accent transition"
                  required
                >
                  <option value="">Select one...</option>
                  {eventTypes.map((et) => (
                    <option key={et.id} value={et.id}>{et.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" /> Where is this located?
                </label>
                <select
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:border-accent transition"
                  required
                >
                  <option value="">Select city...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.city}, {loc.state}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    <Users className="w-4 h-4 inline mr-1" /> How many people?
                  </label>
                  <input
                    type="number"
                    value={form.guestCount}
                    onChange={(e) => setForm({ ...form, guestCount: +e.target.value })}
                    min={1}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:border-accent transition"
                    placeholder="50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" /> How many hours?
                  </label>
                  <input
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: +e.target.value })}
                    min={1}
                    max={72}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:border-accent transition"
                    placeholder="4"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" /> When do you need this? (optional)
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:border-accent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Anything else we should know? (optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:border-accent transition resize-none"
                  placeholder="Special requirements, concerns, or questions..."
                />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setStep(0)} className="px-6 py-3 border border-zinc-700 hover:bg-zinc-800 rounded-xl transition">
                  Back
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-accent hover:bg-orange-600 text-black font-semibold rounded-xl transition flex items-center justify-center gap-2"
                >
                  Continue <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Contact info */}
        {step === 2 && (
          <div className="animate-fadeIn">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Almost done!</h1>
              <p className="text-zinc-400">Where should we send your quote?</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Your name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:border-accent transition"
                  placeholder="John Smith"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" /> Email address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:border-accent transition"
                  placeholder="john@example.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" /> Phone number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:border-accent transition"
                  placeholder="(555) 123-4567"
                  required
                />
              </div>

              <p className="text-xs text-zinc-500">
                By continuing, you agree to receive your quote via email and a follow-up call from one of our security consultants.
              </p>
              
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setStep(1)} className="px-6 py-3 border border-zinc-700 hover:bg-zinc-800 rounded-xl transition">
                  Back
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 py-3 bg-accent hover:bg-orange-600 disabled:bg-zinc-700 text-black font-semibold rounded-xl transition flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                  {submitting ? "Calculating..." : "Get My Quote"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 3 && result && (
          <div className="animate-fadeIn text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            
            <h1 className="text-3xl font-bold mb-2">Your quote is ready!</h1>
            <p className="text-zinc-400 mb-8">Here's your estimated cost</p>
            
            <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl mb-8">
              {result.quoteNumber && (
                <div className="text-xs text-zinc-600 mb-1 font-mono">{result.quoteNumber}</div>
              )}
              <div className="text-sm text-zinc-500 mb-2">Estimated Price</div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="w-10 h-10 text-accent" />
                <span className="text-5xl font-bold text-accent">{result.price.toLocaleString()}</span>
              </div>
              <div className="text-sm text-zinc-500">
                Typical range: ${result.priceRange.low.toLocaleString()} – ${result.priceRange.high.toLocaleString()}
              </div>
            </div>
            
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl mb-8 text-left">
              <h3 className="font-semibold mb-3">What happens next?</h3>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>We've sent a detailed quote to <strong className="text-white">{form.email}</strong></span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>A security consultant will call you within 24 hours to discuss your needs</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>No commitment required — get your questions answered first</span>
                </li>
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => { setStep(0); setResult(null); setForm({ ...form, quoteType: "" }); }}
                className="flex-1 py-3 border border-zinc-700 hover:bg-zinc-800 rounded-xl transition"
              >
                Get Another Quote
              </button>
              <a 
                href="tel:+18005551234"
                className="flex-1 py-3 bg-accent hover:bg-orange-600 text-black font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Call Now: 1-800-555-1234
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
