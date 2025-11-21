const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const ApiError = require('../utils/ApiError');

const MOCK_BASE =
  process.env.MOCK_BASE_URL ||
  'https://learncheck-dicoding-mock-666748076441.europe-west1.run.app/api';
const DEFAULT_TIMEOUT = 8000;

const client = axios.create({
  baseURL: MOCK_BASE,
  timeout: DEFAULT_TIMEOUT,
});

// Konfigurasi retry dengan exponential backoff untuk Dicoding Mock Service
axiosRetry(client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Ulangi saat ada masalah pada jaringan
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response && error.response.status >= 500)
    );
  },
});

async function safeGet(endpoint) {
  try {
    const r = await client.get(endpoint);
    return r;
  } catch (err) {
    // jika upstream unreachable, lempar ApiError agar route bisa handle
    if (err.response && err.response.status >= 500) {
      throw new ApiError(502, 'Dicoding mock service error', {
        upstreamStatus: err.response.status,
      });
    }
    // 404 => not found (biarkan route memutuskan fallback)
    throw err;
  }
}

module.exports = {
  async getTutorialContent(id) {
    const endpoint = `/tutorials/${id}`;
    try {
      const r = await safeGet(endpoint);

      if (r && r.data && r.data.data) return r.data.data;

      console.warn(`dicodingClient.getTutorialContent: unexpected response shape for ${endpoint}`);
      throw new ApiError(404, `Tutorial dengan id=${id} tidak ditemukan.`);
    } catch (e) {
      if (e.response && e.response.status === 404) {
        throw new ApiError(404, `Tutorial dengan id=${id} tidak ditemukan.`);
      }
      console.warn(`dicodingClient.getTutorialContent failed for id=${id}: ${e.message}`);
      throw new ApiError(502, `Gagal mengambil tutorial id=${id}.`);
    }
  },

  async getUserPreference(userId) {
    const endpoint = `/users/${userId}/preferences`;
    try {
      const r = await safeGet(endpoint);

      if (r && r.data && r.data.data) return r.data.data;

      console.warn(`dicodingClient.getUserPreference: unexpected response shape for ${endpoint}`);
      throw new ApiError(404, `User dengan id=${userId} tidak ditemukan.`);
    } catch (e) {
      if (e.response && e.response.status === 404) {
        throw new ApiError(404, `User dengan id=${userId} tidak ditemukan.`);
      }
      console.warn(`dicodingClient.getUserPreference failed for userId=${userId}: ${e.message}`);
      throw new ApiError(502, `Gagal mengambil user id=${userId}.`);
    }
  },
};
