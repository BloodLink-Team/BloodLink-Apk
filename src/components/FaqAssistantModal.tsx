import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUp, Trash2, X } from "lucide-react";
import type { Language } from "../i18n";
import type { BloodFaqItem } from "./SideMenuPages";
import { searchBloodFaqs } from "../utils/faqSearch";

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
}

const MAX_ANSWERS = 2;

/** Offline assistant: answers come from the built-in FAQ list, no server or API key. */
export const FaqAssistantModal: React.FC<FaqAssistantModalProps> = ({
  isOpen,
  onClose,
  faqs,
  initialQuestion,
  lang,
}) => {
  const isBn = lang === "bn";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const lastInitial = useRef("");

  const suggestions = useMemo(() => faqs.slice(0, 4), [faqs]);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    const matches = searchBloodFaqs(faqs, q).slice(0, MAX_ANSWERS);
    const answer =
      matches.length > 0
        ? matches
            .map((m) =>
              isBn
                ? `${m.questionBn}\n${m.answerBn}`
                : `${m.questionEn}\n${m.answerEn}`
            )
            .join("\n\n")
        : isBn
        ? "দুঃখিত, এই প্রশ্নের উত্তর খুঁজে পাইনি। অন্যভাবে লিখে চেষ্টা করুন, অথবা জরুরি প্রয়োজনে জাতীয় হেল্পলাইনে যোগাযোগ করুন।"
        : "Sorry, I couldn't find an answer to that. Try rephrasing, or contact a national helpline for urgent needs.";
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, role: "user", text: q },
      { id: nextId.current++, role: "assistant", text: answer },
    ]);
    setInput("");
  };

  useEffect(() => {
    if (isOpen && initialQuestion && initialQuestion !== lastInitial.current) {
      lastInitial.current = initialQuestion;
      ask(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialQuestion]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[140] flex flex-col bg-white">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white">
        <img
          src="/assets/assistant-avatar.png"
          alt=""
          className="w-9 h-9 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-slate-800">
            {isBn ? "রক্তদান সহকারী" : "Blood Donation Assistant"}
          </div>
          <div className="text-[11px] text-slate-500">
            {isBn ? "রক্তদান সম্পর্কে প্রশ্ন করুন" : "Ask anything about blood donation"}
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            aria-label={isBn ? "চ্যাট মুছুন" : "Clear chat"}
            className="p-2 rounded-full text-slate-400 hover:text-[#c80000] hover:bg-red-50"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={isBn ? "বন্ধ করুন" : "Close"}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              {isBn ? "কিছু প্রশ্ন, যা আপনি জানতে চাইতে পারেন:" : "Some questions you might ask:"}
            </p>
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => ask(isBn ? s.questionBn : s.questionEn)}
                className="block w-full text-left px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 hover:border-red-200 hover:bg-red-50"
              >
                {isBn ? s.questionBn : s.questionEn}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-[#c80000] text-white rounded-br-md"
                  : "bg-slate-100 text-slate-800 rounded-bl-md"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 bg-white"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isBn ? "আপনার প্রশ্ন লিখুন..." : "Type your question..."}
          className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#c80000]"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          aria-label={isBn ? "পাঠান" : "Send"}
          className="w-10 h-10 rounded-full bg-[#c80000] text-white flex items-center justify-center disabled:opacity-40"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </form>
    </div>,
    document.body
  );
};
