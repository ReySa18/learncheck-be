const express = require('express');
const dotenv = require('dotenv');
const generateRouter = require('./routes/generate');

dotenv.config();

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
	return res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' });
});

app.use('/api', generateRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`LearnCheck BackEnd running on :${PORT}`);
});
