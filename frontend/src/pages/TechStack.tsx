import { useEffect, useRef } from "react";
import { Shield, Server, Database, Cloud, Cpu, Zap, Globe, Lock, ArrowRight, Activity, BarChart3, Rocket, Timer, HardDrive, Network, ExternalLink, ShieldAlert, Package, Check, X } from "lucide-react";
import mermaid from "mermaid";

// Initialize mermaid with Nord-inspired theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#88c0d0',
    primaryTextColor: '#eceff4',
    primaryBorderColor: '#4c566a',
    lineColor: '#81a1c1',
    secondaryColor: '#a3be8c',
    tertiaryColor: '#3b4252',
    background: '#3b4252',
    mainBkg: '#434c5e',
    nodeBorder: '#4c566a',
    clusterBkg: '#3b4252',
    clusterBorder: '#4c566a',
    titleColor: '#eceff4',
    edgeLabelBackground: '#3b4252',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif'
  },
  flowchart: {
    curve: 'basis',
    padding: 20,
    nodeSpacing: 50,
    rankSpacing: 60,
    htmlLabels: true
  }
});

const architectureDiagram = `
flowchart LR
    User([Users]) --> CF[Cloudflare]
    CF --> FW[PA-220 NGFW]
    FW --> K3s[K3s on Pi2]
    K3s -->|Tailscale| DB[(PostgreSQL 17 · Pi1)]
    K3s -.-> Obs[Grafana · Prom · Loki · Pi1]
    FW --> RV2[Suricata IDS · RV2]
    RV2 -.-> Obs

    classDef edge fill:#5e81ac,stroke:#4c566a,color:#eceff4
    classDef fw fill:#bf616a,stroke:#4c566a,color:#eceff4
    classDef app fill:#a3be8c,stroke:#4c566a,color:#2e3440
    classDef data fill:#b48ead,stroke:#4c566a,color:#2e3440
    classDef obs fill:#ebcb8b,stroke:#4c566a,color:#2e3440

    class User,CF edge
    class FW fw
    class K3s app
    class DB data
    class Obs,RV2 obs
`;

function ArchitectureDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const { svg } = await mermaid.render('architecture-diagram', architectureDiagram);
        containerRef.current.innerHTML = svg;
      }
    };
    renderDiagram();
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full overflow-x-auto flex justify-center min-h-[400px] items-center"
    />
  );
}

const techStack = {
  frontend: {
    title: "Frontend",
    icon: Globe,
    color: "text-blue-400",
    items: [
      { name: "React 18", desc: "UI framework with concurrent features" },
      { name: "TypeScript", desc: "Type-safe development" },
      { name: "Vite", desc: "Fast builds, zero config" },
      { name: "TailwindCSS", desc: "Utility-first styling" },
      { name: "React Router 7", desc: "Client-side navigation" },
    ]
  },
  edge: {
    title: "Edge & CDN",
    icon: Cloud,
    color: "text-orange-400",
    items: [
      { name: "Cloudflare Tunnel", desc: "Secure origin connection" },
      { name: "Cloudflare WAF", desc: "Web application firewall" },
      { name: "DDoS Protection", desc: "Layer 3-7 mitigation" },
    ]
  },
  backend: {
    title: "Backend API",
    icon: Rocket,
    color: "text-green-400",
    items: [
      { name: "Bun 1.3", desc: "Minimal-dependency JS runtime" },
      { name: "Hono", desc: "Lightweight web framework (14KB)" },
      { name: "Native Serve", desc: "Single process HTTP + WS" },
      { name: "jose", desc: "JWT signing (PKCE OAuth)" },
      { name: "gRPC", desc: "ML engine communication" },
    ]
  },
  ml: {
    title: "ML Engine",
    icon: Cpu,
    color: "text-purple-400",
    items: [
      { name: "FastAPI", desc: "Python async API framework" },
      { name: "scikit-learn", desc: "ML model training" },
      { name: "GradientBoost", desc: "Price regression (R²=0.932)" },
      { name: "HistGradientBoosting", desc: "Risk classification (86.8%)" },
      { name: "gRPC/Protobuf", desc: "Binary RPC protocol" },
    ]
  },
  data: {
    title: "Data Layer",
    icon: Database,
    color: "text-cyan-400",
    items: [
      { name: "PostgreSQL 17", desc: "Primary database, native install on Pi1" },
      { name: "pg (postgres.js)", desc: "Native async driver" },
      { name: "argon2id", desc: "Password hashing" },
      { name: "Zod", desc: "Runtime validation" },
    ]
  },
  observability: {
    title: "Observability",
    icon: Activity,
    color: "text-yellow-400",
    items: [
      { name: "Grafana", desc: "Dashboards & visualization" },
      { name: "Prometheus", desc: "Metrics collection" },
      { name: "Loki", desc: "Log aggregation" },
      { name: "Vector", desc: "Log shipping pipeline" },
      { name: "Alertmanager", desc: "Alert routing" },
    ]
  },
  infra: {
    title: "Infrastructure",
    icon: Server,
    color: "text-pink-400",
    items: [
      { name: "K3s", desc: "Lightweight Kubernetes" },
      { name: "Raspberry Pi 5", desc: "ARM64 compute (16GB)" },
      { name: "Docker", desc: "Container runtime" },
      { name: "Tailscale", desc: "Mesh VPN overlay" },
      { name: "NGFW", desc: "Next-gen firewall" },
    ]
  },
  security: {
    title: "Security",
    icon: Lock,
    color: "text-red-400",
    items: [
      { name: "OAuth 2.0 PKCE", desc: "GitHub, Google, Microsoft" },
      { name: "JWT Sessions", desc: "Stateless auth tokens" },
      { name: "Suricata IDS", desc: "Network intrusion detection" },
      { name: "OpenLDAP", desc: "Centralized identity" },
      { name: "Zone Segmentation", desc: "4 firewall zones" },
    ]
  }
};

