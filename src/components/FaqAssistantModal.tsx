import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUp, History, List, Plus, SquarePen, Trash2, X } from "lucide-react";
import type { Language } from "../i18n";
import type { BloodFaqItem } from "./SideMenuPages";
import { searchBloodFaqs } from "../utils/faqSearch";
import { useBackClose } from "../utils/backStack";
import { useScrollLock } from "../utils/scrollLock";
import { useSwipeRight } from "../utils/useSwipeRight";

interface FaqAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  faqs: BloodFaqItem[];
  initialQuestion?: string;
  lang: Language;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
  /** ids of other FAQ entries offered as follow-up suggestions (assistant only) */
  related?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

/** Which assistant message is currently being "typed", and how far along it is. */
interface Reveal {
  msgId: number;
  phase: "thinking" | "typing";
  shown: number;
}

const STORAGE_KEY = "bloodlink_chat_history_v1";
const MAX_SESSIONS = 50;
const MAX_MESSAGES = 200;
const RELATED_COUNT = 2;

/* ---------- local-device history (never leaves the phone) ---------- */

function isMessage(m: unknown): m is ChatMessage {
  if (!m || typeof m !== "object") return false;
  const c = m as Record<string, unknown>;
  return (
    typeof c.id === "number" &&
    (c.role === "user" || c.role === "assistant") &&
    typeof c.text === "string" &&
    (c.related === undefined ||
      (Array.isArray(c.related) && c.related.every((r) => typeof r === "string")))
  );
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s): s is ChatSession =>
          !!s &&
          typeof s === "object" &&
          typeof (s as ChatSession).id === "string" &&
          typeof (s as ChatSession).title === "string" &&
          typeof (s as ChatSession).updatedAt === "number" &&
          Array.isArray((s as ChatSession).messages) &&
          (s as ChatSession).messages.every(isMessage)
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {
    // storage full or unavailable: the chat still works, it just isn't remembered
  }
}

function makeTitle(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 48 ? `${t.slice(0, 48)}…` : t;
}

