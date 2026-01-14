# 🎮 Nusantara Quest - WebXR Multiplayer VR Experience

Experience Indonesian cultural heritage in immersive VR with multiplayer support.

**Nusantara Quest** adalah game petualangan edukasi yang mengajak Anda menjelajahi rumah adat Indonesia dan mengkoleksi baju adat tradisional dari berbagai daerah. Bermain bersama teman-teman Anda dalam dunia VR yang interaktif dan edukatif!

## 🚀 Quick Links

- [📖 Deployment Guide](./DEPLOYMENT.md) - **Complete guide for deploying to Vercel + Railway/Render**
- Live Demo: Coming soon

## 🎬 Preview

```
🏠 Masuki Rumah Adat → 🔍 Cari Baju Adat → 👘 Kumpulkan Koleksi → 🎒 Lihat di Backpack
```

**Baju Adat yang Dapat Dikumpulkan:**
- 👘 Baju Adat Aceh (Rumah Krong Bade)
- 👘 Baju Adat Jawa (Rumah Joglo) 
- 👘 Baju Adat Dayak (Rumah Dayak Kalimantan)
- 👘 Baju Adat Papua (Rumah Honai)
- 👘 Baju Adat Sulawesi Selatan (Rumah Saoraja)
- 👘 Baju Adat Sumatra (Rumah Lampung)

## 📝 Tentang Game

**Nusantara Quest** adalah game petualangan VR multiplayer yang mengajak pemain untuk menjelajahi kekayaan budaya Indonesia. Dalam game ini, pemain akan:

🏛️ **Menjelajahi Rumah Adat** - Masuki berbagai rumah adat dari berbagai daerah di Indonesia:
- Rumah Krong Bade (Aceh)
- Rumah Joglo (Jawa)
- Rumah Dayak (Kalimantan)
- Rumah Honai (Papua)
- Rumah Saoraja (Sulawesi Selatan)
- Rumah Lampung (Sumatra)

👘 **Mencari Baju Adat Tersembunyi** - Tujuan utama game adalah menemukan dan mengkoleksi baju adat yang tersembunyi di dalam setiap rumah adat. Setiap baju adat memiliki karakteristik unik dari daerahnya masing-masing.

👥 **Bermain Bersama Teman** - Mode multiplayer memungkinkan Anda bertemu dan bermain bersama pemain lain secara real-time. Jelajahi rumah adat bersama-sama dan temukan semua baju adat!

🎒 **Sistem Backpack** - Koleksi baju adat yang Anda temukan akan tersimpan di backpack. Buka backpack untuk melihat koleksi Anda dan baca informasi tentang setiap baju adat.

🎮 **Teknologi yang Digunakan:**
- **A-Frame** - Framework WebXR untuk pengalaman VR
- **Networked-Aframe** - Sistem networking multiplayer
- **Socket.IO + EasyRTC** - Komunikasi real-time dan voice chat
- **SolidJS** - Framework UI yang reaktif
- **Tailwind CSS** - Styling modern
- **Three.js** - Rendering 3D

## 🎯 Cara Bermain

### Langkah Awal
1. **Pilih Avatar** - Pilih karakter avatar Anda saat pertama kali masuk
2. **Masukkan Username** - Beri nama untuk karakter Anda
3. **Tunggu Loading** - Tunggu semua asset 3D selesai dimuat

### Gameplay
4. **Jelajahi Dunia** - Gunakan kontrol untuk bergerak di dunia VR
5. **Masuki Rumah Adat** - Dekati pintu rumah adat dan masuk ke dalamnya
6. **Cari Baju Adat** - Eksplorasi setiap sudut rumah untuk menemukan baju adat yang tersembunyi
7. **Klik untuk Mengambil** - Klik pada baju adat untuk menambahkannya ke koleksi Anda
8. **Cek Backpack** - Tekan tombol backpack untuk melihat koleksi yang sudah Anda kumpulkan
9. **Portal Antar Ruangan** - Gunakan portal untuk berpindah ke rumah adat lainnya
10. **Voice Chat** - Aktifkan microphone untuk berbicara dengan pemain lain

### ⌨️ Kontrol Game

**Desktop (Keyboard & Mouse):**
- `W` `A` `S` `D` - Bergerak (Forward, Left, Backward, Right)
- `Mouse` - Arahkan pandangan
- `Left Click` - Interaksi dengan objek (ambil baju adat)
- `Backpack Button` (UI) - Buka/tutup backpack
- `Mic Button` (UI) - Aktifkan/nonaktifkan voice chat

