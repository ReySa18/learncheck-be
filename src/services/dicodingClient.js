const axios = require('axios');

const MOCK_BASE = process.env.MOCK_BASE_URL || 'https://learncheck-dicoding-mock-666748076441.europe-west1.run.app/api';
const DEFAULT_TIMEOUT = 8000;

async function safeGet(url) {
	try {
		const r = await axios.get(url, { timeout: DEFAULT_TIMEOUT });
		return r;
	} catch (err) {
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
				throw new Error(`Tutorial dengan id=${id} tidak ditemukan.`);
			}
			console.warn(`dicodingClient.getTutorialContent failed for id=${id}: ${e.message}`);
			throw new Error(`Gagal mengambil tutorial id=${id}.`);
		}
	},

	async getUserPreference(userId) {
		const url = `${MOCK_BASE}/users/${userId}/preferences`;
		try {
			const r = await safeGet(url);

			if (r && r.data && r.data.data) return r.data.data;

			console.warn(`dicodingClient.getUserPreference: unexpected response shape for ${url}`);
			throw new Error(`User dengan id=${userId} tidak ditemukan.`);
		} catch (e) {
			if (e.response && e.response.status === 404) {
				throw new Error(`User dengan id=${userId} tidak ditemukan.`);
			}
			console.warn(`dicodingClient.getUserPreference failed for userId=${userId}: ${e.message}`);
			throw new Error(`Gagal mengambil user id=${userId}.`);
		}
	}
};