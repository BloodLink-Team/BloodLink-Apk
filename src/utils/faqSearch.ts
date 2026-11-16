import type { BloodFaqItem } from "../components/SideMenuPages";

/**
 * Comprehensive Cross-Language (English + বাংলা + Banglish phonetic + Medical/Colloquial)
 * Synonym Clusters covering all 70 Blood Donation FAQs.
 */
const SYNONYM_CLUSTERS: string[][] = [
  [
    "blood", "donate", "donation", "donor", "donating",
    "রক্ত", "রক্তদান", "রক্তদাতা", "রক্তদানের",
    "rokto", "roktodan", "roktodata", "khoon", "khun",
  ],
  [
    "who", "eligible", "eligibility", "qualify", "age", "years", "old", "adult",
    "কারা", "যোগ্য", "যোগ্যতা", "বয়স", "বয়স", "প্রাপ্তবয়স্ক",
    "kara", "joggo", "boyosh", "boyos",
  ],
  [
    "often", "interval", "gap", "frequency", "days", "months", "120", "four", "4", "again",
    "কত দিন", "কতদিন", "পর পর", "বিরতি", "১২০", "৪ মাস", "মাস", "কতবার", "বারবার",
    "koto din", "kotodin", "koto mas", "por por", "biroti", "barbar",
  ],
  [
    "much", "amount", "quantity", "volume", "ml", "bag", "liter", "litre", "350", "450", "taken", "collected",
    "কতটুকু", "পরিমাণ", "মিলি", "ব্যাগ", "লিটার", "৩৫০", "৪৫০", "কত ব্যাগ",
    "kototuku", "poriman", "mili", "bag",
  ],
  [
    "weak", "weakness", "tired", "fatigue", "exhausted", "energy", "strength",
    "দুর্বল", "দুর্বলতা", "ক্লান্ত", "ক্লান্তি", "শক্তি", "হাঁপিয়ে",
    "durbol", "durbolota", "klanto", "shokti", "nervous",
  ],
  [
    "before", "prior", "prepare", "preparation",
    "আগে", "পূর্বে", "প্রস্তুতি", "করণীয়", "করণীয়",
    "age", "agey", "prostuti", "koroniyo",
  ],
  [
    "after", "post", "later", "following",
    "পরে", "পর", "পরবর্তী",
    "pore", "porey", "poroborti",
  ],
  [
    "pain", "painful", "hurt", "unsafe", "safe", "safety", "risk", "risky", "needle", "pinch", "sterile", "syringe",
    "ব্যথা", "ব্যথাদায়ক", "ঝুঁকি", "ঝুঁকিপূর্ণ", "নিরাপদ", "সুঁই", "সুই", "সিরিঞ্জ", "ভয়", "ভয়",
    "betha", "byatha", "jhuki", "nirapod", "sui", "suyi", "bhoy", "voy",
  ],
  [
    "tattoo", "tattoos", "tattooed", "ink", "body art",
    "ট্যাটু", "উল্কি", "আঁকা",
    "tatoo", "tatu", "tatto", "ulki",
  ],
  [
    "piercing", "pierced", "ear", "nose", "ring",
    "পিয়ার্সিং", "পিয়ার্সিং", "ফোঁড়ানো", "ফোঁড়ানো", "নাক", "কান",
    "nak", "kan", "phorano", "forano", "piarcing", "peircing",
  ],
  [
    "period", "periods", "menstruation", "menstruating", "menstrual", "monthly", "chums",
    "মাসিক", "পিরিয়ড", "পিরিয়ড", "ঋতুস্রাব", "মেন্স",
    "masik", "mashik", "piriod", "mens", "ritusrab",
  ],
  [
    "eat", "eating", "eaten", "food", "meal", "diet", "drink", "drinking", "fluid", "juice", "saline", "coconut",
    "খাওয়া", "খাওয়া", "খাবার", "খাদ্য", "পান", "ডাবের পানি", "ওরস্যালাইন", "স্যালাইন", "ফলের রস", "ডিম", "মাছ", "মাংস", "শাকসবজি",
    "khabar", "khawa", "khawa dawa", "dab", "daber pani", "orsaline",
  ],
  [
    "side effect", "side effects", "reaction", "reactions", "bruise", "bruising", "sore", "soreness", "problem", "complication",
    "পার্শ্বপ্রতিক্রিয়া", "পার্শ্বপ্রতিক্রিয়া", "সমস্যা", "ক্ষতি", "দাগ", "ফুলে",
    "somossa", "shomoshsha", "khoti", "parshoprotikriya",
  ],
  [
    "doctor", "medical", "help", "hospital", "emergency", "consult", "physician", "numbness", "bleeding",
    "চিকিৎসক", "ডাক্তার", "হাসপাতাল", "পরামর্শ", "চিকিৎসা", "রক্তপাত", "অবশ",
    "daktar", "dakter", "chikitsok", "poramorsho", "hospital",
  ],
  [
    "rest", "resting", "lie down", "sit", "minutes",
    "বিশ্রাম", "শোয়া", "বসা", "কতক্ষণ", "মিনিট",
    "bishram", "bisram", "kotokkhon",
  ],
  [
    "replace", "replenish", "recover", "recovery", "restore", "regenerate", "plasma", "red blood cells", "rbc",
    "পূরণ", "ঘাটতি", "প্লাজমা", "লোহিত রক্তকণিকা", "রক্তকণিকা", "সপ্তাহ", "ঘণ্টা",
    "puron", "ghatti", "plasma", "rokto konika",
  ],
  [
    "drive", "driving", "car", "bike", "motorcycle", "ride", "riding", "vehicle",
    "গাড়ি", "গাড়ি", "বাইক", "মোটরসাইকেল", "ড্রাইভ", "চালানো",
    "gari", "bike", "chalano", "driving",
  ],
  [
    "dizzy", "dizziness", "lightheaded", "vertigo", "spinning", "headache",
    "মাথা ঘোরা", "মাথা ঘুরালে", "মাথা ঘুরলে", "মাথা ব্যথা", "চোখে অন্ধকার",
    "matha ghora", "matha ghura", "matha ghurano", "dizi",
  ],
  [
    "water", "hydrate", "hydration", "dehydration", "glass", "glasses",
    "পানি", "জল", "পানিশূন্যতা", "গ্লাস", "তৃষ্ণা",
    "pani", "jol", "panishunnota", "glas",
  ],
  [
    "exercise", "exercising", "exercised", "gym", "workout", "running", "sports", "lifting", "heavy",
    "ব্যায়াম", "ব্যায়াম", "জিম", "দৌড়ানো", "দৌড়ানো", "খেলাধুলা", "ভারী কাজ", "পরিশ্রম",
    "byayam", "bayam", "excercise", "exersise", "jim", "dourano", "porishrom",
  ],
  [
    "anemia", "anaemia", "anemic", "iron deficiency",
    "রক্তস্বল্পতা", "অ্যানিমিয়া", "অ্যানিমিয়া", "রক্তশূন্যতা", "এনিমিয়া",
    "anemea", "animia", "roktosholpota", "rokto shunnota",
  ],
  [
    "blood pressure", "bp", "hypertension", "hypotension", "low blood pressure", "high blood pressure",
    "রক্তচাপ", "প্রেশার", "প্রেসার", "লো প্রেশার", "হাই প্রেশার", "উচ্চ রক্তচাপ", "নিম্ন রক্তচাপ",
    "presar", "preshar", "presure", "preasure", "low bp", "high bp",
  ],
  [
    "diabetes", "diabetic", "blood sugar", "sugar", "glucose", "insulin",
    "ডায়াবেটিস", "ডায়াবেটিস", "সুগার", "ইনসুলিন", "বহুমূত্র",
    "diabetis", "diabates", "diabetec", "dayabetis", "sugar", "shugar",
  ],
  [
    "asthma", "asthmatic", "breathing", "inhaler", "shortness of breath", "wheezing",
    "অ্যাজমা", "এজমা", "হাঁপানি", "শ্বাসকষ্ট", "ইনহেলার",
    "astha", "astma", "azma", "hapani", "shashkoshto", "saskosto",
  ],
  [
    "allergy", "allergies", "allergic", "itching", "rash", "hives",
    "অ্যালার্জি", "এলার্জি", "চুলকানি", "র‍্যাশ",
    "alergy", "allargy", "elarji", "elergy", "chulkani",
  ],
  [
    "cold", "cough", "flu", "runny nose", "sore throat", "sneezing",
    "সর্দি", "কাশি", "ঠান্ডা", "গলা ব্যথা", "ফ্লু", "হাঁচি",
    "sordi", "shordi", "kashi", "kasi", "thanda", "gola betha",
  ],
  [
    "fever", "temperature", "pyrexia", "hot",
    "জ্বর", "তাপমাত্রা", "গা গরম",
    "jor", "jwor", "fevar", "feever", "tapmatra",
  ],
  [
    "infection", "infected", "infectious", "bacteria", "virus", "fungal", "sepsis",
    "সংক্রমণ", "ইনফেকশন", "জীবাণু", "পুঁজ", "ঘা",
    "infekshon", "infaction", "songkromon", "gha",
  ],
  [
    "antibiotic", "antibiotics", "amoxicillin", "azithromycin", "cefixime", "ciprofloxacin",
    "অ্যান্টিবায়োটিক", "অ্যান্টিবায়োটিক", "এন্টিবায়োটিক", "এন্টিবায়োটিক",
    "antibotic", "antibiatic", "antibayotik", "entibiotic",
  ],
  [
    "medication", "medications", "medicine", "medicines", "drug", "drugs", "pills", "tablet", "tablets", "regular",
    "ওষুধ", "ঔষধ", "ট্যাবলেট", "ক্যাপসুল", "নিয়মিত ওষুধ",
    "oshudh", "osudh", "oushodh", "medicin", "tablat",
  ],
  [
    "painkiller", "painkillers", "analgesic", "paracetamol", "aspirin", "ibuprofen", "nsaid", "napa",
    "ব্যথানাশক", "পেইনকিলার", "প্যারাসিটামল", "নাপা", "অ্যাসপিরিন",
    "painkiler", "paracitamol", "napa", "bethar oshudh",
  ],
  [
    "vaccine", "vaccines", "vaccinated", "vaccination", "immunization", "shot", "rabies", "tetanus", "dog bite",
    "টিকা", "ভ্যাকসিন", "জলাতঙ্ক", "টিটেনাস", "কুকুর কামড়",
    "tika", "vacine", "vaksin", "vaccin", "rabis",
  ],
  [
    "surgery", "surgical", "operation", "operated", "stitches", "suture",
    "অপারেশন", "সার্জারি", "অস্ত্রোপচার", "সেলাই",
    "oparashon", "oparation", "sarjari", "surjery", "selai",
  ],
  [
    "dental", "dentist", "tooth", "teeth", "extraction", "root canal", "filling", "scaling", "gum",
    "দাঁত", "দাঁতের", "স্কেলিং", "রুট ক্যানেল", "ফিলিং", "মাড়ি",
    "daat", "dat", "dater", "dantal", "toothache",
  ],
  [
    "pregnant", "pregnancy", "expecting", "conceive", "womb",
    "গর্ভাবস্থা", "গর্ভাবস্থায়", "গর্ভবতী", "পোয়াতি", "মা হওয়া",
    "pregnent", "pragnant", "garbhoboti", "gorbhoboti", "gorbhabostha",
  ],
  [
    "birth", "childbirth", "delivery", "postpartum", "newborn", "baby", "caesarean", "c-section",
    "প্রসব", "সন্তান", "ডেলিভারি", "সিজার", "বাচ্চা হওয়ার পর",
    "proshob", "prosov", "delivari", "sizar", "baccha", "bacha",
  ],
  [
    "breastfeeding", "breastfeed", "lactating", "lactation", "nursing", "breast milk",
    "বুকের দুধ", "স্তন্যদান", "দুধ খাওয়ানো", "মায়ের দুধ",
    "buker dudh", "brestfeeding", "dudh khawano",
  ],
  [
    "fasting", "fast", "ramadan", "roza", "iftar", "sehri",
    "রোজা", "উপবাস", "রমজান", "ইফতার", "সেহরি",
    "roja", "roza", "upobash", "romjan", "iftari",
  ],
  [
    "empty stomach", "hungry", "starving", "not eaten", "without eating",
    "খালি পেটে", "না খেয়ে", "না খেয়ে", "উপোস", "ক্ষুধার্ত",
    "khali pete", "na kheye", "uposh",
  ],
  [
    "sleep", "sleeping", "slept", "insomnia", "awake", "night",
    "ঘুম", "না ঘুমিয়ে", "রাত জাগা", "অনিদ্রা",
    "ghum", "ghoom", "rat jaga", "nidra",
  ],
  [
    "alcohol", "alcoholic", "drank", "drinking alcohol", "beer", "wine", "liquor", "drunk",
    "অ্যালকোহল", "এলকোহল", "মদ্যপান", "মদ", "নেশা",
    "alchol", "alchohol", "alkohol", "mod", "moddopan",
  ],
  [
    "smoke", "smoking", "smoker", "smokers", "cigarette", "cigarettes", "biri",
    "ধূমপান", "ধূমপায়ী", "ধূমপায়ী", "সিগারেট", "বিড়ি", "বিড়ি",
    "dhumppan", "dhumpan", "sigaret", "cigarete", "biri", "bidi",
  ],
  [
    "nicotine", "vape", "vaping", "tobacco", "chewing tobacco", "zarda", "gul",
    "নিকোটিন", "ভেপ", "তামাক", "জর্দা", "গুল", "সাদাপাতা",
    "nikotin", "nicotin", "tamak", "jorda",
  ],
  [
    "underweight", "thin", "skinny", "low weight", "45 kg", "50 kg",
    "ওজন কম", "কম ওজন", "চিকন", "পাতলা", "শুকনা", "৪৫ কেজি", "৫০ কেজি",
    "ojon kom", "kom ojon", "chikon", "patla", "shukna",
  ],
  [
    "overweight", "obese", "obesity", "fat", "heavy weight", "high weight",
    "ওজন বেশি", "বেশি ওজন", "মোটা", "স্থূলতা",
    "ojon beshi", "beshi ojon", "mota",
  ],
  [
    "faint", "fainting", "fainted", "pass out", "unconscious", "syncope", "blackout",
    "অজ্ঞান", "মমূর্ষু", "মাথা ঘুরে পড়ে যাওয়া", "সেন্সলেস", "জ্ঞান হারানো",
    "ogyan", "oggan", "aggan", "faintng", "senseless",
  ],
  [
    "seizure", "seizures", "epilepsy", "epileptic", "convulsion", "fits",
    "খিঁচুনি", "মৃগীরোগ", "মৃগী", "সিজার রোগ",
    "khichuni", "mirgi", "epilepsi", "siejure", "seizure",
  ],
  [
    "heart", "cardiac", "heart disease", "heart attack", "angina", "chest pain", "coronary",
    "হৃদরোগ", "হার্ট", "হার্টের রোগ", "হার্ট অ্যাটাক", "বুকে ব্যথা",
    "hridrog", "harter rog", "hart attack", "heart atack",
  ],
  [
    "kidney", "renal", "kidney disease", "kidney stone", "dialysis",
    "কিডনি", "কিডনির রোগ", "বৃক্ক", "কিডনি পাথর", "পাথর",
    "kidni", "kidny", "pathor",
  ],
  [
    "liver", "hepatic", "liver disease", "cirrhosis", "fatty liver",
    "লিভার", "যকৃত", "যকৃতের রোগ", "সিরোসিস", "ফ্যাটি লিভার",
    "livar", "jakrit", "jokrit", "fatty livar",
  ],
  [
    "thyroid", "hypothyroidism", "hyperthyroidism", "hormone", "tsh",
    "থাইরয়েড", "থাইরয়েড", "হরমোন",
    "thairoid", "thyriod", "thiroid", "hormon",
  ],
  [
    "skin", "skin condition", "eczema", "psoriasis", "dermatitis", "fungus", "ringworm",
    "চর্মরোগ", "চামড়া", "চামড়া", "খোসপাঁচড়া", "দাদ", "একজিমা",
    "chormorog", "chamra", "ekjima", "dad",
  ],
  [
    "jaundice", "yellow eyes", "bilirubin",
    "জন্ডিস", "চোখ হলুদ", "বিলিরুবিন",
    "jondis", "jondish", "jaundis", "joundice",
  ],
  [
    "hepatitis", "hbv", "hcv", "hepatitis b", "hepatitis c", "hepatitis a",
    "হেপাটাইটিস", "হেপাটাইটিস বি", "হেপাটাইটিস সি",
    "hepatites", "hepatitas", "hapatitis",
  ],
  [
    "dengue", "mosquito", "aedes",
    "ডেঙ্গু", "ডেঙ্গি", "মশা",
    "dengu", "dengi", "dangu", "denge",
  ],
  [
    "covid", "covid-19", "covid19", "coronavirus", "corona", "sars-cov-2",
    "কোভিড", "কোভিড-১৯", "করোনা", "করোনাভাইরাস",
    "kovid", "korona", "corona",
  ],
  [
    "hiv", "aids", "std", "sti",
    "এইচআইভি", "এইডস",
    "aids", "hiv",
  ],
  [
    "blood-borne", "blood borne", "syphilis", "malaria", "htlv", "transmitted",
    "রক্তবাহিত", "সিফিলিস", "ম্যালেরিয়া", "ম্যালেরিয়া",
    "roktobahito", "malariya", "sifilis",
  ],
  [
    "transfusion", "received blood", "took blood",
    "রক্ত গ্রহণ", "রক্ত নেওয়া", "রক্ত নেওয়া", "নিজে রক্ত নিলে",
    "rokto grohon", "rokto newa", "transfusion",
  ],
  [
    "plasma", "platelet", "platelets", "apheresis", "white blood",
    "প্লাজমা", "প্লাটিলেট", "অনুচক্রিকা", "অ্যাফেরেসিস",
    "platilet", "pletlet", "plazma", "platlet",
  ],
  [
    "iron", "iron supplement", "ferrous", "folic acid",
    "আয়রন", "আয়রন", "আয়রন ট্যাবলেট", "কচুশাক", "কলিজা",
    "airon", "ayron", "iron tablat",
  ],
  [
    "vitamin", "vitamins", "multivitamin", "supplement", "supplements", "calcium",
    "ভিটামিন", "মাল্টিভিটামিন", "সাপ্লিমেন্ট", "ক্যালসিয়াম",
    "bitamin", "vitamen", "sapliment", "supliment",
  ],
  [
    "hemoglobin", "haemoglobin", "hb", "hgb", "low hemoglobin", "point",
    "হিমোগ্লোবিন", "রক্তের পয়েন্ট", "পয়েন্ট কম",
    "hemaglobin", "himoglobin", "hemogloben", "roktar point",
  ],
  [
    "travel", "travelled", "traveled", "abroad", "foreign", "country", "overseas",
    "বিদেশ", "ভ্রমণ", "প্রবাস", "বাইরের দেশ",
    "bidesh", "bhromon", "vromon", "forain",
  ],
  [
    "serious illness", "illness", "sick", "sickness", "disease", "chronic",
    "গুরুতর অসুখ", "অসুখ", "অসুস্থ", "অসুস্থতা", "রোগ", "বড় রোগ",
    "oshukh", "osukh", "osustho", "rog", "boro rog",
  ],
];

