# 🤖 AI Multi-Agent Studio Workspace

Workspace orkestrasi tim multi-agen kecerdasan buatan berbasis **arsitektur statis murni (pure client-side static web)** yang siap di-deploy langsung ke **GitHub Pages** tanpa memerlukan server backend atau build step apa pun.

Aplikasi ini menggunakan **Google Gemini REST API** secara langsung dari browser dengan model orkestrasi berantai (*sequential handoff pipeline*), di mana setiap agen bertindak sebagai spesialis yang memproses brief awal proyek serta akumulasi output dari agen-agen sebelumnya.

---

## 📁 1. Struktur File Proyek

Proyek ini dirancang secara modular dan terpisah:

```text
ai-multiagent-studio/
├── index.html          # Antarmuka UI bertema modern dark-mode (Tailwind CSS CDN)
├── agents-config.js    # Konfigurasi tim agen (export const AGENTS_TEAM) - Bebas DOM/UI
├── app.js              # Mesin orkestrasi, BYOK API Key, sequential handoff & rendering
└── README.md           # Dokumentasi dan panduan deployment
```

### Mengapa File Konfigurasi Dipisahkan?
File `agents-config.js` **sengaja dibuat murni tanpa logika DOM atau dependensi browser apa pun**. Hal ini memungkinkan Anda atau tim Anda untuk memodifikasi peran agen, SOP instruksi (*System Prompt*), atau alur tugas (*Task Instruction*) langsung melalui antarmuka web GitHub tanpa resiko merusak kode UI.

---

## ⚡ 2. Tim Agen Default (Sequential Pipeline)

Secara default, tim terdiri dari 3 spesialis berantai:

| Urutan | Nama Agen | Peran / Jabatan | Model Gemini API | Temperatur | Fokus Output |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **1** | **Aura** | *Brand & Creative Strategist* | `gemini-2.5-pro` | `0.7` | Analisis UVP, Persona Audiens, Strategic Angle & Big Idea |
| **2** | **Dexter** | *Senior Copywriter & Visual Prompt Engineer* | `gemini-2.5-flash` | `0.7` | Hook, Ad Copy PAS/AIDA, Video Script, Prompt Gambar AI |
| **3** | **Vance** | *Executive Creative Director & QA Lead* | `gemini-2.5-pro` | `0.7` | Quality Control, Penilaian Skor, Polish, Final Deliverable |

---

## 🚀 3. Cara Menjalankan Secara Lokal

Karena proyek ini menggunakan fitur standar **JavaScript ES Modules** (`import` / `export`), browser modern membatasi protokol `file:///` demi keamanan (CORS). Oleh karena itu, jalankan aplikasi menggunakan web server statis lokal sederhana.

Pilih salah satu cara berikut:

### Opsi A: Menggunakan VS Code (Paling Mudah)
1. Buka folder `ai-multiagent-studio` di VS Code.
2. Pasang ekstensi **Live Server**.
3. Klik kanan file `index.html` lalu pilih **Open with Live Server**.

### Opsi B: Menggunakan Python
Buka terminal/PowerShell di folder proyek, lalu jalankan:
```bash
python -m http.server 8000
```
Buka browser di alamat: `http://localhost:8000`

### Opsi C: Menggunakan Node.js / npx
```bash
npx serve .
```
atau
```bash
npx http-server .
```

---

## ⚙️ 4. Cara Mengubah & Menambah Agen di `agents-config.js`

Buka file `agents-config.js`. Anda akan menemukan array `AGENTS_TEAM`:

```javascript
export const AGENTS_TEAM = [
  {
    id: "agent-1",
    name: "Aura",
    role: "Brand & Creative Strategist",
    model: "gemini-2.5-pro",
    temperature: 0.7,
    avatarBadge: "🧠 Strategist",
    systemPrompt: `...instruksi SOP peran agen...`,
    taskInstruction: `...instruksi spesifik pengerjaan tugas...`
  },
  // Agen berikutnya...
];
```

