import { useEffect, useRef, useState } from "react";

const STEPS = [
  { label: "Analizando el temario...",          pctEnd: 18  },
  { label: "Seleccionando preguntas...",         pctEnd: 40  },
  { label: "Generando opciones de respuesta...", pctEnd: 62  },
  { label: "Verificando dificultad...",          pctEnd: 82  },
  { label: "Preparando presentación...",         pctEnd: 100 },
];

const LINE_WIDTHS = [80,55,70,90,45,65,85,50,75,60,88,40,72,58,95];
const LINE_COLORS = [
  "#EEEDFE","#AFA9EC","#534AB7","#EEEDFE","#AFA9EC",
  "#534AB7","#EEEDFE","#AFA9EC","#534AB7","#EEEDFE",
  "#AFA9EC","#534AB7","#EEEDFE","#AFA9EC","#534AB7",
];
const RUNG_COUNT = 10;

interface Dust {
  id: number;
  x: number;
  y: number;
  size: number;
  dx: number;
  dy: number;
  delay: number;
  duration: number;
}

interface Props {
  title?: string;
  onComplete?: () => void;
  externalProgress?: number;
  externalStep?: string;
  controlled?: boolean;
}

export default function ExamLoader({ 
  title = "Construyendo tu examen", 
  onComplete,
  externalProgress = 0,
  externalStep = "",
  controlled = false 
}: Props) {
  const [pct, setPct]           = useState(0);
  const [stepIdx, setStepIdx]   = useState(0);
  const [linesShown, setLines]  = useState(0);
  const [rungs, setRungs]       = useState(0);
  const [showW3, setShowW3]     = useState(false);
  const [showW4, setShowW4]     = useState(false);
  const [w3Bottom, setW3Bottom] = useState(110);
  const [dusts, setDusts]       = useState<Dust[]>([]);
  const [done, setDone]         = useState(false);
  const [key, setKey]           = useState(0);

  const dustId  = useRef(0);
  const pctRef  = useRef(0);
  const stepRef = useRef(0);

  function spawnDust(x: number, y: number) {
    const newDusts: Dust[] = Array.from({ length: 5 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 10 + Math.random() * 18;
      return {
        id:       dustId.current++,
        x, y,
        size:     3 + Math.random() * 4,
        dx:       Math.cos(angle) * dist,
        dy:       Math.sin(angle) * dist,
        delay:    Math.random() * 0.2,
        duration: 0.6 + Math.random() * 0.5,
      };
    });
    setDusts(prev => [...prev, ...newDusts]);
    setTimeout(() => {
      setDusts(prev => prev.filter(d => !newDusts.find(n => n.id === d.id)));
    }, 1200);
  }

  function start() {
    pctRef.current  = 0;
    stepRef.current = 0;
    setPct(0);
    setStepIdx(0);
    setLines(0);
    setRungs(0);
    setShowW3(false);
    setShowW4(false);
    setW3Bottom(110);
    setDusts([]);
    setDone(false);
    setKey(k => k + 1);
  }

  useEffect(() => {
    if (controlled) {
      const p = externalProgress;
      setPct(p);
      setRungs(Math.round((p / 100) * RUNG_COUNT));
      setLines(Math.floor((p / 100) * LINE_WIDTHS.length));

      if (p >= 30) setShowW4(true);
      if (p >= 50) setShowW3(true);
      if (p >= 50) setW3Bottom(Math.round(40 + ((p - 50) / 50) * 160));

      for (let i = 0; i < STEPS.length; i++) {
        if (p >= STEPS[i].pctEnd) {
          setStepIdx(Math.min(i + 1, STEPS.length - 1));
        }
      }

      if (p >= 100) {
        setDone(true);
        onComplete?.();
      }
      return;
    }

    pctRef.current  = 0;
    stepRef.current = 0;

    const dustInterval = setInterval(() => {
      spawnDust(18, 285);
      if (pctRef.current > 40) spawnDust(238, 165);
    }, 600);

    const mainInterval = setInterval(() => {
      pctRef.current++;
      const p = pctRef.current;

      setPct(p);
      setRungs(Math.round((p / 100) * RUNG_COUNT));
      setLines(Math.floor((p / 100) * LINE_WIDTHS.length));

      if (p === 30) setShowW4(true);
      if (p === 50) setShowW3(true);
      if (p >= 50)  setW3Bottom(Math.round(40 + ((p - 50) / 50) * 160));

      if (p >= STEPS[stepRef.current].pctEnd) {
        stepRef.current++;
        if (stepRef.current < STEPS.length) {
          setStepIdx(stepRef.current);
        } else {
          clearInterval(mainInterval);
          clearInterval(dustInterval);
          setDone(true);
          onComplete?.();
        }
      }
    }, 55);

    return () => {
      clearInterval(mainInterval);
      clearInterval(dustInterval);
    };
  }, [key, controlled, externalProgress]);

  const ladderH = Math.round((pct / 100) * 260);

  return (
    <div style={{ width: "100%", maxWidth: 500, margin: "0 auto", padding: "2rem", textAlign: "center", fontFamily: "system-ui, sans-serif", background: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" }}>
      <p style={{ fontSize: 17, fontWeight: 500, color: "#1a1a1a", margin: "0 0 0.2rem" }}>{title}</p>
      <p style={{ fontSize: 13, color: "#666", margin: "0 0 1rem" }}>
        {done ? "¡Todo listo!" : (controlled && externalStep ? externalStep : STEPS[Math.min(stepIdx, STEPS.length - 1)].label)}
      </p>

      {/* Paper */}
      <div style={{ position: "relative", width: 260, height: 320, margin: "0 auto 1.2rem", background: "#fff", border: "2px solid #AFA9EC", borderRadius: 6, boxShadow: "2px 4px 16px rgba(83,74,183,0.10)", overflow: "visible" }}>
        <div style={{ overflow: "hidden", borderRadius: 4, width: "100%", height: "100%", position: "relative" }}>

          {/* Header */}
          <div style={{ padding: "10px 14px 7px", borderBottom: "1.5px solid #EEEDFE", display: "flex", alignItems: "center", gap: 6, background: "#EEEDFE" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#AFA9EC" }} />
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#AFA9EC" }} />
            <div style={{ flex: 1, height: 7, background: "#534AB7", borderRadius: 3 }} />
          </div>

          {/* Lines */}
          <div style={{ padding: "10px 14px 60px", display: "flex", flexDirection: "column", gap: 8 }}>
            {LINE_WIDTHS.map((w, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 8, color: "#AFA9EC", width: 10, flexShrink: 0, fontFamily: "monospace" }}>{i + 1}.</span>
                <div style={{
                  height: 6, borderRadius: 3,
                  background: LINE_COLORS[i],
                  width: i <= linesShown ? `${w}%` : "0%",
                  opacity: i <= linesShown ? 1 : 0,
                  transition: "opacity 0.5s, width 0.6s ease",
                }} />
              </div>
            ))}
          </div>

          {/* Dust particles */}
          {dusts.map(d => (
            <div key={d.id} style={{
              position: "absolute",
              width: d.size, height: d.size,
              left: d.x, top: d.y,
              borderRadius: "50%",
              background: "#B4B2A9",
              opacity: 0,
              animation: `examDustfly ${d.duration}s ease-out ${d.delay}s forwards`,
              ["--dx" as string]: `${d.dx}px`,
              ["--dy" as string]: `${d.dy}px`,
              pointerEvents: "none",
            }} />
          ))}
        </div>

        {/* Ladder */}
        <div style={{ position: "absolute", right: -28, bottom: 0, width: 24, height: ladderH, transition: "height 1.2s ease", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "#B4B2A9", borderRadius: 2 }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 3, background: "#B4B2A9", borderRadius: 2 }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-around", padding: "6px 0" }}>
            {Array.from({ length: RUNG_COUNT }, (_, i) => (
              <div key={i} style={{ height: 3, background: "#888780", margin: "0 3px", borderRadius: 1, opacity: i < rungs ? 1 : 0, transition: "opacity 0.3s" }} />
            ))}
          </div>
        </div>

        {/* Worker 1: bottom-left, hammering */}
        <Worker
          style={{ left: 8, bottom: 8, animation: "elHammer 0.4s ease-in-out infinite alternate", transformOrigin: "bottom center" }}
          hatColor="#FAC775" bodyColor="#D85A30"
          tool={<HammerArm />}
          legH={9}
        />

        {/* Worker 2: bottom-right, writing */}
        <Worker
          style={{ right: 18, bottom: 8, animation: "elWrite 0.55s ease-in-out infinite alternate" }}
          hatColor="#FAC775" bodyColor="#534AB7"
          tool={<PencilArm />}
          legH={9}
        />

        {/* Worker 3: on ladder, painting */}
        {showW3 && (
          <Worker
            style={{ right: -22, bottom: w3Bottom, animation: "elPaint 0.7s ease-in-out infinite alternate", transformOrigin: "bottom center" }}
            hatColor="#5DCAA5" bodyColor="#0F6E56"
            tool={<PaintArm />}
            legH={7}
          />
        )}

        {/* Worker 4: upper, carrying */}
        {showW4 && (
          <Worker
            style={{ left: 20, bottom: 130, animation: "elCarry 1s ease-in-out infinite alternate" }}
            hatColor="#F0997B" bodyColor="#993C1D"
            tool={<CarryArm />}
            legH={9}
          />
        )}
      </div>

      {/* Progress bar */}
      <div style={{ maxWidth: 380, margin: "0 auto 0.8rem" }}>
        <div style={{ background: "#f0f0f0", borderRadius: 999, height: 8, border: "0.5px solid #ddd", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 999, background: "#534AB7", width: `${pct}%`, transition: "width 0.3s ease" }} />
        </div>
        <p style={{ fontSize: 12, color: "#666", marginTop: 5 }}>{pct}%</p>
      </div>

      {/* Steps */}
      <ul style={{ listStyle: "none", padding: 0, margin: "0 auto", maxWidth: 380, textAlign: "left" }}>
        {STEPS.map((s, i) => {
          const isDone   = i < stepIdx || done;
          const isActive = i === stepIdx && !done;
          return (
            <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: isActive ? "#1a1a1a" : "#888", padding: "5px 0", borderBottom: i < STEPS.length - 1 ? "0.5px solid #eee" : "none" }}>
              <span style={{
                width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, flexShrink: 0, border: `0.5px solid ${isDone ? "#3B6D11" : isActive ? "#534AB7" : "#ddd"}`,
                background: isDone ? "#EAF3DE" : isActive ? "#EEEDFE" : "#f5f5f5",
                color: isDone ? "#3B6D11" : "inherit",
              }}>
                {isDone ? "✓" : <span style={{ width: 5, height: 5, borderRadius: "50%", background: isActive ? "#534AB7" : "#aaa", animation: isActive ? "elPulse 0.7s infinite" : "none", display: "block" }} />}
              </span>
              {s.label.replace("...", "")}
            </li>
          );
        })}
      </ul>

      {done && (
        <p style={{ fontSize: 14, fontWeight: 500, color: "#3B6D11", marginTop: "0.8rem" }}>
          ¡Examen listo! Los constructores terminaron.
        </p>
      )}
      {done && (
        <button onClick={start} style={{ marginTop: "0.6rem", fontSize: 12, color: "#666", background: "none", border: "0.5px solid #ccc", borderRadius: 8, padding: "5px 14px", cursor: "pointer" }}>
          Construir de nuevo
        </button>
      )}

      <style>{`
        @keyframes elHammer { from{transform:rotate(-7deg)} to{transform:rotate(7deg)} }
        @keyframes elWrite  { from{transform:translateX(-1px) rotate(-3deg)} to{transform:translateX(1px) rotate(3deg)} }
        @keyframes elPaint  { from{transform:rotate(-8deg)} to{transform:rotate(5deg)} }
        @keyframes elCarry  { from{transform:translateY(0)} to{transform:translateY(-4px)} }
        @keyframes elPulse  { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes examDustfly {
          0%   { opacity:0.7; transform:translate(0,0) scale(1); }
          100% { opacity:0;   transform:translate(var(--dx),var(--dy)) scale(0.3); }
        }
      `}</style>
    </div>
  );
}

