/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Droplets, UserPlus, Search, Phone, MapPin, Calendar, User, Heart, Lock, ShieldCheck, CheckCircle2, AlertCircle, LogOut, X, Menu } from "lucide-react";

const FAST_TRANSITION = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };
const PAGE_TRANSITION = { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const };

// Types & Data
import { Donor, BloodGroup, Gender } from "./types";
import { LOCATION_DATA, getUpazilas } from "./data/locations";
import { getDummyDonorsForSearch, SearchScope } from "./data/dummyDonors";
import { getLocationDistanceKm } from "./data/geoCoordinates";
import { fetchDonors, registerDonor, sendOtp, verifyOtp, updateDonationDate, updateDonor, subscribeToDonors } from "./services/api";
import { SimplifiedDatePicker } from "./components/SimplifiedDatePicker";
import { LanguageProvider, useLanguage, LanguageSwitch, Language } from "./i18n";
import { SideMenuDrawer, LearnAboutDonationView, BlogsPortalView, MeetOurTeamView, NationalHelplinesView, SupportUsView, HowToUseAppView } from "./components/SideMenuPages";

// Components
const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const memoryStorage: Record<string, string> = {};
const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key) ?? memoryStorage[key] ?? null;
  } catch {
    return memoryStorage[key] ?? null;
  }
};
const safeSetItem = (key: string, value: string): void => {
  memoryStorage[key] = value;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore SecurityError in cross-origin iframes
  }
};
const safeRemoveItem = (key: string): void => {
  delete memoryStorage[key];
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore SecurityError in cross-origin iframes
  }
};

const isValidDonor = (d: unknown): d is Donor => {
  if (!d || typeof d !== "object" || Array.isArray(d)) return false;
  const candidate = d as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.phone === "string" &&
    candidate.phone.trim().length > 0 &&
    typeof candidate.bloodGroup === "string" &&
    BLOOD_GROUPS.includes(candidate.bloodGroup as BloodGroup)
  );
};

const useLockBodyScroll = () => {
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, []);
};

