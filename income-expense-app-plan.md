# আয়-ব্যয় ট্র্যাকার অ্যাপ: প্রজেক্ট প্ল্যান

## ১. মূল ধারণা

একটা **Household (পরিবার)** থাকবে, তার ভেতরে একাধিক **Member** থাকবে। প্রতিটি মেম্বার নিজের আয়-ব্যয় এন্ট্রি করবে। সিস্টেম দুই ধরনের ভিউ দেখাবে:

- **Personal view:** শুধু নিজের হিসাব
- **Family view:** সবার হিসাব মিলিয়ে সমন্বিত চিত্র

---

## ২. ফিচার তালিকা

### MVP (প্রথম ভার্সন)

- Sign up / login
- আয় এন্ট্রি: খাত (বেতন, ব্যবসা, ফ্রিল্যান্স, ভাড়া ইত্যাদি), পরিমাণ, তারিখ, নোট
- ব্যয় এন্ট্রি: খাত (বাজার, বিল, যাতায়াত, শিক্ষা, চিকিৎসা ইত্যাদি), পরিমাণ, তারিখ, নোট
- কাস্টম ক্যাটাগরি তৈরি
- Wallet/Account: ক্যাশ, bKash, Nagad, ব্যাংক
- Dashboard: এই মাসের মোট আয়, ব্যয়, সঞ্চয়
- ফিল্টার ও সার্চ (তারিখ, খাত, মেম্বার)

### Phase 2: Family

- মেম্বার invite (ইমেইল/লিংক)
- Role: Admin, Member, View-only
- প্রতিটি এন্ট্রিতে privacy: "শুধু আমি দেখব" / "পরিবার দেখবে"
- সমন্বিত Family Dashboard: কে কত আয় ও ব্যয় করল

### Phase 3: Reports ও AI

- Income growth ও expense growth চার্ট (মাসভিত্তিক)
- গত মাসের সাথে তুলনা (% পরিবর্তন)
- খাতভিত্তিক Pie/Bar চার্ট
- Savings rate ট্রেন্ড
- মাস শেষে AI রিপোর্ট
- PDF/Excel export

### Phase 4: Extra

- Budget সেট করা ও সীমা ছাড়ালে alert
- Recurring এন্ট্রি (প্রতি মাসের বাসা ভাড়া, বেতন)
- ঋণ/ধার ট্র্যাকিং
- রশিদের ছবি আপলোড
- সম্পূর্ণ বাংলা ইন্টারফেস ও বাংলা সংখ্যা সাপোর্ট

---

## ৩. ডাটাবেস স্ট্রাকচার (মূল টেবিল)

| টেবিল | মূল ফিল্ড |
|---|---|
| users | id, name, email |
| households | id, name, currency (BDT) |
| household_members | household_id, user_id, role |
| accounts | id, owner_id, name, type (cash/bkash/bank), balance |
| categories | id, household_id, name, type (income/expense) |
| transactions | id, user_id, household_id, account_id, category_id, type (income/expense/transfer), amount, date, note, visibility |
| budgets | id, category_id, month, limit_amount |
| ai_reports | id, user_id/household_id, month, content, created_at |

---

## ৪. AI রিপোর্ট কীভাবে কাজ করবে

**গুরুত্বপূর্ণ নিয়ম:** হিসাব-নিকাশ (যোগ, শতাংশ, গ্রোথ) করবে আপনার কোড বা SQL, AI না। AI শুধু সেই সংখ্যা ব্যাখ্যা করবে। এতে ভুল সংখ্যা দেওয়ার ঝুঁকি থাকে না।

### ধাপসমূহ