/* ── Sub-components ─────────────────────────── */

function Worker({ style, hatColor, bodyColor, tool, legH }: {
  style: React.CSSProperties;
  hatColor: string;
  bodyColor: string;
  tool: React.ReactNode;
  legH: number;
}) {
  return (
    <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", ...style }}>
      <div style={{ width: 14, height: 5, background: hatColor, borderRadius: "3px 3px 0 0" }} />
      <div style={{ width: 13, height: 13, background: "#F5C4B3", borderRadius: "50%", border: "1px solid #E09070", marginTop: 1 }} />
      <div style={{ width: 15, height: 13, background: bodyColor, borderRadius: 3, marginTop: 1 }} />
      {tool}
      <div style={{ display: "flex", gap: 3, marginTop: 1 }}>
        <div style={{ width: 5, height: legH, background: "#444441", borderRadius: "0 0 2px 2px" }} />
        <div style={{ width: 5, height: legH, background: "#444441", borderRadius: "0 0 2px 2px" }} />
      </div>
    </div>
  );
}

function HammerArm() {
  return (
    <div style={{ position: "relative", width: 15, height: 4 }}>
      <div style={{ position: "absolute", top: 0, left: 8, width: 18, height: 3, background: "#666", borderRadius: 2, transform: "rotate(30deg)" }} />
      <div style={{ position: "absolute", top: -4, left: 22, width: 6, height: 5, background: "#444", borderRadius: 1, transform: "rotate(30deg)" }} />
    </div>
  );
}