function formatWhen(ts: number, lang: Language): string {
  try {
    return new Date(ts).toLocaleString(lang === "bn" ? "bn-BD" : "en-GB", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* ---------- component ---------- */

/** Offline assistant: answers come from the built-in FAQ list, no server or API key. */
export const FaqAssistantModal: React.FC<FaqAssistantModalProps> = ({
  isOpen,
  onClose,
  faqs,
  initialQuestion,
  lang,
}) => {
  const isBn = lang === "bn";
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  const nextId = useRef(1);
  const timers = useRef<{ delay?: number; tick?: number }>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastInitial = useRef("");
  const panelTouchX = useRef<number | null>(null);
  const busy = reveal !== null;

  const stopTimers = useCallback(() => {
    window.clearTimeout(timers.current.delay);
    window.clearInterval(timers.current.tick);
    timers.current = {};
  }, []);

  const resetChat = useCallback(() => {
    stopTimers();
    setReveal(null);
    setCurrentId(null);
    setMessages([]);
    setInput("");
    nextId.current = 1;
  }, [stopTimers]);

  useBackClose(isOpen && historyOpen, () => setHistoryOpen(false));
  useBackClose(isOpen, onClose);
  useScrollLock(isOpen);
  useSwipeRight(() => setHistoryOpen(true), isOpen && !historyOpen);

  /** Writes one chat (full text, always complete) into local storage. */
  const persist = useCallback((id: string, msgs: ChatMessage[]) => {
    setSessions((prev) => {
      const firstQuestion = msgs.find((m) => m.role === "user")?.text ?? "";
      const session: ChatSession = {
        id,
        title: makeTitle(firstQuestion),
        updatedAt: Date.now(),
        messages: msgs.slice(-MAX_MESSAGES),
      };
      const next = [session, ...prev.filter((s) => s.id !== id)].slice(0, MAX_SESSIONS);
      saveSessions(next);
      return next;
    });
  }, []);

  const ask = useCallback(
    (question: string) => {
      const q = question.trim();
      if (!q || busy) return;

      const matches = searchBloodFaqs(faqs, q);
      const best = matches.length > 0 && matches.length < faqs.length ? matches[0] : null;
      const answer = best
        ? isBn
          ? best.answerBn
          : best.answerEn
        : isBn
        ? "দুঃখিত, এই প্রশ্নের উত্তর খুঁজে পাইনি। অন্যভাবে লিখে চেষ্টা করুন, অথবা জরুরি প্রয়োজনে জাতীয় হেল্পলাইনে যোগাযোগ করুন।"
        : "Sorry, I couldn't find an answer to that. Try rephrasing, or contact a national helpline for urgent needs.";
      const related = best
        ? matches
            .filter((m) => m.id !== best.id)
            .slice(0, RELATED_COUNT)
            .map((m) => m.id)
        : [];

      const userMsg: ChatMessage = { id: nextId.current++, role: "user", text: q };
      const botMsg: ChatMessage = {
        id: nextId.current++,
        role: "assistant",
        text: answer,
        related,
      };
      const chatId = currentId ?? `c${Date.now()}`;
      const updated = [...messages, userMsg, botMsg];

      setCurrentId(chatId);
      setMessages(updated);
      setInput("");
      persist(chatId, updated); // saved in full right away, the animation is only visual

      // short "thinking" pause with typing dots, then the answer types out
      const tokens = answer.split(/(\s+)/);
      const perTick = Math.max(2, Math.ceil(tokens.length / 28));
      setReveal({ msgId: botMsg.id, phase: "thinking", shown: 0 });
      const thinkMs = 700 + Math.min(600, answer.length * 2);
      timers.current.delay = window.setTimeout(() => {
        setReveal({ msgId: botMsg.id, phase: "typing", shown: 0 });
        timers.current.tick = window.setInterval(() => {
          setReveal((r) => {
            if (!r || r.msgId !== botMsg.id) return r;
            const shown = r.shown + perTick;
            if (shown >= tokens.length) {
              window.clearInterval(timers.current.tick);
              timers.current.tick = undefined;
              return null;
            }
            return { ...r, shown };
          });
        }, 32);
      }, thinkMs);
    },
    [busy, currentId, faqs, isBn, messages, persist]
  );

  // Load saved chats and start fresh each time the assistant opens
  useEffect(() => {
    if (isOpen) {
      setSessions(loadSessions());
      setHistoryOpen(false);
      resetChat();
    } else {
      stopTimers();
      setReveal(null);
    }
    return stopTimers;
  }, [isOpen, resetChat, stopTimers]);

  useEffect(() => {
    if (isOpen && initialQuestion && initialQuestion !== lastInitial.current) {
      lastInitial.current = initialQuestion;
      ask(initialQuestion);
    }
    // only react to a new initial question
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialQuestion]);

  // keep the newest message in view while it appears / types
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, reveal]);

  const openSession = (s: ChatSession) => {
    stopTimers();
    setReveal(null);
    setCurrentId(s.id);
    setMessages(s.messages);
    nextId.current = s.messages.reduce((max, m) => Math.max(max, m.id), 0) + 1;
    setHistoryOpen(false);
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSessions(next);
      return next;
    });
    if (id === currentId) resetChat();
  };

  const startNewChat = () => {
    resetChat();
    setHistoryOpen(false);
  };

  const faqById = (id: string) => faqs.find((f) => f.id === id);
  const lastMessage = messages[messages.length - 1];
  const suggestions = faqs.slice(0, 4);

  // open/close slide is done with a transform so it stays smooth
  if (!isOpen) return null;

  return createPortal(
    <div className="selectable fixed inset-0 z-[140] flex flex-col bg-slate-50 overflow-hidden">
      <header
        className="select-none flex items-center gap-3 px-3 pb-3 bg-[#c80000] text-white shadow-md relative z-10"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          aria-label={isBn ? "চ্যাট ইতিহাস" : "Chat history"}
          className="p-2 rounded-full text-white active:bg-white/20"
        >
          <List className="w-6 h-6" />
        </button>
        <div className="w-11 h-11 rounded-2xl border-2 border-white flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 100 100" aria-hidden="true">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M 50 12.6 C 36 32, 18.8 46, 18.8 60.5 C 18.8 77.5, 32.8 89.8, 50 89.8 C 67.2 89.8, 81.2 77.5, 81.2 60.5 C 81.2 46, 64 32, 50 12.6 Z M 50 48 A 16.25 16.25 0 1 0 50 80.5 A 16.25 16.25 0 1 0 50 48 Z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-xl leading-none truncate">BloodLink</div>
          <div className="text-xs text-white/90 mt-1 truncate">
            {isBn ? "রক্তদান এআই সহকারী" : "Blood Donation AI Assistant"}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={isBn ? "বন্ধ করুন" : "Close"}
          className="p-2 rounded-full text-white active:bg-white/20"
        >
          <X className="w-6 h-6" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 flex flex-col overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 select-none">
            <div className="relative">
              <div className="absolute inset-0 -m-10 rounded-full bg-red-200/50 blur-3xl" aria-hidden="true" />
              <img
                src="/assets/assistant-avatar.png"
                alt=""
                className="relative w-44 h-44 object-contain pointer-events-none"
              />
              <div
                className="mx-auto -mt-1 h-3 w-32 rounded-full bg-red-300/60 blur-md"
                aria-hidden="true"
              />
            </div>
            <div className="w-full space-y-2">
              <p className="text-xs font-bold text-slate-400 text-center">
                {isBn ? "কিছু প্রশ্ন, যা আপনি জানতে চাইতে পারেন" : "Some questions you might ask"}
              </p>
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => ask(isBn ? s.questionBn : s.questionEn)}
                  className="block w-full text-left px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 active:bg-red-50 active:border-red-200"
                >
                  {isBn ? s.questionBn : s.questionEn}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isRevealing = reveal?.msgId === m.id;
          if (m.role === "assistant" && isRevealing && reveal.phase === "thinking") {
            return (
              <div key={m.id} className="flex justify-start">
                <div
                  className="select-none flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3.5"
                  aria-label={isBn ? "লিখছে..." : "Typing..."}
                >
                  <span className="typing-dot" />
                  <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                  <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            );
          }
          const text =
            m.role === "assistant" && isRevealing
              ? m.text.split(/(\s+)/).slice(0, reveal.shown).join("")
              : m.text;
          return (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#c80000] text-white rounded-br-md"
                    : "bg-slate-100 text-slate-800 rounded-bl-md"
                }`}
              >
                {text}
              </div>
            </div>
          );
        })}

        {lastMessage?.role === "assistant" && !busy && lastMessage.related && lastMessage.related.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="select-none text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {isBn ? "আরও জানুন" : "You may also ask"}
            </p>
            {lastMessage.related.map((id) => {
              const f = faqById(id);
              if (!f) return null;
              const label = isBn ? f.questionBn : f.questionEn;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => ask(label)}
                  className="block w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 active:bg-red-50 active:border-red-200"
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="px-4 pt-3 border-t border-slate-200 bg-white"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white pl-2 pr-2 py-1.5 shadow-sm focus-within:border-[#c80000] transition-colors">
          <button
            type="button"
            onClick={startNewChat}
            aria-label={isBn ? "নতুন চ্যাট" : "New chat"}
            className="w-9 h-9 shrink-0 rounded-full text-slate-500 flex items-center justify-center active:bg-slate-100"
          >
            <Plus className="w-6 h-6" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isBn ? "রক্তদান নিয়ে প্রশ্ন করুন..." : "Ask about blood donation..."}
            className="flex-1 min-w-0 bg-transparent px-1 py-2 text-[15px] outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            aria-label={isBn ? "পাঠান" : "Send"}
            className="w-10 h-10 shrink-0 rounded-full bg-[#c80000] text-white flex items-center justify-center disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* ---- chat history panel (slides in from the left) ---- */}
      <div
        className={`select-none absolute inset-0 z-10 ${historyOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!historyOpen}
      >
        <div
          onClick={() => setHistoryOpen(false)}
          className={`absolute inset-0 touch-none bg-slate-900/50 transition-opacity duration-200 ease-out ${
            historyOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          onTouchStart={(e) => {
            panelTouchX.current = e.touches[0].clientX;
          }}
          onTouchMove={(e) => {
            if (panelTouchX.current !== null && e.touches[0].clientX - panelTouchX.current < -60) {
              panelTouchX.current = null;
              setHistoryOpen(false);
            }
          }}
          onTouchEnd={() => {
            panelTouchX.current = null;
          }}
          className={`absolute left-0 top-0 bottom-0 w-[82vw] max-w-[320px] bg-white shadow-xl flex flex-col transform-gpu transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            historyOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center gap-2 px-4 py-4 bg-[#c80000] text-white">
            <History className="w-5 h-5" />
            <h2 className="flex-1 font-bold text-base">{isBn ? "চ্যাট ইতিহাস" : "Chat history"}</h2>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              aria-label={isBn ? "বন্ধ করুন" : "Close"}
              className="p-1.5 rounded-full hover:bg-white/15 active:bg-white/25"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={startNewChat}
            className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-bold text-[#c80000] active:bg-red-100"
          >
            <SquarePen className="w-4 h-4" />
            {isBn ? "নতুন চ্যাট" : "New chat"}
          </button>

          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2">
            {sessions.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs font-semibold text-slate-400">
                {isBn ? "এখনো কোনো চ্যাট নেই।" : "No chats yet."}
              </p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-1 rounded-xl border ${
                    s.id === currentId ? "border-red-200 bg-red-50/60" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openSession(s)}
                    className="flex-1 min-w-0 px-3.5 py-2.5 text-left"
                  >
                    <div className="truncate text-sm font-bold text-slate-800">{s.title}</div>
                    <div className="text-[11px] font-medium text-slate-400">{formatWhen(s.updatedAt, lang)}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSession(s.id)}
                    aria-label={isBn ? "মুছুন" : "Delete chat"}
                    className="p-2.5 mr-1 rounded-full text-slate-400 hover:text-[#c80000] active:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <p className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-center text-[11px] font-semibold text-slate-400">
            {isBn ? "চ্যাট শুধু আপনার ফোনে সংরক্ষিত থাকে।" : "Chats are saved only on this phone."}
          </p>
        </aside>
      </div>
    </div>,
    document.body
  );
};
