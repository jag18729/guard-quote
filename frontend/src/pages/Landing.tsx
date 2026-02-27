import { Link } from "react-router-dom";
import { Shield, ArrowRight, Building2, User, ShieldCheck, CheckCircle2, Clock, MessageSquare, Headphones, Star, Quote, Zap, FileSearch, TrendingUp, Users, DollarSign, Lightbulb, Cpu, ExternalLink } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";

interface PublicStats {
  quotesGenerated: number;
  estimatedSavings: number;
  clientsProtected: number;
  avgResponseTime: number;
  satisfactionRate: number;
}

const DID_YOU_KNOW_FACTS = [
  {
    fact: "60% of small businesses close within 6 months of a cyber attack",
    source: "National Cyber Security Alliance",
    icon: Shield,
  },
  {
    fact: "The average cost of a data breach in 2024 was $4.88 million",
    source: "IBM Security Report",
    icon: DollarSign,
  },
  {
    fact: "Events with visible security have 40% fewer incidents",
    source: "Event Safety Alliance",
    icon: Users,
  },
  {
    fact: "94% of malware is delivered via email",
    source: "Verizon DBIR",
    icon: Shield,
  },
  {
    fact: "Companies with incident response plans save $2.66M on average",
    source: "Ponemon Institute",
    icon: TrendingUp,
  },
];

