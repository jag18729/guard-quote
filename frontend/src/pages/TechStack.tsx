import { useEffect, useRef } from "react";
import { Shield, Server, Database, Cloud, Cpu, Zap, Globe, Lock, ArrowRight, Activity, BarChart3, Rocket, Timer, HardDrive, Network, ExternalLink } from "lucide-react";
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
    padding: 24,
    nodeSpacing: 80,
    rankSpacing: 100,
    htmlLabels: true
  }
});

const architectureDiagram = `
flowchart LR
    subgraph Internet["☁️ INTERNET"]
        direction TB
        User([👤 Users])
        CF[Cloudflare<br/>CDN + WAF]
    end

    subgraph Remote["🌐 REMOTE SITE"]
        direction TB
        RNode[Tailscale<br/>Node]
    end

    subgraph DC["🏢 PRIMARY DATACENTER"]
        direction TB
        
        subgraph Core["CORE NETWORK"]
            GW[Gateway<br/>Router]
            DB[(PostgreSQL)]
        end

        subgraph Firewall["🔥 NGFW"]
            FW[Next-Gen<br/>Firewall]
        end

        subgraph MGMT["DMZ-MGMT"]
            direction LR
            DNS[DNS<br/>Server]
            LDAP[Identity<br/>Provider]
            Vector[Log<br/>Shipper]
        end

        subgraph Services["DMZ-MONITORING"]
            Tunnel[Secure<br/>Tunnel]
            Graf[Grafana]
            Prom[Prometheus]
            Loki[Loki]
        end

        subgraph Apps["DMZ-APPS"]
            subgraph K3s["☸️ K3s Cluster"]
                FE[📱 Frontend]
                BE[⚡ Backend]
                ML[🧠 ML Engine]
            end
        end

        subgraph Security["DMZ-SECURITY"]
            direction LR
            IDS[🛡️ IDS/IPS]
            SN[🕵️ Threat<br/>Detection]
        end
    end

    User --> CF
    CF --> Tunnel
    
    RNode <-.->|VPN Mesh| Tunnel
    RNode -.-> Graf
    
    Tunnel --> FE
    FE --> BE
    BE --> ML
    BE --> DB
    
    FW -.-> Vector
    IDS -.-> Vector
    Vector --> Loki

    classDef internet fill:#5e81ac,stroke:#4c566a,color:#eceff4
    classDef remote fill:#88c0d0,stroke:#4c566a,color:#2e3440
    classDef infra fill:#d08770,stroke:#4c566a,color:#2e3440
    classDef app fill:#a3be8c,stroke:#4c566a,color:#2e3440
    classDef security fill:#bf616a,stroke:#4c566a,color:#eceff4
    classDef data fill:#b48ead,stroke:#4c566a,color:#2e3440

    class User,CF internet
    class RNode remote
    class GW,Tunnel,FW,DNS,LDAP,Vector,Graf,Prom,Loki infra
    class FE,BE,ML,SN app
    class IDS security
    class DB data
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
      { name: "Vite", desc: "Lightning-fast build tool" },
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
      { name: "Bun 1.3", desc: "Blazing fast JS runtime" },
      { name: "Hono", desc: "Ultrafast web framework" },
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
      { name: "GradientBoost", desc: "Price regression (R²=0.93)" },
      { name: "RandomForest", desc: "Risk classification (81%)" },
      { name: "gRPC/Protobuf", desc: "Binary RPC protocol" },
    ]
  },
  data: {
    title: "Data Layer",
    icon: Database,
    color: "text-cyan-400",
    items: [
      { name: "PostgreSQL 16", desc: "Primary database" },
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
      { name: "Deno 2.x", value: 45, color: "bg-purple-500" },
    ]
  },
  requests: {
    title: "Requests/Second",
    unit: "req/s",
    description: "HTTP throughput (JSON API, 4 workers)",
    data: [
      { name: "Bun 1.3", value: 142000, color: "bg-emerald-500", highlight: true },
      { name: "Node.js 22", value: 67000, color: "bg-blue-500" },
      { name: "Deno 2.x", value: 98000, color: "bg-purple-500" },
    ]
  },
  memory: {
    title: "Memory Usage",
    unit: "MB",
    description: "RSS at idle with loaded routes",
    data: [
      { name: "Bun 1.3", value: 34, color: "bg-emerald-500", highlight: true },
      { name: "Node.js 22", value: 78, color: "bg-blue-500" },
      { name: "Deno 2.x", value: 52, color: "bg-purple-500" },
    ]
  },
  latency: {
    title: "P99 Latency",
    unit: "ms",
    description: "99th percentile response time under load",
    data: [
      { name: "Bun 1.3", value: 2.1, color: "bg-emerald-500", highlight: true },
      { name: "Node.js 22", value: 8.4, color: "bg-blue-500" },
      { name: "Deno 2.x", value: 4.7, color: "bg-purple-500" },
    ]
  },
};

const bunFeatures = [
  {
    icon: Rocket,
    title: "Native Speed",
    desc: "JavaScriptCore engine (Safari's) with JIT compilation. 2-4x faster than V8 for most workloads."
  },
  {
    icon: HardDrive,
    title: "Built-in APIs",
    desc: "Native Bun.serve(), Bun.password, Bun.file — no external dependencies for core ops."
  },
  {
    icon: Timer,
    title: "Instant Start",
    desc: "12ms cold start vs 89ms Node.js. Critical for K8s pod scaling and development iteration."
  },
  {
    icon: Network,
    title: "Unified Server",
    desc: "HTTP + WebSocket in single Bun.serve() call. One process, one port, simpler deployment."
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
            POWERED BY BUN 1.3
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Tech Stack</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Built on cutting-edge technology. Bun runtime for blazing performance, 
            K3s for orchestration, ML-powered pricing, all self-hosted on Raspberry Pi.
          </p>
        </div>

        {/* Bun Hero Section */}
        <div className="mb-16 p-8 bg-gradient-to-br from-emerald-900/30 via-zinc-900 to-zinc-900 border border-emerald-700/30 rounded-2xl">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/25">
                <span className="text-6xl">🥟</span>
              </div>
            </div>
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-3xl font-bold mb-2">Why Bun?</h2>
              <p className="text-zinc-400 text-lg mb-4">
                We migrated from Node.js to Bun 1.3 for GuardQuote v2. The results speak for themselves:
                <span className="text-emerald-400 font-semibold"> 2x faster requests, 50% less memory, 7x faster cold starts.</span>
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 text-sm">
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">JavaScriptCore Engine</span>
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">Native TypeScript</span>
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">Built-in Bundler</span>
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">npm Compatible</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bun Benchmarks */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-2 text-center">Performance Benchmarks</h2>
          <p className="text-zinc-500 text-center mb-8">Bun 1.3 vs Node.js 22 vs Deno 2.x — tested on Raspberry Pi 5 (ARM64)</p>
          
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
              href="https://htmlpreview.github.io/?https://gist.githubusercontent.com/jag18729/968ce9b880b5d7164187fa9f1a29b9b8/raw/guardquote-architecture.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              Full diagram <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <ArchitectureDiagram />
          <p className="text-center text-zinc-500 text-sm mt-4">
            Multi-site deployment with mesh VPN, zone-based firewall segmentation, and K3s orchestration
          </p>
        </div>

        {/* Tech Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Full Stack</h2>
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
                        <span className="text-zinc-600 text-xs ml-1">— {item.desc}</span>
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
            Migration Story: Node.js → Bun
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-emerald-400 mb-2">Why we switched</h4>
              <p className="text-sm text-zinc-400">
                Node.js 22 with Express had 89ms cold starts — unacceptable for K8s pod scaling. 
                Bun's 12ms starts and native TypeScript support made development and deployment faster.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-emerald-400 mb-2">What we kept</h4>
              <p className="text-sm text-zinc-400">
                Hono framework worked perfectly — zero code changes. npm packages like <code className="text-emerald-300">jose</code> and 
                <code className="text-emerald-300"> postgres</code> just worked. Full npm compatibility.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-emerald-400 mb-2">ARM64 Performance</h4>
              <p className="text-sm text-zinc-400">
                Bun's JavaScriptCore runs exceptionally well on ARM64 (Raspberry Pi 5). 
                Better SIMD utilization than V8 for our JSON-heavy API workload.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-emerald-400 mb-2">Built-in wins</h4>
              <p className="text-sm text-zinc-400">
                <code className="text-emerald-300">Bun.password</code> for argon2id (no native deps), 
                <code className="text-emerald-300"> Bun.serve()</code> for unified HTTP+WS. Fewer moving parts.
              </p>
            </div>
          </div>
        </div>

        {/* ML Section */}
        <div className="mb-16 p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-800/30 rounded-xl">
          <div className="flex items-start gap-4">
            <BarChart3 className="w-8 h-8 text-purple-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold mb-2">ML-Powered Pricing Engine</h3>
              <p className="text-zinc-400 mb-4">
                Our ML engine uses GradientBoosting and RandomForest models trained on 500+ real security service quotes.
                Backend communicates via gRPC for low-latency inference.
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full">R² = 0.93 (price prediction)</span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full">81% accuracy (risk classification)</span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full">&lt;50ms inference</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Key Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { value: "0.93", label: "ML R² Score" },
              { value: "81%", label: "Risk Accuracy" },
              { value: "$0", label: "Monthly Cost" },
              { value: "3", label: "OAuth Providers" },
              { value: "48K", label: "IDS Rules" },
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
            Built with 🥟 Bun by the <span className="text-accent">GuardQuote</span> team
          </p>
          <p className="mt-1">
            California State University, Northridge · CIT 480 Senior Design · February 2026
          </p>
        </div>
      </div>
    </div>
  );
}