**Mobile (Touch):**
- `Joystick Virtual` - Bergerak
- `Swipe` - Arahkan pandangan
- `Tap` - Interaksi dengan objek
- `UI Buttons` - Akses backpack dan mic

**VR Headset:**
- `VR Controllers` - Bergerak dan berinteraksi
- `Trigger` - Ambil objek
- `Teleportation` - Pindah posisi

## 🏆 Fitur Edukasi

Game ini tidak hanya menghibur, tetapi juga edukatif:
- **Belajar Budaya Indonesia** - Kenali berbagai rumah adat dan baju adat Nusantara
- **Informasi Detail** - Setiap baju adat dilengkapi dengan informasi daerah asalnya
- **Pengalaman Immersive** - Rasakan sensasi berada di dalam rumah adat secara virtual
- **Interaksi Sosial** - Belajar sambil berinteraksi dengan pemain lain

## 🚀 Deployment

**IMPORTANT:** This project requires 2 separate deployments:
1. **Frontend** (Static files) → Deploy to **Vercel**
2. **Backend** (WebSocket server) → Deploy to **Railway/Render/Heroku**

Read the complete deployment guide: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

### Quick Start

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy frontend to Vercel
vercel --prod

# Deploy backend to Railway/Render (see DEPLOYMENT.md)
```

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start backend server (Terminal 1)
npm run dev

# Start webpack dev server with hot reload (Terminal 2)
npm run dev2

# Access at https://localhost:8080
```

## 📋 System Requirements

### Minimum Requirements (Desktop Browser)
- **Browser:** Chrome 90+, Firefox 88+, Edge 90+, Safari 14+
- **RAM:** 4 GB
- **Graphics:** Integrated graphics (Intel HD, AMD Radeon)
- **Internet:** Koneksi internet stabil (minimum 2 Mbps)

### Recommended (VR Experience)
- **VR Headset:** Meta Quest 2/3, HTC Vive, Valve Index, atau compatible WebXR headset
- **Browser:** Chrome atau Firefox dengan WebXR support
- **RAM:** 8 GB atau lebih
- **Graphics:** Dedicated GPU (NVIDIA GTX 1060 / AMD RX 580 atau lebih tinggi)
- **Internet:** 10 Mbps atau lebih untuk multiplayer smooth

### Mobile
- **OS:** Android 9+ atau iOS 13+
- **Browser:** Chrome Mobile, Safari Mobile
- **Storage:** 200 MB free space untuk cache

## 📁 Project Structure

```
nusantara-quest/
├── public/              # Static files (HTML, assets, 3D models)
│   ├── assets/         # Game assets (models, textures)
│   ├── dist/           # Built JS bundles (generated)
│   └── *.html          # Scene files
├── src/                # Source code
│   ├── components.js   # A-Frame components
│   ├── ui.tsx         # SolidJS UI components
│   └── systems/       # A-Frame systems
├── server.js           # Backend WebSocket server
├── vercel.json         # Vercel config (frontend)
├── railway.json        # Railway config (backend)
└── render.yaml         # Render config (backend)
```

## 🛠️ Technologies

- **A-Frame** - WebXR framework
- **Networked-Aframe** - Multiplayer networking
- **Socket.IO** - Real-time communication
- **EasyRTC** - WebRTC for voice chat
- **SolidJS** - Reactive UI framework
- **Tailwind CSS** - Utility-first CSS
- **Webpack** - Module bundler

## 📦 Scripts

```bash
npm run build        # Build production bundle
npm run start        # Start production server
npm run dev          # Start development server
npm run dev2         # Start webpack dev server
npm run lint         # Run ESLint
npm run prettier     # Format code
```

## ✨ Fitur Utama

### 🎮 Gameplay
- ✅ **Petualangan Mencari Baju Adat** - Jelajahi rumah adat dan temukan 6+ baju adat tersembunyi
- ✅ **Sistem Koleksi** - Backpack untuk menyimpan dan melihat koleksi baju adat Anda
- ✅ **Portal Teleportation** - Berpindah antar rumah adat dengan portal magis
- ✅ **Eksplorasi Bebas** - Jelajahi setiap sudut rumah adat dengan kontrol yang mudah