const UpdatePromptModal = ({ donor, onUpdate, onClose }: { donor: Donor, onUpdate: (newDate: string) => void, onClose: () => void }) => {
  useLockBodyScroll();
  const { lang } = useLanguage();
  const [newDate, setNewDate] = useState("");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!newDate) return;
    setUpdating(true);
    setError(null);
    try {
      await updateDonor(donor.phone, {
        lastDonationDate: newDate,
        timesDonated: (Number(donor.timesDonated) || 0) + 1,
      });
      onUpdate(newDate);
    } catch (e) {
      console.error(e);
      setError(lang === "bn" ? "রক্তদানের তারিখ আপডেট করা যায়নি। আবার চেষ্টা করুন।" : "Failed to update donation date. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={FAST_TRANSITION}
      onClick={onClose}
      className="fixed inset-0 w-screen h-[100dvh] z-[110] flex items-center justify-center p-5 bg-slate-900/55 backdrop-blur-md touch-none select-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 6 }}
        transition={FAST_TRANSITION}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-[320px] rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-5 text-center space-y-4"
      >
        <div className="w-11 h-11 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100/80">
          <Calendar className="w-5 h-5" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            {lang === "bn" ? "রক্তদানের তথ্য আপডেট করুন" : "Update Donation Record"}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            {lang === "bn"
              ? "আপনি কি সম্প্রতি রক্ত দান করেছেন? আপনার প্রাপ্যতা সঠিক রাখতে তারিখটি আপডেট করুন।"
              : "Have you donated blood recently? Keep your availability status accurate."}
          </p>
        </div>

        <div className="space-y-3 pt-0.5">
          {error && (
            <p className="text-[10px] font-bold text-red-600 bg-red-50 py-1.5 px-3 rounded-xl border border-red-100">
              {error}
            </p>
          )}
          <div className="space-y-1 text-left">
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest block text-center">
              {lang === "bn" ? "সর্বশেষ রক্তদানের তারিখ" : "Latest Donation Date"}
            </label>
            <SimplifiedDatePicker 
              type="donation"
              value={newDate}
              onChange={setNewDate}
              required
            />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button 
              onClick={handleSubmit}
              disabled={!newDate || updating}
              className="w-full bg-red-700 text-white font-bold py-2.5 rounded-xl shadow-sm hover:bg-red-800 active:scale-[0.99] disabled:opacity-50 transition-all text-xs"
            >
              {updating
                ? lang === "bn" ? "আপডেট হচ্ছে..." : "Updating..."
                : lang === "bn" ? "আপডেট সংরক্ষণ করুন" : "Save Update"}
            </button>
            <button 
              onClick={onClose}
              className="w-full text-slate-400 font-semibold py-1.5 hover:text-slate-600 transition-colors text-[11px]"
            >
              {lang === "bn" ? "এখন থাক" : "Skip for now"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

const Layout = ({ children, title, showBack = true, onBack }: { children: React.ReactNode, title: string, showBack?: boolean, onBack?: () => void }) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="w-10 flex items-center justify-start">
          {showBack && (
            <button 
              onClick={handleBack}
              className="relative z-20 p-2 -ml-2 hover:bg-slate-50 active:bg-slate-100 rounded-full transition-colors flex items-center justify-center min-w-[40px] min-h-[40px]"
              aria-label="Go back"
            >
              <ChevronLeft className="w-6 h-6 text-slate-800" />
            </button>
          )}
        </div>
        <h1 className="flex-1 text-center font-bold text-base uppercase tracking-wider text-slate-800">
          {title}
        </h1>
        <div className="w-10" />
      </header>
      <main className="max-w-md mx-auto p-5 pb-24">
        {children}
      </main>
    </div>
  );
};

const BN_MONTHS_SHORT = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

const formatReadableDate = (dateStr?: string, lang: Language = "en") => {
  if (!dateStr || dateStr === "Never") return lang === "bn" ? "কোনো তথ্য নেই" : "No record yet";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate();
    const year = date.getFullYear();
    if (lang === "bn") {
      const bnDigits = (v: number) => String(v).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
      const getBnOrdinal = (d: number) => {
        if (d === 1) return `${bnDigits(d)}লা`;
        if (d === 2 || d === 3) return `${bnDigits(d)}রা`;
        if (d === 4) return `${bnDigits(d)}ঠা`;
        if (d >= 5 && d <= 18) return `${bnDigits(d)}ই`;
        return `${bnDigits(d)}শে`;
      };
      const monthBn = BN_MONTHS_SHORT[date.getMonth()] || "";
      return `${getBnOrdinal(day)} ${monthBn} ${bnDigits(year)}`;
    }
    const month = date.toLocaleString('en-GB', { month: 'short' });
    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    return `${getOrdinal(day)} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

const getDonorEligibility = (lastDonationDate?: string, lang: Language = "en"): {
  isEligible: boolean;
  nextEligibleDate: string | null;
  daysRemaining: number;
} => {
  if (!lastDonationDate || lastDonationDate === "Never") {
    return { isEligible: true, nextEligibleDate: null, daysRemaining: 0 };
  }
  const lastDate = new Date(lastDonationDate).getTime();
  if (isNaN(lastDate)) {
    return { isEligible: true, nextEligibleDate: null, daysRemaining: 0 };
  }
  const oneHundredTwentyDays = 120 * 24 * 60 * 60 * 1000;
  const nextEligibleTimestamp = lastDate + oneHundredTwentyDays;
  const now = Date.now();
  if (now >= nextEligibleTimestamp) {
    return { isEligible: true, nextEligibleDate: null, daysRemaining: 0 };
  }
  const daysRemaining = Math.ceil((nextEligibleTimestamp - now) / (24 * 60 * 60 * 1000));
  const nextDateIso = new Date(nextEligibleTimestamp).toISOString().split("T")[0];
  return {
    isEligible: false,
    nextEligibleDate: formatReadableDate(nextDateIso, lang),
    daysRemaining,
  };
};

const isDonorEligible = (lastDonationDate?: string): boolean => {
  return getDonorEligibility(lastDonationDate).isEligible;
};

const LogoutConfirmModal = ({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void;
  onClose: () => void;
}) => {
  useLockBodyScroll();
  const { lang } = useLanguage();
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={FAST_TRANSITION}
      onClick={onClose}
      className="fixed inset-0 w-screen h-[100dvh] z-[110] flex items-center justify-center p-5 bg-slate-900/55 backdrop-blur-md touch-none select-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 6 }}
        transition={FAST_TRANSITION}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-[300px] rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-5 text-center space-y-4"
      >
        <div className="w-11 h-11 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100/80">
          <LogOut className="w-5 h-5" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            {lang === "bn" ? "লগ আউট করবেন?" : "Log Out?"}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            {lang === "bn"
              ? "আপনি যেকোনো সময় আপনার নিবন্ধিত ফোন নম্বর দিয়ে আবার লগ ইন করতে পারবেন।"
              : "You can sign back in anytime using your registered phone number."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 active:scale-[0.99] transition-all text-xs"
          >
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full bg-red-700 text-white font-bold py-2.5 rounded-xl shadow-sm hover:bg-red-800 active:scale-[0.99] transition-all text-xs"
          >
            {lang === "bn" ? "লগ আউট" : "Log Out"}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

let hasShownRegisterPromptInSession = false;

const RegisterPromptModal = ({
  onRegister,
  onMaybeLater,
  onNeverShowAgain,
}: {
  onRegister: () => void;
  onMaybeLater: () => void;
  onNeverShowAgain: () => void;
}) => {
  useLockBodyScroll();
  const { lang } = useLanguage();
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={FAST_TRANSITION}
      onClick={onMaybeLater}
      className="fixed inset-0 w-screen h-[100dvh] z-[110] flex items-center justify-center p-5 bg-slate-900/55 backdrop-blur-md touch-none select-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 6 }}
        transition={FAST_TRANSITION}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-[310px] rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-5 text-center space-y-4"
      >
        <div className="flex items-center justify-center">
          <div className="w-11 h-11 bg-[#c80000] text-white rounded-2xl flex items-center justify-center shadow-md">
            <Heart className="w-5 h-5 fill-white" />
          </div>
        </div>

        <div className="space-y-1 px-1">
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
            {lang === "bn" ? "একজন জীবনরক্ষাকারী হোন" : "Become a Lifesaver"}
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {lang === "bn"
              ? "আজই রক্তদাতা হিসেবে নিবন্ধন করুন এবং জরুরি মুহূর্তে জীবন বাঁচাতে সাহায্য করুন।"
              : "Register as a blood donor today and help save lives in your community."}
          </p>
        </div>

        <div className="space-y-2 pt-0.5">
          <button
            type="button"
            onClick={onRegister}
            className="w-full bg-[#c80000] text-white font-bold py-2.5 px-4 rounded-xl shadow-sm hover:bg-red-800 active:scale-[0.99] transition-all text-xs flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{lang === "bn" ? "রক্তদাতা হিসেবে নিবন্ধন" : "Register as Donor"}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onMaybeLater}
              className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 active:scale-[0.99] transition-all text-[11px]"
            >
              {lang === "bn" ? "পরে করব" : "Maybe Later"}
            </button>
            <button
              type="button"
              onClick={onNeverShowAgain}
              className="w-full py-2 bg-slate-50 text-slate-400 rounded-xl font-semibold hover:text-slate-600 hover:bg-slate-100 active:scale-[0.99] transition-all text-[11px]"
            >
              {lang === "bn" ? "আর দেখাবেন না" : "Don't Ask Again"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

const Home = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [currentUser, setCurrentUser] = useState<Donor | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);

  useEffect(() => {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const checkRegisterPrompt = () => {
      if (hasShownRegisterPromptInSession) return;
      const status = safeGetItem("register_prompt_status");
      if (status === "never") return;

      const dismissedAt = safeGetItem("register_prompt_dismissed_at");
      if (!dismissedAt) {
        hasShownRegisterPromptInSession = true;
        setShowRegisterPrompt(true);
        return;
      }

      const lastDismissedTime = parseInt(dismissedAt, 10);
      if (isNaN(lastDismissedTime) || now - lastDismissedTime >= sevenDays) {
        hasShownRegisterPromptInSession = true;
        setShowRegisterPrompt(true);
      }
    };

    // Check if user is registered/logged in from previous session
    try {
      const savedDonor = safeGetItem("donor_session");
      if (savedDonor) {
        const user = JSON.parse(savedDonor);
        if (!isValidDonor(user)) {
          safeRemoveItem("donor_session");
          setCurrentUser(null);
          checkRegisterPrompt();
          return;
        }
        setCurrentUser(user);

        // Weekly check logic: 7 days cooldown, only for eligible donors (120+ days since last donation)
        const lastVisit = safeGetItem("last_visit");

        if (lastVisit && isDonorEligible(user.lastDonationDate)) {
          if (now - parseInt(lastVisit) > sevenDays) {
            setShowUpdatePrompt(true);
          }
        }
        safeSetItem("last_visit", now.toString());
      } else {
        checkRegisterPrompt();
      }
    } catch {
      safeRemoveItem("donor_session");
      checkRegisterPrompt();
    }
  }, []);

  const handleLogout = () => {
    safeRemoveItem("donor_session");
    safeRemoveItem("last_visit");
    setCurrentUser(null);
    setShowLogoutConfirm(false);
  };

  return (
    <div className="flex flex-col items-center min-h-screen pt-20 pb-8 space-y-6">
      {/* Fixed Red Top Strap: stays locked in place while scrolling */}
      {createPortal(
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#c80000] border-b border-red-900/30 h-14 px-4 flex items-center justify-between shadow-md select-none">
          <button
            type="button"
            onClick={() => setShowSideMenu(true)}
            className="p-2 -ml-1.5 rounded-full text-white hover:bg-white/15 active:bg-white/25 transition-colors flex items-center justify-center"
            aria-label="Menu options"
          >
            <Menu className="w-6 h-6 stroke-[2.25]" />
          </button>

          <LanguageSwitch variant="onRed" />
        </header>,
        document.body
      )}

      <SideMenuDrawer
        isOpen={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />

      <AnimatePresence>
        {showUpdatePrompt && currentUser && (
          <UpdatePromptModal 
            donor={currentUser}
            onUpdate={(newDate) => {
              const updatedUser = { 
                ...currentUser, 
                lastDonationDate: newDate, 
                timesDonated: (Number(currentUser.timesDonated) || 0) + 1 
              };
              setCurrentUser(updatedUser);
              safeSetItem("donor_session", JSON.stringify(updatedUser));
              setShowUpdatePrompt(false);
            }}
            onClose={() => setShowUpdatePrompt(false)}
          />
        )}
        {showLogoutConfirm && (
          <LogoutConfirmModal
            onConfirm={handleLogout}
            onClose={() => setShowLogoutConfirm(false)}
          />
        )}
        {showRegisterPrompt && !currentUser && (
          <RegisterPromptModal
            onRegister={() => {
              setShowRegisterPrompt(false);
              navigate("/register");
            }}
            onMaybeLater={() => {
              safeSetItem("register_prompt_dismissed_at", Date.now().toString());
              setShowRegisterPrompt(false);
            }}
            onNeverShowAgain={() => {
              safeSetItem("register_prompt_status", "never");
              setShowRegisterPrompt(false);
            }}
          />
        )}
      </AnimatePresence>

      <div className="w-full max-w-sm px-4 text-center space-y-2.5">
        <div className="flex items-center justify-center gap-3.5">
          <div className="w-12 h-12 shrink-0 bg-[#c80000] rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 100 100">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M 50 12.6 C 36 32, 18.8 46, 18.8 60.5 C 18.8 77.5, 32.8 89.8, 50 89.8 C 67.2 89.8, 81.2 77.5, 81.2 60.5 C 81.2 46, 64 32, 50 12.6 Z M 50 48 A 16.25 16.25 0 1 0 50 80.5 A 16.25 16.25 0 1 0 50 48 Z"
              />
            </svg>
          </div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
            BloodLink
          </h2>
        </div>

        <div className="flex items-center justify-center gap-2.5 pt-0.5">
          <span className="h-[1.5px] w-6 bg-red-200 rounded-full" aria-hidden="true" />
          <p className="text-slate-600 font-semibold text-xs tracking-wide">
            {lang === "bn" ? "রক্ত দিন, জীবন বাঁচান" : "Donate Blood, Save Lives"}
          </p>
          <span className="h-[1.5px] w-6 bg-red-200 rounded-full" aria-hidden="true" />
        </div>

        {currentUser && !getDonorEligibility(currentUser.lastDonationDate, lang).isEligible && (
          <div className="pt-0.5">
            <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl inline-block whitespace-nowrap">
              {lang === "bn"
                ? `আবার রক্ত দিতে পারবেন: ${getDonorEligibility(currentUser.lastDonationDate, lang).nextEligibleDate}`
                : `Eligible to donate again on ${getDonorEligibility(currentUser.lastDonationDate, lang).nextEligibleDate}`}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 w-full gap-5 max-w-sm px-4">
        <button
          onClick={() => navigate("/search")}
          className="flex flex-col items-center gap-4 bg-red-50 border-2 border-red-600 p-8 rounded-3xl transition-all duration-150 ease-out active:scale-[0.99] shadow-sm hover:bg-red-100/50"
        >
          <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg">
            <Search className="w-8 h-8" />
          </div>
          <div className="text-center">
            <div className="font-bold text-xl text-red-700">
              {lang === "bn" ? "রক্ত খুঁজছেন" : "Looking for Blood"}
            </div>
            <div className="text-xs text-red-600/70 opacity-80 mt-1">
              {lang === "bn" ? "কাছাকাছি রক্তদাতা খুঁজুন" : "Find nearest available donors"}
            </div>
          </div>
        </button>

        {currentUser ? (
          <button
            onClick={() => navigate(`/profile/${currentUser.id}`, { state: { donor: currentUser } })}
            className="flex flex-col items-center gap-4 bg-emerald-50 border-2 border-emerald-600 p-8 rounded-3xl transition-all duration-150 ease-out active:scale-[0.99] shadow-sm hover:bg-emerald-100/50"
          >
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg">
              <User className="w-8 h-8" />
            </div>
            <div className="text-center">
              <div className="font-bold text-xl text-emerald-700">
                {lang === "bn" ? "আমার প্রোফাইল দেখুন" : "View My Profile"}
              </div>
              <div className="text-xs text-emerald-600/70 opacity-80 mt-1">
                {lang === "bn" ? "আপনার তথ্য ও রক্তদানের ইতিহাস দেখুন" : "Manage your status & history"}
              </div>
            </div>
          </button>
        ) : (
          <button
            onClick={() => navigate("/register")}
            className="flex flex-col items-center gap-4 bg-emerald-50 border-2 border-emerald-600 p-8 rounded-3xl transition-all duration-150 ease-out active:scale-[0.99] shadow-sm hover:bg-emerald-100/50"
          >
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg">
              <UserPlus className="w-8 h-8" />
            </div>
            <div className="text-center">
              <div className="font-bold text-xl text-emerald-700">
                {lang === "bn" ? "রক্তদাতা হিসেবে নিবন্ধন" : "Register as Donor"}
              </div>
              <div className="text-xs text-emerald-600/70 opacity-80 mt-1">
                {lang === "bn" ? "জীবন বাঁচানো মানুষদের দলে যোগ দিন" : "Join our network of heroes"}
              </div>
            </div>
          </button>
        )}

        {/* Blood Transfusion Compatibility Chart */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-red-700 px-4 py-3 text-center">
            <h3 className="text-xs font-black text-white uppercase tracking-wide flex items-center justify-center gap-1.5 whitespace-nowrap">
              <Droplets className="w-4 h-4 shrink-0" />
              {lang === "bn" ? "রক্ত সঞ্চালনের সামঞ্জস্যতা" : "Blood Transfusion Compatibility"}
            </h3>
          </div>
          <div className="overflow-hidden">
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 divide-x divide-slate-200 text-[8.5px] font-black text-slate-500 uppercase tracking-wide">
                  <th className="w-[18%] py-2.5 px-1.5 text-center whitespace-nowrap">
                    {lang === "bn" ? "গ্রুপ" : "Group"}
                  </th>
                  <th className="w-[41%] py-2.5 px-2 whitespace-nowrap">
                    {lang === "bn" ? "যাদের দিতে পারবেন" : "Can Donate To"}
                  </th>
                  <th className="w-[41%] py-2.5 px-2 whitespace-nowrap">
                    {lang === "bn" ? "যাদের থেকে নিতে পারবেন" : "Can Receive From"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {[
                  { group: "A+", donate: "A+, AB+", receive: "A+, A-, O+, O-" },
                  { group: "A-", donate: "A+, A-, AB+, AB-", receive: "A-, O-" },
                  { group: "B+", donate: "B+, AB+", receive: "B+, B-, O+, O-" },
                  { group: "B-", donate: "B+, B-, AB+, AB-", receive: "B-, O-" },
                  { group: "AB+", donate: "AB+", receive: lang === "bn" ? "সকল গ্রুপ" : "All Groups" },
                  { group: "AB-", donate: "AB+, AB-", receive: "AB-, A-, B-, O-" },
                  { group: "O+", donate: "O+, A+, B+, AB+", receive: "O+, O-" },
                  { group: "O-", donate: lang === "bn" ? "সকল গ্রুপ" : "All Groups", receive: "O-" },
                ].map((row) => (
                  <tr key={row.group} className="divide-x divide-slate-200 hover:bg-red-50/40 transition-colors">
                    <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                      <span className="inline-flex items-center justify-center w-8 h-6 rounded-lg bg-red-50 text-red-700 font-black text-[11px] border border-red-100">
                        {row.group}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-slate-700 text-[10px] whitespace-nowrap">{row.donate}</td>
                    <td className="py-2.5 px-2 font-semibold text-slate-600 text-[10px] whitespace-nowrap">{row.receive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="h-2 w-full bg-red-700"></div>
        </div>

        {currentUser && (
          <button 
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-700 transition-colors"
          >
            {lang === "bn" ? "লগ আউট / আপনি নন?" : "Log out / Not you?"}
          </button>
        )}
      </div>

      <div className="w-full max-w-sm px-4 space-y-4">
        <div className="flex items-center justify-center gap-2 px-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {lang === "bn" ? "৪,১০২ জন রক্তদাতা উপলব্ধ" : "4,102 Donors Available"}
          </span>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50">
          <p className="text-[11px] font-bold italic text-slate-600 leading-relaxed text-center tracking-wide">
            {lang === "bn" ? "জীবন বাঁচানোর জন্য একটি অলাভজনক উদ্যোগ" : "A non-profit platform that saves lives"}
          </p>
        </div>
      </div>
    </div>
  );
};

// ... registration components will go here

const SplashScreen = () => {
  const { lang } = useLanguage();
  return (
    <motion.div
      key="splash-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-between py-12 px-6 select-none"
    >
      <div />

      <div className="flex flex-col items-center text-center">
        {/* Square Logo with Rounded Edges & Heartbeat Ripple */}
        <div className="relative flex items-center justify-center mb-6">
          <motion.div
            animate={{ scale: [1, 1.35, 1.5], opacity: [0.35, 0.12, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            className="absolute w-20 h-20 rounded-[1.5rem] bg-[#c80000]/25"
          />
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-20 h-20 bg-[#c80000] rounded-[1.5rem] flex items-center justify-center shadow-xl overflow-hidden"
          >
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 100 100">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M 50 12.6 C 36 32, 18.8 46, 18.8 60.5 C 18.8 77.5, 32.8 89.8, 50 89.8 C 67.2 89.8, 81.2 77.5, 81.2 60.5 C 81.2 46, 64 32, 50 12.6 Z M 50 48 A 16.25 16.25 0 1 0 50 80.5 A 16.25 16.25 0 1 0 50 48 Z"
              />
            </svg>
          </motion.div>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-4xl font-extrabold text-slate-900 tracking-tight leading-none"
        >
          BloodLink
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex items-center justify-center gap-2.5 mt-3"
        >
          <span className="h-[1.5px] w-6 bg-red-200 rounded-full" aria-hidden="true" />
          <p className="text-slate-600 font-semibold text-xs tracking-wide">
            {lang === "bn" ? "রক্ত দিন, জীবন বাঁচান" : "Donate Blood, Save Lives"}
          </p>
          <span className="h-[1.5px] w-6 bg-red-200 rounded-full" aria-hidden="true" />
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="text-[11px] font-bold italic text-slate-400 tracking-wide text-center"
      >
        {lang === "bn" ? "জীবন বাঁচানোর জন্য একটি অলাভজনক উদ্যোগ" : "A non-profit platform that saves lives"}
      </motion.p>
    </motion.div>
  );
};

const SessionRouteTracker: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hasRestoredRef = useRef(false);

  // Restore previous route on initial load if user landed on "/" from a background restart or shortcut
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    try {
      const lastRoute = safeGetItem("bloodlink_last_route");
      const lastTimeStr = safeGetItem("bloodlink_last_route_time");
      if (lastRoute && lastRoute !== "/" && lastTimeStr) {
        const elapsed = Date.now() - parseInt(lastTimeStr, 10);
        // If returning within 4 hours, restore the exact route and state
        if (elapsed < 4 * 60 * 60 * 1000) {
          if (location.pathname === "/") {
            let restoredState = undefined;
            try {
              const savedState = safeGetItem("bloodlink_last_route_state");
              if (savedState) restoredState = JSON.parse(savedState);
            } catch {}
            navigate(lastRoute, { state: restoredState, replace: true });
          }
        }
      }
    } catch {}
  }, [navigate, location.pathname]);

  // Track and save route whenever it changes
  useEffect(() => {
    try {
      safeSetItem("bloodlink_last_route", location.pathname);
      safeSetItem("bloodlink_last_route_time", Date.now().toString());
      if (location.state) {
        safeSetItem("bloodlink_last_route_state", JSON.stringify(location.state));
      }
    } catch {}
  }, [location.pathname, location.state]);

  // Handle visibilitychange & pagehide events to ensure state is committed before mobile OS suspends tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        try {
          safeSetItem("bloodlink_last_route", location.pathname);
          safeSetItem("bloodlink_last_route_time", Date.now().toString());
          if (location.state) {
            safeSetItem("bloodlink_last_route_state", JSON.stringify(location.state));
          }
        } catch {}
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handleVisibility);
    };
  }, [location.pathname, location.state]);

  return null;
};

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    try {
      // If user has already seen splash in this active session, don't show it again upon returning
      return sessionStorage.getItem("bloodlink_splash_seen") !== "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (showSplash) {
      try {
        sessionStorage.setItem("bloodlink_splash_seen", "true");
      } catch {}
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  return (
    <LanguageProvider>
      <BrowserRouter>
        <SessionRouteTracker />
        <AnimatePresence>
          {showSplash && <SplashScreen />}
        </AnimatePresence>
        <Routes>
          <Route path="/" element={<HomeWrapper />} />
          <Route path="/register" element={<RegisterWrapper />} />
          <Route path="/search" element={<SearchWrapper />} />
          <Route path="/donors" element={<ListWrapper />} />
          <Route path="/profile/:id" element={<ProfileWrapper />} />
          <Route path="/learn" element={<LearnWrapper />} />
          <Route path="/blogs" element={<BlogsWrapper />} />
          <Route path="/team" element={<TeamWrapper />} />
          <Route path="/helplines" element={<HelplinesWrapper />} />
          <Route path="/support" element={<SupportWrapper />} />
          <Route path="/how-to-use" element={<HowToUseWrapper />} />
          <Route path="/tutorial" element={<HowToUseWrapper />} />
          <Route path="*" element={<HomeWrapper />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

const HowToUseWrapper = () => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION}>
    <HowToUseAppView />
  </motion.div>
);

const SupportWrapper = () => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION}>
    <SupportUsView />
  </motion.div>
);

const HelplinesWrapper = () => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION}>
    <NationalHelplinesView />
  </motion.div>
);

const LearnWrapper = () => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION}>
    <LearnAboutDonationView />
  </motion.div>
);

const BlogsWrapper = () => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION}>
    <BlogsPortalView />
  </motion.div>
);

const TeamWrapper = () => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION}>
    <MeetOurTeamView />
  </motion.div>
);

const HomeWrapper = () => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION}>
    <Home />
  </motion.div>
);

const RegisterWrapper = () => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION}>
    <RegisterView />
  </motion.div>
);

const SearchWrapper = () => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION}>
    <SearchView />
  </motion.div>
);

const ListWrapper = () => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION}>
    <DonorListView />
  </motion.div>
);

const ProfileWrapper = () => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION}>
    <ProfileView />
  </motion.div>
);

// Sub-views implementations (Drafting first, will refine in next edits)
const RegisterView = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [step, setStep] = useState<"phone" | "details">(() => {
    const pendingPhone = safeGetItem("pending_reg_phone");
    return pendingPhone ? "details" : "phone";
  });
  const [phone, setPhone] = useState(() => safeGetItem("pending_reg_phone") || "");
  const [existingDonor, setExistingDonor] = useState<Donor | null>(null);

  useEffect(() => {
    try {
      const saved = safeGetItem("donor_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isValidDonor(parsed)) {
          navigate(`/profile/${parsed.id}`, { state: { donor: parsed }, replace: true });
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [navigate]);

  const onVerified = (verifiedPhone: string, donorExists: Donor | null) => {
    setPhone(verifiedPhone);
    if (donorExists && isValidDonor(donorExists)) {
      safeRemoveItem("pending_reg_phone");
      setExistingDonor(donorExists);
    } else {
      safeSetItem("pending_reg_phone", verifiedPhone);
      setStep("details");
    }
  };

  useEffect(() => {
    if (existingDonor) {
      // Save session for existing user
      safeSetItem("donor_session", JSON.stringify(existingDonor));
      safeRemoveItem("pending_reg_phone");
      
      // Small delay to show "Verified" state
      const timer = setTimeout(() => {
        navigate(`/profile/${existingDonor.id}`, { state: { donor: existingDonor }, replace: true });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [existingDonor, navigate]);

  const handleLayoutBack = () => {
    if (step === "details") {
      safeRemoveItem("pending_reg_phone");
      setStep("phone");
    } else {
      navigate("/");
    }
  };

  return (
    <Layout
      title={
        step === "phone"
          ? lang === "bn" ? "পরিচয় যাচাই করুন" : "Verify Identity"
          : lang === "bn" ? "প্রোফাইল সম্পন্ন করুন" : "Complete Profile"
      }
      onBack={handleLayoutBack}
    >
      {existingDonor ? (
        <motion.div
          key="verified-existing"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={PAGE_TRANSITION}
          className="flex flex-col items-center justify-center space-y-4 py-20 bg-white rounded-3xl border border-slate-100"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">
            {lang === "bn" ? "অ্যাকাউন্ট পাওয়া গেছে!" : "Account Found!"}
          </h3>
          <p className="text-slate-500 text-sm">
            {lang === "bn"
              ? `${existingDonor.name} হিসেবে লগ ইন করা হচ্ছে...`
              : `Logging you in as ${existingDonor.name}...`}
          </p>
        </motion.div>
      ) : step === "phone" ? (
        <motion.div
          key="phone-step"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={PAGE_TRANSITION}
        >
          <PhoneVerification onVerified={onVerified} />
        </motion.div>
      ) : (
        <motion.div
          key="details-step"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={PAGE_TRANSITION}
        >
          <RegistrationForm initialPhone={phone} />
        </motion.div>
      )}
    </Layout>
  );
};

const PhoneVerification = ({ onVerified }: { onVerified: (phone: string, donor: Donor | null) => void }) => {
  const { lang } = useLanguage();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 11) {
      setError(lang === "bn" ? "অনুগ্রহ করে একটি সঠিক ১১ ডিজিটের ফোন নম্বর দিন" : "Please enter a valid phone number");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await sendOtp(phone);
      setIsOtpSent(true);
      if (res.debugOtp) setDebugOtp(res.debugOtp);
    } catch (err) {
      setError(lang === "bn" ? "ওটিপি পাঠানো যায়নি। আবার চেষ্টা করুন।" : "Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await verifyOtp(phone, otp);
      onVerified(phone, res.existingDonor);
    } catch (err) {
      setError(lang === "bn" ? "ভুল ওটিপি কোড। অনুগ্রহ করে যাচাই করে আবার চেষ্টা করুন।" : "Invalid OTP code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center space-x-4">
        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-black text-slate-800 tracking-tight text-lg leading-tight">
            {lang === "bn" ? "নিরাপদ প্রবেশাধিকার" : "Secure Access"}
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            {lang === "bn" ? "দ্বি-স্তর পরিচয় যাচাই" : "Two-Step Identity Sync"}
          </p>
        </div>
      </div>

      <form onSubmit={isOtpSent ? handleVerifyOtp : handleSendOtp} className="space-y-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-[10px] font-black uppercase tracking-wider border border-red-100 flex items-center gap-3">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block px-1">
              {lang === "bn" ? "ফোন নম্বর" : "Phone Number"}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                required
                disabled={isOtpSent}
                type="tel"
                placeholder="01XXXXXXXXX"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-3 focus:ring-2 focus:ring-red-600 font-medium disabled:opacity-50"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>

          {isOtpSent && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={FAST_TRANSITION}
            >
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block px-1">
                {lang === "bn" ? "৬-ডিজিটের ওটিপি দিন" : "Enter 6-Digit OTP"}
              </label>
              <div className="flex gap-2 justify-center">
                <input
                  required
                  autoFocus
                  type="text"
                  maxLength={6}
                  placeholder="· · · · · ·"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 text-center text-2xl font-black tracking-[0.5em] focus:ring-2 focus:ring-red-600"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                />
              </div>
              {debugOtp && (
                <p className="text-[10px] text-center mt-3 text-emerald-600 bg-emerald-50 py-1 rounded-lg">
                  {lang === "bn" ? "টেস্ট ওটিপি কোড:" : "Debug OTP:"} <span className="font-bold tracking-widest">{debugOtp}</span>
                </p>
              )}
            </motion.div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-red-800 active:scale-[0.99] transition-all duration-150 uppercase tracking-widest text-xs disabled:bg-slate-300"
        >
          {loading
            ? lang === "bn" ? "প্রক্রিয়াধীন..." : "Processing..."
            : isOtpSent
            ? lang === "bn" ? "যাচাই করে এগিয়ে যান" : "Verify & Continue"
            : lang === "bn" ? "ওটিপি পাঠান" : "Send OTP"}
        </button>

        {isOtpSent && (
          <button
            type="button"
            onClick={() => setIsOtpSent(false)}
            className="w-full text-center text-xs font-bold text-slate-400 py-2 hover:text-red-700"
          >
            {lang === "bn" ? "ফোন নম্বর পরিবর্তন করুন" : "Change Phone Number"}
          </button>
        )}
      </form>
    </div>
  );
};

const SearchView = () => {
  const { lang } = useLanguage();
  return (
    <Layout title={lang === "bn" ? "রক্তদাতা খুঁজুন" : "Search Donors"}>
      <SearchForm />
    </Layout>
  );
};

const DonorListView = () => {
  const { lang } = useLanguage();
  return (
    <Layout title={lang === "bn" ? "উপলব্ধ রক্তদাতা" : "Available Donors"}>
      <DonorList />
    </Layout>
  );
};

const ProfileView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLanguage();
  const handleBack = () => {
    if (location.state?.fromSearch) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };
  return (
    <Layout title={lang === "bn" ? "রক্তদাতার প্রোফাইল" : "Donor Profile"} onBack={handleBack}>
      <DonorProfile />
    </Layout>
  );
};

// --- Form & List Helpers ---
// (These will be populated in detail in the following steps)
const RegistrationForm = ({ initialPhone }: { initialPhone: string }) => {
  const navigate = useNavigate();
  const { lang, n, loc } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    gender: "" as Gender,
    dob: "",
    weight: 0,
    bloodGroup: "A+" as BloodGroup,
    division: "",
    district: "",
    upazila: "",
    phone: initialPhone,
    lastDonationDate: "",
    timesDonated: 0,
  });

  const [districts, setDistricts] = useState<string[]>([]);
  const [upazilas, setUpazilas] = useState<string[]>([]);
  const [isFirstTimeDonor, setIsFirstTimeDonor] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (initialPhone && formData.phone !== initialPhone) {
      setFormData(prev => ({ ...prev, phone: initialPhone }));
    }
  }, [initialPhone, formData.phone]);

  useEffect(() => {
    if (formData.division) {
      setDistricts(LOCATION_DATA.districts[formData.division] || []);
      setFormData(prev => ({ ...prev, district: "", upazila: "" }));
    }
  }, [formData.division]);

  useEffect(() => {
    if (formData.district) {
      setUpazilas(getUpazilas(formData.district));
      setFormData(prev => ({ ...prev, upazila: "" }));
    }
  }, [formData.district]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!formData.gender) {
      setError("Please select your gender.");
      return;
    }

    // Medical Standard Validation: Age
    if (!formData.dob) {
      setError("Please select your complete Date of Birth (Day, Month, and Year).");
      return;
    }

    const age = calculateAge(formData.dob);
    if (age < 18) {
      setError(`Medical Standard: You are currently ${age} years old. Donors must be at least 18 years old to donate blood safely.`);
      return;
    }
    if (age > 60) {
      setError(`Medical Standard: You are currently ${age} years old. Donors must be between 18 and 60 years old for safe blood donation.`);
      return;
    }

    // Medical Standard Validation: Weight
    if (!formData.weight || formData.weight <= 0) {
      setError("Please enter your weight in kg.");
      return;
    }
    if (formData.gender === "Male" && formData.weight < 50) {
      setError(`Medical Standard: Minimum weight for male donors is 50 kg for safe blood donation (you entered ${formData.weight} kg).`);
      return;
    }
    if (formData.gender === "Female" && formData.weight < 45) {
      setError(`Medical Standard: Minimum weight for female donors is 45 kg for safe blood donation (you entered ${formData.weight} kg).`);
      return;
    }

    if (!formData.division || !formData.district || !formData.upazila) {
      setError("Please select your complete Permanent Location (Division, District, and Upazila).");
      return;
    }

    if (!isFirstTimeDonor && !formData.lastDonationDate && formData.timesDonated === 0) {
      setError("Please enter your last donation date or number of donations, or select 'First-Time Donor'.");
      return;
    }

    if (!agreed) {
      setError("Please check the Health & Privacy Declaration box before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = isFirstTimeDonor
        ? { ...formData, lastDonationDate: "", timesDonated: 0 }
        : {
            ...formData,
            timesDonated: formData.timesDonated > 0 ? formData.timesDonated : 1,
          };
      const result = await registerDonor(payload);
      // Save session for new user and clear temporary registration step
      safeSetItem("donor_session", JSON.stringify(result));
      safeRemoveItem("pending_reg_phone");
      navigate(`/profile/${result.id}`, { state: { donor: result }, replace: true });
    } catch (err) {
      setError("Failed to register. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const calculateAge = (dobString: string) => {
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const currentAge = formData.dob ? calculateAge(formData.dob) : null;
  const ageWarning =
    currentAge !== null && (currentAge < 18 || currentAge > 60)
      ? currentAge < 18
        ? `Must be at least 18 years old (currently ${currentAge})`
        : `Maximum eligible donor age is 60 years (currently ${currentAge})`
      : null;

  const minWeight = formData.gender === "Female" ? 45 : 50;
  const weightWarning =
    formData.weight > 0 && formData.weight < minWeight
      ? `Minimum weight for ${formData.gender ? formData.gender.toLowerCase() : ""} donors is ${minWeight} kg`
      : null;

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-[11px] font-bold leading-relaxed border border-red-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block px-1">
            {lang === "bn" ? "পূর্ণ নাম" : "Full Name"}
          </label>
          <input
            required
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-red-600 transition-all"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block px-1">
              {lang === "bn" ? "লিঙ্গ" : "Gender"}
            </label>
            <select
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3"
              value={formData.gender}
              onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value as Gender }))}
            >
              <option value="">{lang === "bn" ? "নির্বাচন করুন" : "Select"}</option>
              <option value="Male">{lang === "bn" ? "পুরুষ" : "Male"}</option>
              <option value="Female">{lang === "bn" ? "নারী" : "Female"}</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block px-1">
              {lang === "bn" ? "রক্তের গ্রুপ" : "Blood Group"}
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-red-700"
              value={formData.bloodGroup}
              onChange={e => setFormData(prev => ({ ...prev, bloodGroup: e.target.value as BloodGroup }))}
            >
              {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block px-1">
              {lang === "bn" ? "জন্ম তারিখ" : "Date of Birth"}
            </label>
            <SimplifiedDatePicker
              required
              type="dob"
              value={formData.dob}
              onChange={val => {
                setFormData(prev => ({ ...prev, dob: val }));
                setError(null);
              }}
            />
            {ageWarning && (
              <p className="text-[10px] font-bold text-red-600 px-1 pt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{ageWarning}</span>
              </p>
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block px-1">
              {lang === "bn" ? "ওজন (কেজি)" : "Weight (kg)"}{" "}
              <span className="text-slate-300 font-semibold">
                • {lang === "bn" ? `সর্বনিম্ন ${n(minWeight)} কেজি` : `Min ${minWeight}kg`}
              </span>
            </label>
            <input
              required
              type="number"
              className={`w-full bg-slate-50 border rounded-xl p-3 font-medium transition-colors ${
                weightWarning ? "border-red-400 bg-red-50/40 text-red-700" : "border-slate-200"
              }`}
              value={formData.weight === 0 ? "" : formData.weight}
              placeholder={lang === "bn" ? `সর্বনিম্ন ${n(minWeight)}` : `Min ${minWeight}`}
              onChange={e => {
                setFormData(prev => ({ ...prev, weight: e.target.value === '' ? 0 : Number(e.target.value) }));
                setError(null);
              }}
              onFocus={e => e.target.select()}
            />
            {weightWarning && (
              <p className="text-[10px] font-bold text-red-600 px-1 pt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{weightWarning}</span>
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
            {lang === "bn" ? "স্থায়ী ঠিকানা" : "Permanent Location"}
          </label>
          <select
            required
            className="w-full bg-white border border-slate-200 rounded-xl p-3"
            value={formData.division}
            onChange={e => setFormData(prev => ({ ...prev, division: e.target.value }))}
          >
            <option value="">{lang === "bn" ? "বিভাগ নির্বাচন করুন" : "Select Division"}</option>
            {LOCATION_DATA.divisions.map(d => <option key={d} value={d}>{loc(d)}</option>)}
          </select>
          <select
            required
            disabled={!formData.division}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 disabled:opacity-50"
            value={formData.district}
            onChange={e => setFormData(prev => ({ ...prev, district: e.target.value }))}
          >
            <option value="">{lang === "bn" ? "জেলা নির্বাচন করুন" : "Select District"}</option>
            {districts.map(d => <option key={d} value={d}>{loc(d)}</option>)}
          </select>
          <select
            required
            disabled={!formData.district}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 disabled:opacity-50"
            value={formData.upazila}
            onChange={e => setFormData(prev => ({ ...prev, upazila: e.target.value }))}
          >
            <option value="">{lang === "bn" ? "উপজেলা নির্বাচন করুন" : "Select Upazila"}</option>
            {upazilas.map(u => <option key={u} value={u}>{loc(u)}</option>)}
          </select>
        </div>

        <div className="hidden">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block px-1">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              required
              readOnly
              type="tel"
              placeholder="017XXXXXXXX"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-3 focus:ring-2 focus:ring-red-600 font-medium"
              value={formData.phone}
              onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            {lang === "bn" ? "রক্তদানের অভিজ্ঞতা" : "Donation Experience"}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setIsFirstTimeDonor(true);
                setFormData(prev => ({ ...prev, lastDonationDate: "", timesDonated: 0 }));
              }}
              className={`py-3 px-3 rounded-xl font-black text-xs transition-all border-2 ${
                isFirstTimeDonor
                  ? "bg-red-700 text-white border-red-700 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-red-200"
              }`}
            >
              {lang === "bn" ? "নতুন রক্তদাতা" : "First-Time Donor"}
            </button>
            <button
              type="button"
              onClick={() => setIsFirstTimeDonor(false)}
              className={`py-3 px-3 rounded-xl font-black text-xs transition-all border-2 ${
                !isFirstTimeDonor
                  ? "bg-red-700 text-white border-red-700 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-red-200"
              }`}
            >
              {lang === "bn" ? "আগে রক্ত দিয়েছি" : "Donated Before"}
            </button>
          </div>

          {isFirstTimeDonor ? (
            <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl flex items-center gap-2.5">
              <Heart className="w-4 h-4 text-red-600 shrink-0 fill-red-600" />
              <p className="text-[11px] font-semibold text-red-900 leading-snug">
                {lang === "bn" ? (
                  <>স্বাগতম! আপনার প্রোফাইলে <span className="font-black">প্রথম রক্তদানের জন্য প্রস্তুত</span> দেখাবে।</>
                ) : (
                  <>Welcome aboard! Your profile will show <span className="font-black">Ready for First Donation</span>.</>
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block px-1">
                  {lang === "bn" ? "সর্বশেষ রক্তদান" : "Last Donation"}
                </label>
                <SimplifiedDatePicker
                  type="donation"
                  value={formData.lastDonationDate}
                  onChange={val => setFormData(prev => ({ ...prev, lastDonationDate: val }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block px-1">
                  {lang === "bn" ? "কতবার রক্ত দিয়েছেন" : "Times Donated"}
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 font-medium"
                  value={formData.timesDonated === 0 ? "" : formData.timesDonated}
                  placeholder="1"
                  onChange={e => setFormData(prev => ({ ...prev, timesDonated: e.target.value === '' ? 0 : Number(e.target.value) }))}
                  onFocus={e => e.target.select()}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 space-y-3 shadow-inner">
        <div className="flex items-start gap-4">
          <div className="pt-1">
            <input 
              type="checkbox" 
              id="declaration"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-5 h-5 accent-red-700 cursor-pointer" 
            />
          </div>
          <label htmlFor="declaration" className="text-[10px] leading-relaxed font-medium text-slate-500 cursor-pointer select-none">
            <strong className="text-slate-900 block mb-1 uppercase tracking-[0.1em] font-black">
              {lang === "bn" ? "স্বাস্থ্য ও গোপনীয়তা ঘোষণা" : "Health & Privacy Declaration"}
            </strong>
            {lang === "bn" ? (
              <>
                আমি নিশ্চিত করছি যে আমি রক্তদানের জন্য শারীরিক ও মানসিকভাবে সুস্থ। আমি ঘোষণা করছি যে আমি <strong>ধূমপান বা মাদক গ্রহণ করি না</strong> এবং আমার কোনো সংক্রামক ব্যাধি নেই। জীবন বাঁচাতে জরুরি রক্তের প্রয়োজনে আমার নাম, ফোন নম্বর ও ঠিকানা <strong>সবার জন্য দৃশ্যমান</strong> থাকবে বলে আমি সম্মতি দিচ্ছি।
              </>
            ) : (
              <>
                I hereby confirm that I am physically and mentally fit to donate blood. I declare that I do <strong>NOT smoke, consume alcohol</strong>, or have any transmittable diseases. I acknowledge that my profile details (name, phone, location) will be <strong>publicly visible</strong> to facilitate life-saving blood requests.
                <span className="block mt-2 text-slate-400 italic">Note: If you delete your account, your data will be securely stored to allow future reactivation, but your profile will no longer appear in search results.</span>
              </>
            )}
          </label>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={FAST_TRANSITION}
          className="p-4 bg-red-50 text-red-700 rounded-2xl text-xs font-bold leading-relaxed border border-red-200 flex items-start gap-2.5 shadow-sm"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </motion.div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-red-800 disabled:opacity-50 transition-colors uppercase tracking-widest text-xs"
      >
        {submitting
          ? lang === "bn" ? "নিবন্ধন সম্পন্ন হচ্ছে..." : "Completing Registration..."
          : lang === "bn" ? "নিবন্ধন সম্পন্ন করুন" : "Complete Registration"}
      </button>
    </form>
  );
};

const BLOOD_COMPATIBILITY: Record<BloodGroup, { donateTo: string; receiveFrom: BloodGroup[] }> = {
  "A+": { donateTo: "A+, AB+", receiveFrom: ["A+", "A-", "O+", "O-"] },
  "A-": { donateTo: "A+, A-, AB+, AB-", receiveFrom: ["A-", "O-"] },
  "B+": { donateTo: "B+, AB+", receiveFrom: ["B+", "B-", "O+", "O-"] },
  "B-": { donateTo: "B+, B-, AB+, AB-", receiveFrom: ["B-", "O-"] },
  "AB+": { donateTo: "AB+", receiveFrom: ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"] },
  "AB-": { donateTo: "AB+, AB-", receiveFrom: ["AB-", "A-", "B-", "O-"] },
  "O+": { donateTo: "O+, A+, B+, AB+", receiveFrom: ["O+", "O-"] },
  "O-": { donateTo: "All Groups", receiveFrom: ["O-"] },
};

const SearchForm = () => {
  const navigate = useNavigate();
  const { lang, loc } = useLanguage();
  const [query, setQuery] = useState<{
    bloodGroup: BloodGroup;
    division: string;
    district: string;
    upazila: string;
  }>(() => {
    try {
      const saved = safeGetItem("bloodlink_saved_search");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      bloodGroup: "" as any as BloodGroup,
      division: "",
      district: "",
      upazila: "",
    };
  });
  const [error, setError] = useState(false);

  const districts = query.division ? LOCATION_DATA.districts[query.division] || [] : [];
  const upazilas = query.district ? getUpazilas(query.district) : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.bloodGroup) {
      setError(true);
      return;
    }
    safeSetItem("bloodlink_saved_search", JSON.stringify(query));
    safeSetItem("bloodlink_saved_search_scope", "upazila");
    navigate("/donors", { state: { query, scope: "upazila" } });
  };

  return (
    <form onSubmit={handleSearch} className="space-y-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-3 px-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {lang === "bn" ? "প্রয়োজনীয় রক্তের গ্রুপ" : "Required Blood Group"}
            </label>
            {error && !query.bloodGroup && (
              <span className="text-[10px] font-bold text-red-600 uppercase">
                {lang === "bn" ? "নির্বাচন আবশ্যক" : "Selection Required"}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {BLOOD_GROUPS.map(bg => (
              <button
                key={bg}
                type="button"
                onClick={() => {
                  setQuery(prev => ({ ...prev, bloodGroup: bg }));
                  setError(false);
                }}
                className={`py-3 rounded-xl font-black transition-colors border-2 ${
                  query.bloodGroup === bg 
                  ? "bg-red-700 text-white border-red-700 shadow-sm"
                  : "bg-white text-slate-600 border-slate-100 hover:border-red-200"
                } ${error && !query.bloodGroup ? "border-red-200" : ""}`}
              >
                {bg}
              </button>
            ))}
          </div>

          {query.bloodGroup && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={FAST_TRANSITION}
              className="mt-3 px-3 py-2.5 bg-red-50/70 border border-red-100 rounded-xl flex items-center justify-between gap-2"
            >
              <span className="text-[10px] leading-none font-bold text-slate-600 whitespace-nowrap shrink-0">
                <strong className="text-red-700">{query.bloodGroup}</strong>{" "}
                {lang === "bn" ? "রক্ত নিতে পারবে:" : "can receive from:"}
              </span>
              {query.bloodGroup === "AB+" ? (
                <span className="px-2 h-5 inline-flex items-center justify-center rounded-md text-[9.5px] leading-none font-black bg-red-700 text-white border border-red-700 whitespace-nowrap shrink-0">
                  {lang === "bn" ? "যেকোনো গ্রুপ" : "Any blood group"}
                </span>
              ) : query.bloodGroup === "O-" ? (
                <span className="px-2 h-5 inline-flex items-center justify-center rounded-md text-[9.5px] leading-none font-black bg-red-700 text-white border border-red-700 whitespace-nowrap shrink-0">
                  {lang === "bn" ? "শুধুমাত্র O-" : "O- Only"}
                </span>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  {BLOOD_COMPATIBILITY[query.bloodGroup].receiveFrom
                    .filter(group => group !== query.bloodGroup)
                    .map(group => (
                      <span
                        key={group}
                        className="w-7 h-5 inline-flex items-center justify-center rounded-md text-[10px] leading-none font-black bg-red-700 text-white border border-red-700 shrink-0 whitespace-nowrap"
                      >
                        {group}
                      </span>
                    ))}
                </div>
              )}
            </motion.div>
          )}
        </div>

        <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
            {lang === "bn" ? "এলাকা নির্বাচন করুন" : "Search Area"}
          </label>
          <select
            required
            className="w-full bg-white border border-slate-200 rounded-xl p-3"
            value={query.division}
            onChange={e => setQuery(prev => ({ ...prev, division: e.target.value, district: "", upazila: "" }))}
          >
            <option value="">{lang === "bn" ? "বিভাগ নির্বাচন করুন" : "Select Division"}</option>
            {LOCATION_DATA.divisions.map(d => <option key={d} value={d}>{loc(d)}</option>)}
          </select>
          <select
            required
            disabled={!query.division}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 disabled:opacity-50"
            value={query.district}
            onChange={e => setQuery(prev => ({ ...prev, district: e.target.value, upazila: "" }))}
          >
            <option value="">{lang === "bn" ? "জেলা নির্বাচন করুন" : "Select District"}</option>
            {districts.map(d => <option key={d} value={d}>{loc(d)}</option>)}
          </select>
          <select
            required
            disabled={!query.district}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 disabled:opacity-50"
            value={query.upazila}
            onChange={e => setQuery(prev => ({ ...prev, upazila: e.target.value }))}
          >
            <option value="">{lang === "bn" ? "উপজেলা নির্বাচন করুন" : "Select Upazila"}</option>
            {upazilas.map(u => <option key={u} value={u}>{loc(u)}</option>)}
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 transition-colors flex items-center justify-center space-x-2 uppercase tracking-widest text-xs"
      >
        <Search className="w-4 h-4" />
        <span>{lang === "bn" ? "রক্তদাতা খুঁজুন" : "Find Eligible Donors"}</span>
      </button>
    </form>
  );
};
const DonorList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, n, loc } = useLanguage();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [compatibleDonors, setCompatibleDonors] = useState<Donor[]>([]);
  const [filterTab, setFilterTab] = useState<"exact" | "compatible" | "all">("exact");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const compatibleSectionRef = useRef<HTMLDivElement | null>(null);
  
  const query = location.state?.query || (() => {
    try {
      const saved = safeGetItem("bloodlink_saved_search");
      if (saved) return JSON.parse(saved);
    } catch {}
    return undefined;
  })();

  const locationScope: SearchScope =
    (location.state?.scope as SearchScope) ||
    ((safeGetItem("bloodlink_saved_search_scope") as SearchScope) || "upazila");

  // Keep saved search up to date if query exists
  useEffect(() => {
    if (query) {
      safeSetItem("bloodlink_saved_search", JSON.stringify(query));
      safeSetItem("bloodlink_saved_search_scope", locationScope);
    }
  }, [query, locationScope]);

  useEffect(() => {
    setFilterTab("exact");
  }, [query?.division, query?.district, query?.upazila, query?.bloodGroup]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const activeScope: SearchScope = query?.upazila
      ? locationScope
      : query?.district
      ? "district"
      : query?.division
      ? "division"
      : "nationwide";

    const filterOption = query
      ? {
          scope: activeScope,
          upazila: query.upazila,
          district: query.district,
          division: query.division,
        }
      : { scope: "nationwide" as SearchScope };

    const applyFilterAndSort = (allDonors: Donor[]) => {
      const dummyPool = getDummyDonorsForSearch(query, activeScope);
      const seenPhones = new Set<string>();
      const mergedDonors: Donor[] = [];

      for (const d of [...allDonors, ...dummyPool]) {
        if (d && d.isActive !== false && d.phone && !seenPhones.has(d.phone)) {
          seenPhones.add(d.phone);
          mergedDonors.push(d);
        }
      }

      // Filter by active location scope so Upazila search shows Upazila only until expanded
      const locationFilteredDonors = mergedDonors.filter((d) => {
        if (!query) return true;
        if (activeScope === "upazila" && query.upazila) {
          return d.upazila === query.upazila && (!query.district || d.district === query.district);
        }
        if (activeScope === "district" && query.district) {
          return d.district === query.district;
        }
        if (activeScope === "division" && query.division) {
          return d.division === query.division;
        }
        return true;
      });

      if (query) {
        // Sort by: (1) Available/Eligible first, (2) Real-world geographic distance (km) from searched Upazila/District
        const compareByProximity = (a: Donor, b: Donor) => {
          const aEligible = isDonorEligible(a.lastDonationDate) ? 1 : 0;
          const bEligible = isDonorEligible(b.lastDonationDate) ? 1 : 0;
          if (aEligible !== bEligible) {
            return bEligible - aEligible;
          }
          const distA = getLocationDistanceKm(query, a);
          const distB = getLocationDistanceKm(query, b);
          return distA - distB;
        };

        // Exact Blood Group Matches
        const exactFiltered = locationFilteredDonors
          .filter(d => d.bloodGroup === query.bloodGroup)
          .sort(compareByProximity);

        // Other Compatible Blood Group Matches
        const allowedGroups = BLOOD_COMPATIBILITY[query.bloodGroup as BloodGroup]?.receiveFrom || [query.bloodGroup];
        const otherCompatible = locationFilteredDonors
          .filter(d => d.bloodGroup !== query.bloodGroup && allowedGroups.includes(d.bloodGroup))
          .sort(compareByProximity);

        setDonors(exactFiltered);
        setCompatibleDonors(otherCompatible);
      } else {
        setDonors(locationFilteredDonors);
        setCompatibleDonors([]);
      }
      setLoading(false);
    };

    const unsubscribe = subscribeToDonors(
      (liveDonors) => {
        applyFilterAndSort(liveDonors);
      },
      (err) => {
        console.error(err);
        fetchDonors(filterOption)
          .then(applyFilterAndSort)
          .catch(() => {
            setError("Unable to sync donor registry. Please verify your connection.");
            setLoading(false);
          });
      },
      filterOption
    );

    return () => unsubscribe();
  }, [query, locationScope]);

  if (error) return (
    <div className="text-center py-20 px-6 bg-white rounded-[2.5rem] shadow-sm border border-red-100 flex flex-col items-center">
      <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
        <AlertCircle className="w-10 h-10 text-red-600" />
      </div>
      <h3 className="text-slate-800 font-black text-lg mb-2">
        {lang === "bn" ? "সংযোগ ত্রুটি" : "Sync Connection Error"}
      </h3>
      <p className="text-slate-500 text-xs leading-relaxed max-w-[200px] font-medium">
        {error}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-8 text-[10px] font-black text-white uppercase tracking-widest bg-slate-900 py-3 px-8 rounded-xl hover:bg-slate-800 transition-colors"
      >
        {lang === "bn" ? "আবার চেষ্টা করুন" : "Retry Sync"}
      </button>
    </div>
  );

  const compatibilityInfo = query?.bloodGroup ? BLOOD_COMPATIBILITY[query.bloodGroup as BloodGroup] : null;
  const alternativeGroups = compatibilityInfo ? compatibilityInfo.receiveFrom.filter(g => g !== query.bloodGroup) : [];
  const displayedDonors =
    filterTab === "compatible"
      ? compatibleDonors
      : filterTab === "all"
      ? [...donors, ...compatibleDonors]
      : donors;

  const renderDonorCard = (donor: Donor, isAlternative: boolean) => {
    const formatDate = (dateStr: string) => {
      if (!dateStr || dateStr === "Never") return lang === "bn" ? "নতুন রক্তদাতা" : "First-Time Donor";
      return formatReadableDate(dateStr, lang);
    };

    const eligibility = getDonorEligibility(donor.lastDonationDate, lang);

    return (
      <motion.div
        key={donor.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={FAST_TRANSITION}
        onClick={() => navigate(`/profile/${donor.id}`, { state: { donor, fromSearch: true } })}
        className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:border-red-200 active:scale-[0.99] transition-all duration-150"
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-red-700 text-white rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-lg shadow-lg">
              {donor.bloodGroup}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-800 text-lg leading-snug break-words">{donor.name}</h3>
              <p className="text-xs text-slate-500 font-medium flex items-center mt-0.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 mr-1 text-red-600 flex-shrink-0" />
                <span className="truncate">{loc(donor.upazila)}, {loc(donor.district)}</span>
              </p>
              {isAlternative && (
                <div className="mt-1.5">
                  <span className="inline-block py-0.5 px-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9px] font-black uppercase tracking-wider">
                    {lang === "bn" ? "সামঞ্জস্যপূর্ণ" : "Compatible"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-50 space-y-3">
            <div className="flex items-center justify-between bg-slate-50/50 p-3 rounded-2xl border border-slate-50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {lang === "bn" ? "সর্বশেষ রক্তদান" : "Last Donated"}
              </span>
              <span className="text-xs font-bold text-slate-700">{formatDate(donor.lastDonationDate)}</span>
            </div>
            
            <div className="flex items-center justify-between gap-2">
              {eligibility.isEligible ? (
                <div className="flex items-center gap-2 py-1.5 px-3 bg-green-50 rounded-xl border border-green-100 min-w-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full shrink-0"></div>
                  <span className="text-[10px] font-black text-green-700 uppercase tracking-wider truncate">
                    {lang === "bn" ? "উপলব্ধ" : "Available"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 py-1.5 px-2.5 bg-amber-50 rounded-xl border border-amber-100 min-w-0">
                  <div className="w-2 h-2 bg-amber-500 rounded-full shrink-0"></div>
                  <span className="text-[9.5px] font-black text-amber-700 tracking-normal truncate">
                    {lang === "bn"
                      ? `সম্ভাব্য তারিখ: ${eligibility.nextEligibleDate}`
                      : `ELIGIBLE ${eligibility.nextEligibleDate?.replace(
                          /\b([A-Za-z]{3})\b/,
                          (m) => m.toUpperCase()
                        )}`}
                  </span>
                </div>
              )}
              
              <a
                href={`tel:${donor.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center space-x-1.5 bg-slate-900 text-white font-bold py-2.5 px-3.5 rounded-xl hover:bg-slate-800 transition-colors text-[10px] uppercase tracking-wider shadow-md shrink-0"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === "bn" ? "কল" : "Call"}</span>
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const handleShowCompatible = () => {
    setFilterTab("compatible");
    window.scrollTo({ top: 80, behavior: "smooth" });
  };

  const nextScopeAction = query
    ? locationScope === "upazila" && query.district
      ? {
          nextScope: "district" as SearchScope,
          buttonLabel:
            lang === "bn"
              ? `সমগ্র ${loc(query.district)} জেলায় খুঁজুন`
              : `Search All of ${query.district} District`,
          shortLabel:
            lang === "bn"
              ? `${loc(query.district)} জেলায় প্রসারিত করুন`
              : `Expand to ${query.district} District`,
        }
      : locationScope === "district" && query.division
      ? {
          nextScope: "division" as SearchScope,
          buttonLabel:
            lang === "bn"
              ? `সমগ্র ${loc(query.division)} বিভাগে খুঁজুন`
              : `Search All of ${query.division} Division`,
          shortLabel:
            lang === "bn"
              ? `${loc(query.division)} বিভাগে প্রসারিত করুন`
              : `Expand to ${query.division} Division`,
        }
      : locationScope === "division"
      ? {
          nextScope: "nationwide" as SearchScope,
          buttonLabel:
            lang === "bn"
              ? "সারাদেশে খুঁজুন (সমগ্র বাংলাদেশ)"
              : "Search Nationwide (All Bangladesh)",
          shortLabel: lang === "bn" ? "সারাদেশে খুঁজুন" : "Expand Nationwide",
        }
      : null
    : null;

  const currentScopeBadgeLabel = !query
    ? lang === "bn" ? "সমগ্র বাংলাদেশ" : "All Bangladesh"
    : locationScope === "upazila"
    ? loc(query.upazila || query.district)
    : locationScope === "district"
    ? lang === "bn" ? `${loc(query.district)} জেলা` : `${query.district} District`
    : locationScope === "division"
    ? lang === "bn" ? `${loc(query.division)} বিভাগ` : `${query.division} Division`
    : lang === "bn" ? "সমগ্র বাংলাদেশ" : "All Bangladesh";

  const handleExpandLocation = () => {
    if (nextScopeAction) {
      navigate("/donors", {
        state: {
          ...location.state,
          query,
          scope: nextScopeAction.nextScope,
        },
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderCompatibilityPromptCard = (contextLabel: string) => {
    const showCompatBtn =
      Boolean(query?.bloodGroup) &&
      alternativeGroups.length > 0 &&
      compatibleDonors.length > 0 &&
      filterTab !== "compatible";
    const showLocationBtn = Boolean(nextScopeAction);

    if (!showCompatBtn && !showLocationBtn) {
      return null;
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={FAST_TRANSITION}
        className="bg-red-50/80 border-2 border-red-200 rounded-3xl p-5 text-center space-y-3.5 shadow-sm"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider shadow-2xs">
          <Droplets className="w-3.5 h-3.5 fill-red-600 text-red-600" />
          <span>{contextLabel}</span>
        </div>

        {showCompatBtn && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700 leading-relaxed">
              {lang === "bn" ? (
                <>আপনার <strong className="text-red-700 font-black">{query.bloodGroup}</strong> রোগী নিরাপদে নিচের গ্রুপগুলো থেকেও রক্ত নিতে পারবেন:</>
              ) : (
                <>Your <strong className="text-red-700 font-black">{query.bloodGroup}</strong> patient can also safely receive blood from:</>
              )}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
              {alternativeGroups.map((group) => (
                <span
                  key={group}
                  className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-white text-red-700 font-black text-xs border border-red-200 shadow-2xs"
                >
                  {group}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 pt-0.5">
          {showCompatBtn && (
            <button
              type="button"
              onClick={handleShowCompatible}
              className="w-full py-3 px-4 rounded-2xl bg-red-700 text-white font-black text-[11px] uppercase tracking-wider hover:bg-red-800 active:scale-[0.99] transition-all shadow-md"
            >
              {lang === "bn"
                ? `${n(compatibleDonors.length)} জন সামঞ্জস্যপূর্ণ রক্তদাতা দেখুন`
                : `See ${compatibleDonors.length} Compatible ${compatibleDonors.length === 1 ? "Donor" : "Donors"}`}
            </button>
          )}

          {showLocationBtn && nextScopeAction && (
            <button
              type="button"
              onClick={handleExpandLocation}
              className="w-full py-3 px-4 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider hover:bg-slate-800 active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>{nextScopeAction.buttonLabel}</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-2.5">
      {query && (
        <div className="space-y-2">
          {/* Single-line Filter Summary */}
          <div className="flex items-center gap-1.5 overflow-hidden">
            <div className="bg-white border border-slate-200 text-red-700 px-2.5 py-1 rounded-full flex items-center shadow-sm shrink-0">
              <span className="text-[10px] font-black whitespace-nowrap">{query.bloodGroup}</span>
            </div>
            {currentScopeBadgeLabel && (
              <div className="bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full flex items-center shadow-sm text-[9px] font-bold uppercase tracking-wider truncate min-w-0">
                <span className="truncate">{currentScopeBadgeLabel}</span>
              </div>
            )}
            <div className="bg-white border border-slate-200 text-slate-500 px-2.5 py-1 rounded-full flex items-center shadow-sm text-[9px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
              {lang === "bn"
                ? `${n(donors.length)} সঠিক ${alternativeGroups.length > 0 ? `• ${n(compatibleDonors.length)} সামঞ্জস্যপূর্ণ` : ""}`
                : `${donors.length} Exact ${alternativeGroups.length > 0 ? `• ${compatibleDonors.length} Compatible` : ""}`}
            </div>
          </div>

          {/* Prominent Compatibility Bar & Location Expansion Button */}
          {compatibilityInfo && (
            <div className="bg-red-50/75 px-3.5 py-3 rounded-2xl border border-red-200 shadow-sm flex flex-col items-center gap-2">
              {query.bloodGroup === "O-" ? (
                <p className="text-[11px] font-semibold text-slate-700 leading-tight text-center">
                  <strong className="text-red-700 font-black">O-</strong>{" "}
                  {lang === "bn" ? "শুধুমাত্র" : "can only receive from"}{" "}
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-white text-red-700 font-black text-[10px] border border-red-200 ml-0.5">
                    O-
                  </span>
                  {lang === "bn" ? " থেকে রক্ত নিতে পারবে" : ""}
                </p>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-center">
                  <span className="text-[11px] font-bold text-slate-700">
                    <strong className="text-red-700 font-black">{query.bloodGroup}</strong>{" "}
                    {lang === "bn" ? "আরও যাদের থেকে রক্ত নিতে পারবে:" : "can also receive from:"}
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {query.bloodGroup === "AB+" ? (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-white text-red-700 font-black text-[10px] border border-red-200 shadow-2xs">
                        {lang === "bn" ? "সকল গ্রুপ" : "All Blood Groups"}
                      </span>
                    ) : (
                      alternativeGroups.map((group) => (
                        <span
                          key={group}
                          className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-white text-red-700 font-black text-[10px] border border-red-200 shadow-2xs"
                        >
                          {group}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}
              <div className="w-full grid grid-cols-1 gap-1.5">
                {alternativeGroups.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterTab((prev) => (prev === "compatible" ? "exact" : "compatible"));
                      window.scrollTo({ top: 100, behavior: "smooth" });
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors whitespace-nowrap shadow-xs ${
                      filterTab === "compatible"
                        ? "bg-slate-900 text-white"
                        : "bg-red-700 text-white hover:bg-red-800"
                    }`}
                  >
                    {filterTab === "compatible"
                      ? lang === "bn"
                        ? `সঠিক গ্রুপের রক্তদাতা দেখুন (${n(donors.length)})`
                        : `Show exact matches (${donors.length})`
                      : lang === "bn"
                      ? `সামঞ্জস্যপূর্ণ রক্তদাতা দেখুন (${n(compatibleDonors.length)})`
                      : `Show compatible donors (${compatibleDonors.length})`}
                  </button>
                )}

                {nextScopeAction && (
                  <button
                    type="button"
                    onClick={handleExpandLocation}
                    className="w-full py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors whitespace-nowrap shadow-xs bg-white text-slate-800 border border-slate-200 hover:bg-slate-100 flex items-center justify-center gap-1.5"
                  >
                    <MapPin className="w-3 h-3 text-red-600 shrink-0" />
                    <span>{nextScopeAction.buttonLabel}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {displayedDonors.length > 0 && query.upazila && !displayedDonors.some(d => d.upazila === query.upazila) && (
            <div className="bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <p className="text-[10px] font-medium text-amber-900 leading-tight">
                {lang === "bn" ? (
                  <><strong>{loc(query.upazila)}</strong>-এ পাওয়া যায়নি — <strong>{loc(query.district || "")}</strong>-এর নিকটস্থ রক্তদাতা দেখানো হচ্ছে।</>
                ) : (
                  <>No match in <strong>{query.upazila}</strong> — showing closest donors in {query.district || 'nearby areas'}.</>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Neutral Advisory Notice */}
      <div className="bg-slate-100 border border-slate-200/80 px-3 py-2 rounded-xl flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <p className="text-[9px] leading-tight text-slate-600 font-medium">
          <strong className="text-slate-700">{lang === "bn" ? "সতর্কতা:" : "Note:"}</strong>{" "}
          {lang === "bn"
            ? "রক্তদানের পূর্বে হাসপাতালে রক্তদাতার রক্তের গ্রুপ ও স্বাস্থ্য পরীক্ষা করে নিন। আমরা কেবল রোগী ও রক্তদাতার সংযোগ ঘটিয়ে দিই।"
            : "Verify the donor's blood group and health at the hospital before donation. We only connect patients with donors and are not responsible for any complications."}
        </p>
      </div>

      {/* 3-Way Filter Control: Exact Matches, Compatible Donors, All */}
      {compatibleDonors.length > 0 && (
        <div className="w-full flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/90 shadow-2xs select-none">
          <button
            type="button"
            onClick={() => setFilterTab("exact")}
            className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
              filterTab === "exact"
                ? "bg-white text-red-700 shadow-xs border border-red-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {lang === "bn" ? `সঠিক মিল (${n(donors.length)})` : `Exact (${donors.length})`}
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("compatible")}
            className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
              filterTab === "compatible"
                ? "bg-red-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {lang === "bn" ? `সামঞ্জস্যপূর্ণ (${n(compatibleDonors.length)})` : `Compatible (${compatibleDonors.length})`}
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
              filterTab === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {lang === "bn" ? `সবগুলো (${n(donors.length + compatibleDonors.length)})` : `All (${donors.length + compatibleDonors.length})`}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-red-100 border-t-red-700 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {lang === "bn" ? "উপযুক্ত রক্তদাতা খোঁজা হচ্ছে..." : "Finding Eligible Donors..."}
          </p>
        </div>
      ) : displayedDonors.length === 0 ? (
        <div className="space-y-3 pt-1">
          {(filterTab !== "compatible" && compatibleDonors.length > 0) || nextScopeAction ? (
            renderCompatibilityPromptCard(
              lang === "bn"
                ? `${currentScopeBadgeLabel}-এ ০ জন ${query?.bloodGroup || ""} রক্তদাতা পাওয়া গেছে`
                : `0 Exact ${query?.bloodGroup || ""} Matches in ${currentScopeBadgeLabel}`
            )
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={FAST_TRANSITION}
              className="text-center py-14 px-6 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mb-4 shadow-inner">
                <Search className="w-8 h-8 text-slate-200" />
              </div>
              <h3 className="text-slate-800 font-black text-base mb-1">
                {lang === "bn" ? "কোনো রক্তদাতা পাওয়া যায়নি" : "No Donors Found"}
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed max-w-[220px] font-medium">
                {lang === "bn"
                  ? `এই এলাকায় ${query?.bloodGroup} গ্রুপের কোনো রক্তদাতা পাওয়া যায়নি।`
                  : `We couldn't find exact or compatible ${query?.bloodGroup} donors in this area.`}
              </p>
              <button
                onClick={() => navigate("/search")}
                className="mt-4 text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 py-2.5 px-5 rounded-xl hover:bg-red-100 transition-colors"
              >
                {lang === "bn" ? "পুনরায় খুঁজুন" : "Refine Search"}
              </button>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {filterTab === "compatible" ? (
            /* COMPATIBLE DONORS DIRECTLY AT THE TOP */
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Droplets className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="font-bold text-amber-950 leading-snug">
                    {lang === "bn"
                      ? `${query?.bloodGroup} রোগীর জন্য ${n(compatibleDonors.length)} জন সামঞ্জস্যপূর্ণ রক্তদাতা (${query?.bloodGroup === "AB+" ? "অন্যান্য সকল গ্রুপ" : alternativeGroups.join(", ")})`
                      : `${compatibleDonors.length} Compatible Donors (${query?.bloodGroup === "AB+" ? "All Other Groups" : alternativeGroups.join(", ")}) for ${query?.bloodGroup}`}
                  </p>
                </div>
                {donors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterTab("exact")}
                    className="text-[10px] font-black text-red-700 bg-white border border-red-200 py-1 px-2.5 rounded-lg shrink-0 hover:bg-red-50 uppercase tracking-wider"
                  >
                    {lang === "bn" ? `সঠিক মিল (${n(donors.length)})` : `Exact (${donors.length})`}
                  </button>
                )}
              </div>

              {compatibleDonors.map((donor) => renderDonorCard(donor, true))}
            </div>
          ) : filterTab === "exact" ? (
            /* EXACT MATCHES ONLY */
            <div className="space-y-3">
              {donors.map((donor, index) => (
                <React.Fragment key={donor.id}>
                  {renderDonorCard(donor, false)}
                  {index === 9 &&
                    donors.length > 10 &&
                    renderCompatibilityPromptCard(
                      lang === "bn"
                        ? "১০ জন রক্তদাতা দেখানো হয়েছে • আরও দেখতে চান?"
                        : "10 Exact Matches Shown • Need More Options?"
                    )}
                </React.Fragment>
              ))}
              {renderCompatibilityPromptCard(
                lang === "bn"
                  ? `${n(donors.length)} জন রক্তদাতা পাওয়া গেছে • আরও বিকল্প দেখুন`
                  : `${donors.length} Exact ${donors.length === 1 ? "Match" : "Matches"} Found • See Compatible Options`
              )}
            </div>
          ) : (
            /* ALL: BOTH EXACT AND COMPATIBLE WITH CLEAR SECTION HEADERS */
            <div className="space-y-4">
              {donors.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    {lang === "bn"
                      ? `সঠিক গ্রুপের রক্তদাতা (${query?.bloodGroup}) — ${n(donors.length)} জন`
                      : `Exact Matches (${query?.bloodGroup}) — ${donors.length} Found`}
                  </p>
                  {donors.map((donor) => renderDonorCard(donor, false))}
                </div>
              )}

              {compatibleDonors.length > 0 && (
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    {lang === "bn"
                      ? `সামঞ্জস্যপূর্ণ রক্তদাতা (${query?.bloodGroup === "AB+" ? "অন্যান্য সকল গ্রুপ" : alternativeGroups.join(", ")}) — ${n(compatibleDonors.length)} জন`
                      : `Compatible Donors (${query?.bloodGroup === "AB+" ? "All Other Groups" : alternativeGroups.join(", ")}) — ${compatibleDonors.length} Found`}
                  </p>
                  {compatibleDonors.map((donor) => renderDonorCard(donor, true))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EditProfileModal = ({ donor, onUpdate, onClose }: { donor: Donor, onUpdate: (updated: Donor) => void, onClose: () => void }) => {
  const { lang, loc } = useLanguage();
  const [formData, setFormData] = useState<Donor>(donor);
  const [isFirstTimeDonor, setIsFirstTimeDonor] = useState<boolean>(
    (Number(donor.timesDonated) || 0) === 0 && (!donor.lastDonationDate || donor.lastDonationDate === "Never")
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [districts, setDistricts] = useState<string[]>([]);
  const [upazilas, setUpazilas] = useState<string[]>([]);

  useEffect(() => {
    if (formData.division) {
      setDistricts(LOCATION_DATA.districts[formData.division] || []);
    }
  }, [formData.division]);

  useEffect(() => {
    if (formData.district) {
      setUpazilas(getUpazilas(formData.district));
    }
  }, [formData.district]);

  const calculateAge = (dobString: string) => {
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!formData.dob) {
      setError("Please select your complete Date of Birth.");
      return;
    }
    const age = calculateAge(formData.dob);
    if (age < 18) {
      setError(`Medical Standard: You are currently ${age} years old. Donors must be at least 18 years old.`);
      return;
    }
    if (age > 60) {
      setError(`Medical Standard: Donors must be between 18 and 60 years old (currently ${age}).`);
      return;
    }
    if (!formData.weight || formData.weight <= 0) {
      setError("Please enter your weight in kg.");
      return;
    }
    if (formData.gender === "Male" && formData.weight < 50) {
      setError(`Medical Standard: Minimum weight for male donors is 50 kg (you entered ${formData.weight} kg).`);
      return;
    }
    if (formData.gender === "Female" && formData.weight < 45) {
      setError(`Medical Standard: Minimum weight for female donors is 45 kg (you entered ${formData.weight} kg).`);
      return;
    }
    if (!formData.division || !formData.district || !formData.upazila) {
      setError("Please select your complete Permanent Location.");
      return;
    }

    setLoading(true);
    try {
      const payload: Donor = isFirstTimeDonor
        ? { ...formData, lastDonationDate: "", timesDonated: 0 }
        : {
            ...formData,
            timesDonated: (Number(formData.timesDonated) || 0) > 0 ? Number(formData.timesDonated) : 1,
          };
      const updated = await updateDonor(donor.phone, payload);
      onUpdate({ ...payload, ...updated });
      onClose();
    } catch (e) {
      setError("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={FAST_TRANSITION}
      onClick={onClose}
      className="fixed inset-0 w-screen h-[100dvh] z-[110] bg-slate-900/55 backdrop-blur-md flex items-end sm:items-center justify-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={FAST_TRANSITION}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 max-h-[90dvh] overflow-y-auto overscroll-contain"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800">
            {lang === "bn" ? "প্রোফাইল সম্পাদনা" : "Edit Profile"}
          </h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6" /></button>
        </div>
        <form noValidate onSubmit={handleSubmit} className="space-y-5">
           {error && (
             <div className="p-3 bg-red-50 text-red-700 rounded-xl text-[10px] font-black uppercase tracking-wider border border-red-100">
               {error}
             </div>
           )}
           <div className="space-y-4">
             <div>
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                 {lang === "bn" ? "পূর্ণ নাম" : "Full Name"}
               </label>
               <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                    {lang === "bn" ? "লিঙ্গ" : "Gender"}
                  </label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3" value={formData.gender} onChange={e => setFormData(p => ({ ...p, gender: e.target.value as Gender }))}>
                    <option value="Male">{lang === "bn" ? "পুরুষ" : "Male"}</option>
                    <option value="Female">{lang === "bn" ? "নারী" : "Female"}</option>
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                    {lang === "bn" ? "রক্তের গ্রুপ" : "Blood Group"}
                  </label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-red-700" value={formData.bloodGroup} onChange={e => setFormData(p => ({ ...p, bloodGroup: e.target.value as BloodGroup }))}>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
               </div>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                    {lang === "bn" ? "জন্ম তারিখ" : "DOB"}
                  </label>
                  <SimplifiedDatePicker 
                    required
                    type="dob"
                    value={formData.dob}
                    onChange={val => setFormData(p => ({ ...p, dob: val }))}
                  />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                    {lang === "bn" ? "ওজন (কেজি)" : "Weight (kg)"}
                  </label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold" 
                    value={formData.weight === 0 ? "" : formData.weight} 
                    placeholder="0"
                    onChange={e => setFormData(p => ({ ...p, weight: e.target.value === '' ? 0 : Number(e.target.value) }))} 
                    onFocus={e => e.target.select()}
                    required 
                  />
               </div>
             </div>
             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  {lang === "bn" ? "স্থায়ী ঠিকানা" : "Permanent Location"}
                </label>
                <select className="w-full bg-white border border-slate-200 rounded-xl p-3" value={formData.division} onChange={e => setFormData(p => ({ ...p, division: e.target.value, district: "", upazila: "" }))} required>
                  <option value="">{lang === "bn" ? "বিভাগ নির্বাচন করুন" : "Select Division"}</option>
                  {LOCATION_DATA.divisions.map(d => <option key={d} value={d}>{loc(d)}</option>)}
                </select>
                <select className="w-full bg-white border border-slate-200 rounded-xl p-3" value={formData.district} onChange={e => setFormData(p => ({ ...p, district: e.target.value, upazila: "" }))} required disabled={!formData.division}>
                  <option value="">{lang === "bn" ? "জেলা নির্বাচন করুন" : "Select District"}</option>
                  {districts.map(d => <option key={d} value={d}>{loc(d)}</option>)}
                </select>
                <select className="w-full bg-white border border-slate-200 rounded-xl p-3" value={formData.upazila} onChange={e => setFormData(p => ({ ...p, upazila: e.target.value }))} required disabled={!formData.district}>
                  <option value="">{lang === "bn" ? "উপজেলা নির্বাচন করুন" : "Select Upazila"}</option>
                  {upazilas.map(u => <option key={u} value={u}>{loc(u)}</option>)}
                </select>
             </div>
             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                 {lang === "bn" ? "রক্তদানের অভিজ্ঞতা" : "Donation Experience"}
               </label>
               <div className="grid grid-cols-2 gap-2">
                 <button
                   type="button"
                   onClick={() => {
                     setIsFirstTimeDonor(true);
                     setFormData(p => ({ ...p, lastDonationDate: "", timesDonated: 0 }));
                   }}
                   className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all border-2 ${
                     isFirstTimeDonor
                       ? "bg-red-700 text-white border-red-700 shadow-sm"
                       : "bg-white text-slate-600 border-slate-200 hover:border-red-200"
                   }`}
                 >
                   {lang === "bn" ? "নতুন রক্তদাতা" : "First-Time Donor"}
                 </button>
                 <button
                   type="button"
                   onClick={() => setIsFirstTimeDonor(false)}
                   className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all border-2 ${
                     !isFirstTimeDonor
                       ? "bg-red-700 text-white border-red-700 shadow-sm"
                       : "bg-white text-slate-600 border-slate-200 hover:border-red-200"
                   }`}
                 >
                   {lang === "bn" ? "আগে রক্ত দিয়েছি" : "Donated Before"}
                 </button>
               </div>

               {isFirstTimeDonor ? (
                 <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl flex items-center gap-2.5">
                   <Heart className="w-4 h-4 text-red-600 shrink-0 fill-red-600" />
                   <p className="text-[11px] font-semibold text-red-900 leading-snug">
                     {lang === "bn" ? (
                       <>আপনার প্রোফাইলে <span className="font-black">প্রথম রক্তদানের জন্য প্রস্তুত</span> দেখাবে।</>
                     ) : (
                       <>Your profile will display <span className="font-black">Ready for First Donation</span>.</>
                     )}
                   </p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                       {lang === "bn" ? "সর্বশেষ রক্তদান" : "Last Donation"}
                     </label>
                     <SimplifiedDatePicker 
                       type="donation"
                       value={formData.lastDonationDate}
                       onChange={val => setFormData(p => ({ ...p, lastDonationDate: val }))}
                     />
                   </div>
                   <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                       {lang === "bn" ? "কতবার রক্ত দিয়েছেন" : "Times Donated"}
                     </label>
                     <input 
                       type="number" 
                       min={1}
                       className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold" 
                       value={formData.timesDonated === 0 ? "" : formData.timesDonated} 
                       placeholder="1"
                       onChange={e => setFormData(p => ({ ...p, timesDonated: e.target.value === '' ? 0 : Number(e.target.value) }))} 
                       onFocus={e => e.target.select()}
                     />
                   </div>
                 </div>
               )}
             </div>
           </div>
           {error && (
             <div className="p-3.5 bg-red-50 text-red-700 rounded-2xl text-xs font-bold leading-relaxed border border-red-200 flex items-start gap-2">
               <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
               <span>{error}</span>
             </div>
           )}
           <button type="submit" disabled={loading} className="w-full bg-red-700 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-red-800 active:scale-[0.99] disabled:opacity-50 uppercase tracking-widest text-xs transition-all duration-150">
             {loading
               ? lang === "bn" ? "আপডেট হচ্ছে..." : "Updating..."
               : lang === "bn" ? "পরিবর্তন সংরক্ষণ করুন" : "Save Changes"}
           </button>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  );
};

const DonorProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, n, loc } = useLanguage();
  const [donor, setDonor] = useState<Donor | null>(() => {
    if (location.state?.donor && isValidDonor(location.state.donor)) {
      return location.state.donor as Donor;
    }
    try {
      const saved = safeGetItem("donor_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isValidDonor(parsed)) {
          return parsed;
        }
        safeRemoveItem("donor_session");
      }
      return null;
    } catch {
      safeRemoveItem("donor_session");
      return null;
    }
  });
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (location.state?.donor && isValidDonor(location.state.donor)) {
      setDonor(location.state.donor as Donor);
    }
  }, [location.state]);

  useEffect(() => {
    if (location.state?.fromSearch) {
      setIsOwnProfile(false);
      return;
    }
    try {
      const savedDonor = safeGetItem("donor_session");
      if (savedDonor && donor) {
        const currentUser = JSON.parse(savedDonor);
        if (isValidDonor(currentUser)) {
          setIsOwnProfile(currentUser.phone === donor.phone);
        } else {
          safeRemoveItem("donor_session");
          setIsOwnProfile(false);
        }
      } else {
        setIsOwnProfile(false);
      }
    } catch {
      setIsOwnProfile(false);
    }
  }, [donor, location.state]);

  const handleLogout = () => {
    safeRemoveItem("donor_session");
    safeRemoveItem("last_visit");
    setConfirmLogout(false);
    navigate("/");
  };

  if (!donor) return <div>{lang === "bn" ? "কোনো প্রোফাইল তথ্য পাওয়া যায়নি।" : "No profile data found."}</div>;

  const eligibility = getDonorEligibility(donor.lastDonationDate, lang);

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showEdit && (
          <EditProfileModal 
            donor={donor} 
            onUpdate={(updated) => {
              setDonor(updated);
              safeSetItem("donor_session", JSON.stringify(updated));
            }} 
            onClose={() => setShowEdit(false)} 
          />
        )}
        {confirmLogout && (
          <LogoutConfirmModal
            onConfirm={handleLogout}
            onClose={() => setConfirmLogout(false)}
          />
        )}
      </AnimatePresence>

      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 text-center space-y-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-red-50 to-transparent -z-0"></div>
        
        <div className="relative inline-block z-10 pt-4">
          <div className="w-32 h-32 bg-red-700 text-white rounded-[2.5rem] flex items-center justify-center font-black text-5xl shadow-2xl border-8 border-white relative group">
             {donor.bloodGroup}
          </div>
        </div>

        <div className="space-y-1 relative z-10">
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">{donor.name}</h3>
        </div>

        <div className="grid grid-cols-1 py-2">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl shadow-inner space-y-1.5">
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
              {lang === "bn" ? "বর্তমান অবস্থা" : "Status"}
            </p>
            {eligibility.isEligible ? (
              <div className="flex items-center justify-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-bold text-xs text-green-700">
                  {lang === "bn" ? "উপলব্ধ (AVAILABLE)" : "AVAILABLE"}
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="font-bold text-xs text-amber-700">
                    {lang === "bn" ? "অনুপলব্ধ (UNAVAILABLE)" : "UNAVAILABLE"}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-600">
                  {lang === "bn" ? (
                    <>আবার রক্ত দিতে পারবেন: <span className="text-red-700">{eligibility.nextEligibleDate}</span> ({n(eligibility.daysRemaining)} দিন বাকি)</>
                  ) : (
                    <>Able to donate again on <span className="text-red-700">{eligibility.nextEligibleDate}</span> ({eligibility.daysRemaining} {eligibility.daysRemaining === 1 ? "day" : "days"} left)</>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="text-left bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-5">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
              <User className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {lang === "bn" ? "ব্যক্তিগত তথ্য" : "Personal Info"}
              </p>
              <p className="font-bold text-slate-700 text-sm mt-0.5">
                {lang === "bn"
                  ? `${donor.gender === "Male" ? "পুরুষ" : donor.gender === "Female" ? "নারী" : donor.gender} • ${n(donor.weight)} কেজি`
                  : `${donor.gender} • ${donor.weight}kg`}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
              <MapPin className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {lang === "bn" ? "ঠিকানা" : "Location Info"}
              </p>
              <p className="font-bold text-slate-700 text-sm mt-0.5">
                {loc(donor.upazila)}, {loc(donor.district)}
              </p>
              <p className="text-xs text-slate-500">
                {lang === "bn" ? `${loc(donor.division)} বিভাগ` : `${donor.division} Division`}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
              <Droplets className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {lang === "bn" ? "অবদান" : "Impact"}
              </p>
              <p className="font-bold text-slate-700 text-sm mt-0.5">
                {(Number(donor.timesDonated) || 0) === 0
                  ? lang === "bn" ? "প্রথম রক্তদানের জন্য প্রস্তুত" : "Ready for First Donation"
                  : lang === "bn"
                  ? `${n(donor.timesDonated)} বার রক্তদান`
                  : `${donor.timesDonated} ${Number(donor.timesDonated) === 1 ? "Donation" : "Donations"}`}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
              <Calendar className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {lang === "bn" ? "সর্বশেষ রক্তদান" : "Last Donation"}
              </p>
              <p className="font-bold text-slate-700 text-sm mt-0.5">
                {donor.lastDonationDate && donor.lastDonationDate !== "Never"
                  ? formatReadableDate(donor.lastDonationDate, lang)
                  : lang === "bn" ? "নতুন রক্তদাতা" : "First-Time Donor"}
              </p>
              {!eligibility.isEligible && eligibility.nextEligibleDate && (
                <p className="text-xs font-bold text-amber-700 mt-1">
                  {lang === "bn"
                    ? `পরবর্তী রক্তদানের তারিখ: ${eligibility.nextEligibleDate}`
                    : `Next eligible date: ${eligibility.nextEligibleDate}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start space-x-4 pt-2 border-t border-slate-100">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
              <Heart className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {lang === "bn" ? "জন্ম তারিখ" : "Date of Birth"}
              </p>
              <p className="font-bold text-slate-700 text-sm mt-0.5">{formatReadableDate(donor.dob, lang)}</p>
            </div>
          </div>
          <div className="flex items-start space-x-4 pt-2 border-t border-slate-100">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
              <Phone className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {lang === "bn" ? "যোগাযোগের নম্বর" : "Contact Number"}
              </p>
              <p className="font-bold text-slate-700 text-sm mt-0.5">{donor.phone}</p>
            </div>
          </div>
        </div>

        {isOwnProfile && (
          <div className="pt-2 flex flex-col gap-3 relative z-10">
            <button 
              type="button"
              onClick={() => setShowEdit(true)} 
              className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              {lang === "bn" ? "প্রোফাইল সম্পাদনা" : "Edit Profile"}
            </button>
            <button 
              type="button"
              onClick={() => setConfirmLogout(true)}
              className="w-full py-2 text-red-600 text-[10px] font-black uppercase tracking-widest hover:text-red-800 transition-all"
            >
              {lang === "bn" ? "লগ আউট" : "Log Out"}
            </button>
          </div>
        )}

        {!isOwnProfile && (
          <a
            href={`tel:${donor.phone}`}
            className="flex items-center justify-center space-x-3 w-full bg-red-700 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-red-800 transition-colors uppercase tracking-[0.15em] text-sm"
          >
            <Phone className="w-5 h-5 fill-white" />
            <span>{lang === "bn" ? "কল করুন" : "Call"}</span>
          </a>
        )}
      </div>
      
      <div className="text-center pt-4">
        <button 
          onClick={() => navigate("/")}
          className="text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-red-700 transition-colors"
        >
          {lang === "bn" ? "হোম পেজে ফিরে যান" : "Return to Dashboard"}
        </button>
      </div>
    </div>
  );
};