1. মাস শেষে (cron job) প্রতিটি ইউজার/পরিবারের জন্য একটা **summary JSON** তৈরি হবে: মোট আয়-ব্যয়, খাতভিত্তিক যোগফল, গত মাসের তুলনা, সবচেয়ে বড় ৫টি খরচ
2. এই JSON Claude API-তে পাঠানো হবে (কাঁচা সব ট্রানজেকশন নয়, এতে খরচ ও প্রাইভেসি দুটোই ভালো থাকে)
3. AI রিপোর্টে থাকবে: সারসংক্ষেপ, কোন খাতে খরচ বেড়েছে/কমেছে, অস্বাভাবিক খরচ, সঞ্চয় বাড়ানোর ২-৩টা পরামর্শ
4. রিপোর্ট `ai_reports` টেবিলে সেভ হবে, বারবার API কল লাগবে না
5. Family রিপোর্টে শুধু "পরিবার দেখবে" চিহ্নিত এন্ট্রি ধরা হবে

### Summary JSON-এর নমুনা

```json
{
  "month": "2026-10",
  "currency": "BDT",
  "income": { "total": 85000, "prev_month": 80000, "growth_pct": 6.25 },
  "expense": { "total": 52000, "prev_month": 47000, "growth_pct": 10.64 },
  "savings_rate_pct": 38.8,
  "expense_by_category": [
    { "name": "বাজার", "amount": 18000, "prev": 15000 },
    { "name": "বাসা ভাড়া", "amount": 15000, "prev": 15000 }
  ],
  "top_expenses": [
    { "date": "2026-10-12", "category": "চিকিৎসা", "amount": 6500 }
  ]
}
```

---

## ৫. প্রস্তাবিত টেক স্ট্যাক

| অংশ | টুল |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind CSS + shadcn/ui |
| চার্ট | Recharts |
| Backend / DB | Supabase (PostgreSQL + Auth + Row Level Security) অথবা Neon + Prisma |
| AI | Claude API |
| Hosting | Vercel |
| Cron | Vercel Cron বা Supabase scheduled functions |
| মোবাইল | PWA (ফোনে অ্যাপের মতো ইনস্টল করা যাবে) |

বেশিরভাগ ইউজার মোবাইল থেকে এন্ট্রি দেবে, তাই **mobile-first** ডিজাইন করুন।

---

## ৬. সময়সূচি (একজন ডেভেলপার ধরে আনুমানিক)

| ধাপ | কাজ | সময় |
|---|---|---|
| ০ | ডিজাইন, ডাটাবেস স্কিমা, wireframe | ১ সপ্তাহ |
| ১ | MVP: auth, আয়-ব্যয় এন্ট্রি, dashboard | ৩-৪ সপ্তাহ |
| ২ | Family, roles, privacy | ২ সপ্তাহ |
| ৩ | চার্ট, তুলনা, AI রিপোর্ট | ২-৩ সপ্তাহ |
| ৪ | Budget, recurring, export, polish | ২ সপ্তাহ |

---

## ৭. নিরাপত্তা ও প্রাইভেসি

আর্থিক তথ্য সংবেদনশীল, তাই:

- Row Level Security: ইউজার শুধু নিজের ও নিজের পরিবারের ডাটা দেখতে পারবে
- HTTPS, পাসওয়ার্ড hashing (Supabase/Auth.js এটা নিজেই করে)
- নিয়মিত ব্যাকআপ
- ডাটা export ও account delete অপশন

---

## ৮. শুরুর আগে যে সিদ্ধান্তগুলো নিতে হবে

- **মেম্বারদের মধ্যে privacy কতটুকু?** বাবা কি সন্তানের সব খরচ দেখতে পারবে?
- **Transfer হ্যান্ডলিং:** এক wallet থেকে আরেক wallet-এ টাকা সরানো (যেমন bKash থেকে ক্যাশ) আয়-ব্যয় হিসেবে গণনা হবে না, এর জন্য আলাদা "Transfer" টাইপ রাখা ভালো
- **স্কোপ:** শুধু পরিবারের জন্য নাকি পরে সবার জন্য পাবলিক প্রোডাক্ট? পাবলিক হলে subscription ও বেশি security লাগবে

---

## ৯. পরামর্শ

প্রথমে নিজে ও পরিবারে ব্যবহার করে MVP যাচাই করুন, তারপর AI ও বাকি ফিচার যোগ করুন।
