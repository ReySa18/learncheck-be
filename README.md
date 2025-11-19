# LearnCheck! — Backend Service

Backend untuk proyek Capstone **LearnCheck**, sebuah sistem yang menghasilkan soal latihan otomatis berdasarkan materi dari Dicoding dan preferensi pengguna. Backend ini bertugas mengambil materi dari Mock Dicoding, memprosesnya, lalu mengirimkan materi tersebut ke LLM untuk menghasilkan soal multiple-choice.

## ✨ Fitur Utama
- Endpoint tunggal: `GET /api/generate`
- Mengambil data tutorial dari Mock Dicoding API
- Mengambil preferensi user dari Mock Dicoding API
- Mengolah materi (HTML → text)
- Mengirim materi ke LLM (sekarang masih sekedar mock)
- Validasi schema soal dengan Joi
- In-memory caching untuk menghindari repeated processing
- Error handling & fallback agar API tetap stabil

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
Isi berdasarkan .env.example:
```env
PORT=3000
MOCK_BASE_URL=https://learncheck-dicoding-mock-666748076441.europe-west1.run.app/api
LLM_URL=https://example-llm.local/generate
LLM_API_KEY=changeme
LLM_MODEL=llmodel
CACHE_TTL=600
```

## 🚀 Menjalankan Server
### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 🔧 Environment Variables
| Variable        | Fungsi                     |
| --------------- | -------------------------- |
| `PORT`          | Port express               |
| `MOCK_BASE_URL` | URL Mock Dicoding          |
| `LLM_URL`       | Endpoint provider LLM      |
| `LLM_API_KEY`   | API key untuk LLM          |
| `LLM_MODEL`     | Model LLM                  |
| `CACHE_TTL`     | Cache time-to-live (detik) |

