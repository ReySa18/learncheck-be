const express = require('express');
const dotenv = require('dotenv');
const generateRouter = require('./routes/generate');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
app.use(express.json());

app.use(morgan('dev'));
app.use(cors());
app.use(helmet());
app.use(rateLimit({
	windowMs: 60 * 1000,
	max: 60
}));

app.get('/health', (req, res) => {
	return res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' });
});

app.use('/api', generateRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`LearnCheck BackEnd running on :${PORT}`);
});
