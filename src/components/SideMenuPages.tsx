import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  X,
  BookOpen,
  Newspaper,
  Users,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  Heart,
  MapPin,
  Briefcase,
  GraduationCap,
  HelpCircle,
  PhoneCall,
  Copy,
  Check,
  Search,
  Play,
  Youtube,
} from "lucide-react";
import { useLanguage, LanguageSwitch, Language, toBnNumber } from "../i18n";
import { searchBloodFaqs } from "../utils/faqSearch";
import { goBack } from "../utils/navigation";
import { useScrollLock } from "../utils/scrollLock";
import { FaqAssistantModal } from "./FaqAssistantModal";


/**
 * 🎬 YouTube Video Tutorial Settings
 * You can set your YouTube video URL or ID here (e.g. "https://www.youtube.com/watch?v=VIDEO_ID" or "VIDEO_ID").
 * When user clicks "How to use the app", this YouTube video plays!
 */
export const DEFAULT_TUTORIAL_YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

export function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId) return "";
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  if (match && match[1]) return match[1];
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return trimmed;
}

/**
 * Custom line icon matching the reference design:
 * an open hand with cuff underneath a circular coin containing the Bangladeshi Taka (৳) sign.
 */
export const SupportTakaHandsIcon: React.FC<{ className?: string }> = ({
  className = "w-6 h-6",
}) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Top Coin Circle */}
    <circle
      cx="32"
      cy="18.4"
      r="14.4"
      stroke="currentColor"
      strokeWidth="3.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Taka symbol (৳) inside the coin */}
    <text
      x="32"
      y="25.4"
      textAnchor="middle"
      fill="currentColor"
      fontSize="20.5"
      fontWeight="900"
      fontFamily="'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif"
    >
      ৳
    </text>
    {/* Left Cuff */}
    <rect
      x="5.2"
      y="41"
      width="7.4"
      height="17.8"
      rx="3.6"
      stroke="currentColor"
      strokeWidth="3.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Upper Palm & Thumb */}
    <path
      d="M12.6 43.2C16.5 40 20.5 39 25.5 39.4C30 39.8 35 40.8 39.5 41.6C41.8 42 43.2 43.5 43 45C42.8 46.4 41.2 47 38.8 46.9L31.5 46.7C29.2 46.6 27.8 47.1 26.6 47.8"
      stroke="currentColor"
      strokeWidth="3.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Extended Fingers & Lower Palm */}
    <path
      d="M42.2 42.8C46.5 40 51.5 37.2 54.8 36.6C57.5 36.1 59.4 37.5 58.4 40C56.6 44 49.5 48.8 37.5 54.6C35.2 55.7 33.2 56 30.8 55.4C27.5 54.6 23.8 53.6 19.5 53.6C16.5 53.6 14.2 54.4 12.6 55.5"
      stroke="currentColor"
      strokeWidth="3.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Set your external blog website URL here when ready (e.g. "https://yourblog.com")
export const BLOG_WEBSITE_URL = "";

export interface HelplineItem {
  id: string;
  numberEn: string;
  numberBn: string;
  dialNumber: string;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  badgeEn: string;
  badgeBn: string;
}

export const NATIONAL_HELPLINES: HelplineItem[] = [
  {
    id: "999",
    numberEn: "999",
    numberBn: "৯৯৯",
    dialNumber: "999",
    titleEn: "National Emergency Service",
    titleBn: "জাতীয় জরুরি সেবা",
    descEn: "24/7 Police, Fire Service & Emergency Ambulance assistance across Bangladesh.",
    descBn: "সারা দেশে ২৪ ঘণ্টা পুলিশ, ফায়ার সার্ভিস ও জরুরি অ্যাম্বুলেন্স সেবা।",
    badgeEn: "Toll-Free • 24/7",
    badgeBn: "টোল-ফ্রি • ২৪/৭",
  },
  {
    id: "16263",
    numberEn: "16263",
    numberBn: "১৬২৬৩",
    dialNumber: "16263",
    titleEn: "Shastho Batayon (Health Helpline)",
    titleBn: "স্বাস্থ্য বাতায়ন (স্বাস্থ্য হেল্পলাইন)",
    descEn: "24/7 doctor advice, hospital info & emergency medical guidance from DGHS.",
    descBn: "২৪ ঘণ্টা সরাসরি ডাক্তারের পরামর্শ, সরকারি হাসপাতাল ও স্বাস্থ্য তথ্য সেবা।",
    badgeEn: "Health • 24/7",
    badgeBn: "স্বাস্থ্য সেবা • ২৪/৭",
  },
  {
    id: "16163",
    numberEn: "16163",
    numberBn: "১৬১৬৩",
    dialNumber: "16163",
    titleEn: "Fire Service & Civil Defence",
    titleBn: "ফায়ার সার্ভিস ও সিভিল ডিফেন্স",
    descEn: "Direct hotline for fire emergencies, rescue operations & ambulance service.",
    descBn: "অগ্নিকাণ্ড, জরুরি উদ্ধার তৎপরতা ও অ্যাম্বুলেন্স সেবার কেন্দ্রীয় হটলাইন।",
    badgeEn: "Rescue • 24/7",
    badgeBn: "উদ্ধার ও অ্যাম্বুলেন্স",
  },
  {
    id: "333",
    numberEn: "333",
    numberBn: "৩৩৩",
    dialNumber: "333",
    titleEn: "National Information & Services",
    titleBn: "জাতীয় তথ্য ও সেবা হেল্পলাইন",
    descEn: "Government public services, local administration contact & social support.",
    descBn: "সরকারি সেবা, স্থানীয় প্রশাসনের সহায়তা ও জরুরি সরকারি তথ্য সেবা।",
    badgeEn: "Public Service",
    badgeBn: "সরকারি সেবা",
  },
  {
    id: "109",
    numberEn: "109",
    numberBn: "১০৯",
    dialNumber: "109",
    titleEn: "Women & Children Protection",
    titleBn: "নারী ও শিশু নির্যাতন প্রতিরোধ",
    descEn: "24/7 toll-free national helpline for women and children safety & support.",
    descBn: "নারী ও শিশু নির্যাতন প্রতিরোধে ২৪ ঘণ্টা টোল-ফ্রি জাতীয় সহায়তা কেন্দ্র।",
    badgeEn: "Toll-Free • 24/7",
    badgeBn: "টোল-ফ্রি • ২৪/৭",
  },
  {
    id: "1098",
    numberEn: "1098",
    numberBn: "১০৯৮",
    dialNumber: "1098",
    titleEn: "Child Helpline",
    titleBn: "চাইল্ড হেল্পলাইন (শিশু সহায়তা)",
    descEn: "24/7 toll-free emergency rescue and protection service for children in distress.",
    descBn: "বিপদগ্রস্ত শিশুদের জরুরি উদ্ধার, সুরক্ষা ও সহায়তায় ২৪ ঘণ্টা টোল-ফ্রি হেল্পলাইন।",
    badgeEn: "Toll-Free • 24/7",
    badgeBn: "টোল-ফ্রি • ২৪/৭",
  },
  {
    id: "1090",
    numberEn: "1090",
    numberBn: "১০৯০",
    dialNumber: "1090",
    titleEn: "Disaster Early Warning",
    titleBn: "দুর্যোগের আগাম বার্তা ও আবহাওয়া",
    descEn: "Toll-free hotline for cyclone, flood & natural disaster alerts.",
    descBn: "ঘূর্ণিঝড়, বন্যা ও প্রাকৃতিক দুর্যোগের আগাম সতর্কবার্তা ও আবহাওয়া তথ্য।",
    badgeEn: "Toll-Free",
    badgeBn: "টোল-ফ্রি",
  },
];

export interface BloodFaqItem {
  id: string;
  questionEn: string;
  questionBn: string;
  answerEn: string;
  answerBn: string;
}

