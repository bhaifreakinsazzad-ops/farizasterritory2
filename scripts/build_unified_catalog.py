# -*- coding: utf-8 -*-
"""
Generate unified catalogData.js for Fariza's Territory:
- Exactly 53 SKUs (18 Fashion + 35 Accessories)
- 8 Collections (5 Fashion + 3 Accessories)
- Full bilingual metadata (English + Bengali)
- Proper local assets paths in assets/products/<SKU>/
- Hotspots & Pair Your Look data
"""
import json, os

COLLECTIONS = [
    {
        "id": "01",
        "pillar": "Fashion",
        "slug": "aarong-seller-label",
        "name": "Aarong — Seller Label",
        "nameBn": "আড়ং — বিক্রেতা লেবেল",
        "short": "Aarong Label",
        "acc": "#8E3B66",
        "note": "Seller-labeled collection. The Aarong label is unverified in the source CSV — affiliation is not claimed.",
        "noteBn": "বিক্রেতা-লেবেলকৃত কালেকশন (অফিশিয়াল অ্যাফিলিয়েশন যাচাইকৃত নয়)।",
        "count": 1
    },
    {
        "id": "02",
        "pillar": "Fashion",
        "slug": "alfi-boutique",
        "name": "Alfi Boutique",
        "nameBn": "আলফি বুটিক",
        "short": "Alfi Boutique",
        "acc": "#1F6E63",
        "note": "Batik artistry — emerald and mauve florals with hand-drawn character.",
        "noteBn": "বাটিক শৈলী — এমেরাল্ড টিল ও ডাস্টি মভ ফ্লোরাল থ্রি-পিস।",
        "count": 2
    },
    {
        "id": "03",
        "pillar": "Fashion",
        "slug": "mome-boutique",
        "name": "Mome Boutique",
        "nameBn": "মোম বুটিক",
        "short": "Mome Boutique",
        "acc": "#B0326E",
        "note": "Noir-grounded statements — forest, fuchsia, mustard and burgundy moods.",
        "noteBn": "গাঢ় বেসে গ্রেডিয়েন্ট ও বোটানিক্যাল বাটিক ড্রেস ম্যাটেরিয়াল।",
        "count": 4
    },
    {
        "id": "04",
        "pillar": "Fashion",
        "slug": "zam-zam-swiss-lawn",
        "name": "Zam Zam Swiss Lawn",
        "nameBn": "জমজম সুইস লন",
        "short": "Zam Zam Swiss Lawn",
        "acc": "#2C4470",
        "note": "Swiss lawn prints — royal blooms, heritage teals and geometric gardens.",
        "noteBn": "আনস্টিচড সুইস লন ডিজিটাল প্রিন্ট থ্রি-পিস কালেকশন।",
        "count": 6
    },
    {
        "id": "05",
        "pillar": "Fashion",
        "slug": "cotton-mirror-embroidery",
        "name": "Cotton Mirror & Embroidery",
        "nameBn": "কটন মিরর ও এমব্রয়ডারি",
        "short": "Mirror & Embroidery",
        "acc": "#C6952B",
        "note": "Cotton pieces with mirror work and ethnic embroidery — artisanal sparkle.",
        "noteBn": "মিরর-ওয়ার্ক ও এমব্রয়ডারি ডিটেইলসহ কটন কালেকশন।",
        "count": 5
    },
    {
        "id": "06",
        "pillar": "Accessories",
        "slug": "decorative-mirrors",
        "name": "Decorative Mirrors",
        "nameBn": "ডেকোরেটিভ মিরর (হ্যান্ডমেড আয়না)",
        "short": "Handmade Mirrors",
        "acc": "#794722",
        "note": "Ornate round mirrors with layered petal-inspired frames. Color customization requests welcome.",
        "noteBn": "ফুলের পাপড়ি নকশার গোল ডেকোরেটিভ আয়না। রঙ কাস্টমাইজেশনের অনুরোধ গ্রহণযোগ্য।",
        "count": 5
    },
    {
        "id": "07",
        "pillar": "Accessories",
        "slug": "pendants-jewelry",
        "name": "Pendants & Jewelry",
        "nameBn": "পেনড্যান্ট ও জুয়েলারি",
        "short": "Artisan Jewelry",
        "acc": "#2E5FA3",
        "note": "Hand-painted folk motifs, rickshaw art, floral mandalas and relief jewelry sets.",
        "noteBn": "লোকজ মোটিফ, রিকশা আর্ট, ম্যান্ডালা পেনড্যান্ট ও জুয়েলারি সেট।",
        "count": 19
    },
    {
        "id": "08",
        "pillar": "Accessories",
        "slug": "bangles-accessories",
        "name": "Bangles & Accessories",
        "nameBn": "হ্যান্ডমেড চুড়ি ও অ্যাকসেসরিজ",
        "short": "Bangles & More",
        "acc": "#D06A4E",
        "note": "Painted floral bangles, thread-wrapped trios and cutwork pairs.",
        "noteBn": "হাতে আঁকা চুড়ি, সুতা-মোড়ানো ট্রায়ো ও কাটওয়ার্ক জোড়া।",
        "count": 11
    }
]