### 🌐 Multiplayer & Sosial
- ✅ **Real-time Multiplayer** - Bermain bersama pemain lain secara bersamaan
- ✅ **Voice Chat** - Berkomunikasi dengan pemain lain menggunakan suara
- ✅ **Avatar Animasi Realistis** - Pilih dan customisasi avatar Anda
- ✅ **Room-based System** - Bergabung dengan room berbeda untuk setiap rumah adat

### 🏛️ Konten Budaya
- ✅ **6 Rumah Adat Indonesia** - Aceh, Jawa, Kalimantan, Papua, Sulawesi Selatan, Sumatra
- ✅ **6+ Baju Adat Tradisional** - Setiap daerah memiliki baju adat yang unik
- ✅ **Model 3D Berkualitas Tinggi** - Detail rumah dan baju adat yang realistis
- ✅ **Informasi Edukatif** - Pelajari asal dan cerita di balik setiap baju adat

### 💻 Teknologi & Akses
- ✅ **WebXR Support** - Dapat dimainkan di VR headset
- ✅ **Desktop Browser** - Mainkan di PC tanpa VR headset
- ✅ **Mobile Support** - Akses via smartphone
- ✅ **Cross-platform** - Windows, Mac, Linux, Android, iOS

## ❓ FAQ & Troubleshooting

### Q: Game loading sangat lambat?
**A:** Tunggu hingga semua asset 3D selesai dimuat. File 3D model memang berukuran besar. Pastikan koneksi internet Anda stabil.

### Q: Tidak bisa melihat pemain lain?
**A:** Pastikan backend WebSocket server sudah berjalan dan terkoneksi. Cek browser console untuk error messages.

### Q: Voice chat tidak bekerja?
**A:** Pastikan browser Anda sudah meminta permission untuk microphone. Klik tombol mic di UI untuk mengaktifkan.

### Q: Frame rate rendah / lag?
**A:** Kurangi kualitas grafis di browser settings atau tutup tab/aplikasi lain yang menggunakan banyak resource.

### Q: Tidak bisa masuk ke rumah adat?
**A:** Dekati pintu rumah adat lebih dekat dan cari area trigger zone (biasanya di depan pintu).

### Q: Baju adat tidak muncul di backpack?
**A:** Pastikan Anda sudah mengklik baju adat tersebut. Cek browser console untuk error. Refresh page jika perlu.

### Q: Bagaimana cara bermain di VR headset?
**A:** Buka game di browser yang support WebXR (Chrome/Firefox), lalu klik tombol VR di pojok kanan bawah layar.

## 🎓 Target Pengguna

Game ini cocok untuk:
- 👨‍🎓 **Pelajar** - Belajar budaya Indonesia dengan cara yang menyenangkan
- 👨‍🏫 **Guru/Pendidik** - Media pembelajaran interaktif tentang kebudayaan Nusantara
- 🏛️ **Museum & Institusi Budaya** - Galeri digital untuk pengunjung
- 🎮 **Gamers** - Pengalaman VR multiplayer yang unik
- 👨‍👩‍👧‍👦 **Keluarga** - Aktivitas edukatif yang bisa dimainkan bersama

## 🛠️ Kontribusi

Kami menerima kontribusi! Jika Anda ingin menambahkan:
- Rumah adat dari daerah lain
- Baju adat baru
- Fitur gameplay baru
- Perbaikan bug

Silakan buat **Pull Request** atau buka **Issue** untuk diskusi.

## 📞 Support & Contact

Jika Anda mengalami masalah atau memiliki pertanyaan:
1. Cek [DEPLOYMENT.md](./DEPLOYMENT.md) untuk panduan lengkap
2. Buka **Issues** di GitHub repository ini
3. Hubungi developer melalui GitHub

## 📄 License

MIT License - See [LICENSE](./LICENSE) file

## 🙏 Acknowledgments

Project ini dibuat berdasarkan:
- [naf-valid-avatars](https://github.com/networked-aframe/naf-valid-avatars) - Multiplayer avatars system
- [naf-nametag-solidjs](https://github.com/networked-aframe/naf-nametag-solidjs) - SolidJS & Tailwind boilerplate
- [A-Frame](https://aframe.io/) - WebXR framework
- [Networked-Aframe](https://github.com/networked-aframe/networked-aframe) - Multiplayer networking

**Terima kasih kepada semua kontributor open-source!**

---

**Made with ❤️ for Indonesian Cultural Heritage**
