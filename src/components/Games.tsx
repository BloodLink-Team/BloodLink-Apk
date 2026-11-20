import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Droplets, Layers, Trophy } from "lucide-react";
import { useLanguage } from "../i18n";
import { PageSubHeader } from "./SideMenuPages";

const readBest = (key: string): number | null => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
};
const writeBest = (key: string, v: number) => {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    // ignore
  }
};

const RUSH_KEY = "bloodlink_game_rescue_best";
const MATCH_KEY = "bloodlink_game_match_best";

const Note: React.FC = () => {
  const { lang } = useLanguage();
  return (
    <p className="text-[11px] text-slate-400 text-center leading-relaxed">
      {lang === "bn"
        ? "গেমগুলো ইন্টারনেট ছাড়াই চলে। স্কোর শুধু এই ফোনে থাকে। এগুলো শুধু বিনোদনের জন্য, চিকিৎসা পরামর্শ নয়।"
        : "Games work offline. Scores stay on this phone. For entertainment only, not medical advice."}
    </p>
  );
};

export const GamesHomeView: React.FC = () => {
  const { lang, n } = useLanguage();
  const navigate = useNavigate();
  const rush = readBest(RUSH_KEY);
  const match = readBest(MATCH_KEY);

  const Card = ({ icon, title, desc, best, to }: { icon: React.ReactNode; title: string; desc: string; best: string; to: string }) => (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="w-full flex items-center gap-4 p-4 rounded-3xl bg-white border border-slate-200 shadow-sm active:scale-[0.99] text-left"
    >
      <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#c80000] flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-slate-800 text-sm">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
        <p className="text-[11px] font-bold text-red-700 mt-1 flex items-center gap-1">
          <Trophy className="w-3 h-3" /> {best}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <PageSubHeader title={lang === "bn" ? "গেমস" : "Games"} />
      <main className="max-w-md mx-auto p-5 pb-24 space-y-4">
        <Card
          to="/games/rescue-rush"
          icon={<Droplets className="w-6 h-6" />}
          title={lang === "bn" ? "ব্লাড রেসকিউ রাশ" : "BloodLink Rescue Rush"}
          desc={lang === "bn" ? "রক্তের ফোঁটা ধরুন, জীবাণু এড়িয়ে চলুন" : "Catch blood drops, avoid germs"}
          best={
            lang === "bn"
              ? `সেরা স্কোর: ${n(rush ?? 0)}`
              : `Best score: ${rush ?? 0}`
          }
        />
        <Card
          to="/games/blood-match"
          icon={<Layers className="w-6 h-6" />}
          title={lang === "bn" ? "ব্লাড গ্রুপ ম্যাচ" : "Blood Group Match"}
          desc={lang === "bn" ? "একই রক্তের গ্রুপের জোড়া মেলান" : "Find the matching blood group pairs"}
          best={
            lang === "bn"
              ? `সেরা: ${match === null ? "—" : n(match) + " চাল"}`
              : `Best: ${match === null ? "—" : match + " moves"}`
          }
        />
        <Note />
      </main>
    </div>
  );
};

/* ---------------------------------------------------------------- Rescue Rush */

type Obj = { x: number; y: number; r: number; type: "drop" | "germ"; speed: number };