FASHION_ITEMS = [
    {
        "sku": "CAT-001",
        "colId": "01",
        "title": "Magenta Plum Printed Three Piece",
        "titleBn": "ম্যাজেন্টা ও প্লাম প্রিন্টেড থ্রি-পিস",
        "slug": "magenta-plum-printed-three-piece",
        "acc": "#8E3B66",
        "priceBDT": 2350,
        "priceStatus": "reference",
        "unit": "3-Piece Set",
        "unitBn": "থ্রি-পিস সেট (আনস্টিচড)",
        "cautionBn": "বিক্রেতা-লেবেলকৃত কালেকশন (আড়ং অ্যাফিলিয়েশন যাচাইকৃত নয়)। রেফারেন্স মূল্য ৳2,350 — অর্ডারের আগে স্টক ও সাইজ নিশ্চিত করুন।",
        "cautionEn": "Seller-labeled collection. Reference price ৳2,350 — confirm size & availability with seller.",
        "descriptionBn": "ম্যাজেন্টা ও প্লামের আকর্ষণীয় বৈপরীত্যে সাজানো এই থ্রি-পিসে আছে সাদা-গোলাপি ফুল, পেইসলি মোটিফ ও ডেকোরেটিভ বর্ডার। উজ্জ্বল ফুশিয়া সলিড কাপড় এবং ট্যাসেলসহ প্রিন্টেড ওড়না পুরো সেটে যোগ করে প্রাণবন্ত ফিনিশ।",
        "descriptionEn": "Rich magenta and plum printed three-piece featuring white-pink florals, paisley motifs, solid fuchsia bottom fabric, and a tasseled printed dupatta.",
        "details": {
            "kameez": "প্লাম বেসে ফ্লোরাল-পেইসলি প্রিন্ট ও বর্ডার",
            "salwar": "উজ্জ্বল ফুশিয়া/পিংক সলিড কাপড়",
            "dupatta": "ম্যাজেন্টা-প্লাম প্রিন্ট ও ট্যাসেল",
            "stitching": "আলাদা হাতার কাপড়সহ আনস্টিচড"
        }
    },
    {
        "sku": "CAT-002",
        "colId": "02",
        "title": "Emerald Teal Batik",
        "titleBn": "এমেরাল্ড টিল বাটিক থ্রি-পিস",
        "slug": "emerald-teal-batik",
        "acc": "#1F6E63",
        "priceBDT": 2150,
        "priceStatus": "reference",
        "unit": "3-Piece Set",
        "unitBn": "থ্রি-পিস সেট",
        "cautionBn": "ক্যাটালগ রেফারেন্স মূল্য ৳2,150 — অর্ডারের আগে সাইজ ও স্টক নিশ্চিত করুন।",
        "cautionEn": "Catalog reference price ৳2,150 — confirm size & availability on Messenger.",
        "descriptionBn": "কালো ও আইভরি রঙের অ্যাবস্ট্রাক্ট বাটিক-অনুপ্রাণিত নকশায় একটি স্বতন্ত্র লুক। টিল-সবুজ টাই-ডাই ঘরানার ওড়নার রাস্ট বর্ডার এবং টেরাকোটা রঙের সলিড কাপড় যোগ করেছে সাহসী, মার্জিত কনট্রাস্ট।",
        "descriptionEn": "Charcoal and ivory batik-inspired floral geometric print paired with terracotta solid fabric and a teal-green rust-bordered dupatta.",
        "details": {
            "kameez": "কালো/চারকোল বেসে আইভরি ফ্লোরাল ও জ্যামিতিক প্রিন্ট",
            "salwar": "টেরাকোটা/রাস্ট সলিড কাপড়",
            "dupatta": "টিল-সবুজ স্ট্রাইপ ও রাস্ট বর্ডার",
            "stitching": "আনস্টিচড বাটিক সেট"
        }
    },
    {
        "sku": "CAT-003",
        "colId": "02",
        "title": "Dusty Mauve Floral Batik",
        "titleBn": "ডাস্টি মভ ফ্লোরাল বাটিক থ্রি-পিস",
        "slug": "dusty-mauve-floral-batik",
        "acc": "#A87C8F",
        "priceBDT": 2050,
        "priceStatus": "reference",
        "unit": "3-Piece Set",
        "unitBn": "থ্রি-পিস সেট",
        "cautionBn": "ক্যাটালগ রেফারেন্স মূল্য ৳2,050 — অর্ডারের আগে নিশ্চিত করুন।",
        "cautionEn": "Catalog reference price ৳2,050 — confirm with seller.",
        "descriptionBn": "ডাস্টি মভের কোমল রঙে অফ-হোয়াইট ফুল এবং বড় বৃত্তাকার বাটিক মোটিফের পরিমিত সৌন্দর্য। একই টোনের সলিড কাপড় ও সূক্ষ্ম ফ্লোরাল প্রিন্টের ট্যাসেলযুক্ত ওড়নায় তৈরি হয়েছে সহজ, রুচিশীল থ্রি-পিস কম্বিনেশন।",
        "descriptionEn": "Soft dusty mauve ensemble with off-white florals, circular batik motifs, matching solid bottom fabric, and a tasseled floral dupatta.",
        "details": {
            "kameez": "ডাস্টি মভে সাদা ফুল ও গোলাকার বাটিক মোটিফ",
            "salwar": "ম্যাচিং ডাস্টি মভ সলিড কাপড়",
            "dupatta": "মভ ফ্লোরাল প্রিন্ট, সূক্ষ্ম টেক্সচার ও ট্যাসেল",
            "stitching": "আনস্টিচড বাটিক সেট"
        }
    },
    {
        "sku": "CAT-004",
        "colId": "03",
        "title": "Forest Elegance",
        "titleBn": "ফরেস্ট এলিগ্যান্স",
        "slug": "forest-elegance",
        "acc": "#3E5E3A",
        "priceBDT": 1850,
        "priceStatus": "reference",
        "unit": "Dress Material",
        "unitBn": "ড্রেস ম্যাটেরিয়াল সেট",
        "cautionBn": "রেফারেন্স মূল্য ৳1,850 — আনস্টিচড ড্রেস ম্যাটেরিয়াল।",
        "cautionEn": "Reference price ৳1,850 — dress materials shown.",
        "descriptionBn": "মাটির রঙের উষ্ণতা ও ফরেস্ট গ্রিনের গভীরতা মিলেছে বোটানিক্যাল বাটিক-অনুপ্রাণিত নকশায়। ড্রেস ম্যাটেরিয়ালের সঙ্গে বাদামি সলিড কাপড় ও সবুজ গ্রেডিয়েন্ট ওড়নার পাতার ছাপ এবং ট্যাসেল পুরো লুকে আনে প্রাকৃতিক আবহ।",
        "descriptionEn": "Earthy brown and forest green botanical print dress material with solid brown bottom and cream-leaf green gradient dupatta.",
        "details": {
            "kameez": "আর্থি ব্রাউন ও ফরেস্ট গ্রিন বোটানিক্যাল প্রিন্ট",
            "salwar": "সলিড ব্রাউন কাপড়",
            "dupatta": "সবুজ গ্রেডিয়েন্ট ওড়না, ক্রিম বোটানিক্যাল ছাপ",
            "stitching": "ড্রেস ম্যাটেরিয়াল"
        }
    },
    {
        "sku": "CAT-005",
        "colId": "03",
        "title": "Fuchsia Noir",
        "titleBn": "ফুশিয়া নোয়ার",
        "slug": "fuchsia-noir",
        "acc": "#B0326E",
        "priceBDT": 1700,
        "priceStatus": "reference",
        "unit": "Dress Material",
        "unitBn": "ড্রেস ম্যাটেরিয়াল সেট",
        "cautionBn": "রেফারেন্স মূল্য ৳1,700 — অর্ডারের আগে স্টক নিশ্চিত করুন।",
        "cautionEn": "Reference price ৳1,700 — confirm stock on inquiry.",
        "descriptionBn": "তীক্ষ্ণ ফুশিয়া-পিংক ও চারকোলের ড্রামাটিক কনট্রাস্টে নজরকাড়া বাটিক থ্রি-পিস ম্যাটেরিয়াল। কামিজের ওপর গোলাপি ও সাদা ফুলেল ছাপ, সঙ্গে সলিড ফুশিয়া কাপড় এবং গাঢ় থেকে উজ্জ্বল রঙে পরিবর্তিত ওড়না।",
        "descriptionEn": "Dramatic fuchsia-pink and charcoal batik-style dress material with floral motifs, solid fuchsia bottom, and gradient dupatta.",
        "details": {
            "kameez": "চারকোল/কালো বেসে ফুশিয়া ও সাদা ফ্লোরাল প্রিন্ট",
            "salwar": "উজ্জ্বল ফুশিয়া সলিড কাপড়",
            "dupatta": "ফুশিয়া-চারকোল গ্রেডিয়েন্ট ও ফুলের মোটিফ",
            "stitching": "ড্রেস ম্যাটেরিয়াল"
        }
    },
    {
        "sku": "CAT-006",
        "colId": "03",
        "title": "Mustard Noir",
        "titleBn": "মাস্টার্ড নোয়ার",
        "slug": "mustard-noir",
        "acc": "#C0912F",
        "priceBDT": 1650,
        "priceStatus": "reference",
        "unit": "Dress Material",
        "unitBn": "ড্রেস ম্যাটেরিয়াল সেট",
        "cautionBn": "রেফারেন্স মূল্য ৳1,650 — অর্ডারের আগে নিশ্চিত করুন।",
        "cautionEn": "Reference price ৳1,650 — confirm with seller.",
        "descriptionBn": "উজ্জ্বল মাস্টার্ড ও গাঢ় চারকোলের দুই-টোন প্যালেটে ক্লাসিক বাটিক ঘরানার নকশা। ছোট বোটানিক্যাল রিপিট প্রিন্টের সঙ্গে সলিড হলুদ কাপড় ও গ্রেডিয়েন্ট ওড়না।",
        "descriptionEn": "Two-tone mustard yellow and deep charcoal botanical repeat dress material with solid mustard bottom and gradient dupatta.",
        "details": {
            "kameez": "চারকোল বেসে মাস্টার্ড বোটানিক্যাল রিপিট",
            "salwar": "সলিড মাস্টার্ড হলুদ কাপড়",
            "dupatta": "হলুদ-চারকোল গ্রেডিয়েন্ট ওড়না",
            "stitching": "ড্রেস ম্যাটেরিয়াল"
        }
    },
    {
        "sku": "CAT-007",
        "colId": "03",
        "title": "Burgundy Sunset",
        "titleBn": "বারগান্ডি সানসেট",
        "slug": "burgundy-sunset",
        "acc": "#7E2F3C",
        "priceBDT": 1750,
        "priceStatus": "reference",
        "unit": "Dress Material",
        "unitBn": "ড্রেস ম্যাটেরিয়াল সেট",
        "cautionBn": "রেফারেন্স মূল্য ৳1,750 — অর্ডারের আগে নিশ্চিত করুন।",
        "cautionEn": "Reference price ৳1,750 — confirm with seller.",
        "descriptionBn": "বারগান্ডি ও সানসেট-মাস্টার্ডের উষ্ণ মেলবন্ধনে ব্যতিক্রমী টাই-ডাই অনুপ্রাণিত ড্রেস ম্যাটেরিয়াল। গোলাকার বাটিক স্ট্যাম্পের মতো মোটিফ ও রঙিন ওড়না।",
        "descriptionEn": "Warm burgundy and sunset-mustard tie-dye inspired dress material with circular motifs and gradient dupatta.",
        "details": {
            "kameez": "গাঢ় বারগান্ডি বেসে মাস্টার্ড বৃত্তাকার মোটিফ",
            "salwar": "ম্যাচিং কাপড় (যাচাই সাপেক্ষ)",
            "dupatta": "বারগান্ডি-মাস্টার্ড টাই-ডাই ওড়না",
            "stitching": "ড্রেস ম্যাটেরিয়াল"
        }
    },
    {
        "sku": "CAT-008",
        "colId": "04",
        "title": "Navy Royal Bloom",
        "titleBn": "নেভি রয়্যাল ব্লুম",
        "slug": "navy-royal-bloom",
        "acc": "#2C4470",
        "priceBDT": 1750,
        "priceStatus": "reference",
        "unit": "Unstitched 3-Piece",
        "unitBn": "আনস্টিচড সুইস লন থ্রি-পিস",
        "cautionBn": "ক্যাটালগ রেফারেন্স মূল্য ৳1,750 — সুইস লন ডিজিটাল প্রিন্ট।",
        "cautionEn": "Catalog reference price ৳1,750 — unstitched Swiss lawn.",
        "descriptionBn": "গভীর নেভি ব্লু বেসে সাদা অলঙ্করণধর্মী কেন্দ্রীয় নকশা এবং উষ্ণ বর্ডারের ক্লাসিক কনট্রাস্ট। হলুদ ফুলেল ওড়না ও গাঢ় সলিড কাপড়ের আনস্টিচড থ্রি-পিস।",
        "descriptionEn": "Deep navy blue unstitched Swiss lawn three-piece with white ornamental panel, solid dark bottom, and yellow floral dupatta.",
        "details": {
            "kameez": "নেভিতে সাদা অর্নামেন্টাল প্যানেল ও বর্ডার",
            "salwar": "সলিড গাঢ় নেভি কাপড়",
            "dupatta": "হলুদ ফুল ও গাঢ় বর্ডারযুক্ত ওড়না",
            "stitching": "আনস্টিচড (Unstitched)"
        }
    },
    {
        "sku": "CAT-009",
        "colId": "04",
        "title": "Autumn Floral Elegance",
        "titleBn": "অটাম ফ্লোরাল এলিগ্যান্স",
        "slug": "autumn-floral-elegance",
        "acc": "#B4652F",
        "priceBDT": 1700,
        "priceStatus": "reference",
        "unit": "Unstitched 3-Piece",
        "unitBn": "আনস্টিচড সুইস লন থ্রি-পিস",
        "cautionBn": "রেফারেন্স মূল্য ৳1,700 — অর্ডারের আগে নিশ্চিত করুন।",
        "cautionEn": "Reference price ৳1,700 — confirm with seller.",
        "descriptionBn": "হালকা স্টোন-বেইজ বেসে শরতের ফুলের প্রিন্ট ও মাঝখানে সরু মাস্টার্ড প্যানেল। রাস্ট সলিড কাপড় এবং বহুরঙা ফ্লোরাল-বর্ডার ওড়নার আনস্টিচড সেট।",
        "descriptionEn": "Stone-beige autumn floral unstitched Swiss lawn three-piece with mustard center panel, rust solid bottom, and multicolor dupatta.",
        "details": {
            "kameez": "স্টোন-বেইজে ছোট ফুল ও মাস্টার্ড প্যানেল",
            "salwar": "সলিড রাস্ট/ব্রাউন কাপড়",
            "dupatta": "ফুলেল প্রিন্ট ও অর্নামেন্টাল বর্ডার",
            "stitching": "আনস্টিচড (Unstitched)"
        }
    },
    {
        "sku": "CAT-010",
        "colId": "04",
        "title": "Midnight Teal Heritage",
        "titleBn": "মিডনাইট টিল হেরিটেজ",
        "slug": "midnight-teal-heritage",
        "acc": "#1F4E4A",
        "priceBDT": 1650,
        "priceStatus": "reference",
        "unit": "Unstitched 3-Piece",
        "unitBn": "আনস্টিচড সুইস লন থ্রি-পিস",
        "cautionBn": "রেফারেন্স মূল্য ৳1,650 — সুইস লন প্রিন্ট।",
        "cautionEn": "Reference price ৳1,650 — unstitched Swiss lawn.",
        "descriptionBn": "ডার্ক প্লাম-চারকোল বেসে লম্বালম্বি হেরিটেজ মেডেলিয়ন ও জ্যামিতিক নকশা। অ্যাকোয়া-টিল সলিড কাপড় এবং গাঢ় অর্নামেন্টাল প্রিন্টের ওড়না।",
        "descriptionEn": "Dark plum-charcoal unstitched Swiss lawn featuring vertical heritage medallions, aqua-teal bottom, and paisley-bordered dupatta.",
        "details": {
            "kameez": "ডার্ক প্লাম-চারকোলে উল্লম্ব মেডেলিয়ন প্রিন্ট",
            "salwar": "সলিড অ্যাকোয়া-টিল কাপড়",
            "dupatta": "গাঢ় রঙে অর্নামেন্টাল ও পেইসলি বর্ডার",
            "stitching": "আনস্টিচড (Unstitched)"
        }
    },
    {
        "sku": "CAT-011",
        "colId": "04",
        "title": "Olive Garden Bloom",
        "titleBn": "অলিভ গার্ডেন ব্লুম",
        "slug": "olive-garden-bloom",
        "acc": "#6B6B33",
        "priceBDT": 1850,
        "priceStatus": "reference",
        "unit": "Unstitched 3-Piece",
        "unitBn": "আনস্টিচড সুইস লন থ্রি-পিস",
        "cautionBn": "রেফারেন্স মূল্য ৳1,850 — অর্ডারের আগে নিশ্চিত করুন।",
        "cautionEn": "Reference price ৳1,850 — confirm with seller.",
        "descriptionBn": "অলিভ গ্রিন বেসের ওপর ছড়িয়ে থাকা রঙিন ফুলের বুকে একটি শান্ত, প্রাকৃতিক স্টাইল। স্ট্রাইপ ও বড় ফ্লোরাল ওড়নার সঙ্গে ডিপ গ্রিন সলিড কাপড়।",
        "descriptionEn": "Olive green unstitched Swiss lawn scattered with vibrant floral bouquets, deep green solid bottom, and striped floral dupatta.",
        "details": {
            "kameez": "অলিভ গ্রিনে রঙিন ফুলের বুকে",
            "salwar": "সলিড ডিপ গ্রিন কাপড়",
            "dupatta": "হালকা স্ট্রাইপ ও বড় ফুলের ওড়না",
            "stitching": "আনস্টিচড (Unstitched)"
        }
    },
    {
        "sku": "CAT-012",
        "colId": "04",
        "title": "Coral Geometric Bloom",
        "titleBn": "কোরাল জিওমেট্রিক ব্লুম",
        "slug": "coral-geometric-bloom",
        "acc": "#D06A4E",
        "priceBDT": 1800,
        "priceStatus": "reference",
        "unit": "Unstitched 3-Piece",
        "unitBn": "আনস্টিচড সুইস লন থ্রি-পিস",
        "cautionBn": "রেফারেন্স মূল্য ৳1,800 — সুইস লন প্রিন্ট।",
        "cautionEn": "Reference price ৳1,800 — unstitched Swiss lawn.",
        "descriptionBn": "কোরাল-পিংক বেসে ট্রায়াঙ্গেল ও হেক্সাগোনাল জ্যামিতিক প্রিন্টের আধুনিক কম্বিনেশন। সলিড কোরাল কাপড় ও জ্যামিতিক বর্ডারের ওড়না।",
        "descriptionEn": "Coral-pink unstitched Swiss lawn with triangle and hexagonal geometric prints, solid coral bottom, and floral-geometric dupatta.",
        "details": {
            "kameez": "কোরাল-পিংক ত্রিভুজ ও হেক্সাগোনাল মোটিফ",
            "salwar": "সলিড কোরাল-পিংক কাপড়",
            "dupatta": "ফ্লোরাল ও জ্যামিতিক বর্ডারসহ ওড়না",
            "stitching": "আনস্টিচড (Unstitched)"
        }
    },
    {
        "sku": "CAT-013",
        "colId": "04",
        "title": "Crimson Floral Mosaic",
        "titleBn": "ক্রিমসন ফ্লোরাল মোজাইক",
        "slug": "crimson-floral-mosaic",
        "acc": "#9E2B33",
        "priceBDT": 1650,
        "priceStatus": "reference",
        "unit": "Unstitched 3-Piece",
        "unitBn": "আনস্টিচড সুইস লন থ্রি-পিস",
        "cautionBn": "রেফারেন্স মূল্য ৳1,650 — অর্ডারের আগে নিশ্চিত করুন।",
        "cautionEn": "Reference price ৳1,650 — confirm with seller.",
        "descriptionBn": "গাঢ় চারকোল বেসে ক্রিমসন কেন্দ্রীয় প্যানেল ও ছোট বহুরঙা ফুলের নকশা। মভ-গ্রে ফ্লোরাল ওড়না এবং টোপ সলিড কাপড়ের আনস্টিচড থ্রি-পিস।",
        "descriptionEn": "Charcoal unstitched Swiss lawn with crimson center panel, multicolor mini florals, taupe bottom, and mauve-grey dupatta.",
        "details": {
            "kameez": "চারকোলে লাল কেন্দ্রীয় প্যানেল ও রঙিন ফুল",
            "salwar": "সলিড টোপ/মোকা কাপড়",
            "dupatta": "মভ-গ্রে ফ্লোরাল প্রিন্ট ও কালো বর্ডার",
            "stitching": "আনস্টিচড (Unstitched)"
        }
    },
    {
        "sku": "CAT-014",
        "colId": "05",
        "title": "Golden Mustard Mirror Elegance",
        "titleBn": "গোল্ডেন মাস্টার্ড মিরর এলিগ্যান্স",
        "slug": "golden-mustard-mirror-elegance",
        "acc": "#C6952B",
        "priceBDT": 2050,
        "priceStatus": "reference",
        "unit": "Cotton 3-Piece",
        "unitBn": "কটন মিরর থ্রি-পিস",
        "cautionBn": "রেফারেন্স মূল্য ৳2,050 — মিরর-ওয়ার্ক ও এমব্রয়ডারি।",
        "cautionEn": "Reference price ৳2,050 — mirror work & embroidery.",
        "descriptionBn": "উজ্জ্বল গোল্ডেন-মাস্টার্ডে ডায়মন্ড গ্রিড এবং আয়নার মতো ঝলমলে অ্যাকসেন্ট। বারগান্ডি প্রিন্টেড সালোয়ার কাপড় ও মাস্টার্ড ওড়নার উৎসবমুখর কনট্রাস্ট।",
        "descriptionEn": "Golden mustard cotton ensemble with diamond grid and mirror-look accents, burgundy patterned bottom, and detailed mustard dupatta.",
        "details": {
            "kameez": "মাস্টার্ডে ডায়মন্ড গ্রিড ও মিরর-লুক অ্যাকসেন্ট",
            "salwar": "বারগান্ডি প্যাটার্নের কাপড়",
            "dupatta": "মাস্টার্ড ও সাদা ফুলেল স্ট্রাইপ ওড়না",
            "stitching": "সাইজ ও ফিট অর্ডারের আগে যাচাই সাপেক্ষ"
        }
    },
    {
        "sku": "CAT-015",
        "colId": "05",
        "title": "Midnight Black Ethnic Charm",
        "titleBn": "মিডনাইট ব্ল্যাক এথনিক চার্ম",
        "slug": "midnight-black-ethnic-charm",
        "acc": "#3A3A44",
        "priceBDT": 2150,
        "priceStatus": "reference",
        "unit": "Cotton 3-Piece",
        "unitBn": "কটন এথনিক থ্রি-পিস",
        "cautionBn": "রেফারেন্স মূল্য ৳2,150 — অর্ডারের আগে নিশ্চিত করুন।",
        "cautionEn": "Reference price ৳2,150 — confirm with seller.",
        "descriptionBn": "গাঢ় ব্ল্যাক-চারকোল বেসে কমলা-লাল জ্যামিতিক চেইন ও নেকলাইনের প্রিন্ট। বারগান্ডি-টু-ব্ল্যাক ওড়না এবং জ্যামিতিক প্যাটার্নের সালোয়ার কাপড়।",
        "descriptionEn": "Midnight black cotton ensemble with orange-red geometric chain print, patterned bottom fabric, and burgundy-black gradient dupatta.",
        "details": {
            "kameez": "কালো বেসে কমলা-লাল জ্যামিতিক চেইন প্রিন্ট",
            "salwar": "কালো-কমলা হেক্সাগোনাল প্যাটার্ন কাপড়",
            "dupatta": "বারগান্ডি-কালো গ্রেডিয়েন্ট ওড়না",
            "stitching": "সাইজ ও ফিট অর্ডারের আগে যাচাই সাপেক্ষ"
        }
    },
    {
        "sku": "CAT-016",
        "colId": "05",
        "title": "Fuchsia Bloom Aqua Delight",
        "titleBn": "ফুশিয়া ব্লুম অ্যাকোয়া ডিলাইট",
        "slug": "fuchsia-bloom-aqua-delight",
        "acc": "#C13B78",
        "priceBDT": 1950,
        "priceStatus": "reference",
        "unit": "Cotton 3-Piece",
        "unitBn": "কটন মিরর থ্রি-পিস",
        "cautionBn": "রেফারেন্স মূল্য ৳1,950 — অর্ডারের আগে নিশ্চিত করুন।",
        "cautionEn": "Reference price ৳1,950 — confirm with seller.",
        "descriptionBn": "ফুশিয়া-পিংকের উজ্জ্বলতায় অ্যাকোয়া রঙের নেকলাইন ও ফ্লোরাল-জ্যামিতিক ছাপ। হালকা অ্যাকোয়া সালোয়ার কাপড় এবং নীল-সাদা বর্ডারের ফুশিয়া ওড়না।",
        "descriptionEn": "Vibrant fuchsia-pink cotton piece with aqua neckline, light aqua printed bottom fabric, and blue-white bordered fuchsia dupatta.",
        "details": {
            "kameez": "ফুশিয়া-পিংকে অ্যাকোয়া নেকলাইন ও মোটিফ",
            "salwar": "হালকা অ্যাকোয়া, ক্ষুদ্র ফুলের ছাপ",
            "dupatta": "ফুশিয়া ওড়না, নীল-সাদা ফুলেল বর্ডার",
            "stitching": "সাইজ ও ফিট অর্ডারের আগে যাচাই সাপেক্ষ"
        }
    },
    {
        "sku": "CAT-017",
        "colId": "05",
        "title": "Electric Blue Mirror Blossom",
        "titleBn": "ইলেকট্রিক ব্লু মিরর ব্লসম",
        "slug": "electric-blue-mirror-blossom",
        "acc": "#2E5FA3",
        "priceBDT": 2250,
        "priceStatus": "reference",
        "unit": "Cotton 3-Piece",
        "unitBn": "কটন মিরর থ্রি-পিস",
        "cautionBn": "রেফারেন্স মূল্য ৳2,250 — মিরর-ওয়ার্ক ও এমব্রয়ডারি।",
        "cautionEn": "Reference price ৳2,250 — mirror work & embroidery.",
        "descriptionBn": "ইলেকট্রিক ব্লু রঙে ডায়মন্ড গ্রিড ও হলুদ মিরর-লুক অ্যাকসেন্ট। নেভি সালোয়ার কাপড় আর নীল-পিংক বর্ডারের আকাশি ওড়নায় সুন্দর কনট্রাস্ট।",
        "descriptionEn": "Electric blue cotton ensemble with diamond grid, mirror-look detailing, navy zigzag bottom fabric, and sky-blue dupatta.",
        "details": {
            "kameez": "ইলেকট্রিক ব্লু, গ্রিড ও মিরর-লুক ডিটেইল",
            "salwar": "নেভিতে হালকা জিগজ্যাগ প্যাটার্ন",
            "dupatta": "আকাশি নীল ওড়না, নীল-পিংক বর্ডার",
            "stitching": "সাইজ ও ফিট অর্ডারের আগে যাচাই সাপেক্ষ"
        }
    },
    {
        "sku": "CAT-018",
        "colId": "05",
        "title": "Sand Beige Floral Grace",
        "titleBn": "স্যান্ড বেইজ ফ্লোরাল গ্রেস",
        "slug": "sand-beige-floral-grace",
        "acc": "#B99C74",
        "priceBDT": 2450,
        "priceStatus": "reference",
        "unit": "Cotton 3-Piece",
        "unitBn": "কটন ফ্লোরাল থ্রি-পিস",
        "cautionBn": "রেফারেন্স মূল্য ৳2,450 — সূক্ষ্ম ফ্লোরাল ও নেকলাইন বোতাম।",
        "cautionEn": "Reference price ৳2,450 — delicate floral & neckline buttons.",
        "descriptionBn": "হালকা স্যান্ড-বেইজ রঙে সূক্ষ্ম ফুলেল নকশা ও রঙিন নেকলাইন বোতাম। ডিপ পার্পল সালোয়ার কাপড় এবং সাদা লাইনওয়ার্কের বেইজ ওড়না।",
        "descriptionEn": "Sand beige cotton ensemble with delicate floral print, colorful neckline buttons, deep purple patterned bottom, and beige dupatta.",
        "details": {
            "kameez": "স্যান্ড-বেইজে সূক্ষ্ম ফ্লোরাল প্রিন্ট ও বোতাম",
            "salwar": "ডিপ পার্পল অর্নামেন্টাল প্যাটার্ন",
            "dupatta": "বেইজে সূক্ষ্ম সাদা লাইনওয়ার্ক ওড়না",
            "stitching": "সাইজ ও ফিট অর্ডারের আগে যাচাই সাপেক্ষ"
        }
    }
]

