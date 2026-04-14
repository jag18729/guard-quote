// @ts-nocheck
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════════
   SOUND ENGINE  — Web Audio API, zero file deps
   All sounds are synthesized procedurally
═══════════════════════════════════════════════════════════════ */
const SFX = (() => {
  let ctx = null;
  let muted = false;
  const getCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };

  const master = (vol = 0.18) => {
    const g = getCtx().createGain();
    g.gain.value = muted ? 0 : vol;
    g.connect(getCtx().destination);
    return g;
  };

  return {
    toggle() { muted = !muted; return muted; },
    isMuted() { return muted; },

    // Boot beep sequence — short ascending tones
    bootBeep(freq = 440, dur = 0.06) {
      try {
        const a = getCtx(), g = master(0.12);
        const o = a.createOscillator();
        o.type = "square"; o.frequency.value = freq;
        const env = a.createGain();
        env.gain.setValueAtTime(0.3, a.currentTime);
        env.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
        o.connect(env); env.connect(g);
        o.start(a.currentTime); o.stop(a.currentTime + dur);
      } catch {}
    },

    // Access granted — cinematic ascending chord
    accessGranted() {
      try {
        const a = getCtx();
        [523, 659, 784, 1047].forEach((f, i) => {
          const o = a.createOscillator(), g = master(0.1);
          const env = a.createGain();
          o.type = "sine"; o.frequency.value = f;
          const t = a.currentTime + i * 0.12;
          env.gain.setValueAtTime(0, t);
          env.gain.linearRampToValueAtTime(0.4, t + 0.05);
          env.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
          o.connect(env); env.connect(g);
          o.start(t); o.stop(t + 0.65);
        });
      } catch {}
    },

    // UI click — dry mechanical tick
    click() {
      try {
        const a = getCtx(), g = master(0.08);
        const buf = a.createBuffer(1, a.sampleRate * 0.03, a.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 8);
        const src = a.createBufferSource();
        src.buffer = buf;
        const filter = a.createBiquadFilter();
        filter.type = "highpass"; filter.frequency.value = 2000;
        src.connect(filter); filter.connect(g);
        src.start();
      } catch {}
    },

    // Hover — subtle high tick
    hover() {
      try {
        const a = getCtx(), g = master(0.04);
        const o = a.createOscillator();
        o.type = "sine"; o.frequency.value = 1800;
        const env = a.createGain();
        env.gain.setValueAtTime(0.15, a.currentTime);
        env.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.04);
        o.connect(env); env.connect(g);
        o.start(a.currentTime); o.stop(a.currentTime + 0.045);
      } catch {}
    },

    // Alert ping — sharp descending alarm
    alertPing(sev = "info") {
      try {
        const a = getCtx(), g = master(0.14);
        const freqs = { critical: [880, 440], high: [660, 440], warn: [550, 440], info: [440] };
        const f = freqs[sev] || freqs.info;
        f.forEach((freq, i) => {
          const o = a.createOscillator(), env = a.createGain();
          o.type = "sawtooth"; o.frequency.value = freq;
          const t = a.currentTime + i * 0.18;
          env.gain.setValueAtTime(0.3, t);
          env.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
          o.connect(env); env.connect(g);
          o.start(t); o.stop(t + 0.28);
        });
      } catch {}
    },

    // Radar ping — sonar blip
    radarPing() {
      try {
        const a = getCtx(), g = master(0.1);
        const o = a.createOscillator(), env = a.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(1200, a.currentTime);
        o.frequency.exponentialRampToValueAtTime(300, a.currentTime + 0.5);
        env.gain.setValueAtTime(0.35, a.currentTime);
        env.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.5);
        o.connect(env); env.connect(g);
        o.start(a.currentTime); o.stop(a.currentTime + 0.55);
      } catch {}
    },

    // Glitch burst — distorted noise
    glitch() {
      try {
        const a = getCtx(), g = master(0.06);
        const dur = 0.08;
        const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = a.createBufferSource();
        src.buffer = buf;
        const filter = a.createBiquadFilter();
        filter.type = "bandpass"; filter.frequency.value = 800; filter.Q.value = 0.5;
        src.connect(filter); filter.connect(g);
        src.start();
      } catch {}
    },

    // Data stream — rapid fire blips (boot)
    dataStream() {
      try {
        const a = getCtx();
        for (let i = 0; i < 6; i++) {
          const g = master(0.05), o = a.createOscillator(), env = a.createGain();
          o.type = "square";
          o.frequency.value = 200 + Math.random() * 600;
          const t = a.currentTime + i * 0.025;
          env.gain.setValueAtTime(0.2, t);
          env.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
          o.connect(env); env.connect(g);
          o.start(t); o.stop(t + 0.025);
        }
      } catch {}
    },

    // Tab switch — whoosh
    tabSwitch() {
      try {
        const a = getCtx(), g = master(0.07);
        const o = a.createOscillator(), env = a.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(600, a.currentTime);
        o.frequency.exponentialRampToValueAtTime(200, a.currentTime + 0.15);
        env.gain.setValueAtTime(0.2, a.currentTime);
        env.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.15);
        o.connect(env); env.connect(g);
        o.start(a.currentTime); o.stop(a.currentTime + 0.18);
      } catch {}
    },
  };
})();

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const STATUS_PHRASES = ["SYSTEMS NOMINAL","THREAT LEVEL: LOW","ALL AGENTS REPORTING","PERIMETER SECURE","MONITORING ACTIVE"];
const PHRASE = "GUARDQUOTE SOC // WAZUH SURICATA PA-220 K3S TAILSCALE CLOUDFLARE // VANDINE.US // ";
const BOOT_LINES = [
  { text:"INITIALIZING WAZUH SOC COMMAND CENTER v4.14.3...", beep:880 },
  { text:"Loading services: [suricata] [wazuh-manager] [grafana] [prometheus] [loki]", beep:660 },
  { text:"Establishing Tailscale mesh VPN... CONNECTED (10 nodes)", beep:770 },
  { text:"K3s cluster health check... sentinel-node READY (v1.34.4)", beep:550 },
  { text:"Mounting encrypted volumes... OK", beep:440 },
  { text:"ML engine warmup (XGBoost + gRPC)... READY", beep:660 },
  { text:"OpenLDAP bind: rafaeljg@vandine.us... AUTHENTICATED", beep:880 },
  { text:"Cloudflare Tunnel sync... 4 ingress routes ACTIVE", beep:550 },
  { text:"Suricata IDS rv2: v7.0.3 — 75,313 rules loaded", beep:440 },
  { text:"Suricata IDS pi2: v7.0.10 — ET Open ruleset ACTIVE", beep:660 },
  { text:"Wazuh Manager: 3 agents reporting (pi0, pi2, rv2-syslog)", beep:770 },
  { text:"gRPC FastAPI ML engine: ONLINE (guardquote-ml:50051)", beep:880 },
  { text:"PA-220 zone segmentation: 4 firewall zones ACTIVE", beep:550 },
  { text:"", beep:0 },
  { text:"ALL SYSTEMS NOMINAL. CLEARANCE: ALPHA.", beep:1047 },
  { text:">> ACCESS GRANTED — WELCOME, OPERATOR <<", beep:0 },
];

