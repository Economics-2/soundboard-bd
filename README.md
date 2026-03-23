# 🔊 SoundBoard BD

বাংলাদেশের সেরা ইন্সট্যান্ট সাউন্ড বোর্ড — Firebase দ্বারা চালিত।

## ✅ ফিচারসমূহ
- 🎵 MP3 আপলোড ও প্লেব্যাক (Firebase Storage)
- ⬇️ MP3 ডাউনলোড বাটন
- ❤️ ফেভারিট সিস্টেম
- 🔍 সার্চ ও ক্যাটাগরি ফিল্টার
- 💬 WhatsApp / Instagram শেয়ার
- 🔥 Firebase Firestore ডেটাবেস

---

## 🚀 সেটআপ গাইড

### ১. প্রজেক্ট ক্লোন বা ডাউনলোড করুন

### ২. ডিপেন্ডেন্সি ইন্সটল করুন
```bash
npm install
```

### ৩. .env ফাইল সেটআপ করুন
`.env.example` ফাইলটি কপি করে `.env` নাম দিন:
```bash
cp .env.example .env
```
তারপর আপনার Firebase কনফিগ দিয়ে `.env` ফাইল পূরণ করুন।

### ৪. Firebase Console সেটআপ

**Firestore Database:**
1. Firebase Console → Firestore Database → Create Database
2. Rules সেট করুন:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sounds/{soundId} {
      allow read: if true;
      allow write: if true; // প্রোডাকশনে auth যুক্ত করুন
    }
  }
}
```

**Firebase Storage:**
1. Firebase Console → Storage → Get Started
2. Rules সেট করুন:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /sounds/{allPaths=**} {
      allow read: if true;
      allow write: if request.resource.size < 10 * 1024 * 1024
                   && request.resource.contentType.matches('audio/.*');
    }
  }
}
```

### ৫. অ্যাপ চালু করুন
```bash
npm start
```

### ৬. প্রোডাকশন বিল্ড
```bash
npm run build
```

---

## 📁 ফাইল স্ট্রাকচার
```
soundboard-bd/
├── .env                  ← Firebase keys (গোপন রাখুন!)
├── .env.example          ← টেমপ্লেট
├── .gitignore
├── package.json
├── public/
│   └── index.html
└── src/
    ├── firebase.js       ← Firebase config (.env থেকে লোড)
    ├── App.js            ← মেইন কম্পোনেন্ট
    ├── App.css           ← স্টাইল
    └── index.js          ← এন্ট্রি পয়েন্ট
```

---

## ⚠️ গুরুত্বপূর্ণ নোট
- `.env` ফাইল কখনো GitHub-এ push করবেন না
- `.gitignore`-এ `.env` যুক্ত আছে কিনা নিশ্চিত করুন
- প্রোডাকশনে Firebase Security Rules কঠোর করুন