ACCESSORY_ITEMS = [
    # 5 Decorative Mirrors (FT-HM-001 to FT-HM-005)
    {
        "sku": "FT-HM-001", "colId": "06", "title": "Lavender Rose", "titleBn": "ল্যাভেন্ডার রোজ",
        "priceBDT": 499, "priceStatus": "suggested", "unit": "per mirror", "unitBn": "প্রতি পিস আয়না",
        "acc": "#8E3B66", "colors": "Lavender / Rose Red / Warm Gold",
        "cautionBn": "১টি ডেকোরেটিভ মিরর; অতিরিক্ত স্ট্যান্ড বা বক্স ছবির কারণে অন্তর্ভুক্ত নয়। রঙ কাস্টমাইজেশন অনুরোধ গ্রহণযোগ্য।",
        "cautionEn": "Price for one decorative mirror. Stand/box not included. Color customization requests welcome.",
        "descriptionBn": "নরম ল্যাভেন্ডার ও রোজ রেডের আকর্ষণীয় সমন্বয়। ফুলের পাপড়ির মতো নকশা করা গোল ফ্রেমটি ব্যক্তিগত ডেকর ও উপহারের জন্য একটি সুন্দর পছন্দ।",
        "descriptionEn": "An ornate round mirror with petal-inspired detailing, made expressive through its signature lavender and rose-red color combination.",
        "details": {"colors": "Lavender / Rose Red / Warm Gold", "designDetail": "Decorative circular mirror with layered petal-inspired frame", "customReq": True}
    },
    {
        "sku": "FT-HM-002", "colId": "06", "title": "Golden Marigold", "titleBn": "গোল্ডেন ম্যারিগোল্ড",
        "priceBDT": 499, "priceStatus": "suggested", "unit": "per mirror", "unitBn": "প্রতি পিস আয়না",
        "acc": "#C6952B", "colors": "Marigold Yellow / Royal Blue / Gold",
        "cautionBn": "১টি ডেকোরেটিভ মিরর; অতিরিক্ত স্ট্যান্ড বা বক্স অন্তর্ভুক্ত নয়। রঙ কাস্টমাইজেশন অনুরোধ গ্রহণযোগ্য।",
        "cautionEn": "Price for one decorative mirror. Stand/box not included. Color customization requests welcome.",
        "descriptionBn": "সূর্যমুখী হলুদ আর রয়্যাল ব্লুর নজরকাড়া কনট্রাস্ট। উজ্জ্বল এই ভ্যারিয়েন্টটি রঙিন সাজসজ্জা ও প্রাণবন্ত গিফটের জন্য বিশেষভাবে মানানসই।",
        "descriptionEn": "An ornate round mirror with petal-inspired detailing in vibrant marigold yellow and royal blue.",
        "details": {"colors": "Marigold Yellow / Royal Blue / Gold", "designDetail": "Decorative circular mirror with layered petal-inspired frame", "customReq": True}
    },
    {
        "sku": "FT-HM-003", "colId": "06", "title": "Crimson Heritage", "titleBn": "ক্রিমসন হেরিটেজ",
        "priceBDT": 499, "priceStatus": "suggested", "unit": "per mirror", "unitBn": "প্রতি পিস আয়না",
        "acc": "#9E2B33", "colors": "Crimson Red / Navy Blue / Natural Gold",
        "cautionBn": "১টি ডেকোরেটিভ মিরর; অতিরিক্ত স্ট্যান্ড বা বক্স অন্তর্ভুক্ত নয়। রঙ কাস্টমাইজেশন অনুরোধ গ্রহণযোগ্য।",
        "cautionEn": "Price for one decorative mirror. Stand/box not included. Color customization requests welcome.",
        "descriptionBn": "ক্রিমসন রেড, ডিপ ব্লু ও উষ্ণ নকশার সমন্বয়ে তৈরি একটি প্রাণবন্ত লুক। ঐতিহ্যবাহী মোটিফের অনুপ্রেরণায় সাজানো আয়নাটি ডেকর কালেকশনে আলাদা আকর্ষণ যোগ করে।",
        "descriptionEn": "An ornate round mirror with petal-inspired detailing in crimson red, navy blue, and natural gold.",
        "details": {"colors": "Crimson Red / Navy Blue / Natural Gold", "designDetail": "Decorative circular mirror with layered petal-inspired frame", "customReq": True}
    },
    {
        "sku": "FT-HM-004", "colId": "06", "title": "Royal Plum", "titleBn": "রয়্যাল প্লাম",
        "priceBDT": 499, "priceStatus": "suggested", "unit": "per mirror", "unitBn": "প্রতি পিস আয়না",
        "acc": "#6B3266", "colors": "Deep Plum / Lavender Purple / Natural Gold",
        "cautionBn": "১টি ডেকোরেটিভ মিরর; অতিরিক্ত স্ট্যান্ড বা বক্স অন্তর্ভুক্ত নয়। রঙ কাস্টমাইজেশন অনুরোধ গ্রহণযোগ্য।",
        "cautionEn": "Price for one decorative mirror. Stand/box not included. Color customization requests welcome.",
        "descriptionBn": "গাঢ় প্লাম-পার্পল রঙের মনোক্রোম আবেদন আর কারুকাজ করা পাপড়ি-নকশা। মিনিমাল কিন্তু অভিজাত সাজসজ্জার জন্য পরিশীলিত একটি ভ্যারিয়েন্ট।",
        "descriptionEn": "An ornate round mirror with petal-inspired detailing in deep plum, lavender purple, and natural gold.",
        "details": {"colors": "Deep Plum / Lavender Purple / Natural Gold", "designDetail": "Decorative circular mirror with layered petal-inspired frame", "customReq": True}
    },
    {
        "sku": "FT-HM-005", "colId": "06", "title": "Teal Bloom", "titleBn": "টিল ব্লুম",
        "priceBDT": 499, "priceStatus": "suggested", "unit": "per mirror", "unitBn": "প্রতি পিস আয়না",
        "acc": "#1F6E63", "colors": "Deep Teal / Golden Yellow / Warm Brown",
        "cautionBn": "১টি ডেকোরেটিভ মিরর; অতিরিক্ত স্ট্যান্ড বা বক্স অন্তর্ভুক্ত নয়। রঙ কাস্টমাইজেশন অনুরোধ গ্রহণযোগ্য।",
        "cautionEn": "Price for one decorative mirror. Stand/box not included. Color customization requests welcome.",
        "descriptionBn": "ডিপ টিল ও গোল্ডেন ইয়েলোর উষ্ণ সংমিশ্রণ। ন্যাচারাল টোনের কারুকাজ এই গোল আয়নাটিকে দেয় আর্টিসান-ইনস্পায়ার্ড একটি স্বতন্ত্র লুক।",
        "descriptionEn": "An ornate round mirror with petal-inspired detailing in deep teal, golden yellow, and warm brown.",
        "details": {"colors": "Deep Teal / Golden Yellow / Warm Brown", "designDetail": "Decorative circular mirror with layered petal-inspired frame", "customReq": True}
    },

    # 19 Pendants & Jewelry (FT-JWL-001 to FT-JWL-019)
    {
        "sku": "FT-JWL-001", "colId": "07", "title": "Indigo Folk Relief Set", "titleBn": "ইন্ডিগো ফোক রিলিফ সেট",
        "priceBDT": 699, "priceStatus": "suggested", "unit": "pictured jewelry grouping", "unitBn": "ছবির ম্যাচিং পিসসহ সেট (যাচাই সাপেক্ষ)",
        "acc": "#2C4470", "colors": "Navy, cobalt blue, aqua, silver-tone",
        "cautionBn": "সতর্কতা: ছবিতে মূল নেকলেসের সঙ্গে ম্যাচিং ছোট অংশ দেখা যাচ্ছে; বিক্রয়যোগ্য সেটে সুনির্দিষ্ট কতটি অংশ থাকবে তা অর্ডারে নিশ্চিত হবে।",
        "cautionEn": "Pictured grouping; seller must confirm which matching pieces are actually included.",
        "descriptionBn": "গাঢ় নীল ফ্রেম, উজ্জ্বল নীল লোকজ মোটিফ এবং নীল পুঁতির সমন্বয়ে তৈরি নজরকাড়া একটি ডিজাইন। ছবিতে মূল নেকলেসের সঙ্গে কয়েকটি ম্যাচিং ছোট অংশ দেখা যাচ্ছে।",
        "descriptionEn": "Blue-on-blue carved-look rectangular pieces give this arrangement a graphic, heritage-inspired appeal.",
        "details": {"colors": "Navy, cobalt blue, aqua, silver-tone", "designDetail": "Rectangular relief-style folk motifs; deep-blue framed pieces; dark cord and blue beads", "setVerify": True}
    },
    {
        "sku": "FT-JWL-002", "colId": "07", "title": "Saffron Folk Relief Set", "titleBn": "স্যাফরন ফোক রিলিফ সেট",
        "priceBDT": 649, "priceStatus": "suggested", "unit": "pictured jewelry grouping", "unitBn": "ছবির ম্যাচিং পিসসহ সেট (যাচাই সাপেক্ষ)",
        "acc": "#D96B27", "colors": "Orange, saffron, ochre, warm gold",
        "cautionBn": "সতর্কতা: ছবিতে মূল পেনড্যান্টের সঙ্গে দুটি ছোট ম্যাচিং অংশ দেখা যাচ্ছে; বিক্রয়যোগ্য সেটে কতটি অংশ থাকবে তা অর্ডারে নিশ্চিত হবে।",
        "cautionEn": "Pictured grouping; seller must confirm which matching pieces are actually included.",
        "descriptionBn": "কমলা, গেরুয়া ও সোনালি আভায় লোকজ নকশার উষ্ণ উপস্থিতি। মূল পেনড্যান্টের সঙ্গে একই ধাঁচের দুটি ছোট ম্যাচিং অংশ ছবিতে রয়েছে।",
        "descriptionEn": "Burnt-orange and ochre tones bring an earthy festive energy to this geometric motif necklace and its two pictured coordinating pieces.",
        "details": {"colors": "Orange, saffron, ochre, warm gold", "designDetail": "Twin raised folk-inspired motifs on a warm rectangular panel", "setVerify": True}
    },
    {
        "sku": "FT-JWL-003", "colId": "07", "title": "Wildflower Bouquet Pendant", "titleBn": "ওয়াইল্ডফ্লাওয়ার বুকেট পেনড্যান্ট",
        "priceBDT": 349, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#C83E3B", "colors": "Yellow, orange-red, green, violet, red",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; ছবির প্রপস অন্তর্ভুক্ত নয়।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "রঙিন ফুল ও সবুজ পাতার স্তরবিন্যাসে ফুটে উঠেছে প্রাণবন্ত একটি বুকেট। লাল পাকানো কর্ড এবং সবুজ-হলুদ পুঁতি নকশাটিকে আরও আকর্ষণীয় করেছে।",
        "descriptionEn": "A playful bouquet of painted floral shapes, layered leaves and a vibrant red cord creates an unmistakable craft-forward statement.",
        "details": {"colors": "Yellow, orange-red, green, violet, red", "designDetail": "Layered multicolor flowers and leaves; red braided cord"}
    },
    {
        "sku": "FT-JWL-004", "colId": "07", "title": "Crimson Mandala Pendant", "titleBn": "ক্রিমসন ম্যান্ডালা পেনড্যান্ট",
        "priceBDT": 349, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#A82436", "colors": "Crimson, pink, green, blue, yellow",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; ছবির প্রপস অন্তর্ভুক্ত নয়।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "গোলাকার লাল ম্যান্ডালা ডিজাইনে ফুলেল নকশা, সবুজ কর্ড এবং নানা রঙের ছোট পুঁতির প্রাণবন্ত মিলন। উৎসবের সাজে এটি হতে পারে আকর্ষণীয় অ্যাকসেন্ট।",
        "descriptionEn": "The round crimson medallion is filled with a bold folk-floral pattern, balanced by a strong green cord and rainbow-like bead accents.",
        "details": {"colors": "Crimson, pink, green, blue, yellow", "designDetail": "Circular painted floral mandala; green braided cord"}
    },
    {
        "sku": "FT-JWL-005", "colId": "07", "title": "Carnival Sunflower Set", "titleBn": "কার্নিভাল সানফ্লাওয়ার সেট",
        "priceBDT": 699, "priceStatus": "suggested", "unit": "pictured jewelry grouping", "unitBn": "ছবির ম্যাচিং পিসসহ সেট (যাচাই সাপেক্ষ)",
        "acc": "#D1493A", "colors": "Red, yellow, cobalt, white, pink",
        "cautionBn": "সতর্কতা: ছবিতে মূল পেনড্যান্টের সঙ্গে ম্যাচিং কানের দুল ও ছোট অংশ দেখা যাচ্ছে; সেটে কতটি অংশ থাকবে তা অর্ডারে নিশ্চিত হবে।",
        "cautionEn": "Pictured grouping; seller must confirm which matching pieces are actually included.",
        "descriptionBn": "হলুদ, নীল, সাদা, গোলাপি ও লাল পাপড়ির রঙিন বিস্ফোরণে তৈরি ফুলেল ডিজাইন। ছবিতে নেকলেসের সঙ্গে ম্যাচিং ছোট অ্যাকসেসরিজও দেখা যাচ্ছে।",
        "descriptionEn": "A striking burst of vividly colored petals surrounds the textured red floral center; matching smaller accessories are visible in the photograph.",
        "details": {"colors": "Red, yellow, cobalt, white, pink", "designDetail": "Layered sunflower-like multicolor petals; matching earrings pictured", "setVerify": True}
    },
    {
        "sku": "FT-JWL-006", "colId": "07", "title": "Scarlet Blossom Pendant", "titleBn": "স্কারলেট ব্লসম পেনড্যান্ট",
        "priceBDT": 349, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#C62828", "colors": "Scarlet red, emerald, pink, beige",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; ছবির প্রপস অন্তর্ভুক্ত নয়।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "পাঁচটি লাল পাপড়ি, সবুজ পাতার ডিটেইলস এবং মাঝের সর্পিল নকশায় তৈরি ফুলেল পেনড্যান্ট। রঙিন পুঁতির সঙ্গে সহজেই মানাবে একরঙা পোশাকে।",
        "descriptionEn": "A bold scarlet flower with green leaves and a delicate spiral center adds an artisanal accent to a simple outfit.",
        "details": {"colors": "Scarlet red, emerald, pink, beige", "designDetail": "Five large red petals around a spiral floral center; green leaves"}
    },
    {
        "sku": "FT-JWL-007", "colId": "07", "title": "Paisley Folk Drop", "titleBn": "পেইসলি ফোক ড্রপ",
        "priceBDT": 399, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#A83B2E", "colors": "Brick red, yellow, aqua, navy, orange",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; ছবির প্রপস অন্তর্ভুক্ত নয়।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "বড় টিয়ারড্রপ আকৃতিতে একের পর এক রঙিন লোকজ নকশা ও জ্যামিতিক বর্ডার। উজ্জ্বল লাল কর্ড নকশার গভীরতা বাড়িয়েছে।",
        "descriptionEn": "A large teardrop pendant celebrates folk ornamentation through rhythmic painted swirls, geometric borders and jewel-toned highlights.",
        "details": {"colors": "Brick red, yellow, aqua, navy, orange", "designDetail": "Oversized teardrop/paisley silhouette; red rope cord"}
    },
    {
        "sku": "FT-JWL-008", "colId": "07", "title": "Golden Jasmine Garland", "titleBn": "গোল্ডেন জ্যাসমিন গারল্যান্ড",
        "priceBDT": 349, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#D19A24", "colors": "Sunshine yellow, ivory white, leafy green",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; ছবির প্রপস অন্তর্ভুক্ত নয়।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "হলুদ ফুলের সারি, সাদা ফুলের কেন্দ্র এবং সবুজ পাতার সাজে নরম অথচ উজ্জ্বল একটি গারল্যান্ড-লুক পেনড্যান্ট।",
        "descriptionEn": "A cheerful row of yellow blooms with white centers evokes a floral garland and pairs naturally with light summer and festive styling.",
        "details": {"colors": "Sunshine yellow, ivory white, leafy green", "designDetail": "Linked yellow flowers with white raised-looking centers; leaf cluster"}
    },
    {
        "sku": "FT-JWL-009", "colId": "07", "title": "Ruby Sunburst Pendant", "titleBn": "রুবি সানবার্স্ট পেনড্যান্ট",
        "priceBDT": 329, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#9E2448", "colors": "Ruby, magenta, gold yellow",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; ছবির প্রপস অন্তর্ভুক্ত নয়।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "লালচে-ম্যাজেন্টা ওপেনওয়ার্ক সূর্যরশ্মির ডিজাইন, মাঝখানে হলুদ কেন্দ্র এবং পুঁতির ডিটেইলস — একটি উৎসবমুখর স্টেটমেন্ট পিস।",
        "descriptionEn": "The open-cut starburst silhouette and dotted golden highlights give this pendant a striking artisanal, festive finish.",
        "details": {"colors": "Ruby, magenta, gold yellow", "designDetail": "Symmetric openwork sunburst mandala; round yellow center"}
    },
    {
        "sku": "FT-JWL-010", "colId": "07", "title": "Heritage Rickshaw Pendant", "titleBn": "হেরিটেজ রিকশা পেনড্যান্ট",
        "priceBDT": 449, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#1F6E43", "colors": "Forest green, orange, yellow, blue, red",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; ছবির প্রপস অন্তর্ভুক্ত নয়।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "সবুজ আয়তাকার পেনড্যান্টে রঙিন রিকশার লোকশিল্পধর্মী নকশা — বাংলাদেশি ঐতিহ্যকে প্রকাশ করে এমন একটি নজরকাড়া অ্যাকসেসরি।",
        "descriptionEn": "A miniature folk-art rickshaw scene brings a distinctly Bangladeshi cultural motif into an expressive handmade-style necklace.",
        "details": {"colors": "Forest green, orange, yellow, blue, red", "designDetail": "Rectangular panel with a colorful decorated cycle-rickshaw motif"}
    },
    {
        "sku": "FT-JWL-011", "colId": "07", "title": "Azure Lace Square", "titleBn": "আজুর লেস স্কয়ার",
        "priceBDT": 359, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#3A7CA8", "colors": "Ivory white, sky blue, pale aqua",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; ছবির প্রপস অন্তর্ভুক্ত নয়।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "সাদা বর্গাকার ফ্রেমের চারপাশে আকাশি ফুলেল কাটওয়ার্ক এবং নীল-সাদা পুঁতির পরিচ্ছন্ন কম্বিনেশন।",
        "descriptionEn": "An airy white square border with blue floral accents offers a delicate geometric alternative to bold multicolor pieces.",
        "details": {"colors": "Ivory white, sky blue, pale aqua", "designDetail": "Square lacy floral openwork frame; sky-blue and white beads"}
    },
    {
        "sku": "FT-JWL-012", "colId": "07", "title": "Kaleido Mirror Bloom", "titleBn": "ক্যালাইডো মিরর ব্লুম",
        "priceBDT": 399, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#2B8E9E", "colors": "Aqua, blue, orange, yellow, white",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; কেন্দ্রীয় আয়নার উপাদান বিক্রেতার সাথে যাচাই সাপেক্ষ।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "ছোট ছোট রঙিন ফুলের চারপাশে একটি চকচকে কেন্দ্র এবং দীর্ঘ রঙিন পুঁতির স্ট্র্যান্ড।",
        "descriptionEn": "Tiny flower shapes create a kaleidoscopic frame around a shiny central accent, with a bright multicolor bead arrangement.",
        "details": {"colors": "Aqua, blue, orange, yellow, white", "designDetail": "Multicolored flower-like surround framing a small reflective-looking center"}
    },
    {
        "sku": "FT-JWL-013", "colId": "07", "title": "Turquoise Pinwheel", "titleBn": "টারকোয়েজ পিনহুইল",
        "priceBDT": 389, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#1F8A8C", "colors": "Turquoise, teal, burgundy, gold",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; ছবির প্রপস অন্তর্ভুক্ত নয়।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "টারকোয়েজ রঙের কৌণিক পিনহুইল মোটিফ, সোনালি বর্ডার এবং লাল-নীল পুঁতির মেলবন্ধনে আধুনিক ও শৈল্পিক নকশা।",
        "descriptionEn": "The striking angular turquoise pinwheel delivers a contemporary graphic statement with subtle hand-finished character.",
        "details": {"colors": "Turquoise, teal, burgundy, gold", "designDetail": "Angular pinwheel/sunray motif with gold-toned outlines"}
    },
    {
        "sku": "FT-JWL-014", "colId": "07", "title": "Violet Garden Medallion", "titleBn": "ভায়োলেট গার্ডেন মেডেলিয়ন",
        "priceBDT": 379, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#6B3A8E", "colors": "Violet, lilac, plum, pale pink",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; ছবির প্রপস অন্তর্ভুক্ত নয়।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "গাঢ় বেগুনি ফ্রেমের চারপাশে হালকা লাইলাক ফুল এবং বেগুনি পুঁতির সমন্বয়ে কোমল ও মার্জিত পেনড্যান্ট।",
        "descriptionEn": "Soft lilac blooms surround a rich violet ornamental frame, creating a quieter, romantic counterpoint to the brighter designs.",
        "details": {"colors": "Violet, lilac, plum, pale pink", "designDetail": "Layered dark-violet ornamental medallion and small lilac flowers"}
    },
    {
        "sku": "FT-JWL-015", "colId": "07", "title": "Cocoa Crosshatch Pendant", "titleBn": "কোকো ক্রসহ্যাচ পেনড্যান্ট",
        "priceBDT": 299, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#6E4428", "colors": "Cocoa brown, ivory, espresso",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; ছবির প্রপস অন্তর্ভুক্ত নয়।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "বাদামি আর্চ আকৃতির পেনড্যান্টে সাদা ক্রস-হ্যাচ প্যাটার্ন এবং বাদামি-ক্রিম পুঁতির স্নিগ্ধ সমন্বয়।",
        "descriptionEn": "Minimal brown-and-ivory graphic strokes turn a simple arched silhouette into an earthy, versatile accessory.",
        "details": {"colors": "Cocoa brown, ivory, espresso", "designDetail": "Arched brown pendant marked with white crosshatch strokes"}
    },
    {
        "sku": "FT-JWL-016", "colId": "07", "title": "Spring Leaf Pendant", "titleBn": "স্প্রিং লিফ পেনড্যান্ট",
        "priceBDT": 329, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#3E8E4E", "colors": "Ivory white, spring green, yellow, red",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; ছবির প্রপস অন্তর্ভুক্ত নয়।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "সাদা পাতার আকৃতিতে সবুজ শিরা ও ছোট ছোট রঙিন বিন্দুর শৈল্পিক কাজ। নরম রঙের পুঁতিতে এসেছে সতেজ অনুভূতি।",
        "descriptionEn": "A leaf-inspired silhouette is accented with fresh green veins and lively dots, giving the pendant a light botanical mood.",
        "details": {"colors": "Ivory white, spring green, yellow, red", "designDetail": "White maple-like leaf silhouette with green veins and speckles"}
    },
    {
        "sku": "FT-JWL-017", "colId": "07", "title": "Midnight Shell Fringe", "titleBn": "মিডনাইট শেল ফ্রিঞ্জ",
        "priceBDT": 379, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#242220", "colors": "Black, ivory white, silver-tone, dusty red",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; ছবির প্রপস অন্তর্ভুক্ত নয়।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "কালো ত্রিভুজাকৃতি পেনড্যান্টে সাদা ফুল এবং নিচে ঝুলন্ত সাদা শাঁসের মতো অলংকার। কালো-সাদার কনট্রাস্ট তৈরি করেছে স্বতন্ত্র লুক।",
        "descriptionEn": "A black triangular canvas and a single white flower create a striking contrast, finished with dangling white shell-like pieces.",
        "details": {"colors": "Black, ivory white, silver-tone, dusty red", "designDetail": "Black inverted triangular pendant with white flower and hanging charms"}
    },
    {
        "sku": "FT-JWL-018", "colId": "07", "title": "Aqua Daisy Bloom", "titleBn": "অ্যাকুয়া ডেইজি ব্লুম",
        "priceBDT": 349, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#249A9E", "colors": "Aqua, turquoise, lime, wine red",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; ছবির প্রপস অন্তর্ভুক্ত নয়।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "অ্যাকুয়া-টারকোয়েজ পাপড়ির ওপর সবুজ তুলির টান এবং মাঝখানে সর্পিল নকশায় তৈরি সতেজ ফুলেল পেনড্যান্ট।",
        "descriptionEn": "Painterly turquoise petals with green-tinted strokes lend this floral pendant a contemporary artsy appeal.",
        "details": {"colors": "Aqua, turquoise, lime, wine red", "designDetail": "Broad aqua flower petals with green brush strokes and spiral center"}
    },
    {
        "sku": "FT-JWL-019", "colId": "07", "title": "Marigold Sunflower Pendant", "titleBn": "ম্যারিগোল্ড সানফ্লাওয়ার পেনড্যান্ট",
        "priceBDT": 329, "priceStatus": "suggested", "unit": "1 pendant necklace", "unitBn": "১টি পেনড্যান্ট নেকলেস",
        "acc": "#D98A1E", "colors": "Marigold yellow, orange, white, ruby red",
        "cautionBn": "১টি পেনড্যান্ট নেকলেস; ছবির প্রপস অন্তর্ভুক্ত নয়।",
        "cautionEn": "One pendant necklace; photo props not included.",
        "descriptionBn": "হলুদ-সাদা ফুলের পাপড়িতে কমলা-লাল রঙের আভা। উজ্জ্বল পুঁতির সঙ্গে তৈরি হয়েছে আনন্দময় ফুলেল ডিজাইন।",
        "descriptionEn": "A joyful flower silhouette in sunny yellow, warm orange and cream makes this pendant an easy finishing touch for a festive look.",
        "details": {"colors": "Marigold yellow, orange, white, ruby red", "designDetail": "Yellow-white open flower silhouette with orange-red painted accents"}
    },

    # 11 Bangles & Accessories (FT-BA-001 to FT-BA-011)
    {
        "sku": "FT-BA-001", "colId": "08", "title": "Painted Bangle Harmony Selection", "titleBn": "রঙিন হ্যান্ড-পেইন্টেড চুড়ি",
        "priceBDT": 219, "priceStatus": "suggested", "unit": "per bangle", "unitBn": "প্রতি ১টি পছন্দের চুড়ি (পুরো ছবি নয়)",
        "acc": "#2C4470", "colors": "Navy, orange, ivory, pink, red, cobalt",
        "cautionBn": "সতর্কতা: প্রস্তাবিত মূল্য কেবল ১টি পছন্দের রঙের চুড়ির জন্য; ছবিতে দেখানো সবগুলো রঙ একসঙ্গে বান্ডেল সেট নয়।",
        "cautionEn": "Price per ONE selected bangle/colorway; multiple pictured colors are not a bundled set.",
        "descriptionBn": "ভিন্ন ভিন্ন রঙের হাতে আঁকা ফুল, পাতা ও রাতের আকাশের মোটিফ। নিজের স্টাইল অনুযায়ী একটি বা একাধিক ডিজাইন বেছে নেওয়ার জন্য।",
        "descriptionEn": "An expressive selection of colorful motif-painted bangles that brightens everyday styling.",
        "details": {"colors": "Navy, orange, ivory, pink, red, cobalt", "designDetail": "Painted floral and night-sky motifs; mixed colorways", "setVerify": True}
    },
    {
        "sku": "FT-BA-002", "colId": "08", "title": "Noir Silver-Tone Bead Bangles", "titleBn": "নোয়ার সিলভার-টোন বিড চুড়ি",
        "priceBDT": 479, "priceStatus": "suggested", "unit": "pair of 2 bangles", "unitBn": "২ পিস চুড়ির জোড়া",
        "acc": "#282624", "colors": "Black, sand, silver tone",
        "cautionBn": "প্রস্তাবিত মূল্য ছবির ২টি বালার জোড়ার জন্য; সাইজ ও স্টক অর্ডারের আগে নিশ্চিত করুন।",
        "cautionEn": "Price per pictured TWO-bangle pair; confirm size/color/availability.",
        "descriptionBn": "কালো-স্যান্ড প্যাটার্নের সঙ্গে সিলভার-টোন পুঁতির সারি। একরঙা শাড়ি, কুর্তি বা সন্ধ্যার সাজে নজরকাড়া কনট্রাস্ট।",
        "descriptionEn": "Graphic black patterned bangles with metallic-looking bead trims.",
        "details": {"colors": "Black, sand, silver tone", "designDetail": "Black patterned textile-look bands; silver-tone round beads"}
    },
    {
        "sku": "FT-BA-003", "colId": "08", "title": "Sunburst Folk Accent Bangle", "titleBn": "সানবার্স্ট ফোক অ্যাকসেন্ট বালা",
        "priceBDT": 449, "priceStatus": "suggested", "unit": "per bangle", "unitBn": "১টি বালা (পাশের অলংকার অন্তর্ভুক্ত নয়)",
        "acc": "#D96424", "colors": "Orange, pink, green, yellow, cobalt",
        "cautionBn": "সতর্কতা: প্রস্তাবিত মূল্য কেবল ১টি কমলা বালার জন্য। ছবির পাশে থাকা গোল লোকজ অলংকারটি স্টাইলিং প্রপ মাত্র।",
        "cautionEn": "Price per ONE bangle. Separate round ornament pictured is only a styling prop.",
        "descriptionBn": "কমলা রঙের কারুকাজ করা মোটা বালা। উৎসবের পোশাকে উজ্জ্বল ফোক-আর্ট লুক এনে দেয়।",
        "descriptionEn": "An intricate orange statement bangle pictured beside a coordinating round folk-art accent.",
        "details": {"colors": "Orange, pink, green, yellow, cobalt", "designDetail": "Orange cutwork bangle with painted floral accent shown separately", "setVerify": True}
    },
    {
        "sku": "FT-BA-004", "colId": "08", "title": "Blush Beaded Stitch Trio", "titleBn": "ব্লাশ বিডেড স্টিচ ট্রায়ো",
        "priceBDT": 549, "priceStatus": "suggested", "unit": "3 pictured", "unitBn": "৩ পিস চুড়ির সেট",
        "acc": "#D07A84", "colors": "Peach, blush pink, mint, red",
        "cautionBn": "প্রস্তাবিত মূল্য ছবির ৩টি চুড়ির সেটের জন্য; সাইজ ও স্টক নিশ্চিত করুন।",
        "cautionEn": "Price per pictured THREE-bangle set; confirm size/color/availability.",
        "descriptionBn": "পিচ ও প্যাস্টেল পিঙ্ক সুতা-মোড়ানো চুড়িতে রঙিন স্টিচ আর ছোট পুঁতির গুচ্ছ। সফট ফেমিনিন লুকের জন্য।",
        "descriptionEn": "Pastel thread-look bangles with stitched lines and cheerful bead accents.",
        "details": {"colors": "Peach, blush pink, mint, red", "designDetail": "Pastel fabric-wrapped bands with colorful stitch and bead clusters"}
    },
    {
        "sku": "FT-BA-005", "colId": "08", "title": "Color Pop Stitch Trio", "titleBn": "কালার পপ স্টিচ ট্রায়ো",
        "priceBDT": 549, "priceStatus": "suggested", "unit": "3 pictured", "unitBn": "৩ পিস চুড়ির সেট",
        "acc": "#1F7A78", "colors": "Maroon, turquoise, chartreuse",
        "cautionBn": "প্রস্তাবিত মূল্য ছবির ৩টি চুড়ির সেটের জন্য; সাইজ ও স্টক নিশ্চিত করুন।",
        "cautionEn": "Price per pictured THREE-bangle set; confirm size/color/availability.",
        "descriptionBn": "বারগান্ডি, টারকোয়েজ ও লাইমের প্রাণবন্ত রঙে সেলাই-ডিটেইল ও ছোট ফুলের মতো পুঁতির গুচ্ছ।",
        "descriptionEn": "Three colorful stitched bangles with playful bead flower accents.",
        "details": {"colors": "Maroon, turquoise, chartreuse", "designDetail": "Burgundy, teal, yellow-green bands with stitches and beads"}
    },
    {
        "sku": "FT-BA-006", "colId": "08", "title": "Midnight Bloom Bangles", "titleBn": "মিডনাইট ব্লুম চুড়ি",
        "priceBDT": 599, "priceStatus": "suggested", "unit": "3 pictured", "unitBn": "৩ পিস চুড়ির সেট",
        "acc": "#242220", "colors": "Black, teal, orange, green",
        "cautionBn": "প্রস্তাবিত মূল্য ছবির ৩টি চুড়ির সেটের জন্য; সাইজ ও স্টক নিশ্চিত করুন।",
        "cautionEn": "Price per pictured THREE-bangle set; confirm size/color/availability.",
        "descriptionBn": "কালো বেসের ওপর উজ্জ্বল রঙের স্টিচিং ও পুঁতির ফুল। সাধারণ সাজকেও প্রাণবন্ত করে তুলবে।",
        "descriptionEn": "Dark statement bangles accented with bright stitches and bead clusters.",
        "details": {"colors": "Black, teal, orange, green", "designDetail": "Black fabric look with multicolor stitches and beaded flowers"}
    },
    {
        "sku": "FT-BA-007", "colId": "08", "title": "Daisy Sky Floral Pair", "titleBn": "ডেইজি স্কাই ফ্লোরাল জোড়া",
        "priceBDT": 399, "priceStatus": "suggested", "unit": "2 pictured", "unitBn": "২ পিস চুড়ির জোড়া",
        "acc": "#288EA8", "colors": "Turquoise, royal blue, yellow",
        "cautionBn": "প্রস্তাবিত মূল্য ছবির ২টি চুড়ির জোড়ার জন্য; সাইজ ও স্টক নিশ্চিত করুন।",
        "cautionEn": "Price per pictured TWO-bangle pair; confirm size/color/availability.",
        "descriptionBn": "টারকোয়েজ বেসে নীল ফুল ও হলুদ কেন্দ্রের মিষ্টি ডেইজি মোটিফ। গরমের সাজ আর প্যাস্টেল পোশাকে মানানসই।",
        "descriptionEn": "Two vivid sky-blue floral bangles with cheerful daisy accents.",
        "details": {"colors": "Turquoise, royal blue, yellow", "designDetail": "Turquoise-wide bangles with painted blue daisy motifs"}
    },
    {
        "sku": "FT-BA-008", "colId": "08", "title": "Sunset Bloom Bangles", "titleBn": "সানসেট ব্লুম চুড়ি",
        "priceBDT": 399, "priceStatus": "suggested", "unit": "2 pictured", "unitBn": "২ পিস চুড়ির জোড়া",
        "acc": "#D05A28", "colors": "Burnt orange, coral, violet, yellow",
        "cautionBn": "প্রস্তাবিত মূল্য ছবির ২টি চুড়ির জোড়ার জন্য; সাইজ ও স্টক নিশ্চিত করুন।",
        "cautionEn": "Price per pictured TWO-bangle pair; confirm size/color/availability.",
        "descriptionBn": "বার্ন্ট অরেঞ্জ সুতা-মোড়ানো ডিজাইনে উষ্ণ রঙের স্টিচিং ও পুঁতির ক্লাস্টার।",
        "descriptionEn": "Two warm sunset orange bangles with vivid stitched and bead-flower embellishments.",
        "details": {"colors": "Burnt orange, coral, violet, yellow", "designDetail": "Warm orange stitched bands with multicolor bead clusters"}
    },
    {
        "sku": "FT-BA-009", "colId": "08", "title": "Everyday Thread Luxe Trio", "titleBn": "এভরিডে থ্রেড লাক্স ট্রায়ো",
        "priceBDT": 499, "priceStatus": "suggested", "unit": "3 pictured", "unitBn": "৩ পিস চুড়ির সেট",
        "acc": "#7E3444", "colors": "Peach, teal, burgundy",
        "cautionBn": "প্রস্তাবিত মূল্য ছবির ৩টি চুড়ির সেটের জন্য; সাইজ ও স্টক নিশ্চিত করুন।",
        "cautionEn": "Price per pictured THREE-bangle set; confirm size/color/availability.",
        "descriptionBn": "পিচ, টিল ও বারগান্ডি সুতা-মোড়ানো চুড়ি, ছোট ধাতব-রঙা অলংকারের ডিটেইলসহ।",
        "descriptionEn": "An effortless three-tone thread-wrapped bangle edit with metallic-look details.",
        "details": {"colors": "Peach, teal, burgundy", "designDetail": "Three smooth thread-wrapped bands with metallic-looking accents"}
    },
    {
        "sku": "FT-BA-010", "colId": "08", "title": "Sage Charm Stitch Trio", "titleBn": "সেজ চার্ম স্টিচ ট্রায়ো",
        "priceBDT": 549, "priceStatus": "suggested", "unit": "3 pictured", "unitBn": "৩ পিস চুড়ির সেট",
        "acc": "#5E7C58", "colors": "Sage green, mint, blush, aqua",
        "cautionBn": "প্রস্তাবিত মূল্য ছবির ৩টি চুড়ির সেটের জন্য; সাইজ ও স্টক নিশ্চিত করুন।",
        "cautionEn": "Price per pictured THREE-bangle set; confirm size/color/availability.",
        "descriptionBn": "নরম সবুজ বেসে প্যাস্টেল সেলাই ও রঙিন পুঁতির ছোট অলংকার। কমপ্যাক্ট অথচ দৃশ্যমান ডিটেইল।",
        "descriptionEn": "Muted green stitched bangles with pastel bead clusters for a softer pop of color.",
        "details": {"colors": "Sage green, mint, blush, aqua", "designDetail": "Sage green wrapped bands with light-color stitches and bead flower accents"}
    },
    {
        "sku": "FT-BA-011", "colId": "08", "title": "Carved Flora Colorway Pair", "titleBn": "কার্ভড ফ্লোরা কালারওয়ে জোড়া",
        "priceBDT": 449, "priceStatus": "suggested", "unit": "per pair", "unitBn": "এক রঙের ২ পিস জোড়া (৪ জোড়া নয়)",
        "acc": "#1F6E48", "colors": "Ivory yellow, emerald, cobalt, burgundy",
        "cautionBn": "সতর্কতা: ছবিতে ৪টি আলাদা রঙের জোড়া রয়েছে; প্রস্তাবিত মূল্য কেবল ১টি পছন্দের রঙের জোড়ার (২ পিস) জন্য।",
        "cautionEn": "Price per ONE chosen-color pair (2 bangles). Four colorways pictured; not all included.",
        "descriptionBn": "ফুল ও পাতার কাটওয়ার্ক মোটিফে চারটি আলাদা রঙের জোড়া দেখা যাচ্ছে। পছন্দের এক রঙের জোড়া বেছে নিন।",
        "descriptionEn": "Folk-inspired floral-cutwork bangle pairs offered as pictured color options.",
        "details": {"colors": "Ivory yellow, emerald, cobalt, burgundy", "designDetail": "Four colorways of intricately cut floral and leaf motif pairs", "setVerify": True}
    }
]