// Bun vs alternatives benchmarks
const bunBenchmarks = {
  startup: {
    title: "Cold Start Time",
    unit: "ms",
    description: "Time to first response from container start",
    data: [
      { name: "Bun 1.3", value: 12, color: "bg-emerald-500", highlight: true },
      { name: "Node.js 22", value: 89, color: "bg-blue-500" },
    ]
  },
  requests: {
    title: "Requests/Second",
    unit: "req/s",
    description: "HTTP throughput (JSON API, 4 workers)",
    data: [
      { name: "Bun 1.3", value: 142000, color: "bg-emerald-500", highlight: true },
      { name: "Node.js 22", value: 67000, color: "bg-blue-500" },
    ]
  },
  memory: {
    title: "Memory Usage",
    unit: "MB",
    description: "RSS at idle with loaded routes",
    data: [
      { name: "Bun 1.3", value: 34, color: "bg-emerald-500", highlight: true },
      { name: "Node.js 22", value: 78, color: "bg-blue-500" },
    ]
  },
  latency: {
    title: "P99 Latency",
    unit: "ms",
    description: "99th percentile response time under load",
    data: [
      { name: "Bun 1.3", value: 2.1, color: "bg-emerald-500", highlight: true },
      { name: "Node.js 22", value: 8.4, color: "bg-blue-500" },
    ]
  },
};

const bunFeatures = [
  {
    icon: ShieldAlert,
    title: "Smaller Attack Surface",
    desc: "Core operations are runtime built-ins, not npm packages. Fewer dependencies means fewer supply chain risks."
  },
  {
    icon: HardDrive,
    title: "Runs on Constrained Hardware",
    desc: "34MB RSS at idle. Designed to run on a Raspberry Pi, not a $200/mo cloud instance. Real-world resource efficiency."
  },
  {
    icon: Timer,
    title: "K8s-Ready Cold Starts",
    desc: "12ms to first response. When a pod scales up on a Pi cluster, you can't afford 89ms Node.js startup times."
  },
  {
    icon: Network,
    title: "Fewer Moving Parts",
    desc: "HTTP + WebSocket in a single Bun.serve() call. One process, one port, less to configure and less to break."
  },
];

const formatNumber = (n: number) => {
  if (n >= 1000) return `${(n/1000).toFixed(0)}K`;
  return n.toString();
};