export const BLOOD_DONATION_FAQS: BloodFaqItem[] = [
  {
    id: "faq-1",
    questionEn: "Who can donate blood?",
    questionBn: "কারা রক্ত দিতে পারবেন?",
    answerEn:
      "Any healthy adult aged 18 to 60 years weighing at least 45–50 kg with normal blood pressure and hemoglobin levels (at least 12.5 g/dL for women and 13.0 g/dL for men) can safely donate blood.",
    answerBn:
      "১৮ থেকে ৬০ বছর বয়সী যেকোনো সুস্থ মানুষ, যার ওজন কমপক্ষে ৪৫–৫০ কেজি এবং রক্তচাপ ও হিমোগ্লোবিনের মাত্রা স্বাভাবিক (নারীদের অন্তত ১২.৫ g/dL এবং পুরুষদের ১৩.০ g/dL), তিনি নিরাপদে রক্ত দিতে পারবেন।",
  },
  {
    id: "faq-2",
    questionEn: "How often can someone donate blood?",
    questionBn: "কত দিন পর পর রক্ত দেওয়া যায়?",
    answerEn:
      "A healthy person can safely donate whole blood every 120 days (4 months), up to 3 times a year.",
    answerBn:
      "একজন সুস্থ মানুষ প্রতি ১২০ দিন (৪ মাস) পর পর, অর্থাৎ বছরে সর্বোচ্চ ৩ বার নিরাপদে রক্ত দিতে পারেন।",
  },
  {
    id: "faq-3",
    questionEn: "How much blood is taken during a donation?",
    questionBn: "রক্তদানের সময় কতটুকু রক্ত নেওয়া হয়?",
    answerEn:
      "Only 350 ml to 450 ml (1 standard bag) is collected, which is less than 10% of an adult's total 4.5 to 5.5 liters of blood.",
    answerBn:
      "রক্তদানের সময় মাত্র ৩৫০ থেকে ৪৫০ মিলি (১ ব্যাগ) রক্ত নেওয়া হয়, যা একজন প্রাপ্তবয়স্ক মানুষের শরীরের মোট ৪.৫–৫.৫ লিটার রক্তের ১০ ভাগেরও কম।",
  },
  {
    id: "faq-4",
    questionEn: "Does donating blood make someone weak?",
    questionBn: "রক্ত দিলে কি শরীর দুর্বল হয়ে পড়ে?",
    answerEn:
      "No. Resting for 10–15 minutes after donation and drinking water, oral saline, or fruit juice keeps you completely normal and active.",
    answerBn:
      "না। রক্ত দেওয়ার পর ১০–১৫ মিনিট বিশ্রাম নিলে এবং পর্যাপ্ত পানি, ডাবের পানি বা ফলের রস পান করলে শরীর সম্পূর্ণ স্বাভাবিক থাকে।",
  },
  {
    id: "faq-5",
    questionEn: "What should someone do before donating blood?",
    questionBn: "রক্ত দেওয়ার আগে কী করণীয়?",
    answerEn:
      "Get 7–8 hours of sleep the night before, eat a balanced meal 1–2 hours before donating (never donate on an empty stomach), and drink plenty of water.",
    answerBn:
      "আগের রাতে ৭–৮ ঘণ্টা ঘুমান, রক্ত দেওয়ার ১–২ ঘণ্টা আগে স্বাভাবিক খাবার খান (কখনোই খালি পেটে রক্ত দেবেন না) এবং প্রচুর পানি পান করুন।",
  },
  {
    id: "faq-6",
    questionEn: "Is blood donation painful or unsafe?",
    questionBn: "রক্তদান কি ব্যথাদায়ক বা ঝুঁকিপূর্ণ?",
    answerEn:
      "You only feel a mild pinch for a second when the needle enters. A brand-new, sterile, disposable needle is used for every donor, making it 100% safe.",
    answerBn:
      "সুঁই ফোটার সময় কেবল এক সেকেন্ডের জন্য সামান্য চিমটির মতো অনুভূত হয়। প্রতিবার নতুন ও জীবাণুমুক্ত সুঁই ব্যবহার করা হয়, তাই এটি ১০০% নিরাপদ।",
  },
  {
    id: "faq-7",
    questionEn: "Who should temporarily avoid donating blood?",
    questionBn: "কাদের সাময়িকভাবে রক্ত দেওয়া উচিত নয়?",
    answerEn:
      "Anyone with fever, cold, active infection, taking antibiotics, pregnant or breastfeeding mothers, or those who had major surgery or a tattoo within the last 6 months.",
    answerBn:
      "জ্বর, সর্দি, সংক্রমণ, অ্যান্টিবায়োটিক চলাকালীন অবস্থা, গর্ভাবস্থা বা স্তন্যদানকালে এবং গত ৬ মাসের মধ্যে বড় অপারেশন বা ট্যাটু করালে সাময়িকভাবে রক্ত দেওয়া উচিত নয়।",
  },
  {
    id: "faq-8",
    questionEn: "Can someone donate blood if they have a tattoo?",
    questionBn: "শরীরে ট্যাটু থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes, once 6 months have passed since getting the tattoo, provided the skin is completely healed and free of infection.",
    answerBn:
      "হ্যাঁ, ট্যাটু করার পর কমপক্ষে ৬ মাস পার হলে এবং চামড়া সম্পূর্ণ সুস্থ ও সংক্রমণমুক্ত থাকলে নিরাপদে রক্ত দেওয়া যাবে।",
  },
  {
    id: "faq-9",
    questionEn: "Can someone donate blood during their period?",
    questionBn: "মাসিক বা পিরিয়ড চলাকালীন কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No, it is best to wait until your period finishes and at least 5–7 days after so your iron levels and energy stay optimal.",
    answerBn:
      "না, পিরিয়ড চলাকালীন রক্ত না দেওয়াই ভালো। পিরিয়ড শেষ হওয়ার অন্তত ৫–৭ দিন পর শরীর স্বাভাবিক থাকলে রক্ত দেওয়া নিরাপদ।",
  },
  {
    id: "faq-10",
    questionEn: "What should someone eat and drink after donating blood?",
    questionBn: "রক্ত দেওয়ার পর কী খাওয়া ও পান করা উচিত?",
    answerEn:
      "Drink water, oral saline, coconut water, or fruit juice right away, and eat iron-rich foods like eggs, fish, meat, lentils, dates, and green leafy vegetables over the next few days.",
    answerBn:
      "রক্ত দেওয়ার পরপরই পানি, ওরস্যালাইন, ডাবের পানি বা ফলের রস পান করুন এবং পরবর্তী কয়েক দিন ডিম, মাছ, মাংস, ডাল, খেজুর ও সবুজ শাকসবজির মতো আয়রনযুক্ত খাবার খান।",
  },
  {
    id: "faq-11",
    questionEn: "What side effects can happen after donating blood?",
    questionBn: "রক্ত দেওয়ার পর কী ধরনের পার্শ্বপ্রতিক্রিয়া হতে পারে?",
    answerEn:
      "Most donors feel completely fine, though a few may experience temporary mild dizziness, fatigue, or slight bruising/soreness at the needle site.",
    answerBn:
      "বেশিরভাগ মানুষের কোনো সমস্যা হয় না। তবে কারও কারও সাময়িক হালকা মাথা ঘোরা, সামান্য ক্লান্তি বা সুঁই ফোটানো স্থানে সামান্য ব্যথা হতে পারে।",
  },
  {
    id: "faq-12",
    questionEn: "When should someone seek medical help after donating blood?",
    questionBn: "রক্ত দেওয়ার পর কখন চিকিৎসকের পরামর্শ নেওয়া উচিত?",
    answerEn:
      "Seek medical attention if you faint, feel dizzy for several hours, have bleeding that won't stop from the needle site, develop severe arm pain or numbness, or get a fever.",
    answerBn:
      "রক্ত দেওয়ার পর অজ্ঞান হয়ে গেলে, কয়েক ঘণ্টা পরও মাথা ঘোরা না কমলে, সুঁইয়ের স্থান থেকে রক্তপাত বন্ধ না হলে, হাতে তীব্র ব্যথা বা অবশ ভাব হলে অথবা জ্বর এলে দ্রুত চিকিৎসকের পরামর্শ নিন।",
  },
  {
    id: "faq-13",
    questionEn: "What happens if someone donates blood more than once in 120 days?",
    questionBn: "১২০ দিনের মধ্যে একের অধিকবার রক্ত দিলে কী হয়?",
    answerEn:
      "Donating before 120 days prevents your body from fully restoring its red blood cells and iron reserves, which can lead to iron-deficiency anemia, weakness, and chronic fatigue.",
    answerBn:
      "১২০ দিনের আগে বারবার রক্ত দিলে শরীর লোহিত রক্তকণিকা ও আয়রনের ঘাটতি পূরণ করার সময় পায় না, ফলে রক্তস্বল্পতা (অ্যানিমিয়া), ক্লান্তি ও শারীরিক দুর্বলতা দেখা দিতে পারে।",
  },
  {
    id: "faq-14",
    questionEn: "How long should someone rest after donating blood?",
    questionBn: "রক্ত দেওয়ার পর কতক্ষণ বিশ্রাম নেওয়া উচিত?",
    answerEn:
      "Rest at the donation site for at least 10–15 minutes immediately after donating, and avoid heavy physical work for the next 24 hours.",
    answerBn:
      "রক্ত দেওয়ার পরপরই সেখানে অন্তত ১০–১৫ মিনিট শুয়ে বা বসে বিশ্রাম নিন এবং পরবর্তী ২৪ ঘণ্টা ভারী শারীরিক পরিশ্রম থেকে বিরত থাকুন।",
  },
  {
    id: "faq-15",
    questionEn: "How quickly does the body replace donated blood?",
    questionBn: "রক্ত দেওয়ার কত সময়ের মধ্যে শরীর তা পূরণ করে নেয়?",
    answerEn:
      "Your body replaces the liquid plasma volume within 24 to 48 hours, and red blood cells are completely regenerated within 4 to 8 weeks.",
    answerBn:
      "রক্তের তরল অংশ (প্লাজমা) ২৪ থেকে ৪৮ ঘণ্টার মধ্যে পূরণ হয়ে যায় এবং লোহিত রক্তকণিকা সম্পূর্ণ পূরণ হতে ৪ থেকে ৮ সপ্তাহ সময় লাগে।",
  },
  {
    id: "faq-16",
    questionEn: "Can someone drive after donating blood?",
    questionBn: "রক্ত দেওয়ার পর কি গাড়ি বা বাইক চালানো যাবে?",
    answerEn:
      "Wait at least 30–60 minutes, drink fluids, and ensure you feel completely steady before driving. Avoid long-distance or commercial driving for 12–24 hours.",
    answerBn:
      "রক্ত দেওয়ার পর অন্তত ৩০–৬০ মিনিট বিশ্রাম নিয়ে এবং শরীর সম্পূর্ণ স্বাভাবিক অনুভব করলে স্বল্প দূরত্বে গাড়ি বা বাইক চালানো যাবে। তবে দীর্ঘ যাত্রায় নিজে ড্রাইভ না করাই ভালো।",
  },
  {
    id: "faq-17",
    questionEn: "What should someone do if they feel dizzy after donating blood?",
    questionBn: "রক্ত দেওয়ার পর মাথা ঘুরালে কী করণীয়?",
    answerEn:
      "Immediately sit or lie down with your feet raised slightly above heart level, loosen tight clothes, and slowly drink water or oral saline until you feel normal.",
    answerBn:
      "সাথে সাথে বসে বা শুয়ে পড়ুন এবং পা দুটি মাথার চেয়ে কিছুটা উঁচুতে রাখুন। পোশাক ঢিলা করে দিন এবং ধীরে ধীরে পানি বা ওরস্যালাইন পান করুন।",
  },
  {
    id: "faq-18",
    questionEn: "How much water should someone drink after donating blood?",
    questionBn: "রক্ত দেওয়ার পর কতটুকু পানি পান করা উচিত?",
    answerEn:
      "Drink an extra 3 to 4 glasses (about 1 liter more than your normal daily intake) of water or healthy fluids over the next 24 hours.",
    answerBn:
      "রক্ত দেওয়ার পরবর্তী ২৪ ঘণ্টায় স্বাভাবিকের চেয়ে অন্তত ৩–৪ গ্লাস (প্রায় ১ লিটার) বেশি পানি বা তরল খাবার পান করা উচিত।",
  },
  {
    id: "faq-19",
    questionEn: "Can someone exercise after donating blood?",
    questionBn: "রক্ত দেওয়ার পর কি ব্যায়াম বা জিম করা যাবে?",
    answerEn:
      "No, avoid gym workouts, running, heavy lifting, or strenuous sports for at least 24 hours after donating blood.",
    answerBn:
      "না, রক্ত দেওয়ার পর অন্তত ২৪ ঘণ্টা জিম, দৌড়ানো, ভারী ওজন তোলা বা যেকোনো কঠোর ব্যায়াম থেকে বিরত থাকুন।",
  },
  {
    id: "faq-20",
    questionEn: "Can someone donate blood if they have anemia?",
    questionBn: "রক্তস্বল্পতা বা অ্যানিমিয়া থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No. People with anemia have low hemoglobin/iron and must wait until their hemoglobin levels fully recover to normal before donating.",
    answerBn:
      "না। রক্তস্বল্পতা বা অ্যানিমিয়া থাকলে রক্ত দেওয়া যাবে না। চিকিৎসা ও পুষ্টিকর খাবারের মাধ্যমে হিমোগ্লোবিন সম্পূর্ণ স্বাভাবিক হওয়ার পরই রক্ত দেওয়া যাবে।",
  },
  {
    id: "faq-21",
    questionEn: "Can someone donate blood if they have low blood pressure?",
    questionBn: "লো ব্লাড প্রেশার বা নিম্ন রক্তচাপ থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Only if your blood pressure is at least 100/60 mmHg at the time of donation and you have no dizziness or weakness. If it is below 100/60 mmHg, you should not donate.",
    answerBn:
      "রক্তদানের সময় রক্তচাপ কমপক্ষে ১০০/৬০ mmHg থাকলে এবং কোনো দুর্বলতা না থাকলে রক্ত দেওয়া যাবে। এর কম হলে রক্ত দেওয়া উচিত নয়।",
  },
  {
    id: "faq-22",
    questionEn: "Can someone donate blood if they have high blood pressure?",
    questionBn: "হাই ব্লাড প্রেশার বা উচ্চ রক্তচাপ থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes, if your blood pressure is controlled (below 140/90 mmHg at the time of donation) and you have no heart or kidney complications.",
    answerBn:
      "হ্যাঁ, রক্তচাপ নিয়ন্ত্রণে থাকলে (রক্তদানের সময় ১৪০/৯০ mmHg-এর নিচে থাকলে) এবং হৃদরোগের জটিলতা না থাকলে রক্ত দেওয়া যাবে।",
  },
  {
    id: "faq-23",
    questionEn: "Can someone donate blood if they have diabetes?",
    questionBn: "ডায়াবেটিস থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes, if your blood sugar is well-controlled by diet or oral tablets. However, people who require insulin injections or have diabetic complications should not donate.",
    answerBn:
      "হ্যাঁ, খাদ্যাভ্যাস বা মুখে খাওয়ার ওষুধের মাধ্যমে ডায়াবেটিস নিয়ন্ত্রণে থাকলে রক্ত দেওয়া যাবে। তবে ইনসুলিন নিলে রক্ত দেওয়া যাবে না।",
  },
  {
    id: "faq-24",
    questionEn: "Can someone donate blood if they have asthma?",
    questionBn: "অ্যাজমা বা হাঁপানি থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes, if you have mild asthma and have no breathing difficulty on the day of donation. Do not donate during an active asthma attack or while taking oral steroids.",
    answerBn:
      "হ্যাঁ, শ্বাসকষ্টের লক্ষণ না থাকলে এবং রক্তদানের দিন সম্পূর্ণ সুস্থ থাকলে রক্ত দেওয়া যাবে। তবে শ্বাসকষ্ট চলাকালীন রক্ত দেওয়া যাবে না।",
  },
  {
    id: "faq-25",
    questionEn: "Can someone donate blood if they have allergies?",
    questionBn: "অ্যালার্জি থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes, if the allergy is mild and you feel well. Avoid donating if you are having a severe allergic reaction or skin infection on your arm.",
    answerBn:
      "হ্যাঁ, সাধারণ অ্যালার্জি থাকলে এবং শরীর সুস্থ থাকলে রক্ত দেওয়া যাবে। তবে তীব্র অ্যালার্জি বা সুঁই ফোটানোর স্থানে চর্মরোগ থাকলে বিরত থাকুন।",
  },
  {
    id: "faq-26",
    questionEn: "Can someone donate blood if they have a cold?",
    questionBn: "সর্দি-কাশি থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No. Wait until your cold, cough, or sore throat has completely cleared and you have felt well for at least 3–7 days.",
    answerBn:
      "না। সর্দি, কাশি বা গলা ব্যথা সম্পূর্ণ ভালো হওয়ার অন্তত ৩–৭ দিন পর রক্ত দেওয়া উচিত।",
  },
  {
    id: "faq-27",
    questionEn: "Can someone donate blood if they have a fever?",
    questionBn: "জ্বর থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No. Never donate blood while you have a fever. Wait at least 7–14 days after your temperature returns to normal and you have fully recovered.",
    answerBn:
      "না। জ্বর থাকা অবস্থায় কখনোই রক্ত দেওয়া যাবে না। জ্বর সম্পূর্ণ ভালো হওয়ার অন্তত ৭–১৪ দিন পর রক্ত দেওয়া যাবে।",
  },
  {
    id: "faq-28",
    questionEn: "Can someone donate blood if they have an infection?",
    questionBn: "শরীরে কোনো সংক্রমণ বা ইনফেকশন থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No. Any active infection can spread through blood. Wait at least 14 days after completing treatment and making a full recovery.",
    answerBn:
      "না। শরীরে যেকোনো সংক্রমণ বা ইনফেকশন থাকলে তা রক্তের মাধ্যমে ছড়াতে পারে। চিকিৎসা শেষ হয়ে সম্পূর্ণ সুস্থ হওয়ার ১৪ দিন পর রক্ত দেওয়া যাবে।",
  },
  {
    id: "faq-29",
    questionEn: "Can someone donate blood if they are taking antibiotics?",
    questionBn: "অ্যান্টিবায়োটিক চলাকালীন কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No. Complete your full course of antibiotics and wait at least 7 to 14 days after finishing the last dose before donating blood.",
    answerBn:
      "না। অ্যান্টিবায়োটিকের সম্পূর্ণ কোর্স শেষ হওয়ার এবং রোগের লক্ষণ সেরে যাওয়ার কমপক্ষে ৭–১৪ দিন পর রক্ত দেওয়া যাবে।",
  },
  {
    id: "faq-30",
    questionEn: "Can someone donate blood if they take regular medication?",
    questionBn: "নিয়মিত ওষুধ সেবন করলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Most routine medications (for blood pressure, thyroid, or cholesterol) do not prevent donation, but always inform the medical screener about every medicine you take.",
    answerBn:
      "প্রেশার, থাইরয়েড বা কোলেস্টেরলের সাধারণ ওষুধে রক্ত দিতে বাধা নেই। তবে রক্ত দেওয়ার আগে অবশ্যই দায়িত্বরত চিকিৎসককে আপনার ওষুধের নাম জানাতে হবে।",
  },
  {
    id: "faq-31",
    questionEn: "Can someone donate blood if they take painkillers?",
    questionBn: "ব্যথানাশক ওষুধ (পেইনকিলার) খেলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Whole blood donation is fine if the painkiller wasn't taken for a fever or serious illness. However, if donating platelets, avoid aspirin or NSAID painkillers for 48–72 hours.",
    answerBn:
      "জ্বর বা সংক্রমণ ছাড়া সাধারণ ব্যথার জন্য প্যারাসিটামল খেলে পূর্ণ রক্ত (Whole Blood) দিতে সমস্যা নেই। তবে প্লাটিলেট দেওয়ার ক্ষেত্রে অ্যাসপিরিন জাতীয় পেইনকিলার ৪৮–৭২ ঘণ্টা আগে বন্ধ রাখতে হয়।",
  },
  {
    id: "faq-32",
    questionEn: "Can someone donate blood if they recently received a vaccine?",
    questionBn: "সম্প্রতি টিকা (ভ্যাকসিন) নিলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Wait 48 hours to 7 days after standard vaccines (flu, tetanus, COVID-19) if symptom-free, 4 weeks after live vaccines (MMR, chickenpox), and 1 year after a post-bite rabies vaccine.",
    answerBn:
      "সাধারণ টিকা (ফ্লু, টিটেনাস, কোভিড-১৯) নিলে উপসর্গ না থাকলে ৭ দিন পর, লাইভ ভ্যাকসিন (হাম, রুবেলা, জলবসন্ত) নিলে ৪ সপ্তাহ পর এবং প্রাণী কামড়ানোর পর জলাতঙ্কের টিকা নিলে ১ বছর পর রক্ত দেওয়া যাবে।",
  },
  {
    id: "faq-33",
    questionEn: "Can someone donate blood if they recently had surgery?",
    questionBn: "সম্প্রতি অপারেশন বা সার্জারি হলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Wait at least 6 months after major surgery (12 months if a blood transfusion was given) and 2–4 weeks after minor surgery once fully healed.",
    answerBn:
      "বড় কোনো অপারেশনের পর কমপক্ষে ৬ মাস (অপারেশনে রক্ত নেওয়া হলে ১২ মাস) এবং ছোটখাটো সার্জারির পর ঘা শুকিয়ে গেলে ২–৪ সপ্তাহ পর রক্ত দেওয়া যাবে।",
  },
  {
    id: "faq-34",
    questionEn: "Can someone donate blood if they recently had a dental procedure?",
    questionBn: "দাঁতের চিকিৎসা করানোর পর কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Wait 24 hours after a simple dental cleaning or filling, and 3 to 7 days after a tooth extraction or root canal once completely healed and off antibiotics.",
    answerBn:
      "সাধারণ স্কেলিং বা ফিলিংয়ের ২৪ ঘণ্টা পর এবং দাঁত তোলা বা রুট ক্যানেলের পর ঘা শুকানো ও অ্যান্টিবায়োটিক শেষ হওয়ার ৩–৭ দিন পর রক্ত দেওয়া যাবে।",
  },
  {
    id: "faq-35",
    questionEn: "Can someone donate blood if they have a tattoo?",
    questionBn: "ট্যাটু করা থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes, after waiting at least 6 months from the date of getting the tattoo so any risk of blood-borne infection is ruled out.",
    answerBn:
      "হ্যাঁ, ট্যাটু করার তারিখ থেকে কমপক্ষে ৬ মাস পার হলে এবং কোনো সংক্রমণ না থাকলে নিরাপদে রক্ত দেওয়া যাবে।",
  },
  {
    id: "faq-36",
    questionEn: "Can someone donate blood if they have a piercing?",
    questionBn: "শরীরে পিয়ার্সিং (নাক-কান ফোঁড়ানো) থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes, once 6 months have passed after getting a new ear, nose, or body piercing and the site has healed completely.",
    answerBn:
      "হ্যাঁ, নতুন করে নাক, কান বা শরীরের কোনো অংশ ফোঁড়ানোর (পিয়ার্সিং) ৬ মাস পর ঘা সম্পূর্ণ শুকিয়ে গেলে রক্ত দেওয়া যাবে।",
  },
  {
    id: "faq-37",
    questionEn: "Can someone donate blood while menstruating?",
    questionBn: "মাসিক বা ঋতুস্রাব চলাকালীন কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No, women should avoid donating during menstruation and wait 5–7 days after it ends so hemoglobin and iron levels remain stable.",
    answerBn:
      "না, মাসিক বা ঋতুস্রাব চলাকালীন রক্ত দেওয়া উচিত নয়। মাসিক শেষ হওয়ার অন্তত ৫–৭ দিন পর রক্ত দেওয়া নিরাপদ।",
  },
  {
    id: "faq-38",
    questionEn: "Can someone donate blood if they are pregnant?",
    questionBn: "গর্ভাবস্থায় কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No. Pregnant women must not donate blood because extra iron and blood volume are essential for both mother and baby.",
    answerBn:
      "না। গর্ভাবস্থায় কখনোই রক্ত দেওয়া যাবে না, কারণ এ সময় মা ও গর্ভস্থ শিশুর সুস্থতার জন্য পর্যাপ্ত রক্ত ও আয়রন প্রয়োজন।",
  },
  {
    id: "faq-39",
    questionEn: "Can someone donate blood after giving birth?",
    questionBn: "সন্তান প্রসবের পর কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Wait at least 6 to 12 months after childbirth (and after completing exclusive breastfeeding) so your body's iron stores fully recover.",
    answerBn:
      "সন্তান প্রসবের পর মায়ের শরীরের রক্ত ও আয়রনের ঘাটতি পূরণ হতে অন্তত ৬ থেকে ১২ মাস পর রক্ত দেওয়া উচিত।",
  },
  {
    id: "faq-40",
    questionEn: "Can someone donate blood while breastfeeding?",
    questionBn: "শিশুকে বুকের দুধ খাওয়ানো অবস্থায় কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No, mothers should wait until at least 6–12 months postpartum and once the baby is no longer exclusively breastfeeding.",
    answerBn:
      "না, শিশুকে নিয়মিত বুকের দুধ খাওয়ানো অবস্থায় (বিশেষ করে প্রথম ৬–১২ মাস) মায়ের রক্ত দেওয়া উচিত নয়।",
  },
  {
    id: "faq-41",
    questionEn: "Can someone donate blood while fasting?",
    questionBn: "রোজা বা উপবাস থাকা অবস্থায় কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Donating while fasting is not recommended due to dehydration and low blood sugar risk. During Ramadan, donate 1–2 hours after eating Iftar.",
    answerBn:
      "রোজা বা উপবাস থাকা অবস্থায় পানিশূন্যতার কারণে মাথা ঘোরার ঝুঁকি থাকে। তাই রমজান মাসে ইফতারের ১–২ ঘণ্টা পর খাবার ও পানি খেয়ে রক্ত দেওয়া সবচেয়ে নিরাপদ।",
  },
  {
    id: "faq-42",
    questionEn: "Can someone donate blood if they have not eaten?",
    questionBn: "না খেয়ে বা খালি পেটে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No. Never donate blood on an empty stomach. Eat a proper meal or snack at least 1–2 hours before donating to avoid dizziness or fainting.",
    answerBn:
      "না। কখনোই খালি পেটে রক্ত দেওয়া যাবে না। রক্ত দেওয়ার অন্তত ১–২ ঘণ্টা আগে স্বাভাবিক খাবার খেয়ে নেওয়া আবশ্যক।",
  },
  {
    id: "faq-43",
    questionEn: "Can someone donate blood if they did not sleep well?",
    questionBn: "রাতে ভালো ঘুম না হলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No. You need at least 6 to 8 hours of restful sleep the night before; donating without proper sleep significantly increases the chance of dizziness.",
    answerBn:
      "না। রক্ত দেওয়ার আগের রাতে অন্তত ৬–৮ ঘণ্টা ভালো ঘুম হওয়া জরুরি। ঘুম কম হলে রক্ত দেওয়ার পর মাথা ঘোরা বা দুর্বল লাগার ঝুঁকি বাড়ে।",
  },
  {
    id: "faq-44",
    questionEn: "Can someone donate blood if they recently drank alcohol?",
    questionBn: "সম্প্রতি অ্যালকোহল বা মদ্যপান করলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No. Wait at least 24 to 48 hours after drinking alcohol and make sure you are completely hydrated before donating blood.",
    answerBn:
      "না। অ্যালকোহল গ্রহণের পর অন্তত ২৪ থেকে ৪৮ ঘণ্টা পার না হওয়া পর্যন্ত রক্ত দেওয়া যাবে না।",
  },
  {
    id: "faq-45",
    questionEn: "Can someone donate blood if they smoke?",
    questionBn: "ধূমপায়ী কি রক্ত দিতে পারবেন?",
    answerEn:
      "Yes, smokers can donate blood, but avoid smoking for at least 2 hours before and 2–3 hours after donation to prevent dizziness.",
    answerBn:
      "হ্যাঁ, ধূমপায়ীরা রক্ত দিতে পারবেন। তবে রক্ত দেওয়ার অন্তত ২ ঘণ্টা আগে এবং রক্ত দেওয়ার ২–৩ ঘণ্টা পর পর্যন্ত ধূমপান থেকে বিরত থাকতে হবে।",
  },
  {
    id: "faq-46",
    questionEn: "Can someone donate blood if they use nicotine products?",
    questionBn: "নিকোটিন জাতীয় দ্রব্য গ্রহণ করলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes, if your blood pressure is normal, though you should avoid vapes, tobacco, or nicotine products for at least 2 hours before and after donating.",
    answerBn:
      "হ্যাঁ, রক্তচাপ স্বাভাবিক থাকলে রক্ত দেওয়া যাবে। তবে রক্ত দেওয়ার অন্তত ২ ঘণ্টা আগে ও পরে ভেপ, তামাক বা নিকোটিন গ্রহণ থেকে বিরত থাকতে হবে।",
  },
  {
    id: "faq-47",
    questionEn: "Can someone donate blood if they recently exercised?",
    questionBn: "ব্যায়াম করার পরপরই কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Wait at least 2 to 4 hours after heavy exercise, drink plenty of water to replace sweat loss, and let your pulse return to normal before donating.",
    answerBn:
      "ভারী ব্যায়াম করার পরপরই রক্ত দেবেন না। অন্তত ২–৪ ঘণ্টা বিশ্রাম নিয়ে, পর্যাপ্ত পানি পান করে হৃদস্পন্দন স্বাভাবিক হলে রক্ত দিন।",
  },
  {
    id: "faq-48",
    questionEn: "Can someone donate blood if they are underweight?",
    questionBn: "ওজন কম হলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No. Anyone weighing under 45–50 kg should not donate blood, as removing 350–450 ml from a low blood volume increases fainting risk.",
    answerBn:
      "না। ওজন ৪৫–৫০ কেজির কম হলে রক্ত দেওয়া নিরাপদ নয়, কারণ এতে রক্তচাপ কমে গিয়ে মাথা ঘোরা বা অজ্ঞান হওয়ার ঝুঁকি থাকে।",
  },
  {
    id: "faq-49",
    questionEn: "Can someone donate blood if they are overweight?",
    questionBn: "ওজন বেশি হলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes, overweight individuals can safely donate blood as long as they are healthy and have normal blood pressure and blood sugar levels.",
    answerBn:
      "হ্যাঁ, রক্তচাপ ও ডায়াবেটিস নিয়ন্ত্রণে থাকলে এবং অন্য কোনো জটিল রোগ না থাকলে ওজন বেশি হলেও নিরাপদে রক্ত দেওয়া যাবে।",
  },
  {
    id: "faq-50",
    questionEn: "Can someone donate blood if they have a history of fainting?",
    questionBn: "আগে অজ্ঞান হওয়ার ইতিহাস থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Tell the staff before donating. If you have fainted repeatedly during donations, avoid donating; if it happened once from hunger or dehydration, lying flat and hydrating helps.",
    answerBn:
      "রক্ত দেওয়ার আগে অবশ্যই চিকিৎসককে জানান। যদি আগে রক্ত দিতে গিয়ে বারবার অজ্ঞান হওয়ার ইতিহাস থাকে, তবে রক্ত না দেওয়াই নিরাপদ।",
  },
  {
    id: "faq-51",
    questionEn: "Can someone donate blood if they have a history of seizures?",
    questionBn: "খিঁচুনি বা মৃগীরোগের (Epilepsy) ইতিহাস থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "People with epilepsy or those taking anti-seizure medications should generally not donate blood, as blood loss can occasionally trigger a seizure.",
    answerBn:
      "মৃগীরোগ বা খিঁচুনির সমস্যা থাকলে কিংবা এর ওষুধ চলাকালীন রক্ত দেওয়া উচিত নয়, কারণ এতে খিঁচুনির ঝুঁকি বাড়তে পারে।",
  },
  {
    id: "faq-52",
    questionEn: "Can someone donate blood if they have heart disease?",
    questionBn: "হৃদরোগ (Heart Disease) থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No. Anyone with coronary heart disease, a past heart attack, angina, or heart failure must not donate blood.",
    answerBn:
      "না। হার্ট অ্যাটাক, হার্ট ফেইলিউর বা গুরুতর হৃদরোগের ইতিহাস থাকলে নিজের নিরাপত্তার স্বার্থে রক্ত দেওয়া যাবে না।",
  },
  {
    id: "faq-53",
    questionEn: "Can someone donate blood if they have kidney disease?",
    questionBn: "কিডনির রোগ থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No for chronic kidney disease, since the kidneys regulate red blood cell production. Someone fully cured of a minor kidney stone or infection may donate with doctor approval.",
    answerBn:
      "দীর্ঘমেয়াদী বা গুরুতর কিডনি রোগ থাকলে রক্ত দেওয়া যাবে না। তবে সাধারণ কিডনি পাথরের সমস্যা সম্পূর্ণ সেরে গেলে চিকিৎসকের পরামর্শে রক্ত দেওয়া যেতে পারে।",
  },
  {
    id: "faq-54",
    questionEn: "Can someone donate blood if they have liver disease?",
    questionBn: "লিভার বা যকৃতের রোগ থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No. People with chronic liver disease, cirrhosis, or viral hepatitis cannot donate blood.",
    answerBn:
      "না। লিভার সিরোসিস, ভাইরাল হেপাটাইটিস বা দীর্ঘমেয়াদী লিভারের রোগ থাকলে রক্ত দেওয়া যাবে না।",
  },
  {
    id: "faq-55",
    questionEn: "Can someone donate blood if they have thyroid problems?",
    questionBn: "থাইরয়েডের সমস্যা থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes, if your thyroid levels are well-controlled on stable medication and you have no symptoms of hyperthyroidism or severe hypothyroidism.",
    answerBn:
      "হ্যাঁ, ওষুধের মাধ্যমে থাইরয়েডের মাত্রা নিয়ন্ত্রণে থাকলে এবং আপনি সম্পূর্ণ সুস্থ বোধ করলে রক্ত দেওয়া যাবে।",
  },
  {
    id: "faq-56",
    questionEn: "Can someone donate blood if they have a skin condition?",
    questionBn: "চর্মরোগ থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes for mild non-infectious skin conditions, provided the skin over the vein where the needle is inserted is completely clear and uninflamed.",
    answerBn:
      "হ্যাঁ, যদি চর্মরোগটি সংক্রামক না হয় এবং হাতের যে স্থানে সুঁই ফোটানো হবে সেখানকার চামড়া সম্পূর্ণ সুস্থ ও পরিষ্কার থাকে।",
  },
  {
    id: "faq-57",
    questionEn: "Can someone donate blood if they have had jaundice?",
    questionBn: "জন্ডিস হয়ে থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "If it was food/water-borne jaundice (Hepatitis A or E), you can donate 12 months after full recovery. If it was from Hepatitis B or C, you can never donate.",
    answerBn:
      "খাবার বা পানিবাহিত সাধারণ জন্ডিস (হেপাটাইটিস এ বা ই) সম্পূর্ণ ভালো হওয়ার ১ বছর পর পরীক্ষা করে রক্ত দেওয়া যাবে। তবে হেপাটাইটিস বি বা সি-জনিত জন্ডিস হলে কখনোই রক্ত দেওয়া যাবে না।",
  },
  {
    id: "faq-58",
    questionEn: "Can someone donate blood if they have had hepatitis?",
    questionBn: "হেপাটাইটিস হয়ে থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Anyone with a history of Hepatitis B or Hepatitis C is permanently barred from donating blood. Hepatitis A or E patients can donate 12 months after complete recovery.",
    answerBn:
      "হেপাটাইটিস বি (HBV) বা হেপাটাইটিস সি (HCV) পজিটিভ হলে জীবনে কখনোই রক্ত দেওয়া যাবে না। তবে হেপাটাইটিস এ বা ই থেকে সম্পূর্ণ সুস্থ হওয়ার ১ বছর পর রক্ত দেওয়া যায়।",
  },
  {
    id: "faq-59",
    questionEn: "Can someone donate blood if they recently had dengue?",
    questionBn: "সম্প্রতি ডেঙ্গু হয়ে থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Wait at least 4 to 6 months after full recovery from dengue fever and ensure your hemoglobin and platelet counts are completely normal.",
    answerBn:
      "ডেঙ্গু জ্বর থেকে সম্পূর্ণ সুস্থ হওয়ার পর কমপক্ষে ৪ থেকে ৬ মাস অপেক্ষা করতে হবে এবং প্লাটিলেট ও হিমোগ্লোবিন স্বাভাবিক থাকতে হবে।",
  },
  {
    id: "faq-60",
    questionEn: "Can someone donate blood if they recently recovered from COVID-19?",
    questionBn: "সম্প্রতি কোভিড-১৯ থেকে সুস্থ হলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes, once at least 14 to 28 days have passed after complete resolution of all COVID-19 symptoms and you feel fully energetic.",
    answerBn:
      "হ্যাঁ, কোভিড-১৯ এর সব উপসর্গ পুরোপুরি সেরে যাওয়ার অন্তত ১৪ থেকে ২৮ দিন পর শরীর সম্পূর্ণ সুস্থ থাকলে রক্ত দেওয়া যাবে।",
  },
  {
    id: "faq-61",
    questionEn: "Can someone donate blood if they have HIV?",
    questionBn: "এইচআইভি (HIV) থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No. Anyone who is HIV positive must never donate blood, as HIV is directly transmitted to the recipient through blood.",
    answerBn:
      "না। এইচআইভি (HIV) পজিটিভ ব্যক্তি কখনোই রক্ত দিতে পারবেন না, কারণ এটি রক্তের মাধ্যমে সরাসরি গ্রহীতার শরীরে ছড়িয়ে পড়ে।",
  },
  {
    id: "faq-62",
    questionEn: "Can someone donate blood if they have a blood-borne infection?",
    questionBn: "রক্তবাহিত সংক্রমণ থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No. Anyone with a blood-borne infection (HIV, Hepatitis B/C, Syphilis, HTLV, or active Malaria) cannot donate blood.",
    answerBn:
      "না। রক্তবাহিত যেকোনো সংক্রমণ (যেমন—এইচআইভি, হেপাটাইটিস বি ও সি, সিফিলিস বা ম্যালেরিয়া) থাকলে রক্ত দেওয়া যাবে না।",
  },
  {
    id: "faq-63",
    questionEn: "Can someone donate blood if they recently received a blood transfusion?",
    questionBn: "সম্প্রতি নিজে রক্ত গ্রহণ করলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Wait at least 12 months after receiving a blood transfusion before donating blood yourself.",
    answerBn:
      "নিজের শরীরে রক্ত গ্রহণের পর কমপক্ষে ১২ মাস (১ বছর) পার না হওয়া পর্যন্ত রক্ত দেওয়া যাবে না।",
  },
  {
    id: "faq-64",
    questionEn: "Can someone donate blood if they recently donated plasma or platelets?",
    questionBn: "সম্প্রতি প্লাজমা বা প্লাটিলেট দিলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes, after waiting at least 2 to 4 weeks following a plasma or platelet apheresis donation, provided your hemoglobin is normal.",
    answerBn:
      "হ্যাঁ, প্লাজমা বা প্লাটিলেট দেওয়ার কমপক্ষে ২ থেকে ৪ সপ্তাহ পর হিমোগ্লোবিন ও রক্তকণিকার মাত্রা স্বাভাবিক থাকলে রক্ত দেওয়া যাবে।",
  },
  {
    id: "faq-65",
    questionEn: "Can someone donate blood if they have had a previous reaction to blood donation?",
    questionBn: "আগে রক্ত দিতে গিয়ে কোনো শারীরিক সমস্যা হয়ে থাকলে কি আবার রক্ত দেওয়া যাবে?",
    answerEn:
      "If it was mild dizziness, eating well and hydrating before donating usually prevents it. If you had a severe reaction, consult the blood bank physician first.",
    answerBn:
      "আগে কেবল হালকা মাথা ঘোরা হয়ে থাকলে ভালোভাবে খেয়ে ও পানি পান করে আবার রক্ত দেওয়া যাবে। তবে গুরুতর সমস্যা হয়ে থাকলে আগে চিকিৎসকের পরামর্শ নিন।",
  },
  {
    id: "faq-66",
    questionEn: "Can someone donate blood if they take iron supplements?",
    questionBn: "আয়রন ট্যাবলেট বা সাপ্লিমেন্ট খেলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes, if your hemoglobin level is normal at screening. If you are taking iron to treat diagnosed anemia, wait until your anemia is fully corrected.",
    answerBn:
      "হিমোগ্লোবিন স্বাভাবিক থাকলে সাধারণ আয়রন সাপ্লিমেন্ট খেলেও রক্ত দেওয়া যাবে। তবে রক্তস্বল্পতার চিকিৎসার জন্য আয়রন চললে তা পূর্ণ নিরাময় না হওয়া পর্যন্ত অপেক্ষা করুন।",
  },
  {
    id: "faq-67",
    questionEn: "Can someone donate blood if they recently took vitamin supplements?",
    questionBn: "সম্প্রতি ভিটামিন সাপ্লিমেন্ট খেলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes. Taking daily multivitamins, Vitamin C, Vitamin D, or B-complex supplements does not prevent you from donating blood.",
    answerBn:
      "হ্যাঁ। সাধারণ মাল্টিভিটামিন, ভিটামিন সি, ডি বা বি-কমপ্লেক্স জাতীয় সাপ্লিমেন্ট খেলে রক্ত দিতে কোনো বাধা নেই।",
  },
  {
    id: "faq-68",
    questionEn: "Can someone donate blood if they have low hemoglobin?",
    questionBn: "হিমোগ্লোবিন কম থাকলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "No. Hemoglobin must be at least 12.5 g/dL for women and 13.0 g/dL for men. Eat iron-rich foods and wait until your hemoglobin reaches the normal range.",
    answerBn:
      "না। রক্তদানের জন্য নারীদের হিমোগ্লোবিন কমপক্ষে ১২.৫ g/dL এবং পুরুষদের ১৩.০ g/dL থাকা আবশ্যক। এর কম হলে আয়রনযুক্ত খাবার খেয়ে হিমোগ্লোবিন স্বাভাবিক করার পর রক্ত দিন।",
  },
  {
    id: "faq-69",
    questionEn: "Can someone donate blood if they recently travelled abroad?",
    questionBn: "সম্প্রতি বিদেশ ভ্রমণ করলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Yes in most cases, though travel to malaria-endemic or yellow-fever regions requires a temporary deferral of 1 to 3 months (or up to 1 year) after returning.",
    answerBn:
      "সাধারণত দেওয়া যায়। তবে ম্যালেরিয়া বা ইয়েলো ফিভার প্রবণ কোনো অঞ্চলে ভ্রমণ করলে দেশে ফেরার পর ১ থেকে ৩ মাস অপেক্ষা করতে হতে পারে।",
  },
  {
    id: "faq-70",
    questionEn: "Can someone donate blood if they recently had a serious illness?",
    questionBn: "সম্প্রতি গুরুতর কোনো অসুখে ভুগলে কি রক্ত দেওয়া যাবে?",
    answerEn:
      "Wait until you have made a complete recovery, finished all medications, regained full strength, and been cleared by a physician (typically 3–6 months).",
    answerBn:
      "গুরুতর অসুস্থতা থেকে সম্পূর্ণ সুস্থ হওয়ার পর, সব ওষুধ শেষ হলে এবং শরীরের স্বাভাবিক শক্তি ফিরে পেলে (সাধারণত ৩ থেকে ৬ মাস পর) চিকিৎসকের পরামর্শে রক্ত দেওয়া যাবে।",
  },
];