# Hotspots definition
HOTSPOTS = {
    "CAT-001": [
        {"x": 35, "y": 28, "titleBn": "নেকলাইন ও প্রিন্ট", "titleEn": "Neckline & Motif", "descBn": "ম্যাজেন্টা-প্লাম ফ্লোরাল ও পেইসলি প্রিন্ট", "descEn": "Magenta-plum floral & paisley print"},
        {"x": 68, "y": 62, "titleBn": "ট্যাসেল ওড়না", "titleEn": "Tasseled Dupatta", "descBn": "ডেকোরেটিভ বর্ডার ও হ্যান্ড-ফিনিশড ট্যাসেল", "descEn": "Decorative border with tasseled finish"}
    ],
    "CAT-002": [
        {"x": 42, "y": 32, "titleBn": "হস্তশিল্প বাটিক ছাপ", "titleEn": "Artisanal Batik", "descBn": "কালো-চারকোল বেসে আইভরি অ্যাবস্ট্রাক্ট বাটিক প্রিন্ট", "descEn": "Charcoal base with ivory abstract batik motif"},
        {"x": 65, "y": 68, "titleBn": "রাস্ট বর্ডার ওড়না", "titleEn": "Rust Border Dupatta", "descBn": "টিল-সবুজ স্ট্রাইপ ও রাস্ট বর্ডারের টাই-ডাই ওড়না", "descEn": "Teal stripe and rust border tie-dye dupatta"}
    ],
    "CAT-008": [
        {"x": 48, "y": 30, "titleBn": "সুইস লন ডিজিটাল প্রিন্ট", "titleEn": "Swiss Lawn Digital", "descBn": "নেভি বেসে সাদা অলঙ্করণধর্মী প্যানেল ও ফুলের প্রিন্ট", "descEn": "Navy ornamental panel with floral accents"}
    ],
    "CAT-014": [
        {"x": 48, "y": 34, "titleBn": "মিরর-লুক অ্যাকসেন্ট", "titleEn": "Mirror-Look Detail", "descBn": "ডায়মন্ড গ্রিডে ঝলমলে মিরর ও এমব্রয়ডারি লুক", "descEn": "Diamond grid with mirror-look detailing"}
    ],
    "FT-HM-001": [
        {"x": 50, "y": 24, "titleBn": "পাপড়ি-নকশা ফ্রেম", "titleEn": "Petal-Inspired Frame", "descBn": "ল্যাভেন্ডার ও রোজ রেড স্তরবিন্যাস (রঙ কাস্টমাইজযোগ্য)", "descEn": "Layered lavender & rose-red petals (color customizable)"}
    ],
    "FT-HM-002": [
        {"x": 50, "y": 24, "titleBn": "সূর্যমুখী নকশা", "titleEn": "Marigold Petals", "descBn": "উজ্জ্বল হলুদ ও রয়্যাল ব্লু কন্ট্রাস্ট", "descEn": "Vivid marigold yellow & royal blue contrast"}
    ],
    "FT-JWL-001": [
        {"x": 46, "y": 55, "titleBn": "ইন্ডিগো রিলিফ কাজ", "titleEn": "Indigo Folk Relief", "descBn": "গাঢ় নীল ফ্রেমের লোকজ মোটিফ ও নীল পুঁতি", "descEn": "Deep blue carved-look folk motifs & beads"}
    ],
    "FT-JWL-010": [
        {"x": 50, "y": 52, "titleBn": "বাংলাদেশি রিকশা মোটিফ", "titleEn": "Bangladeshi Rickshaw Art", "descBn": "হাতে আঁকা রঙিন সাইকেল-রিকশা লোকশিল্প প্যানেল", "descEn": "Hand-painted folk cycle-rickshaw panel"}
    ],
    "FT-BA-001": [
        {"x": 50, "y": 48, "titleBn": "একক চুড়ি নির্বাচন", "titleEn": "Single Bangle Selection", "descBn": "ছবিতে একাধিক রঙ দেখালেও মূল্য প্রতিটি নির্বাচিত চুড়ির জন্য", "descEn": "Price applies per ONE selected colorway bangle"}
    ],
    "FT-BA-004": [
        {"x": 50, "y": 50, "titleBn": "স্টিচ ও বিড ক্লাস্টার", "titleEn": "Stitch & Bead Cluster", "descBn": "সুতা-মোড়ানো চুড়িতে রঙিন স্টিচ ও পুঁতির কারুকাজ", "descEn": "Pastel thread-wrapped bands with colorful beads"}
    ]
}

