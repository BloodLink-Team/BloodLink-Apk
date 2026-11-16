import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "bn";

const BN_DIGITS: Record<string, string> = {
  "0": "০",
  "1": "১",
  "2": "২",
  "3": "৩",
  "4": "৪",
  "5": "৫",
  "6": "৬",
  "7": "৭",
  "8": "৮",
  "9": "৯",
};

export const toBnNumber = (val: string | number, lang: Language): string => {
  const str = String(val);
  if (lang !== "bn") return str;
  return str.replace(/[0-9]/g, (d) => BN_DIGITS[d] || d);
};

export const LOCATION_BN: Record<string, string> = {
  // Divisions
  "Dhaka": "ঢাকা",
  "Chattogram": "চট্টগ্রাম",
  "Barishal": "বরিশাল",
  "Khulna": "খুলনা",
  "Rajshahi": "রাজশাহী",
  "Rangpur": "রংপুর",
  "Sylhet": "সিলেট",
  "Mymensingh": "ময়মনসিংহ",

  // Districts
  "Faridpur": "ফরিদপুর",
  "Gazipur": "গাজীপুর",
  "Gopalganj": "গোপালগঞ্জ",
  "Kishoreganj": "কিশোরগঞ্জ",
  "Madaripur": "মাদারীপুর",
  "Manikganj": "মানিকগঞ্জ",
  "Munshiganj": "মুন্সীগঞ্জ",
  "Narayanganj": "নারায়ণগঞ্জ",
  "Narsingdi": "নরসিংদী",
  "Rajbari": "রাজবাড়ী",
  "Shariatpur": "শরীয়তপুর",
  "Tangail": "টাঙ্গাইল",
  "Bandarban": "বান্দরবান",
  "Brahmanbaria": "ব্রাহ্মণবাড়িয়া",
  "Chandpur": "চাঁদপুর",
  "Comilla": "কুমিল্লা",
  "Cox's Bazar": "কক্সবাজার",
  "Feni": "ফেনী",
  "Khagrachhari": "খাগড়াছড়ি",
  "Lakshmipur": "লক্ষ্মীপুর",
  "Noakhali": "নোয়াখালী",
  "Rangamati": "রাঙ্গামাটি",
  "Barguna": "বরগুনা",
  "Bhola": "ভোলা",
  "Jhalokati": "ঝালকাঠি",
  "Patuakhali": "পটুয়াখালী",
  "Pirojpur": "পিরোজপুর",
  "Bagerhat": "বাগেরহাট",
  "Chuadanga": "চুয়াডাঙ্গা",
  "Jessore": "যশোর",
  "Jhenaidah": "ঝিনাইদহ",
  "Kushtia": "কুষ্টিয়া",
  "Magura": "মাগুরা",
  "Meherpur": "মেহেরপুর",
  "Narail": "নড়াইল",
  "Satkhira": "সাতক্ষীরা",
  "Bogra": "বগুড়া",
  "Chapainawabganj": "চাঁপাইনবাবগঞ্জ",
  "Joypurhat": "জয়পুরহাট",
  "Naogaon": "নওগাঁ",
  "Natore": "নাটোর",
  "Pabna": "পাবনা",
  "Sirajganj": "সিরাজগঞ্জ",
  "Dinajpur": "দিনাজপুর",
  "Gaibandha": "গাইবান্ধা",
  "Kurigram": "কুড়িগ্রাম",
  "Lalmonirhat": "লালমনিরহাট",
  "Nilphamari": "নীলফামারী",
  "Panchagarh": "পঞ্চগড়",
  "Thakurgaon": "ঠাকুরগাঁও",
  "Habiganj": "হবিগঞ্জ",
  "Moulvibazar": "মৌলভীবাজার",
  "Sunamganj": "সুনামগঞ্জ",
  "Jamalpur": "জামালপুর",
  "Netrokona": "নেত্রকোণা",
  "Sherpur": "শেরপুর",

  // Upazilas - Dhaka Division
  "Savar": "সাভার",
  "Dhamrai": "ধামরাই",
  "Keraniganj": "কেরানীগঞ্জ",
  "Nawabganj": "নবাবগঞ্জ",
  "Dohar": "দোহার",
  "Faridpur Sadar": "ফরিদপুর সদর",
  "Alfadanga": "আলফাডাঙ্গা",
  "Bhanga": "ভাঙ্গা",
  "Boalmari": "বোয়ালমারী",
  "Charbhadrasan": "চরভদ্রাসন",
  "Madhukhali": "মধুখালী",
  "Nagarkanda": "নগরকান্দা",
  "Sadarpur": "সদরপুর",
  "Saltha": "সালথা",
  "Gazipur Sadar": "গাজীপুর সদর",
  "Kaliakair": "কালিয়াকৈর",
  "Kaliganj": "কালীগঞ্জ",
  "Kapasia": "কাপাসিয়া",
  "Sreepur": "শ্রীপুর",
  "Gopalganj Sadar": "গোপালগঞ্জ সদর",
  "Kashiani": "কাশিয়ানী",
  "Kotalipara": "কোটালীপাড়া",
  "Muksudpur": "মুকসুদপুর",
  "Tungipara": "টুঙ্গিপাড়া",
  "Kishoreganj Sadar": "কিশোরগঞ্জ সদর",
  "Austagram": "অষ্টগ্রাম",
  "Bajitpur": "বাজিতপুর",
  "Bhairab": "ভৈরব",
  "Hossainpur": "হোসেনপুর",
  "Itna": "ইটনা",
  "Karimganj": "করিমগঞ্জ",
  "Katiadi": "কটিয়াদী",
  "Kuliarchar": "কুলিয়ারচর",
  "Mithamain": "মিঠামইন",
  "Nikli": "নিকলী",
  "Pakundia": "পাকুন্দিয়া",
  "Tarail": "তাড়াইল",
  "Madaripur Sadar": "মাদারীপুর সদর",
  "Kalkini": "কালকিনি",
  "Rajoir": "রাজৈর",
  "Shibchar": "শিবচর",
  "Manikganj Sadar": "মানিকগঞ্জ সদর",
  "Daulatpur": "দৌলতপুর",
  "Ghior": "ঘিওর",
  "Harirampur": "হরিরামপুর",
  "Saturia": "সাটুরিয়া",
  "Shivalaya": "শিবালয়",
  "Singair": "সিংগাইর",
  "Munshiganj Sadar": "মুন্সীগঞ্জ সদর",
  "Tongibari": "টঙ্গীবাড়ী",
  "Srinagar": "শ্রীনগর",
  "Sirajdikhan": "সিরাজদিখান",
  "Lohajang": "লৌহজং",
  "Gazaria": "গজারিয়া",
  "Narayanganj Sadar": "নারায়ণগঞ্জ সদর",
  "Araihazar": "আড়াইহাজার",
  "Bandar": "বন্দর",
  "Rupganj": "রূপগঞ্জ",
  "Sonargaon": "সোনারগাঁও",
  "Narsingdi Sadar": "নরসিংদী সদর",
  "Belabo": "বেলাবো",
  "Monohardi": "মনোহরদী",
  "Palash": "পলাশ",
  "Raipura": "রায়পুরা",
  "Shibpur": "শিবপুর",
  "Rajbari Sadar": "রাজবাড়ী সদর",
  "Baliakandi": "বালিয়াকান্দি",
  "Goalanda": "গোয়ালন্দ",
  "Pangsha": "পাংশা",
  "Kalukhali": "কালুখালী",
  "Shariatpur Sadar": "শরীয়তপুর সদর",
  "Bhedarganj": "ভেদরগঞ্জ",
  "Damudya": "ডামুড্যা",
  "Gosairhat": "গোসাইরহাট",
  "Naria": "নড়িয়া",
  "Zanjira": "জাজিরা",
  "Tangail Sadar": "টাঙ্গাইল সদর",
  "Basail": "বাসাইল",
  "Bhuapur": "ভূঞাপুর",
  "Delduar": "দেলদুয়ার",
  "Ghatail": "ঘাটাইল",
  "Gopalpur": "গোপালপুর",
  "Kalihati": "কালিহাতী",
  "Madhupur": "মধুপুর",
  "Mirzapur": "মির্জাপুর",
  "Nagarpur": "নাগরপুর",
  "Sakhipur": "সখিপুর",
  "Dhanbari": "ধনবাড়ী",

  // Chattogram Division
  "Bandarban Sadar": "বান্দরবান সদর",
  "Ali Kadam": "আলীকদম",
  "Lama": "লামা",
  "Naikhongchhari": "নাইক্ষ্যংছড়ি",
  "Rowangchhari": "রোয়াংছড়ি",
  "Ruma": "রুমা",
  "Thanchi": "থানচি",
  "Brahmanbaria Sadar": "ব্রাহ্মণবাড়িয়া সদর",
  "Ashuganj": "আশুগঞ্জ",
  "Bancharampur": "বাঞ্ছারামপুর",
  "Bijoynagar": "বিজয়নগর",
  "Kasba": "কসবা",
  "Nabinagar": "নবীনগর",
  "Nasirnagar": "নাসিরনগর",
  "Sarail": "সরাইল",
  "Chandpur Sadar": "চাঁদপুর সদর",
  "Faridganj": "ফরিদগঞ্জ",
  "Haimchar": "হাইমচর",
  "Haziganj": "হাজীগঞ্জ",
  "Kachua": "কচুয়া",
  "Matlab North": "মতলব উত্তর",
  "Matlab South": "মতলব দক্ষিণ",
  "Shahrasti": "শাহরাস্তি",
  "Boalkhali": "বোয়ালখালী",
  "Chandanis": "চন্দনাইশ",
  "Fatikchhari": "ফটিকছড়ি",
  "Hathazari": "হাটহাজারী",
  "Lohagara": "লোহাগাড়া",
  "Mirsharai": "মীরসরাই",
  "Patiya": "পটিয়া",
  "Rangunia": "রাঙ্গুনিয়া",
  "Raozan": "রাউজান",
  "Sandwip": "সন্দ্বীপ",
  "Satkania": "সাতকানিয়া",
  "Sitakunda": "সীতাকুণ্ড",
  "Banshkhali": "বাঁশখালী",
  "Anwara": "আনোয়ারা",
  "Karnaphuli": "কর্ণফুলী",
  "Adarsha Sadar": "আদর্শ সদর",
  "Sadar South": "সদর দক্ষিণ",
  "Barura": "বরুড়া",
  "Brahmanpara": "ব্রাহ্মণপাড়া",
  "Burichang": "বুড়িচং",
  "Chandina": "চান্দিনা",
  "Chauddagram": "চৌদ্দগ্রাম",
  "Daudkandi": "দাউদকান্দি",
  "Debidwar": "দেবিদ্বার",
  "Homna": "হোমনা",
  "Laksam": "লাকসাম",
  "Lalmai": "লালমাই",
  "Meghna": "মেঘনা",
  "Monohargonj": "মনোহরগঞ্জ",
  "Muradnagar": "মুরাদনগর",
  "Nangalkot": "নাঙ্গলকোট",
  "Titas": "তিতাস",
  "Cox's Bazar Sadar": "কক্সবাজার সদর",
  "Chakaria": "চকরিয়া",
  "Maheshkhali": "মহেশখালী",
  "Ramu": "রামু",
  "Teknaf": "টেকনাফ",
  "Ukhia": "উখিয়া",
  "Kutubdia": "কুতুবদিয়া",
  "Pekua": "পেকুয়া",
  "Feni Sadar": "ফেনী সদর",
  "Chhagalnaiya": "ছাগলনাইয়া",
  "Daganbhuiyan": "দাগনভূঞা",
  "Parshuram": "পরশুরাম",
  "Fulgazi": "ফুলগাজী",
  "Sonagazi": "সোনাগাজী",
  "Khagrachhari Sadar": "খাগড়াছড়ি সদর",
  "Dighinala": "দীঘিনালা",
  "Lakshmichhari": "লক্ষ্মীছড়ি",
  "Mahalchhari": "মহালছড়ি",
  "Manikchhari": "মানিকছড়ি",
  "Matiranga": "মাটিরাঙ্গা",
  "Panchhari": "পানছড়ি",
  "Ramgarh": "রামগড়",
  "Lakshmipur Sadar": "লক্ষ্মীপুর সদর",
  "Raipur": "রায়পুর",
  "Ramganj": "রামগঞ্জ",
  "Ramgati": "রামগতি",
  "Kamalnagar": "কমলনগর",
  "Noakhali Sadar": "নোয়াখালী সদর",
  "Begumganj": "বেগমগঞ্জ",
  "Chatkhil": "চাটখিল",
  "Companiganj": "কোম্পানীগঞ্জ",
  "Hatiya": "হাতিয়া",
  "Senbagh": "সেনবাগ",
  "Sonaimuri": "সোনাইমুড়ী",
  "Subarnachar": "সুবর্ণচর",
  "Kabirhat": "কবিরহাট",
  "Rangamati Sadar": "রাঙ্গামাটি সদর",
  "Belaichhari": "বিলাইছড়ি",
  "Bagaichhari": "বাঘাইছড়ি",
  "Barkal": "বরকল",
  "Juraichhari": "জুরাছড়ি",
  "Rajasthali": "রাজস্থলী",
  "Kaptai": "কাপ্তাই",
  "Langadu": "লংগদু",
  "Naniyarchar": "নানিয়ারচর",
  "Kaukhali": "কাউখালী",

  // Barishal Division
  "Barguna Sadar": "বরগুনা সদর",
  "Amtali": "আমতলী",
  "Bamna": "বামনা",
  "Betagi": "বেতাগী",
  "Patharghata": "পাথরঘাটা",
  "Taltali": "তালতলী",
  "Barishal Sadar": "বরিশাল সদর",
  "Agailjhara": "আগৈলঝাড়া",
  "Babuganj": "বাবুগঞ্জ",
  "Bakerganj": "বাকেরগঞ্জ",
  "Banaripara": "বানারীপাড়া",
  "Gaurnadi": "গৌরনদী",
  "Hizla": "হিজলা",
  "Mehendiganj": "মেহেন্দিগঞ্জ",
  "Muladi": "মুলাদী",
  "Wazirpur": "উজিরপুর",
  "Bhola Sadar": "ভোলা সদর",
  "Burhanuddin": "বোরহানউদ্দিন",
  "Char Fasson": "চরফ্যাশন",
  "Daulatkhan": "দৌলতখান",
  "Lalmohan": "লালমোহন",
  "Manpura": "মনপুরা",
  "Tazumuddin": "তজুমদ্দিন",
  "Jhalokati Sadar": "ঝালকাঠি সদর",
  "Kathalia": "কাঁঠালিয়া",
  "Nalchity": "নলছিটি",
  "Rajapur": "রাজাপুর",
  "Patuakhali Sadar": "পটুয়াখালী সদর",
  "Bauphal": "বাউফল",
  "Dashmina": "দশমিনা",
  "Galachipa": "গলাচিপা",
  "Kalapara": "কলাপাড়া",
  "Mirzaganj": "মির্জাগঞ্জ",
  "Rangabali": "রাঙ্গাবালী",
  "Dumki": "দুমকি",
  "Pirojpur Sadar": "পিরোজপুর সদর",
  "Bhandaria": "ভাণ্ডারিয়া",
  "Kawkhali": "কাউখালী",
  "Mathbaria": "মঠবাড়িয়া",
  "Nazirpur": "নাজিরপুর",
  "Nesarabad": "নেছারাবাদ",
  "Zianagar": "জিয়ানগর",

  // Khulna Division
  "Bagerhat Sadar": "বাগেরহাট সদর",
  "Chitalmari": "চিতলমারী",
  "Fakirhat": "ফকিরহাট",
  "Mollahat": "মোল্লাহাট",
  "Mongla": "মোংলা",
  "Morrelganj": "মোড়েলগঞ্জ",
  "Rampal": "রামপাল",
  "Sarankhola": "শরণখোলা",
  "Chuadanga Sadar": "চুয়াডাঙ্গা সদর",
  "Alamdanga": "আলমডাঙ্গা",
  "Damurhuda": "দামুড়হুদা",
  "Jibannagar": "জীবননগর",
  "Jessore Sadar": "যশোর সদর",
  "Abhaynagar": "অভয়নগর",
  "Bagherpara": "বাঘারপাড়া",
  "Chaugachha": "চৌগাছা",
  "Jhikargachha": "ঝিকরগাছা",
  "Keshabpur": "কেশবপুর",
  "Manirampur": "মণিরামপুর",
  "Sharsha": "শার্শা",
  "Jhenaidah Sadar": "ঝিনাইদহ সদর",
  "Harakunda": "হরিণাকুণ্ডু",
  "Kotchandpur": "কোটচাঁদপুর",
  "Maheshpur": "মহেশপুর",
  "Shailkupa": "শৈলকুপা",
  "Khulna Sadar": "খুলনা সদর",
  "Batiaghata": "বটিয়াঘাটা",
  "Dacope": "দাকোপ",
  "Dumuria": "ডুমুরিয়া",
  "Dighalia": "দিঘলিয়া",
  "Koyra": "কয়রা",
  "Paikgachha": "পাইকগাছা",
  "Phultala": "ফুলতলা",
  "Rupa": "রূপসা",
  "Kushtia Sadar": "কুষ্টিয়া সদর",
  "Bheramara": "ভেড়ামারা",
  "Khoksa": "খোকসা",
  "Kumarkhali": "কুমারখালী",
  "Mirpur": "মিরপুর",
  "Magura Sadar": "মাগুরা সদর",
  "Mohammadpur": "মহম্মদপুর",
  "Shalikha": "শালিখা",
  "Meherpur Sadar": "মেহেরপুর সদর",
  "Gangni": "গাংনী",
  "Mujibnagar": "মুজিবনগর",
  "Narail Sadar": "নড়াইল সদর",
  "Kalia": "কালিয়া",
  "Satkhira Sadar": "সাতক্ষীরা সদর",
  "Assasuni": "আশাশুনি",
  "Debhata": "দেবহাটা",
  "Kalaroa": "কলারোয়া",
  "Shyamnagar": "শ্যামনগর",
  "Tala": "তালা",

  // Rajshahi Division
  "Bogra Sadar": "বগুড়া সদর",
  "Adamdighi": "আদমদীঘি",
  "Dhunat": "ধুনট",
  "Dhupchanchia": "দুপচাঁচিয়া",
  "Gabtali": "গাবতলী",
  "Kahaloo": "কাহালু",
  "Nandigram": "নন্দীগ্রাম",
  "Sariakandi": "সারিয়াকান্দি",
  "Shibganj": "শিবগঞ্জ",
  "Sonatola": "সোনাতলা",
  "Shajahanpur": "শাজাহানপুর",
  "Chapainawabganj Sadar": "চাঁপাইনবাবগঞ্জ সদর",
  "Bholahat": "ভোলাহাট",
  "Gomastapur": "গোমস্তাপুর",
  "Nachole": "নাচোল",
  "Joypurhat Sadar": "জয়পুরহাট সদর",
  "Akkelpur": "আক্কেলপুর",
  "Kalai": "কালাই",
  "Khetlal": "ক্ষেতলাল",
  "Panchbibi": "পাঁচবিবি",
  "Naogaon Sadar": "নওগাঁ সদর",
  "Atrai": "আত্রাই",
  "Badalgachhi": "বদলগাছী",
  "Dhamoirhat": "ধামইরহাট",
  "Manda": "মান্দা",
  "Mahadevpur": "মহাদেবপুর",
  "Niamatpur": "নিয়ামতপুর",
  "Patnitala": "পত্নীতলা",
  "Porsha": "পোরশা",
  "Raninagar": "রাণীনগর",
  "Sapahar": "সাপাহার",
  "Natore Sadar": "নাটোর সদর",
  "Bagatipara": "বাগাতিপাড়া",
  "Baraigram": "বড়াইগ্রাম",
  "Gurudaspur": "গুরুদাসপুর",
  "Lalpur": "লালপুর",
  "Singra": "সিংড়া",
  "Naldanga": "নলডাঙ্গা",
  "Pabna Sadar": "পাবনা সদর",
  "Atgharia": "আটঘরিয়া",
  "Bera": "বেড়া",
  "Bhangura": "ভাঙ্গুড়া",
  "Chatmohar": "চাটমোহর",
  "Ishwardi": "ঈশ্বরদী",
  "Santhia": "সাঁথিয়া",
  "Sujanagar": "সুজানগর",
  "Rajshahi Sadar": "রাজশাহী সদর",
  "Bagha": "বাঘা",
  "Bagmara": "বাগমারা",
  "Charghat": "চারঘাট",
  "Durgapur": "দুর্গাপুর",
  "Godagari": "গোদাগাড়ী",
  "Mohanpur": "মোহনপুর",
  "Paba": "পবা",
  "Puthia": "পুঠিয়া",
  "Tanore": "তানোর",
  "Sirajganj Sadar": "সিরাজগঞ্জ সদর",
  "Belkuchi": "বেলকুচি",
  "Chauhali": "চৌহালী",
  "Kamarkhanda": "কামারখন্দ",
  "Kazipur": "কাজীপুর",
  "Raiganj": "রায়গঞ্জ",
  "Shahjadpur": "শাহজাদপুর",
  "Tarash": "তাড়াশ",
  "Ullahpara": "উল্লাপাড়া",

  // Rangpur Division
  "Dinajpur Sadar": "দিনাজপুর সদর",
  "Birampur": "বিরামপুর",
  "Birganj": "বীরগঞ্জ",
  "Birol": "বিরল",
  "Bochaganj": "বোচাগঞ্জ",
  "Chirirbandar": "চিরিরবন্দর",
  "Phulbari": "ফুলবাড়ী",
  "Ghoraghat": "ঘোড়াঘাট",
  "Hakimpur": "হাকিমপুর",
  "Kaharole": "কাহারোল",
  "Khansama": "খানসামা",
  "Parbatipur": "পার্বতীপুর",
  "Gaibandha Sadar": "গাইবান্ধা সদর",
  "Phulchhari": "ফুলছড়ি",
  "Gobindaganj": "গোবিন্দগঞ্জ",
  "Palashbari": "পলাশবাড়ী",
  "Sadullapur": "সাদুল্লাপুর",
  "Saghata": "সাঘাটা",
  "Sundarganj": "সুন্দরগঞ্জ",
  "Kurigram Sadar": "কুড়িগ্রাম সদর",
  "Bhurungamari": "ভূরুঙ্গামারী",
  "Char Rajibpur": "চর রাজিবপুর",
  "Chilmari": "চিলমারী",
  "Nageshwari": "নাগেশ্বরী",
  "Rajarhat": "রাজারহাট",
  "Roumari": "রৌমারী",
  "Ulipur": "উলিপুর",
  "Lalmonirhat Sadar": "লালমনিরহাট সদর",
  "Aditmari": "আদিতমারী",
  "Hatibandha": "হাতীবান্ধা",
  "Patgram": "পাটগ্রাম",
  "Nilphamari Sadar": "নীলফামারী সদর",
  "Dimla": "ডিমলা",
  "Domar": "ডোমার",
  "Jaldhaka": "জলঢাকা",
  "Saidpur": "সৈয়দপুর",
  "Panchagarh Sadar": "পঞ্চগড় সদর",
  "Atwari": "আটোয়ারী",
  "Boda": "বোদা",
  "Debiganj": "দেবীগঞ্জ",
  "Tetulia": "তেঁতুলিয়া",
  "Rangpur Sadar": "রংপুর সদর",
  "Badarganj": "বদরগঞ্জ",
  "Gangachara": "গঙ্গাচড়া",
  "Kaunia": "কাউনিয়া",
  "Mithapukur": "মিঠাপুকুর",
  "Pirgachha": "পীরগাছা",
  "Pirganj": "পীরগঞ্জ",
  "Taraganj": "তারাগঞ্জ",
  "Thakurgaon Sadar": "ঠাকুরগাঁও সদর",
  "Baliadangi": "বালিয়াডাঙ্গী",
  "Haripur": "হরিপুর",
  "Ranisankail": "রাণীশংকৈল",

  // Sylhet Division
  "Habiganj Sadar": "হবিগঞ্জ সদর",
  "Ajmiriganj": "আজমিরীগঞ্জ",
  "Bahubal": "বাহুবল",
  "Baniyachong": "বানিয়াচং",
  "Chunarughat": "চুনারুঘাট",
  "Lakhai": "লাখাই",
  "Madhabpur": "মাধবপুর",
  "Nabiganj": "নবীগঞ্জ",
  "Sayestaganj": "শায়েস্তাগঞ্জ",
  "Moulvibazar Sadar": "মৌলভীবাজার সদর",
  "Barlekha": "বড়লেখা",
  "Kamalganj": "কমলগঞ্জ",
  "Kulaura": "কুলাউড়া",
  "Rajnagar": "রাজনগর",
  "Sreemangal": "শ্রীমঙ্গল",
  "Juri": "জুড়ী",
  "Sunamganj Sadar": "সুনামগঞ্জ সদর",
  "Bishwamirpur": "বিশ্বম্ভরপুর",
  "Chhatak": "ছাতক",
  "Derai": "দিরাই",
  "Dharamapasha": "ধর্মপাশা",
  "Dowarabazar": "দোয়ারাবাজার",
  "Jagannathpur": "জগন্নাথপুর",
  "Jamalganj": "জামালগঞ্জ",
  "Sullah": "শাল্লা",
  "Tahirpur": "তাহিরপুর",
  "Dakshin Sunamganj": "দক্ষিণ সুনামগঞ্জ",
  "Sylhet Sadar": "সিলেট সদর",
  "Beanibazar": "বিয়ানীবাজার",
  "Bishwanath": "বিশ্বনাথ",
  "Fenchuganj": "ফেঞ্চুগঞ্জ",
  "Golapganj": "গোলাপগঞ্জ",
  "Gowainghat": "গোয়াইনঘাট",
  "Jaintiapur": "জৈন্তাপুর",
  "Kanaighat": "কানাইঘাট",
  "Zakiganj": "জকিগঞ্জ",
  "South Surma": "দক্ষিণ সুরমা",
  "Osmani Nagar": "ওসমানীনগর",

  // Mymensingh Division
  "Jamalpur Sadar": "জামালপুর সদর",
  "Bakshiganj": "বকশীগঞ্জ",
  "Dewanganj": "দেওয়ানগঞ্জ",
  "Islampur": "ইসলামপুর",
  "Madarganj": "মাদারগঞ্জ",
  "Melandaha": "মেলান্দহ",
  "Sarishabari": "সরিষাবাড়ী",
  "Mymensingh Sadar": "ময়মনসিংহ সদর",
  "Bhaluka": "ভালুকা",
  "Dhobaura": "ধোবাউড়া",
  "Fulbaria": "ফুলবাড়িয়া",
  "Gaffargaon": "গফরগাঁও",
  "Gauripur": "গৌরীপুর",
  "Haluaghat": "হালুয়াঘাট",
  "Ishwarganj": "ঈশ্বরগঞ্জ",
  "Muktagachha": "মুক্তাগাছা",
  "Nandail": "নান্দাইল",
  "Phulpur": "ফুলপুর",
  "Trishal": "ত্রিশাল",
  "Tara Khanda": "তারাকান্দা",
  "Netrokona Sadar": "নেত্রকোণা সদর",
  "Atpara": "আটপাড়া",
  "Barhatta": "বারহাট্টা",
  "Khaliajuri": "খালিয়াজুরী",
  "Kalmakanda": "কলমাকান্দা",
  "Kendua": "কেন্দুয়া",
  "Madan": "মদন",
  "Mohanganj": "মোহনগঞ্জ",
  "Purbadhala": "পূর্বধলা",
  "Sherpur Sadar": "শেরপুর সদর",
  "Jhenaigati": "ঝিনাইগাতী",
  "Nakla": "নকলা",
  "Nalitabari": "নালিতাবাড়ী",
  "Sreebardi": "শ্রীবরদী",
};