export interface TeamMember {
  id: string;
  nameEn: string;
  nameBn: string;
  roleEn: string;
  roleBn: string;
  bloodGroup: string;
  photoUrl?: string;
  locationEn: string;
  locationBn: string;
  professionEn: string;
  professionBn: string;
  educationEn: string;
  educationBn: string;
  storyEn: string;
  storyBn: string;
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "member-1",
    nameEn: "Team Member Name",
    nameBn: "টিম সদস্যের নাম",
    roleEn: "Founder & Project Lead",
    roleBn: "প্রতিষ্ঠাতা ও প্রজেক্ট লিড",
    bloodGroup: "O+",
    photoUrl: "",
    locationEn: "Bangladesh",
    locationBn: "বাংলাদেশ",
    professionEn: "Creator & Coordinator",
    professionBn: "উদ্যোক্তা ও সমন্বয়ক",
    educationEn: "Add education / background",
    educationBn: "শিক্ষাগত যোগ্যতা / পেশা যুক্ত করুন",
    storyEn:
      "Share the personal story behind starting BloodLink and the vision to ensure no patient suffers due to a lack of blood in emergencies.",
    storyBn:
      "জরুরি মুহূর্তে কোনো রোগী যেন রক্তের অভাবে কষ্ট না পান—সেই লক্ষ্য ও স্বপ্ন থেকে ব্লাডলিংক গড়ে তোলার গল্প এখানে যুক্ত হবে।",
  },
  {
    id: "member-2",
    nameEn: "Team Member Name",
    nameBn: "টিম সদস্যের নাম",
    roleEn: "Co-Organizer & Outreach",
    roleBn: "সহ-সংগঠক ও আউটরিচ",
    bloodGroup: "B+",
    photoUrl: "",
    locationEn: "Bangladesh",
    locationBn: "বাংলাদেশ",
    professionEn: "Community & Operations",
    professionBn: "কমিউনিটি ও পরিচালনা",
    educationEn: "Add education / background",
    educationBn: "শিক্ষাগত যোগ্যতা / পেশা যুক্ত করুন",
    storyEn:
      "Dedicated to connecting voluntary blood donors across every district and upazila and spreading awareness about safe blood donation.",
    storyBn:
      "দেশের প্রতিটি জেলা ও উপজেলায় স্বেচ্ছায় রক্তদাতাদের একত্রিত করা এবং নিরাপদ রক্তদান সম্পর্কে সচেতনতা ছড়িয়ে দেওয়ার কাজে নিয়োজিত।",
  },
];

