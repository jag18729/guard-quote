import { Link } from "react-router-dom";
import { Shield, ArrowRight, Building2, User, ShieldCheck, CheckCircle2, Clock, MessageSquare, Headphones, Star, Quote, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="relative">
      {/* Hero glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent/10 blur-[120px] pointer-events-none" />
      
      {/* Hero */}
      <section className="relative pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-1.5 bg-accent/20 rounded text-accent text-xs font-mono font-medium tracking-wider">
            SECURITY MADE SIMPLE
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
          </div>
          
          <p className="mt-6 text-sm text-zinc-500">
            No commitment • Response within 24 hours • Transparent pricing
          </p>
        </div>
      </section>
      
      {/* Trust bar */}
      <section className="border-y border-zinc-800 bg-zinc-900/50 py-6">
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
              <div key={i} className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
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
                desc: "Our system calculates fair, transparent pricing instantly. No hidden fees, no surprises.",
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
          
          <div className="text-center mt-12">
            <Link 
              to="/quote" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-orange-600 text-black font-semibold rounded-lg transition-all hover:scale-105"
            >
              Start Your Free Quote <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
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
      <section className="py-20 px-6 bg-zinc-900/30 border-y border-zinc-800">
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
              <div key={i} className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-zinc-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to protect what matters?</h2>
          <p className="text-zinc-400 mb-8">Get a free quote in under 2 minutes. No commitment, no pressure.</p>
          <Link 
            to="/quote" 
            className="inline-flex items-center gap-2 px-10 py-5 bg-accent hover:bg-orange-600 text-black font-semibold rounded-lg transition-all hover:scale-105 text-lg"
          >
            Get Your Free Quote <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-6 text-sm text-zinc-500">
            Questions? <a href="mailto:hello@guardquote.com" className="text-accent hover:underline">hello@guardquote.com</a>
          </p>
        </div>
      </section>
    </div>
  );
}