### Properti Objek Agen:
- `id` *(string)*: Identitas unik agen (contoh: `"agent-4"`).
- `name` *(string)*: Nama panggilan agen (contoh: `"Sinta"`).
- `role` *(string)*: Spesialisasi atau jabatan resmi agen.
- `model` *(string)*: Nama model Gemini resmi, misalnya `"gemini-2.5-pro"` (untuk penalaran mendalam) atau `"gemini-2.5-flash"` (untuk kecepatan dan efisiensi drafting).
- `temperature` *(number)*: Kreativitas model (rentang `0.0` - `1.0`).
- `systemPrompt` *(string)*: Persona SOP agen (aturan, batasan, standar kualitas).
- `taskInstruction` *(string)*: Perintah tugas spesifik tentang apa yang harus diproses dari brief dan output agen sebelumnya.

### Contoh Menambah Agen Baru (Tahap ke-4):
Cukup tambahkan objek baru ke dalam array `AGENTS_TEAM` di `agents-config.js`:

```javascript
{
  id: "agent-4",
  name: "Kanya",
  role: "Social Media Distribution & SEO Specialist",
  model: "gemini-2.5-flash",
  temperature: 0.7,
  avatarBadge: "📱 Social & SEO",
  systemPrompt: `Anda adalah Digital Distribution Specialist yang bertugas memformat materi kampanye menjadi konten siap tayang di LinkedIn, Twitter/X, dan Instagram Threads lengkap dengan strategi hashtag relevan.`,
  taskInstruction: `Bedah materi dari Agent 1, 2, dan 3. Buat jadwal kalender konten 7 hari dan adaptasi naskah menjadi thread Twitter/X serta carousel LinkedIn.`
}
```
> Mesin `app.js` akan secara otomatis mendeteksi agen baru tersebut, membuatkan kartu tahapan visual, dan menyertakan output agen-agen sebelumnya ke agen baru ini tanpa perlu mengubah file HTML atau JS lainnya!

---

## 🌐 5. Cara Deploy Langsung ke GitHub Pages

Aplikasi ini dapat di-hosting **100% gratis** di GitHub Pages tanpa konfigurasi server:

1. **Buat Repository Baru di GitHub:**
   - Masuk ke akun [GitHub](https://github.com) Anda.
   - Klik **New repository**, beri nama (misal: `ai-multiagent-studio`), pilih **Public**, lalu klik **Create repository**.

2. **Unggah File Proyek:**
   - Jalankan perintah git berikut dari terminal komputer Anda:
     ```bash
     git init
     git add .
     git commit -m "feat: initial commit AI Multi-Agent Studio"
     git branch -M main
     git remote add origin https://github.com/USERNAME-ANDA/ai-multiagent-studio.git
     git push -u origin main
     ```
   *(Atau unggah langsung file `index.html`, `agents-config.js`, `app.js`, dan `README.md` via tombol "Upload files" di web GitHub).*

3. **Aktifkan Fitur GitHub Pages:**
   - Masuk ke repository Anda di GitHub.
   - Buka tab **Settings** > menu sebelah kiri pilih **Pages**.
   - Pada bagian **Build and deployment**:
     - **Source**: Pilih `Deploy from a branch`.
     - **Branch**: Pilih `main` dan folder `/ (root)`.
   - Klik tombol **Save**.

4. **Selesai!**
   - Dalam waktu 1-2 menit, GitHub akan mempublikasikan situs web Anda di URL:
     `https://<username-anda>.github.io/ai-multiagent-studio/`

---

## 🔐 6. Keamanan & Kebijakan BYOK (Bring Your Own Key)

- **Tanpa Database Server:** Kunci API Gemini yang dimasukkan pengguna disimpan secara lokal di `localStorage` peramban (*browser*) pengguna masing-masing.
- **Koneksi Langsung:** Seluruh komunikasi AI berjalan melalui protokol HTTPS langsung dari browser pengguna ke endpoint resmi Google:
  `https://generativelanguage.googleapis.com/v1beta/models/...:generateContent?key=...`
- **Privasi:** API key Anda tidak pernah dikirim, dicatat, atau disimpan di server pihak ketiga mana pun.
- Dapatkan API Key Gemini secara gratis di [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## 📄 Lisensi
Didistribusikan di bawah lisensi MIT. Bebas dimodifikasi dan digunakan untuk kebutuhan riset, tim marketing, agensi kreatif, maupun startup Anda.
