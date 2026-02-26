import { useState } from "react";
import { Link } from "react-router-dom";
import { FileSearch, ArrowRight, Clock, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

interface QuoteResult {
  quote_number: string;
  status: string;
  event_name: string;
  event_type: string;
  event_date: string;
  total_price: number;
  num_guards: number;
  hours_per_guard: number;
  valid_until: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  draft: { color: "text-zinc-400 bg-zinc-800", icon: Clock, label: "Draft" },
  pending: { color: "text-amber-400 bg-amber-400/10", icon: Clock, label: "Pending Review" },
  sent: { color: "text-blue-400 bg-blue-400/10", icon: ArrowRight, label: "Sent" },
  accepted: { color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2, label: "Accepted" },
  rejected: { color: "text-red-400 bg-red-400/10", icon: AlertCircle, label: "Declined" },
  expired: { color: "text-zinc-500 bg-zinc-800", icon: Clock, label: "Expired" },
  completed: { color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2, label: "Completed" },
};

export default function QuoteLookup() {
  const [quoteNumber, setQuoteNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuoteResult | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${API_URL}/api/quotes/lookup?number=${encodeURIComponent(quoteNumber)}&email=${encodeURIComponent(email)}`);
      
      if (res.status === 404) {
        setError("No quote found with that number and email combination. Please check your details and try again.");
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Please try again later.");
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch {
      setError("Unable to connect to the server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = result ? STATUS_STYLES[result.status] || STATUS_STYLES.draft : null;

  return (
    <div className="relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/5 blur-[100px] pointer-events-none" />
      
      <section className="relative pt-16 pb-20 px-6">
        <div className="max-w-lg mx-auto">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-accent transition mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <FileSearch className="w-8 h-8 text-accent" />
            <h1 className="text-3xl font-bold">Review Your Quote</h1>
          </div>
          <p className="text-zinc-400 mb-8">
            Enter your quote number and email to view your quote details, status, and pricing.
          </p>

          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label htmlFor="quoteNumber" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Quote Number
              </label>
              <input
                id="quoteNumber"
                type="text"
                placeholder="e.g. GQ-2026-0042"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="The email used when requesting the quote"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-accent hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-accent text-black font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Looking up...
                </span>
              ) : (
                <>
                  <FileSearch className="w-5 h-5" />
                  Look Up Quote
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {result && statusInfo && (
            <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {/* Status header */}
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Quote</p>
                  <p className="font-mono font-semibold text-lg">{result.quote_number}</p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusInfo.color}`}>
                  <statusInfo.icon className="w-4 h-4" />
                  {statusInfo.label}
                </div>
              </div>
              
              {/* Details */}
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Event</p>
                    <p className="font-medium">{result.event_name || result.event_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Date</p>
                    <p className="font-medium">{new Date(result.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Guards</p>
                    <p className="font-medium">{result.num_guards} guards × {result.hours_per_guard}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Valid Until</p>
                    <p className="font-medium">{result.valid_until ? new Date(result.valid_until).toLocaleDateString() : "—"}</p>
                  </div>
                </div>
                
                {/* Price */}
                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex items-end justify-between">
                    <p className="text-sm text-zinc-500">Total Price</p>
                    <p className="text-3xl font-bold text-accent">
                      ${result.total_price?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                
                {/* Actions */}
                {(result.status === "sent" || result.status === "pending") && (
                  <div className="pt-4 border-t border-zinc-800 flex gap-3">
                    <button className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      Accept Quote
                    </button>
                    <button className="flex-1 py-3 border border-zinc-700 hover:border-red-500 text-zinc-400 hover:text-red-400 font-medium rounded-lg transition">
                      Request Revision
                    </button>
                  </div>
                )}
              </div>
              
              <div className="px-6 py-3 bg-zinc-800/30 text-xs text-zinc-500">
                Created {new Date(result.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
            </div>
          )}

          {/* Help text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-500">
              Don't have a quote yet?{" "}
              <Link to="/quote" className="text-accent hover:underline">Get a free quote</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
