import { Outlet, Link, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function PublicLayout() {
  const location = useLocation();
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Masthead */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition">
            <Shield className="w-6 h-6 text-accent" />
            <span className="font-bold text-lg">Guard<span className="text-accent">Quote</span></span>
          </Link>
          
          <nav className="flex items-center gap-2">
            <Link 
              to="/" 
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${location.pathname === "/" ? "text-white bg-zinc-800" : "text-zinc-400 hover:text-white hover:bg-zinc-900"}`}
            >
              Home
            </Link>
            <Link 
              to="/quote" 
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${location.pathname.startsWith("/quote") ? "text-white bg-zinc-800" : "text-zinc-400 hover:text-white hover:bg-zinc-900"}`}
            >
              Get Quote
            </Link>
            {user ? (
              <Link to="/admin" className="ml-2 px-4 py-2 text-sm font-medium bg-accent hover:bg-orange-600 text-black rounded-lg transition">
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="ml-2 px-4 py-2 text-sm font-medium border border-zinc-700 hover:border-accent text-zinc-300 hover:text-accent rounded-lg transition">
                Admin Login
              </Link>
            )}
          </nav>
        </div>
      </header>
      
      <main>
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 mt-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-accent" />
                <span className="font-bold">GuardQuote</span>
              </div>
              <p className="text-sm text-zinc-500">
                Expert security made simple. We connect you with vetted professionals who protect what matters.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-sm">Services</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><Link to="/quote/individual" className="hover:text-accent">Personal Security</Link></li>
                <li><Link to="/quote/business" className="hover:text-accent">Business Security</Link></li>
                <li><Link to="/quote/security" className="hover:text-accent">Event Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-sm">Support</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="mailto:hello@guardquote.com" className="hover:text-accent">Contact Us</a></li>
                <li><a href="#" className="hover:text-accent">FAQ</a></li>
                <li><a href="#" className="hover:text-accent">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-sm">Contact</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li>1-800-555-1234</li>
                <li>hello@guardquote.com</li>
                <li>Mon-Fri, 8am-6pm PT</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
            <p>© 2026 GuardQuote. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-zinc-400">Privacy</a>
              <a href="#" className="hover:text-zinc-400">Terms</a>
              <Link to="/login" className="hover:text-zinc-400">Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
