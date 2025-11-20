const axios = require('axios');
const ApiError = require('../utils/ApiError');

const MOCK_BASE = process.env.MOCK_BASE_URL || 'https://learncheck-dicoding-mock-666748076441.europe-west1.run.app/api';
const DEFAULT_TIMEOUT = 8000;

async function safeGet(url) {
  try {
    const r = await axios.get(url, { timeout: 8000 });
    return r;
  } catch (err) {
    // jika upstream unreachable, lempar ApiError agar route bisa handle
    if (err.response && err.response.status >= 500) {
      throw new ApiError(502, 'Dicoding mock service error', { upstreamStatus: err.response.status });
    }
    // 404 => not found (biarkan route memutuskan fallback)
    throw err;
  }
}

async function getTutorialContent(id) {
  const url = `${MOCK_BASE}/tutorials/${id}`;
  try {
    const r = await axios.get(url);
    return r.data.data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      throw new ApiError(404, `Tutorial dengan id ${id} tidak ditemukan`);
    }
    throw err;
  }
}

async function getUserPreference(userId) {
  const url = `${MOCK_BASE}/users/${userId}/preferences`;
  try {
    const r = await axios.get(url);
    return r.data.data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      throw new ApiError(404, `User dengan id ${userId} tidak ditemukan`);
    }
    throw err;
  }
}

module.exports = {
  async getTutorialContent(id) {
    const url = `${MOCK_BASE}/tutorials/${id}`;
    try {
      const r = await safeGet(url);

      if (r && r.data && r.data.data) return r.data.data;

      console.warn(`dicodingClient.getTutorialContent: unexpected response shape for ${url}`);
      throw new Error(`Tutorial dengan id=${id} tidak ditemukan.`);
    } catch (e) {
      if (e.response && e.response.status === 404) {
        throw new ApiError(404, `Tutorial dengan id=${id} tidak ditemukan.`);
      }
      console.warn(`dicodingClient.getTutorialContent failed for id=${id}: ${e.message}`);
      throw new ApiError(502, `Gagal mengambil tutorial id=${id}.`);
    }
  },

  async getUserPreference(userId) {
    const url = `${MOCK_BASE}/users/${userId}/preferences`;
    try {
      const r = await safeGet(url);

      if (r && r.data && r.data.data) return r.data.data;

      console.warn(`dicodingClient.getUserPreference: unexpected response shape for ${url}`);
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