PAIR_LOOKS = [
    {
        "dressSku": "CAT-001",
        "accSku": "FT-JWL-009",
        "noteBn": "ম্যাজেন্টা-প্লাম থ্রি-পিসের সাথে রুবি সানবার্স্ট পেনড্যান্টের উষ্ণ রাজকীয় সমন্বয়।",
        "noteEn": "Warm ruby-magenta royalty pairing Magenta Plum Three Piece with Ruby Sunburst Pendant."
    },
    {
        "dressSku": "CAT-002",
        "accSku": "FT-HM-005",
        "noteBn": "এমেরাল্ড টিল বাটিকের সাথে টিল ব্লুম ডেকোরেটিভ মিররের শৈল্পিক মেলবন্ধন।",
        "noteEn": "Deep teal & gold tonal pairing between Emerald Teal Batik and Teal Bloom Mirror."
    },
    {
        "dressSku": "CAT-008",
        "accSku": "FT-JWL-001",
        "noteBn": "নেভি রয়্যাল ব্লুম সুইস লনের সাথে ইন্ডিগো ফোক রিলিফ জুয়েলারির ঐতিহ্যবাহী সমন্বিত লুক।",
        "noteEn": "Indigo & cobalt heritage pairing between Navy Royal Bloom and Indigo Folk Relief Set."
    },
    {
        "dressSku": "CAT-014",
        "accSku": "FT-BA-003",
        "noteBn": "গোল্ডেন মাস্টার্ড মিরর থ্রি-পিসের সাথে সানবার্স্ট ফোক অ্যাকসেন্ট বালার উৎসবমুখর স্টাইল।",
        "noteEn": "Festive folk vibrancy pairing Golden Mustard Mirror with Sunburst Folk Accent Bangle."
    },
    {
        "dressSku": "CAT-005",
        "accSku": "FT-JWL-004",
        "noteBn": "ফুশিয়া নোয়ার বাটিকের সাথে ক্রিমসন ম্যান্ডালা পেনড্যান্টের নজরকাড়া রঙের মেলবন্ধন।",
        "noteEn": "Graphic contrast pairing Fuchsia Noir Batik with Crimson Mandala Pendant."
    },
    {
        "dressSku": "CAT-017",
        "accSku": "FT-BA-007",
        "noteBn": "ইলেকট্রিক ব্লু মিরর ব্লসমের সাথে ডেইজি স্কাই ফ্লোরাল চুড়ির সতেজ ও প্রাণবন্ত জোড়।",
        "noteEn": "Fresh summery pairing between Electric Blue Mirror Blossom and Daisy Sky Floral Bangles."
    }
]

