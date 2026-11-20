import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Medal, Gem, ChevronDown, PlusCircle, X } from "lucide-react";
import { Donor } from "../types";
import { useLanguage } from "../i18n";
import { useBackClose } from "../utils/backStack";
import { useScrollLock } from "../utils/scrollLock";
import {
  BADGES,
  BadgeTier,
  getBadge,
  getBadgeIndex,
  getNextBadge,
  getSeenBadgeIndex,
  setSeenBadgeIndex,
} from "../utils/badges";

export const BadgeIcon: React.FC<{ tier: BadgeTier; size?: number }> = ({ tier, size = 40 }) => {
  const Icon = tier.key === "diamond" ? Gem : Medal;
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 border-2"
      style={{ width: size, height: size, background: tier.soft, borderColor: tier.color, color: tier.color }}
    >
      <Icon style={{ width: size * 0.55, height: size * 0.55 }} />
    </div>
  );
};

/** Small badge chip shown under the donor's name. */
export const BadgeChip: React.FC<{ times: number | string | undefined }> = ({ times }) => {
  const { lang } = useLanguage();
  const tier = getBadge(times);
  if (!tier) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border"
      style={{ background: tier.soft, color: tier.color, borderColor: tier.color }}
    >
      <Medal className="w-3.5 h-3.5" />
      {lang === "bn" ? `${tier.bn} রক্তদাতা` : `${tier.en} Donor`}
    </span>
  );
};