export const SideMenuDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = React.memo(({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  useScrollLock(isOpen);

  // Swipe right-to-left on the open menu closes it
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef(0);

  return createPortal(
    <div
      className={`fixed inset-0 z-[120] flex ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!isOpen}
    >
      {/* GPU-accelerated Backdrop (no expensive backdrop-blur) */}
      <div
        onClick={onClose}
        className={`fixed inset-0 touch-none bg-slate-900/50 transition-opacity duration-200 ease-out will-change-[opacity] ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Pre-mounted GPU-composited Slide-out Side Drawer */}
      <aside
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
          touchStartY.current = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.touches[0].clientX - touchStartX.current;
          const dy = e.touches[0].clientY - touchStartY.current;
          if (dx < -60 && Math.abs(dy) < Math.abs(dx) * 0.5) {
            touchStartX.current = null;
            onClose();
          }
        }}
        onTouchEnd={() => {
          touchStartX.current = null;
        }}
        className={`relative z-10 w-[82vw] max-w-[310px] h-[100dvh] bg-white shadow-xl flex flex-col justify-between overflow-y-auto overscroll-contain select-none transform-gpu will-change-transform transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Branded Red Top Header */}
          <div className="bg-[#c80000] text-white p-5 pb-6 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#c80000] text-white border-2 border-white flex items-center justify-center shadow-md shrink-0">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 100 100">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M 50 12.6 C 36 32, 18.8 46, 18.8 60.5 C 18.8 77.5, 32.8 89.8, 50 89.8 C 67.2 89.8, 81.2 77.5, 81.2 60.5 C 81.2 46, 64 32, 50 12.6 Z M 50 48 A 16.25 16.25 0 1 0 50 80.5 A 16.25 16.25 0 1 0 50 48 Z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight leading-none">
                    BloodLink
                  </h2>
                  <p className="text-[11px] text-white/90 font-semibold mt-1">
                    {lang === "bn" ? "রক্ত দিন, জীবন বাঁচান" : "Donate Blood, Save Lives"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 -mr-1 -mt-1 rounded-full text-white/90 hover:text-white hover:bg-white/15 active:bg-white/25 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Menu Options List */}
          <div className="p-3.5 space-y-2.5">
            {/* Option: How to Use App (YouTube Video Tutorial) */}
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/how-to-use");
              }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 hover:bg-red-50/70 border border-slate-200/70 hover:border-red-200 active:scale-[0.99] transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-100/80 text-[#c80000] flex items-center justify-center shrink-0 group-hover:bg-[#c80000] group-hover:text-white transition-colors">
                <Play className="w-5 h-5 ml-0.5 fill-current" />
              </div>
              <div className="flex-1 min-w-0 font-bold text-sm text-slate-800 leading-snug">
                {lang === "bn" ? "অ্যাপ ব্যবহারের নিয়ম" : "How to use the app"}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#c80000] shrink-0" />
            </button>

            {/* Option 1: Learn About Blood Donation */}
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/learn");
              }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 hover:bg-red-50/70 border border-slate-200/70 hover:border-red-200 active:scale-[0.99] transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-100/80 text-[#c80000] flex items-center justify-center shrink-0 group-hover:bg-[#c80000] group-hover:text-white transition-colors">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 font-bold text-sm text-slate-800 leading-snug">
                {lang === "bn" ? "রক্তদান সম্পর্কে জানুন" : "Learn About Blood Donation"}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#c80000] shrink-0" />
            </button>

            {/* Option 2: Read Our Blogs */}
            {BLOG_WEBSITE_URL ? (
              <a
                href={BLOG_WEBSITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 hover:bg-red-50/70 border border-slate-200/70 hover:border-red-200 active:scale-[0.99] transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-red-100/80 text-[#c80000] flex items-center justify-center shrink-0 group-hover:bg-[#c80000] group-hover:text-white transition-colors">
                  <Newspaper className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 font-bold text-sm text-slate-800 leading-snug">
                  {lang === "bn" ? "আমাদের ব্লগ পড়ুন" : "Read Our Blogs"}
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#c80000] shrink-0" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("/blogs");
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 hover:bg-red-50/70 border border-slate-200/70 hover:border-red-200 active:scale-[0.99] transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-red-100/80 text-[#c80000] flex items-center justify-center shrink-0 group-hover:bg-[#c80000] group-hover:text-white transition-colors">
                  <Newspaper className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 font-bold text-sm text-slate-800 leading-snug">
                  {lang === "bn" ? "আমাদের ব্লগ পড়ুন" : "Read Our Blogs"}
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#c80000] shrink-0" />
              </button>
            )}

            {/* Option 3: National Helpline Numbers */}
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/helplines");
              }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 hover:bg-red-50/70 border border-slate-200/70 hover:border-red-200 active:scale-[0.99] transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-100/80 text-[#c80000] flex items-center justify-center shrink-0 group-hover:bg-[#c80000] group-hover:text-white transition-colors">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 font-bold text-sm text-slate-800 leading-snug">
                {lang === "bn" ? "জাতীয় হেল্পলাইন নম্বরসমূহ" : "National Helpline Numbers"}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#c80000] shrink-0" />
            </button>

            {/* Option 4: Support Us */}
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/support");
              }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 hover:bg-red-50/70 border border-slate-200/70 hover:border-red-200 active:scale-[0.99] transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-100/80 text-[#c80000] flex items-center justify-center shrink-0 group-hover:bg-[#c80000] group-hover:text-white transition-colors">
                <SupportTakaHandsIcon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0 font-bold text-sm text-slate-800 leading-snug">
                {lang === "bn" ? "আমাদের পাশে দাঁড়ান" : "Support Us"}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#c80000] shrink-0" />
            </button>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 text-center">
          <p className="text-[11px] font-bold italic text-slate-500">
            {lang === "bn"
              ? "জীবন বাঁচানোর জন্য একটি অলাভজনক উদ্যোগ"
              : "A non-profit platform that saves lives"}
          </p>
        </div>
      </aside>
    </div>,
    document.body
  );
});

const PageSubHeader: React.FC<{
  title: string;
  showLanguageSwitch?: boolean;
  currentLang?: Language;
  onSelectLang?: (newLang: Language) => void;
}> = ({
  title,
  showLanguageSwitch = false,
  currentLang,
  onSelectLang,
}) => {
  const navigate = useNavigate();
  const handleBack = () => goBack(navigate);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between gap-2 shadow-sm">
      <div className="flex items-center gap-1 min-w-0">
        <button
          onClick={handleBack}
          className="relative z-20 p-2 -ml-2 hover:bg-slate-50 active:bg-slate-100 rounded-full transition-colors flex items-center justify-center min-w-[40px] min-h-[40px] shrink-0 cursor-pointer"
          aria-label="Go back"
        >
          <ChevronLeft className="w-6 h-6 text-slate-800" />
        </button>
        {showLanguageSwitch && (
          <h1 className="font-bold text-sm sm:text-base uppercase tracking-wide text-slate-800 truncate">
            {title}
          </h1>
        )}
      </div>
      {!showLanguageSwitch && (
        <h1 className="flex-1 text-center font-bold text-base uppercase tracking-wider text-slate-800">
          {title}
        </h1>
      )}
      {showLanguageSwitch ? (
        <LanguageSwitch
          variant="light"
          className="shrink-0"
          currentLang={currentLang}
          onSelectLang={onSelectLang}
        />
      ) : (
        <div className="w-10" />
      )}
    </header>
  );
};

export const LearnAboutDonationView: React.FC = () => {
  // Primarily starts in Bangla ("bn") upon entering the FAQ section, even if English is selected as the global app language
  const [faqLang, setFaqLang] = useState<Language>("bn");
  const n = (val: string | number) => toBnNumber(val, faqLang);

  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set([BLOOD_DONATION_FAQS[0]?.id || ""])
  );
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(() => {
    try {
      return sessionStorage.getItem("bloodlink_ai_modal_open") === "true";
    } catch {
      return false;
    }
  });
  const [aiInitialQuestion, setAiInitialQuestion] = useState("");

  useEffect(() => {
    try {
      if (isAiModalOpen) {
        sessionStorage.setItem("bloodlink_ai_modal_open", "true");
      } else {
        sessionStorage.removeItem("bloodlink_ai_modal_open");
      }
    } catch {}
  }, [isAiModalOpen]);

  const trimmedQuery = query.trim();
  const filteredFaqs = trimmedQuery
    ? searchBloodFaqs(BLOOD_DONATION_FAQS, trimmedQuery)
    : BLOOD_DONATION_FAQS;

  // Auto-expand top match when user searches
  useEffect(() => {
    if (trimmedQuery && filteredFaqs.length > 0) {
      setOpenIds((prev) => {
        const next = new Set(prev);
        next.add(filteredFaqs[0].id);
        return next;
      });
    }
  }, [trimmedQuery]);

  const toggleItem = (id: string) => {
    searchInputRef.current?.blur();
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allOpen =
    filteredFaqs.length > 0 && filteredFaqs.every((f) => openIds.has(f.id));

  const toggleAll = () => {
    if (allOpen) {
      setOpenIds(new Set());
    } else {
      setOpenIds(new Set(filteredFaqs.map((f) => f.id)));
    }
  };

  const faqSchemaJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: BLOOD_DONATION_FAQS.map((item) => ({
      "@type": "Question",
      name: faqLang === "bn" ? item.questionBn : item.questionEn,
      acceptedAnswer: {
        "@type": "Answer",
        text: faqLang === "bn" ? item.answerBn : item.answerEn,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchemaJsonLd) }}
      />
      <PageSubHeader
        title={faqLang === "bn" ? "রক্তদান সম্পর্কে জানুন" : "Learn About Donation"}
        showLanguageSwitch
        currentLang={faqLang}
        onSelectLang={setFaqLang}
      />
      <main className="selectable max-w-md mx-auto p-5 pb-24 space-y-4">
        {/* Intro Banner */}
        <div className="bg-[#c80000] text-white rounded-3xl p-5 shadow-md space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-extrabold text-base leading-snug">
              {faqLang === "bn"
                ? "রক্তদান নিয়ে সাধারণ প্রশ্ন ও উত্তর"
                : "Questions & Short Answers"}
            </h2>
          </div>
          <p className="text-xs text-white/90 leading-relaxed">
            {faqLang === "bn"
              ? "রক্তদান সম্পর্কে সঠিক তথ্য জানুন। আপনার এক ব্যাগ রক্ত বাঁচাতে পারে মুমূর্ষু রোগীর প্রাণ।"
              : "Everything you should know before and after donating blood. One donation can save up to three lives."}
          </p>
        </div>

        {/* Quick Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            searchInputRef.current?.blur();
          }}
          className="relative"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            placeholder={
              faqLang === "bn"
                ? "প্রশ্ন খুঁজুন (যেমন: জ্বর, ডায়াবেটিস, ট্যাটু)..."
                : "Search questions (e.g., fever, diabetes, tattoo)..."
            }
            className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-9 py-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 shadow-xs [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchInputRef.current?.blur();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Count & Expand/Collapse All */}
        {filteredFaqs.length > 0 && (
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="text-[11px] font-bold text-slate-500">
              {faqLang === "bn"
                ? `মোট ${n(filteredFaqs.length)}টি প্রশ্ন`
                : `${filteredFaqs.length} Questions`}
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-[11px] font-bold text-[#c80000] hover:text-red-800 transition-colors"
            >
              {allOpen
                ? faqLang === "bn"
                  ? "সবগুলো বন্ধ করুন"
                  : "Collapse All"
                : faqLang === "bn"
                ? "সবগুলো খুলুন"
                : "Expand All"}
            </button>
          </div>
        )}

        {/* Q&A Accordion Cards */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 text-center text-xs text-slate-500 font-semibold">
              {faqLang === "bn"
                ? "কোনো প্রশ্ন পাওয়া যায়নি।"
                : "No matching questions found."}
            </div>
          ) : (
            filteredFaqs.map((item) => {
              const isOpen = openIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-[background-color,border-color,color,opacity,transform,box-shadow]"
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-[#c80000] ring-4 ring-red-50 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="font-bold text-sm text-slate-800 leading-snug">
                        {faqLang === "bn" ? item.questionBn : item.questionEn}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#c80000]" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 text-xs text-slate-600 leading-relaxed font-medium">
                      {faqLang === "bn" ? item.answerBn : item.answerEn}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Floating AI Assistant Mascot Button in Bottom-Right Corner */}
      <aside className="fixed bottom-6 right-5 sm:right-6 z-40 select-none">
        <button
          type="button"
          onClick={() => {
            setAiInitialQuestion("");
            setIsAiModalOpen(true);
          }}
          className="w-13 h-13 rounded-full bg-[#c80000] p-0 shadow-xl shadow-red-950/40 active:scale-95 hover:scale-105 transition-[background-color,border-color,color,opacity,transform,box-shadow] duration-150 flex items-center justify-center cursor-pointer border-2 border-white ring-2 ring-red-500/30 overflow-hidden"
          aria-label={faqLang === "bn" ? "এআই সহকারী খুলুন" : "Open AI Assistant"}
          title={faqLang === "bn" ? "রক্তদান এআই সহকারী" : "BloodLink AI Assistant"}
        >
          <img
            src="/assets/assistant-button.png"
            alt="BloodLink AI Assistant"
            className="w-full h-full object-cover pointer-events-none"
          />
        </button>
      </aside>

      {/* BloodLink AI Assistant Modal */}
      <FaqAssistantModal
        faqs={BLOOD_DONATION_FAQS}
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        initialQuestion={aiInitialQuestion}
        lang={faqLang}
      />
    </div>
  );
};

export const MeetOurTeamView: React.FC = () => {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <PageSubHeader title={lang === "bn" ? "আমাদের টিম" : "Meet Our Team"} />
      <main className="max-w-md mx-auto p-5 pb-24 space-y-5">
        {/* Our Story Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-[#c80000] text-[11px] font-extrabold border border-red-100">
            <Heart className="w-3.5 h-3.5 fill-[#c80000]" />
            <span>{lang === "bn" ? "আমাদের গল্প" : "Our Story"}</span>
          </div>
          <h2 className="text-base font-extrabold text-slate-900">
            {lang === "bn"
              ? "কেন আমরা BloodLink শুরু করেছি"
              : "Why We Built BloodLink"}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {lang === "bn"
              ? "জরুরি মুহূর্তে এক ব্যাগ রক্ত জোগাড় করতে রোগীর পরিবারের যে অসহায়ত্ব তৈরি হয়, তা দূর করতেই আমাদের এই ক্ষুদ্র প্রয়াস। প্রযুক্তির মাধ্যমে বাংলাদেশের প্রতিটি উপজেলায় রক্তদাতা ও রোগীর মধ্যে দ্রুততম সেতুবন্ধন তৈরি করাই আমাদের লক্ষ্য।"
              : "In medical emergencies, families often struggle to find the right blood donor on time. BloodLink was created to bridge that gap—connecting patients directly with verified local donors across every Upazila in Bangladesh."}
          </p>
        </div>

        {/* Team Member Cards */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">
            {lang === "bn" ? "প্রজেক্ট টিম ও পরিচিতি" : "Team Members & Bio-Data"}
          </h3>

          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden p-5 space-y-4"
            >
              {/* Photo + Name + Role + Blood Group */}
              <div className="flex items-center gap-4">
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={lang === "bn" ? member.nameBn : member.nameEn}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-red-100 shrink-0 shadow-xs"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-red-50 border-2 border-red-100 text-[#c80000] flex flex-col items-center justify-center shrink-0">
                    <Users className="w-6 h-6" />
                    <span className="text-[8px] font-bold uppercase mt-0.5 text-red-400">
                      {lang === "bn" ? "ছবি" : "Photo"}
                    </span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-base text-slate-900 truncate">
                      {lang === "bn" ? member.nameBn : member.nameEn}
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-lg bg-red-50 text-[#c80000] border border-red-100 font-black text-xs shrink-0">
                      {member.bloodGroup}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#c80000] mt-0.5">
                    {lang === "bn" ? member.roleBn : member.roleEn}
                  </p>
                </div>
              </div>

              {/* Short Bio-Data Grid */}
              <div className="grid grid-cols-1 gap-2 bg-slate-50 rounded-2xl p-3 border border-slate-100 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold">
                    {lang === "bn" ? member.professionBn : member.professionEn}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold">
                    {lang === "bn" ? member.educationBn : member.educationEn}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold">
                    {lang === "bn" ? member.locationBn : member.locationEn}
                  </span>
                </div>
              </div>

              {/* Member Story */}
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {lang === "bn" ? "গল্প ও ভাবনা" : "Story & Vision"}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {lang === "bn" ? member.storyBn : member.storyEn}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export const BlogsPortalView: React.FC = () => {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <PageSubHeader title={lang === "bn" ? "আমাদের ব্লগ" : "Read Our Blogs"} />
      <main className="max-w-md mx-auto p-5 pb-24 space-y-4">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#c80000] border border-red-100 flex items-center justify-center mx-auto">
            <Newspaper className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-extrabold text-slate-900">
              {lang === "bn" ? "BloodLink ব্লগ ওয়েবসাইট" : "BloodLink Blog Website"}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {lang === "bn"
                ? "রক্তদান বিষয়ক নিবন্ধ, স্বাস্থ্য পরামর্শ এবং জীবন বাঁচানোর বাস্তব গল্প পড়তে আমাদের ব্লগ ওয়েবসাইটে ভিজিট করুন।"
                : "Read articles on blood donation, health tips, and real-life stories of donors and survivors on our blog website."}
            </p>
          </div>

          {BLOG_WEBSITE_URL ? (
            <a
              href={BLOG_WEBSITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#c80000] text-white font-bold py-3 px-5 rounded-xl shadow-sm hover:bg-red-800 active:scale-[0.99] transition-[background-color,border-color,color,opacity,transform,box-shadow] text-xs"
            >
              <span>
                {lang === "bn" ? "ব্লগ ওয়েবসাইটে যান" : "Open Blog Website"}
              </span>
              <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 text-xs font-semibold">
              {lang === "bn"
                ? "আপনার ব্লগ ওয়েবসাইটের লিংক (URL) দিলে এখানে সরাসরি যুক্ত করে দেওয়া হবে।"
                : "Share your blog website URL whenever ready and this button will take users directly there."}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export const NationalHelplinesView: React.FC = () => {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <PageSubHeader
        title={lang === "bn" ? "জাতীয় হেল্পলাইন" : "National Helplines"}
      />
      <main className="max-w-md mx-auto p-5 pb-24 space-y-4">
        {/* Intro Banner */}
        <div className="bg-[#c80000] text-white rounded-3xl p-5 shadow-md space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-extrabold text-base leading-snug">
              {lang === "bn"
                ? "জাতীয় জরুরি হেল্পলাইন নম্বরসমূহ"
                : "Emergency & National Helplines"}
            </h2>
          </div>
          <p className="text-xs text-white/90 leading-relaxed">
            {lang === "bn"
              ? "যেকোনো জরুরি মুহূর্তে পুলিশ, অ্যাম্বুলেন্স, ফায়ার সার্ভিস বা ডাক্তারের পরামর্শের জন্য নিচের নম্বরগুলোতে সরাসরি কল করুন।"
              : "Tap any helpline below to call directly for 24/7 ambulance, medical advice, fire rescue, or police assistance."}
          </p>
        </div>

        {/* Helpline Cards */}
        <div className="space-y-3">
          {NATIONAL_HELPLINES.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex items-center justify-between gap-3.5"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-red-50 text-[#c80000] border border-red-100 font-black text-sm tracking-wide">
                    {lang === "bn" ? item.numberBn : item.numberEn}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                    {lang === "bn" ? item.badgeBn : item.badgeEn}
                  </span>
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 leading-snug pt-0.5">
                  {lang === "bn" ? item.titleBn : item.titleEn}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {lang === "bn" ? item.descBn : item.descEn}
                </p>
              </div>

              <a
                href={`tel:${item.dialNumber}`}
                className="shrink-0 inline-flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-[#c80000] text-white font-bold shadow-sm hover:bg-red-800 active:scale-95 transition-[background-color,border-color,color,opacity,transform,box-shadow]"
                aria-label={`Call ${item.dialNumber}`}
              >
                <PhoneCall className="w-5 h-5" />
                <span className="text-[9px] font-extrabold uppercase tracking-wider mt-1">
                  {lang === "bn" ? "কল" : "Call"}
                </span>
              </a>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export interface SupportMethod {
  id: string;
  providerEn: string;
  providerBn: string;
  typeEn: string;
  typeBn: string;
  number: string;
  colorClass: string;
}

export const SUPPORT_METHODS: SupportMethod[] = [
  {
    id: "bkash",
    providerEn: "bKash",
    providerBn: "বিকাশ (bKash)",
    typeEn: "Personal / Send Money",
    typeBn: "পার্সোনাল / সেন্ড মানি",
    number: "01XXXXXXXXX",
    colorClass: "bg-pink-50 text-pink-700 border-pink-200",
  },
  {
    id: "nagad",
    providerEn: "Nagad",
    providerBn: "নগদ (Nagad)",
    typeEn: "Personal / Send Money",
    typeBn: "পার্সোনাল / সেন্ড মানি",
    number: "01XXXXXXXXX",
    colorClass: "bg-orange-50 text-orange-700 border-orange-200",
  },
];

export const SupportUsView: React.FC = () => {
  const { lang, n } = useLanguage();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, num: string) => {
    try {
      navigator.clipboard.writeText(num);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <PageSubHeader
        title={lang === "bn" ? "আমাদের পাশে দাঁড়ান" : "Support Us"}
      />
      <main className="max-w-md mx-auto p-5 pb-24 space-y-4">
        {/* Hero Banner */}
        <div className="bg-[#c80000] text-white rounded-3xl p-5 shadow-md space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <SupportTakaHandsIcon className="w-6 h-6 text-white" />
            </div>
            <h2 className="font-extrabold text-base leading-snug">
              {lang === "bn"
                ? "এই মানবিক উদ্যোগে পাশে থাকুন"
                : "Help Keep BloodLink 100% Free"}
            </h2>
          </div>
          <p className="text-xs text-white/90 leading-relaxed">
            {lang === "bn"
              ? "BloodLink একটি সম্পূর্ণ অলাভজনক প্ল্যাটফর্ম। সার্ভার খরচ, রক্ষণাবেক্ষণ এবং সারা দেশে স্বেচ্ছায় রক্তদাতাদের নেটওয়ার্ক ছড়িয়ে দিতে আপনার যেকোনো ক্ষুদ্র সহায়তাও আমাদের জন্য অমূল্য।"
              : "BloodLink is a 100% non-profit platform. Your contribution helps cover server hosting, maintenance, and nationwide donor outreach so patients never have to pay a single taka."}
          </p>
        </div>

        {/* Mobile Banking Support Cards */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            {lang === "bn" ? "মোবাইল ব্যাংকিং সহায়তা" : "Mobile Banking Support"}
          </h3>

          <div className="space-y-2.5">
            {SUPPORT_METHODS.map((item) => {
              const isCopied = copiedId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${item.colorClass}`}
                      >
                        {lang === "bn" ? item.providerBn : item.providerEn}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {lang === "bn" ? item.typeBn : item.typeEn}
                      </span>
                    </div>
                    <div className="font-extrabold text-sm text-slate-900 tracking-wide pt-1">
                      {lang === "bn" ? n(item.number) : item.number}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(item.id, item.number)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-red-200 hover:text-[#c80000] active:scale-95 transition-[background-color,border-color,color,opacity,transform,box-shadow] text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs shrink-0"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">
                          {lang === "bn" ? "কপি হয়েছে" : "Copied"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{lang === "bn" ? "কপি" : "Copy"}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export const HowToUseAppView: React.FC = () => {
  const { lang } = useLanguage();
  const [videoUrl, setVideoUrl] = useState(() => {
    return (
      localStorage.getItem("bloodlink_tutorial_yt_url") ||
      localStorage.getItem("amar_shonit_tutorial_yt_url") ||
      DEFAULT_TUTORIAL_YOUTUBE_URL
    );
  });
  const [showConfig, setShowConfig] = useState(false);
  const [inputUrl, setInputUrl] = useState(videoUrl);
  const [copied, setCopied] = useState(false);

  const videoId = extractYouTubeId(videoUrl);
  // Autoplay and modest branding for clean distraction-free playback
  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
    : "";
  const directWatchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : videoUrl;

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    setVideoUrl(inputUrl.trim());
    localStorage.setItem("bloodlink_tutorial_yt_url", inputUrl.trim());
    localStorage.removeItem("amar_shonit_tutorial_yt_url");
    setShowConfig(false);
  };

  const handleResetUrl = () => {
    setVideoUrl(DEFAULT_TUTORIAL_YOUTUBE_URL);
    setInputUrl(DEFAULT_TUTORIAL_YOUTUBE_URL);
    localStorage.removeItem("bloodlink_tutorial_yt_url");
    localStorage.removeItem("amar_shonit_tutorial_yt_url");
    setShowConfig(false);
  };

  const handleCopy = () => {
    if (directWatchUrl) {
      navigator.clipboard.writeText(directWatchUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <PageSubHeader
        title={lang === "bn" ? "অ্যাপ ব্যবহারের নিয়ম" : "How to use the app"}
        showLanguageSwitch
      />

      <main className="max-w-xl mx-auto p-4 sm:p-6 pb-24 space-y-4">
        {/* Video Player Card */}
        <div className="bg-white rounded-3xl p-3 sm:p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-slate-200">
            {videoId ? (
              <iframe
                src={embedUrl}
                title={lang === "bn" ? "অ্যাপ ব্যবহারের নিয়ম ভিডিও" : "How to use the app tutorial"}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/70 p-6 text-center space-y-2">
                <Play className="w-12 h-12 text-[#c80000] opacity-80" />
                <p className="text-sm font-medium">
                  {lang === "bn"
                    ? "ভিডিও লিঙ্ক যোগ করা হয়নি"
                    : "No YouTube video link configured"}
                </p>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 px-1">
            <div className="flex items-center gap-2">
              <a
                href={directWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-[background-color,border-color,color,opacity,transform,box-shadow]"
              >
                <Youtube className="w-4 h-4 fill-current" />
                <span>{lang === "bn" ? "ইউটিউবে দেখুন" : "Watch on YouTube"}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold active:scale-95 transition-[background-color,border-color,color,opacity,transform,box-shadow]"
                title={lang === "bn" ? "ভিডিও লিংক কপি করুন" : "Copy video link"}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">{lang === "bn" ? "কপি হয়েছে" : "Copied"}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{lang === "bn" ? "লিংক কপি" : "Copy"}</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick config toggle for easy previewing and updating YouTube video */}
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-2 py-1 px-2"
            >
              {lang === "bn" ? "ভিডিও লিঙ্ক পরিবর্তন করুন" : "Change Video URL"}
            </button>
          </div>

          {/* URL Configuration Input Box */}
          {showConfig && (
            <form onSubmit={handleSaveUrl} className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {lang === "bn" ? "ইউটিউব ভিডিও লিঙ্ক / আইডি বসান" : "Paste YouTube Video Link or ID"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://youtu.be/... or https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c80000]"
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResetUrl}
                  className="text-[11px] text-slate-500 hover:text-slate-700 underline"
                >
                  {lang === "bn" ? "ডিফল্ট ভিডিওতে ফিরুন" : "Reset Default"}
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#c80000] hover:bg-[#a50000] text-white rounded-xl text-xs font-bold transition-colors"
                >
                  {lang === "bn" ? "সংরক্ষণ ও চালু করুন" : "Save & Play"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