# Build products list
PRODUCTS = []

# Process fashion items
for item in FASHION_ITEMS:
    sku = item["sku"]
    col = next(c for c in COLLECTIONS if c["id"] == item["colId"])
    p = {
        "sku": sku,
        "superCategory": "Fashion",
        "colId": item["colId"],
        "collection": col,
        "title": item["title"],
        "titleBn": item["titleBn"],
        "slug": item["slug"],
        "accent": item["acc"],
        "priceBDT": item["priceBDT"],
        "priceStatus": item["priceStatus"],
        "unit": item["unit"],
        "unitBn": item["unitBn"],
        "cautionBn": item["cautionBn"],
        "cautionEn": item["cautionEn"],
        "descriptionBn": item["descriptionBn"],
        "descriptionEn": item["descriptionEn"],
        "details": item["details"],
        "assets": {
            "main": f"assets/products/{sku}/main.webp",
            "original": f"assets/products/{sku}/original.webp",
            "alternate": f"assets/products/{sku}/alternate.webp",
            "socialSquare": f"assets/products/{sku}/socialSquare.webp",
            "storyReel": f"assets/products/{sku}/storyReel.webp",
            "detailA": f"assets/products/{sku}/detailA.webp",
            "detailB": f"assets/products/{sku}/detailB.webp",
            "aiStylingPreview": f"assets/products/{sku}/aiStylingPreview.webp" if os.path.exists(f"assets/products/{sku}/aiStylingPreview.webp") else None
        },
        "sourceRef": f"Brand Book 2026 / Studio Photography Reference ({sku})"
    }
    PRODUCTS.append(p)

