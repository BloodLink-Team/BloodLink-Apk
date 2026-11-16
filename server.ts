import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let googleModulePromise = null;
async function getGoogle() {
  if (!googleModulePromise) {
    googleModulePromise = import("googleapis").then((m) => m.google);
  }
  return googleModulePromise;
}

function getRequestPayload(req) {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body) && Object.keys(req.body).length > 0) {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.trim().startsWith("{")) {
    try {
      return JSON.parse(req.body);
    } catch {
      // ignore
    }
  }
  const queryPayload = req.query?.payload;
  if (typeof queryPayload === "string" && queryPayload.trim()) {
    try {
      return JSON.parse(queryPayload);
    } catch {
      // ignore
    }
  }
  return {};
}

async function startServer() {
  const app = express();
  const portArgIndex = process.argv.indexOf("--port");
  const portFromArg = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : null;
  const PORT =
    portFromArg ||
    Number(process.env.DEFAULT_APP_PORT) ||
    (process.env.PORT && process.env.PORT !== "8080" ? Number(process.env.PORT) : 3000);

  app.use(express.json());
  app.use(express.text({ type: ["text/plain", "application/json"] }));

  // CORS and Access-Control headers to ensure external tools (PWABuilder, Lighthouse, etc.) can fetch manifest, icons, and pages
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check endpoint for Cloud Run & auth cache pre-warming
  app.get("/api/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.status(200).json({ status: "ok", ts: Date.now() });
  });

  // Comprehensive Clinical Knowledge Dictionary for BloodLink Bangladesh
  const CLINICAL_KNOWLEDGE_TOPICS = [
    {
      keywords: ["ট্যাটু", "tattoo", "পিয়ার্সিং", "piercing", "কান ফোঁড়ানো", "নাক ফোঁড়ানো"],
      answerBn: "ট্যাটু বা বডি পিয়ার্সিং করার পর রক্তদানের জন্য কমপক্ষে ৬ মাস থেকে ১ বছর (সাধারণত ৬ মাস) অপেক্ষা করতে হবে।\n\nএটি রক্তবাহিত সংক্রমণ (যেমন হেপাটাইটিস বি, সি বা এইচআইভি)-এর সম্ভাব্য ঝুঁকি পুরোপুরি নাকচ করার জন্য জরুরি। শরীরে ক্ষত সম্পূর্ণ শুকিয়ে গেলে এবং শারীরিক অবস্থা স্বাভাবিক থাকলে নিরাপদ রক্তদান করা যাবে।",
      answerEn: "You must wait at least 6 months (and up to 1 year depending on clinical facility hygiene) after getting a tattoo or body piercing before donating blood.\n\nThis waiting period ensures that any window period for blood-borne viral infections (such as Hepatitis B/C or HIV) has safely elapsed and your body has completely healed.",
    },
    {
      keywords: ["ডায়াবেটিস", "diabetes", "সুগার", "ইনসুলিন", "insulin"],
      answerBn: "খাদ্যাভ্যাস বা মুখে খাওয়ার সাধারণ ওষুধের মাধ্যমে ডায়াবেটিস নিয়ন্ত্রণে থাকলে এবং রক্তদানের দিন রক্তে শর্করার মাত্রা স্বাভাবিক থাকলে রক্ত দেওয়া যাবে।\n\nতবে যারা নিয়মিত ইনসুলিন ইনজেকশন গ্রহণ করেন অথবা ডায়াবেটিসজনিত হৃদরোগ, স্নায়ুরোগ বা কিডনির জটিলতায় ভুগছেন, তারা রক্ত দিতে পারবেন না।",
      answerEn: "People with diabetes can donate blood if their blood sugar is well-controlled through diet or oral medications without symptoms.\n\nHowever, donors requiring daily insulin injections or experiencing diabetic organ complications are ineligible for donation.",
    },
    {
      keywords: ["প্রেসার", "রক্তচাপ", "pressure", "blood pressure", "উচ্চ রক্তচাপ", "নিম্ন রক্তচাপ", "হাই প্রেসার", "লো প্রেসার"],
      answerBn: "রক্তদানের সময় রক্তচাপ স্বাভাবিক সীমায় থাকা আবশ্যক (সিস্টোলিক ১০০–১৪০ mmHg এবং ডায়াস্টোলিক ৬০–৯০ mmHg)। নিয়মিত ওষুধ খেয়ে রক্তচাপ নিয়ন্ত্রণে থাকলে এবং রক্তদানের সময় কোনো মাথা ঘোরা না থাকলে রক্ত দেওয়া যাবে।\n\nযদি রক্তচাপ ১০০/৬০-এর নিচে বা ১৪০/৯০-এর উপরে থাকে, তবে সাময়িকভাবে রক্তদান স্থগিত রাখতে হবে।",
      answerEn: "Blood pressure must be within normal limits at screening (systolic 100–140 mmHg and diastolic 60–90 mmHg).\n\nDonors with controlled hypertension on stable medication and no current symptoms can safely donate. Defer donation if your reading is outside this safe range.",
    },
    {
      keywords: ["কত দিন", "বিরতি", "ব্যবধান", "how often", "interval", "কতদিন পর", "কত বার"],
      answerBn: "একজন সুস্থ প্রাপ্তবয়স্ক প্রতি ১২০ দিন (৪ মাস) পর পর নিরাপদে পূর্ণ রক্ত (Whole Blood) দান করতে পারেন (বছরে সর্বোচ্চ ৩ বার)।\n\nপ্লাটিলেট অ্যাফেরেসিস দানের ক্ষেত্রে রক্তের লোহিত কণিকা ফেরত দেওয়া হয়, ফলে প্রতি ১৫ থেকে ৩০ দিন পর পর রক্তদান করা সম্ভব।",
      answerEn: "Healthy adults can safely donate whole blood every 120 days (4 months), up to 3 times per calendar year.\n\nFor platelet apheresis donations where red cells are returned, donation is permissible every 15 to 30 days.",
    },
    {
      keywords: ["কারা রক্ত", "যোগ্যতা", "বয়স", "ওজন", "who can donate", "eligibility", "weight", "age"],
      answerBn: "১৮ থেকে ৬০ বছর বয়সী যেকোনো সুস্থ ব্যক্তি রক্তদান করতে পারেন, যাঁর শরীরের ওজন কমপক্ষে ৪৫ থেকে ৫০ কেজি এবং ভাইটাল সাইন স্বাভাবিক।\n\nএছাড়া হিমোগ্লোবিনের মাত্রা নারীদের ক্ষেত্রে ন্যূনতম ১২.৫ g/dL এবং পুরুষদের ক্ষেত্রে ন্যূনতম ১৩.০ g/dL থাকা আবশ্যক।",
      answerEn: "Any healthy individual aged 18 to 60 weighing at least 45–50 kg with normal vital signs is generally eligible.\n\nHemoglobin levels must be at least 12.5 g/dL for females and 13.0 g/dL for males at pre-donation screening.",
    },
    {
      keywords: ["অ্যালকোহল", "মদ", "alcohol", "মদ্যপান", "beer", "wine"],
      answerBn: "রক্তদানের আগের অন্তত ২৪ থেকে ৪৮ ঘণ্টার মধ্যে কোনো প্রকার অ্যালকোহল বা মদ পান করা থেকে বিরত থাকুন।\n\nরক্ত দেওয়ার সময় রক্তে অ্যালকোহলের উপস্থিতি থাকলে ডিহাইড্রেশন ও রক্তচাপ দ্রুত কমে যাওয়ার ঝুঁকি থাকে।",
      answerEn: "Avoid consuming any alcohol for at least 24 to 48 hours prior to donating blood.\n\nProper cardiovascular hydration and normal vascular tone are critical to prevent fainting during donation.",
    },
    {
      keywords: ["ধূমপান", "smoking", "সিগারেট", "cigarette", "বিড়ি"],
      answerBn: "রক্তদানের অন্তত ২ ঘণ্টা আগে এবং রক্ত দেওয়ার পর অন্তত ২ থেকে ৩ ঘণ্টা ধূমপান করা যাবে না।\n\nরক্তদানের পরপরই ধূমপান করলে রক্তনালী সংকুচিত হয়ে এবং রক্তচাপ হঠাৎ কমে গিয়ে তীব্র মাথা ঘোরা বা জ্ঞান হারানোর আশঙ্কা থাকে।",
      answerEn: "Avoid smoking for at least 2 hours before donation and at least 2 to 3 hours afterwards.\n\nSmoking immediately after donating triggers acute vasoconstriction and a sudden blood pressure drop, leading to fainting.",
    },
    {
      keywords: ["জ্বর", "সর্দি", "কাশি", "fever", "cold", "cough", "ফ্লু"],
      answerBn: "জ্বর, সর্দি, কাশি বা শরীরে কোনো সক্রিয় ইনফেকশন চলাকালীন রক্ত দেওয়া সম্পূর্ণ নিষেধ।\n\nজ্বর বা সংক্রমণ পুরোপুরি সেরে ওঠার পর অন্তত ৭ থেকে ১৪ দিন সম্পূর্ণ সুস্থ থেকে তারপর রক্তদান করুন।",
      answerEn: "Do not donate blood while experiencing a fever, cold, cough, sore throat, or active viral/bacterial infection.\n\nWait at least 7 to 14 days after complete recovery and symptom resolution before presenting to donate.",
    },
    {
      keywords: ["অ্যান্টিবায়োটিক", "antibiotic", "ঔষধ", "ওষুধ", "মেডিসিন", "medicine"],
      answerBn: "অ্যান্টিবায়োটিকের পুরো কোর্স শেষ হওয়ার পর কমপক্ষে ৭ দিন সম্পূর্ণ সুস্থ থাকার পর রক্ত দেওয়া নিরাপদ।\n\nএছাড়া যদি অ্যাসপিরিন জাতীয় ওষুধ গ্রহণ করেন, তবে প্লাটিলেট দানের ৪৮ ঘণ্টা আগে চিকিৎসকের পরামর্শ অনুযায়ী তা মূল্যায়ন করতে হবে।",
      answerEn: "Wait at least 7 days after completing a course of oral or injectable antibiotics with full resolution of the underlying condition.\n\nDonors taking aspirin-based medications must pause platelet donations for 48 hours.",
    },
    {
      keywords: ["ডেঙ্গু", "dengue", "প্লাটিলেট", "platelet"],
      answerBn: "ডেঙ্গু জ্বর থেকে সম্পূর্ণ সুস্থ হওয়ার পর কমপক্ষে ৪ থেকে ৬ মাস অপেক্ষা করা আবশ্যক।\n\nরক্তদানের আগে নিশ্চিত করুন যে আপনার প্লাটিলেট কাউন্ট এবং রক্তকণিকার সকল সূচক স্বাভাবিক মাত্রায় পৌঁছেছে।",
      answerEn: "Wait at least 4 to 6 months after full recovery from dengue fever.\n\nEnsure platelet count and hematocrit levels have completely normalized before proceeding.",
    },
    {
      keywords: ["জন্ডিস", "হেপাটাইটিস", "jaundice", "hepatitis"],
      answerBn: "পানিবাহিত সাধারণ জন্ডিস (হেপাটাইটিস এ বা ই) পুরোপুরি সেরে ওঠার ১ বছর পর রক্ত দেওয়া সম্ভব।\n\nতবে হেপাটাইটিস বি (HBV) বা হেপাটাইটিস সি (HCV) পজিটিভ হলে জীবনে কখনোই রক্ত দেওয়া যাবে না।",
      answerEn: "Donors who recovered from uncomplicated Hepatitis A or E can donate after 12 months.\n\nAnyone testing positive for Hepatitis B or C infection is permanently deferred from donating blood.",
    },
    {
      keywords: ["মাসিক", "ঋতুস্রাব", "পিরিয়ড", "menstruation", "period"],
      answerBn: "মাসিক চলাকালীন নারীদের রক্ত দেওয়া উচিত নয়।\n\nমাসিক পুরোপুরি শেষ হওয়ার অন্তত ৫ থেকে ৭ দিন পর রক্ত দেওয়া সবচেয়ে নিরাপদ, যাতে শরীর হিমোগ্লোবিন ও আয়রনের ঘাটতি পুষিয়ে নিতে পারে।",
      answerEn: "Women should avoid donating blood during active menstruation.\n\nWait 5 to 7 days after menstruation ceases to ensure adequate hemoglobin and iron stores.",
    },
    {
      keywords: ["গর্ভাবস্থা", "গর্ভবতী", "pregnancy", "pregnant", "বুকের দুধ", "breastfeeding"],
      answerBn: "গর্ভাবস্থায় এবং সন্তানকে নিয়মিত বুকের দুধ খাওয়ানোর সময় মা ও শিশুর সুরক্ষার জন্য রক্তদান সম্পূর্ণ নিষেধ।\n\nসন্তান প্রসব এবং বুকের দুধ খাওয়ানো শেষ হওয়ার অন্তত ৬ থেকে ১২ মাস পর চিকিৎসকের অনুমতি নিয়ে রক্ত দেওয়া যেতে পারে।",
      answerEn: "Blood donation is strictly prohibited during pregnancy and throughout exclusive breastfeeding.\n\nWait 6 to 12 months postpartum after lactation has safely concluded.",
    },
    {
      keywords: ["রোজা", "রোযা", "উপবাস", "fasting", "খালি পেট", "খালি পেটে"],
      answerBn: "খালি পেটে কখনো রক্ত দেওয়া উচিত নয়। রক্তদানের ১-২ ঘণ্টা আগে পর্যাপ্ত পানি ও পুষ্টিকর হালকা খাবার খাওয়া জরুরি।\n\nরোজা রাখা অবস্থায় রক্ত দিলে ডিহাইড্রেশন বা রক্তচাপ কমে দুর্বল হওয়ার ঝুঁকি থাকে, তাই রমজানে ইফতারের ১-২ ঘণ্টা পর রক্ত দেওয়া সবচেয়ে নিরাপদ।",
      answerEn: "Never donate on an empty stomach; eat a light meal and drink plenty of water 1–2 hours before donation.\n\nDonating while fasting significantly increases dehydration and fainting risks; during Ramadan, donating 1–2 hours after Iftar is recommended.",
    },
    {
      keywords: ["অপারেশন", "সার্জারি", "surgery", "operation", "সিজার"],
      answerBn: "বড় ধরনের অস্ত্রোপচার বা সিজারিয়ান ডেলিভারির পর শরীর সুস্থ হতে অন্তত ৬ থেকে ১২ মাস অপেক্ষা করা প্রয়োজন।\n\nছোটখাটো অপারেশনের ক্ষেত্রে সেলাই শুকিয়ে সম্পূর্ণ সুস্থ হয়ে চিকিৎসকের ছাড়পত্র নিয়ে রক্ত দেওয়া যায়।",
      answerEn: "Major surgical interventions or Caesarean deliveries require a recovery period of 6 to 12 months.\n\nMinor surgeries require complete tissue healing and normal vitality before donation.",
    },
    {
      keywords: ["দুর্বল", "দুর্বলতা", "ক্ষতি", "weakness", "side effects"],
      answerBn: "রক্তদান সম্পূর্ণ নিরাপদ এবং এতে স্থায়ী কোনো দুর্বলতা তৈরি হয় না।\n\nরক্তদানের সময় মাত্র ৩৫০–৪৫০ মিলি রক্ত নেওয়া হয়, যা শরীরের মোট রক্তের ১০% এরও কম। রক্তের তরল প্লাজমা ২৪–৪৮ ঘণ্টার মধ্যেই পূরণ হয়ে যায় এবং লোহিত কণিকা কয়েক সপ্তাহের মধ্যে তৈরি হয়ে যায়।",
      answerEn: "Blood donation does not cause lasting weakness or damage to the body.\n\nOnly 350–450 ml is drawn (<10% of total volume). Fluid volume restores within 24–48 hours, and red blood cells replenish within a few weeks.",
    },
    {
      keywords: ["hi", "hello", "hey", "হ্যালো", "হাই", "কেমন আছেন", "সালাম", "নমস্কার", "শুভ সকাল", "শুভ সন্ধ্যা"],
      answerBn: "হ্যালো! ব্লাডলিংক এআই সহকারীতে আপনাকে স্বাগতম। রক্তদান, যোগ্যতা বা স্বাস্থ্য নির্দেশিকা সংক্রান্ত যেকোনো বিষয়ে জানতে আপনার প্রশ্নটি লিখুন। আমি কীভাবে সহায়তা করতে পারি?",
      answerEn: "Hello! Welcome to BloodLink AI Assistant. Feel free to ask any question about blood donation, eligibility criteria, or safe donor preparation. How can I help you today?",
    },
    {
      keywords: ["মাথা ঘোরা", "dizzy", "dizziness", "বমি"],
      answerBn: "রক্তদানের পর মাথা ঘোরা অনুভব করলে অবিলম্বে শুয়ে পড়ুন এবং পা দুটো শরীরের চেয়ে উঁচুতে রাখুন।\n\nএরপর পর্যাপ্ত পানি, ডাবের পানি বা ফলের জুস পান করুন এবং ১৫-২০ মিনিট বিশ্রাম নিয়ে ধীরে ধীরে স্বাভাবিক কাজ শুরু করুন।",
      answerEn: "If experiencing dizziness after donating, lie down immediately with legs elevated above heart level.\n\nDrink plenty of water or juice, rest for 15 minutes, and avoid standing up rapidly.",
    },
  ];

  function findClinicalFaqMatch(query: string, lang: "bn" | "en") {
    const qLower = query.toLowerCase().trim();
    for (const item of CLINICAL_KNOWLEDGE_TOPICS) {
      if (item.keywords.some((kw) => qLower === kw.toLowerCase() || qLower.includes(kw.toLowerCase()))) {
        return lang === "bn" ? item.answerBn : item.answerEn;
      }
    }
    return null;
  }

  // AI FAQ Assistant Endpoint with Model Fallback Cascade & Topic-Aware Clinical Knowledge
  app.post("/api/ai/faq-chat", async (req, res) => {
    const payload = getRequestPayload(req);
    const question = typeof payload?.question === "string" ? payload.question.trim() : "";
    // Strict Language Matching: Detect if query is Bengali or English
    const hasBengali = /[\u0980-\u09FF]/.test(question);
    const hasEnglish = /[a-zA-Z]/.test(question);
    const effectiveLang: "bn" | "en" = hasBengali ? "bn" : hasEnglish ? "en" : (payload?.lang === "bn" ? "bn" : "en");
    const history = Array.isArray(payload?.history) ? payload.history : [];

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidApiKey = apiKey && apiKey !== "MY_GEMINI_API_KEY" && !apiKey.startsWith("MY_");

    // If API key is missing, check clinical knowledge map directly
    if (!hasValidApiKey) {
      const directMatch = findClinicalFaqMatch(question, effectiveLang);
      if (directMatch) {
        return res.json({ answer: directMatch, source: "clinical_kb" });
      }
      return res.json({
        answer: effectiveLang === "bn"
          ? "রক্তদান সংক্রান্ত যেকোনো বিষয়ে জানতে আপনার সুনির্দিষ্ট প্রশ্নটি লিখুন। সুস্থ প্রাপ্তবয়স্ক ব্যক্তি প্রতি ১২০ দিন পর পর নিরাপদে রক্ত দিতে পারেন।"
          : "Please ask your specific question regarding blood donation. Healthy adults can safely donate blood every 120 days.",
        source: "offline_reference",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const systemInstruction = `You are the intelligent, empathetic medical AI assistant for BloodLink Bangladesh.
You understand natural conversation, greetings, and blood donation medical questions with high comprehension.

CRITICAL INSTRUCTIONS:
- LANGUAGE MATCHING (STRICT RULE):
  - If the user asks in Bengali (বাংলা), you MUST respond in polite Bengali.
  - If the user asks in English, you MUST respond in clear English.
  - Effective response language for this query: ${effectiveLang === "bn" ? "Bengali (বাংলা)" : "English"}.
- Intent Understanding:
  - If the user sends a greeting (e.g. "hi", "hello", "hey", "কেমন আছেন", "হ্যালো"), greet them back warmly and politely in 1-2 friendly sentences, and ask how you can help them with blood donation or health information today. NEVER recite blood donation eligibility rules for simple greetings!
  - If the user asks a question, understand their specific condition or query and answer directly.
- LENGTH & FORMAT ("SWEET SPOT"):
  - Provide easily understandable, moderate-length answers.
  - Never write overwhelming walls of paragraphs, and never give overly curt or cryptic 1-sentence answers.
  - Hit the sweet spot: typically 2 to 4 clear, well-structured sentences or concise bullet points (about 40 to 80 words) that directly solve the user's doubt.
- CLINICAL ACCURACY:
  - Rely on WHO and Bangladesh DGHS safe blood transfusion standards (18-60 years, 45+ kg, 120-day interval for whole blood, 6 months for tattoos, etc.).
- LANGUAGE & TONE:
  - Always respond in ${effectiveLang === "bn" ? "polite, natural Bengali (বাংলা) using 'আপনি'" : "clear, professional, empathetic English"}.
  - Empathetic, supportive, medically responsible tone.
- Medical note:
  - Add a subtle closing line:
    ${effectiveLang === "bn" ? "(যেকোনো শারীরিক প্রয়োজনে রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।)" : "(Always verify medical advice with a registered physician.)"}`;

    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    // Include recent conversation history (up to last 4 turns)
    const recentHistory = history.slice(-4);
    for (const item of recentHistory) {
      if ((item.role === "user" || item.role === "model") && typeof item.text === "string" && item.text.trim()) {
        contents.push({
          role: item.role,
          parts: [{ text: item.text.trim() }],
        });
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: question }],
    });

    // Cascading models: try gemini-3.8-flash first; if high demand or error, fallback to gemini-3.1-flash-lite
    const CANDIDATE_MODELS = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
    let generatedAnswer = "";
    let usedModel = "";

    for (const model of CANDIDATE_MODELS) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout on ${model}`)), 20000)
        );

        const response: any = await Promise.race([
          ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction,
              temperature: 0.3,
            },
          }),
          timeoutPromise,
        ]);

        const text = response?.text?.trim();
        if (text) {
          generatedAnswer = text;
          usedModel = model;
          break;
        }
      } catch (modelErr: any) {
        console.warn(`[AI FAQ] Model ${model} failed:`, modelErr?.message || modelErr);
        // Continue to fallback model
      }
    }

    if (generatedAnswer) {
      return res.json({ answer: generatedAnswer, source: usedModel });
    }

    // If both models failed or timed out, use topic-aware clinical knowledge fallback
    const directMatch = findClinicalFaqMatch(question, effectiveLang);
    if (directMatch) {
      return res.json({
        answer: directMatch,
        source: "clinical_kb_fallback",
      });
    }

    return res.json({
      answer: effectiveLang === "bn"
        ? "রক্তদান সংক্রান্ত যেকোনো বিষয়ে জানতে আপনার সুনির্দিষ্ট প্রশ্নটি লিখুন। সুস্থ প্রাপ্তবয়স্ক ব্যক্তি প্রতি ১২০ দিন পর পর নিরাপদে রক্ত দিতে পারেন।"
        : "Please ask your specific question regarding blood donation. Healthy adults can safely donate blood every 120 days.",
      source: "fallback_general",
    });
  });

  // AI Voice Synthesis Endpoint using gemini-3.8-flash-lite-tts
  app.post("/api/ai/tts", async (req, res) => {
    try {
      const payload = getRequestPayload(req);
      const rawText = typeof payload?.text === "string" ? payload.text.trim() : "";
      if (!rawText) {
        return res.status(400).json({ error: "Text is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Strip markdown symbols and limit length for snappy voice response
      const cleanText = rawText
        .replace(/[*_#`[\]()]/g, "")
        .replace(/\n+/g, " ")
        .slice(0, 350)
        .trim();

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: "Warm, empathetic and clear voice assistant",
                },
              },
            ],
          },
        ] as any,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(500).json({ error: "No audio generated" });
      }

      return res.json({ audio: base64Audio, format: "audio/wav" });
    } catch (err: any) {
      console.warn("[TTS] Error generating Gemini audio:", err?.message);
      return res.status(500).json({ error: err?.message || "TTS error" });
    }
  });

  // Google Sheets Helper
  const getSheetsClient = async () => {
    const serviceAccountVar = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!serviceAccountVar || !spreadsheetId) {
      return null;
    }

    try {
      const google = await getGoogle();
      const credentials = JSON.parse(serviceAccountVar);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      return { 
        sheets: google.sheets({ version: "v4", auth }),
        spreadsheetId 
      };
    } catch (e) {
      console.error("Error parsing GOOGLE_SERVICE_ACCOUNT_JSON:", e);
      return null;
    }
  };

  const primaryDbPath = path.join(__dirname, "donors_fallback.json");
  const tmpDbPath = path.join(os.tmpdir(), "donors_fallback.json");

  let dbPath = primaryDbPath;
  try {
    if (!fs.existsSync(primaryDbPath)) {
      fs.writeFileSync(primaryDbPath, JSON.stringify([]));
    } else {
      fs.accessSync(primaryDbPath, fs.constants.W_OK);
    }
  } catch {
    if (!fs.existsSync(tmpDbPath)) {
      try {
        const initialData = fs.existsSync(primaryDbPath) ? fs.readFileSync(primaryDbPath, "utf-8") : "[]";
        fs.writeFileSync(tmpDbPath, initialData);
      } catch {
        fs.writeFileSync(tmpDbPath, "[]");
      }
    }
    dbPath = tmpDbPath;
  }
  const DB_PATH = dbPath;

  const readLocalDonors = () => {
    try {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((d) => d && typeof d === "object" && d.name && d.phone && d.bloodGroup) : [];
    } catch {
      return [];
    }
  };

  const writeLocalDonors = (data) => {
    const validData = Array.isArray(data)
      ? data.filter((d) => d && typeof d === "object" && d.name && d.phone && d.bloodGroup)
      : [];
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(validData, null, 2));
    } catch (err) {
      console.error("Failed to write local donors fallback:", err);
    }
    if (DB_PATH !== tmpDbPath) {
      try {
        fs.writeFileSync(tmpDbPath, JSON.stringify(validData, null, 2));
      } catch {
        // ignore
      }
    }
  };

  // Simulated OTP storage (in-memory + tmp file backup for serverless/restart resilience)
  const memoryOtps = {};
  const otpFilePath = path.join(os.tmpdir(), "bloodlink_otps.json");
  const getOtps = () => {
    try {
      if (fs.existsSync(otpFilePath)) {
        return { ...memoryOtps, ...JSON.parse(fs.readFileSync(otpFilePath, "utf-8")) };
      }
    } catch {
      // ignore
    }
    return { ...memoryOtps };
  };
  const saveOtp = (phone, otp) => {
    memoryOtps[phone] = otp;
    try {
      const current = getOtps();
      current[phone] = otp;
      fs.writeFileSync(otpFilePath, JSON.stringify(current));
    } catch {
      // ignore
    }
  };
  const deleteOtp = (phone) => {
    delete memoryOtps[phone];
    try {
      const current = getOtps();
      delete current[phone];
      fs.writeFileSync(otpFilePath, JSON.stringify(current));
    } catch {
      // ignore
    }
  };

  app.all("/api/otp/send", (req, res) => {
    const payload = getRequestPayload(req);
    const rawPhone = payload?.phone ?? req.query?.phone;
    const phone = typeof rawPhone === "string" ? rawPhone.trim() : "";
    if (!phone) return res.status(400).json({ error: "Phone number is required" });
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    saveOtp(phone, otp);
    
    console.log(`[OTP DEBUG] Phone: ${phone}, OTP: ${otp}`);
    res.json({ message: "OTP sent successfully", debugOtp: otp });
  });

  app.all("/api/otp/verify", async (req, res) => {
    const payload = getRequestPayload(req);
    const rawPhone = payload?.phone ?? req.query?.phone;
    const rawOtp = payload?.otp ?? req.query?.otp;
    const phone = typeof rawPhone === "string" ? rawPhone.trim() : "";
    const otp = typeof rawOtp === "string" ? rawOtp.trim() : "";
    if (!phone || !otp) return res.status(400).json({ error: "Phone and OTP are required" });
    
    const storedOtp = getOtps()[phone];
    if (storedOtp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    
    deleteOtp(phone); // Clear after use

    // Check if donor exists
    let donor = null;
    let handledBySheets = false;
    const client = await getSheetsClient();
    if (client) {
      try {
        const response = await client.sheets.spreadsheets.values.get({
          spreadsheetId: client.spreadsheetId,
          range: "Donors!A2:M",
        });
        const rows = response.data.values || [];
        const rowIndex = rows.findIndex((row) => String(row[9] || "").trim() === phone && row[1] && row[5]);
        if (rowIndex !== -1) {
          const foundRow = rows[rowIndex];
          donor = {
            id: String(foundRow[0] || Date.now()),
            name: String(foundRow[1] || ""),
            gender: String(foundRow[2] || "Male"),
            dob: String(foundRow[3] || ""),
            weight: Number(foundRow[4]) || 0,
            bloodGroup: String(foundRow[5] || "A+"),
            division: String(foundRow[6] || ""),
            district: String(foundRow[7] || ""),
            upazila: String(foundRow[8] || ""),
            phone: String(foundRow[9] || "").trim(),
            lastDonationDate: String(foundRow[10] || ""),
            timesDonated: Number(foundRow[11]) || 0,
            isActive: foundRow[12] !== "false",
          };

          // Reactivate if inactive
          if (!donor.isActive) {
            const sheetRowIndex = rowIndex + 2;
            await client.sheets.spreadsheets.values.update({
              spreadsheetId: client.spreadsheetId,
              range: `Donors!M${sheetRowIndex}`,
              valueInputOption: "RAW",
              requestBody: { values: [["true"]] },
            });
            donor.isActive = true;
          }
        }
        handledBySheets = true;
      } catch (e) {
        console.error("Sheets error during verify, falling back to local DB:", e);
      }
    }

    if (!handledBySheets) {
      const data = readLocalDonors();
      donor = data.find((d) => String(d.phone || "").trim() === phone) || null;
      if (donor && !donor.isActive) {
        donor.isActive = true;
        writeLocalDonors(data);
      }
    }

    res.json({ verified: true, existingDonor: donor });
  });

  // List active donors
  app.get("/api/donors", async (_req, res) => {
    const client = await getSheetsClient();
    if (client) {
      try {
        const response = await client.sheets.spreadsheets.values.get({
          spreadsheetId: client.spreadsheetId,
          range: "Donors!A2:M", 
        });
        const rows = response.data.values || [];
        const donors = rows
          .filter((row) => row[12] !== "false" && row[1] && row[5] && row[9]) // Only valid active donors
          .map((row) => ({
            id: String(row[0] || Date.now()),
            name: String(row[1] || ""),
            gender: String(row[2] || "Male"),
            dob: String(row[3] || ""),
            weight: Number(row[4]) || 0,
            bloodGroup: String(row[5] || "A+"),
            division: String(row[6] || ""),
            district: String(row[7] || ""),
            upazila: String(row[8] || ""),
            phone: String(row[9] || "").trim(),
            lastDonationDate: String(row[10] || ""),
            timesDonated: Number(row[11]) || 0,
            isActive: row[12] !== "false",
          }));
        return res.json(donors);
      } catch (e) {
        console.error("Sheets API Error (List), falling back to local DB:", e);
      }
    }

    const data = readLocalDonors();
    const activeDonors = data.filter((d) => d.isActive !== false);
    res.json(activeDonors);
  });

  const handleCreateDonor = async (req, res) => {
    const payload = getRequestPayload(req);
    const phone = typeof payload?.phone === "string" ? payload.phone.trim() : "";
    const name = typeof payload?.name === "string" ? payload.name.trim() : "";
    const bloodGroup = typeof payload?.bloodGroup === "string" ? payload.bloodGroup.trim() : "";

    if (!name || !phone || !bloodGroup) {
      return res.status(400).json({ error: "Missing required donor fields (name, phone, bloodGroup)" });
    }

    const donor = {
      id: Date.now().toString(),
      name,
      gender: payload.gender || "Male",
      dob: payload.dob || "",
      weight: Number(payload.weight) || 0,
      bloodGroup,
      division: payload.division || "",
      district: payload.district || "",
      upazila: payload.upazila || "",
      phone,
      lastDonationDate: payload.lastDonationDate || "",
      timesDonated: Number(payload.timesDonated) || 0,
      isActive: true,
    };

    const client = await getSheetsClient();
    if (client) {
      try {
        const row = [
          donor.id,
          donor.name,
          donor.gender,
          donor.dob,
          donor.weight,
          donor.bloodGroup,
          donor.division,
          donor.district,
          donor.upazila,
          donor.phone,
          donor.lastDonationDate,
          donor.timesDonated,
          "true"
        ];

        await client.sheets.spreadsheets.values.append({
          spreadsheetId: client.spreadsheetId,
          range: "Donors!A1",
          valueInputOption: "RAW",
          requestBody: {
            values: [row],
          },
        });
        return res.json(donor);
      } catch (e) {
        console.error("Sheets API Error (Create), falling back to local DB:", e);
      }
    }

    const data = readLocalDonors();
    const existingIdx = data.findIndex((d) => String(d.phone || "").trim() === phone);
    if (existingIdx !== -1) {
      data[existingIdx] = { ...data[existingIdx], ...donor, id: data[existingIdx].id || donor.id };
      writeLocalDonors(data);
      return res.json(data[existingIdx]);
    }
    data.push(donor);
    writeLocalDonors(data);
    res.json(donor);
  };

  app.all("/api/donors/register", handleCreateDonor);
  app.post("/api/donors", handleCreateDonor);

  const handleUpdateDonor = async (req, res) => {
    const phone = (req.params.phone || "").trim();
    const updates = getRequestPayload(req);
    if (!phone) return res.status(400).json({ error: "Phone is required" });

    const client = await getSheetsClient();
    if (client) {
      try {
        const response = await client.sheets.spreadsheets.values.get({
          spreadsheetId: client.spreadsheetId,
          range: "Donors!A2:M",
        });
        const rows = response.data.values || [];
        const rowIndex = rows.findIndex((row) => String(row[9] || "").trim() === phone);
        
        if (rowIndex === -1) return res.status(404).json({ error: "Donor not found" });

        const sheetRowIndex = rowIndex + 2;
        const currentRow = rows[rowIndex];

        const existingDonor = {
          id: String(currentRow[0] || Date.now()),
          name: String(currentRow[1] || ""),
          gender: String(currentRow[2] || "Male"),
          dob: String(currentRow[3] || ""),
          weight: Number(currentRow[4]) || 0,
          bloodGroup: String(currentRow[5] || "A+"),
          division: String(currentRow[6] || ""),
          district: String(currentRow[7] || ""),
          upazila: String(currentRow[8] || ""),
          phone: String(currentRow[9] || "").trim(),
          lastDonationDate: String(currentRow[10] || ""),
          timesDonated: Number(currentRow[11]) || 0,
          isActive: currentRow[12] !== "false",
        };

        const mappings = {
          name: "B", gender: "C", dob: "D", weight: "E", bloodGroup: "F",
          division: "G", district: "H", upazila: "I", phone: "J", 
          lastDonationDate: "K", timesDonated: "L", isActive: "M"
        };

        const updatePromises = Object.keys(updates).map(key => {
          if (!mappings[key]) return null;
          const value = key === "isActive" ? String(updates[key]) : updates[key];
          return client.sheets.spreadsheets.values.update({
            spreadsheetId: client.spreadsheetId,
            range: `Donors!${mappings[key]}${sheetRowIndex}`,
            valueInputOption: "RAW",
            requestBody: { values: [[value]] },
          });
        }).filter(Boolean);

        await Promise.all(updatePromises);
        
        return res.json({ ...existingDonor, ...updates });
      } catch (e) {
        console.error("Sheets API Error (Update), falling back to local DB:", e);
      }
    }

    const data = readLocalDonors();
    const donorIndex = data.findIndex((d) => String(d.phone || "").trim() === phone);
    if (donorIndex === -1) return res.status(404).json({ error: "Donor not found" });

    data[donorIndex] = { ...data[donorIndex], ...updates };
    writeLocalDonors(data);
    res.json(data[donorIndex]);
  };

  app.all("/api/donors/update/:phone", handleUpdateDonor);
  app.patch("/api/donors/:phone", handleUpdateDonor);

  const distPath = fs.existsSync(path.join(__dirname, "dist"))
    ? path.join(__dirname, "dist")
    : path.join(process.cwd(), "dist");
  const indexHtmlPath = path.join(distPath, "index.html");
  const isDevScript =
    process.env.npm_lifecycle_event === "dev" ||
    process.execArgv.some((arg) => arg.includes("tsx")) ||
    process.argv.some((arg) => arg.includes("tsx"));
  const useStaticDist =
    (process.env.NODE_ENV === "production" || !isDevScript) &&
    fs.existsSync(indexHtmlPath);

  // Explicitly serve /sw.js with strict no-cache headers so mobile devices immediately receive updates!
  app.get("/sw.js", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    const swPath = path.join(__dirname, "public", "sw.js");
    const distSwPath = path.join(distPath, "sw.js");
    const targetPath = fs.existsSync(swPath) ? swPath : distSwPath;
    if (fs.existsSync(targetPath)) {
      res.type("application/javascript").sendFile(targetPath);
    } else {
      res.sendStatus(404);
    }
  });

  app.get("/manifest.json", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const mPath = path.join(__dirname, "public", "manifest.json");
    const distMPath = path.join(distPath, "manifest.json");
    const targetPath = fs.existsSync(mPath) ? mPath : distMPath;
    if (fs.existsSync(targetPath)) {
      res.type("application/manifest+json").sendFile(targetPath);
    } else {
      res.sendStatus(404);
    }
  });

  // Digital Asset Links for Android Trusted Web Activity (TWA) / Play Store APK fullscreen verification
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    const assetLinksPath = path.join(__dirname, "public", ".well-known", "assetlinks.json");
    if (fs.existsSync(assetLinksPath)) {
      return res.type("application/json").sendFile(assetLinksPath);
    }
    const pkg = process.env.ANDROID_PACKAGE_NAME;
    const sha256 = process.env.ANDROID_SHA256_FINGERPRINT;
    if (pkg && sha256) {
      return res.type("application/json").json([
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: pkg,
            sha256_cert_fingerprints: sha256.split(",").map((s) => s.trim()).filter(Boolean),
          },
        },
      ]);
    }
    return res.type("application/json").json([]);
  });

  if (!useStaticDist) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const assetsDir = path.join(distPath, "assets");
    if (fs.existsSync(assetsDir)) {
      app.use("/assets", express.static(assetsDir, { maxAge: "30d", immutable: true }));
    }
    app.use(
      express.static(distPath, {
        maxAge: "1d",
        etag: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith("sw.js") || filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          }
        },
      })
    );
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0");
      res.sendFile(indexHtmlPath);
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
    if (url.pathname === "/live" || url.pathname === "/api/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Real-Time Gemini Live Audio WebSocket handler
  wss.on("connection", async (clientWs) => {
    console.log("[Gemini Live] New client connected to real-time voice channel");
    let session: any = null;
    let isClosed = false;

    const cleanup = async () => {
      if (isClosed) return;
      isClosed = true;
      if (session) {
        try {
          await session.close();
        } catch {
          // ignore
        }
        session = null;
      }
    };

    clientWs.on("close", cleanup);
    clientWs.on("error", cleanup);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.startsWith("MY_")) {
        clientWs.send(JSON.stringify({ error: "API key is not configured for Live voice session" }));
        clientWs.close();
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      session = await ai.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: `You are the real-time spoken voice medical assistant for BloodLink Bangladesh.
You talk directly with the user with a natural, friendly, compassionate medical tone.

CRITICAL RULES:
- NEVER introduce yourself. DO NOT say "নমস্কার", "আমি রক্তবন্ধু...", "Hello, I am...", etc. Start IMMEDIATELY with the answer to what the user asks.
- STRICT SPOKEN LENGTH: Answer in EXACTLY 1 to 2 crisp, natural spoken sentences (maximum 20-30 words). Never give long speeches, lists, or lectures over voice.
- Answer only what was specifically asked.
- Language: Speak in natural Bengali (বাংলা) or English, matching whatever language the user speaks in.
- For eligibility (tattoos, diabetes, intervals, medication, fever, weight), provide the exact clinical rule directly.`,
        },
        callbacks: {
          onmessage: (msg: any) => {
            if (isClosed) return;
            const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            const modelText = msg.serverContent?.outputTranscription?.text;
            if (modelText) {
              clientWs.send(JSON.stringify({ modelText }));
            }
            const userText = msg.serverContent?.inputTranscription?.text;
            if (userText) {
              clientWs.send(JSON.stringify({ userText }));
            }
            if (msg.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
            if (msg.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onclose: () => {
            if (!isClosed) {
              clientWs.send(JSON.stringify({ sessionClosed: true }));
            }
          },
        },
      });

      clientWs.send(JSON.stringify({ ready: true }));

      clientWs.on("message", (raw) => {
        if (isClosed || !session) return;
        try {
          const data = JSON.parse(raw.toString());
          if (data.audio) {
            session.sendRealtimeInput({
              audio: { data: data.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
          if (data.text) {
            session.sendClientContent({
              turns: [{ role: "user", parts: [{ text: data.text }] }],
              turnComplete: true,
            });
          }
        } catch (e) {
          console.warn("[Gemini Live] Message parse warning:", e);
        }
      });
    } catch (err: any) {
      console.error("[Gemini Live] Session creation error:", err);
      clientWs.send(JSON.stringify({ error: err?.message || "Live session failed" }));
      clientWs.close();
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (static=${useStaticDist})`);
  });
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection in server:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception in server:", err);
});

startServer();