/**
 * Normalize English and Bengali strings for resilient matching:
 * - lowercases
 * - normalizes Bengali Nukta characters (য় -> য়, ড় -> ড়, ঢ় -> ঢ়)
 * - converts Bengali digits (০-৯) to ASCII digits (0-9)
 * - strips punctuation
 */
export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .replace(/\u09AF\u09BC/g, "\u09DF") // য় -> য়
    .replace(/\u09A1\u09BC/g, "\u09DC") // ড় -> ড়
    .replace(/\u09A2\u09BC/g, "\u09DD") // ঢ় -> ঢ়
    .replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Creates a phonetic skeleton so common English/Banglish/Bengali spelling variations
 * map to the same normalized form (e.g. "diabates" === "diabetes", "tatoo" === "tattoo",
 * "pregnent" === "pregnant", "hemaglobin" === "hemoglobin", "jwor" === "jor").
 */
export function toPhoneticSkeleton(word: string): string {
  if (!word) return "";
  // Check if mostly ASCII (English / Banglish)
  if (/^[a-z0-9]+$/.test(word)) {
    return word
      .replace(/ph/g, "f")
      .replace(/gh/g, "g")
      .replace(/kh/g, "k")
      .replace(/ch/g, "c")
      .replace(/sh/g, "s")
      .replace(/th/g, "t")
      .replace(/dh/g, "d")
      .replace(/bh/g, "b")
      .replace(/ck/g, "k")
      .replace(/qu/g, "k")
      .replace(/jw/g, "j")
      .replace(/w/g, "o")
      .replace(/y/g, "i")
      .replace(/z/g, "j")
      .replace(/[aeiou]+/g, "a") // vowel-agnostic skeleton for typo tolerance
      .replace(/(.)\1+/g, "$1"); // collapse repeated letters (tattoo -> tato)
  }

  // Bengali phonetic normalization
  return word
    .replace(/ী/g, "ি")
    .replace(/ূ/g, "ু")
    .replace(/[শষ]/g, "স")
    .replace(/ণ/g, "ন")
    .replace(/[ড়ঢ়]/g, "র")
    .replace(/[ড়ঢ়]/g, "র")
    .replace(/ঁ/g, "")
    .replace(/ং/g, "ঙ")
    .replace(/(.)\1+/g, "$1");
}