# Process accessory items
for item in ACCESSORY_ITEMS:
    sku = item["sku"]
    col = next(c for c in COLLECTIONS if c["id"] == item["colId"])
    p = {
        "sku": sku,
        "superCategory": "Accessories",
        "colId": item["colId"],
        "collection": col,
        "title": item["title"],
        "titleBn": item["titleBn"],
        "slug": sku.lower(),
        "accent": item["acc"],
        "priceBDT": item["priceBDT"],
        "priceStatus": item["priceStatus"],
        "unit": item["unit"],
        "unitBn": item["unitBn"],
        "cautionBn": item["cautionBn"],
        "cautionEn": item["cautionEn"],
        "descriptionBn": item["descriptionBn"],
        "descriptionEn": item["descriptionEn"],
        "details": item["details"],
        "setVerify": item.get("details", {}).get("setVerify", False),
        "customReq": item.get("details", {}).get("customReq", False),
        "assets": {
            "main": f"assets/products/{sku}/main.webp",
            "original": f"assets/products/{sku}/original.webp",
            "alternate": f"assets/products/{sku}/main.jpg",
            "socialSquare": f"assets/products/{sku}/socialSquare.webp",
            "storyReel": f"assets/products/{sku}/main.webp",
            "detailA": f"assets/products/{sku}/detailA.webp",
            "detailB": f"assets/products/{sku}/main.webp",
            "aiStylingPreview": None
        },
        "sourceRef": f"Accessories 35 Master Catalog 2026 ({sku})"
    }
    PRODUCTS.append(p)