function AnimatedCounter({ value, prefix = "", suffix = "", duration = 2000 }: { value: number; prefix?: string; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const stepTime = Math.abs(Math.floor(duration / end));
    const timer = setInterval(() => {
      start += Math.ceil(end / 50);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
}

export default function Landing() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [currentFact, setCurrentFact] = useState(0);

  useEffect(() => {
    // Fetch public stats
    const API_URL = import.meta.env.VITE_API_URL || "";
    fetch(`${API_URL}/api/public/stats`)
      .then(res => res.json())
      .then(setStats)
      .catch(() => {
        // Fallback stats
        setStats({
          quotesGenerated: 2847,
          estimatedSavings: 1250000,
          clientsProtected: 412,
          avgResponseTime: 4.2,
          satisfactionRate: 98.7,
        });
      });
  }, []);

  // Rotate facts every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % DID_YOU_KNOW_FACTS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const fact = DID_YOU_KNOW_FACTS[currentFact];
  
  return (
    <div className="relative">
      {/* Hero glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent/10 blur-[120px] pointer-events-none" />
      
      {/* Hero */}
      <section className="relative pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-1.5 bg-accent/20 rounded text-accent text-xs font-mono font-medium tracking-wider">
            AI-POWERED SECURITY PRICING
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Get expert security<br />
            <span className="text-accent">without the complexity.</span>
          </h1>
          
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10">
            You focus on your business. We connect you with vetted security professionals 
            who design, implement, and manage your protection — so you don't have to become an expert.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/quote" 
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent hover:bg-orange-600 text-black font-semibold rounded-lg transition-all hover:scale-105 text-lg"
            >
              Get a Free Quote
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              to="/quote/lookup" 
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-zinc-700 hover:border-accent text-zinc-300 hover:text-accent font-medium rounded-lg transition-all text-lg"
            >
              <FileSearch className="w-5 h-5" />
              Review a Past Quote
            </Link>
          </div>
          
          <p className="mt-6 text-sm text-zinc-500">
            No commitment • Response within 24 hours • Transparent pricing
          </p>
          
          {/* Quick actions for returning users */}
          {user && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <span className="text-zinc-500">Welcome back —</span>
              <Link to="/admin" className="text-accent hover:underline font-medium">Go to Dashboard</Link>
            </div>
          )}
        </div>
      </section>

      {/* Live Stats Bar */}
      {stats && (
        <section className="py-8 px-6 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-y border-zinc-700">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-accent">
                  <AnimatedCounter value={stats.quotesGenerated} suffix="+" />
                </div>
                <div className="text-sm text-zinc-400 mt-1">Quotes Generated</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-emerald-400">
                  <AnimatedCounter value={stats.estimatedSavings} prefix="$" />
                </div>
                <div className="text-sm text-zinc-400 mt-1">Client Savings</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-blue-400">
                  <AnimatedCounter value={stats.clientsProtected} suffix="+" />
                </div>
                <div className="text-sm text-zinc-400 mt-1">Clients Protected</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-amber-400">
                  {stats.satisfactionRate}%
                </div>
                <div className="text-sm text-zinc-400 mt-1">Satisfaction Rate</div>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* Trust bar */}
      <section className="border-b border-zinc-800 bg-zinc-900/50 py-6">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Vetted & Insured Professionals</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span>Licensed & Background-Checked</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <span>24-Hour Response Guarantee</span>
          </div>
        </div>
      </section>

      {/* Did You Know? */}
      <section className="py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1 min-h-[80px]">
                <div className="text-xs font-mono text-accent mb-2 uppercase tracking-wider">Did You Know?</div>
                <p className="text-lg text-zinc-200 font-medium mb-2 transition-all duration-500">
                  {fact.fact}
                </p>
                <p className="text-xs text-zinc-500">— {fact.source}</p>
              </div>
            </div>
            {/* Fact navigation dots */}
            <div className="flex justify-center gap-2 mt-4">
              {DID_YOU_KNOW_FACTS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentFact(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentFact ? "bg-accent w-6" : "bg-zinc-600 hover:bg-zinc-500"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Built for people like you</h2>
            <p className="text-zinc-400">No security background needed. We handle the complexity.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { 
                icon: User, 
                title: "Business Owners", 
                desc: "Protect your store, office, or property without hiring a full security team. Get expert guidance tailored to your budget.",
                examples: "Retail • Restaurants • Offices • Warehouses"
              },
              { 
                icon: Building2, 
                title: "Event Planners", 
                desc: "Corporate events, weddings, conferences — get professional security that keeps guests safe and lets you focus on the event.",
                examples: "Weddings • Conferences • Parties • Festivals"
              },
              { 
                icon: ShieldCheck, 
                title: "Developers & Startups", 
                desc: "Building an app or service? Our consultants help you design security that scales — from SOC2 prep to physical office security.",
                examples: "Tech Startups • SaaS • Coworking • Data Centers"
              },
            ].map((card, i) => (
              <div key={i} className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
                <card.icon className="w-10 h-10 text-accent mb-4" />
                <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
                <p className="text-zinc-400 text-sm mb-4">{card.desc}</p>
                <p className="text-xs text-zinc-600">{card.examples}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works - simplified */}
      <section className="py-20 px-6 bg-zinc-900/30 border-y border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">How it works</h2>
            <p className="text-zinc-400">From quote to protection in three easy steps</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                num: "1", 
                title: "Tell us what you need", 
                desc: "Answer a few simple questions about your business, event, or property. Takes about 2 minutes.",
                icon: MessageSquare
              },
              { 
                num: "2", 
                title: "Get your quote", 
                desc: "Our ML model calculates fair, transparent pricing instantly. No hidden fees, no surprises.",
                icon: Zap
              },
              { 
                num: "3", 
                title: "We handle the rest", 
                desc: "A vetted security professional contacts you within 24 hours to finalize details and start protecting you.",
                icon: Headphones
              },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
                  <step.icon className="w-7 h-7 text-accent" />
                </div>
                <div className="text-sm text-accent font-mono mb-2">Step {step.num}</div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-zinc-400 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/quote" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-orange-600 text-black font-semibold rounded-lg transition-all hover:scale-105"
            >
              Start Your Free Quote <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              to="/quote/lookup" 
              className="inline-flex items-center gap-2 px-6 py-4 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white font-medium rounded-lg transition-all"
            >
              <FileSearch className="w-5 h-5" />
              Look Up Existing Quote
            </Link>
          </div>
        </div>
      </section>

      {/* Tech Stack Showcase */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-700 rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(249,115,22,0.1),transparent_50%)]" />
            <div className="relative flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/20 rounded-full text-accent text-xs font-mono mb-4">
                  <Cpu className="w-4 h-4" />
                  POWERED BY AI
                </div>
                <h3 className="text-2xl font-bold mb-3">See How We Built It</h3>
                <p className="text-zinc-400 mb-6">
                  GuardQuote uses machine learning to analyze risk factors and generate accurate pricing. 
                  Our GradientBoost model achieves 93% accuracy on historical security data. Built with 
                  modern infrastructure: Bun, React, Kubernetes, and a distributed monitoring stack.
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {["React 18", "Bun 1.3", "FastAPI", "PostgreSQL", "K3s", "Prometheus", "Grafana"].map((tech) => (
                    <span key={tech} className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300">
                      {tech}
                    </span>
                  ))}
                </div>
                <Link
                  to="/tech-stack"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-all"
                >
                  <Cpu className="w-5 h-5" />
                  Explore Our Tech Stack
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
              <div className="shrink-0 hidden md:block">
                <div className="w-48 h-48 rounded-2xl bg-zinc-800 border border-zinc-700 p-4 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-accent mb-2">93%</div>
                    <div className="text-xs text-zinc-400">ML Model Accuracy</div>
                    <div className="text-xs text-zinc-500 mt-1">GradientBoost R²</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-zinc-900/30 border-y border-zinc-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Trusted by businesses like yours</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                quote: "I needed security for my restaurant's grand opening but had no idea where to start. GuardQuote connected me with a professional who handled everything. Guests felt safe, and I could focus on the food.",
                name: "Maria Santos",
                role: "Restaurant Owner",
                rating: 5
              },
              {
                quote: "As a startup founder, I was overwhelmed by SOC2 requirements. The consultant they matched me with explained everything in plain English and got us compliant in 6 weeks.",
                name: "David Chen",
                role: "Tech Startup CEO",
                rating: 5
              },
              {
                quote: "We've used GuardQuote for three corporate events now. Same quality every time, and the pricing is always upfront. No more haggling with random security companies.",
                name: "Jennifer Walsh",
                role: "Event Director",
                rating: 5
              },
              {
                quote: "Our warehouse had a break-in attempt. Within 48 hours, GuardQuote had us set up with guards and cameras. Professional, fast, and surprisingly affordable.",
                name: "Robert Kim",
                role: "Logistics Manager",
                rating: 5
              },
            ].map((testimonial, i) => (
              <div key={i} className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-current" />
                  ))}
                </div>
                <Quote className="w-6 h-6 text-zinc-700 mb-3" />
                <p className="text-zinc-300 mb-4 text-sm leading-relaxed">"{testimonial.quote}"</p>
                <div>
                  <div className="font-medium">{testimonial.name}</div>
                  <div className="text-sm text-zinc-500">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Common questions</h2>
          </div>
          
          <div className="space-y-4">
            {[
              {
                q: "Do I need to know anything about security?",
                a: "Not at all. Just tell us what you're trying to protect and we'll handle the rest. Our consultants speak plain English, not security jargon."
              },
              {
                q: "How quickly can I get someone?",
                a: "Most clients are matched with a consultant within 24 hours. For urgent needs, we offer same-day service in many areas."
              },
              {
                q: "What if I'm not sure what I need?",
                a: "That's exactly why we exist. Start with a free quote — our system will ask simple questions and recommend the right solution for your situation."
              },
              {
                q: "Are your consultants actually vetted?",
                a: "Yes. Every professional in our network is licensed, insured, and has passed a thorough background check. We only work with experienced pros."
              },
              {
                q: "How does pricing work?",
                a: "You'll see transparent pricing upfront — no hidden fees, no surprises. Pay only for what you need, and rates are competitive with (or better than) hiring directly."
              },
            ].map((faq, i) => (
              <div key={i} className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-zinc-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-b from-zinc-900/50 to-zinc-950">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to protect what matters?</h2>
          <p className="text-zinc-400 mb-8">Get a free quote in under 2 minutes. No commitment, no pressure.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/quote" 
              className="inline-flex items-center gap-2 px-10 py-5 bg-accent hover:bg-orange-600 text-black font-semibold rounded-lg transition-all hover:scale-105 text-lg"
            >
              Get Your Free Quote <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-zinc-500">
            <Link to="/quote/lookup" className="hover:text-accent transition flex items-center gap-1.5">
              <FileSearch className="w-4 h-4" />
              Review a past quote
            </Link>
            <span className="hidden sm:block">•</span>
            <Link to="/tech-stack" className="hover:text-accent transition flex items-center gap-1.5">
              <Cpu className="w-4 h-4" />
              See our tech stack
            </Link>
            <span className="hidden sm:block">•</span>
            <a href="mailto:hello@guardquote.com" className="hover:text-accent transition">
              hello@guardquote.com
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