/**
 * Damerau-Levenshtein edit distance (supports insertion, deletion, substitution, and adjacent transposition).
 */
export function editDistance(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;
  if (Math.abs(lenA - lenB) > 4) return Math.abs(lenA - lenB);

  const dp: number[][] = Array.from({ length: lenA + 1 }, () =>
    new Array(lenB + 1).fill(0)
  );

  for (let i = 0; i <= lenA; i++) dp[i][0] = i;
  for (let j = 0; j <= lenB; j++) dp[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return dp[lenA][lenB];
}

/**
 * Bigram Sørensen–Dice similarity (0.0 to 1.0) for resilient typo matching.
 */
function bigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigramsA = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2);
    bigramsA.set(bg, (bigramsA.get(bg) || 0) + 1);
  }
  let intersection = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2);
    const count = bigramsA.get(bg) || 0;
    if (count > 0) {
      intersection++;
      bigramsA.set(bg, count - 1);
    }
  }
  return (2 * intersection) / (a.length - 1 + (b.length - 1));
}

/**
 * Checks how strongly a single query token matches a target word (0 = no match, up to 100 = exact match).
 */
function scoreWordMatch(queryWord: string, targetWord: string): number {
  if (!queryWord || !targetWord) return 0;
  if (queryWord === targetWord) return 100;

  // Prefix or substring match (for tokens >= 2 chars)
  if (queryWord.length >= 2) {
    if (targetWord.startsWith(queryWord)) return 90;
    if (targetWord.includes(queryWord)) return 82;
    if (queryWord.length >= 4 && queryWord.includes(targetWord) && targetWord.length >= 3) {
      return 78;
    }
  }

  // Phonetic skeleton match (handles vowel typos, double letters, Banglish spelling variants)
  if (queryWord.length >= 3 && targetWord.length >= 3) {
    const skelQ = toPhoneticSkeleton(queryWord);
    const skelT = toPhoneticSkeleton(targetWord);
    if (skelQ.length >= 2 && skelQ === skelT) {
      return 85;
    }
    if (skelQ.length >= 3 && skelT.startsWith(skelQ)) {
      return 76;
    }
  }

  // Fuzzy typo tolerance via Damerau-Levenshtein + Bigram similarity
  const minLen = Math.min(queryWord.length, targetWord.length);
  if (minLen >= 3) {
    const dist = editDistance(queryWord, targetWord);
    const maxAllowedDist = minLen <= 4 ? 1 : minLen <= 7 ? 2 : 3;
    if (dist <= maxAllowedDist) {
      return Math.max(50, 80 - dist * 12);
    }

    const dice = bigramSimilarity(queryWord, targetWord);
    if (dice >= 0.6) {
      return Math.round(dice * 75);
    }
  }

  return 0;
}

