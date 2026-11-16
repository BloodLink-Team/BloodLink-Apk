import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import {
  X,
  Plus,
  ArrowUp,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Paperclip,
  Trash2,
  PlusCircle,
  MessageSquare,
  FileText,
  Square,
  Edit2,
  Undo2,
  Redo2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLanguage, Language } from "../i18n";
import { getApiUrl, getLiveWsUrl } from "../utils/apiBase";

export interface ChatAttachment {
  name: string;
  size: string;
  type: string;
  dataUrl?: string;
}

export interface MessageVersion {
  text: string;
  timestamp: string;
  modelAnswer?: string;
  subsequentMessages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  askedViaVoice?: boolean;
  attachment?: ChatAttachment;
  versions?: MessageVersion[];
  currentVersionIndex?: number;
  pairedModelMessageId?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
}

interface BloodAiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestion?: string;
  lang?: Language;
}

const STORAGE_KEY = "bloodlink_chat_sessions_v1";

// Custom BloodLink Synthesized Sound Effects (zero Google Assistant earcon sounds)
function playCustomSfx(type: "open" | "close") {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === "open") {
      // Crisp, subtle tactile click (fast 35ms non-melodic frequency transition)
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      osc.start(now);
      osc.stop(now + 0.035);
    } else {
      // Soft muted discrete closing tap
      osc.type = "sine";
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.03);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.03);
    }
    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        // ignore
      }
    }, 80);
  } catch {
    // ignore
  }
}

// Custom Icon: Three Grids in a Circle (circular voice icon for input bar with broad grids)
const ThreeGridsCircleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <rect x="6.8" y="9.5" width="2.4" height="5" rx="1.2" />
    <rect x="10.8" y="6.8" width="2.4" height="10.4" rx="1.2" />
    <rect x="14.8" y="9.5" width="2.4" height="5" rx="1.2" />
  </svg>
);

// Custom Icon: Three-Block Menu (3 distinct blocks, not dots) for opening chat history
const ThreeBlocksMenuIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="3.5" y="4.5" width="4.5" height="4.5" rx="1" />
    <rect x="3.5" y="10" width="4.5" height="4.5" rx="1" />
    <rect x="3.5" y="15.5" width="4.5" height="4.5" rx="1" />
    <rect x="10.5" y="5.5" width="10" height="2.5" rx="1" fillOpacity="0.9" />
    <rect x="10.5" y="11" width="10" height="2.5" rx="1" fillOpacity="0.9" />
    <rect x="10.5" y="16.5" width="10" height="2.5" rx="1" fillOpacity="0.9" />
  </svg>
);