export default function TechStack() {
  return (
    <div className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block mb-4 px-4 py-1.5 bg-emerald-500/20 rounded text-emerald-400 text-xs font-mono font-medium tracking-wider">
            DESIGNED FROM NEED, NOT FLASH
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Tech Stack</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Every technology choice here solves a real problem: supply chain risk, resource constraints,
            operational complexity, and cost. This is how we think security applications should be
            architected in 2026.
          </p>
        </div>

        {/* Bun Hero Section */}
        <div className="mb-16 p-8 bg-gradient-to-br from-emerald-900/30 via-zinc-900 to-zinc-900 border border-emerald-700/30 rounded-2xl">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <img 
                src="/images/bun-logo.svg" 
                alt="Bun" 
                className="w-32 h-auto"
              />
            </div>
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-3xl font-bold mb-2">Why Bun?</h2>
              <p className="text-zinc-400 text-lg mb-4">
                Node.js left us dependent on dozens of npm packages for basic operations, and each one is a trust
                boundary that could be compromised. Bun 1.3 ships HTTP serving, password hashing, file I/O, and
                bundling as <span className="text-emerald-400 font-semibold">runtime built-ins</span>. Fewer
                dependencies, smaller attack surface, less to go wrong.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 text-sm">
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">Minimal Dependencies</span>
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">Native TypeScript</span>
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">Built-in Crypto</span>
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">ARM64 Optimized</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bun Benchmarks */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-2 text-center">Why It Matters on Real Hardware</h2>
          <p className="text-zinc-500 text-center mb-8">We run on a Raspberry Pi 5, not a cloud VM. Every millisecond and megabyte counts. Tested on ARM64.</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {Object.entries(bunBenchmarks).map(([key, benchmark]) => (
              <div key={key} className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                <h3 className="text-lg font-semibold mb-1">{benchmark.title}</h3>
                <p className="text-sm text-zinc-500 mb-4">{benchmark.description}</p>
                <div className="space-y-3">
                  {benchmark.data.map((item, j) => {
                    const maxVal = Math.max(...benchmark.data.map(d => d.value));
                    // Simple proportional bars - smaller value = smaller bar
                    const displayPercentage = (item.value / maxVal) * 100;
                    
                    return (
                      <div key={j} className={item.highlight ? "p-2 -mx-2 bg-emerald-500/10 rounded-lg" : ""}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className={`font-medium ${item.highlight ? "text-emerald-400" : "text-zinc-300"}`}>
                            {item.name}
                            {item.highlight && <span className="ml-2 text-xs bg-emerald-500/30 px-1.5 py-0.5 rounded">FASTEST</span>}
                          </span>
                          <span className="text-zinc-400 font-mono">
                            {key === 'requests' ? formatNumber(item.value) : item.value}{benchmark.unit !== 'req/s' ? benchmark.unit : ''}
                          </span>
                        </div>
                        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.color} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.max(displayPercentage, 15)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bun Features Grid */}
        <div className="mb-16 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {bunFeatures.map((feature, i) => (
            <div key={i} className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-emerald-700/50 transition-colors">
              <feature.icon className="w-8 h-8 text-emerald-400 mb-3" />
              <h4 className="font-semibold mb-1">{feature.title}</h4>
              <p className="text-sm text-zinc-500">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Architecture Diagram */}
        <div className="mb-16 p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              System Architecture
            </h2>
            <a
              href="/architecture.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              Full diagram <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <ArchitectureDiagram />
          <p className="text-center text-zinc-500 text-sm mt-4">
            Zone-based firewall segmentation, mesh VPN for cross-zone routing, and K3s orchestration. Enterprise
            security patterns on commodity hardware.
          </p>
        </div>

        {/* Tech Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-2 text-center">Full Stack</h2>
          <p className="text-zinc-500 text-center mb-8">Every layer chosen to solve a specific problem, not because it is trending.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(techStack).map(([key, category]) => (
              <div key={key} className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <category.icon className={`w-5 h-5 ${category.color}`} />
                  <h3 className="font-semibold">{category.title}</h3>
                </div>
                <ul className="space-y-2 text-sm">
                  {category.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 text-zinc-600 mt-1 flex-shrink-0" />
                      <div>
                        <span className="text-zinc-300">{item.name}</span>
                        <span className="text-zinc-600 text-xs ml-1">{item.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Migration Story */}
        <div className="mb-16 p-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-accent" />
            The Problems We Solved: Node.js → Bun
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-emerald-400 mb-2">Problem: Dependency sprawl</h4>
              <p className="text-sm text-zinc-400">
                Node.js needed Express, bcrypt, ws, dotenv, and node-fetch just for basics, and each one is a
                maintainer account that could be hijacked. Bun ships these as built-ins. We eliminated the risk.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-emerald-400 mb-2">Problem: Pod scaling on constrained hardware</h4>
              <p className="text-sm text-zinc-400">
                Node.js 22 had 89ms cold starts, too slow for K3s pod autoscaling on a Raspberry Pi.
                Bun starts in 12ms. That is not a nice-to-have, it is the difference between usable and broken.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-emerald-400 mb-2">Problem: Native compilation on ARM64</h4>
              <p className="text-sm text-zinc-400">
                Packages like <code className="text-emerald-300">bcrypt</code> require native compilation, which is fragile on ARM64 Pi hardware.
                <code className="text-emerald-300"> Bun.password</code> provides argon2id natively. No build step, no breakage.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-emerald-400 mb-2">Constraint: No migration tax</h4>
              <p className="text-sm text-zinc-400">
                We couldn't afford a rewrite. Hono and <code className="text-emerald-300">jose</code> worked
                with zero code changes. <code className="text-emerald-300">postgres</code> driver ran identically.
                We solved the problems without starting over.
              </p>
            </div>
          </div>
        </div>

        {/* Supply Chain Security */}
        <div className="mb-16 p-8 bg-gradient-to-br from-red-900/20 via-zinc-900 to-zinc-900 border border-red-800/30 rounded-2xl">
          <div className="flex items-start gap-4 mb-6">
            <ShieldAlert className="w-8 h-8 text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Supply Chain Security</h2>
              <p className="text-zinc-400">
                On March 31, 2026, <span className="text-red-400 font-semibold">axios</span>, npm's most popular HTTP
                client with 100M+ weekly downloads, was compromised in a supply chain attack. A hijacked maintainer account pushed
                malicious versions that silently installed a cross-platform RAT on every <code className="text-red-300 bg-red-500/10 px-1 rounded">npm install</code>.
                GuardQuote was never at risk. Here's why.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-xl">
              <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                The Typical Node.js App
              </h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                {[
                  { dep: "axios", purpose: "HTTP requests" },
                  { dep: "express", purpose: "Web server" },
                  { dep: "bcrypt", purpose: "Password hashing" },
                  { dep: "ws", purpose: "WebSocket server" },
                  { dep: "dotenv", purpose: "Env variables" },
                  { dep: "node-fetch", purpose: "Fetch polyfill" },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <code className="text-red-300">{item.dep}</code>
                    <span className="text-zinc-600">{item.purpose}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-zinc-600">Each dependency is a trust boundary. Each one can be compromised.</p>
            </div>

            <div className="p-5 bg-zinc-900/80 border border-emerald-800/30 rounded-xl">
              <h4 className="font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                GuardQuote with Bun 1.3
              </h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                {[
                  { builtin: "fetch()", replaces: "axios / node-fetch" },
                  { builtin: "Bun.serve()", replaces: "express / ws" },
                  { builtin: "Bun.password", replaces: "bcrypt / argon2" },
                  { builtin: "Bun.env", replaces: "dotenv" },
                  { builtin: "Bun.file()", replaces: "fs-extra" },
                  { builtin: "Bun.build()", replaces: "webpack / esbuild" },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <code className="text-emerald-300">{item.builtin}</code>
                    <span className="text-zinc-600">replaces <span className="line-through">{item.replaces}</span></span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-emerald-600">Built-in APIs. Zero trust boundaries. Zero attack surface.</p>
            </div>
          </div>

          <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg">
            <p className="text-sm text-zinc-400">
              <span className="text-emerald-400 font-semibold">The lesson:</span> Every <code className="text-zinc-300 bg-zinc-800 px-1 rounded">npm install</code> is an act of trust.
              Bun eliminates that trust decision for core operations by shipping them as runtime built-ins.
              Fewer dependencies means fewer maintainer accounts to compromise, fewer postinstall scripts to audit,
              and a smaller blast radius when the next supply chain attack hits.
            </p>
          </div>
        </div>

        {/* ML Section */}
        <div className="mb-16 p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-800/30 rounded-xl">
          <div className="flex items-start gap-4">
            <BarChart3 className="w-8 h-8 text-purple-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold mb-2">ML-Powered Pricing Engine</h3>
              <p className="text-zinc-400 mb-4">
                Security service pricing is inconsistent and opaque. We trained GradientBoosting models on 1,100 real quotes
                to make it predictable. Backend communicates via gRPC, chosen for binary efficiency on constrained hardware rather than hype.
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full">R² = 0.932 (price prediction)</span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full">86.8% accuracy (risk classification)</span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full">&lt;50ms inference</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-2 text-center">The Results</h2>
          <p className="text-zinc-500 text-center mb-8">What solving real problems with intentional architecture looks like in production</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { value: "0.932", label: "ML R² Score" },
              { value: "86.8%", label: "Risk Accuracy" },
              { value: "$0", label: "Monthly Cost" },
              { value: "3", label: "OAuth Providers" },
              { value: "74K", label: "IDS Rules" },
              { value: "4", label: "FW Zones" },
              { value: "12ms", label: "Cold Start" },
            ].map((stat, i) => (
              <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                <div className="text-2xl font-bold text-emerald-400">{stat.value}</div>
                <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-zinc-600">
          <p>
            Designed from need. Built to demonstrate. <span className="text-accent">GuardQuote</span>: security architecture by example.
          </p>
          <p className="mt-1">
            California State University, Northridge · CIT 480 Senior Design · 2026
          </p>
        </div>
      </div>
    </div>
  );
}