interface IndexedFaq {
  item: BloodFaqItem;
  fullTextNorm: string;
  questionWords: string[];
  answerWords: string[];
  synonymWords: string[];
}

let cachedIndex: IndexedFaq[] | null = null;
let cachedSourceRef: BloodFaqItem[] | null = null;

function getIndexedFaqs(faqs: BloodFaqItem[]): IndexedFaq[] {
  if (cachedIndex && cachedSourceRef === faqs) {
    return cachedIndex;
  }

  // Pre-normalize synonym clusters
  const normalizedClusters = SYNONYM_CLUSTERS.map((cluster) =>
    cluster.map((term) => normalizeSearchText(term))
  );

  cachedIndex = faqs.map((item) => {
    const qNorm = normalizeSearchText(`${item.questionEn} ${item.questionBn}`);
    const aNorm = normalizeSearchText(`${item.answerEn} ${item.answerBn}`);
    const fullTextNorm = `${qNorm} ${aNorm}`;

    const questionWords = Array.from(
      new Set(qNorm.split(" ").filter((w) => w.length >= 1))
    );
    const answerWords = Array.from(
      new Set(aNorm.split(" ").filter((w) => w.length >= 1))
    );

    // Attach all cross-language & Banglish synonyms for any cluster that appears in this FAQ's question or answer
    const matchedSynonymSet = new Set<string>();
    for (const cluster of normalizedClusters) {
      const hitsFaq = cluster.some(
        (phrase) =>
          phrase.length >= 2 &&
          (fullTextNorm.includes(` ${phrase} `) ||
            fullTextNorm.startsWith(`${phrase} `) ||
            fullTextNorm.endsWith(` ${phrase}`) ||
            fullTextNorm.includes(phrase))
      );
      if (hitsFaq) {
        for (const phrase of cluster) {
          matchedSynonymSet.add(phrase);
          for (const w of phrase.split(" ")) {
            if (w.length >= 2) matchedSynonymSet.add(w);
          }
        }
      }
    }

    return {
      item,
      fullTextNorm,
      questionWords,
      answerWords,
      synonymWords: Array.from(matchedSynonymSet),
    };
  });

  cachedSourceRef = faqs;
  return cachedIndex;
}