function PencilArm() {
  return (
    <div style={{ position: "relative", width: 15, height: 4 }}>
      <div style={{ position: "absolute", top: -2, left: 5, width: 14, height: 2, background: "#888", borderRadius: 2, transform: "rotate(50deg)" }} />
      <div style={{ position: "absolute", top: 6, left: 13, width: 3, height: 5, background: "#FAC775", borderRadius: "0 0 2px 2px", transform: "rotate(50deg)" }} />
    </div>
  );
}

function PaintArm() {
  return (
    <div style={{ position: "relative", width: 15, height: 4 }}>
      <div style={{ position: "absolute", top: -3, left: -4, width: 18, height: 2, background: "#888", borderRadius: 2, transform: "rotate(-30deg)" }} />
      <div style={{ position: "absolute", top: -8, left: -10, width: 8, height: 6, background: "#AFA9EC", borderRadius: 1, transform: "rotate(-30deg)" }} />
    </div>
  );
}

function CarryArm() {
  return (
    <div style={{ position: "relative", width: 32, height: 6, marginTop: -4, marginLeft: -8 }}>
      <div style={{ width: 32, height: 5, background: "#fff", border: "1px solid #AFA9EC", borderRadius: 1, display: "flex", flexDirection: "column", gap: 1, padding: "1px 2px" }}>
        <div style={{ height: 1, background: "#EEEDFE", borderRadius: 1 }} />
        <div style={{ height: 1, background: "#AFA9EC", borderRadius: 1 }} />
      </div>
    </div>
  );
}