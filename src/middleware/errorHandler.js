const ApiError = require('../utils/ApiError');

function errorHandler(err, req, res, _next) {
  // jika error buatan kita (ApiError)
  if (err instanceof ApiError) {
    const status = err.statusCode || 500;
    const payload = {
      status: 'error',
      message: err.message || 'Internal server error',
    };
    // kirim details di development
    if (process.env.NODE_ENV === 'development' && err.details) payload.details = err.details;
    return res.status(status).json(payload);
  }

  // axios error dari upstream (mis. dicoding / llm)
  if (err.isAxiosError) {
    const status = err.response?.status || 502;
    const message = err.response?.data?.message || 'Upstream service error';
    const payload = { status: 'error', message };
    if (process.env.NODE_ENV === 'development') payload.upstream = err.response?.data || null;
    return res.status(status).json(payload);
  }

  // fallback: unknown error
  console.error('[UNHANDLED ERROR]', err && err.stack ? err.stack : err);
  return res.status(500).json({ status: 'error', message: 'internal server error' });
}

module.exports = errorHandler;
