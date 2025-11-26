const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const generateRouter = require('./routes/generate');
const submitRouter = require('./routes/submit');

dotenv.config();

const app = express();

app.set('trust proxy', 1);

app.use(express.json());
app.use(morgan('dev'));
app.use(cors());
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
  })
);

app.get('/health', (req, res) => {
  return res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' });
});

app.use('/api', generateRouter);
app.use('/api', submitRouter);

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LearnCheck BackEnd running on :${PORT}`);
});