/* ═══════════════════════════════════════════════════════════════
   PERFORMANCE: 3D TILT via direct DOM manipulation — ZERO re-renders
═══════════════════════════════════════════════════════════════ */
function use3DTilt(strength = 12) {
  const ref = useRef(null);
  const rafRef = useRef(null);

  const onMouseMove = useCallback((e) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(700px) rotateY(${x*strength}deg) rotateX(${-y*strength}deg) scale3d(1.02,1.02,1.02)`;
      el.style.transition = "transform 0.08s ease-out";
    });
  }, [strength]);

  const onMouseLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const el = ref.current; if (!el) return;
    el.style.transform = "perspective(700px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)";
    el.style.transition = "transform 0.45s ease-out";
  }, []);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  return { ref, onMouseMove, onMouseLeave };
}

/* ═══════════════════════════════════════════════════════════════
   COUNT-UP
═══════════════════════════════════════════════════════════════ */
function useCountUp(target, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null, raf;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ═══════════════════════════════════════════════════════════════
   BOOT SEQUENCE
═══════════════════════════════════════════════════════════════ */
function BootSequence({ onDone }) {
  const [lines, setLines] = useState([]);
  const [done, setDone] = useState(false);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    let i = 0;
    const next = () => {
      if (i >= BOOT_LINES.length) {
        setTimeout(() => {
          setDone(true);
          SFX.accessGranted();
          setTimeout(() => { setFade(true); setTimeout(onDone, 700); }, 600);
        }, 400);
        return;
      }
      const line = BOOT_LINES[i];
      setLines(l => [...l, line.text]);
      if (line.beep) SFX.bootBeep(line.beep, 0.05);
      else if (line.text) SFX.dataStream();
      i++;
      setTimeout(next, i < 14 ? 110 : i === 14 ? 350 : 200);
    };
    setTimeout(next, 400);
  }, []);

  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"#000",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",opacity:fade?0:1,transition:"opacity 0.7s ease",fontFamily:"'JetBrains Mono',monospace",willChange:"opacity" }}>
      <HexGrid opacity={0.07} />
      <div style={{ position:"relative",zIndex:10,width:"100%",maxWidth:700,padding:"0 36px" }}>
        <div style={{ textAlign:"center",marginBottom:36 }}>
          <div style={{ fontSize:11,letterSpacing:"7px",color:"#2a2a2a",marginBottom:10 }}>VANDINE.US // DEFENSIVE OPERATIONS</div>
          <div style={{ fontSize:24,fontWeight:900,letterSpacing:"5px",color:"#00ff9d",textShadow:"0 0 20px rgba(0,255,157,0.6)" }}>WAZUH SOC COMMAND CENTER</div>
        </div>
        <div style={{ borderLeft:"2px solid rgba(0,255,157,0.35)",paddingLeft:22,minHeight:340 }}>
          {lines.map((l,i) => (
            <div key={i} style={{
              fontSize:13,lineHeight:"1.9",
              color: l.includes("GRANTED")||l.includes("WELCOME") ? "#00ff9d"
                : l.includes("AUTHENTICATED")||l.includes("READY")||l.includes("OK")||l.includes("CONNECTED")||l.includes("NOMINAL") ? "#22aa66"
                : l === "" ? "transparent" : "#3a6a4a",
              textShadow: (l.includes("GRANTED")||l.includes("WELCOME")) ? "0 0 16px #00ff9d" : "none",
              animation:"bootLine 0.12s ease both",
            }}>
              {l === "" ? "\u00A0" : `> ${l}`}
            </div>
          ))}
          {!done && <span style={{ color:"#00ff9d",animation:"blink 0.7s step-end infinite" }}>█</span>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HEX GRID — drawn once, static canvas
═══════════════════════════════════════════════════════════════ */
function HexGrid({ opacity = 0.045 }) {
  const cRef = useRef(null);
  useEffect(() => {
    const c = cRef.current; if (!c) return;
    const draw = () => {
      c.width = window.innerWidth; c.height = window.innerHeight;
      const ctx = c.getContext("2d");
      const s = 26, h = s * Math.sqrt(3);
      ctx.strokeStyle = `rgba(0,255,157,${opacity})`; ctx.lineWidth = 0.5;
      for (let row = -1; row < c.height/h+2; row++) {
        for (let col = -1; col < c.width/(s*1.5)+2; col++) {
          const x = col*s*1.5, y = row*h + (col%2===0?0:h/2);
          ctx.beginPath();
          for (let i=0;i<6;i++){const a=(Math.PI/180)*(60*i-30);ctx.lineTo(x+s*Math.cos(a),y+s*Math.sin(a));}
          ctx.closePath(); ctx.stroke();
        }
      }
    };
    window.addEventListener("resize", draw); draw();
    return () => window.removeEventListener("resize", draw);
  }, [opacity]);
  return <canvas ref={cRef} style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:0 }} />;
}

/* ═══════════════════════════════════════════════════════════════
   TEXT PORTRAIT — rendered once
═══════════════════════════════════════════════════════════════ */
function TextPortrait() {
  const cRef = useRef(null);
  useEffect(() => {
    const c = cRef.current; if (!c) return;
    const W = c.width = c.offsetWidth*2, H = c.height = c.offsetHeight*2;
    const ctx = c.getContext("2d");
    ctx.scale(2,2);
    const w = c.offsetWidth, h = c.offsetHeight;
    ctx.fillStyle="#000"; ctx.fillRect(0,0,w,h);
    const fs=7.5; ctx.font=`${fs}px 'JetBrains Mono','Courier New'`;
    let pi=0;
    for(let y=fs;y<h;y+=fs+1){
      for(let x=0;x<w;x+=fs*0.52){
        const ch=PHRASE[pi++%PHRASE.length];
        const dx=x-w/2,dy=y-h*0.44;
        const dist=Math.sqrt(dx*dx*1.1+dy*dy)/(Math.min(w,h)*0.46);
        const eL=Math.sqrt(Math.pow(x-w*0.38,2)+Math.pow(y-h*0.41,2));
        const eR=Math.sqrt(Math.pow(x-w*0.62,2)+Math.pow(y-h*0.41,2));
        const eMask=Math.min(eL,eR)<w*0.09?0.1:1;
        const mMask=(Math.abs(y-h*0.67)<h*0.04&&Math.abs(x-w/2)<w*0.18)?0.07:1;
        let a=Math.max(0,1-dist*1.35); a=a*a*eMask*mMask;
        if(a<0.015)continue;
        ctx.fillStyle=`rgba(255,255,255,${a*0.85})`; ctx.fillText(ch,x,y);
      }
    }
  },[]);
  return <canvas ref={cRef} style={{ width:"100%",height:"100%",display:"block",imageRendering:"crisp-edges" }}/>;
}

/* ═══════════════════════════════════════════════════════════════
   GLITCH TEXT — CSS-only, no React state
═══════════════════════════════════════════════════════════════ */
function GlitchText({ text, style={}, className="" }) {
  return (
    <span className={`glitch-text ${className}`} data-text={text} style={{ ...style, display:"inline-block", fontFamily:"'JetBrains Mono',monospace" }}>
      {text}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RIPPLE — sound-enhanced
═══════════════════════════════════════════════════════════════ */
function Ripple({ children, style={}, className="", onClick, onMouseEnter, onMouseLeave, as:Tag="div", ...rest }) {
  const [ripples, setRipples] = useState([]);
  const ref = useRef(null);
  const fire = useCallback((e) => {
    SFX.click();
    const r = ref.current.getBoundingClientRect();
    const id = Date.now();
    setRipples(p => [...p, { x:e.clientX-r.left, y:e.clientY-r.top, id }]);
    setTimeout(() => setRipples(p => p.filter(r=>r.id!==id)), 700);
    onClick && onClick(e);
  }, [onClick]);
  return (
    <Tag ref={ref} className={className}
      style={{ ...style, position:"relative", overflow:"hidden", willChange:"transform" }}
      onClick={fire} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} {...rest}>
      {ripples.map(r => (
        <span key={r.id} style={{ position:"absolute",left:r.x-3,top:r.y-3,width:6,height:6,borderRadius:"50%",background:"rgba(0,255,157,0.5)",pointerEvents:"none",zIndex:10,animation:"rippleExp 0.7s ease-out forwards" }}/>
      ))}
      {children}
    </Tag>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STAT CARD — tilt via direct DOM, hover via CSS class
═══════════════════════════════════════════════════════════════ */
function StatCard({ label, value, sub, color="#00ff9d", crit }) {
  const tilt = use3DTilt(11);
  const num = parseInt(String(value).replace(/[^0-9]/g,""))||0;
  const count = useCountUp(num, 1500);
  const display = isNaN(parseInt(value)) ? value : (String(value).match(/\./) ? value : count.toLocaleString());

  return (
    <Ripple ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave}
      className="stat-card"
      style={{ padding:22,border:`1px solid rgba(255,255,255,0.07)`,background:"rgba(4,10,6,0.97)",cursor:"pointer","--card-color":color,willChange:"transform" }}
      as="div">
      {/* Corner brackets — CSS hover */}
      <div className="corner-tl" style={{ position:"absolute",top:0,left:0,width:14,height:14,borderTop:`2px solid ${color}`,borderLeft:`2px solid ${color}`,opacity:0.3,transition:"opacity 0.3s,width 0.3s,height 0.3s" }}/>
      <div className="corner-br" style={{ position:"absolute",bottom:0,right:0,width:14,height:14,borderBottom:`2px solid ${color}`,borderRight:`2px solid ${color}`,opacity:0.3,transition:"opacity 0.3s,width 0.3s,height 0.3s" }}/>
      {crit && <div style={{ position:"absolute",inset:0,boxShadow:`inset 0 0 28px ${color}14`,animation:"critPulse 2s ease-in-out infinite",pointerEvents:"none" }}/>}
      <div className="scan-line" style={{ position:"absolute",top:0,left:"-100%",right:0,height:1,background:`linear-gradient(90deg,transparent,${color},transparent)`,opacity:0,transition:"opacity 0.3s" }}/>
      <div style={{ fontSize:11,letterSpacing:"3px",color:"#888",marginBottom:10,textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontSize:38,fontWeight:900,color,lineHeight:1,textShadow:`0 0 32px ${color}45`,fontFamily:"'JetBrains Mono',monospace",transition:"transform 0.2s ease" }} className="stat-value">
        {display}
      </div>
      {sub && <div style={{ fontSize:12,color:"#666",marginTop:8,letterSpacing:"1px" }}>{sub}</div>}
    </Ripple>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SPARKLINE — GPU composited via SVG + clipPath animation
═══════════════════════════════════════════════════════════════ */
function Sparkline({ data, color }) {
  const id = useMemo(() => `sp${Math.random().toString(36).slice(2,8)}`, []);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let s=null, raf;
    const step = ts => {
      if(!s) s=ts;
      const p = Math.min((ts-s)/900,1);
      setProgress(p);
      if(p<1) raf=requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  },[]);
  const max=Math.max(...data),min=Math.min(...data),range=max-min||1;
  const w=100/(data.length-1);
  const pts=data.map((v,i)=>`${i*w},${100-((v-min)/range)*82-8}`).join(" ");
  const lx = 100, ly = 100-((data[data.length-1]-min)/range)*82-8;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width:"100%",height:"100%" }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
        <clipPath id={`${id}c`}><rect x="0" y="0" width={progress*100} height="100"/></clipPath>
      </defs>
      <polygon points={`0,100 ${pts} 100,100`} fill={`url(#${id}g)`} clipPath={`url(#${id}c)`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" clipPath={`url(#${id}c)`} style={{ filter:`drop-shadow(0 0 3px ${color})` }}/>
      {progress>=0.96 && <circle cx={lx} cy={ly} r="2.2" fill={color} style={{ filter:`drop-shadow(0 0 4px ${color})`,animation:"pulseDot 1.5s ease-in-out infinite" }}/>}
    </svg>
  );
}


/* ═══════════════════════════════════════════════════════════════
   LIVE TICKER
═══════════════════════════════════════════════════════════════ */
const EVENTS = [
  {
    id:"EVT-2026-00847",sev:"CRITICAL",msg:"Privilege escalation — PID:4821 www-data → root [BLOCKED]",color:"#ff4466",
    description:"Process 4821 running as www-data executed /usr/bin/pkexec to elevate to root. Exploit matches CVE-2021-4034 (PwnKit). Execution was intercepted and blocked by Wazuh active-response module before root shell could spawn.",
    timestamp:"2026-03-02T14:23:11Z",firstSeen:"2026-03-02T14:23:11Z",lastSeen:"2026-03-02T14:23:11Z",
    srcIp:"10.0.0.22",srcPort:0,srcGeo:"Internal",srcHost:"web-prod-03.soc",
    dstIp:"10.0.0.22",dstPort:0,dstHost:"web-prod-03.soc",
    source:"Wazuh",ruleId:"WZ:5521",ruleName:"Privilege escalation attempt",ruleGroup:"syscheck",
    mitreTactic:"Privilege Escalation",mitreTechnique:"T1068 — Exploitation for Privilege Escalation",
    riskScore:97,confidence:0.99,occurrences:1,
    affectedAssets:["web-prod-03.soc"],action:"BLOCKED",status:"Open",
    recommendedActions:["Isolate host web-prod-03.soc from network immediately","Capture forensic memory dump before reboot","Patch PwnKit (CVE-2021-4034) across all Linux hosts","Review www-data process tree for lateral movement"],
    playbookRef:"PB-PRIVESC-003",agentName:"web-prod-03.soc",agentIp:"10.0.0.22",
    relatedEventIds:["EVT-2026-00841","EVT-2026-00839"],tags:["privesc","cve-2021-4034","pwnkit","linux"],
    rawLog:"Mar  2 14:23:11 web-prod-03 wazuh-execd: pkexec[4821]: www-data: Attempted to gain root privileges [blocked by active-response]"
  },
  {
    id:"EVT-2026-00846",sev:"ALERT",msg:"Brute force src:185.220.101.47 → 10.0.0.1 — 349 attempts [RATE-LIMITED]",color:"#ff8833",
    description:"Tor exit node 185.220.101.47 launched sustained SSH brute-force attack against the OPNsense firewall management interface. 349 failed authentication attempts detected in 12 minutes using rotating credential lists. Rate-limiting engaged after threshold breach.",
    timestamp:"2026-03-02T14:18:44Z",firstSeen:"2026-03-02T14:06:12Z",lastSeen:"2026-03-02T14:18:44Z",
    srcIp:"185.220.101.47",srcPort:48892,srcGeo:"Frankfurt, DE",srcHost:"tor-exit-relay.anon",
    dstIp:"10.0.0.1",dstPort:22,dstHost:"ngfw-opnsense.soc",
    source:"Wazuh",ruleId:"WZ:5763",ruleName:"Multiple SSH authentication failures",ruleGroup:"authentication_failures",
    mitreTactic:"Credential Access",mitreTechnique:"T1110.001 — Brute Force: Password Guessing",
    riskScore:82,confidence:0.97,occurrences:349,
    affectedAssets:["ngfw-opnsense.soc"],action:"RATE-LIMITED",status:"Investigating",
    recommendedActions:["Add 185.220.101.47 to permanent blocklist","Enable geo-blocking for Tor exit nodes on SSH","Rotate all SSH keys on ngfw-opnsense.soc","Review SSH logs for any successful auth"],
    playbookRef:"PB-BRUTE-001",agentName:"ngfw-opnsense.soc",agentIp:"10.0.0.1",
    relatedEventIds:["EVT-2026-00832"],tags:["tor-exit","brute-force","ssh","credential-stuffing"],
    rawLog:"Mar  2 14:18:44 opnsense sshd[2891]: Failed password for invalid user admin from 185.220.101.47 port 48892 ssh2 [attempt 349/349]"
  },
  {
    id:"EVT-2026-00845",sev:"WARN",msg:"Suspicious DNS — beacon.c2.onion.to [ML:HIGH_RISK → SINKHOLED]",color:"#ffdd44",
    description:"Internal host 10.0.0.55 resolved beacon.c2.onion.to via DNS, matching known C2 beacon pattern. ML engine flagged periodic 30-second query intervals consistent with command-and-control heartbeat. Domain sinkholed to prevent callback.",
    timestamp:"2026-03-02T14:15:02Z",firstSeen:"2026-03-02T12:41:00Z",lastSeen:"2026-03-02T14:15:02Z",
    srcIp:"10.0.0.55",srcPort:52441,srcGeo:"Internal",srcHost:"ws-finance-04.soc",
    dstIp:"94.102.61.7",dstPort:53,dstHost:"dns-resolver.external",
    source:"ML Engine",ruleId:"ML:DNS-BEACON-047",ruleName:"Periodic DNS beacon pattern detected",ruleGroup:"ml_anomaly",
    mitreTactic:"Command and Control",mitreTechnique:"T1071.004 — Application Layer Protocol: DNS",
    riskScore:78,confidence:0.91,occurrences:187,
    affectedAssets:["ws-finance-04.soc"],action:"SINKHOLED",status:"Open",
    recommendedActions:["Quarantine ws-finance-04.soc from network","Run full malware scan with YARA rules","Check for persistence mechanisms (crontab, systemd)","Analyze DNS exfiltration payload entropy"],
    playbookRef:"PB-C2-002",agentName:"dns-monitor.soc",agentIp:"10.0.0.5",
    relatedEventIds:["EVT-2026-00838","EVT-2026-00844"],tags:["c2-beacon","dns-tunnel","ml-detection","apt"],
    rawLog:"Mar  2 14:15:02 dns-monitor suricata[1847]: DNS query from 10.0.0.55:52441 -> beacon.c2.onion.to [sinkholed -> 127.0.0.1]"
  },
  {
    id:"EVT-2026-00844",sev:"INFO",msg:"Agent connected — node-07.k3s.tailnet [ARM64/RPi5 16GB] HEALTHY",color:"#33ffaa",
    description:"Wazuh agent on node-07 re-established connection after scheduled maintenance window. System health checks passed: memory OK, disk OK, network OK. Agent version 4.9.0 confirmed.",
    timestamp:"2026-03-02T14:12:30Z",firstSeen:"2026-03-02T14:12:30Z",lastSeen:"2026-03-02T14:12:30Z",
    srcIp:"10.0.0.47",srcPort:1514,srcGeo:"Internal",srcHost:"node-07.k3s.tailnet",
    dstIp:"10.0.0.5",dstPort:1515,dstHost:"wazuh-manager.soc",
    source:"Wazuh",ruleId:"WZ:0502",ruleName:"Agent reconnected",ruleGroup:"agent_status",
    mitreTactic:"N/A",mitreTechnique:"N/A",
    riskScore:5,confidence:1.0,occurrences:1,
    affectedAssets:["node-07.k3s.tailnet"],action:"LOGGED",status:"Resolved",
    recommendedActions:["No action required","Verify agent config sync completed"],
    playbookRef:"PB-AGENT-001",agentName:"node-07.k3s.tailnet",agentIp:"10.0.0.47",
    relatedEventIds:[],tags:["agent-health","maintenance","routine"],
    rawLog:"Mar  2 14:12:30 node-07 wazuh-agentd[1102]: Connected to manager 10.0.0.5:1515 [agent v4.9.0, ARM64]"
  },
  {
    id:"EVT-2026-00843",sev:"ALERT",msg:"SQL injection — Cloudflare WAF Rule 100514 [DROPPED] src:34.102.88.1",color:"#ff8833",
    description:"Cloudflare WAF intercepted SQL injection attempt targeting /api/v2/users endpoint. Payload contained UNION SELECT with information_schema extraction. Request originated from Google Cloud IP range, likely compromised instance.",
    timestamp:"2026-03-02T14:08:55Z",firstSeen:"2026-03-02T13:44:21Z",lastSeen:"2026-03-02T14:08:55Z",
    srcIp:"34.102.88.1",srcPort:443,srcGeo:"Council Bluffs, US",srcHost:"gce-instance.googleusercontent.com",
    dstIp:"104.21.44.12",dstPort:443,dstHost:"app.vandine.us",
    source:"Cloudflare WAF",ruleId:"CF:100514",ruleName:"SQLi — UNION SELECT injection",ruleGroup:"owasp_sqli",
    mitreTactic:"Initial Access",mitreTechnique:"T1190 — Exploit Public-Facing Application",
    riskScore:74,confidence:0.95,occurrences:23,
    affectedAssets:["app.vandine.us"],action:"DROPPED",status:"Investigating",
    recommendedActions:["Block 34.102.88.0/24 at WAF level","Audit /api/v2/users for parameterized queries","Enable rate limiting on API endpoints","Report abuse to Google Cloud"],
    playbookRef:"PB-SQLI-001",agentName:"cloudflare-waf.soc",agentIp:"104.21.44.12",
    relatedEventIds:["EVT-2026-00836"],tags:["sqli","owasp","waf","api-abuse"],
    rawLog:"Mar  2 14:08:55 cloudflare waf[rule:100514]: DROPPED 34.102.88.1 -> /api/v2/users?id=1'+UNION+SELECT+table_name+FROM+information_schema.tables--"
  },
  {
    id:"EVT-2026-00842",sev:"WARN",msg:"Anomalous outbound 10.0.0.55:443 → 94.102.61.7 [RF:81% HIGH_RISK]",color:"#ffdd44",
    description:"Random Forest classifier flagged sustained HTTPS traffic from ws-finance-04 to known bulletproof hosting IP. Traffic volume 2.3GB in 4 hours with unusual packet size distribution suggesting data staging or exfiltration.",
    timestamp:"2026-03-02T14:05:18Z",firstSeen:"2026-03-02T10:12:00Z",lastSeen:"2026-03-02T14:05:18Z",
    srcIp:"10.0.0.55",srcPort:443,srcGeo:"Internal",srcHost:"ws-finance-04.soc",
    dstIp:"94.102.61.7",dstPort:443,dstHost:"bulletproof-nl.hosting",
    source:"ML Engine",ruleId:"ML:RF-EXFIL-012",ruleName:"Anomalous outbound volume detected",ruleGroup:"ml_anomaly",
    mitreTactic:"Exfiltration",mitreTechnique:"T1041 — Exfiltration Over C2 Channel",
    riskScore:81,confidence:0.81,occurrences:4200,
    affectedAssets:["ws-finance-04.soc"],action:"FLAGGED",status:"Open",
    recommendedActions:["Throttle outbound traffic from 10.0.0.55","Capture PCAP for DLP content analysis","Compare against baseline traffic profile","Check for scheduled backup or sync tasks"],
    playbookRef:"PB-EXFIL-001",agentName:"ids-sensor-01.soc",agentIp:"10.0.0.3",
    relatedEventIds:["EVT-2026-00845","EVT-2026-00838"],tags:["exfiltration","ml-anomaly","bulletproof-hosting","high-volume"],
    rawLog:"Mar  2 14:05:18 ids-sensor-01 suricata[1847]: ANOMALY 10.0.0.55:443 -> 94.102.61.7:443 [RF:0.81 2.3GB/4h pkts:42000]"
  },
  {
    id:"EVT-2026-00841",sev:"CRITICAL",msg:"Memory injection — svchost.exe PID:892 [QUARANTINED]",color:"#ff4466",
    description:"Process hollowing detected in svchost.exe (PID 892). Malicious code injected into legitimate Windows service host process. Wazuh FIM detected unauthorized memory page modifications. Process quarantined and memory dump captured.",
    timestamp:"2026-03-02T14:01:33Z",firstSeen:"2026-03-02T14:01:33Z",lastSeen:"2026-03-02T14:01:33Z",
    srcIp:"10.0.0.112",srcPort:0,srcGeo:"Internal",srcHost:"ws-exec-01.soc",
    dstIp:"10.0.0.112",dstPort:0,dstHost:"ws-exec-01.soc",
    source:"Wazuh",ruleId:"WZ:6422",ruleName:"Process hollowing detected",ruleGroup:"syscheck_fim",
    mitreTactic:"Defense Evasion",mitreTechnique:"T1055.012 — Process Injection: Process Hollowing",
    riskScore:95,confidence:0.98,occurrences:1,
    affectedAssets:["ws-exec-01.soc"],action:"QUARANTINED",status:"Open",
    recommendedActions:["Isolate ws-exec-01.soc immediately","Submit memory dump to sandbox for analysis","Check parent process tree for initial vector","Scan all endpoints for same IOC hash"],
    playbookRef:"PB-MALWARE-002",agentName:"ws-exec-01.soc",agentIp:"10.0.0.112",
    relatedEventIds:["EVT-2026-00847","EVT-2026-00850"],tags:["process-hollowing","memory-injection","evasion","windows"],
    rawLog:"Mar  2 14:01:33 ws-exec-01 wazuh-fim[3201]: svchost.exe PID:892 unauthorized memory modification [NtWriteVirtualMemory] -> quarantined"
  },
  {
    id:"EVT-2026-00840",sev:"INFO",msg:"Suricata ET SCAN — port 22 sweep from 192.168.1.99 [LOGGED]",color:"#33ffaa",
    description:"Authorized vulnerability scanner 192.168.1.99 performed scheduled SSH port sweep across /24 subnet. 254 hosts probed, scan completed in 42 seconds. This is part of the weekly compliance audit.",
    timestamp:"2026-03-02T13:55:00Z",firstSeen:"2026-03-02T13:54:18Z",lastSeen:"2026-03-02T13:55:00Z",
    srcIp:"192.168.1.99",srcPort:0,srcGeo:"Internal",srcHost:"vuln-scanner.soc",
    dstIp:"10.0.0.0",dstPort:22,dstHost:"subnet-10.0.0.0/24",
    source:"Suricata",ruleId:"ET:2001219",ruleName:"ET SCAN Potential SSH Scan",ruleGroup:"emerging_threats",
    mitreTactic:"Discovery",mitreTechnique:"T1046 — Network Service Discovery",
    riskScore:12,confidence:0.88,occurrences:254,
    affectedAssets:["subnet-10.0.0.0/24"],action:"LOGGED",status:"Resolved",
    recommendedActions:["Verify scan matches scheduled window","Review scan results for open SSH on unexpected hosts"],
    playbookRef:"PB-SCAN-001",agentName:"ids-sensor-01.soc",agentIp:"10.0.0.3",
    relatedEventIds:["EVT-2026-00856"],tags:["port-scan","authorized","compliance","ssh"],
    rawLog:"Mar  2 13:55:00 ids-sensor-01 suricata[1847]: [1:2001219:22] ET SCAN Potential SSH Scan 192.168.1.99 -> 10.0.0.0/24:22 [254 hosts]"
  },
  {
    id:"EVT-2026-00839",sev:"ALERT",msg:"RDP brute force — 103.41.220.5 → 10.0.0.112:3389 — 891 attempts [BLOCKED]",color:"#ff8833",
    description:"Chinese IP range launched massive RDP brute-force attack against Windows workstation. 891 failed NLA attempts using common username/password combinations. Firewall rule auto-deployed to block source.",
    timestamp:"2026-03-02T13:48:22Z",firstSeen:"2026-03-02T13:22:00Z",lastSeen:"2026-03-02T13:48:22Z",
    srcIp:"103.41.220.5",srcPort:55102,srcGeo:"Shenzhen, CN",srcHost:"unknown",
    dstIp:"10.0.0.112",dstPort:3389,dstHost:"ws-exec-01.soc",
    source:"Wazuh",ruleId:"WZ:5764",ruleName:"Multiple RDP authentication failures",ruleGroup:"authentication_failures",
    mitreTactic:"Credential Access",mitreTechnique:"T1110.001 — Brute Force: Password Guessing",
    riskScore:85,confidence:0.96,occurrences:891,
    affectedAssets:["ws-exec-01.soc"],action:"BLOCKED",status:"Resolved",
    recommendedActions:["Verify auto-block rule is active on firewall","Restrict RDP access to VPN-only","Enable NLA with certificate auth","Submit IP to threat intel feed"],
    playbookRef:"PB-BRUTE-002",agentName:"ws-exec-01.soc",agentIp:"10.0.0.112",
    relatedEventIds:["EVT-2026-00841"],tags:["rdp","brute-force","china","credential-stuffing"],
    rawLog:"Mar  2 13:48:22 ws-exec-01 wazuh-authd[892]: RDP NLA failure for user Administrator from 103.41.220.5:55102 [attempt 891]"
  },
  {
    id:"EVT-2026-00838",sev:"WARN",msg:"TLS cert mismatch — 10.0.0.55 → 94.102.61.7 [SSL:INVALID_CN]",color:"#ffdd44",
    description:"Suricata TLS inspection detected certificate common name mismatch on outbound connection from finance workstation. Server presented CN=localhost but connected to external IP. Possible MitM or self-signed C2 infrastructure.",
    timestamp:"2026-03-02T13:42:15Z",firstSeen:"2026-03-02T13:42:15Z",lastSeen:"2026-03-02T13:42:15Z",
    srcIp:"10.0.0.55",srcPort:49221,srcGeo:"Internal",srcHost:"ws-finance-04.soc",
    dstIp:"94.102.61.7",dstPort:443,dstHost:"bulletproof-nl.hosting",
    source:"Suricata",ruleId:"ET:2027865",ruleName:"TLS certificate CN mismatch",ruleGroup:"tls_anomaly",
    mitreTactic:"Command and Control",mitreTechnique:"T1573.002 — Encrypted Channel: Asymmetric Cryptography",
    riskScore:62,confidence:0.85,occurrences:3,
    affectedAssets:["ws-finance-04.soc"],action:"FLAGGED",status:"Open",
    recommendedActions:["Inspect full TLS handshake via PCAP","Cross-reference cert fingerprint with threat feeds","Check if proxy bypass is configured on host"],
    playbookRef:"PB-TLS-001",agentName:"ids-sensor-01.soc",agentIp:"10.0.0.3",
    relatedEventIds:["EVT-2026-00842","EVT-2026-00845"],tags:["tls-mismatch","ssl","c2-suspect","encrypted"],
    rawLog:"Mar  2 13:42:15 ids-sensor-01 suricata[1847]: TLS CN mismatch 10.0.0.55:49221 -> 94.102.61.7:443 [CN=localhost, expected=94.102.61.7]"
  },
  {
    id:"EVT-2026-00837",sev:"CRITICAL",msg:"Ransomware pattern — ws-exec-01 mass file rename .encrypted [QUARANTINED]",color:"#ff4466",
    description:"Wazuh FIM detected rapid mass file renaming on ws-exec-01.soc. Over 2,400 files renamed with .encrypted extension in 90 seconds. Pattern matches known ransomware behavior. Host immediately quarantined from network.",
    timestamp:"2026-03-02T13:38:05Z",firstSeen:"2026-03-02T13:36:30Z",lastSeen:"2026-03-02T13:38:05Z",
    srcIp:"10.0.0.112",srcPort:0,srcGeo:"Internal",srcHost:"ws-exec-01.soc",
    dstIp:"10.0.0.112",dstPort:0,dstHost:"ws-exec-01.soc",
    source:"Wazuh",ruleId:"WZ:6550",ruleName:"Ransomware behavior — mass file encryption",ruleGroup:"syscheck_fim",
    mitreTactic:"Impact",mitreTechnique:"T1486 — Data Encrypted for Impact",
    riskScore:99,confidence:0.99,occurrences:2400,
    affectedAssets:["ws-exec-01.soc"],action:"QUARANTINED",status:"Open",
    recommendedActions:["Confirm network isolation of ws-exec-01.soc","Do NOT power off — preserve memory state","Activate IR playbook and notify CISO","Check for lateral movement to file shares","Verify backup integrity before restore"],
    playbookRef:"PB-RANSOM-001",agentName:"ws-exec-01.soc",agentIp:"10.0.0.112",
    relatedEventIds:["EVT-2026-00841","EVT-2026-00839"],tags:["ransomware","encryption","critical-ir","data-loss"],
    rawLog:"Mar  2 13:38:05 ws-exec-01 wazuh-fim[3201]: MASS RENAME 2400 files -> .encrypted in /Users/exec/ [90s window, ransomware pattern match]"
  },
  {
    id:"EVT-2026-00836",sev:"INFO",msg:"Firewall rule update — GeoIP block CN/RU ranges applied [COMMITTED]",color:"#33ffaa",
    description:"Automated firewall rule pushed to OPNsense via API. GeoIP blocking enabled for CN and RU source ranges on external-facing interfaces. Rule deployed in response to sustained brute-force campaigns.",
    timestamp:"2026-03-02T13:35:00Z",firstSeen:"2026-03-02T13:35:00Z",lastSeen:"2026-03-02T13:35:00Z",
    srcIp:"10.0.0.5",srcPort:0,srcGeo:"Internal",srcHost:"wazuh-manager.soc",
    dstIp:"10.0.0.1",dstPort:443,dstHost:"ngfw-opnsense.soc",
    source:"Wazuh",ruleId:"WZ:0801",ruleName:"Active response — firewall rule deployed",ruleGroup:"active_response",
    mitreTactic:"N/A",mitreTechnique:"N/A",
    riskScore:8,confidence:1.0,occurrences:1,
    affectedAssets:["ngfw-opnsense.soc"],action:"COMMITTED",status:"Resolved",
    recommendedActions:["Verify rule is active via OPNsense dashboard","Monitor for legitimate traffic being blocked"],
    playbookRef:"PB-FW-001",agentName:"wazuh-manager.soc",agentIp:"10.0.0.5",
    relatedEventIds:["EVT-2026-00846","EVT-2026-00839"],tags:["firewall","geoip","auto-response","policy"],
    rawLog:"Mar  2 13:35:00 wazuh-manager wazuh-execd[1001]: Firewall rule committed to ngfw-opnsense.soc: BLOCK src GeoIP:CN,RU on WAN interfaces"
  },
  {
    id:"EVT-2026-00835",sev:"ALERT",msg:"Lateral movement — PsExec ws-exec-01 → dc-primary:445 [BLOCKED]",color:"#ff8833",
    description:"Compromised workstation ws-exec-01 attempted to execute PsExec against domain controller via SMB. Credential was a local admin hash likely obtained from memory dump. Blocked by network segmentation firewall rule.",
    timestamp:"2026-03-02T13:30:12Z",firstSeen:"2026-03-02T13:30:12Z",lastSeen:"2026-03-02T13:30:12Z",
    srcIp:"10.0.0.112",srcPort:49801,srcGeo:"Internal",srcHost:"ws-exec-01.soc",
    dstIp:"10.0.0.10",dstPort:445,dstHost:"dc-primary.soc",
    source:"Suricata",ruleId:"ET:2029413",ruleName:"ET EXPLOIT PsExec Service Execution",ruleGroup:"exploit",
    mitreTactic:"Lateral Movement",mitreTechnique:"T1021.002 — Remote Services: SMB/Windows Admin Shares",
    riskScore:92,confidence:0.94,occurrences:1,
    affectedAssets:["ws-exec-01.soc","dc-primary.soc"],action:"BLOCKED",status:"Open",
    recommendedActions:["Verify dc-primary.soc was not compromised","Reset all admin credentials domain-wide","Enable SMB signing enforcement","Review lateral movement paths in AD"],
    playbookRef:"PB-LATERAL-001",agentName:"ids-sensor-01.soc",agentIp:"10.0.0.3",
    relatedEventIds:["EVT-2026-00841","EVT-2026-00837"],tags:["psexec","lateral-movement","smb","active-directory"],
    rawLog:"Mar  2 13:30:12 ids-sensor-01 suricata[1847]: [1:2029413:3] ET EXPLOIT PsExec 10.0.0.112:49801 -> 10.0.0.10:445 [BLOCKED by fw-rule]"
  },
  {
    id:"EVT-2026-00834",sev:"WARN",msg:"Data exfil — 10.0.0.55 DNS TXT 3.2MB encoded payload [THROTTLED]",color:"#ffdd44",
    description:"DNS TXT query exfiltration detected from ws-finance-04. Encoded data chunks sent via sequential DNS TXT queries to attacker-controlled domain. Total estimated payload 3.2MB over 847 queries. Egress throttled.",
    timestamp:"2026-03-02T13:25:44Z",firstSeen:"2026-03-02T11:00:00Z",lastSeen:"2026-03-02T13:25:44Z",
    srcIp:"10.0.0.55",srcPort:53,srcGeo:"Internal",srcHost:"ws-finance-04.soc",
    dstIp:"94.102.61.7",dstPort:53,dstHost:"ns1.c2-domain.to",
    source:"ML Engine",ruleId:"ML:DNS-EXFIL-008",ruleName:"DNS TXT exfiltration pattern",ruleGroup:"ml_anomaly",
    mitreTactic:"Exfiltration",mitreTechnique:"T1048.003 — Exfiltration Over Alternative Protocol: DNS",
    riskScore:88,confidence:0.87,occurrences:847,
    affectedAssets:["ws-finance-04.soc"],action:"THROTTLED",status:"Open",
    recommendedActions:["Block all DNS to external resolvers","Force DNS through internal sinkhole","Decode TXT payloads to assess data loss","Check for financial document access logs"],
    playbookRef:"PB-EXFIL-002",agentName:"dns-monitor.soc",agentIp:"10.0.0.5",
    relatedEventIds:["EVT-2026-00845","EVT-2026-00842"],tags:["dns-exfiltration","data-loss","txt-tunnel","encoded"],
    rawLog:"Mar  2 13:25:44 dns-monitor suricata[1847]: DNS TXT exfil 10.0.0.55 -> ns1.c2-domain.to [847 queries, ~3.2MB encoded, base64 chunks]"
  },
  {
    id:"EVT-2026-00833",sev:"CRITICAL",msg:"Webshell upload — /var/www/uploads/cmd.php [QUARANTINED]",color:"#ff4466",
    description:"Wazuh FIM detected new PHP file creation in web uploads directory. File content analysis reveals eval(base64_decode()) pattern consistent with China Chopper webshell variant. File quarantined and web directory locked.",
    timestamp:"2026-03-02T13:20:08Z",firstSeen:"2026-03-02T13:20:08Z",lastSeen:"2026-03-02T13:20:08Z",
    srcIp:"34.102.88.1",srcPort:443,srcGeo:"Council Bluffs, US",srcHost:"gce-instance.googleusercontent.com",
    dstIp:"10.0.0.22",dstPort:443,dstHost:"web-prod-03.soc",
    source:"Wazuh",ruleId:"WZ:6310",ruleName:"Webshell file detected in uploads",ruleGroup:"syscheck_fim",
    mitreTactic:"Persistence",mitreTechnique:"T1505.003 — Server Software Component: Web Shell",
    riskScore:94,confidence:0.97,occurrences:1,
    affectedAssets:["web-prod-03.soc"],action:"QUARANTINED",status:"Open",
    recommendedActions:["Audit all files in /var/www/uploads/ for similar patterns","Review web server access logs for upload vector","Patch file upload validation","Scan for additional persistence mechanisms"],
    playbookRef:"PB-WEBSHELL-001",agentName:"web-prod-03.soc",agentIp:"10.0.0.22",
    relatedEventIds:["EVT-2026-00847","EVT-2026-00843"],tags:["webshell","php","china-chopper","persistence","upload"],
    rawLog:"Mar  2 13:20:08 web-prod-03 wazuh-fim[2411]: NEW FILE /var/www/uploads/cmd.php [eval(base64_decode($_POST['z']))] -> quarantined"
  },
  {
    id:"EVT-2026-00832",sev:"INFO",msg:"Vuln scan complete — 47 hosts / 12 critical / 89 high [REPORT READY]",color:"#33ffaa",
    description:"Weekly vulnerability scan completed across all 47 monitored hosts. Results: 12 critical, 89 high, 234 medium, 1,102 low findings. Report generated and available in vulnerability management portal. Top critical: Log4Shell on 3 Java services.",
    timestamp:"2026-03-02T13:15:00Z",firstSeen:"2026-03-02T12:00:00Z",lastSeen:"2026-03-02T13:15:00Z",
    srcIp:"192.168.1.99",srcPort:0,srcGeo:"Internal",srcHost:"vuln-scanner.soc",
    dstIp:"10.0.0.0",dstPort:0,dstHost:"all-hosts",
    source:"Wazuh",ruleId:"WZ:9001",ruleName:"Vulnerability scan completed",ruleGroup:"vulnerability_detector",
    mitreTactic:"N/A",mitreTechnique:"N/A",
    riskScore:15,confidence:1.0,occurrences:1,
    affectedAssets:["all-hosts"],action:"REPORT READY",status:"Resolved",
    recommendedActions:["Review critical findings in vuln portal","Prioritize Log4Shell remediation on 3 Java hosts","Schedule patching window for high findings"],
    playbookRef:"PB-VULN-001",agentName:"vuln-scanner.soc",agentIp:"192.168.1.99",
    relatedEventIds:["EVT-2026-00840"],tags:["vulnerability","compliance","scan-complete","log4shell"],
    rawLog:"Mar  2 13:15:00 vuln-scanner openvas[4501]: Scan complete: 47 hosts, 12C/89H/234M/1102L findings. Report ID: RPT-2026-0302-001"
  },
];

function LiveTicker() {
  const [idx,setIdx]=useState(0);
  const [show,setShow]=useState(true);
  const [t,setT]=useState(new Date());
  useEffect(()=>{
    const iv=setInterval(()=>{
      setShow(false);
      setTimeout(()=>{ setIdx(i=>(i+1)%EVENTS.length); setShow(true); },280);
    },4500);
    const tc=setInterval(()=>setT(new Date()),1000);
    return()=>{clearInterval(iv);clearInterval(tc);};
  },[]);
  const ev=EVENTS[idx];
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10,height:"100%",opacity:show?1:0,transition:"opacity 0.28s",fontFamily:"'JetBrains Mono',monospace",fontSize:11 }}>
      <span style={{ padding:"2px 8px",fontWeight:700,letterSpacing:2,fontSize:11,border:`1px solid ${ev.color}55`,color:ev.color,background:`${ev.color}18`,flexShrink:0,textShadow:`0 0 8px ${ev.color}`,animation:ev.sev==="CRITICAL"?"sevBlink 0.9s step-end infinite":"none" }}>{ev.sev}</span>
      <span style={{ color:"#666",flexShrink:0 }}>{t.toTimeString().slice(0,8)}</span>
      <span style={{ color:"#444",flexShrink:0 }}>›</span>
      <span style={{ color:"#aaa",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{ev.msg}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NAV ITEM
═══════════════════════════════════════════════════════════════ */
function NavItem({ id, label, active, onClick, badge }) {
  const handleEnter = useCallback(()=>SFX.hover(),[]);
  return (
    <Ripple as="button" onClick={()=>{ SFX.tabSwitch(); onClick(id); }} onMouseEnter={handleEnter}
      className={`nav-item ${active?"nav-active":""}`}
      style={{ width:"100%",textAlign:"left",padding:"10px 18px",fontSize:12,letterSpacing:"2.5px",border:"none",outline:"none",fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",transition:"all 0.2s ease",display:"flex",alignItems:"center",justifyContent:"space-between",background:"transparent",
        color:active?"#00ff9d":"#555",
        borderLeft:`2px solid ${active?"#00ff9d":"transparent"}`,
        textShadow:active?"0 0 10px rgba(0,255,157,0.4)":"none",
      }}>
      <span>{label}</span>
      {badge && <span style={{ fontSize:10,padding:"1px 6px",background:"rgba(255,60,80,0.15)",color:"#ff4466",border:"1px solid rgba(255,60,80,0.3)",letterSpacing:0 }}>{badge}</span>}
    </Ripple>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AGENT ROW
═══════════════════════════════════════════════════════════════ */
function AgentRow({ agent, delay=0 }) {
  const [vis,setVis]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setVis(true),delay);return()=>clearTimeout(t);},[delay]);
  const col=agent.status==="ACTIVE"?"#00ff9d":agent.status==="WARN"?"#ff9933":"#ff4466";
  return (
    <div className="agent-row" onMouseEnter={()=>SFX.hover()}
      style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",marginBottom:1,cursor:"pointer",opacity:vis?1:0,transform:vis?"translateX(0)":"translateX(-16px)",transition:"all 0.35s ease,opacity 0.35s ease,transform 0.35s ease",fontFamily:"'JetBrains Mono',monospace","--agent-color":col }}>
      <div style={{ display:"flex",alignItems:"center",gap:11 }}>
        <div style={{ width:7,height:7,borderRadius:"50%",background:col,boxShadow:`0 0 6px ${col}`,animation:agent.status==="ACTIVE"?"pulseDot 2.2s ease-in-out infinite":"none",flexShrink:0,transition:"box-shadow 0.2s" }}/>
        <div>
          <div style={{ fontSize:12,color:"#ccc",lineHeight:1.4 }}>{agent.name}</div>
          <div style={{ fontSize:11,color:"#555",marginTop:2 }}>{agent.ip} · {agent.os}</div>
        </div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:11,color:col,letterSpacing:1 }}>{agent.status}</div>
        <div style={{ fontSize:11,color:"#333",marginTop:2 }}>+{agent.last}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   THREAT BAR
═══════════════════════════════════════════════════════════════ */
function ThreatBar({ label, value, max, color }) {
  const [w,setW]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setW(value),200+Math.random()*400);return()=>clearTimeout(t);},[]);
  return (
    <div className="threat-bar-wrap" onMouseEnter={()=>SFX.hover()} style={{ marginBottom:15,cursor:"default" }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
        <span style={{ fontSize:12,color:"#888",fontFamily:"'JetBrains Mono',monospace",transition:"color 0.2s" }} className="bar-label">{label}</span>
        <span style={{ fontSize:12,color,fontWeight:"bold",fontFamily:"'JetBrains Mono',monospace",textShadow:`0 0 8px ${color}60` }}>{value}</span>
      </div>
      <div style={{ height:3,background:"rgba(255,255,255,0.05)",position:"relative",overflow:"hidden" }}>
        <div style={{ width:`${(w/max)*100}%`,height:"100%",background:color,boxShadow:`0 0 8px ${color}`,transition:"width 1.1s cubic-bezier(0.4,0,0.2,1)",position:"relative",willChange:"width" }}/>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CHART CARD
═══════════════════════════════════════════════════════════════ */
function ChartCard({ title, value, unit="", badge, badgeColor, color, data }) {
  const tilt = use3DTilt(8);
  return (
    <div ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave} onMouseEnter={()=>SFX.hover()}
      className="chart-card" style={{ padding:20,border:`1px solid rgba(255,255,255,0.06)`,background:"rgba(4,10,6,0.97)",position:"relative",overflow:"hidden",willChange:"transform","--c":color }}>
      <div className="chart-topline" style={{ position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${color}70,transparent)`,opacity:0.25,transition:"opacity 0.3s" }}/>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16 }}>
        <div>
          <div style={{ fontSize:11,letterSpacing:"3px",color:"#777",marginBottom:6,fontFamily:"'JetBrains Mono',monospace" }}>{title}</div>
          <div style={{ fontSize:30,fontWeight:900,color,textShadow:`0 0 24px ${color}45`,fontFamily:"'JetBrains Mono',monospace",lineHeight:1 }}>{value}<span style={{ fontSize:13,marginLeft:4,opacity:0.7 }}>{unit}</span></div>
        </div>
        {badge && <span style={{ fontSize:11,padding:"2px 8px",letterSpacing:1.5,border:`1px solid ${badgeColor}45`,color:badgeColor,background:`${badgeColor}12`,fontFamily:"'JetBrains Mono',monospace" }}>{badge}</span>}
      </div>
      <div style={{ height:60 }}>{data && <Sparkline data={data} color={color}/>}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ML RISK CARD
═══════════════════════════════════════════════════════════════ */
function MLRiskCard({ host, risk, score, reason }) {
  const tilt = use3DTilt(10);
  const color=risk==="CRITICAL"?"#ff4466":risk==="HIGH"?"#ff8833":"#ffdd44";
  return (
    <div ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave} onMouseEnter={()=>SFX.hover()}
      className="ml-card" style={{ padding:16,border:`1px solid ${color}25`,background:`${color}04`,position:"relative",overflow:"hidden",cursor:"pointer",willChange:"transform","--rc":color }}>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:color,opacity:0.2,transition:"opacity 0.2s" }} className="ml-topline"/>
      <div style={{ position:"absolute",top:10,right:12,fontSize:20,fontWeight:900,color,opacity:0.25,transition:"opacity 0.2s",fontFamily:"'JetBrains Mono',monospace" }} className="ml-pct">{Math.round(score*100)}%</div>
      <div style={{ fontSize:12,fontWeight:700,color,letterSpacing:2,marginBottom:4,fontFamily:"'JetBrains Mono',monospace" }}>{risk}</div>
      <div style={{ fontSize:12,color:"#aaa",marginBottom:10,fontFamily:"'JetBrains Mono',monospace" }}>{host}</div>
      <div style={{ height:2,background:"rgba(255,255,255,0.05)",marginBottom:8 }}>
        <div style={{ width:`${score*100}%`,height:"100%",background:color,boxShadow:`0 0 8px ${color}`,transition:"width 0.9s ease" }}/>
      </div>
      <div style={{ fontSize:12,color:"#777",fontFamily:"'JetBrains Mono',monospace",lineHeight:1.5 }}>{reason}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DONUT CHART — pure SVG, reused by ML + Threats tabs
═══════════════════════════════════════════════════════════════ */
function DonutChart({ segments, size=160, strokeWidth=24, label="" }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let s=null, raf;
    const step = ts => {
      if(!s) s=ts;
      const p = Math.min((ts-s)/900,1);
      setProgress(p);
      if(p<1) raf=requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  },[]);
  const total = segments.reduce((a,s)=>a+s.value,0);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const hovered = hoveredIndex !== null ? segments[hoveredIndex] : null;
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth}/>
        {segments.map((seg,i) => {
          const pct = seg.value / total;
          const dashLen = circumference * pct * progress;
          const dashOffset = circumference - dashLen;
          const rotation = (offset / total) * 360;
          const el = (
            <circle key={i}
              className="donut-segment"
              cx={size/2} cy={size/2} r={r}
              fill="none" stroke={seg.color} strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                transform:`rotate(${rotation}deg)`,
                transformOrigin:"50% 50%",
                opacity: hoveredIndex===null||hoveredIndex===i?1:0.3,
                filter: hoveredIndex===i?`drop-shadow(0 0 6px ${seg.color})`:"none",
                cursor:"pointer",
              }}
              onMouseEnter={()=>setHoveredIndex(i)}
              onMouseLeave={()=>setHoveredIndex(null)}
            />
          );
          offset += seg.value;
          return el;
        })}
        <text x={size/2} y={size/2-6} textAnchor="middle" dominantBaseline="middle"
          fill={hovered?hovered.color:"#888"} fontSize={hovered?13:10} fontFamily="'JetBrains Mono',monospace"
          style={{ transform:"rotate(90deg)",transformOrigin:"50% 50%" }}>
          {hovered?hovered.label:label}
        </text>
        <text x={size/2} y={size/2+10} textAnchor="middle" dominantBaseline="middle"
          fill={hovered?hovered.color:"#555"} fontSize={hovered?16:18} fontWeight={700} fontFamily="'JetBrains Mono',monospace"
          style={{ transform:"rotate(90deg)",transformOrigin:"50% 50%" }}>
          {hovered?`${((hovered.value/total)*100).toFixed(0)}%`:total}
        </text>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CLOCK
═══════════════════════════════════════════════════════════════ */
function Clock() {
  const [t,setT]=useState(new Date());
  useEffect(()=>{const iv=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(iv);},[]);
  return (
    <div style={{ fontFamily:"'JetBrains Mono',monospace",textAlign:"right" }}>
      <div style={{ fontSize:15,letterSpacing:2,color:"#00ff9d",textShadow:"0 0 10px rgba(0,255,157,0.4)" }}>{t.toTimeString().slice(0,8)} <span style={{ color:"#444",fontSize:9 }}>UTC</span></div>
      <div style={{ fontSize:11,color:"#444",letterSpacing:1 }}>{t.toISOString().slice(0,10)}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STACK STATUS
═══════════════════════════════════════════════════════════════ */
const STACK=[
  {n:"Wazuh Manager",s:true,v:"4.14.3"},{n:"Suricata IDS (pi2)",s:true,v:"7.0.10"},
  {n:"Suricata IDS (rv2)",s:true,v:"7.0.3"},{n:"Grafana",s:true,v:"11.5.2"},
  {n:"K3s Cluster",s:true,v:"1.34.4"},{n:"Tailscale VPN",s:true,v:"1.96.4"},
  {n:"ML FastAPI",s:true,v:"0.1.0"},{n:"OpenLDAP",s:true,v:"2.6"},
  {n:"Cloudflare Tunnel",s:true,v:"2025.4"},
];

function StackItem({ item, delay }) {
  const [vis,setVis]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setVis(true),delay);return()=>clearTimeout(t);},[delay]);
  const col=item.s?"#00ff9d":"#ff4466";
  return (
    <div onMouseEnter={()=>SFX.hover()} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 0",fontFamily:"'JetBrains Mono',monospace",opacity:vis?1:0,transition:"opacity 0.3s ease" }} className="stack-item">
      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
        <div style={{ width:5,height:5,borderRadius:"50%",background:col,boxShadow:`0 0 5px ${col}`,animation:item.s?"pulseDot 2.5s ease-in-out infinite":"none" }}/>
        <span style={{ fontSize:11,color:"#777" }} className="stack-label">{item.n}</span>
      </div>
      <span style={{ fontSize:10,color:"#444" }} className="stack-ver">{item.v}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MUTE BUTTON
═══════════════════════════════════════════════════════════════ */
function MuteBtn() {
  const [muted,setMuted]=useState(false);
  return (
    <button onClick={()=>{const m=SFX.toggle();setMuted(m);SFX.click();}}
      style={{ padding:"4px 10px",fontSize:11,letterSpacing:2,fontFamily:"'JetBrains Mono',monospace",background:muted?"rgba(255,60,80,0.08)":"rgba(0,255,157,0.06)",border:`1px solid ${muted?"rgba(255,60,80,0.3)":"rgba(0,255,157,0.2)"}`,color:muted?"#ff4466":"#00ff9d",cursor:"pointer",transition:"all 0.2s" }}>
      {muted?"SFX:OFF":"SFX:ON"}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════════ */
const alertData=[12,18,9,24,31,15,42,28,19,35,47,22,38,16,53,41,29,18,44,37];
const netData=[45,52,38,61,73,44,82,55,67,88,71,59,93,78,62,85,70,55,88,95];
const mlData=[3,5,2,8,12,4,17,9,6,14,19,8,15,5,22,18,11,7,16,13];
const AGENTS=[
  {name:"wazuh-manager",ip:"127.0.0.1",status:"ACTIVE",os:"Docker / Debian (pi2)",last:"0s"},
  {name:"pi0",ip:"100.96.148.10",status:"ACTIVE",os:"Debian 12 / RPi4",last:"3s"},
  {name:"pi2 (sentinel-node)",ip:"100.111.113.35",status:"ACTIVE",os:"Debian 12 / RPi5 16GB",last:"1s"},
  {name:"pi1",ip:"100.77.26.41",status:"OFFLINE",os:"Debian 12 / RPi4",last:"—"},
  {name:"ThinkStation",ip:"100.64.0.3",status:"OFFLINE",os:"Ubuntu 24.04 LTS",last:"—"},
  {name:"XPS",ip:"100.64.0.4",status:"OFFLINE",os:"Windows 11 Pro",last:"—"},
  {name:"isaiah-pi",ip:"—",status:"OFFLINE",os:"Raspbian / RPi",last:"Never"},
  {name:"rv2 (syslog-fwd)",ip:"100.118.229.114",status:"ACTIVE",os:"Debian / OrangePi RISC-V",last:"12s"},
];
const THREATS=[
  {label:"Brute Force / Auth",value:89,max:200,color:"#ff4466"},
  {label:"Port Scan / Recon",value:134,max:200,color:"#ff8833"},
  {label:"SQL Injection",value:47,max:200,color:"#ffdd44"},
  {label:"C2 Beaconing",value:23,max:200,color:"#ff4466"},
  {label:"Priv Escalation",value:12,max:200,color:"#dd44ff"},
  {label:"Lateral Movement",value:8,max:200,color:"#3399ff"},
  {label:"Data Exfiltration",value:5,max:200,color:"#00ff9d"},
];
const ML_RISKS=[
  {host:"185.220.101.47",risk:"CRITICAL",score:0.94,reason:"Known Tor exit — sustained brute force against PA-220 SSH"},
  {host:"103.41.220.5",risk:"HIGH",score:0.81,reason:"CN GeoIP — RDP brute force campaign (891 attempts)"},
  {host:"94.102.61.7",risk:"HIGH",score:0.78,reason:"C2 beacon correlation (XGBoost R²=0.93)"},
  {host:"100.118.229.114",risk:"LOW",score:0.31,reason:"rv2 syslog burst — Suricata eve.json rotation spike"},
];
const ML_DETECTION_TYPES=[
  {label:"Random Forest",value:42,color:"#dd44ff"},
  {label:"Gradient Boost",value:31,color:"#3399ff"},
  {label:"Anomaly Detection",value:18,color:"#ff8833"},
  {label:"Ensemble",value:9,color:"#00ff9d"},
];
const ML_METRICS=[
  {label:"PRECISION",value:"94.2",unit:"%",color:"#00ff9d"},
  {label:"RECALL",value:"89.7",unit:"%",color:"#3399ff"},
  {label:"F1-SCORE",value:"91.9",unit:"%",color:"#dd44ff"},
  {label:"FALSE POS RATE",value:"3.1",unit:"%",color:"#ff4466"},
];
const ML_FEATURES=[
  {label:"Packet Size Distribution",importance:0.94},
  {label:"Connection Frequency",importance:0.87},
  {label:"DNS Query Entropy",importance:0.79},
  {label:"Geo-IP Anomaly Score",importance:0.72},
  {label:"Time-of-Day Deviation",importance:0.65},
];
const ML_DETECTIONS=[
  {time:"14:23:11",host:"pi2 (sentinel-node)",model:"XGBoost",score:0.94,type:"Priv Escalation"},
  {time:"14:18:44",host:"rv2 (suricata-ids)",model:"Gradient Boost",score:0.87,type:"Brute Force"},
  {time:"14:15:02",host:"pi0 (adguard)",model:"Anomaly Detection",score:0.91,type:"DNS Tunnel"},
  {time:"14:05:18",host:"pi2 (sentinel-node)",model:"Ensemble",score:0.81,type:"Data Exfil"},
  {time:"13:48:22",host:"ThinkStation",model:"XGBoost",score:0.96,type:"Credential Access"},
];
const THREAT_FEEDS=[
  {name:"AlienVault OTX",status:"SYNCED",iocs:12847,lastSync:"2m ago",color:"#00ff9d"},
  {name:"Abuse.ch",status:"SYNCED",iocs:8432,lastSync:"5m ago",color:"#00ff9d"},
  {name:"ET Open (Suricata)",status:"SYNCED",iocs:75313,lastSync:"12m ago",color:"#00ff9d"},
  {name:"Tor Exit List",status:"UPDATING",iocs:1247,lastSync:"31m ago",color:"#ff8833"},
];
const THREAT_POLICIES=[
  {name:"GeoIP Block CN/RU",scope:"WAN Inbound",hits:1293,status:"ACTIVE",color:"#00ff9d"},
  {name:"Rate Limit SSH",scope:"All Zones",hits:412,status:"ACTIVE",color:"#00ff9d"},
  {name:"WAF OWASP Core",scope:"DMZ HTTP/S",hits:847,status:"ACTIVE",color:"#00ff9d"},
  {name:"DNS Sinkhole",scope:"Internal DNS",hits:89,status:"ACTIVE",color:"#00ff9d"},
  {name:"IDS Strict Mode",scope:"Critical Assets",hits:2341,status:"ENFORCING",color:"#3399ff"},
];
const SOC_ROLES=[
  {role:"Lead / CI-CD / ML",user:"r.garcia",perms:"All Access, Deploy, Audit",active:true},
  {role:"IAM / Identity",user:"m.kassa",perms:"LDAP, OAuth, Access Control",active:true},
  {role:"SecOps / SIEM",user:"i.bernal",perms:"Wazuh, Suricata, IR, Forensics",active:true},
  {role:"UX / Frontend",user:"x.nguyen",perms:"UI Deploy, Feature Flags",active:true},
];
const ENHANCED_IPS=[
  {ip:"185.220.101.47",country:"DE",zone:"WAN",policy:"GeoIP Block",asn:"AS205100",firstSeen:"2026-03-02 12:41",lastSeen:"2026-03-02 14:18",hits:349,color:"#ff4466"},
  {ip:"94.102.61.7",country:"NL",zone:"WAN",policy:"DNS Sinkhole",asn:"AS47541",firstSeen:"2026-03-02 10:12",lastSeen:"2026-03-02 14:15",hits:201,color:"#ff8833"},
  {ip:"34.102.88.1",country:"US",zone:"DMZ",policy:"WAF OWASP",asn:"AS396982",firstSeen:"2026-03-02 13:44",lastSeen:"2026-03-02 14:08",hits:156,color:"#ff8833"},
  {ip:"103.41.220.5",country:"CN",zone:"WAN",policy:"GeoIP Block",asn:"AS4134",firstSeen:"2026-03-02 13:22",lastSeen:"2026-03-02 13:48",hits:891,color:"#ff4466"},
  {ip:"45.33.32.156",country:"US",zone:"WAN",policy:"Rate Limit",asn:"AS63949",firstSeen:"2026-03-02 11:30",lastSeen:"2026-03-02 13:55",hits:47,color:"#ffdd44"},
];
const DOC_TOOLS=[
  {name:"Wazuh",version:"4.14.3",commands:["docker exec wazuh-manager /var/ossec/bin/agent_control -l","wazuh-manager status","ossec-control restart"],docs:"https://documentation.wazuh.com"},
  {name:"Suricata",version:"7.0.10",commands:["suricatasc -c reload-rules","suricata --build-info","suricata -T -c /etc/suricata/suricata.yaml"],docs:"https://docs.suricata.io"},
  {name:"PA-220",version:"PAN-OS 11.x",commands:["show system info","show running security-policy","show session all"],docs:"https://docs.paloaltonetworks.com"},
  {name:"Cloudflare Tunnel",version:"2025.4",commands:["cloudflared tunnel info","cloudflared tunnel ingress validate","cloudflared update"],docs:"https://developers.cloudflare.com/cloudflare-one/connections/connect-networks"},
];
const ESCALATION_MATRIX=[
  {level:"L1 → L2",trigger:"Risk Score ≥ 60 or CRITICAL sev",sla:"15 min",action:"Escalate with triage notes"},
  {level:"L2 → IR Lead",trigger:"Confirmed compromise or data breach",sla:"30 min",action:"Activate IR playbook"},
  {level:"IR Lead → CISO",trigger:"Ransomware, APT, or regulatory impact",sla:"1 hour",action:"Executive briefing + legal notify"},
  {level:"CISO → External",trigger:"Law enforcement or disclosure required",sla:"4 hours",action:"Engage legal counsel + PR"},
];
const IR_CHECKLIST=[
  "Identify & validate the incident (confirm IOCs)",
  "Contain — isolate affected hosts from network",
  "Preserve evidence — memory dump + disk image",
  "Eradicate — remove malware, patch vulnerability",
  "Recover — restore from clean backups, verify",
  "Post-incident review — lessons learned, update playbooks",
  "Report — document timeline, notify stakeholders",
];


/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════════════ */
export default function SOCDashboard() {
  const [booted,setBooted]=useState(false);
  const [tab,setTab]=useState("overview");
  const [phraseIdx,setPhraseIdx]=useState(0);
  const [selectedEventId,setSelectedEventId]=useState(null);
  const [rawLogExpanded,setRawLogExpanded]=useState(false);
  const [irChecklistOpen,setIrChecklistOpen]=useState(false);
  const alertListRef=useRef(null);

  useEffect(()=>{const iv=setInterval(()=>setPhraseIdx(i=>(i+1)%STATUS_PHRASES.length),3800);return()=>clearInterval(iv);},[]);

  // Reset selection when leaving alerts tab
  useEffect(()=>{if(tab!=="alerts"){setSelectedEventId(null);setRawLogExpanded(false);}},[tab]);

  // Keyboard navigation for alerts
  useEffect(()=>{
    if(tab!=="alerts") return;
    const handler=(e)=>{
      if(e.key==="ArrowDown"){
        e.preventDefault();
        setSelectedEventId(prev=>{
          const idx=EVENTS.findIndex(ev=>ev.id===prev);
          const next=idx<EVENTS.length-1?idx+1:0;
          const el=alertListRef.current?.querySelector(`[data-event-id="${EVENTS[next].id}"]`);
          el?.scrollIntoView({block:"nearest",behavior:"smooth"});
          return EVENTS[next].id;
        });
        setRawLogExpanded(false);
      } else if(e.key==="ArrowUp"){
        e.preventDefault();
        setSelectedEventId(prev=>{
          const idx=EVENTS.findIndex(ev=>ev.id===prev);
          const next=idx>0?idx-1:EVENTS.length-1;
          const el=alertListRef.current?.querySelector(`[data-event-id="${EVENTS[next].id}"]`);
          el?.scrollIntoView({block:"nearest",behavior:"smooth"});
          return EVENTS[next].id;
        });
        setRawLogExpanded(false);
      } else if(e.key==="Escape"){
        setSelectedEventId(null);
        setRawLogExpanded(false);
      }
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[tab]);

  const selectedEvent=EVENTS.find(ev=>ev.id===selectedEventId)||null;
  const riskColor=(score)=>score>=80?"#ff4466":score>=60?"#ff8833":score>=30?"#ffdd44":"#33ffaa";
  const sourceColor=(src)=>({Wazuh:"#3399ff",Suricata:"#ff8833","Cloudflare WAF":"#ff9933","ML Engine":"#dd44ff"}[src]||"#666");

  return (
    <>
      {!booted && <BootSequence onDone={()=>setBooted(true)}/>}

      <div style={{ minHeight:"100vh",background:"#020305",fontFamily:"'JetBrains Mono',monospace",opacity:booted?1:0,transition:"opacity 0.8s ease" }}>
        <HexGrid opacity={0.04}/>
        {/* CRT scanlines */}
        <div style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:40,contain:"strict",backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.05) 2px,rgba(0,0,0,0.05) 4px)" }}/>
        {/* Vignette */}
        <div style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:39,contain:"strict",background:"radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.72) 100%)" }}/>

        {/* ── TOPBAR ── */}
        <div style={{ position:"relative",zIndex:50,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",height:52,borderBottom:"1px solid rgba(0,255,157,0.08)",background:"rgba(2,3,5,0.99)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ width:8,height:8,borderRadius:"50%",background:"#00ff9d",boxShadow:"0 0 12px #00ff9d",animation:"pulseDot 1.5s ease-in-out infinite" }}/>
              <GlitchText text="SOC // COMMAND" style={{ fontSize:15,fontWeight:900,letterSpacing:"4px",color:"#00ff9d" }}/>
            </div>
            <div style={{ width:1,height:18,background:"rgba(255,255,255,0.07)" }}/>
            <span style={{ fontSize:11,color:"#444",letterSpacing:"2px" }}>WAZUH 4.14.3 · CLEARANCE:ALPHA</span>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:12,letterSpacing:"5px",fontWeight:700,color:"#ff4466",textShadow:"0 0 14px rgba(255,60,80,0.55)",animation:"sevBlink 3.5s ease-in-out infinite" }}>{STATUS_PHRASES[phraseIdx]}</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <MuteBtn/>
            <Clock/>
          </div>
        </div>

        {/* ── TICKER ── */}
        <div style={{ position:"relative",zIndex:50,height:34,borderBottom:"1px solid rgba(255,255,255,0.03)",background:"rgba(2,3,5,0.97)",padding:"0 24px",display:"flex",alignItems:"center",gap:12 }}>
          <span style={{ fontSize:10,padding:"2px 7px",fontWeight:700,letterSpacing:2,color:"#ff4466",border:"1px solid rgba(255,60,80,0.4)",background:"rgba(255,60,80,0.08)",animation:"sevBlink 0.9s step-end infinite",flexShrink:0 }}>LIVE</span>
          <div style={{ flex:1,overflow:"hidden" }}><LiveTicker/></div>
          <span style={{ fontSize:10,color:"#333",letterSpacing:2,flexShrink:0 }}>8 AGENTS · 4 ZONES</span>
        </div>

        {/* ── BODY ── */}
        <div style={{ position:"relative",zIndex:20,display:"flex",height:"calc(100vh - 86px)" }}>

          {/* SIDEBAR */}
          <div style={{ width:220,flexShrink:0,borderRight:"1px solid rgba(0,255,157,0.05)",background:"rgba(2,3,5,0.97)",display:"flex",flexDirection:"column",overflowY:"auto" }}>
            <div style={{ padding:"6px 0" }}>
              {[
                {id:"overview",label:"// OVERVIEW"},
                {id:"alerts",label:"// ALERT FEED",badge:"247"},
                {id:"agents",label:"// AGENTS"},
                {id:"threats",label:"// THREAT INTEL"},
                {id:"ml",label:"// ML ENGINE"},
                {id:"zones",label:"// ZONES / FW"},
                {id:"docs",label:"// DOCS"},
              ].map(item=><NavItem key={item.id} {...item} active={tab===item.id} onClick={setTab}/>)}
            </div>
            <div style={{ padding:"14px 16px",borderTop:"1px solid rgba(255,255,255,0.03)",marginTop:"auto" }}>
              <div style={{ fontSize:10,letterSpacing:"3px",color:"#333",marginBottom:10 }}>STACK STATUS</div>
              {STACK.map((item,i)=><StackItem key={i} item={item} delay={i*55}/>)}
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div style={{ flex:1,overflowY:tab==="alerts"?"hidden":"auto",padding:tab==="alerts"?0:20,display:"flex",flexDirection:"column" }}>

            {tab==="overview" && (
              <div style={{ animation:"fadeSlideIn 0.4s ease both" }}>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20 }}>
                  <StatCard label="ACTIVE ALERTS" value="247" color="#ff4466" crit sub="↑ 18% last hour"/>
                  <StatCard label="EVENTS / SEC" value="3841" color="#ff8833" sub="Wazuh ingestion"/>
                  <StatCard label="AGENTS ONLINE" value="4" color="#00ff9d" sub="4 zones monitored"/>
                  <StatCard label="THREATS BLOCKED" value="1293" color="#3399ff" sub="PA-220 + CF Tunnel"/>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20 }}>
                  <ChartCard title="ALERT VOLUME" value="247" badge="CRITICAL" badgeColor="#ff4466" color="#ff4466" data={alertData}/>
                  <ChartCard title="NETWORK TRAFFIC" value="2.4" unit="GB/s" badge="NORMAL" badgeColor="#3399ff" color="#3399ff" data={netData}/>
                  <ChartCard title="ML ANOMALIES" value="13" badge="RF:81%" badgeColor="#dd44ff" color="#dd44ff" data={mlData}/>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                  <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.97)" }}>
                    <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:16 }}>THREAT CATEGORIES // 24H</div>
                    {THREATS.map((t,i)=><ThreatBar key={i} {...t}/>)}
                  </div>
                  <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.97)" }}>
                    <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:12 }}>AGENT ROSTER</div>
                    {AGENTS.slice(0,6).map((a,i)=><AgentRow key={i} agent={a} delay={i*75}/>)}
                  </div>
                </div>
              </div>
            )}

            {tab==="alerts" && (
              <div style={{ display:"flex",flex:1,overflow:"hidden",animation:"fadeSlideIn 0.4s ease both" }}>

                {/* ── LEFT PANE: Alert List ── */}
                <div ref={alertListRef} style={{ width:420,flexShrink:0,overflowY:"auto",borderRight:"1px solid rgba(255,255,255,0.06)",background:"rgba(2,3,5,0.98)" }}>
                  {/* Sticky header */}
                  <div style={{ position:"sticky",top:0,zIndex:5,padding:"16px 16px 12px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(2,3,5,0.99)",backdropFilter:"blur(8px)" }}>
                    <div style={{ fontSize:11,letterSpacing:"3px",color:"#666" }}>ALERT FEED — WAZUH + SURICATA + CF WAF + ML</div>
                    <div style={{ fontSize:10,color:"#444",marginTop:4 }}>{EVENTS.length} EVENTS // {EVENTS.filter(e=>e.status==="Open").length} OPEN // {EVENTS.filter(e=>e.sev==="CRITICAL").length} CRITICAL</div>
                  </div>

                  {/* Alert rows */}
                  {EVENTS.map((ev,i)=>{
                    const isSelected=selectedEventId===ev.id;
                    return (
                      <div key={ev.id} data-event-id={ev.id}
                        className={`alert-row ${isSelected?"alert-row-selected":""}`}
                        onClick={()=>{SFX.tabSwitch();setSelectedEventId(ev.id);setRawLogExpanded(false);}}
                        onMouseEnter={()=>SFX.hover()}
                        style={{
                          padding:"10px 16px",
                          borderBottom:"1px solid rgba(255,255,255,0.03)",
                          borderLeft:`3px solid ${isSelected?ev.color:"transparent"}`,
                          background:isSelected?`${ev.color}0a`:"transparent",
                          cursor:"pointer",
                          transition:"all 0.15s ease",
                          animation:`fadeSlideIn 0.3s ease ${i*30}ms both`,
                        }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <span style={{ padding:"1px 6px",fontSize:9,fontWeight:700,letterSpacing:1.5,flexShrink:0,color:ev.color,border:`1px solid ${ev.color}40`,background:`${ev.color}12`,minWidth:60,textAlign:"center",
                            animation:ev.sev==="CRITICAL"?"sevBlink 0.9s step-end infinite":"none" }}>{ev.sev}</span>
                          <span style={{ fontSize:11,color:isSelected?"#ddd":"#999",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1 }}>{ev.msg}</span>
                        </div>
                        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:5,fontSize:10,color:"#444" }}>
                          <span>{ev.timestamp.replace("T"," ").slice(0,19)} UTC</span>
                          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                            <span style={{ color:sourceColor(ev.source) }}>{ev.source}</span>
                            <span style={{ color:riskColor(ev.riskScore),fontWeight:700 }}>R:{ev.riskScore}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── RIGHT PANE: Alert Detail ── */}
                <div style={{ flex:1,overflowY:"auto",background:"rgba(4,8,5,0.97)" }}>
                  {!selectedEvent ? (
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:12 }}>
                      <div style={{ fontSize:38,opacity:0.1 }}>⬡</div>
                      <div style={{ fontSize:12,letterSpacing:"4px",color:"#333" }}>SELECT AN ALERT</div>
                      <div style={{ fontSize:10,color:"#222" }}>Use arrow keys or click to inspect</div>
                    </div>
                  ) : (
                    <div>
                      {/* A. HEADER */}
                      <div className="detail-section" style={{ borderTop:`3px solid ${selectedEvent.color}` }}>
                        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap" }}>
                          <span style={{ padding:"2px 8px",fontSize:10,fontWeight:700,letterSpacing:1.5,color:selectedEvent.color,border:`1px solid ${selectedEvent.color}50`,background:`${selectedEvent.color}15`,
                            animation:selectedEvent.sev==="CRITICAL"?"sevBlink 0.9s step-end infinite":"none" }}>{selectedEvent.sev}</span>
                          <span style={{ fontSize:11,color:"#555",fontFamily:"'JetBrains Mono',monospace" }}>{selectedEvent.id}</span>
                          <span style={{ padding:"2px 8px",fontSize:9,letterSpacing:1,color:selectedEvent.status==="Open"?"#ff4466":selectedEvent.status==="Investigating"?"#ff8833":"#33ffaa",
                            border:`1px solid ${selectedEvent.status==="Open"?"#ff446640":selectedEvent.status==="Investigating"?"#ff883340":"#33ffaa40"}`,
                            background:selectedEvent.status==="Open"?"#ff446610":selectedEvent.status==="Investigating"?"#ff883310":"#33ffaa10" }}>{selectedEvent.status.toUpperCase()}</span>
                          <span style={{ padding:"2px 8px",fontSize:9,letterSpacing:1,color:"#3399ff",border:"1px solid #3399ff40",background:"#3399ff10" }}>{selectedEvent.action}</span>
                        </div>
                        <div style={{ fontSize:13,color:"#ddd",lineHeight:1.5,marginBottom:6 }}>{selectedEvent.msg}</div>
                        <div style={{ fontSize:10,color:"#555" }}>{selectedEvent.timestamp.replace("T"," ").replace("Z","")} UTC</div>
                      </div>

                      {/* B. RISK SCORE */}
                      <div className="detail-section">
                        <div style={{ display:"flex",alignItems:"center",gap:20 }}>
                          <div style={{ fontSize:38,fontWeight:700,color:riskColor(selectedEvent.riskScore),lineHeight:1,fontFamily:"'JetBrains Mono',monospace",textShadow:`0 0 20px ${riskColor(selectedEvent.riskScore)}40` }}>{selectedEvent.riskScore}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:10,letterSpacing:"2px",color:"#555",marginBottom:6 }}>RISK SCORE</div>
                            <div style={{ height:6,background:"rgba(255,255,255,0.04)",borderRadius:3,overflow:"hidden" }}>
                              <div style={{ width:`${selectedEvent.riskScore}%`,height:"100%",borderRadius:3,transition:"width 0.5s ease",
                                background:`linear-gradient(90deg, #33ffaa 0%, #ffdd44 40%, #ff8833 70%, #ff4466 100%)` }}/>
                            </div>
                            <div style={{ display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:"#444" }}>
                              <span>ML Confidence: <span style={{ color:"#aaa" }}>{(selectedEvent.confidence*100).toFixed(0)}%</span></span>
                              <span>Occurrences: <span style={{ color:"#aaa" }}>{selectedEvent.occurrences.toLocaleString()}</span></span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* C. SOURCE / DESTINATION */}
                      <div className="detail-section">
                        <div style={{ display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:16,alignItems:"start" }}>
                          <div>
                            <div style={{ fontSize:10,letterSpacing:"2px",color:"#555",marginBottom:8 }}>SOURCE</div>
                            <div style={{ fontSize:12,color:"#ccc",fontFamily:"'JetBrains Mono',monospace" }}>{selectedEvent.srcIp}{selectedEvent.srcPort?`:${selectedEvent.srcPort}`:""}</div>
                            <div style={{ fontSize:10,color:"#555",marginTop:3 }}>{selectedEvent.srcGeo}</div>
                            <div style={{ fontSize:10,color:"#444",marginTop:2 }}>{selectedEvent.srcHost}</div>
                          </div>
                          <div style={{ color:"#333",fontSize:18,paddingTop:16 }}>→</div>
                          <div>
                            <div style={{ fontSize:10,letterSpacing:"2px",color:"#555",marginBottom:8 }}>DESTINATION</div>
                            <div style={{ fontSize:12,color:"#ccc",fontFamily:"'JetBrains Mono',monospace" }}>{selectedEvent.dstIp}{selectedEvent.dstPort?`:${selectedEvent.dstPort}`:""}</div>
                            <div style={{ fontSize:10,color:"#444",marginTop:3 }}>{selectedEvent.dstHost}</div>
                          </div>
                        </div>
                        {selectedEvent.tags.length>0 && (
                          <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginTop:12 }}>
                            {selectedEvent.tags.map((tag,i)=>(
                              <span key={i} style={{ padding:"2px 8px",fontSize:9,color:"#777",border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.02)",borderRadius:2 }}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* D. MITRE ATT&CK */}
                      <div className="detail-section">
                        <div style={{ fontSize:10,letterSpacing:"2px",color:"#555",marginBottom:8 }}>MITRE ATT&CK</div>
                        {selectedEvent.mitreTactic==="N/A" ? (
                          <div style={{ fontSize:11,color:"#333",fontStyle:"italic" }}>No ATT&CK mapping — informational event</div>
                        ) : (
                          <div style={{ display:"flex",gap:16,alignItems:"center" }}>
                            <div>
                              <div style={{ fontSize:10,color:"#666",marginBottom:2 }}>TACTIC</div>
                              <div style={{ fontSize:12,color:"#ff8833" }}>{selectedEvent.mitreTactic}</div>
                            </div>
                            <div style={{ color:"#333" }}>›</div>
                            <div>
                              <div style={{ fontSize:10,color:"#666",marginBottom:2 }}>TECHNIQUE</div>
                              <div style={{ fontSize:12,color:"#ffdd44",fontFamily:"'JetBrains Mono',monospace" }}>{selectedEvent.mitreTechnique}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* E. DETECTION RULE */}
                      <div className="detail-section">
                        <div style={{ fontSize:10,letterSpacing:"2px",color:"#555",marginBottom:8 }}>DETECTION RULE</div>
                        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                          <span className={`source-badge source-${selectedEvent.source.toLowerCase().replace(/\s+/g,"-")}`}
                            style={{ padding:"2px 8px",fontSize:9,fontWeight:700,letterSpacing:1,color:sourceColor(selectedEvent.source),
                              border:`1px solid ${sourceColor(selectedEvent.source)}40`,background:`${sourceColor(selectedEvent.source)}12` }}>{selectedEvent.source}</span>
                          <span style={{ fontSize:11,color:"#aaa",fontFamily:"'JetBrains Mono',monospace" }}>{selectedEvent.ruleId}</span>
                        </div>
                        <div style={{ fontSize:12,color:"#ccc",marginBottom:4 }}>{selectedEvent.ruleName}</div>
                        <div style={{ fontSize:10,color:"#555",marginBottom:8 }}>Group: {selectedEvent.ruleGroup} · Agent: {selectedEvent.agentName} ({selectedEvent.agentIp})</div>
                        <div style={{ fontSize:11,color:"#777",lineHeight:1.6 }}>{selectedEvent.description}</div>
                      </div>

                      {/* F. RECOMMENDED RESPONSE */}
                      <div className="detail-section">
                        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
                          <div style={{ fontSize:10,letterSpacing:"2px",color:"#555" }}>RECOMMENDED RESPONSE</div>
                          <span style={{ padding:"2px 8px",fontSize:9,color:"#3399ff",border:"1px solid #3399ff40",background:"#3399ff10",fontFamily:"'JetBrains Mono',monospace" }}>{selectedEvent.playbookRef}</span>
                        </div>
                        {selectedEvent.recommendedActions.map((action,i)=>(
                          <div key={i} className="action-step"
                            style={{ display:"flex",gap:10,padding:"8px 12px",marginBottom:4,borderLeft:`2px solid ${selectedEvent.color}30`,transition:"background 0.15s" }}>
                            <span style={{ fontSize:10,color:selectedEvent.color,fontWeight:700,flexShrink:0,fontFamily:"'JetBrains Mono',monospace" }}>{i+1}.</span>
                            <span style={{ fontSize:11,color:"#999",lineHeight:1.5 }}>{action}</span>
                          </div>
                        ))}
                      </div>

                      {/* G. RELATED EVENTS + RAW LOG */}
                      <div className="detail-section" style={{ borderBottom:"none" }}>
                        {selectedEvent.relatedEventIds.length>0 && (
                          <div style={{ marginBottom:16 }}>
                            <div style={{ fontSize:10,letterSpacing:"2px",color:"#555",marginBottom:8 }}>RELATED EVENTS</div>
                            <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                              {selectedEvent.relatedEventIds.map((rid,i)=>(
                                <span key={i} className="related-badge"
                                  onClick={(e)=>{e.stopPropagation();const target=EVENTS.find(ev=>ev.id===rid);if(target){setSelectedEventId(rid);setRawLogExpanded(false);SFX.tabSwitch();
                                    const el=alertListRef.current?.querySelector(`[data-event-id="${rid}"]`);el?.scrollIntoView({block:"nearest",behavior:"smooth"});}}}
                                  style={{ padding:"3px 10px",fontSize:10,color:"#33ffaa",border:"1px solid #33ffaa30",background:"#33ffaa08",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",transition:"all 0.15s" }}>
                                  {rid}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <div onClick={()=>setRawLogExpanded(!rawLogExpanded)}
                            style={{ fontSize:10,letterSpacing:"2px",color:"#555",marginBottom:8,cursor:"pointer",display:"flex",alignItems:"center",gap:6,userSelect:"none" }}>
                            <span style={{ color:"#444",transition:"transform 0.2s",display:"inline-block",transform:rawLogExpanded?"rotate(90deg)":"rotate(0deg)" }}>▶</span>
                            RAW LOG
                          </div>
                          {rawLogExpanded && (
                            <div style={{ padding:"10px 14px",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(255,255,255,0.04)",fontSize:10,color:"#666",fontFamily:"'JetBrains Mono',monospace",lineHeight:1.6,wordBreak:"break-all",whiteSpace:"pre-wrap",animation:"fadeSlideIn 0.2s ease both" }}>
                              {selectedEvent.rawLog}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {tab==="agents" && (
              <div style={{ animation:"fadeSlideIn 0.4s ease both" }}>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16 }}>
                  <StatCard label="TOTAL AGENTS" value="8" color="#00ff9d"/>
                  <StatCard label="ACTIVE" value="4" color="#00ff9d"/>
                  <StatCard label="WARNING" value="0" color="#ff9933"/>
                  <StatCard label="OFFLINE" value="4" color="#555"/>
                </div>
                <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.97)" }}>
                  <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:14 }}>ALL NODES — {AGENTS.length} REGISTERED</div>
                  {AGENTS.map((a,i)=><AgentRow key={i} agent={a} delay={i*65}/>)}
                </div>
              </div>
            )}

            {tab==="threats" && (
              <div style={{ animation:"fadeSlideIn 0.4s ease both" }}>
                {/* Row 1: Threat Distribution + Donut */}
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
                  <div style={{ padding:20,border:"1px solid rgba(255,60,80,0.1)",background:"rgba(255,60,80,0.02)" }}>
                    <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:16 }}>THREAT DISTRIBUTION</div>
                    {THREATS.map((t,i)=><ThreatBar key={i} {...t}/>)}
                  </div>
                  <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.97)",display:"flex",alignItems:"center",justifyContent:"center",gap:24 }}>
                    <DonutChart segments={THREATS.map(t=>({label:t.label,value:t.value,color:t.color}))} size={160} strokeWidth={22} label="THREATS"/>
                    <div>
                      <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:12 }}>THREAT BREAKDOWN</div>
                      {THREATS.map((t,i)=>(
                        <div key={i} style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6,fontFamily:"'JetBrains Mono',monospace",fontSize:10 }}>
                          <div style={{ width:6,height:6,borderRadius:"50%",background:t.color,flexShrink:0 }}/>
                          <span style={{ color:"#777" }}>{t.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Row 2: Enhanced Source IPs table */}
                <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.97)",marginBottom:12,overflowX:"auto" }}>
                  <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:14 }}>ENHANCED SOURCE IPs</div>
                  <div style={{ display:"grid",gridTemplateColumns:"130px 50px 60px 110px 90px 130px 130px 70px",gap:0,fontFamily:"'JetBrains Mono',monospace",fontSize:11,minWidth:770 }}>
                    {["IP","GEO","ZONE","POLICY","ASN","FIRST SEEN","LAST SEEN","HITS"].map(h=>(
                      <div key={h} style={{ padding:"6px 6px",color:"#555",letterSpacing:1.5,fontSize:9,borderBottom:"1px solid rgba(255,255,255,0.06)" }}>{h}</div>
                    ))}
                    {ENHANCED_IPS.map((item,i)=>[
                      <div key={`${i}ip`} style={{ padding:"7px 6px",color:"#ccc",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>{item.ip}</div>,
                      <div key={`${i}geo`} style={{ padding:"7px 6px",color:"#777",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>{item.country}</div>,
                      <div key={`${i}zone`} style={{ padding:"7px 6px",color:"#3399ff",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>{item.zone}</div>,
                      <div key={`${i}pol`} style={{ padding:"7px 6px",color:"#aaa",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>{item.policy}</div>,
                      <div key={`${i}asn`} style={{ padding:"7px 6px",color:"#555",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>{item.asn}</div>,
                      <div key={`${i}first`} style={{ padding:"7px 6px",color:"#666",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>{item.firstSeen}</div>,
                      <div key={`${i}last`} style={{ padding:"7px 6px",color:"#666",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>{item.lastSeen}</div>,
                      <div key={`${i}hits`} style={{ padding:"7px 6px",color:item.color,fontWeight:700,borderBottom:"1px solid rgba(255,255,255,0.03)" }}>{item.hits}</div>,
                    ])}
                  </div>
                </div>
                {/* Row 3: Threat Intel Feeds + Active Policies */}
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
                  <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.97)" }}>
                    <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:14 }}>THREAT INTEL FEEDS</div>
                    {THREAT_FEEDS.map((f,i)=>(
                      <div key={i} onMouseEnter={()=>SFX.hover()} className="agent-row" style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"default" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <div style={{ width:6,height:6,borderRadius:"50%",background:f.color,boxShadow:`0 0 5px ${f.color}` }}/>
                          <div>
                            <div style={{ color:"#ccc" }}>{f.name}</div>
                            <div style={{ fontSize:10,color:"#555",marginTop:2 }}>{f.iocs.toLocaleString()} IOCs · {f.lastSync}</div>
                          </div>
                        </div>
                        <span style={{ fontSize:10,color:f.color,letterSpacing:1 }}>{f.status}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.97)" }}>
                    <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:14 }}>ACTIVE POLICIES</div>
                    {THREAT_POLICIES.map((p,i)=>(
                      <div key={i} onMouseEnter={()=>SFX.hover()} className="agent-row" style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"default" }}>
                        <div>
                          <div style={{ color:"#ccc" }}>{p.name}</div>
                          <div style={{ fontSize:10,color:"#555",marginTop:2 }}>Scope: {p.scope}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ color:p.color,fontSize:10,letterSpacing:1 }}>{p.status}</div>
                          <div style={{ fontSize:10,color:"#777",marginTop:2 }}>{p.hits.toLocaleString()} hits</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Row 4: RBAC — SOC Analyst Roles */}
                <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.97)" }}>
                  <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:14 }}>RBAC — SOC ANALYST ROLES</div>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
                    {SOC_ROLES.map((r,i)=>(
                      <div key={i} style={{ padding:14,border:`1px solid ${r.active?"rgba(0,255,157,0.12)":"rgba(255,255,255,0.06)"}`,background:r.active?"rgba(0,255,157,0.02)":"rgba(255,255,255,0.01)" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                          <div style={{ width:6,height:6,borderRadius:"50%",background:r.active?"#00ff9d":"#555",boxShadow:r.active?"0 0 6px #00ff9d":"none" }}/>
                          <span style={{ fontSize:12,color:r.active?"#00ff9d":"#666",fontWeight:700,letterSpacing:1,fontFamily:"'JetBrains Mono',monospace" }}>{r.role}</span>
                        </div>
                        <div style={{ fontSize:11,color:"#aaa",marginBottom:4,fontFamily:"'JetBrains Mono',monospace" }}>{r.user}</div>
                        <div style={{ fontSize:10,color:"#555",lineHeight:1.5 }}>{r.perms}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab==="ml" && (
              <div style={{ animation:"fadeSlideIn 0.4s ease both" }}>
                {/* Row 1: Status bar */}
                <div style={{ marginBottom:12,padding:16,border:"1px solid rgba(221,68,255,0.12)",background:"rgba(221,68,255,0.015)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:4 }}>ML ENGINE STATUS</div>
                    <div style={{ fontSize:12,color:"#aa66cc",fontFamily:"'JetBrains Mono',monospace" }}>FastAPI · gRPC/Protobuf · GradientBoost R²=0.93 · RandomForest 81% · scikit-learn 1.4</div>
                  </div>
                  <span style={{ padding:"4px 12px",border:"1px solid rgba(0,255,157,0.25)",color:"#00ff9d",fontSize:11,letterSpacing:2,background:"rgba(0,255,157,0.04)" }}>ONLINE</span>
                </div>
                {/* Row 2: Donut + Metrics */}
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
                  <div style={{ padding:20,border:"1px solid rgba(221,68,255,0.1)",background:"rgba(4,8,5,0.97)",display:"flex",alignItems:"center",gap:24 }}>
                    <DonutChart segments={ML_DETECTION_TYPES} size={150} strokeWidth={22} label="MODELS"/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:12 }}>DETECTION TYPE BREAKDOWN</div>
                      {ML_DETECTION_TYPES.map((d,i)=>(
                        <div key={i} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8,fontFamily:"'JetBrains Mono',monospace",fontSize:11 }}>
                          <div style={{ width:8,height:8,borderRadius:"50%",background:d.color,boxShadow:`0 0 4px ${d.color}`,flexShrink:0 }}/>
                          <span style={{ color:"#999",flex:1 }}>{d.label}</span>
                          <span style={{ color:d.color,fontWeight:700 }}>{d.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                    {ML_METRICS.map((m,i)=>(
                      <StatCard key={i} label={m.label} value={m.value+m.unit} color={m.color}/>
                    ))}
                  </div>
                </div>
                {/* Row 3: Charts */}
                <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:12 }}>
                  <ChartCard title="ML ANOMALY SCORE / HR" value="13" badge="ACTIVE" badgeColor="#dd44ff" color="#dd44ff" data={mlData}/>
                  <ChartCard title="MODEL CONFIDENCE" value="93" unit="%" badge="GB-BOOST" badgeColor="#3399ff" color="#3399ff" data={netData.map(v=>Math.min(v,100))}/>
                </div>
                {/* Row 4: Feature Importance */}
                <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.97)",marginBottom:12 }}>
                  <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:16 }}>TOP MODEL FEATURES — IMPORTANCE</div>
                  {ML_FEATURES.map((f,i)=>(
                    <ThreatBar key={i} label={f.label} value={Math.round(f.importance*100)} max={100} color="#dd44ff"/>
                  ))}
                </div>
                {/* Row 5: Recent ML Detections table */}
                <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.97)",marginBottom:12 }}>
                  <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:14 }}>RECENT ML DETECTIONS</div>
                  <div style={{ display:"grid",gridTemplateColumns:"70px 1fr 1fr 70px 1fr",gap:0,fontFamily:"'JetBrains Mono',monospace",fontSize:11 }}>
                    {["TIME","HOST","MODEL","SCORE","TYPE"].map(h=>(
                      <div key={h} style={{ padding:"6px 8px",color:"#555",letterSpacing:2,fontSize:10,borderBottom:"1px solid rgba(255,255,255,0.06)" }}>{h}</div>
                    ))}
                    {ML_DETECTIONS.map((d,i)=>[
                        <div key={`${i}a`} style={{ padding:"8px 8px",color:"#777",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>{d.time}</div>,
                        <div key={`${i}b`} style={{ padding:"8px 8px",color:"#aaa",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>{d.host}</div>,
                        <div key={`${i}c`} style={{ padding:"8px 8px",color:"#aa66cc",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>{d.model}</div>,
                        <div key={`${i}d`} style={{ padding:"8px 8px",color:d.score>=0.9?"#ff4466":d.score>=0.8?"#ff8833":"#ffdd44",fontWeight:700,borderBottom:"1px solid rgba(255,255,255,0.03)" }}>{(d.score*100).toFixed(0)}%</div>,
                        <div key={`${i}e`} style={{ padding:"8px 8px",color:"#999",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>{d.type}</div>,
                      ])}
                  </div>
                </div>
                {/* Row 6: ML Risk Cards */}
                <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12 }}>
                  {ML_RISKS.map((r,i)=><MLRiskCard key={i} {...r}/>)}
                </div>
              </div>
            )}

            {tab==="zones" && (
              <div style={{ animation:"fadeSlideIn 0.4s ease both" }}>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
                  <div style={{ padding:20,border:"1px solid rgba(0,255,157,0.07)",background:"rgba(4,8,5,0.97)" }}>
                    <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:16 }}>FIREWALL ZONES — ACTIVE SEGMENTATION</div>
                    {[
                      {zone:"DMZ",status:"SECURE",hosts:8,rules:142,color:"#00ff9d"},
                      {zone:"INTERNAL",status:"ALERT",hosts:23,rules:89,color:"#ff8833"},
                      {zone:"MANAGEMENT",status:"SECURE",hosts:6,rules:67,color:"#00ff9d"},
                      {zone:"IoT / EDGE",status:"WARN",hosts:10,rules:34,color:"#ffdd44"},
                    ].map((z,i)=>(
                      <div key={i} onMouseEnter={()=>SFX.hover()} className="agent-row" style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 10px",borderBottom:"1px solid rgba(255,255,255,0.03)",fontFamily:"'JetBrains Mono',monospace",cursor:"default" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                          <div style={{ width:6,height:6,borderRadius:"50%",background:z.color,boxShadow:`0 0 6px ${z.color}` }}/>
                          <div>
                            <div style={{ fontSize:12,color:"#ccc" }}>{z.zone}</div>
                            <div style={{ fontSize:11,color:"#555",marginTop:2 }}>{z.hosts} hosts · {z.rules} rules</div>
                          </div>
                        </div>
                        <span style={{ fontSize:11,color:z.color,letterSpacing:1,textShadow:`0 0 8px ${z.color}60` }}>{z.status}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.97)" }}>
                    <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:16 }}>RECENT BLOCKED CONNECTIONS</div>
                    {[
                      {src:"185.220.101.47",dst:"PA-220:22",proto:"SSH",action:"BLOCKED",color:"#ff4466",time:"2s ago"},
                      {src:"94.102.61.7",dst:"pi2:30522",proto:"HTTPS",action:"RATE-LTD",color:"#ff8833",time:"8s ago"},
                      {src:"103.41.220.5",dst:"PA-220:3389",proto:"RDP",action:"BLOCKED",color:"#ff4466",time:"14s ago"},
                      {src:"45.33.32.156",dst:"pi2:30523",proto:"HTTP",action:"FLAGGED",color:"#ffdd44",time:"31s ago"},
                      {src:"rv2-syslog",dst:"pi2:514/UDP",proto:"SYSLOG",action:"INGESTED",color:"#00ff9d",time:"12s ago"},
                      {src:"192.168.1.99",dst:"pi0:53",proto:"DNS",action:"SINKHOLED",color:"#dd44ff",time:"45s ago"},
                    ].map((conn,i)=>(
                      <div key={i} onMouseEnter={()=>SFX.hover()} className="agent-row" style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",fontFamily:"'JetBrains Mono',monospace",fontSize:12,animation:`fadeSlideIn 0.3s ease ${i*40}ms both`,cursor:"default" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <span style={{ color:"#aaa" }}>{conn.src}</span>
                          <span style={{ color:"#333" }}>→</span>
                          <span style={{ color:"#777" }}>{conn.dst}</span>
                          <span style={{ fontSize:10,color:"#555",padding:"1px 5px",border:"1px solid rgba(255,255,255,0.08)" }}>{conn.proto}</span>
                        </div>
                        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                          <span style={{ fontSize:11,color:conn.color,letterSpacing:1 }}>{conn.action}</span>
                          <span style={{ fontSize:10,color:"#444" }}>{conn.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
                  <StatCard label="RULES ACTIVE" value="332" color="#00ff9d" sub="across 4 zones"/>
                  <StatCard label="BLOCKED TODAY" value="1847" color="#ff4466" sub="↑ 23% vs avg"/>
                  <StatCard label="RATE LIMITED" value="412" color="#ff8833" sub="brute force mitigation"/>
                  <StatCard label="DNS SINKHOLED" value="89" color="#dd44ff" sub="C2 domain intercepts"/>
                </div>
              </div>
            )}

            {tab==="docs" && (
              <div style={{ animation:"fadeSlideIn 0.4s ease both" }}>
                <div style={{ fontSize:13,letterSpacing:"4px",color:"#00ff9d",marginBottom:16,fontWeight:700,textShadow:"0 0 10px rgba(0,255,157,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>DOCUMENTATION — SOC REFERENCE</div>

                {/* Tool Reference Cards 2x2 */}
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
                  {DOC_TOOLS.map((tool,i)=>(
                    <div key={i} className="doc-card" style={{ padding:16,border:"1px solid rgba(0,255,157,0.08)",background:"rgba(4,8,5,0.97)",transition:"border-color 0.2s" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
                        <span style={{ fontSize:13,color:"#ccc",fontWeight:700,fontFamily:"'JetBrains Mono',monospace" }}>{tool.name}</span>
                        <span style={{ fontSize:9,padding:"2px 7px",color:"#00ff9d",border:"1px solid rgba(0,255,157,0.25)",background:"rgba(0,255,157,0.04)",letterSpacing:1 }}>{tool.version}</span>
                      </div>
                      <div style={{ marginBottom:10 }}>
                        {tool.commands.map((cmd,j)=>(
                          <div key={j} style={{ fontSize:10,color:"#777",fontFamily:"'JetBrains Mono',monospace",padding:"3px 8px",marginBottom:3,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.03)" }}>$ {cmd}</div>
                        ))}
                      </div>
                      <a href={tool.docs} target="_blank" rel="noopener noreferrer" style={{ fontSize:10,color:"#3399ff",textDecoration:"none",letterSpacing:1,fontFamily:"'JetBrains Mono',monospace" }}>{tool.docs}</a>
                    </div>
                  ))}
                </div>

                {/* Network Topology ASCII */}
                <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(0,0,0,0.4)",marginBottom:12 }}>
                  <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:14 }}>NETWORK TOPOLOGY — ZONE MAP</div>
                  <pre style={{ fontSize:10,color:"#00ff9d",fontFamily:"'JetBrains Mono',monospace",lineHeight:1.6,margin:0,opacity:0.8,overflow:"auto" }}>{`
  INTERNET
     │
     ▼
┌──────────────────┐
│  CLOUDFLARE      │  Tunnel · WAF · DDoS · Access
│  Tunnel 2025.4   │  guardquote / soc / heirloom
└────────┬─────────┘
         │ HTTPS/443
         ▼
┌──────────────────┐
│    PA-220        │  NGFW · 4 DMZ Zones
│  PAN-OS 11.x    │  Cross-zone via Tailscale
└──┬───┬───┬───┬──┘
   │   │   │   │
   ▼   ▼   ▼   ▼
┌─────┐┌─────┐┌──────────┐┌──────────┐
│ DMZ ││SRVR ││   MGMT   ││   LAB    │
│     ││     ││          ││          │
│ pi2 ││ pi1 ││   pi0    ││   rv2    │
└─────┘└─────┘└──────────┘└──────────┘
  │       │         │            │
  ▼       ▼         ▼            ▼
 K3s    Postgres  AdGuard     Suricata
 Wazuh  Grafana   LDAP/NFS   IDS/RISC-V
 ML     Prom/Loki SNMP       75K rules
`}</pre>
                </div>

                {/* IR Checklist + Escalation Matrix */}
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                  {/* IR Checklist — collapsible */}
                  <div style={{ padding:16,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.97)" }}>
                    <div onClick={()=>{setIrChecklistOpen(!irChecklistOpen);SFX.click();}} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",userSelect:"none" }}>
                      <div style={{ fontSize:11,letterSpacing:"3px",color:"#666" }}>INCIDENT RESPONSE CHECKLIST</div>
                      <span style={{ color:"#444",fontSize:12,transition:"transform 0.2s",display:"inline-block",transform:irChecklistOpen?"rotate(90deg)":"rotate(0deg)" }}>▶</span>
                    </div>
                    {irChecklistOpen && (
                      <div style={{ marginTop:14,animation:"fadeSlideIn 0.3s ease both" }}>
                        {IR_CHECKLIST.map((step,i)=>(
                          <div key={i} style={{ display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",fontFamily:"'JetBrains Mono',monospace" }}>
                            <span style={{ fontSize:10,color:"#00ff9d",fontWeight:700,flexShrink:0,width:18,textAlign:"right" }}>{i+1}.</span>
                            <span style={{ fontSize:11,color:"#999",lineHeight:1.5 }}>{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Escalation Matrix */}
                  <div style={{ padding:16,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.97)" }}>
                    <div style={{ fontSize:11,letterSpacing:"3px",color:"#666",marginBottom:14 }}>ESCALATION MATRIX</div>
                    {ESCALATION_MATRIX.map((esc,i)=>(
                      <div key={i} onMouseEnter={()=>SFX.hover()} style={{ padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",fontFamily:"'JetBrains Mono',monospace",cursor:"default" }}>
                        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4 }}>
                          <span style={{ fontSize:12,color:"#ff8833",fontWeight:700 }}>{esc.level}</span>
                          <span style={{ fontSize:10,color:"#dd44ff",padding:"1px 6px",border:"1px solid rgba(221,68,255,0.25)",background:"rgba(221,68,255,0.04)" }}>SLA: {esc.sla}</span>
                        </div>
                        <div style={{ fontSize:10,color:"#777",marginBottom:2 }}>Trigger: {esc.trigger}</div>
                        <div style={{ fontSize:10,color:"#555" }}>Action: {esc.action}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop:28,paddingTop:14,borderTop:"1px solid rgba(255,255,255,0.03)",textAlign:"center" }}>
              <div style={{ fontSize:10,letterSpacing:"5px",color:"#222" }}>GUARDQUOTE SOC · VANDINE.US · WAZUH 4.14.3 · SURICATA · PA-220</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ GLOBAL STYLES ══════════════════════════════════════ */}
      <style>{`
        /* KEYFRAMES */
        @keyframes pulseDot{0%,100%{opacity:0.55;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes bootLine{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes rippleExp{to{transform:scale(46);opacity:0}}
        @keyframes critPulse{0%,100%{opacity:0.2}50%{opacity:0.9}}
        @keyframes sevBlink{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanAcross{0%{left:-100%;opacity:0}20%{opacity:1}80%{opacity:1}100%{left:200%;opacity:0}}

        /* GLITCH TEXT — pure CSS, zero JS */
        .glitch-text{position:relative;color:inherit;}
        .glitch-text::before,.glitch-text::after{content:attr(data-text);position:absolute;inset:0;opacity:0;}
        .glitch-text:hover::before{opacity:0.8;color:#ff003c;animation:glitchA 0.3s steps(2) forwards;clip-path:polygon(0 20%,100% 20%,100% 40%,0 40%);}
        .glitch-text:hover::after{opacity:0.8;color:#00ffea;animation:glitchB 0.3s steps(2) forwards;clip-path:polygon(0 60%,100% 60%,100% 80%,0 80%);}
        @keyframes glitchA{0%{transform:translateX(-3px)}50%{transform:translateX(3px)}100%{transform:translateX(-1px)}}
        @keyframes glitchB{0%{transform:translateX(3px)}50%{transform:translateX(-3px)}100%{transform:translateX(1px)}}

        /* STAT CARD hover — CSS only, no JS state */
        .stat-card:hover{border-color:rgba(0,255,157,0.25) !important;background:rgba(0,20,8,0.9) !important;}
        .stat-card:hover .corner-tl,.stat-card:hover .corner-br{opacity:1 !important;width:22px !important;height:22px !important;}
        .stat-card:hover .scan-line{opacity:1 !important;animation:scanAcross 1.4s linear infinite !important;}
        .stat-card:hover .stat-value{transform:scale(1.05);}

        /* CHART CARD hover */
        .chart-card:hover{border-color:rgba(0,255,157,0.22) !important;}
        .chart-card:hover .chart-topline{opacity:0.75 !important;}

        /* NAV hover */
        .nav-item:hover{color:#aaa !important;background:rgba(255,255,255,0.02) !important;border-left-color:#333 !important;}
        .nav-active{color:#00ff9d !important;background:rgba(0,255,157,0.04) !important;}

        /* AGENT ROW hover */
        .agent-row:hover{background:rgba(0,30,12,0.6) !important;border-left-color:rgba(0,255,157,0.5) !important;}
        .agent-row:hover div:first-child div:last-child div:first-child{color:#eee !important;}

        /* ML CARD hover */
        .ml-card:hover{border-color:rgba(255,255,255,0.2) !important;}
        .ml-card:hover .ml-topline{opacity:0.65 !important;}
        .ml-card:hover .ml-pct{opacity:0.9 !important;}

        /* THREAT BAR hover */
        .threat-bar-wrap:hover .bar-label{color:#ddd !important;}

        /* STACK hover */
        .stack-item:hover .stack-label{color:#ccc !important;}
        .stack-item:hover .stack-ver{color:#666 !important;}

        /* ALERT ROW hover + selected */
        .alert-row:hover{background:rgba(0,20,8,0.4);}
        .alert-row-selected{background:rgba(0,20,8,0.3) !important;}
        .alert-row-selected:hover{background:rgba(0,20,8,0.5) !important;}

        /* DETAIL SECTIONS */
        .detail-section{padding:20px;border-bottom:1px solid rgba(255,255,255,0.04);}

        /* RELATED EVENT BADGES */
        .related-badge:hover{background:rgba(0,255,157,0.15) !important;border-color:rgba(0,255,157,0.5) !important;color:#00ff9d !important;}

        /* ACTION STEPS */
        .action-step:hover{background:rgba(255,255,255,0.02);}

        /* SOURCE BADGE COLORS */
        .source-wazuh{color:#3399ff !important;}
        .source-suricata{color:#ff8833 !important;}
        .source-cloudflare-waf{color:#ff9933 !important;}
        .source-ml-engine{color:#dd44ff !important;}

        /* DONUT SEGMENT */
        .donut-segment{transition:opacity 0.2s ease,filter 0.2s ease;cursor:pointer;}

        /* DOC CARD hover */
        .doc-card:hover{border-color:rgba(0,255,157,0.3) !important;}

        /* SCROLLBAR */
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(0,255,157,0.12);border-radius:2px;}
        ::-webkit-scrollbar-thumb:hover{background:rgba(0,255,157,0.3);}
        html,body{background:#020305;}
      `}</style>
    </>
  );
}