export const translateLocation = (name: string, lang: Language): string => {
  if (!name || lang !== "bn") return name;
  if (LOCATION_BN[name]) return LOCATION_BN[name];
  if (name.endsWith(" Sadar")) {
    const base = name.replace(/ Sadar$/, "");
    if (LOCATION_BN[base]) return `${LOCATION_BN[base]} সদর`;
  }
  return name;
};

interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  toggleLang: () => void;
  n: (val: string | number) => string;
  loc: (name: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  toggleLang: () => {},
  n: (val) => String(val),
  loc: (name) => name,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = window.localStorage.getItem("bloodlink_lang");
      return saved === "bn" ? "bn" : "en";
    } catch {
      return "en";
    }
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      window.localStorage.setItem("bloodlink_lang", newLang);
    } catch {
      // ignore
    }
  };

  const toggleLang = () => {
    setLang(lang === "en" ? "bn" : "en");
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        n: (val) => toBnNumber(val, lang),
        loc: (name) => translateLocation(name, lang),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export const LanguageSwitch: React.FC<{
  className?: string;
  variant?: "onRed" | "light";
  currentLang?: Language;
  onSelectLang?: (newLang: Language) => void;
}> = ({
  className = "",
  variant = "onRed",
  currentLang,
  onSelectLang,
}) => {
  const globalLang = useLanguage();
  const lang = currentLang ?? globalLang.lang;
  const setLang = onSelectLang ?? globalLang.setLang;
  const isOnRed = variant === "onRed";

  return (
    <div
      className={`inline-grid grid-cols-2 items-center rounded-full p-0.5 select-none ${
        isOnRed
          ? "bg-black/20 border border-white/25"
          : "bg-slate-100 border border-slate-200/80 shadow-xs"
      } ${className}`}
      role="group"
      aria-label="Language selector"
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`w-[62px] py-1 rounded-full text-[11.5px] font-bold tracking-tight text-center flex items-center justify-center leading-none h-6 transition-all duration-150 ${
          lang === "en"
            ? isOnRed
              ? "bg-white text-[#c80000] shadow-xs"
              : "bg-[#c80000] text-white shadow-xs"
            : isOnRed
            ? "text-white/90 hover:text-white"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => setLang("bn")}
        className={`w-[62px] py-1 rounded-full text-[12.5px] font-bold tracking-wider text-center flex items-center justify-center leading-none h-6 transition-all duration-150 ${
          lang === "bn"
            ? isOnRed
              ? "bg-white text-[#c80000] shadow-xs"
              : "bg-[#c80000] text-white shadow-xs"
            : isOnRed
            ? "text-white/90 hover:text-white"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        বাংলা
      </button>
    </div>
  );
};
