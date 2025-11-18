const { logs } = require('./config');

const levels = ['error', 'warn', 'info', 'debug'];
const currentLevelIndex = levels.indexOf(logs.level);

function log(level, ...args) {
  const idx = levels.indexOf(level);
  if (idx <= currentLevelIndex) {
    const ts = new Date().toISOString();
    console.log(`[${ts}] [${level.toUpperCase()}]`, ...args);
  }
}

module.exports = {
  error: (...args) => log('error', ...args),
  warn:  (...args) => log('warn', ...args),
  info:  (...args) => log('info', ...args),
  debug: (...args) => log('debug', ...args)
};
