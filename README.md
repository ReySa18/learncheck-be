# LearnCheck! — Backend Service

Backend untuk proyek Capstone **LearnCheck**, sebuah sistem yang menghasilkan soal latihan otomatis berdasarkan materi dari Dicoding dan preferensi pengguna. Backend ini bertugas mengambil materi dari Mock Dicoding, memprosesnya, lalu mengirimkan materi tersebut ke LLM untuk menghasilkan soal multiple-choice.

## ✨ Fitur Utama

- **Core**: Endpoint `GET /api/generate` untuk generate soal.
- **Integrasi**:
  - Mengambil data tutorial & preferensi user dari Mock Dicoding API.
  - Integrasi LLM (Google Gemini) untuk summarization & question generation.
- **Reliability**:
  - **Retries & Circuit Breaker**: Menggunakan `axios-retry` dengan exponential backoff untuk menangani kegagalan jaringan atau rate limits (429/5xx).
  - **Defensive Parsing**: Pembersihan output LLM (JSON code fences) untuk mencegah error parsing.
- **Quality Assurance**:
  - Menyimpan sample output LLM ke folder `debug_samples/` untuk analisis.
- **Performance**: In-memory caching untuk menghindari repeated processing.

---

## 📦 Instalasi

### 1. Clone

```bash
git clone https://github.com/ReySa18/learncheck-be.git
cd learncheck-be
```

### 2. Install dependency

```bash
npm install
```

### 3. Buat file .env

Isi berdasarkan contoh berikut:

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Mock Service
MOCK_BASE_URL=https://learncheck-dicoding-mock-666748076441.europe-west1.run.app/api

# LLM Service (Google Gemini)
LLM_URL=https://generativelanguage.googleapis.com/v1beta/models
LLM_MODEL=gemini-1.5-flash
LLM_API_KEY=YOUR_GEMINI_API_KEY

# Caching & Security
CACHE_TTL=600
ADMIN_KEY=secret-admin-key
```

## 🚀 Menjalankan Server

### Development

```bash
npm run dev
```

Server akan berjalan di `http://localhost:3000`.

### Production

```bash
npm start
```

## 📡 API Endpoints

### Public

- `GET /health`: Cek status server.
- `GET /api/generate`: Generate soal.
  - Query Params: `tutorial_id`, `user_id`

## 🔧 Environment Variables

| Variable        | Fungsi                                   | Default |
| --------------- | ---------------------------------------- | ------- |
| `PORT`          | Port aplikasi berjalan                   | 3000    |
| `LOG_LEVEL`     | Level logging (debug, info, warn, error) | info    |
| `MOCK_BASE_URL` | URL Mock Dicoding                        | ...     |
| `LLM_URL`       | Base URL API LLM                         | ...     |
| `LLM_API_KEY`   | API Key untuk akses LLM                  | -       |
| `LLM_MODEL`     | Model LLM yang digunakan                 | -       |
| `CACHE_TTL`     | Durasi cache dalam detik                 | 600     |
