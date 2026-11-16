/**
 * Fariza's Territory — Verified Boutique Catalog & Collections Data
 * Brand: Fariza's Territory (Fashion & Accessories Brand by Faria & Saiful Islam Shuvo)
 * Products: 18 Studio Verified Three-Piece Sets Across 5 Collections
 */

(function (window) {
  'use strict';

  const COLLECTIONS = [
  {
    "id": "01",
    "folder": "01_Aarong_Label_Unverified",
    "name": "Aarong — Seller Label",
    "short": "Aarong Label",
    "acc": "#8E3B66",
    "note": "Seller-labeled collection. The Aarong label is unverified in the source CSV — affiliation is not claimed.",
    "count": 1
  },
  {
    "id": "02",
    "folder": "02_Alfi_Boutique",
    "name": "Alfi Boutique",
    "short": "Alfi Boutique",
    "acc": "#1F6E63",
    "note": "Batik artistry — emerald and mauve florals with hand-drawn character.",
    "count": 2
  },
  {
    "id": "03",
    "folder": "03_Mome_Boutique",
    "name": "Mome Boutique",
    "short": "Mome Boutique",
    "acc": "#B0326E",
    "note": "Noir-grounded statements — forest, fuchsia, mustard and burgundy moods.",
    "count": 4
  },
  {
    "id": "04",
    "folder": "04_Zam_Zam_Swiss_Lawn",
    "name": "Zam Zam Swiss Lawn",
    "short": "Zam Zam Swiss Lawn",
    "acc": "#2C4470",
    "note": "Swiss lawn prints — royal blooms, heritage teals and geometric gardens.",
    "count": 6
  },
  {
    "id": "05",
    "folder": "05_Cotton_Mirror_Embroidery",
    "name": "Cotton Mirror & Embroidery",
    "short": "Mirror & Embroidery",
    "acc": "#C6952B",
    "note": "Cotton pieces with mirror work and ethnic embroidery — artisanal sparkle.",
    "count": 5
  }
];

  const KEYS = ["main","original","alternate","socialSquare","storyReel","detailA","detailB","aiStylingPreview"];

  const KEY_META = {
    main: { label: "Main photo", auth: "source-product-photography", ratio: "r45" },
    original: { label: "Original photo", auth: "source-product-photography", ratio: "r45" },
    alternate: { label: "Alternate photo", auth: "source-product-photography", ratio: "r45" },
    socialSquare: { label: "Social square", auth: "derived-source-crop", ratio: "r11" },
    storyReel: { label: "Story / Reel", auth: "derived-source-crop", ratio: "r916" },
    detailA: { label: "Detail A · close-up", auth: "derived-source-crop", ratio: "r11" },
    detailB: { label: "Detail B · close-up", auth: "derived-source-crop", ratio: "r11" },
    aiStylingPreview: { label: "AI styling preview", auth: "ai-illustration", ratio: "r45" }
  };

  const PHOTO_KEYS = ["main","original","alternate","detailA","detailB","socialSquare","storyReel"];

  const RAW = [
  [
    "CAT-001",
    "01",
    "Magenta Plum Printed Three Piece",
    "magenta-plum-printed-three-piece",
    "#8E3B66",
    [
      "1rVtmIJhw922nPlgUrJppKw1sOtZayLTo",
      "1rdPzWBia3rg1L6k6CAtktGcqHJ4BGrX-",
      "1ZDDNA4iaqfcG318gsfSHNukcvI_fbxAy",
      "1xHG21rmYOjcsLJrMYpGY4RTaKrEv_mda",
      "1YWSuqlPxHqZBRFQ-i-UEUWN_PRsfj4CO",
      "15fim5DTL-UrIa0ZvS1coQWd7zQChhiO8",
      "13o5mw1RA0ZUqlGk8sLV7sfxkdwVwmQE7",
      "1vDPgDIZ-1SvO9djEEk4MEzljkTryj8Za"
    ]
  ],
  [
    "CAT-002",
    "02",
    "Emerald Teal Batik",
    "emerald-teal-batik",
    "#1F6E63",
    [
      "1EeTV6lgA43eRf2aJfKF7q-n-X5LnqAeV",
      "1MaDHhdEswNCv6OHGv-LHdndCRZr4Gnhx",
      "1c_FdPJo-hXqwfQTNFpIIZDa5p6jRVLJV",
      "1IFhaUok8Xruc_6AJcC9t_nEf2308NpbH",
      "1hBWhP24tTLwmBjGxM860PFyIs_RdPcS0",
      "1sz8rEQOo5KwEEqgZ8VrYDldphXlIarnZ",
      "1E5r4XrEWv9GrHO31dWsYlCZ4TDVUPIVw",
      "11ujWnVyM9uubt5iBkucgYP70IlIZGmVr"
    ]
  ],
  [
    "CAT-003",
    "02",
    "Dusty Mauve Floral Batik",
    "dusty-mauve-floral-batik",
    "#A87C8F",
    [
      "1UjsXvgcb0YZXXMpkhMVjWMCAJ_gxXAse",
      "1mFYeGz46GPUPQWGAa2LiP-TOelpLz6a3",
      "1jM_bM09llLvnXwtcS9e8Al8iJZD9mhRM",
      "1t1jMpP3yuap1WZbNJBjBRDD8PQMvxYC-",
      "1L6P8Jx18fXHSGVfiyiPsobX966kJrbG0",
      "1Gdzfy1dok5dHvx817t71S0c5npT2vVNP",
      "1CmfNJFtPLPcf4SFoyNZ4vnvSEZM1CQcY",
      "1S1Cf4yamkdR25I5dgGK5Oc2t0lED9W2b"
    ]
  ],
  [
    "CAT-004",
    "03",
    "Forest Elegance",
    "forest-elegance",
    "#3E5E3A",
    [
      "1hDDT7C57EUd7SlfhB_UTV1HM2CKmtmnY",
      "1WiBEOxyy8VjoNLSs8rw2CcRwkDdnA7im",
      "1vfg7AQV3qnWen2QRFj-3oUqmzWoKla3S",
      "1ZTx79yAqtDsUQyV4MLQZK6MQyVMGTwDl",
      "1v_OacKSvbvUyokVkuhGBnAQLTallA7mR",
      "1wGGaMDma1EfLPS4yP8NIRzeF8AeqmzZ9",
      "1EZqHbdRS81JS9qULgJn6UYfKdW2o0yS1",
      null
    ]
  ],
  [
    "CAT-005",
    "03",
    "Fuchsia Noir",
    "fuchsia-noir",
    "#B0326E",
    [
      "1_2XDPZF6EABqRrcV6yIUdB-pTbtbDEQX",
      "1xGpk702f_n3NjJ7rawQV4UiGJodgfzYB",
      "1gwTY0C8iJ5NiGwh268vxLzLTZA_05hba",
      "1Frpm7Wy9TA2Bk01skTE0wuz4boCbVQ0m",
      "1oi0pAivSqg2sKh88lwKaZlAkz2ez-jtf",
      "1La2HhAhk_alrt6e7tM7w-twtDkdfn-Wj",
      "1Hk6LNUrP8FW8Y0grFCez2i46f_tApYFQ",
      null
    ]
  ],
  [
    "CAT-006",
    "03",
    "Mustard Noir",
    "mustard-noir",
    "#C0912F",
    [
      "100eDKNe1Vi0HpQkseTlgmalc_QKB60IW",
      "1gmibNVDuUwcRH_BPT5ElWx0WxGCidF9a",
      "1_fsEFCZSlXLgHhjTVTS3qklxyaw2oCYX",
      "1JVfFup73S9pCOMhIDroy0nsscXXioN3V",
      "1I0ARI1CirICmtlVeqkV61r1078uBOFoU",
      "1WGsVHHOj2idziWDaed8n_EzLJ-WeGcag",
      "1hFl7fEw8WD-tWetVgAc8OOJ6mbkjpNRV",
      null
    ]
  ],
  [
    "CAT-007",
    "03",
    "Burgundy Sunset",
    "burgundy-sunset",
    "#7E2F3C",
    [
      "1eNYXXVUsdmSV_DAJrKACyioxiD3kLeMB",
      "1oeJnUUs2x8ZCjkkzTXQw1YsmO5UvbPMW",
      "17CMksrurMaxtCPYordlcb-vx4EF4t3CD",
      "19J3TV-eIgdGtGc6gUJ5qbI_c3_C8h9Ow",
      "1jbwmzOt9DS1B7RzpvGGbKyIZREc3-Lbp",
      "1V2z-m7wEI9czTkac0VODpLlsYy8Ur0tq",
      "1bfKwPtIbeAZb2JetlcNyI3gLWrq7MGpT",
      null
    ]
  ],
  [
    "CAT-008",
    "04",
    "Navy Royal Bloom",
    "navy-royal-bloom",
    "#2C4470",
    [
      "1mlPaussfRo86RChIhbZekrkp3X_7Jzt6",
      "1aFV6ZPd6YTVCtoAxTDZwCi1ziFf1GoZd",
      "1Ai-jtM9mOWjd8ZV3M2FjfVKfPW-zsRM7",
      "1PUX2b_qddZSJ-R7yC6tHQda9p0BnmhwG",
      "1OWCAEeBxLVUlXuJwyj86jlB-lZG5u-nk",
      "1eGt-3HH05v8_Gv-wM7s22orOyS_jhngQ",
      "1NXFBPqsvXvjq33toUkde95cLT5iVBoKB",
      "1APOBMbjheYCNmWdutdqYjduswu1JcTnK"
    ]
  ],
  [
    "CAT-009",
    "04",
    "Autumn Floral Elegance",
    "autumn-floral-elegance",
    "#B4652F",
    [
      "1rBKCjJz7DijJDAtUKB8kUHdQTSXWAVFg",
      "1BcKYgcdg86hqWORPVjfmFqHSi4HtjlPt",
      "1eUcBlLt99YSQkN5JlKzOMAyKzYAElTpu",
      "1UT01Vm2ndBbx2bBHmMqe22OLFTqwh_uw",
      "1TnD9q5HvngrzGTkudVuPMaMYowHZZtdt",
      "1wwmIq-vyeVpVvP4uBd4hjaKhLPbfszXA",
      "14HqpjBhvuoNbrdHBNZwnkNr8w4ZSDIEI",
      "1BT_P4UKPq8zCvG-k5fFQT1xq2oylC7RQ"
    ]
  ],
  [
    "CAT-010",
    "04",
    "Midnight Teal Heritage",
    "midnight-teal-heritage",
    "#1F4E4A",
    [
      "1MGzV7UR_eWD6RplV7VWooQ3qDq3_wtWQ",
      "1pmnIyOD8aJYNHtqZ8UQn4RYFUW9mDQw6",
      "1MSmVTnaqPR9G0KNgCFvqZT0BCGuW26bM",
      "1ag8HwkCzgwCm_dX69phvSmWIgpGWtpr9",
      "1liQV1rQ82doUZi_O13AlZbJYXHBtToF1",
      "1dtSM5cM7dMPKyB2qgV-7zTNxuehHkuFx",
      "1tTe1Gx3r25cSAz2FB4JcpXRkAnKdOiHS",
      "1hnTtyJwxQkHW6cNu4Jb87zQIp2aHFP_x"
    ]
  ],
  [
    "CAT-011",
    "04",
    "Olive Garden Bloom",
    "olive-garden-bloom",
    "#6B6B33",
    [
      "1kGU6uNBLuJW2z61mQPeipdF160n9eJfq",
      "1lHQTs0CAwWNfHsaQWdVwmr8W5KoYA6Jy",
      "1bVHvarm2SrjycuBc76rhA96uas4flkNJ",
      "1NGoldXL_fPqscHwLdn8Q5QOHw5LRLjzt",
      "1tnzzXgr_zS3QivyOXIcIYg42ogguMHdY",
      "1ALL2FCapADTrqSOSUIJlCqjbJ-CuRezh",
      "1uQNm08s5qTBOvdNQXCvMBFq8Uc2eH87b",
      "1gpYKJly-o4J3dDKbthTf41glX6Q1BRaH"
    ]
  ],
  [
    "CAT-012",
    "04",
    "Coral Geometric Bloom",
    "coral-geometric-bloom",
    "#D06A4E",
    [
      "1oy9Zvg2dziafHMiPh5jUrBSjNtF4kebH",
      "1Jwb-Z1GHsDpuSKTLr-AMdc7qLNCdnNjx",
      "13BHZvvmtZfhfDW-qEcCyPBtBsUuEFst3",
      "1S0be12fYRg0g2mQIGeEnljdP1hJvOhrN",
      "1X3xRTzO1TuPVUpo1rq297WNEgJsiJ4Gx",
      "1s2Vb7OfeUlaPNtIxq5g9RnfpbIB2FZv1",
      "1uW7EOZIQl0zEO1nhT1e7MW-Lvi8DxwTI",
      "15E8OC33v3rrKqXSr-e46EVvzy8g8SEic"
    ]
  ],
  [
    "CAT-013",
    "04",
    "Crimson Floral Mosaic",
    "crimson-floral-mosaic",
    "#9E2B33",
    [
      "1NouuV36F3jKSIbT7_ic_Wz8T0hd41Fhr",
      "1I3wCaHQwvMEp3ktMWJrmmBSZsxIKPisP",
      "1TKYQyKmK2JoGypMkW6l1EkHwbcAnX_Hz",
      "1jiUhx0WKHCcFgII73sFBxjStiAhsaGLy",
      "1XS8H_k4iW6UcOpCrTDXTlCgej-mT3hZX",
      "1TnBVi7hXuO1CIRNefX9SU9JR1MpNUFab",
      "1f2qHNZrmppGWKPx7lfIR8wtelpJbKxwh",
      "1XRXq9gAxdUwlUdYktZR7_k3K-WnXi_cH"
    ]
  ],
  [
    "CAT-014",
    "05",
    "Golden Mustard Mirror Elegance",
    "golden-mustard-mirror-elegance",
    "#C6952B",
    [
      "1WfBj8B0ZNuXQxSb9-ThFe3zY4tym7LWO",
      "1VO2qgFxoLaoXp8Jt1KymgrEaK2XaEwLZ",
      "10Z54B--g_0F9tVXG7o-uvAxMCos_mUuK",
      "1A9_d9AB_4zSxMve0zOegE6IVeLmgtsLX",
      "1tAEfabSYvBnEtY45HrGW63n85SY2cIIl",
      "1P4le3sHbyee9xipyp66qKoqWklRzGI1V",
      "1dd_hYdf87ll4FGRVNpZ-CyFF296_zQn0",
      "1jnanstYvLBmgwigx3ekV0ixd5H-ieRs-"
    ]
  ],
  [
    "CAT-015",
    "05",
    "Midnight Black Ethnic Charm",
    "midnight-black-ethnic-charm",
    "#3A3A44",
    [
      "1XmBDRziSoJfbvtv72xZp4ZRkxXvDAwxD",
      "1boPKkmXqnsi1gS93_nwuoNiyWOXPnnsS",
      "1yMPp4Q5Rz4iu6axOc1ON0idb-QqCRuCy",
      "1IllpPUWIUQWFDsoQAKa14nleZEPf3pua",
      "1_x5eRj-8E2BC7I9KiAalXOkmxMAQNE5W",
      "14tZ_ErXKLJineANpKfFADzwC2iNCQoG4",
      "17YPvsWJuuviSn9FyJnWFaqVPhOVDpZwD",
      "1C88SSAIU0xKHu86zLCLBI2Crn26Pd7KZ"
    ]
  ],
  [
    "CAT-016",
    "05",
    "Fuchsia Bloom Aqua Delight",
    "fuchsia-bloom-aqua-delight",
    "#C13B78",
    [
      "1X1I5aO4OjAnAcAN1CgCgMsB5sLp-A5iV",
      "1iZo-RHkNwrcLjT3PTVWXQtbOU7Ldtsr1",
      "1xmLJvyWb7yG06to0BSMPmpEXkNXA0Ra_",
      "1tY1lkkpwSXR84k4lYgXvJ9gEA6JItuRu",
      "1b5DisdH_HdRNroKMrJ_uOYGqIiUH7A4b",
      "1Mo5P6hKz4jXBRVGDOpEDIEd7meKDAPYi",
      "1XFPm4TC6F9usJqABbUGn3gmMQYNfiVaJ",
      "1A_YKVtHBqxb1iV33hyr7Zog-rOPOzMy7"
    ]
  ],
  [
    "CAT-017",
    "05",
    "Electric Blue Mirror Blossom",
    "electric-blue-mirror-blossom",
    "#2E5FA3",
    [
      "14nYu8_CGhy6w7-9CClx4-ZJmnpFKCgm0",
      "1ET4ytkPGaO70caCQoItvcXaVOm17BnlT",
      "1SjkGJfbHEP8KydmJymdbxWBX3YvqWPNi",
      "1mbtj-6mycnxSz1SziLyJuGaZttNuBtLj",
      "1Nra-qYkD6qENdjRYSFSYh4d4bLauoVaP",
      "1SingmH-aVoO9ummR-t-PgSW2twSE5dZ-",
      "1CsPRtZkMlVqHFNnArUZcjFE4Ob91V-eS",
      "1Y6jTd7wYK6CzWHNMD4zxmmO9v6G2s_hH"
    ]
  ],
  [
    "CAT-018",
    "05",
    "Sand Beige Floral Grace",
    "sand-beige-floral-grace",
    "#B99C74",
    [
      "1F_QTOiagqQ76wJ5nQgvcQO1JzOtxF_Lt",
      "1sgqD4bdKO9YC8e3JpYq7Seyo7zBDAngi",
      "14_LW-wIeBKOc-hXxiLlEi7vJoLuT0D8S",
      "1kZrokduheHupCl-1g7xsrHYJSVPjh57c",
      "10igjMN2s27erhelkE1FuJuqmY7jgBjb_",
      "10eJOsiH2LdBc5a8WHKODJJWxC6eZxgCb",
      "1gb0xQlp85HGZyrekbYBGUJh2MbQybNOO",
      "1ane8Lin32BbJs6fxJiwv9BDlCwsyTEQZ"
    ]
  ]
];

  const VERIFIED_CATALOG = {
  "CAT-001": {
    "priceBDT": 2350,
    "priceReview": false,
    "priceConfidence": "high",
    "titleBn": "ম্যাজেন্টা ও প্লাম প্রিন্টেড থ্রি-পিস",
    "descriptionBn": "ম্যাজেন্টা ও প্লামের আকর্ষণীয় বৈপরীত্যে সাজানো এই থ্রি-পিসে আছে সাদা-গোলাপি ফুল, পেইসলি মোটিফ ও ডেকোরেটিভ বর্ডার। উজ্জ্বল ফুশিয়া সলিড কাপড় এবং ট্যাসেলসহ প্রিন্টেড ওড়না পুরো সেটে যোগ করে প্রাণবন্ত একটি ফিনিশ।",
    "kameezBn": "প্লাম বেসে ফ্লোরাল-পেইসলি প্রিন্ট ও বর্ডার",
    "salwarBn": "উজ্জ্বল ফুশিয়া/পিংক সলিড কাপড়",
    "dupattaBn": "ম্যাজেন্টা-প্লাম প্রিন্ট, ফুলের মোটিফ ও ট্যাসেল",
    "fabricClaim": "Not specified",
    "stitching": "Unconfirmed; separate sleeve cloth mentioned",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-002": {
    "priceBDT": 2150,
    "priceReview": false,
    "priceConfidence": "high",
    "titleBn": "এমেরাল্ড টিল বাটিক থ্রি-পিস",
    "descriptionBn": "কালো ও আইভরি রঙের অ্যাবস্ট্রাক্ট বাটিক-অনুপ্রাণিত নকশায় একটি স্বতন্ত্র লুক। টিল-সবুজ টাই-ডাই ঘরানার ওড়নার রাস্ট বর্ডার এবং টেরাকোটা রঙের সলিড কাপড় যোগ করেছে সাহসী, মার্জিত কনট্রাস্ট।",
    "kameezBn": "কালো/চারকোল বেসে আইভরি ফ্লোরাল ও জ্যামিতিক প্রিন্ট",
    "salwarBn": "টেরাকোটা/রাস্ট সলিড কাপড়",
    "dupattaBn": "টিল-সবুজ স্ট্রাইপ ও রাস্ট বর্ডার",
    "fabricClaim": "Not specified",
    "stitching": "Unconfirmed",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-003": {
    "priceBDT": 2050,
    "priceReview": false,
    "priceConfidence": "high",
    "titleBn": "ডাস্টি মভ ফ্লোরাল বাটিক থ্রি-পিস",
    "descriptionBn": "ডাস্টি মভের কোমল রঙে অফ-হোয়াইট ফুল এবং বড় বৃত্তাকার বাটিক মোটিফের পরিমিত সৌন্দর্য। একই টোনের সলিড কাপড় ও সূক্ষ্ম ফ্লোরাল প্রিন্টের ট্যাসেলযুক্ত ওড়নায় তৈরি হয়েছে সহজ, রুচিশীল থ্রি-পিস কম্বিনেশন।",
    "kameezBn": "ডাস্টি মভে সাদা ফুল ও গোলাকার বাটিক মোটিফ",
    "salwarBn": "ম্যাচিং ডাস্টি মভ সলিড কাপড়",
    "dupattaBn": "মভ ফ্লোরাল প্রিন্ট, সূক্ষ্ম টেক্সচার ও ট্যাসেল",
    "fabricClaim": "Not specified",
    "stitching": "Unconfirmed",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-004": {
    "priceBDT": 1850,
    "priceReview": true,
    "priceConfidence": "medium",
    "titleBn": "ফরেস্ট এলিগ্যান্স",
    "descriptionBn": "মাটির রঙের উষ্ণতা ও ফরেস্ট গ্রিনের গভীরতা মিলেছে বোটানিক্যাল বাটিক-অনুপ্রাণিত নকশায়। ড্রেস ম্যাটেরিয়ালের সঙ্গে বাদামি সলিড কাপড় ও সবুজ গ্রেডিয়েন্ট ওড়নার পাতার ছাপ এবং ট্যাসেল পুরো লুকে আনে প্রাকৃতিক আবহ।",
    "kameezBn": "আর্থি ব্রাউন ও ফরেস্ট গ্রিন বোটানিক্যাল প্রিন্ট",
    "salwarBn": "সলিড ব্রাউন কাপড়",
    "dupattaBn": "সবুজ গ্রেডিয়েন্ট ওড়না, ক্রিম বোটানিক্যাল ছাপ",
    "fabricClaim": "Batik collection (technique not certified)",
    "stitching": "Dress materials shown; tailoring not confirmed",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-005": {
    "priceBDT": 1700,
    "priceReview": false,
    "priceConfidence": "high",
    "titleBn": "ফুশিয়া নোয়ার",
    "descriptionBn": "তীক্ষ্ণ ফুশিয়া-পিংক ও চারকোলের ড্রামাটিক কনট্রাস্টে নজরকাড়া বাটিক থ্রি-পিস ম্যাটেরিয়াল। কামিজের ওপর গোলাপি ও সাদা ফুলেল ছাপ, সঙ্গে সলিড ফুশিয়া কাপড় এবং গাঢ় থেকে উজ্জ্বল রঙে পরিবর্তিত ওড়না।",
    "kameezBn": "চারকোল/কালো বেসে ফুশিয়া ও সাদা ফ্লোরাল প্রিন্ট",
    "salwarBn": "উজ্জ্বল ফুশিয়া সলিড কাপড়",
    "dupattaBn": "ফুশিয়া-চারকোল গ্রেডিয়েন্ট ও ফুলের মোটিফ",
    "fabricClaim": "Batik collection (technique not certified)",
    "stitching": "Dress materials shown; tailoring not confirmed",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-006": {
    "priceBDT": 1650,
    "priceReview": false,
    "priceConfidence": "high",
    "titleBn": "মাস্টার্ড নোয়ার",
    "descriptionBn": "উজ্জ্বল মাস্টার্ড ও গাঢ় চারকোলের দুই-টোন প্যালেটে ক্লাসিক বাটিক ঘরানার নকশা। ছোট ছোট বোটানিক্যাল রিপিট প্রিন্টের সঙ্গে সলিড হলুদ কাপড় এবং মাস্টার্ড থেকে চারকোলের গ্রেডিয়েন্ট ওড়না একটি সুষম সেট তৈরি করে।",
    "kameezBn": "চারকোল বেসে মাস্টার্ড বোটানিক্যাল রিপিট",
    "salwarBn": "সলিড মাস্টার্ড হলুদ কাপড়",
    "dupattaBn": "হলুদ-চারকোল গ্রেডিয়েন্ট, বোটানিক্যাল মোটিফ",
    "fabricClaim": "Batik collection (technique not certified)",
    "stitching": "Dress materials shown; tailoring not confirmed",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-007": {
    "priceBDT": 1750,
    "priceReview": true,
    "priceConfidence": "medium",
    "titleBn": "বারগান্ডি সানসেট",
    "descriptionBn": "বারগান্ডি ও সানসেট-মাস্টার্ডের উষ্ণ মেলবন্ধনে ব্যতিক্রমী টাই-ডাই অনুপ্রাণিত ড্রেস ম্যাটেরিয়াল। গোলাকার বাটিক স্ট্যাম্পের মতো মোটিফ এবং ওড়নার বিস্তৃত রঙের পরিবর্তন ডিজাইনটিকে দেয় আলাদা চরিত্র।",
    "kameezBn": "গাঢ় বারগান্ডি বেসে মাস্টার্ড বৃত্তাকার মোটিফ",
    "salwarBn": "ম্যাচিং কাপড়; রঙের বরাদ্দ যাচাই প্রয়োজন",
    "dupattaBn": "বারগান্ডি-মাস্টার্ড টাই-ডাই ও গ্রেডিয়েন্ট",
    "fabricClaim": "Batik collection (technique not certified)",
    "stitching": "Dress materials shown; tailoring not confirmed",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-008": {
    "priceBDT": 1750,
    "priceReview": false,
    "priceConfidence": "high",
    "titleBn": "নেভি রয়্যাল ব্লুম",
    "descriptionBn": "গভীর নেভি ব্লু বেসে সাদা অলঙ্করণধর্মী কেন্দ্রীয় নকশা এবং উষ্ণ বর্ডারের ক্লাসিক কনট্রাস্ট। হলুদ ফুলেল ওড়না ও গাঢ় সলিড কাপড়ের সঙ্গে এই আনস্টিচড থ্রি-পিসে তৈরি হয় রাজকীয়, স্মার্ট এথনিক অনুভূতি।",
    "kameezBn": "নেভিতে সাদা অর্নামেন্টাল কেন্দ্রীয় প্যানেল ও বর্ডার",
    "salwarBn": "সলিড গাঢ় নেভি/প্রায় কালো কাপড়",
    "dupattaBn": "হলুদ ফুল, গাঢ় বর্ডারযুক্ত প্রিন্টেড ওড়না",
    "fabricClaim": "Swiss lawn; digital print (seller-described, unverified)",
    "stitching": "Unstitched - explicitly stated",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-009": {
    "priceBDT": 1700,
    "priceReview": false,
    "priceConfidence": "high",
    "titleBn": "অটাম ফ্লোরাল এলিগ্যান্স",
    "descriptionBn": "হালকা স্টোন-বেইজ বেসে শরতের ফুলের প্রিন্ট ও মাঝখানে সরু মাস্টার্ড প্যানেল। রাস্ট সলিড কাপড় এবং বহুরঙা ফ্লোরাল-বর্ডার ওড়নার সমন্বয় এই আনস্টিচড সেটকে করেছে সতেজ ও প্রাণবন্ত।",
    "kameezBn": "স্টোন/বেইজে ছোট ফুল ও মাস্টার্ড সেন্টার প্যানেল",
    "salwarBn": "সলিড রাস্ট/ব্রাউন কাপড়",
    "dupattaBn": "ফুলেল প্রিন্ট, পিংক ও কালো অর্নামেন্টাল বর্ডার",
    "fabricClaim": "Swiss lawn; digital print (seller-described, unverified)",
    "stitching": "Unstitched - explicitly stated",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-010": {
    "priceBDT": 1650,
    "priceReview": true,
    "priceConfidence": "review",
    "titleBn": "মিডনাইট টিল হেরিটেজ",
    "descriptionBn": "ডার্ক প্লাম-চারকোল বেসে লম্বালম্বি হেরিটেজ মেডেলিয়ন ও জ্যামিতিক নকশার অনন্য বিন্যাস। অ্যাকোয়া-টিল সলিড কাপড় এবং গাঢ় অর্নামেন্টাল প্রিন্টের ওড়না সেটটিকে দিয়েছে আধুনিক ঐতিহ্যবাহী আবহ।",
    "kameezBn": "ডার্ক প্লাম-চারকোলে উল্লম্ব মেডেলিয়ন প্রিন্ট",
    "salwarBn": "সলিড অ্যাকোয়া-টিল কাপড়",
    "dupattaBn": "গাঢ় রঙে অর্নামেন্টাল ও পেইসলি বর্ডার",
    "fabricClaim": "Swiss lawn; digital print (seller-described, unverified)",
    "stitching": "Unstitched - explicitly stated",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-011": {
    "priceBDT": 1850,
    "priceReview": false,
    "priceConfidence": "high",
    "titleBn": "অলিভ গার্ডেন ব্লুম",
    "descriptionBn": "অলিভ গ্রিন বেসের ওপর ছড়িয়ে থাকা রঙিন ফুলের বুকে একটি নরম, প্রাকৃতিক স্টাইল। হালকা স্ট্রাইপ ও বড় ফ্লোরাল ওড়নার সঙ্গে ডিপ গ্রিন সলিড কাপড় মিলিয়ে এই আনস্টিচড সেটে আছে শান্ত কিন্তু স্বতন্ত্র উপস্থিতি।",
    "kameezBn": "অলিভ গ্রিনে রঙিন ফুলের বুকে",
    "salwarBn": "সলিড ডিপ গ্রিন কাপড়",
    "dupattaBn": "হালকা স্ট্রাইপ, বড় ফুল ও কনট্রাস্ট বর্ডার",
    "fabricClaim": "Swiss lawn; digital print (seller-described, unverified)",
    "stitching": "Unstitched - explicitly stated",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-012": {
    "priceBDT": 1650,
    "priceReview": true,
    "priceConfidence": "review",
    "titleBn": "কোরাল জিওমেট্রিক ব্লুম",
    "descriptionBn": "কোরাল-পিংক বেসে ট্রায়াঙ্গেল ও হেক্সাগোনাল জ্যামিতিক প্রিন্টের আধুনিক কম্বিনেশন। সলিড কোরাল কাপড় এবং ফুল, লাইন-আর্ট ও জ্যামিতিক বর্ডারের ওড়না মিলে একটি উজ্জ্বল, সমন্বিত আনস্টিচড থ্রি-পিস।",
    "kameezBn": "কোরাল-পিংক ত্রিভুজ ও হেক্সাগোনাল মোটিফ",
    "salwarBn": "সলিড কোরাল-পিংক কাপড়",
    "dupattaBn": "ফ্লোরাল ও জ্যামিতিক বর্ডারসহ কোরাল ওড়না",
    "fabricClaim": "Swiss lawn; digital print (seller-described, unverified)",
    "stitching": "Unstitched - explicitly stated",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-013": {
    "priceBDT": 1800,
    "priceReview": true,
    "priceConfidence": "review",
    "titleBn": "ক্রিমসন ফ্লোরাল মোজাইক",
    "descriptionBn": "গাঢ় চারকোল বেসে ক্রিমসন কেন্দ্রীয় প্যানেল ও ছোট ছোট বহুরঙা ফুলের নকশা। মভ-গ্রে ফ্লোরাল ওড়না এবং টোপ/মোকা সলিড কাপড়ের মিশেলে এই আনস্টিচড থ্রি-পিসে আসে সমৃদ্ধ, আর্টিস্টিক লুক।",
    "kameezBn": "কালো/চারকোলে লাল কেন্দ্রীয় প্যানেল ও রঙিন ফুল",
    "salwarBn": "সলিড টোপ/মোকা কাপড়",
    "dupattaBn": "মভ-গ্রে ফ্লোরাল প্রিন্ট ও কালো বর্ডার",
    "fabricClaim": "Swiss lawn; digital print (seller-described, unverified)",
    "stitching": "Unstitched - explicitly stated",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-014": {
    "priceBDT": 2050,
    "priceReview": false,
    "priceConfidence": "high",
    "titleBn": "গোল্ডেন মাস্টার্ড মিরর এলিগ্যান্স",
    "descriptionBn": "উজ্জ্বল গোল্ডেন-মাস্টার্ডে ডায়মন্ড গ্রিড এবং আয়নার মতো ঝলমলে অ্যাকসেন্টের নজরকাড়া ডিজাইন। বারগান্ডি প্রিন্টেড সালোয়ার কাপড় ও বিস্তারিত বর্ডারের মাস্টার্ড ওড়না সেটে যোগ করে উৎসবমুখর কনট্রাস্ট।",
    "kameezBn": "মাস্টার্ডে ডায়মন্ড গ্রিড ও মিরর-লুক অ্যাকসেন্ট",
    "salwarBn": "বারগান্ডি/ম্যাজেন্টা প্যাটার্নের কাপড়",
    "dupattaBn": "মাস্টার্ড, সাদা ফুলেল স্ট্রাইপ ও ডিটেইলড বর্ডার",
    "fabricClaim": "Cotton (catalog label only; exact composition not verified)",
    "stitching": "Ready-made per cover; size/fit unverified",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-015": {
    "priceBDT": 2150,
    "priceReview": false,
    "priceConfidence": "high",
    "titleBn": "মিডনাইট ব্ল্যাক এথনিক চার্ম",
    "descriptionBn": "গাঢ় ব্ল্যাক-চারকোল বেসে কমলা-লাল জ্যামিতিক চেইন ও নেকলাইনের প্রিন্ট। বারগান্ডি-টু-ব্ল্যাক ওড়নার ছোট হলুদ মোটিফ এবং কালো-কমলা জ্যামিতিক প্যাটার্নের সালোয়ার কাপড়ের সঙ্গে তৈরি হয়েছে শক্তিশালী এথনিক লুক।",
    "kameezBn": "কালো বেসে কমলা-লাল জ্যামিতিক চেইন প্রিন্ট",
    "salwarBn": "কালো-কমলা হেক্সাগোনাল প্যাটার্নের কাপড়",
    "dupattaBn": "বারগান্ডি-কালো গ্রেডিয়েন্ট ও জ্যামিতিক বর্ডার",
    "fabricClaim": "Cotton (catalog label only; exact composition not verified)",
    "stitching": "Ready-made per cover; size/fit unverified",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-016": {
    "priceBDT": 1950,
    "priceReview": false,
    "priceConfidence": "high",
    "titleBn": "ফুশিয়া ব্লুম অ্যাকোয়া ডিলাইট",
    "descriptionBn": "ফুশিয়া-পিংকের উজ্জ্বলতায় অ্যাকোয়া রঙের নেকলাইন ও ফ্লোরাল-জ্যামিতিক ছাপ। হালকা অ্যাকোয়া সালোয়ার কাপড় এবং ফুশিয়া ওড়নার নীল-সাদা বর্ডারে সৃষ্টি হয়েছে তরুণ, প্রাণবন্ত রঙের মেলবন্ধন।",
    "kameezBn": "ফুশিয়া-পিংকে অ্যাকোয়া নেকলাইন ও ছোট ফ্লোরাল মোটিফ",
    "salwarBn": "হালকা অ্যাকোয়া, ম্যাজেন্টা ক্ষুদ্র ফুলের ছাপ",
    "dupattaBn": "ফুশিয়া, নীল-সাদা ফুলেল ও জ্যামিতিক বর্ডার",
    "fabricClaim": "Cotton (catalog label only; exact composition not verified)",
    "stitching": "Ready-made per cover; size/fit unverified",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-017": {
    "priceBDT": 2250,
    "priceReview": false,
    "priceConfidence": "high",
    "titleBn": "ইলেকট্রিক ব্লু মিরর ব্লসম",
    "descriptionBn": "ইলেকট্রিক ব্লু রঙে ডায়মন্ড গ্রিড ও হলুদ মিরর-লুক অ্যাকসেন্টের প্রাণবন্ত নকশা। নেভি সালোয়ার কাপড়ের হালকা জিগজ্যাগ প্যাটার্ন আর নীল-পিংক বর্ডারের আকাশি ওড়নায় সুন্দর কনট্রাস্ট।",
    "kameezBn": "ইলেকট্রিক ব্লু, গ্রিড ও ঝলমলে-দেখানো ডিটেইল",
    "salwarBn": "নেভিতে হালকা জিগজ্যাগ/রেখা প্যাটার্ন",
    "dupattaBn": "আকাশি নীল ওড়না, নীল-পিংক ফুলেল বর্ডার",
    "fabricClaim": "Cotton (catalog label only; exact composition not verified)",
    "stitching": "Ready-made per cover; size/fit unverified",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  },
  "CAT-018": {
    "priceBDT": 2450,
    "priceReview": false,
    "priceConfidence": "high",
    "titleBn": "স্যান্ড বেইজ ফ্লোরাল গ্রেস",
    "descriptionBn": "হালকা স্যান্ড-বেইজ রঙে সূক্ষ্ম ফুলেল নকশা, রঙিন নেকলাইন বোতাম ও পরিমিত ডিজাইনের শান্ত সৌন্দর্য। ডিপ পার্পল সালোয়ার কাপড় এবং সূক্ষ্ম সাদা লাইনওয়ার্কের বেইজ ওড়নায় স্টাইলটি হয়ে উঠেছে রুচিশীল।",
    "kameezBn": "স্যান্ড-বেইজে সূক্ষ্ম ফ্লোরাল প্রিন্ট ও রঙিন বোতাম",
    "salwarBn": "ডিপ পার্পল ফুলেল/অর্নামেন্টাল প্যাটার্ন",
    "dupattaBn": "বেইজে সূক্ষ্ম সাদা লাইনওয়ার্ক ও বৃত্তাকার মোটিফ",
    "fabricClaim": "Cotton (catalog label only; exact composition not verified)",
    "stitching": "Ready-made per cover; size/fit unverified",
    "priceSource": "11 November 2026 prior catalog/handwritten price mapping",
    "stockVerified": false
  }
};

  // Map each SKU asset to high-speed local WebP image with Google Drive fallback
  const PRODUCTS = RAW.map(([sku, colId, title, slug, accent, driveIds]) => {
    const v = VERIFIED_CATALOG[sku] || {};
    const col = COLLECTIONS.find(c => c.id === colId) || {};
    
    const assets = {};
    KEYS.forEach((k, idx) => {
      assets[k] = {
        key: k,
        id: driveIds[idx] || "",
        localUrl: `assets/products/${sku}/${k}.webp`
      };
    });

    return {
      sku,
      colId,
      collectionName: col.name || "Boutique",
      collectionShort: col.short || "Boutique",
      title,
      slug,
      accent,
      driveIds,
      assets,
      // Verified Specs
      priceBDT: v.priceBDT || 2000,
      priceReview: v.priceReview || false,
      priceConfidence: v.priceConfidence || "high",
      titleBn: v.titleBn || title,
      descriptionBn: v.descriptionBn || "",
      kameezBn: v.kameezBn || "",
      salwarBn: v.salwarBn || "",
      dupattaBn: v.dupattaBn || "",
      fabricClaim: v.fabricClaim || "Not specified",
      stitching: v.stitching || "Unconfirmed",
      stockVerified: v.stockVerified !== undefined ? v.stockVerified : true,
      isAvailable: true
    };
  });

  const PRODUCTS_BY_SKU = {};
  PRODUCTS.forEach(p => {
    PRODUCTS_BY_SKU[p.sku] = p;
  });

  // Resolve image URL prioritizing local optimized WebP with Google Drive fallback
  function getAssetUrl(p, key, width) {
    if (!p) return "";
    const w = width || 800;
    const a = p.assets ? p.assets[key] : null;
    if (a && a.localUrl) {
      return a.localUrl;
    }
    if (a && a.id && window.FT_CONFIG && window.FT_CONFIG.driveThumb) {
      return window.FT_CONFIG.driveThumb(a.id, w);
    }
    return `assets/products/${p.sku || 'CAT-001'}/main.webp`;
  }

  window.FT_CATALOG = {
    COLLECTIONS,
    KEYS,
    KEY_META,
    PHOTO_KEYS,
    RAW,
    VERIFIED_CATALOG,
    PRODUCTS,
    PRODUCTS_BY_SKU,
    getAssetUrl
  };
})(window);
