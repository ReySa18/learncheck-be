const axios = require('axios');
const { stripHtmlToText } = require('../utils/promptTemplates');
const { validateQuestions } = require('../validators/questionsValidator');

const cache = new Map();
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '600', 10);

function setCache(key, value) {
	const expireAt = Date.now() + CACHE_TTL * 1000;
	cache.set(key, { value, expireAt });
}

function getCache(key) {
	const item = cache.get(key);
	if (!item) return null;
	if (Date.now() > item.expireAt) {
		cache.delete(key);
		return null;
	}
	return item.value;
}

function fallbackQuestions() {
	return [
		{
			id: 'q1',
			question: 'Contoh: Apa topik utama materi di atas?',
			choices: ['Pilihan A','Pilihan B','Pilihan C','Pilihan D'],
			correct_index: 0,
			hint: 'Perhatikan paragraf pertama'
		},
		{
			id: 'q2',
			question: 'Contoh: Mana yang bukan termasuk?',
			choices: ['A','B','C','D'],
			correct_index: 2,
			hint: 'Telusuri definisi'
		},
		{
			id: 'q3',
			question: 'Contoh: Fungsi dari X adalah?',
			choices: ['1','2','3','4'],
			correct_index: 1,
			hint: 'Lihat bagian akhir'
		}
	];
}

module.exports = {
	async generateQuestionsFromContent(htmlContent) {
		const key = `q_${(htmlContent || '').slice(0, 1000)}`;
		const cached = getCache(key);
		if (cached) return cached;

		const text = stripHtmlToText(htmlContent || '');

		// TODO: ganti ini dengan panggilan LLM beneran nanti
		const mockResult = fallbackQuestions();

		// buat validasi hasil mock
		const { error, value } = validateQuestions(mockResult);
		if (!error) {
			setCache(key, value);
			return value;
		}

		console.warn('LLM mock returned invalid question shape:', error.details.map(d => d.message));
		const fb = fallbackQuestions();
		setCache(key, fb);
		return fb;

		/* ---------- Contoh buat panggil LLM beneran
		// build prompt
		const prompt = `Buat 3 soal multiple-choice (4 pilihan) berdasarkan materi berikut. Output JSON array: [{id, question, choices, correct_index, hint}]. Materi:\n\n${text}`;

		try {
			const resp = await axios.post(process.env.LLM_URL, { prompt }, {
				headers: { 'Authorization': `Bearer ${process.env.LLM_API_KEY}` },
				timeout: 15000
			});
			// assume resp.data.questions OR resp.data (string JSON)
			let questions = resp.data && resp.data.questions ? resp.data.questions : resp.data;
			// if string, try parse
			if (typeof questions === 'string') {
				try { questions = JSON.parse(questions); } catch (e) { // ignore parse error
				}
			}
			const { error, value } = validateQuestions(questions || []);
			if (!error) {
				setCache(key, value);
				return value;
			}
			console.warn('LLM returned invalid shape:', error.details.map(d => d.message));
			return fallbackQuestions();
		} catch (e) {
			console.warn('LLM provider error:', e.message);
			return fallbackQuestions();
		}
		*/
	}
};