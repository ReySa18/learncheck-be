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
			return { content: '' };
		} catch (e) {
			console.warn(`dicodingClient.getTutorialContent failed for id=${id}: ${e.message}`);
			return { content: '<p>[Fallback content] Materi tidak tersedia saat ini.</p>' };
		}
	},

	async getUserPreference(userId) {
		const url = `${MOCK_BASE}/users/${userId}/preferences`;
		try {
			const r = await safeGet(url);
			if (r && r.data && r.data.data) return r.data.data;
			console.warn(`dicodingClient.getUserPreference: unexpected response shape for ${url}`);
			return { preference: {} };
		} catch (e) {
			if (e.response && e.response.status === 404) {
				console.warn(`dicodingClient.getUserPreference: preferences not found for userId=${userId} (404). Using fallback empty preference.`);
			} else {
				console.warn(`dicodingClient.getUserPreference failed for userId=${userId}: ${e.message}`);
			}
			return { preference: {} };
		}
	}
};