const QuickAddModal: React.FC<{
  donor: Donor;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}> = ({ donor, onConfirm, onClose }) => {
  const { lang, n } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useScrollLock(true);
  useBackClose(true, onClose);
  const next = (Number(donor.timesDonated) || 0) + 1;

  const go = async () => {
    setBusy(true);
    setError(false);
    try {
      await onConfirm();
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => !busy && onClose()}
      className="fixed inset-0 z-[110] flex items-center justify-center p-5 bg-slate-900/55"
    >
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl">
        <h3 className="text-lg font-black text-slate-800">
          {lang === "bn" ? "আজ রক্ত দিয়েছেন?" : "Donated blood today?"}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          {lang === "bn"
            ? `আপনার মোট রক্তদান ${n(donor.timesDonated || 0)} থেকে ${n(next)} হবে এবং সর্বশেষ রক্তদানের তারিখ আজকের তারিখ হবে।`
            : `Your total donations will go from ${donor.timesDonated || 0} to ${next}, and your last donation date will be set to today.`}
        </p>
        {error && (
          <p className="text-xs font-bold text-red-700">
            {lang === "bn" ? "আপডেট করা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।" : "Could not update. Check your internet and try again."}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest"
          >
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={go}
            className="flex-1 py-3 rounded-2xl bg-red-700 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60"
          >
            {busy ? (lang === "bn" ? "অপেক্ষা করুন…" : "Saving…") : lang === "bn" ? "হ্যাঁ, যোগ করুন" : "Yes, add"}
          </button>
        </div>
      </div>
    </motion.div>,
    document.body
  );
};

export const BadgeCard: React.FC<{
  donor: Donor;
  isOwnProfile: boolean;
  canAddDonation: boolean;
  nextEligibleDate?: string;
  onAddDonation: () => Promise<void>;
}> = ({ donor, isOwnProfile, canAddDonation, nextEligibleDate, onAddDonation }) => {
  const { lang, n } = useLanguage();
  const [showInfo, setShowInfo] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [celebrate, setCelebrate] = useState<BadgeTier | null>(null);

  const times = Number(donor.timesDonated) || 0;
  const tier = getBadge(times);
  const next = getNextBadge(times);
  const idx = getBadgeIndex(times);

  // Congratulate (once) when a new, higher badge is reached. Saved on this device.
  useEffect(() => {
    if (!isOwnProfile) return;
    const seen = getSeenBadgeIndex(donor.phone);
    if (idx > seen) {
      if (idx >= 0) setCelebrate(BADGES[idx]);
      setSeenBadgeIndex(donor.phone, idx);
    }
  }, [idx, isOwnProfile, donor.phone]);

  const prevMin = tier ? tier.min : 0;
  const progress = next ? Math.min(100, Math.round(((times - prevMin) / (next.min - prevMin)) * 100)) : 100;
  const name = (b: BadgeTier) => (lang === "bn" ? b.bn : b.en);

  return (
    <div className="text-left bg-white border border-slate-100 rounded-[2rem] p-5 space-y-4 shadow-sm">
      <AnimatePresence>
        {showAdd && (
          <QuickAddModal
            donor={donor}
            onClose={() => setShowAdd(false)}
            onConfirm={async () => {
              await onAddDonation();
              setShowAdd(false);
            }}
          />
        )}
      </AnimatePresence>

      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {lang === "bn" ? "ডোনার ব্যাজ" : "Donor Badge"}
      </p>

      {celebrate && (
        <div
          className="rounded-2xl p-3 flex items-center gap-3 border"
          style={{ background: celebrate.soft, borderColor: celebrate.color }}
        >
          <BadgeIcon tier={celebrate} size={36} />
          <p className="flex-1 text-xs font-bold text-slate-700">
            {lang === "bn"
              ? `অভিনন্দন! আপনি ${name(celebrate)} ব্যাজ পেয়েছেন।`
              : `Congratulations! You earned the ${name(celebrate)} badge.`}
          </p>
          <button type="button" onClick={() => setCelebrate(null)} aria-label="Close" className="p-1 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        {tier ? (
          <BadgeIcon tier={tier} size={52} />
        ) : (
          <div className="w-[52px] h-[52px] rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300">
            <Medal className="w-7 h-7" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-black text-slate-800 text-base leading-tight">
            {tier
              ? lang === "bn"
                ? `${tier.bn} রক্তদাতা`
                : `${tier.en} Donor`
              : lang === "bn"
              ? "এখনও ব্যাজ পাননি"
              : "No badge yet"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {next
              ? lang === "bn"
                ? `${name(next)} ব্যাজের জন্য আরও ${n(next.min - times)} বার রক্তদান বাকি`
                : `${next.min - times} more donation${next.min - times === 1 ? "" : "s"} to reach ${name(next)}`
              : lang === "bn"
              ? "আপনি সর্বোচ্চ ব্যাজ পেয়েছেন!"
              : "You have the highest badge!"}
          </p>
        </div>
      </div>

      {next && (
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${progress}%`, background: (tier ?? next).color }} />
        </div>
      )}

      {isOwnProfile && (
        <div className="space-y-2">
          <button
            type="button"
            disabled={!canAddDonation}
            onClick={() => setShowAdd(true)}
            className="w-full py-3.5 rounded-2xl bg-red-700 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400"
          >
            <PlusCircle className="w-4 h-4" />
            {lang === "bn" ? "আজ রক্ত দিয়েছি (+১)" : "I donated blood today (+1)"}
          </button>
          {!canAddDonation && nextEligibleDate && (
            <p className="text-[11px] font-bold text-amber-700 text-center">
              {lang === "bn"
                ? `আপনি ${nextEligibleDate} থেকে আবার রক্ত দিতে পারবেন, তাই এখন যোগ করা যাবে না।`
                : `You can donate again from ${nextEligibleDate}, so you can't add a donation yet.`}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowInfo((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-black text-slate-600"
      >
        <span>{lang === "bn" ? "ব্যাজ কীভাবে পাওয়া যায়?" : "How do badges work?"}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showInfo ? "rotate-180" : ""}`} />
      </button>

      {showInfo && (
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            {lang === "bn"
              ? "আপনার \"মোট রক্তদান\" সংখ্যা অনুযায়ী ব্যাজ পাওয়া যায়। প্রতিবার রক্ত দেওয়ার পর উপরের বাটনে ট্যাপ করলেই সংখ্যা ১ বাড়বে, প্রোফাইল এডিটে যেতে হবে না। যত বেশি রক্তদান, ব্যাজ পাওয়া তত কঠিন। ব্যাজের অবস্থা এই ফোনে সংরক্ষিত থাকে।"
              : "Badges are based on your Times Donated count. After each donation, tap the button above to add 1, with no need to open Edit Profile. Higher badges are harder to earn. Your badge progress is saved on this phone."}
          </p>
          <div className="space-y-1.5">
            {BADGES.map((b) => (
              <div key={b.key} className="flex items-center gap-2.5">
                <BadgeIcon tier={b} size={26} />
                <span className="font-black text-slate-700 w-20">{name(b)}</span>
                <span className="text-slate-500">
                  {lang === "bn" ? `${n(b.min)} বার রক্তদান` : `${b.min} donations`}
                </span>
              </div>
            ))}
          </div>
          <p className="text-slate-400">
            {lang === "bn"
              ? "শুধু সত্যিকারের রক্তদানই যোগ করুন। এটি সম্মান ও উৎসাহের জন্য।"
              : "Please only add real donations. Badges are for recognition and motivation."}
          </p>
        </div>
      )}
    </div>
  );
};