export const RescueRushView: React.FC = () => {
  const { lang, n } = useLanguage();
  const arenaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useRef({
    active: false,
    score: 0,
    lives: 3,
    seconds: 30,
    basketX: 160,
    objs: [] as Obj[],
    last: 0,
    spawn: 0,
    raf: 0,
    clock: 0 as unknown as ReturnType<typeof setInterval>,
    ratio: 1,
    left: false,
    right: false,
  });
  const [hud, setHud] = useState({ score: 0, lives: 3, seconds: 30 });
  const [state, setState] = useState<"idle" | "playing" | "over">("idle");
  const [best, setBest] = useState<number>(() => readBest(RUSH_KEY) ?? 0);
  const [newBest, setNewBest] = useState(false);
  const H = 250;

  const width = () => (canvasRef.current ? canvasRef.current.width / g.current.ratio : 320);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const s = g.current;
    const w = c.width / s.ratio;
    const rrect = (x: number, y: number, ww: number, hh: number, r: number) => {
      ctx.beginPath();
      if ((ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect) {
        (ctx as CanvasRenderingContext2D).roundRect(x, y, ww, hh, r);
      } else {
        ctx.rect(x, y, ww, hh);
      }
    };
    ctx.clearRect(0, 0, w, H);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#f3f6fb");
    grad.addColorStop(1, "#ffffff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, H);
    ctx.strokeStyle = "#e4e9f1";
    ctx.lineWidth = 1;
    for (let y = 26; y < H; y += 34) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (const o of s.objs) {
      ctx.save();
      ctx.translate(o.x, o.y);
      if (o.type === "drop") {
        ctx.fillStyle = "#c90012";
        ctx.beginPath();
        ctx.moveTo(0, -o.r);
        ctx.bezierCurveTo(o.r * 0.85, -o.r * 0.1, o.r, o.r * 0.45, 0, o.r);
        ctx.bezierCurveTo(-o.r, o.r * 0.45, -o.r * 0.85, -o.r * 0.1, 0, -o.r);
        ctx.fill();
        ctx.fillStyle = "#ff9aa4";
        ctx.beginPath();
        ctx.arc(-o.r * 0.25, -o.r * 0.1, Math.max(2, o.r * 0.16), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#e7f7f0";
        ctx.strokeStyle = "#078e69";
        ctx.lineWidth = 2;
        rrect(-o.r * 0.82, -o.r * 0.82, o.r * 1.64, o.r * 1.64, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#078e69";
        ctx.font = "900 " + Math.max(10, o.r * 1.15) + "px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("!", 0, 1);
        ctx.textBaseline = "alphabetic";
      }
      ctx.restore();
    }
    const bx = Math.max(24, Math.min(w - 24, s.basketX));
    ctx.fillStyle = "#c90012";
    rrect(bx - 29, H - 32, 58, 22, 8);
    ctx.fill();
    ctx.strokeStyle = "#a90010";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx, H - 31, 17, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(bx, H - 28);
    ctx.bezierCurveTo(bx - 5, H - 22, bx - 6, H - 18, bx, H - 17);
    ctx.bezierCurveTo(bx + 6, H - 18, bx + 5, H - 22, bx, H - 28);
    ctx.fill();
  }, []);

  const resize = useCallback(() => {
    const c = canvasRef.current;
    const a = arenaRef.current;
    if (!c || !a) return;
    const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = Math.max(240, a.clientWidth || 320);
    g.current.ratio = ratio;
    c.width = Math.round(w * ratio);
    c.height = Math.round(H * ratio);
    c.style.height = H + "px";
    c.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.current.basketX = Math.max(26, Math.min(w - 26, g.current.basketX));
    draw();
  }, [draw]);

  const stop = useCallback(() => {
    const s = g.current;
    s.active = false;
    clearInterval(s.clock);
    cancelAnimationFrame(s.raf);
  }, []);

  const finish = useCallback(() => {
    stop();
    const s = g.current;
    setState("over");
    setHud({ score: s.score, lives: s.lives, seconds: s.seconds });
    const prev = readBest(RUSH_KEY) ?? 0;
    if (s.score > prev) {
      writeBest(RUSH_KEY, s.score);
      setBest(s.score);
      setNewBest(true);
    }
    draw();
  }, [draw, stop]);

  const frame = useCallback(
    (now: number) => {
      const s = g.current;
      if (!s.active) return;
      const w = width();
      const dt = Math.min(32, now - s.last || 16);
      s.last = now;
      if (s.left) s.basketX -= dt * 0.28;
      if (s.right) s.basketX += dt * 0.28;
      s.basketX = Math.max(26, Math.min(w - 26, s.basketX));
      s.spawn += dt;
      const interval = Math.max(320, 720 - s.score * 2);
      if (s.spawn > interval) {
        s.spawn = 0;
        const germ = Math.random() < 0.29;
        s.objs.push({
          x: 18 + Math.random() * (w - 36),
          y: -18,
          r: germ ? 9 : 11,
          type: germ ? "germ" : "drop",
          speed: 1.35 + Math.random() * 1.15 + s.score * 0.012,
        });
      }
      for (const o of s.objs) {
        o.y += o.speed * dt * 0.09;
        o.x += Math.sin((now + o.y) * 0.002) * 0.22;
      }
      let changed = false;
      s.objs = s.objs.filter((o) => {
        if (o.y > H - 43 && o.y < H - 7 && Math.abs(o.x - s.basketX) < 29) {
          if (o.type === "drop") s.score += 10;
          else s.lives--;
          changed = true;
          return false;
        }
        return o.y < H + 20;
      });
      if (changed) setHud({ score: s.score, lives: s.lives, seconds: s.seconds });
      draw();
      if (s.lives <= 0) {
        finish();
        return;
      }
      s.raf = requestAnimationFrame(frame);
    },
    [draw, finish]
  );

  const start = () => {
    const s = g.current;
    stop();
    s.objs = [];
    s.score = 0;
    s.lives = 3;
    s.seconds = 30;
    s.spawn = 0;
    s.last = 0;
    s.basketX = width() / 2;
    s.active = true;
    setNewBest(false);
    setState("playing");
    setHud({ score: 0, lives: 3, seconds: 30 });
    s.clock = setInterval(() => {
      if (!s.active) return;
      s.seconds--;
      setHud({ score: s.score, lives: s.lives, seconds: s.seconds });
      if (s.seconds <= 0) finish();
    }, 1000);
    s.raf = requestAnimationFrame(frame);
  };

  useEffect(() => {
    resize();
    const a = arenaRef.current;
    let ro: ResizeObserver | null = null;
    if (a && "ResizeObserver" in window) {
      ro = new ResizeObserver(resize);
      ro.observe(a);
    } else {
      window.addEventListener("resize", resize);
    }
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.key === "ArrowLeft") g.current.left = down;
      if (e.key === "ArrowRight") g.current.right = down;
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      stop();
      ro?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [resize, stop]);

  const moveTo = (clientX: number) => {
    const c = canvasRef.current;
    if (!c || !g.current.active) return;
    const rect = c.getBoundingClientRect();
    g.current.basketX = Math.max(26, Math.min(width() - 26, clientX - rect.left));
  };

  const hold = (dir: "left" | "right") => ({
    onPointerDown: () => (g.current[dir] = true),
    onPointerUp: () => (g.current[dir] = false),
    onPointerLeave: () => (g.current[dir] = false),
    onPointerCancel: () => (g.current[dir] = false),
  });

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <PageSubHeader title={lang === "bn" ? "ব্লাড রেসকিউ রাশ" : "BloodLink Rescue Rush"} />
      <main className="max-w-md mx-auto p-5 pb-24 space-y-4">
        <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-slate-200 text-xs font-black">
          <span>{lang === "bn" ? `সময়: ${n(hud.seconds)}` : `Time: ${hud.seconds}s`}</span>
          <span className="text-red-700">{lang === "bn" ? `স্কোর: ${n(hud.score)}` : `Score: ${hud.score}`}</span>
          <span className="text-red-600">{"❤".repeat(Math.max(0, hud.lives)) || "—"}</span>
        </div>

        <div ref={arenaRef} className="relative rounded-3xl overflow-hidden border border-slate-200 bg-white" style={{ touchAction: "none" }}>
          <canvas
            ref={canvasRef}
            className="block w-full"
            style={{ touchAction: "none" }}
            onPointerMove={(e) => e.buttons > 0 || e.pointerType === "touch" ? moveTo(e.clientX) : undefined}
            onPointerDown={(e) => moveTo(e.clientX)}
          />
          {state !== "playing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85 text-center px-4">
              {state === "idle" ? (
                <>
                  <p className="font-black text-slate-800 text-sm">
                    {lang === "bn" ? "রক্তের ফোঁটা ধরুন" : "Collect the blood drops"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {lang === "bn" ? "জীবাণু এড়িয়ে চলুন। আঙুল টেনে বা বাটন দিয়ে সরান।" : "Avoid germs. Drag your finger or use the buttons."}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-black text-slate-800 text-base">
                    {hud.lives <= 0 ? (lang === "bn" ? "খেলা শেষ!" : "Game over!") : lang === "bn" ? "সময় শেষ!" : "Time up!"}
                  </p>
                  <p className="text-sm font-bold text-red-700">
                    {lang === "bn" ? `আপনার স্কোর: ${n(hud.score)}` : `Your score: ${hud.score}`}
                  </p>
                  {newBest && (
                    <p className="text-xs font-black text-amber-600">{lang === "bn" ? "নতুন সেরা স্কোর!" : "New best score!"}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            {...hold("left")}
            className="flex-1 py-4 rounded-2xl bg-white border border-slate-200 font-black text-sm active:bg-slate-100"
            style={{ touchAction: "none" }}
          >
            ← {lang === "bn" ? "বাম" : "Left"}
          </button>
          <button
            type="button"
            {...hold("right")}
            className="flex-1 py-4 rounded-2xl bg-white border border-slate-200 font-black text-sm active:bg-slate-100"
            style={{ touchAction: "none" }}
          >
            {lang === "bn" ? "ডান" : "Right"} →
          </button>
        </div>

        <button
          type="button"
          onClick={start}
          className="w-full py-4 rounded-2xl bg-red-700 text-white text-xs font-black uppercase tracking-widest"
        >
          {state === "idle" ? (lang === "bn" ? "শুরু করুন" : "Start") : state === "playing" ? (lang === "bn" ? "আবার শুরু" : "Restart") : lang === "bn" ? "আবার খেলুন" : "Play again"}
        </button>

        <p className="text-center text-xs font-bold text-slate-500">
          {lang === "bn" ? `সেরা স্কোর: ${n(best)}` : `Best score: ${best}`} ·{" "}
          {lang === "bn" ? "ফোঁটা +১০, জীবাণু −১ জীবন" : "Drop +10, germ −1 life"}
        </p>
        <Note />
      </main>
    </div>
  );
};

/* ---------------------------------------------------------------- Blood Match */

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const shuffled = () => {
  const a = [...GROUPS, ...GROUPS].map((v, i) => ({ id: i, v }));
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const BloodMatchView: React.FC = () => {
  const { lang, n } = useLanguage();
  const [cards, setCards] = useState(shuffled);
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState<number | null>(() => readBest(MATCH_KEY));
  const [newBest, setNewBest] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const won = done.length === GROUPS.length;

  const tap = (id: number) => {
    if (open.length >= 2 || open.includes(id)) return;
    const card = cards.find((c) => c.id === id)!;
    if (done.includes(card.v)) return;
    const next = [...open, id];
    setOpen(next);
    if (next.length === 2) {
      const m = moves + 1;
      setMoves(m);
      const [a, b] = next.map((i) => cards.find((c) => c.id === i)!);
      if (a.v === b.v) {
        const nd = [...done, a.v];
        timer.current = setTimeout(() => {
          setDone(nd);
          setOpen([]);
          if (nd.length === GROUPS.length) {
            const prev = readBest(MATCH_KEY);
            if (prev === null || m < prev) {
              writeBest(MATCH_KEY, m);
              setBest(m);
              setNewBest(true);
            }
          }
        }, 350);
      } else {
        timer.current = setTimeout(() => setOpen([]), 800);
      }
    }
  };

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    setCards(shuffled());
    setOpen([]);
    setDone([]);
    setMoves(0);
    setNewBest(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <PageSubHeader title={lang === "bn" ? "ব্লাড গ্রুপ ম্যাচ" : "Blood Group Match"} />
      <main className="max-w-md mx-auto p-5 pb-24 space-y-4">
        <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-slate-200 text-xs font-black">
          <span>{lang === "bn" ? `চাল: ${n(moves)}` : `Moves: ${moves}`}</span>
          <span className="text-red-700">
            {lang === "bn" ? `সেরা: ${best === null ? "—" : n(best)}` : `Best: ${best === null ? "—" : best}`}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {cards.map((c) => {
            const shown = open.includes(c.id) || done.includes(c.v);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => tap(c.id)}
                aria-label={shown ? c.v : "Hidden card"}
                className={`aspect-square rounded-2xl flex items-center justify-center font-black text-lg border-2 transition-colors duration-200 ${
                  done.includes(c.v)
                    ? "bg-green-50 border-green-500 text-green-700"
                    : shown
                    ? "bg-white border-red-600 text-red-700"
                    : "bg-red-700 border-red-700 text-white"
                }`}
              >
                {shown ? c.v : <Droplets className="w-6 h-6" />}
              </button>
            );
          })}
        </div>

        {won && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center space-y-1">
            <p className="font-black text-slate-800">{lang === "bn" ? "দারুণ! সব জোড়া মিলেছে।" : "Great! All pairs matched."}</p>
            <p className="text-xs text-slate-500">
              {lang === "bn" ? `${n(moves)} চালে শেষ করেছেন` : `Finished in ${moves} moves`}
            </p>
            {newBest && <p className="text-xs font-black text-amber-600">{lang === "bn" ? "নতুন সেরা!" : "New best!"}</p>}
          </div>
        )}

        <button
          type="button"
          onClick={reset}
          className="w-full py-4 rounded-2xl bg-red-700 text-white text-xs font-black uppercase tracking-widest"
        >
          {won ? (lang === "bn" ? "আবার খেলুন" : "Play again") : lang === "bn" ? "নতুন খেলা" : "New game"}
        </button>
        <Note />
      </main>
    </div>
  );
};