// Helper: Float32 Array to 16-bit PCM Base64 (16kHz for Gemini Live)
function float32ToPcm16Base64(input: Float32Array): string {
  const pcm = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const BloodAiAssistantModal: React.FC<BloodAiAssistantModalProps> = ({
  isOpen,
  onClose,
  initialQuestion,
  lang: propLang,
}) => {
  const globalLang = useLanguage();
  const lang = propLang ?? globalLang.lang;

  // Active chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => "session-" + Date.now());
  const [input, setInput] = useState("");
  const [isMultiLine, setIsMultiLine] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<ChatAttachment | null>(null);

  // Editing state for messages
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  // Context Menu state for long press
  const [contextMenu, setContextMenu] = useState<{
    message: ChatMessage;
    x: number;
    y: number;
  } | null>(null);

  // Chat History Drawer state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  // Real-Time Gemini Live Voice Call State
  const [isLiveCallActive, setIsLiveCallActive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Real-time Sound Energy (0 to 1) for the dynamic stretching grids animation
  const [soundEnergy, setSoundEnergy] = useState<number>(0);

  // Viewport tracking (prevents modal from shifting upwards and keeps input pill synchronously locked to virtual keyboard)
  const [viewportState, setViewportState] = useState<{ height: number; top: number }>(() => {
    if (typeof window !== "undefined" && window.visualViewport) {
      return {
        height: window.visualViewport.height,
        top: window.visualViewport.offsetTop,
      };
    }
    return {
      height: typeof window !== "undefined" ? window.innerHeight : 800,
      top: 0,
    };
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const longPressTimerRef = useRef<any>(null);
  const savedDraftRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Dynamically auto-sizes textarea up to max-height (130px) without clipped text or layout jumps
  const adjustTextareaHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const val = el.value;
    if (!val.trim()) {
      el.style.height = "24px";
      setIsMultiLine(false);
      return;
    }
    const scrollH = el.scrollHeight;
    const targetH = Math.min(Math.max(scrollH, 24), 130);
    el.style.height = `${targetH}px`;
    setIsMultiLine(scrollH > 28 || val.includes("\n"));
  }, []);

  // Dismiss mobile virtual keyboard
  const dismissKeyboard = useCallback(() => {
    inputRef.current?.blur();
    if (document.activeElement && "blur" in document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }
  }, []);

  // Left-to-right swipe detection to open 3-block history menu and dismiss virtual keyboard
  const handleChatTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleChatTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Detect left-to-right swipe (at least 40px horizontal and predominantly horizontal)
    if (deltaX > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.05) {
      // Dismiss virtual keyboard immediately
      dismissKeyboard();
      setIsHistoryOpen(true);
    }
  };

  // Close keyboard whenever chat history drawer opens
  useEffect(() => {
    if (isHistoryOpen) {
      dismissKeyboard();
    }
  }, [isHistoryOpen, dismissKeyboard]);

  // When editing starts, focus bottom textarea, move cursor to the very end of the text, and auto-size height
  useEffect(() => {
    if (editingMessageId && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
      adjustTextareaHeight();
    }
  }, [editingMessageId, adjustTextareaHeight]);

  // Stop/Pause generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    stopAudioPlayback();
  };

  // Live Audio Refs
  const liveWsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const isLiveCallActiveRef = useRef(false);

  // Voice transcript accumulation (so voice chats are saved in text format in background)
  const currentUserTextRef = useRef<string>("");
  const currentModelTextRef = useRef<string>("");

  useEffect(() => {
    isLiveCallActiveRef.current = isLiveCallActive;
  }, [isLiveCallActive]);

  // Strict Body Scroll Lock & Visual Viewport Tracking:
  // Anchors modal top and height to visualViewport, keeping window scroll at 0 so FAQ page NEVER peeks through
  useEffect(() => {
    if (!isOpen) return;

    const savedBodyOverflow = document.body.style.overflow;
    const savedBodyPosition = document.body.style.position;
    const savedBodyTop = document.body.style.top;
    const savedBodyWidth = document.body.style.width;
    const scrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const vv = window.visualViewport;
    const syncViewport = () => {
      if (vv) {
        setViewportState({
          height: vv.height,
          top: vv.offsetTop,
        });
      } else {
        setViewportState({
          height: window.innerHeight,
          top: 0,
        });
      }
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    syncViewport();

    if (vv) {
      vv.addEventListener("resize", syncViewport);
      vv.addEventListener("scroll", syncViewport);
    }
    window.addEventListener("scroll", syncViewport);

    return () => {
      document.body.style.overflow = savedBodyOverflow;
      document.body.style.position = savedBodyPosition;
      document.body.style.top = savedBodyTop;
      document.body.style.width = savedBodyWidth;
      window.scrollTo(0, scrollY);
      if (vv) {
        vv.removeEventListener("resize", syncViewport);
        vv.removeEventListener("scroll", syncViewport);
      }
      window.removeEventListener("scroll", syncViewport);
    };
  }, [isOpen]);

  // Load chat sessions from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setChatSessions(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Save session when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setChatSessions((prev) => {
        const firstUserMsg = messages.find((m) => m.role === "user");
        const title = firstUserMsg
          ? firstUserMsg.text.slice(0, 36) + (firstUserMsg.text.length > 36 ? "..." : "")
          : lang === "bn"
          ? "রক্তদান পরামর্শ"
          : "Blood Donation Inquiry";

        const existingIdx = prev.findIndex((s) => s.id === currentSessionId);
        let updated: ChatSession[];
        if (existingIdx !== -1) {
          updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            title: updated[existingIdx].title || title,
            messages,
          };
        } else {
          updated = [
            {
              id: currentSessionId,
              title,
              createdAt: Date.now(),
              messages,
            },
            ...prev,
          ];
        }

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 30)));
        } catch {
          // ignore
        }
        return updated;
      });
    }
  }, [messages, currentSessionId, lang]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow DOM layout to update before scrolling container
      const scrollTimer = setTimeout(() => {
        scrollToBottom("smooth");
      }, 50);
      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(focusTimer);
      };
    }
  }, [isOpen, messages]);

  // Handle initial question if opened from outside
  useEffect(() => {
    if (isOpen && initialQuestion && initialQuestion.trim()) {
      handleSend(initialQuestion.trim());
    }
  }, [isOpen, initialQuestion]);

  // Clean Audio Playback
  const stopAudioPlayback = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
  };

  // Stop Live Audio PCM Playback
  const stopLivePlayback = () => {
    activeSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch {
        // ignore
      }
    });
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) {
      nextPlayTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
  };

  // Play Live 24kHz PCM chunk
  const playLivePcmChunk = (base64Audio: string) => {
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;

    try {
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      if (outputAnalyserRef.current) {
        source.connect(outputAnalyserRef.current);
      } else {
        source.connect(ctx.destination);
      }

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + buffer.duration;

      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      };
    } catch (e) {
      console.warn("[Live Voice] Playback error:", e);
    }
  };

  // Commit any accumulated voice exchange to the text chat history
  const commitSpokenTurnsToChat = useCallback(() => {
    const userText = currentUserTextRef.current.trim();
    const modelText = currentModelTextRef.current.trim();

    if (userText || modelText) {
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const userMsgId = "voice-user-" + Date.now();
      const modelMsgId = "voice-model-" + Date.now() + 1;

      const newMessages: ChatMessage[] = [];

      if (userText) {
        newMessages.push({
          id: userMsgId,
          role: "user",
          text: userText,
          timestamp,
          askedViaVoice: true,
          pairedModelMessageId: modelText ? modelMsgId : undefined,
          versions: [
            {
              text: userText,
              timestamp,
              modelAnswer: modelText,
            },
          ],
          currentVersionIndex: 0,
        });
      }
      if (modelText) {
        newMessages.push({
          id: modelMsgId,
          role: "model",
          text: modelText,
          timestamp,
        });
      }

      setMessages((prev) => [...prev, ...newMessages]);
      currentUserTextRef.current = "";
      currentModelTextRef.current = "";
    }
  }, []);

  // Real-time Sound Energy Monitor (calculates audio volume for 3-grid stretch animation)
  const startSoundEnergyLoop = () => {
    const checkEnergy = () => {
      let energy = 0;

      // Check user mic input
      if (inputAnalyserRef.current) {
        const dataArray = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
        inputAnalyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length / 255;
        if (avg > energy) energy = avg;
      }

      // Check model audio output
      if (outputAnalyserRef.current && activeSourcesRef.current.length > 0) {
        const dataArray = new Uint8Array(outputAnalyserRef.current.frequencyBinCount);
        outputAnalyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length / 255;
        if (avg > energy) energy = avg;
      }

      setSoundEnergy(energy);
      animFrameRef.current = requestAnimationFrame(checkEnergy);
    };

    animFrameRef.current = requestAnimationFrame(checkEnergy);
  };

  // Start Real-Time Gemini Live Voice Call
  const startLiveVoiceCall = async () => {
    stopAudioPlayback();
    setLiveError(null);
    setIsLiveCallActive(true);
    currentUserTextRef.current = "";
    currentModelTextRef.current = "";

    // Play our custom opening sound effect
    playCustomSfx("open");

    try {
      const wsUrl = getLiveWsUrl();
      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      if (outputCtx.state === "suspended") {
        await outputCtx.resume();
      }
      outputAudioCtxRef.current = outputCtx;
      nextPlayTimeRef.current = outputCtx.currentTime;

      // Output Analyser for visualizing model speech sound wave
      const outAnalyser = outputCtx.createAnalyser();
      outAnalyser.fftSize = 64;
      outAnalyser.connect(outputCtx.destination);
      outputAnalyserRef.current = outAnalyser;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      if (inputCtx.state === "suspended") {
        await inputCtx.resume();
      }
      inputAudioCtxRef.current = inputCtx;

      // Input Analyser for visualizing user microphone sound wave
      const inAnalyser = inputCtx.createAnalyser();
      inAnalyser.fftSize = 64;
      inputAnalyserRef.current = inAnalyser;

      const sourceNode = inputCtx.createMediaStreamSource(stream);
      sourceNode.connect(inAnalyser);

      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const base64Audio = float32ToPcm16Base64(inputData);
        ws.send(JSON.stringify({ audio: base64Audio }));
      };

      sourceNode.connect(processor);
      processor.connect(inputCtx.destination);

      startSoundEnergyLoop();

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.audio) {
            playLivePcmChunk(data.audio);
          }
          if (data.modelText) {
            currentModelTextRef.current += data.modelText;
          }
          if (data.userText) {
            currentUserTextRef.current += data.userText;
          }
          if (data.turnComplete) {
            commitSpokenTurnsToChat();
          }
          if (data.interrupted) {
            stopLivePlayback();
          }
          if (data.error) {
            setLiveError(data.error);
          }
        } catch (e) {
          console.warn("[Live Voice] Parsing error:", e);
        }
      };

      ws.onerror = () => {
        setLiveError(
          lang === "bn"
            ? "ভয়েস সংযোগে সমস্যা হয়েছে।"
            : "Live voice connection error."
        );
      };

      ws.onclose = () => {
        if (isLiveCallActiveRef.current) {
          endLiveVoiceChat();
        }
      };
    } catch (err: any) {
      console.error("[Live Voice] Setup error:", err);
      setLiveError(
        lang === "bn"
          ? "মাইক্রোফোনের অনুমতি পাওয়া যায়নি।"
          : "Microphone permission denied."
      );
    }
  };

  // End Real-Time Gemini Live Voice Chat and switch back to text view
  const endLiveVoiceChat = () => {
    // Play our custom closing sound effect
    playCustomSfx("close");

    commitSpokenTurnsToChat();
    setIsLiveCallActive(false);
    stopLivePlayback();

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setSoundEnergy(0);

    if (liveWsRef.current) {
      try {
        liveWsRef.current.close();
      } catch {
        // ignore
      }
      liveWsRef.current = null;
    }
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      try {
        inputAudioCtxRef.current.close();
      } catch {
        // ignore
      }
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      try {
        outputAudioCtxRef.current.close();
      } catch {
        // ignore
      }
      outputAudioCtxRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endLiveVoiceChat();
      stopAudioPlayback();
    };
  }, []);

  // Handle Attachment Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeInKb = Math.round(file.size / 1024);
    const sizeStr = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedAttachment({
        name: file.name,
        size: sizeStr,
        type: file.type,
        dataUrl: typeof reader.result === "string" ? reader.result : undefined,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Playback speech aloud
  const speakText = async (textToSpeak: string, msgId: string) => {
    stopAudioPlayback();
    setSpeakingId(msgId);

    const cleanText = textToSpeak
      .replace(/[*_#`[\]()]/g, "")
      .replace(/\n+/g, " ")
      .trim();

    let playedViaTTS = false;

    try {
      const res = await fetch(getApiUrl("/api/ai/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText.slice(0, 320) }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audio) {
          const audio = new Audio("data:audio/wav;base64," + data.audio);
          currentAudioRef.current = audio;
          audio.onended = () => {
            setSpeakingId(null);
            currentAudioRef.current = null;
          };
          audio.onerror = () => {
            setSpeakingId(null);
            currentAudioRef.current = null;
          };
          await audio.play();
          playedViaTTS = true;
        }
      }
    } catch {
      playedViaTTS = false;
    }

    if (!playedViaTTS && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang === "bn" ? "bn-BD" : "en-US";
      utterance.rate = 1.0;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      window.speechSynthesis.speak(utterance);
    } else if (!playedViaTTS) {
      setSpeakingId(null);
    }
  };

  const handleToggleSpeak = (msgId: string, text: string) => {
    if (speakingId === msgId) {
      stopAudioPlayback();
      return;
    }
    speakText(text, msgId);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    setContextMenu(null);
  };

  // Long press detection for mobile & desktop context menu
  const handleTouchStart = (msg: ChatMessage, e: React.TouchEvent | React.MouseEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({
        message: msg,
        x: Math.min(window.innerWidth - 220, Math.max(16, clientX - 80)),
        y: Math.min(window.innerHeight - 240, Math.max(70, clientY - 30)),
      });
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleContextMenu = (msg: ChatMessage, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      message: msg,
      x: Math.min(window.innerWidth - 220, Math.max(16, e.clientX - 80)),
      y: Math.min(window.innerHeight - 240, Math.max(70, e.clientY - 30)),
    });
  };

  // Edit Message: Triggers editing input in bottom pill (ChatGPT & Gemini style)
  const handleStartEdit = (msg: ChatMessage) => {
    savedDraftRef.current = input;
    setEditingMessageId(msg.id);
    setEditingText(msg.text);
    setInput(msg.text);
    setContextMenu(null);

    // Auto-focus bottom pill, move cursor to end of text, and expand to fit text
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = msg.text.length;
        inputRef.current.setSelectionRange(len, len);
        adjustTextareaHeight();
      }
    });
  };

  // Cancel Edit: Restores previous input/draft and closes dark backdrop
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
    const prev = savedDraftRef.current || "";
    setInput(prev);
    requestAnimationFrame(() => {
      adjustTextareaHeight();
    });
  };

  // Submit Edited Message: Removes all subsequent prompts & results, regenerates AI response, and saves versions
  const handleSubmitEdit = async (msgId: string, updatedText?: string) => {
    const newText = (updatedText !== undefined ? updatedText : input).trim();
    if (!newText) {
      handleCancelEdit();
      return;
    }

    const targetId = msgId;

    // Reset input pill & edit states immediately for responsive UI
    setEditingMessageId(null);
    setEditingText("");
    setInput("");
    setIsMultiLine(false);
    if (inputRef.current) {
      inputRef.current.style.height = "24px";
    }

    // Find the target user message
    const userMsgIdx = messages.findIndex((m) => m.id === targetId);
    if (userMsgIdx === -1) {
      handleSend(newText);
      return;
    }

    const currentMsg = messages[userMsgIdx];
    const pairedModelMsg =
      messages[userMsgIdx + 1]?.role === "model" ? messages[userMsgIdx + 1] : undefined;
    const currentSubsequent = messages.slice(userMsgIdx + (pairedModelMsg ? 2 : 1));

    // Prepare version list ensuring active version preserves its answer and branch
    const versions: MessageVersion[] =
      currentMsg.versions && currentMsg.versions.length > 0
        ? [...currentMsg.versions]
        : [
            {
              text: currentMsg.text,
              timestamp: currentMsg.timestamp,
              modelAnswer: pairedModelMsg?.text,
              subsequentMessages: currentSubsequent,
            },
          ];

    const currVerIdx = currentMsg.currentVersionIndex ?? (versions.length - 1);
    if (versions[currVerIdx]) {
      versions[currVerIdx] = {
        ...versions[currVerIdx],
        modelAnswer: pairedModelMsg?.text || versions[currVerIdx].modelAnswer,
        subsequentMessages: currentSubsequent,
      };
    }

    const newVersionIndex = versions.length;
    const nowTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append new version entry
    versions.push({
      text: newText,
      timestamp: nowTimestamp,
      modelAnswer: "",
      subsequentMessages: [],
    });

    const newModelMsgId = "model-" + Date.now();

    const updatedUserMsg: ChatMessage = {
      ...currentMsg,
      text: newText,
      timestamp: nowTimestamp,
      versions,
      currentVersionIndex: newVersionIndex,
      pairedModelMessageId: newModelMsgId,
    };

    // CRITICAL: TRUNCATION
    // Remove every prompt and result after this edited prompt!
    const priorMessages = messages.slice(0, userMsgIdx);
    const truncatedThread = [...priorMessages, updatedUserMsg];
    setMessages(truncatedThread);

    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Detect prompt language
    const isBn = /[\u0980-\u09FF]/.test(newText);
    const effectiveLang: "bn" | "en" = isBn
      ? "bn"
      : /[a-zA-Z]/.test(newText)
      ? "en"
      : lang === "bn"
      ? "bn"
      : "en";

    // History payload sent to AI contains only prior context up to this turn
    const historyPayload = priorMessages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    try {
      const res = await fetch(getApiUrl("/api/ai/faq-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          question: newText,
          lang: effectiveLang,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      const newAnswer =
        data.answer || (effectiveLang === "bn" ? "কোনো উত্তর পাওয়া যায়নি।" : "No answer returned.");

      const newModelMessage: ChatMessage = {
        id: newModelMsgId,
        role: "model",
        text: newAnswer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => {
        const next = [...prev];
        const uIdx = next.findIndex((m) => m.id === targetId);
        if (uIdx === -1) {
          return [...next, newModelMessage];
        }

        // Store generated model answer into the newly added version
        const userMsgToUpdate = next[uIdx];
        if (userMsgToUpdate.versions && userMsgToUpdate.versions[newVersionIndex]) {
          userMsgToUpdate.versions[newVersionIndex].modelAnswer = newAnswer;
        }

        // Truncate cleanly after this newly regenerated response
        return [...next.slice(0, uIdx + 1), newModelMessage];
      });
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.warn("[Edit] Submit error:", err);
      const fallbackMessage: ChatMessage = {
        id: newModelMsgId,
        role: "model",
        text:
          effectiveLang === "bn"
            ? "দুঃখিত, সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।"
            : "Sorry, a connection issue occurred. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => {
        const next = [...prev];
        const uIdx = next.findIndex((m) => m.id === targetId);
        if (uIdx === -1) return [...next, fallbackMessage];
        return [...next.slice(0, uIdx + 1), fallbackMessage];
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Switch to specific prompt version (Undo Edit = previous version, Redo Edit = next version)
  const handleSwitchVersion = (userMsgId: string, targetVersionIndex: number) => {
    stopAudioPlayback();

    setMessages((prev) => {
      const userIdx = prev.findIndex((m) => m.id === userMsgId);
      if (userIdx === -1) return prev;

      const userMsg = prev[userIdx];
      if (
        !userMsg.versions ||
        targetVersionIndex < 0 ||
        targetVersionIndex >= userMsg.versions.length
      ) {
        return prev;
      }

      const currVerIdx = userMsg.currentVersionIndex ?? 0;
      if (currVerIdx === targetVersionIndex) return prev;

      // Save current active branch before switching
      const pairedModelMsg =
        prev[userIdx + 1]?.role === "model" ? prev[userIdx + 1] : undefined;
      const currentSubsequent = prev.slice(userIdx + (pairedModelMsg ? 2 : 1));

      const updatedVersions = [...userMsg.versions];
      if (updatedVersions[currVerIdx]) {
        updatedVersions[currVerIdx] = {
          ...updatedVersions[currVerIdx],
          modelAnswer: pairedModelMsg?.text || updatedVersions[currVerIdx].modelAnswer,
          subsequentMessages: currentSubsequent,
        };
      }

      const targetVersion = updatedVersions[targetVersionIndex];

      const switchedUserMsg: ChatMessage = {
        ...userMsg,
        text: targetVersion.text,
        currentVersionIndex: targetVersionIndex,
        versions: updatedVersions,
      };

      const prior = prev.slice(0, userIdx);
      const subsequent = targetVersion.subsequentMessages || [];

      if (targetVersion.modelAnswer) {
        const restoredModelMsg: ChatMessage = {
          id: userMsg.pairedModelMessageId || "model-" + Date.now(),
          role: "model",
          text: targetVersion.modelAnswer,
          timestamp:
            targetVersion.timestamp ||
            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        return [...prior, switchedUserMsg, restoredModelMsg, ...subsequent];
      } else {
        return [...prior, switchedUserMsg, ...subsequent];
      }
    });

    setContextMenu(null);
  };

  // Undo Edit: Restores previous prompt version and its paired answer/branch
  const handleUndoEdit = (userMsg: ChatMessage) => {
    const curr = userMsg.currentVersionIndex ?? 0;
    if (curr > 0) {
      handleSwitchVersion(userMsg.id, curr - 1);
    }
  };

  // Redo Edit: Restores subsequent prompt version and its paired answer/branch
  const handleRedoEdit = (userMsg: ChatMessage) => {
    const curr = userMsg.currentVersionIndex ?? 0;
    const len = userMsg.versions?.length ?? 1;
    if (curr < len - 1) {
      handleSwitchVersion(userMsg.id, curr + 1);
    }
  };

  // Send message
  const handleSend = async (questionToSend?: string) => {
    const query = (questionToSend || input).trim();
    if ((!query && !selectedAttachment) || isLoading) return;

    stopAudioPlayback();

    // Detect prompt language: Bengali unicode characters or English
    const isBn = /[\u0980-\u09FF]/.test(query);
    const queryLang: "bn" | "en" = isBn ? "bn" : /[a-zA-Z]/.test(query) ? "en" : (lang === "bn" ? "bn" : "en");

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsgId = "user-" + Date.now();
    const modelMsgId = "model-" + (Date.now() + 1);

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: query || (queryLang === "bn" ? "সংযুক্ত ফাইল বিশ্লেষণ করুন" : "Analyze attached file"),
      timestamp,
      attachment: selectedAttachment || undefined,
      pairedModelMessageId: modelMsgId,
      versions: [
        {
          text: query || (queryLang === "bn" ? "সংযুক্ত ফাইল বিশ্লেষণ করুন" : "Analyze attached file"),
          timestamp,
        },
      ],
      currentVersionIndex: 0,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsMultiLine(false);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setSelectedAttachment(null);
    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch(getApiUrl("/api/ai/faq-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          question:
            query ||
            (queryLang === "bn"
              ? "সংযুক্ত ফাইলের তথ্যানুযায়ী রক্তদানের নিয়ম বলুন"
              : "Check eligibility from attached file"),
          lang: queryLang,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      const answer =
        data.answer || (queryLang === "bn" ? "কোনো উত্তর পাওয়া যায়নি।" : "No answer returned.");

      const modelMessage: ChatMessage = {
        id: modelMsgId,
        role: "model",
        text: answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => {
        // Record model answer in user message version
        const next = [...prev];
        const uIdx = next.findIndex((m) => m.id === userMsgId);
        if (uIdx !== -1 && next[uIdx].versions && next[uIdx].versions![0]) {
          next[uIdx].versions![0].modelAnswer = answer;
        }
        return [...next, modelMessage];
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Generation stopped by user
        return;
      }
      console.error("[Assistant] Error:", err);
      const fallbackMessage: ChatMessage = {
        id: modelMsgId,
        role: "model",
        text:
          queryLang === "bn"
            ? "দুঃখিত, সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।"
            : "Sorry, a connection issue occurred. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Start new clean chat
  const handleStartNewChat = () => {
    stopAudioPlayback();
    endLiveVoiceChat();
    setCurrentSessionId("session-" + Date.now());
    setMessages([]);
    setInput("");
    setIsMultiLine(false);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setIsHistoryOpen(false);
  };

  // Load a chat session from history
  const handleSelectSession = (session: ChatSession) => {
    stopAudioPlayback();
    endLiveVoiceChat();
    setCurrentSessionId(session.id);
    setMessages(session.messages || []);
    setIsHistoryOpen(false);
  };

  // Delete a chat session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    if (currentSessionId === sessionId) {
      setMessages([]);
      setCurrentSessionId("session-" + Date.now());
    }
  };

  // Handle Close (X) button
  const handleClose = () => {
    if (isLiveCallActive) {
      endLiveVoiceChat();
      return;
    }
    stopAudioPlayback();
    endLiveVoiceChat();
    onClose();
  };

  if (!isOpen) return null;

  // Dynamic stretching for even broader 3 proportional grids in the center circle
  // When silent (soundEnergy near 0): height is 20px (exact circle dot, rx=10, width=20)
  // When sound is received: stretches with sound wave (center bar up to 86px, side bars up to 64px)
  const isSilent = soundEnergy < 0.05;
  const sideBarHeight = isSilent ? 20 : Math.min(64, Math.max(20, Math.round(20 + soundEnergy * 75)));
  const centerBarHeight = isSilent ? 20 : Math.min(86, Math.max(20, Math.round(20 + soundEnergy * 115)));

  return createPortal(
    <div
      className="fixed inset-0 z-[130] w-full bg-white flex flex-col overflow-hidden select-none overscroll-none"
      style={{
        height: `${viewportState.height}px`,
        position: "fixed",
        top: `${viewportState.top}px`,
        left: 0,
        right: 0,
        width: "100%",
      }}
      aria-modal="true"
      role="dialog"
      onClick={() => setContextMenu(null)}
      onTouchStart={handleChatTouchStart}
      onTouchEnd={handleChatTouchEnd}
    >
      {/* 
        TOP HEADER: 
        - Three-block menu at very left corner
        - Logo (bg-[#c80000] with white droplet + white stroke so it stands out on red bar)
        - Name "BloodLink" in bold white lettering
        - Cross icon at top right corner
      */}
      <header className="bg-[#c80000] text-white px-3.5 sm:px-5 py-3.5 flex items-center justify-between shrink-0 shadow-md z-20">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Three Blocks Menu Button (Opens Chat History Drawer & Dismisses Virtual Keyboard) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dismissKeyboard();
              setIsHistoryOpen(true);
            }}
            className="p-1.5 -ml-1 rounded-xl text-white hover:bg-white/15 active:bg-white/25 transition-colors cursor-pointer"
            title={lang === "bn" ? "চ্যাট হিস্ট্রি" : "Chat History"}
            aria-label="Open Chat History"
          >
            <ThreeBlocksMenuIcon className="w-5 h-5 text-white" />
          </button>

          {/* BloodLink Original Logo with white stroke & Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c80000] border-2 border-white text-white flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 100 100">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M 50 12.6 C 36 32, 18.8 46, 18.8 60.5 C 18.8 77.5, 32.8 89.8, 50 89.8 C 67.2 89.8, 81.2 77.5, 81.2 60.5 C 81.2 46, 64 32, 50 12.6 Z M 50 48 A 16.25 16.25 0 1 0 50 80.5 A 16.25 16.25 0 1 0 50 48 Z"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg tracking-tight leading-none text-white">
                BloodLink
              </h2>
              <p className="text-[10px] sm:text-[11px] text-white/85 font-semibold leading-none mt-1">
                {lang === "bn" ? "রক্তদান এআই সহকারী" : "AI Assistant"}
              </p>
            </div>
          </div>
        </div>

        {/* Top Right: Cross icon */}
        <button
          type="button"
          onClick={handleClose}
          className="p-2 -mr-1 rounded-xl text-white hover:bg-white/15 active:bg-white/25 transition-colors cursor-pointer"
          title={lang === "bn" ? "বন্ধ করুন" : "Close"}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Global Speaking Notification */}
      {speakingId && !isLiveCallActive && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center justify-between text-xs text-[#c80000] shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 font-bold">
            <span className="w-2 h-2 rounded-full bg-[#c80000] animate-pulse" />
            <span>
              {lang === "bn" ? "ভয়েস উত্তর শুনছেন..." : "Playing voice response aloud..."}
            </span>
          </div>
          <button
            type="button"
            onClick={stopAudioPlayback}
            className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-[#c80000] text-white px-2.5 py-1 rounded-lg hover:bg-red-800 transition-colors cursor-pointer"
          >
            <Square className="w-3 h-3 fill-white" />
            <span>{lang === "bn" ? "থামান" : "Stop"}</span>
          </button>
        </div>
      )}

      {/* 
        REAL-TIME GEMINI LIVE VOICE CHAT SCREEN
        - Clean canvas with zero scattered text
        - Red circle with white stroke, rich 360° neon red shadow
        - 3 wider grids consuming substantial space, stretching with sound waves, turning into complete circles when silent
        - Custom sound effects on open/close (No Google Assistant sounds)
        - Short Doctor Verification Note
        - Button: "End Voice Chat"
      */}
      {isLiveCallActive ? (
        <div className="flex-1 flex flex-col justify-between items-center p-6 bg-gradient-to-b from-slate-50 via-white to-red-50/20 select-none animate-in fade-in duration-200">
          <div />

          {/* Center Voice Visualizer */}
          <div className="flex flex-col items-center justify-center my-auto space-y-7">
            {/* Glowing Red Circle with White Stroke */}
            <div className="relative flex items-center justify-center">
              {/* 360° Ambient Neon Red Glow */}
              <div className="absolute w-44 h-44 rounded-full bg-red-600/30 blur-2xl animate-pulse" />

              {/* Main Red Circle with White Stroke */}
              <div className="relative w-36 h-36 rounded-full bg-gradient-to-b from-[#dc0000] to-[#b00000] text-white flex items-center justify-center border-4 border-white shadow-[0_0_60px_rgba(200,0,0,0.55),0_0_120px_rgba(200,0,0,0.3)] ring-4 ring-red-500/20">
                {/* 
                  The 3 Proportional Grids (Even Broader):
                  Consumes broad, bold space inside the circle (viewBox 0 0 100 100, width=20px each).
                  Stretches dynamically with incoming/outgoing sound waves,
                  smoothly turns into complete circular nodes (dots, rx=10, height=20) when silent!
                */}
                <svg viewBox="0 0 100 100" className="w-26 h-26 sm:w-28 sm:h-28 text-white" fill="currentColor">
                  {/* Left Grid */}
                  <rect
                    x="12"
                    y={50 - sideBarHeight / 2}
                    width="20"
                    height={sideBarHeight}
                    rx="10"
                    className="transition-all duration-75 ease-out"
                  />
                  {/* Middle Grid */}
                  <rect
                    x="40"
                    y={50 - centerBarHeight / 2}
                    width="20"
                    height={centerBarHeight}
                    rx="10"
                    className="transition-all duration-75 ease-out"
                  />
                  {/* Right Grid */}
                  <rect
                    x="68"
                    y={50 - sideBarHeight / 2}
                    width="20"
                    height={sideBarHeight}
                    rx="10"
                    className="transition-all duration-75 ease-out"
                  />
                </svg>
              </div>
            </div>

            {liveError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-2 text-xs flex items-center gap-2 max-w-xs text-left">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{liveError}</span>
              </div>
            )}
          </div>

          {/* Bottom Area: Controls & Doctor verification note */}
          <div className="w-full max-w-xs flex flex-col items-center gap-4">
            {/* End Voice Chat Button */}
            <button
              type="button"
              onClick={endLiveVoiceChat}
              className="w-full py-3 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 active:scale-95 transition-all cursor-pointer"
            >
              <span>{lang === "bn" ? "ভয়েস চ্যাট শেষ করুন" : "End Voice Chat"}</span>
            </button>

            {/* Short Doctor Verification Note (Voice Mode) */}
            <p className="text-[11px] text-center text-slate-400 font-medium leading-tight px-2">
              {lang === "bn"
                ? "যেকোনো শারীরিক প্রয়োজনে রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।"
                : "Always verify medical advice with a registered physician."}
            </p>
          </div>
        </div>
      ) : (
        /* STANDARD FULLSCREEN CHAT INTERACTION VIEW */
        <div
          onTouchStart={handleChatTouchStart}
          onTouchEnd={handleChatTouchEnd}
          className="flex-1 flex flex-col overflow-hidden bg-slate-50/70 relative"
        >
          {/* Dark Backdrop Overlay when editing a prompt (ChatGPT & Gemini style) */}
          {editingMessageId && (
            <div
              onClick={handleCancelEdit}
              className="fixed inset-0 bg-slate-950/65 backdrop-blur-[2px] z-30 transition-opacity duration-200 cursor-pointer"
              title={lang === "bn" ? "সম্পাদনা বাতিল করতে ট্যাপ করুন" : "Tap anywhere to cancel editing"}
            />
          )}

          {/* Messages Container (Clean, NO question suggestions) */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-4 space-y-2 sm:space-y-2.5 relative z-20"
          >
            {/* Floating AI Robo with Red Ground Shadow (Clean, text-free, no background box, slow & steady float) */}
            {messages.length === 0 && (
              <div className="h-full min-h-[50vh] flex flex-col justify-center items-center text-center p-6 max-w-sm mx-auto select-none">
                <div className="relative flex flex-col items-center justify-center py-6">
                  {/* Floating AI Robot - Pure Transparent Mascot, No Background Box */}
                  <motion.div
                    animate={{
                      y: [0, -8, 0],
                    }}
                    transition={{
                      duration: 4.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative z-10 w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center cursor-default filter drop-shadow-[0_12px_24px_rgba(200,0,0,0.22)]"
                  >
                    <img
                      src="/assets/aistudio/file_00000000bfe882119cd8ed4b07c2f07b_47d8157b.png"
                      alt="BloodLink AI Robot"
                      className="w-full h-full object-contain pointer-events-none select-none"
                      draggable={false}
                    />
                  </motion.div>

                  {/* Red Shadow Forming at Ground: Slow, Steady & Gentle Sync */}
                  <motion.div
                    animate={{
                      scaleX: [1, 0.88, 1],
                      scaleY: [1, 0.88, 1],
                      opacity: [0.55, 0.32, 0.55],
                    }}
                    transition={{
                      duration: 4.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="w-28 sm:w-32 h-3.5 rounded-full mt-2"
                    style={{
                      background:
                        "radial-gradient(ellipse at center, rgba(220, 38, 38, 0.5) 0%, rgba(220, 38, 38, 0.18) 48%, rgba(220, 38, 38, 0) 75%)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const isSpeaking = speakingId === msg.id;
              const isCopied = copiedId === msg.id;
              const isEditing = editingMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start items-start gap-2"} relative group`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-red-200 shadow-2xs shrink-0 mt-0.5 bg-red-50 flex items-center justify-center p-0.5">
                      <img
                        src="/assets/aistudio/file_00000000bfe882119cd8ed4b07c2f07b_47d8157b.png"
                        alt="BloodLink AI Assistant"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div
                    onTouchStart={(e) => handleTouchStart(msg, e)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    onMouseDown={(e) => handleTouchStart(msg, e)}
                    onMouseUp={handleTouchEnd}
                    onContextMenu={(e) => handleContextMenu(msg, e)}
                    className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm leading-snug shadow-xs cursor-pointer select-text transition-shadow ${
                      isEditing
                        ? "relative z-40 ring-3 ring-red-400 shadow-xl bg-[#c80000] text-white rounded-br-xs"
                        : isUser
                        ? "bg-[#c80000] text-white font-medium rounded-br-xs"
                        : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs"
                    }`}
                  >
                    {/* Attachment preview if user uploaded a file */}
                    {msg.attachment && (
                      <div
                        className={`mb-2 p-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold ${
                          isUser ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <Paperclip className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate flex-1">{msg.attachment.name}</span>
                        <span className="text-[10px] opacity-75 shrink-0">
                          {msg.attachment.size}
                        </span>
                      </div>
                    )}

                    <p id={"msg-text-" + msg.id} className="whitespace-pre-wrap leading-snug font-normal">
                      {msg.text}
                    </p>

                    {/* Bottom Status & Version Navigator (Undo/Redo Edit) */}
                    <div className="flex items-center justify-between gap-2 mt-1 select-none">
                      {/* Left: Version Switcher (< 1/2 >) for edited user messages */}
                      {isUser && msg.versions && msg.versions.length > 1 && !isEditing ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-0.5 bg-black/25 text-white rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        >
                          {/* Undo Edit button (<) */}
                          <button
                            type="button"
                            onClick={() => handleUndoEdit(msg)}
                            disabled={(msg.currentVersionIndex ?? 0) <= 0}
                            className="p-0.5 rounded-full hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                            title={lang === "bn" ? "পূর্ববর্তী ভার্সন (আনডু এডিট)" : "Previous version (Undo edit)"}
                            aria-label="Undo edit"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>

                          {/* Version Counter: 1/2 */}
                          <span className="px-1 font-mono font-bold">
                            {(msg.currentVersionIndex ?? 0) + 1}/{msg.versions.length}
                          </span>

                          {/* Redo Edit button (>) */}
                          <button
                            type="button"
                            onClick={() => handleRedoEdit(msg)}
                            disabled={(msg.currentVersionIndex ?? 0) >= (msg.versions?.length ?? 1) - 1}
                            className="p-0.5 rounded-full hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                            title={lang === "bn" ? "পরবর্তী ভার্সন (রিডু এডিট)" : "Next version (Redo edit)"}
                            aria-label="Redo edit"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div />
                      )}

                      {/* Right: Status tags and quick actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isEditing && (
                          <span className="text-[9px] bg-black/30 text-white px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                            <Edit2 className="w-2.5 h-2.5" />
                            {lang === "bn" ? "সম্পাদনা চলছে..." : "Editing..."}
                          </span>
                        )}
                        {msg.versions && msg.versions.length > 1 && !isEditing && (
                          <span className="text-[9px] font-medium text-white/70">
                            {lang === "bn" ? "সম্পাদিত" : "edited"}
                          </span>
                        )}
                        {msg.askedViaVoice && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${
                              isUser ? "bg-white/20 text-white" : "bg-red-50 text-[#c80000]"
                            }`}
                          >
                            {lang === "bn" ? "ভয়েস" : "Voice"}
                          </span>
                        )}
                        {isUser && !isEditing && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(msg);
                            }}
                            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                            title={lang === "bn" ? "এডিট করুন" : "Edit prompt"}
                            aria-label="Edit prompt"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Thinking Indicator */}
            {isLoading && (
              <div className="flex justify-start items-start gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-red-200 shadow-2xs shrink-0 mt-0.5 bg-red-50 flex items-center justify-center p-0.5">
                  <img
                    src="/assets/aistudio/file_00000000bfe882119cd8ed4b07c2f07b_47d8157b.png"
                    alt="BloodLink AI Assistant"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="bg-white border border-slate-200/90 rounded-2xl rounded-bl-xs px-3 py-2 shadow-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#c80000] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-[#c80000] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-[#c80000] animate-bounce" />
                  <span className="text-[11px] font-semibold text-slate-500 ml-1">
                    {lang === "bn" ? "উত্তর তৈরি হচ্ছে..." : "Processing answer..."}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 
            INPUT BAR CONTAINER:
            - Elevated above dark backdrop (relative z-40)
            - Clean minimal UI without bulky edit banners
            - Plus icon always accessible to add attachments even while editing
            - Right: Stop button (while generating), Upload arrow (while editing or typing), or Voice icon (when empty)
          */}
          <footer className="p-2 sm:p-2.5 bg-white border-t border-slate-200 shrink-0 relative z-40">
            {/* Attachment Chip Preview if selected */}
            {selectedAttachment && (
              <div className="mb-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-800 animate-in fade-in">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="truncate font-semibold">{selectedAttachment.name}</span>
                  <span className="text-[10px] text-slate-500">({selectedAttachment.size})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAttachment(null)}
                  className="p-1 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
            />

            {/* 
              ChatGPT-Style Dynamic Input Box:
              - Single compact horizontal pill (min-h-[44px]), everything inline!
              - Expandable when multiline, shrinks back instantly when erased
              - Plus icon always available to attach files
            */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingMessageId) {
                  handleSubmitEdit(editingMessageId, input);
                } else {
                  handleSend(input);
                }
              }}
              className={`w-full bg-slate-100 border border-slate-200 focus-within:border-slate-300 focus-within:bg-white shadow-2xs transition-all flex items-end gap-1.5 px-2.5 py-1.5 ${
                isMultiLine ? "rounded-2xl" : "rounded-full min-h-[44px]"
              }`}
            >
              {/* Left icon: Plus icon always available (even during editing so user can attach files) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 flex items-center justify-center shrink-0 transition-colors cursor-pointer mb-0.5"
                title={lang === "bn" ? "ফাইল যুক্ত করুন" : "Upload attachment"}
                aria-label="Upload attachment"
              >
                <Plus className="w-4 h-4 text-slate-600" />
              </button>

              {/* Textarea container with auto-expansion and zero clipping */}
              <div className="flex-1 min-w-0 flex items-center py-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  rows={1}
                  onChange={(e) => {
                    setInput(e.target.value);
                    adjustTextareaHeight();
                  }}
                  onKeyDown={(e) => {
                    // Plain Enter creates line breaks and gaps as user requested
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      if (editingMessageId) {
                        handleSubmitEdit(editingMessageId, input);
                      } else {
                        handleSend(input);
                      }
                    } else if (e.key === "Escape" && editingMessageId) {
                      e.preventDefault();
                      handleCancelEdit();
                    }
                  }}
                  disabled={false}
                  placeholder={
                    editingMessageId
                      ? lang === "bn"
                        ? "বার্তা সম্পাদনা করুন..."
                        : "Edit your prompt..."
                      : lang === "bn"
                      ? "রক্তদান নিয়ে প্রশ্ন করুন..."
                      : "Ask any question about blood donation..."
                  }
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 border-none outline-none ring-0 focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 resize-none leading-5 shadow-none whitespace-pre-wrap break-words px-1.5 py-0 max-h-[130px] overflow-y-auto block"
                  style={{
                    outline: "none",
                    boxShadow: "none",
                    border: "none",
                    height: "24px",
                  }}
                />
              </div>

              {/* Right side button: Stop/Pause (while loading), Send edited prompt (while editing), Send (with text), or Voice (when empty) */}
              <div className="shrink-0 flex items-center gap-1 mb-0.5">
                {isLoading ? (
                  <button
                    type="button"
                    onClick={handleStopGeneration}
                    className="w-8 h-8 rounded-full bg-slate-900 hover:bg-black text-white flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs"
                    title={lang === "bn" ? "থামান" : "Stop"}
                    aria-label="Stop generating"
                  >
                    <Square className="w-3 h-3 fill-current text-white" />
                  </button>
                ) : editingMessageId ? (
                  <button
                    type="button"
                    onClick={() => handleSubmitEdit(editingMessageId, input)}
                    disabled={!input.trim()}
                    className="w-8 h-8 rounded-full bg-[#c80000] hover:bg-red-800 active:scale-95 text-white flex items-center justify-center shrink-0 transition-all shadow-xs cursor-pointer disabled:opacity-40"
                    title={lang === "bn" ? "সম্পাদিত প্রম্পট পাঠান" : "Save & Send"}
                    aria-label="Send edited prompt"
                  >
                    <ArrowUp className="w-4 h-4 text-white" />
                  </button>
                ) : input.trim() || selectedAttachment ? (
                  <button
                    type="submit"
                    className="w-8 h-8 rounded-full bg-[#c80000] hover:bg-red-800 active:scale-95 text-white flex items-center justify-center shrink-0 transition-all shadow-xs cursor-pointer"
                    title={lang === "bn" ? "পাঠান" : "Send"}
                    aria-label="Send"
                  >
                    <ArrowUp className="w-4 h-4 text-white" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startLiveVoiceCall}
                    className="w-8 h-8 rounded-full bg-slate-200/90 hover:bg-[#c80000] text-slate-700 hover:text-white flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer"
                    title={
                      lang === "bn"
                        ? "ভয়েস সহকারী"
                        : "Voice Assistant"
                    }
                    aria-label="Voice Assistant"
                  >
                    <ThreeGridsCircleIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Short Doctor Verification Note (Chat Mode) */}
            <p className="text-[10px] text-center text-slate-400 mt-1 font-medium">
              {lang === "bn"
                ? "যেকোনো শারীরিক প্রয়োজনে রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।"
                : "Always verify medical information with a registered physician."}
            </p>
          </footer>
        </div>
      )}

      {/* 
        FLOATING CONTEXT MENU (Triggered by Long Press / Right-click on message):
        - Displays Time
        - Copy option
        - Select option
        - Edit option (for user messages)
        - Undo edit option (restores earlier version prompt and exact previous model response without regenerating!)
        - Redo edit option (restores subsequent edited prompt and response without regenerating!)
      */}
      {contextMenu && (
        <div
          className="fixed z-[160] bg-white rounded-2xl shadow-2xl border border-slate-200 p-1.5 w-52 text-xs font-semibold text-slate-700 space-y-1 animate-in fade-in zoom-in-95 duration-150"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header: Timestamp */}
          <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400 font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {lang === "bn" ? "সময়:" : "Time:"} {contextMenu.message.timestamp}
            </span>
          </div>

          {/* Copy Option */}
          <button
            type="button"
            onClick={() => handleCopy(contextMenu.message.id, contextMenu.message.text)}
            className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-100 flex items-center gap-2 text-left cursor-pointer transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>{lang === "bn" ? "কপি করুন" : "Copy"}</span>
          </button>

          {/* User Message Specific Options: Edit, Undo Edit, Redo Edit */}
          {contextMenu.message.role === "user" && (
            <>
              {/* Edit Option */}
              <button
                type="button"
                onClick={() => handleStartEdit(contextMenu.message)}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-red-50 text-slate-800 hover:text-[#c80000] flex items-center gap-2 text-left cursor-pointer transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#c80000]" />
                <span>{lang === "bn" ? "এডিট করুন" : "Edit"}</span>
              </button>

              {/* Undo Edit (Bring back earlier response without regenerating) */}
              {contextMenu.message.versions &&
                contextMenu.message.currentVersionIndex !== undefined &&
                contextMenu.message.currentVersionIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => handleUndoEdit(contextMenu.message)}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-amber-50 text-amber-900 flex items-center gap-2 text-left cursor-pointer transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>{lang === "bn" ? "আনডু এডিট" : "Undo Edit"}</span>
                  </button>
                )}

              {/* Redo Edit (Restore subsequent edited response without regenerating) */}
              {contextMenu.message.versions &&
                contextMenu.message.currentVersionIndex !== undefined &&
                contextMenu.message.currentVersionIndex < contextMenu.message.versions.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleRedoEdit(contextMenu.message)}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-emerald-50 text-emerald-900 flex items-center gap-2 text-left cursor-pointer transition-colors"
                  >
                    <Redo2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{lang === "bn" ? "রিডু এডিট" : "Redo Edit"}</span>
                  </button>
                )}
            </>
          )}

          {/* Model Message Listen Aloud Option */}
          {contextMenu.message.role === "model" && (
            <button
              type="button"
              onClick={() => {
                handleToggleSpeak(contextMenu.message.id, contextMenu.message.text);
                setContextMenu(null);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-100 flex items-center gap-2 text-left cursor-pointer transition-colors"
            >
              {speakingId === contextMenu.message.id ? (
                <VolumeX className="w-3.5 h-3.5 text-[#c80000]" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>
                {speakingId === contextMenu.message.id
                  ? lang === "bn"
                    ? "ভয়েস থামান"
                    : "Stop Voice"
                  : lang === "bn"
                  ? "ভয়েসে শুনুন"
                  : "Listen Aloud"}
              </span>
            </button>
          )}
        </div>
      )}

      {/* 
        CHAT HISTORY SIDE DRAWER:
        Opened by clicking the three-block menu button on the top left
      */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[140] flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsHistoryOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
          />

          {/* Drawer Panel */}
          <div className="relative z-10 w-[82vw] max-w-xs h-full bg-white shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ThreeBlocksMenuIcon className="w-5 h-5 text-[#c80000]" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  {lang === "bn" ? "চ্যাট হিস্ট্রি" : "Chat History"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3 border-b border-slate-100">
              <button
                type="button"
                onClick={handleStartNewChat}
                className="w-full py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-[#c80000] border border-red-200 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{lang === "bn" ? "নতুন চ্যাট শুরু করুন" : "Start New Chat"}</span>
              </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatSessions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium">
                  {lang === "bn"
                    ? "কোনো পূর্ববর্তী চ্যাট সংরক্ষিত নেই।"
                    : "No saved chat history yet."}
                </div>
              ) : (
                chatSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between group cursor-pointer ${
                      session.id === currentSessionId
                        ? "bg-red-50/60 border-red-200 text-[#c80000]"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{session.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(session.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                      title={lang === "bn" ? "মুছুন" : "Delete"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-center gap-2 text-center">
              <div className="w-6 h-6 rounded-lg overflow-hidden border border-red-200 shadow-2xs shrink-0 bg-red-50 flex items-center justify-center p-0.5">
                <img
                  src="/assets/aistudio/file_00000000bfe882119cd8ed4b07c2f07b_47d8157b.png"
                  alt="BloodLink AI Assistant"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-bold">
                BloodLink Medical AI Assistant
              </p>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
