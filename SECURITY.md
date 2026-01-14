# 🔒 Security Guide - Pengamanan API Key

## ⚠️ Status Keamanan

File `public/firebase-config.js` yang berisi API key Firebase **sudah dihapus dari Git tracking** dan ditambahkan ke `.gitignore`.

**⚠️ PENTING:** File ini tetap ada di local filesystem Anda, tetapi tidak akan ter-commit ke GitHub.

## ✅ Yang Sudah Dilakukan

1. ✅ File `public/firebase-config.js` dihapus dari Git tracking
2. ✅ File `public/firebase-config.example.js` dibuat sebagai template
3. ✅ `.gitignore` diperbarui untuk mengecualikan file sensitif
4. ✅ Dokumentasi setup dibuat (`SETUP.md`)

## 📝 Yang Perlu Dilakukan Sebelum Push ke GitHub

1. **Commit perubahan ini:**
   ```bash
   git add .gitignore
   git add public/firebase-config.example.js
   git add SETUP.md
   git add SECURITY.md
   git commit -m "Security: Remove firebase-config.js from tracking and add template"
   ```

2. **Verifikasi file sensitif tidak ter-commit:**
   ```bash
   git status
   # Pastikan public/firebase-config.js TIDAK muncul
   ```

3. **Jika Anda ingin memastikan API key di GitHub sudah dihapus:**
   - API key masih ada di Git history
   - Untuk benar-benar menghapus dari history, gunakan `git filter-branch` atau `git filter-repo` (berisiko!)
   - **Rekomendasi:** Regenerate API key di Firebase Console sebagai langkah keamanan tambahan

## 🔄 Regenerate API Key (Rekomendasi)

Karena API key sudah pernah ter-commit, sebaiknya regenerate API key di Firebase Console:

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project Anda
3. Project Settings (⚙️) > General
4. Scroll ke "Your apps" > Pilih Web app
5. Klik "Regenerate key" atau buat Web app baru
6. Copy API key baru ke `public/firebase-config.js`

## 📚 File yang Masih Mengandung Hardcoded Config

Beberapa file masih memiliki konfigurasi Firebase yang hardcoded:

- `src/firebaseService.ts` - Line 9-18
- `public/auth.html` - Line 34-43
- `public/leaderboard.html` - Line 20-29
- `public/room.html` - Line 342-351

**Catatan:** Untuk client-side application seperti ini, Firebase API keys **biasanya aman untuk di-expose** karena:
- Firebase menggunakan Security Rules untuk melindungi data
- API key saja tidak cukup untuk mengakses data tanpa autentikasi
- Ini adalah praktik standar untuk aplikasi web client-side

Namun, untuk keamanan maksimal, pertimbangkan:
- Menggunakan Firebase App Check
- Mengimplementasikan backend proxy untuk operasi sensitif
- Memastikan Security Rules sudah dikonfigurasi dengan benar

## 🔒 Best Practices

1. ✅ Gunakan Firebase Security Rules yang ketat
2. ✅ Jangan commit file konfigurasi yang berisi API key
3. ✅ Gunakan template file (`.example.js`) untuk dokumentasi
4. ✅ Regenerate API key secara berkala jika diperlukan
5. ✅ Gunakan Firebase App Check untuk keamanan tambahan
6. ✅ Monitor penggunaan API di Firebase Console

## 📞 Bantuan

Jika Anda menemukan API key yang ter-commit secara tidak sengaja:
1. Hapus dari Git tracking: `git rm --cached <file>`
2. Update `.gitignore`
3. Regenerate API key di Firebase Console
4. Commit perubahan
