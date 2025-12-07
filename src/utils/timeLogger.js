// utils/timeLogger.js
function startTimer(label) {
  const start = Date.now();
  console.log(`[START] ${label} at ${new Date(start).toISOString()}`);
  return { start, label };
}

function endTimer(timer) {
  const end = Date.now();
  const duration = end - timer.start;
  console.log(`[END] ${timer.label} — ${duration} ms (${(duration / 1000).toFixed(2)}s)`);
}

module.exports = { startTimer, endTimer };
