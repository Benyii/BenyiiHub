const { logs } = require('./config');

const levels = ['error', 'warn', 'info', 'debug'];

// Antes: `levels.indexOf(logs.level)` devolvía -1 si LOG_LEVEL no estaba
// definido o traía un valor inválido, lo que dejaba TODOS los logs
// desactivados en silencio. Ahora se cae a 'info' por defecto.
const requested = levels.indexOf(String(logs.level || 'info').toLowerCase());
const currentLevelIndex = requested === -1 ? levels.indexOf('info') : requested;

function log(level, ...args) {
  const idx = levels.indexOf(level);
  if (idx === -1 || idx > currentLevelIndex) return;

  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;

  // error/warn van a stderr para que PM2 los separe en el error log.
  if (level === 'error') {
    console.error(prefix, ...args);
  } else if (level === 'warn') {
    console.warn(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

module.exports = {
  error: (...args) => log('error', ...args),
  warn:  (...args) => log('warn', ...args),
  info:  (...args) => log('info', ...args),
  debug: (...args) => log('debug', ...args)
};