output_code = f"""/**
 * Fariza's Territory — Complete 53-SKU Catalog Data System
 * Fashion: 18 Studio Garments across 5 Collections
 * Accessories: 35 Artisan Pieces across 3 Collections (Mirrors, Pendants/Jewelry, Bangles)
 * Total: Exactly 53 Verified SKUs
 */

(function (window) {{
  'use strict';

  const COLLECTIONS = {json.dumps(COLLECTIONS, indent=2, ensure_ascii=False)};

  const PRODUCTS = {json.dumps(PRODUCTS, indent=2, ensure_ascii=False)};

  const PRODUCTS_BY_SKU = {{}};
  PRODUCTS.forEach(p => {{
    p.col = p.col || p.colId;
    PRODUCTS_BY_SKU[p.sku] = p;
  }});

  const HOTSPOTS = {json.dumps(HOTSPOTS, indent=2, ensure_ascii=False)};

  const PAIR_LOOKS = {json.dumps(PAIR_LOOKS, indent=2, ensure_ascii=False)};

  const KEY_META = {{
    main: {{ label: "Main photo", auth: "source-product-photography", ratio: "r45" }},
    original: {{ label: "Original photo", auth: "source-product-photography", ratio: "r45" }},
    alternate: {{ label: "Alternate photo", auth: "source-product-photography", ratio: "r45" }},
    socialSquare: {{ label: "Social square", auth: "derived-source-crop", ratio: "r11" }},
    storyReel: {{ label: "Story / Reel", auth: "derived-source-crop", ratio: "r916" }},
    detailA: {{ label: "Detail A · close-up", auth: "derived-source-crop", ratio: "r11" }},
    detailB: {{ label: "Detail B · close-up", auth: "derived-source-crop", ratio: "r11" }},
    aiStylingPreview: {{ label: "AI styling preview", auth: "ai-illustration", ratio: "r45" }}
  }};

  const PHOTO_KEYS = ["main", "original", "alternate", "detailA", "detailB", "socialSquare", "storyReel"];

  window.FT_CATALOG = {{
    COLLECTIONS,
    PRODUCTS,
    PRODUCTS_BY_SKU,
    HOTSPOTS,
    PAIR_LOOKS,
    KEY_META,
    PHOTO_KEYS
  }};

}})(typeof window !== 'undefined' ? window : globalThis);
"""

with open('assets/js/catalogData.js', 'w', encoding='utf-8') as f:
    f.write(output_code)

print(f"Generated assets/js/catalogData.js successfully!")
print(f"Total Collections: {len(COLLECTIONS)}")
print(f"Total Products: {len(PRODUCTS)}")
print(f"Fashion count: {len([p for p in PRODUCTS if p['superCategory'] == 'Fashion'])}")
print(f"Accessories count: {len([p for p in PRODUCTS if p['superCategory'] == 'Accessories'])}")
