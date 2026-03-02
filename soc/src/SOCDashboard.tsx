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
const ANON_PHRASES = ["WE ARE ANONYMOUS","WE ARE LEGION","WE DO NOT FORGIVE","WE DO NOT FORGET","EXPECT US"];
const PHRASE = "We are Anonymous. We are Legion. We do not forgive. We do not forget. Expect us. ";
const BOOT_LINES = [
  { text:"INITIALIZING WAZUH SOC COMMAND CENTER v4.7.1...", beep:880 },
  { text:"Loading kernel modules: [suricata] [wazuh-agent] [elastic] [grafana]", beep:660 },
  { text:"Establishing Tailscale mesh VPN... CONNECTED (47 nodes)", beep:770 },
  { text:"K3s cluster health check... 3/3 nodes READY", beep:550 },
  { text:"Mounting encrypted volumes... OK", beep:440 },
  { text:"ML engine warmup (GradientBoost R²=0.93)... READY", beep:660 },
  { text:"OpenLDAP bind: isaiah@soc.local... AUTHENTICATED", beep:880 },
  { text:"Cloudflare WAF sync... RULES UPDATED (rule_set: 2024-Q4)", beep:550 },
  { text:"Suricata IDS ruleset v7.0.5... 47,291 rules loaded", beep:440 },
  { text:"ElasticSearch cluster: GREEN (3 shards, 0 unassigned)", beep:660 },
  { text:"Wazuh Manager: 47 agents reporting...", beep:770 },
  { text:"gRPC FastAPI ML engine: ONLINE (port 50051)", beep:880 },
  { text:"Zone segmentation: 4 firewall zones ACTIVE", beep:550 },
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
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"#000",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",opacity:fade?0:1,transition:"opacity 0.7s ease",fontFamily:"'Courier New',monospace",willChange:"opacity" }}>
      <HexGrid opacity={0.07} />
      <div style={{ position:"relative",zIndex:10,width:"100%",maxWidth:700,padding:"0 36px" }}>
        <div style={{ textAlign:"center",marginBottom:36 }}>
          <div style={{ fontSize:10,letterSpacing:"7px",color:"#2a2a2a",marginBottom:10 }}>ANON-NET // DEFENSIVE OPERATIONS</div>
          <div style={{ fontSize:22,fontWeight:900,letterSpacing:"5px",color:"#00ff9d",textShadow:"0 0 20px rgba(0,255,157,0.6)" }}>WAZUH SOC COMMAND CENTER</div>
        </div>
        <div style={{ borderLeft:"2px solid rgba(0,255,157,0.35)",paddingLeft:22,minHeight:340 }}>
          {lines.map((l,i) => (
            <div key={i} style={{
              fontSize:12,lineHeight:"1.9",
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
    const fs=6.5; ctx.font=`${fs}px 'Courier New'`;
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
    <span className={`glitch-text ${className}`} data-text={text} style={{ ...style, display:"inline-block", fontFamily:"'Courier New',monospace" }}>
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
      style={{ padding:22,border:`1px solid rgba(255,255,255,0.07)`,background:"rgba(4,10,6,0.85)",backdropFilter:"blur(12px)",cursor:"pointer","--card-color":color,willChange:"transform" }}
      as="div">
      {/* Corner brackets — CSS hover */}
      <div className="corner-tl" style={{ position:"absolute",top:0,left:0,width:14,height:14,borderTop:`2px solid ${color}`,borderLeft:`2px solid ${color}`,opacity:0.3,transition:"opacity 0.3s,width 0.3s,height 0.3s" }}/>
      <div className="corner-br" style={{ position:"absolute",bottom:0,right:0,width:14,height:14,borderBottom:`2px solid ${color}`,borderRight:`2px solid ${color}`,opacity:0.3,transition:"opacity 0.3s,width 0.3s,height 0.3s" }}/>
      {crit && <div style={{ position:"absolute",inset:0,boxShadow:`inset 0 0 28px ${color}14`,animation:"critPulse 2s ease-in-out infinite",pointerEvents:"none" }}/>}
      <div className="scan-line" style={{ position:"absolute",top:0,left:"-100%",right:0,height:1,background:`linear-gradient(90deg,transparent,${color},transparent)`,opacity:0,transition:"opacity 0.3s" }}/>
      <div style={{ fontSize:10,letterSpacing:"3px",color:"#888",marginBottom:10,textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontSize:36,fontWeight:900,color,lineHeight:1,textShadow:`0 0 32px ${color}45`,fontFamily:"'Courier New',monospace",transition:"transform 0.2s ease" }} className="stat-value">
        {display}
      </div>
      {sub && <div style={{ fontSize:11,color:"#666",marginTop:8,letterSpacing:"1px" }}>{sub}</div>}
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
   THREAT RADAR — throttled RAF, no state updates during animation
═══════════════════════════════════════════════════════════════ */
function ThreatRadar() {
  const cRef = useRef(null);
  const stateRef = useRef({ angle: 0, blips: [], lastPing: 0 });

  useEffect(() => {
    const c = cRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.offsetWidth*2; c.height = c.offsetHeight*2;
    const W=c.width,H=c.height,cx=W/2,cy=H/2,r=Math.min(W,H)*0.41;
    const st = stateRef.current;
    st.blips = [
      {ax:cx+r*0.3,ay:cy-r*0.4,col:"#ff003c",age:0},
      {ax:cx-r*0.5,ay:cy+r*0.2,col:"#ff003c",age:40},
      {ax:cx+r*0.6,ay:cy+r*0.3,col:"#ff6600",age:20},
      {ax:cx-r*0.2,ay:cy-r*0.6,col:"#ff6600",age:60},
      {ax:cx+r*0.1,ay:cy+r*0.55,col:"#ffcc00",age:10},
      {ax:cx-r*0.4,ay:cy-r*0.2,col:"#ffcc00",age:80},
      {ax:cx+r*0.7,ay:cy-r*0.1,col:"#0099ff",age:30},
      {ax:cx-r*0.6,ay:cy+r*0.5,col:"#cc00ff",age:50},
    ];
    let raf, lastTs = 0;
    const TARGET_FPS = 30, INTERVAL = 1000/TARGET_FPS; // Throttle to 30fps

    const draw = (ts) => {
      raf = requestAnimationFrame(draw);
      if (ts - lastTs < INTERVAL) return;
      lastTs = ts;
      ctx.clearRect(0,0,W,H);
      // Rings
      for(let i=1;i<=4;i++){
        ctx.beginPath();ctx.arc(cx,cy,r*i/4,0,Math.PI*2);
        ctx.strokeStyle="rgba(0,255,157,0.08)";ctx.lineWidth=1;ctx.stroke();
      }
      // Cross
      ctx.strokeStyle="rgba(0,255,157,0.06)";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(cx-r,cy);ctx.lineTo(cx+r,cy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx,cy+r);ctx.stroke();
      // Ring labels
      ctx.fillStyle="rgba(0,255,157,0.2)"; ctx.font=`${W*0.02}px 'Courier New'`;
      ctx.fillText("0°",cx+r+5,cy+5);ctx.fillText("90°",cx-5,cy-r-6);
      ctx.fillText("180°",cx-r-26,cy+5);ctx.fillText("270°",cx-10,cy+r+14);
      // Sweep
      st.angle = (st.angle + 0.022) % (Math.PI*2);
      ctx.save();ctx.translate(cx,cy);ctx.rotate(st.angle);
      const sw = ctx.createLinearGradient(0,0,r,0);
      sw.addColorStop(0,"rgba(0,255,157,0.45)"); sw.addColorStop(1,"rgba(0,255,157,0)");
      ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r,-0.55,0);ctx.fillStyle=sw;ctx.fill();
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r,0);
      ctx.strokeStyle="rgba(0,255,157,0.75)";ctx.lineWidth=2;ctx.shadowColor="#00ff9d";ctx.shadowBlur=8;ctx.stroke();
      ctx.restore();
      ctx.shadowBlur=0;
      // Blips
      st.blips.forEach(b=>{
        b.age+=0.8;
        const pulse=Math.sin(b.age*0.06)*0.5+0.5;
        ctx.beginPath();ctx.arc(b.ax,b.ay,5+pulse*4,0,Math.PI*2);
        ctx.fillStyle=b.col+"70";ctx.shadowColor=b.col;ctx.shadowBlur=14;ctx.fill();
        ctx.beginPath();ctx.arc(b.ax,b.ay,2.5,0,Math.PI*2);
        ctx.fillStyle=b.col;ctx.fill();
      });
      ctx.shadowBlur=0;
      // Periodic ping sound
      if (ts - st.lastPing > 4200) { st.lastPing = ts; SFX.radarPing(); }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  },[]);
  return <canvas ref={cRef} style={{ width:"100%",height:"100%",display:"block" }}/>;
}

/* ═══════════════════════════════════════════════════════════════
   LIVE TICKER
═══════════════════════════════════════════════════════════════ */
const EVENTS = [
  {sev:"CRITICAL",msg:"Privilege escalation — PID:4821 www-data → root [BLOCKED]",color:"#ff4466"},
  {sev:"ALERT",msg:"Brute force src:185.220.101.47 → 10.0.0.1 — 349 attempts [RATE-LIMITED]",color:"#ff8833"},
  {sev:"WARN",msg:"Suspicious DNS — beacon.c2.onion.to [ML:HIGH_RISK → SINKHOLED]",color:"#ffdd44"},
  {sev:"INFO",msg:"Agent connected — node-07.k3s.tailnet [ARM64/RPi5 16GB] HEALTHY",color:"#33ffaa"},
  {sev:"ALERT",msg:"SQL injection — Cloudflare WAF Rule 100514 [DROPPED] src:34.102.88.1",color:"#ff8833"},
  {sev:"WARN",msg:"Anomalous outbound 10.0.0.55:443 → 94.102.61.7 [RF:81% HIGH_RISK]",color:"#ffdd44"},
  {sev:"CRITICAL",msg:"Memory injection — svchost.exe PID:892 [QUARANTINED]",color:"#ff4466"},
  {sev:"INFO",msg:"Suricata ET SCAN — port 22 sweep from 192.168.1.99 [LOGGED]",color:"#33ffaa"},
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
    <div style={{ display:"flex",alignItems:"center",gap:10,height:"100%",opacity:show?1:0,transition:"opacity 0.28s",fontFamily:"'Courier New',monospace",fontSize:11 }}>
      <span style={{ padding:"2px 8px",fontWeight:700,letterSpacing:2,fontSize:10,border:`1px solid ${ev.color}55`,color:ev.color,background:`${ev.color}18`,flexShrink:0,textShadow:`0 0 8px ${ev.color}`,animation:ev.sev==="CRITICAL"?"sevBlink 0.9s step-end infinite":"none" }}>{ev.sev}</span>
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
      style={{ width:"100%",textAlign:"left",padding:"10px 18px",fontSize:11,letterSpacing:"2.5px",border:"none",outline:"none",fontFamily:"'Courier New',monospace",cursor:"pointer",transition:"all 0.2s ease",display:"flex",alignItems:"center",justifyContent:"space-between",background:"transparent",
        color:active?"#00ff9d":"#555",
        borderLeft:`2px solid ${active?"#00ff9d":"transparent"}`,
        textShadow:active?"0 0 10px rgba(0,255,157,0.4)":"none",
      }}>
      <span>{label}</span>
      {badge && <span style={{ fontSize:9,padding:"1px 6px",background:"rgba(255,60,80,0.15)",color:"#ff4466",border:"1px solid rgba(255,60,80,0.3)",letterSpacing:0 }}>{badge}</span>}
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
      style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",marginBottom:1,cursor:"pointer",opacity:vis?1:0,transform:vis?"translateX(0)":"translateX(-16px)",transition:"all 0.35s ease,opacity 0.35s ease,transform 0.35s ease",fontFamily:"'Courier New',monospace","--agent-color":col }}>
      <div style={{ display:"flex",alignItems:"center",gap:11 }}>
        <div style={{ width:7,height:7,borderRadius:"50%",background:col,boxShadow:`0 0 6px ${col}`,animation:agent.status==="ACTIVE"?"pulseDot 2.2s ease-in-out infinite":"none",flexShrink:0,transition:"box-shadow 0.2s" }}/>
        <div>
          <div style={{ fontSize:11,color:"#ccc",lineHeight:1.4 }}>{agent.name}</div>
          <div style={{ fontSize:10,color:"#555",marginTop:2 }}>{agent.ip} · {agent.os}</div>
        </div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:10,color:col,letterSpacing:1 }}>{agent.status}</div>
        <div style={{ fontSize:10,color:"#333",marginTop:2 }}>+{agent.last}</div>
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
        <span style={{ fontSize:11,color:"#888",fontFamily:"'Courier New',monospace",transition:"color 0.2s" }} className="bar-label">{label}</span>
        <span style={{ fontSize:11,color,fontWeight:"bold",fontFamily:"'Courier New',monospace",textShadow:`0 0 8px ${color}60` }}>{value}</span>
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
      className="chart-card" style={{ padding:20,border:`1px solid rgba(255,255,255,0.06)`,background:"rgba(4,10,6,0.85)",backdropFilter:"blur(12px)",position:"relative",overflow:"hidden",willChange:"transform","--c":color }}>
      <div className="chart-topline" style={{ position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${color}70,transparent)`,opacity:0.25,transition:"opacity 0.3s" }}/>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16 }}>
        <div>
          <div style={{ fontSize:10,letterSpacing:"3px",color:"#777",marginBottom:6,fontFamily:"'Courier New',monospace" }}>{title}</div>
          <div style={{ fontSize:28,fontWeight:900,color,textShadow:`0 0 24px ${color}45`,fontFamily:"'Courier New',monospace",lineHeight:1 }}>{value}<span style={{ fontSize:12,marginLeft:4,opacity:0.7 }}>{unit}</span></div>
        </div>
        {badge && <span style={{ fontSize:10,padding:"2px 8px",letterSpacing:1.5,border:`1px solid ${badgeColor}45`,color:badgeColor,background:`${badgeColor}12`,fontFamily:"'Courier New',monospace" }}>{badge}</span>}
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
      <div style={{ position:"absolute",top:10,right:12,fontSize:18,fontWeight:900,color,opacity:0.25,transition:"opacity 0.2s",fontFamily:"'Courier New',monospace" }} className="ml-pct">{Math.round(score*100)}%</div>
      <div style={{ fontSize:11,fontWeight:700,color,letterSpacing:2,marginBottom:4,fontFamily:"'Courier New',monospace" }}>{risk}</div>
      <div style={{ fontSize:11,color:"#aaa",marginBottom:10,fontFamily:"'Courier New',monospace" }}>{host}</div>
      <div style={{ height:2,background:"rgba(255,255,255,0.05)",marginBottom:8 }}>
        <div style={{ width:`${score*100}%`,height:"100%",background:color,boxShadow:`0 0 8px ${color}`,transition:"width 0.9s ease" }}/>
      </div>
      <div style={{ fontSize:11,color:"#777",fontFamily:"'Courier New',monospace",lineHeight:1.5 }}>{reason}</div>
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
    <div style={{ fontFamily:"'Courier New',monospace",textAlign:"right" }}>
      <div style={{ fontSize:14,letterSpacing:2,color:"#00ff9d",textShadow:"0 0 10px rgba(0,255,157,0.4)" }}>{t.toTimeString().slice(0,8)} <span style={{ color:"#444",fontSize:9 }}>UTC</span></div>
      <div style={{ fontSize:10,color:"#444",letterSpacing:1 }}>{t.toISOString().slice(0,10)}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STACK STATUS
═══════════════════════════════════════════════════════════════ */
const STACK=[
  {n:"Wazuh SIEM",s:true,v:"4.7.1"},{n:"Suricata IDS",s:true,v:"7.0.5"},
  {n:"ElasticSearch",s:true,v:"8.12"},{n:"Grafana",s:true,v:"10.3"},
  {n:"K3s Cluster",s:true,v:"1.28"},{n:"Tailscale VPN",s:true,v:"1.58"},
  {n:"ML FastAPI",s:true,v:"0.4.1"},{n:"OpenLDAP",s:true,v:"2.6"},
  {n:"Cloudflare WAF",s:true,v:"CF-2024"},
];

function StackItem({ item, delay }) {
  const [vis,setVis]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setVis(true),delay);return()=>clearTimeout(t);},[delay]);
  const col=item.s?"#00ff9d":"#ff4466";
  return (
    <div onMouseEnter={()=>SFX.hover()} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 0",fontFamily:"'Courier New',monospace",opacity:vis?1:0,transition:"opacity 0.3s ease" }} className="stack-item">
      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
        <div style={{ width:5,height:5,borderRadius:"50%",background:col,boxShadow:`0 0 5px ${col}`,animation:item.s?"pulseDot 2.5s ease-in-out infinite":"none" }}/>
        <span style={{ fontSize:10,color:"#777" }} className="stack-label">{item.n}</span>
      </div>
      <span style={{ fontSize:9,color:"#444" }} className="stack-ver">{item.v}</span>
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
      style={{ padding:"4px 10px",fontSize:10,letterSpacing:2,fontFamily:"'Courier New',monospace",background:muted?"rgba(255,60,80,0.08)":"rgba(0,255,157,0.06)",border:`1px solid ${muted?"rgba(255,60,80,0.3)":"rgba(0,255,157,0.2)"}`,color:muted?"#ff4466":"#00ff9d",cursor:"pointer",transition:"all 0.2s" }}>
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
  {name:"wazuh-master.soc",ip:"10.0.0.10",status:"ACTIVE",os:"Ubuntu 22.04 LTS",last:"0s"},
  {name:"k3s-worker-01.soc",ip:"10.0.0.11",status:"ACTIVE",os:"ARM64 / RPi5 16GB",last:"2s"},
  {name:"win-server-2022.soc",ip:"10.0.0.20",status:"ACTIVE",os:"Windows Server 2022",last:"1s"},
  {name:"kali-red.soc",ip:"10.0.0.50",status:"ACTIVE",os:"Kali Linux 2024.1",last:"5s"},
  {name:"ngfw-opnsense.soc",ip:"10.0.0.1",status:"ACTIVE",os:"OPNsense 24.1",last:"3s"},
  {name:"rpi-sensor-edge.soc",ip:"10.0.0.99",status:"WARN",os:"Raspbian 12 Bookworm",last:"47s"},
  {name:"elastic-node-02.soc",ip:"10.0.0.12",status:"ACTIVE",os:"Ubuntu 22.04 LTS",last:"1s"},
  {name:"grafana-loki.soc",ip:"10.0.0.15",status:"ACTIVE",os:"Docker / Alpine 3.19",last:"4s"},
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
  {host:"10.0.0.47",risk:"CRITICAL",score:0.94,reason:"Unusual auth pattern + lateral movement indicators"},
  {host:"185.220.101.47",risk:"HIGH",score:0.81,reason:"Known Tor exit node — sustained brute force campaign"},
  {host:"10.0.0.99",risk:"MEDIUM",score:0.61,reason:"Abnormal DNS query frequency + timing anomaly"},
  {host:"94.102.61.7",risk:"HIGH",score:0.78,reason:"C2 beacon correlation (GradientBoost R²=0.93)"},
];

/* ═══════════════════════════════════════════════════════════════
   CUSTOM CURSOR — direct DOM, zero re-renders
═══════════════════════════════════════════════════════════════ */
function CustomCursor() {
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  useEffect(() => {
    let raf, tx=-100, ty=-100;
    let rx=-100, ry=-100;
    const move = (e) => { tx=e.clientX; ty=e.clientY; };
    window.addEventListener("mousemove", move, { passive:true });
    const tick = () => {
      raf=requestAnimationFrame(tick);
      // Dot snaps, ring lerps
      rx += (tx - rx) * 0.18;
      ry += (ty - ry) * 0.18;
      if(dotRef.current) dotRef.current.style.transform = `translate(${tx-2}px,${ty-2}px)`;
      if(ringRef.current) ringRef.current.style.transform = `translate(${rx-10}px,${ry-10}px)`;
    };
    raf=requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("mousemove",move); };
  },[]);
  return (
    <>
      <div ref={ringRef} style={{ position:"fixed",top:0,left:0,zIndex:9998,pointerEvents:"none",width:20,height:20,border:"1px solid rgba(0,255,157,0.6)",borderRadius:"50%",boxShadow:"0 0 8px rgba(0,255,157,0.25)",mixBlendMode:"screen",willChange:"transform" }}/>
      <div ref={dotRef} style={{ position:"fixed",top:0,left:0,zIndex:9999,pointerEvents:"none",width:4,height:4,borderRadius:"50%",background:"#00ff9d",boxShadow:"0 0 6px #00ff9d",willChange:"transform" }}/>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════════════ */
export default function SOCDashboard() {
  const [booted,setBooted]=useState(false);
  const [tab,setTab]=useState("overview");
  const [phraseIdx,setPhraseIdx]=useState(0);

  useEffect(()=>{const iv=setInterval(()=>setPhraseIdx(i=>(i+1)%ANON_PHRASES.length),3800);return()=>clearInterval(iv);},[]);

  return (
    <>
      <CustomCursor />
      {!booted && <BootSequence onDone={()=>setBooted(true)}/>}

      <div style={{ minHeight:"100vh",background:"#020305",fontFamily:"'Courier New',monospace",cursor:"none",opacity:booted?1:0,transition:"opacity 0.8s ease" }}>
        <HexGrid opacity={0.04}/>
        {/* CRT scanlines */}
        <div style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:40,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.05) 2px,rgba(0,0,0,0.05) 4px)" }}/>
        {/* Vignette */}
        <div style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:39,background:"radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.72) 100%)" }}/>

        {/* ── TOPBAR ── */}
        <div style={{ position:"relative",zIndex:50,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",height:52,borderBottom:"1px solid rgba(0,255,157,0.08)",background:"rgba(2,3,5,0.96)",backdropFilter:"blur(24px)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ width:8,height:8,borderRadius:"50%",background:"#00ff9d",boxShadow:"0 0 12px #00ff9d",animation:"pulseDot 1.5s ease-in-out infinite" }}/>
              <GlitchText text="SOC // COMMAND" style={{ fontSize:14,fontWeight:900,letterSpacing:"4px",color:"#00ff9d" }}/>
            </div>
            <div style={{ width:1,height:18,background:"rgba(255,255,255,0.07)" }}/>
            <span style={{ fontSize:10,color:"#444",letterSpacing:"2px" }}>WAZUH 4.7.1 · CLEARANCE:ALPHA · ISAIAH@SOC.LOCAL</span>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:11,letterSpacing:"5px",fontWeight:700,color:"#ff4466",textShadow:"0 0 14px rgba(255,60,80,0.55)",animation:"sevBlink 3.5s ease-in-out infinite" }}>{ANON_PHRASES[phraseIdx]}</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <MuteBtn/>
            <Clock/>
          </div>
        </div>

        {/* ── TICKER ── */}
        <div style={{ position:"relative",zIndex:50,height:34,borderBottom:"1px solid rgba(255,255,255,0.03)",background:"rgba(2,3,5,0.9)",padding:"0 24px",display:"flex",alignItems:"center",gap:12 }}>
          <span style={{ fontSize:9,padding:"2px 7px",fontWeight:700,letterSpacing:2,color:"#ff4466",border:"1px solid rgba(255,60,80,0.4)",background:"rgba(255,60,80,0.08)",animation:"sevBlink 0.9s step-end infinite",flexShrink:0 }}>LIVE</span>
          <div style={{ flex:1,overflow:"hidden" }}><LiveTicker/></div>
          <span style={{ fontSize:9,color:"#333",letterSpacing:2,flexShrink:0 }}>47 AGENTS · 3,841 EPS</span>
        </div>

        {/* ── BODY ── */}
        <div style={{ position:"relative",zIndex:20,display:"flex",height:"calc(100vh - 86px)" }}>

          {/* SIDEBAR */}
          <div style={{ width:220,flexShrink:0,borderRight:"1px solid rgba(0,255,157,0.05)",background:"rgba(2,3,5,0.88)",backdropFilter:"blur(16px)",display:"flex",flexDirection:"column",overflowY:"auto" }}>
            <div style={{ height:200,position:"relative",overflow:"hidden",flexShrink:0 }}>
              <TextPortrait/>
              <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 50%,#020305 100%)" }}/>
              <div style={{ position:"absolute",bottom:8,left:0,right:0,textAlign:"center",fontSize:8,letterSpacing:"5px",color:"rgba(255,255,255,0.18)" }}>WE ARE ANONYMOUS</div>
            </div>
            <div style={{ padding:"6px 0" }}>
              {[
                {id:"overview",label:"// OVERVIEW"},
                {id:"alerts",label:"// ALERT FEED",badge:"247"},
                {id:"agents",label:"// AGENTS"},
                {id:"threats",label:"// THREAT INTEL"},
                {id:"ml",label:"// ML ENGINE"},
                {id:"radar",label:"// RADAR VIEW"},
              ].map(item=><NavItem key={item.id} {...item} active={tab===item.id} onClick={setTab}/>)}
            </div>
            <div style={{ padding:"14px 16px",borderTop:"1px solid rgba(255,255,255,0.03)",marginTop:"auto" }}>
              <div style={{ fontSize:9,letterSpacing:"3px",color:"#333",marginBottom:10 }}>STACK STATUS</div>
              {STACK.map((item,i)=><StackItem key={i} item={item} delay={i*55}/>)}
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div style={{ flex:1,overflowY:"auto",padding:20 }}>

            {tab==="overview" && (
              <div style={{ animation:"fadeSlideIn 0.4s ease both" }}>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20 }}>
                  <StatCard label="ACTIVE ALERTS" value="247" color="#ff4466" crit sub="↑ 18% last hour"/>
                  <StatCard label="EVENTS / SEC" value="3841" color="#ff8833" sub="Wazuh ingestion"/>
                  <StatCard label="AGENTS ONLINE" value="47" color="#00ff9d" sub="8 zones monitored"/>
                  <StatCard label="THREATS BLOCKED" value="1293" color="#3399ff" sub="Cloudflare WAF today"/>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20 }}>
                  <ChartCard title="ALERT VOLUME" value="247" badge="CRITICAL" badgeColor="#ff4466" color="#ff4466" data={alertData}/>
                  <ChartCard title="NETWORK TRAFFIC" value="2.4" unit="GB/s" badge="NORMAL" badgeColor="#3399ff" color="#3399ff" data={netData}/>
                  <ChartCard title="ML ANOMALIES" value="13" badge="RF:81%" badgeColor="#dd44ff" color="#dd44ff" data={mlData}/>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                  <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.85)",backdropFilter:"blur(12px)" }}>
                    <div style={{ fontSize:10,letterSpacing:"3px",color:"#666",marginBottom:16 }}>THREAT CATEGORIES // 24H</div>
                    {THREATS.map((t,i)=><ThreatBar key={i} {...t}/>)}
                  </div>
                  <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.85)",backdropFilter:"blur(12px)" }}>
                    <div style={{ fontSize:10,letterSpacing:"3px",color:"#666",marginBottom:12 }}>AGENT ROSTER</div>
                    {AGENTS.slice(0,6).map((a,i)=><AgentRow key={i} agent={a} delay={i*75}/>)}
                  </div>
                </div>
              </div>
            )}

            {tab==="alerts" && (
              <div style={{ animation:"fadeSlideIn 0.4s ease both" }}>
                <div style={{ padding:20,border:"1px solid rgba(255,60,80,0.08)",background:"rgba(4,8,5,0.85)" }}>
                  <div style={{ fontSize:10,letterSpacing:"3px",color:"#666",marginBottom:16 }}>ALERT FEED — WAZUH + SURICATA + CLOUDFLARE WAF</div>
                  {[...EVENTS,...EVENTS].map((ev,i)=>(
                    <div key={i} className="alert-row" onMouseEnter={()=>SFX.hover()}
                      style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"11px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",fontFamily:"'Courier New',monospace",animation:`fadeSlideIn 0.3s ease ${i*30}ms both`,cursor:"default" }}>
                      <span style={{ padding:"2px 8px",fontSize:9,fontWeight:700,letterSpacing:1.5,flexShrink:0,color:ev.color,border:`1px solid ${ev.color}40`,background:`${ev.color}12`,minWidth:72,textAlign:"center" }}>{ev.sev}</span>
                      <div>
                        <div style={{ fontSize:11,color:"#bbb",lineHeight:1.5 }}>{ev.msg}</div>
                        <div style={{ fontSize:10,color:"#444",marginTop:3 }}>{new Date(Date.now()-i*127000).toISOString().replace("T"," ").slice(0,19)} UTC</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab==="agents" && (
              <div style={{ animation:"fadeSlideIn 0.4s ease both" }}>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16 }}>
                  <StatCard label="TOTAL AGENTS" value="47" color="#00ff9d"/>
                  <StatCard label="ACTIVE" value="46" color="#00ff9d"/>
                  <StatCard label="WARNING" value="1" color="#ff9933"/>
                  <StatCard label="OFFLINE" value="0" color="#555"/>
                </div>
                <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.85)" }}>
                  <div style={{ fontSize:10,letterSpacing:"3px",color:"#666",marginBottom:14 }}>ALL NODES — {AGENTS.length} REGISTERED</div>
                  {AGENTS.map((a,i)=><AgentRow key={i} agent={a} delay={i*65}/>)}
                </div>
              </div>
            )}

            {tab==="threats" && (
              <div style={{ animation:"fadeSlideIn 0.4s ease both" }}>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                  <div style={{ padding:20,border:"1px solid rgba(255,60,80,0.1)",background:"rgba(255,60,80,0.02)" }}>
                    <div style={{ fontSize:10,letterSpacing:"3px",color:"#666",marginBottom:16 }}>THREAT DISTRIBUTION</div>
                    {THREATS.map((t,i)=><ThreatBar key={i} {...t}/>)}
                  </div>
                  <div style={{ padding:20,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.85)" }}>
                    <div style={{ fontSize:10,letterSpacing:"3px",color:"#666",marginBottom:16 }}>TOP SOURCE IPs</div>
                    {[
                      {ip:"185.220.101.47",country:"RU",hits:349,color:"#ff4466"},
                      {ip:"94.102.61.7",country:"NL",hits:201,color:"#ff8833"},
                      {ip:"34.102.88.1",country:"US",hits:156,color:"#ff8833"},
                      {ip:"192.168.1.99",country:"LAN",hits:89,color:"#ffdd44"},
                      {ip:"10.0.0.47",country:"INT",hits:47,color:"#ffdd44"},
                    ].map((item,i)=>(
                      <div key={i} onMouseEnter={()=>SFX.hover()} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",fontFamily:"'Courier New',monospace",fontSize:11 }}>
                        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                          <div style={{ width:4,height:4,borderRadius:"50%",background:item.color,boxShadow:`0 0 6px ${item.color}` }}/>
                          <span style={{ color:"#ccc" }}>{item.ip}</span>
                          <span style={{ color:"#555",fontSize:9,padding:"1px 5px",border:"1px solid rgba(255,255,255,0.1)" }}>{item.country}</span>
                        </div>
                        <span style={{ color:item.color,fontWeight:"bold" }}>{item.hits} hits</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab==="ml" && (
              <div style={{ animation:"fadeSlideIn 0.4s ease both" }}>
                <div style={{ marginBottom:12,padding:16,border:"1px solid rgba(221,68,255,0.12)",background:"rgba(221,68,255,0.015)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:10,letterSpacing:"3px",color:"#666",marginBottom:4 }}>ML ENGINE STATUS</div>
                    <div style={{ fontSize:11,color:"#aa66cc",fontFamily:"'Courier New',monospace" }}>FastAPI · gRPC/Protobuf · GradientBoost R²=0.93 · RandomForest 81% · scikit-learn 1.4</div>
                  </div>
                  <span style={{ padding:"4px 12px",border:"1px solid rgba(0,255,157,0.25)",color:"#00ff9d",fontSize:10,letterSpacing:2,background:"rgba(0,255,157,0.04)" }}>ONLINE</span>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:12 }}>
                  <ChartCard title="ML ANOMALY SCORE / HR" value="13" badge="ACTIVE" badgeColor="#dd44ff" color="#dd44ff" data={mlData}/>
                  <ChartCard title="MODEL CONFIDENCE" value="93" unit="%" badge="GB-BOOST" badgeColor="#3399ff" color="#3399ff" data={netData.map(v=>Math.min(v,100))}/>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12 }}>
                  {ML_RISKS.map((r,i)=><MLRiskCard key={i} {...r}/>)}
                </div>
              </div>
            )}

            {tab==="radar" && (
              <div style={{ animation:"fadeSlideIn 0.4s ease both" }}>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                  <div style={{ padding:20,border:"1px solid rgba(0,255,157,0.07)",background:"rgba(4,8,5,0.85)",backdropFilter:"blur(12px)" }}>
                    <div style={{ fontSize:10,letterSpacing:"3px",color:"#666",marginBottom:10 }}>THREAT RADAR — LIVE SWEEP</div>
                    <div style={{ height:320 }}><ThreatRadar/></div>
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                    {ML_RISKS.map((r,i)=><MLRiskCard key={i} {...r}/>)}
                    <div style={{ padding:16,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(4,8,5,0.85)" }}>
                      <div style={{ fontSize:10,letterSpacing:"3px",color:"#666",marginBottom:12 }}>NETWORK ZONES</div>
                      {[
                        {zone:"DMZ",status:"SECURE",color:"#00ff9d"},
                        {zone:"INTERNAL",status:"ALERT",color:"#ff8833"},
                        {zone:"MGMT",status:"SECURE",color:"#00ff9d"},
                        {zone:"IoT / EDGE",status:"WARN",color:"#ffdd44"},
                      ].map((z,i)=>(
                        <div key={i} onMouseEnter={()=>SFX.hover()} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",fontFamily:"'Courier New',monospace",fontSize:11 }}>
                          <span style={{ color:"#aaa" }}>{z.zone}</span>
                          <span style={{ color:z.color,textShadow:`0 0 8px ${z.color}60` }}>{z.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop:28,paddingTop:14,borderTop:"1px solid rgba(255,255,255,0.03)",textAlign:"center" }}>
              <div style={{ fontSize:9,letterSpacing:"5px",color:"#222" }}>WE ARE ANONYMOUS · WE ARE LEGION · WE DO NOT FORGIVE · WE DO NOT FORGET · EXPECT US</div>
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

        /* ALERT ROW hover */
        .alert-row:hover{background:rgba(0,20,8,0.4);}

        /* SCROLLBAR */
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(0,255,157,0.12);border-radius:2px;}
        ::-webkit-scrollbar-thumb:hover{background:rgba(0,255,157,0.3);}
        html,body{cursor:none !important;background:#020305;}
      `}</style>
    </>
  );
}
