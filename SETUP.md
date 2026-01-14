# 🔐 Setup Konfigurasi Firebase

File ini menjelaskan cara mengamankan API key Firebase sebelum upload ke GitHub.

## ⚠️ Penting: Keamanan API Key

**Firebase API keys di client-side application pada umumnya aman untuk di-expose** karena:
- Firebase API keys dirancang untuk digunakan di client-side
- Keamanan data dijamin oleh Firebase Security Rules, bukan dengan menyembunyikan API key
- API key saja tidak dapat mengakses data tanpa autentikasi yang tepat

Namun, untuk praktik terbaik dan keamanan tambahan, ikuti langkah-langkah di bawah ini.

## 📝 Langkah-langkah Setup

### 1. Salin Template Konfigurasi

```bash
# Salin file template ke file konfigurasi aktual
cp public/firebase-config.example.js public/firebase-config.js
```

### 2. Isi Konfigurasi Firebase

Buka `public/firebase-config.js` dan isi dengan kredensial Firebase project Anda:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};
```

### 3. File yang Perlu Diperbarui

Beberapa file masih memiliki konfigurasi Firebase yang hardcoded. Anda perlu:

1. **`src/firebaseService.ts`** - Gunakan environment variables atau import dari config
2. **`public/auth.html`** - Gunakan `firebase-config.js` atau environment variables
3. **`public/leaderboard.html`** - Gunakan `firebase-config.js` atau environment variables  
4. **`public/room.html`** - Gunakan `firebase-config.js` atau environment variables

### 4. Pastikan File Sensitif Tidak Ter-commit

File berikut sudah ditambahkan ke `.gitignore`:
- `public/firebase-config.js`
- `*.env`
- `*.key`, `*.pem`
- `secrets/`

## 🔒 Keamanan Tambahan

### Firebase Security Rules

Pastikan Firebase Security Rules Anda sudah dikonfigurasi dengan benar:

**Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /leaderboard/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**Realtime Database Rules:**
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

### Firebase App Check (Opsional)

Untuk keamanan tambahan, pertimbangkan menggunakan [Firebase App Check](https://firebase.google.com/docs/app-check) untuk melindungi resources Anda dari abuse.

## 📤 Sebelum Push ke GitHub

1. ✅ Pastikan `public/firebase-config.js` tidak ter-commit (sudah di `.gitignore`)
2. ✅ Pastikan file `public/firebase-config.example.js` sudah ter-commit (sebagai template)
3. ✅ Pastikan tidak ada API key yang hardcoded di file yang akan di-commit
4. ✅ Verifikasi dengan: `git status` - `firebase-config.js` tidak boleh muncul

## 🚨 Jika API Key Sudah Ter-commit

Jika Anda sudah terlanjur commit API key ke Git, lakukan:

1. **Hapus dari Git tracking (tapi tetap di local):**
   ```bash
   git rm --cached public/firebase-config.js
   git commit -m "Remove firebase-config.js from tracking"
   ```

2. **Rotasi API Key di Firebase Console:**
   - Buka Firebase Console
   - Project Settings > General
   - Scroll ke "Your apps" > Web app
   - Regenerate API key

3. **Update `firebase-config.js` dengan API key baru**

## 📚 Referensi

- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [Firebase API Keys Explained](https://stackoverflow.com/questions/37482366/is-it-safe-to-expose-firebase-apikey-to-the-public)