const STOP_WORDS = new Set([
  "can", "someone", "donate", "blood", "if", "they", "have", "had", "a", "an",
  "the", "is", "are", "to", "in", "of", "for", "after", "before", "while",
  "during", "what", "how", "should", "do", "does", "their", "recently",
  "কি", "রক্ত", "দেওয়া", "দেওয়া", "যাবে", "যায়", "যায়", "হলে", "থাকলে", "করলে", "কেন", "কখন",
]);

/**
 * Searches all FAQs across both English and Bengali questions + answers,
 * supporting misspelled words, phonetic Banglish queries, and cross-language synonyms.
 */
export function searchBloodFaqs(
  faqs: BloodFaqItem[],
  rawQuery: string
): BloodFaqItem[] {
  const normQuery = normalizeSearchText(rawQuery);
  if (!normQuery) return faqs;

  const indexed = getIndexedFaqs(faqs);
  const allTokens = normQuery.split(" ").filter(Boolean);

  // Separate meaningful domain keywords from generic filler words ("can someone donate blood if...")
  const specificTokens = allTokens.filter((t) => !STOP_WORDS.has(t));
  const tokensToScore = specificTokens.length > 0 ? specificTokens : allTokens;

  const scoredResults: { item: BloodFaqItem; score: number }[] = [];

  for (const entry of indexed) {
    let totalScore = 0;
    let matchedTokensCount = 0;

    // Bonus if the entire phrase appears verbatim in question, answer, or synonyms
    if (entry.fullTextNorm.includes(normQuery)) {
      totalScore += 140;
    } else if (entry.synonymWords.some((s) => s.includes(normQuery))) {
      totalScore += 120;
    }

    for (const token of tokensToScore) {
      let bestTokenScore = 0;

      // 1. Check Question words (highest priority)
      for (const qw of entry.questionWords) {
        const s = scoreWordMatch(token, qw);
        if (s > bestTokenScore) bestTokenScore = s;
        if (bestTokenScore === 100) break;
      }

      // 2. Check Answer words (every word in any answer is searchable!)
      if (bestTokenScore < 95) {
        for (const aw of entry.answerWords) {
          const s = scoreWordMatch(token, aw) * 0.92;
          if (s > bestTokenScore) bestTokenScore = s;
        }
      }

      // 3. Check Cross-Language & Banglish Synonym words
      if (bestTokenScore < 90) {
        for (const sw of entry.synonymWords) {
          const s = scoreWordMatch(token, sw) * 0.9;
          if (s > bestTokenScore) bestTokenScore = s;
        }
      }

      if (bestTokenScore >= 42) {
        matchedTokensCount++;
        totalScore += bestTokenScore;
      }
    }

    // Require at least one strong token match (and majority of specific tokens for multi-word queries)
    const minRequiredMatches =
      tokensToScore.length <= 2 ? tokensToScore.length : Math.ceil(tokensToScore.length * 0.6);

    if (
      totalScore >= 120 ||
      (matchedTokensCount >= minRequiredMatches && totalScore >= 42)
    ) {
      scoredResults.push({ item: entry.item, score: totalScore });
    }
  }

  scoredResults.sort((a, b) => b.score - a.score);
  return scoredResults.map((r) => r.item);
}
