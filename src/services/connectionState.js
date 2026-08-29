// src/services/connectionState.js
//
// Estado compartido entre shardDisconnect / shardResume / shardReady para
// evitar spam de "Reconexión del bot" en los canales de logs.
//
// El gateway de Discord corta y reanuda la sesión de forma rutinaria varias
// veces al día (RESUME con replayedEvents ~1). Eso NO es una caída real y no
// debe anunciarse. Solo se anuncia si el shard estuvo caído más de
// DISCONNECT_ANNOUNCE_DELAY_MS y por lo tanto ya se avisó de la desconexión.

const DISCONNECT_ANNOUNCE_DELAY_MS = 15000;

// shardId -> { since:number, code:number|null, announced:boolean, timer:Timeout|null }
const state = new Map();

/**
 * Registra que un shard se desconectó. Programa el anuncio de "Desconexión"
 * para dentro de DISCONNECT_ANNOUNCE_DELAY_MS; si el shard reanuda antes,
 * shardResume/shardReady llamará a clearDisconnect() y el anuncio se cancela.
 *
 * @param {number} shardId
 * @param {number|null} code  código de cierre del WebSocket
 * @param {(entry:object) => any} announceFn  se ejecuta si sigue caído tras el delay
 */
function recordDisconnect(shardId, code, announceFn) {
  const prev = state.get(shardId);
  if (prev && prev.timer) clearTimeout(prev.timer);

  const entry = { since: Date.now(), code: code ?? null, announced: false, timer: null };

  entry.timer = setTimeout(() => {
    entry.announced = true;
    entry.timer = null;
    Promise.resolve()
      .then(() => announceFn(entry))
      .catch(() => {});
  }, DISCONNECT_ANNOUNCE_DELAY_MS);

  if (typeof entry.timer.unref === 'function') entry.timer.unref();

  state.set(shardId, entry);
}

/**
 * Marca el shard como reconectado. Devuelve la entrada previa (o null si no
 * había desconexión registrada). El llamador decide si anuncia la reconexión
 * en base a entry.announced.
 *
 * @param {number} shardId
 * @returns {{ since:number, code:number|null, announced:boolean } | null}
 */
function clearDisconnect(shardId) {
  const entry = state.get(shardId);
  if (!entry) return null;
  if (entry.timer) clearTimeout(entry.timer);
  state.delete(shardId);
  return { since: entry.since, code: entry.code, announced: entry.announced };
}

module.exports = {
  DISCONNECT_ANNOUNCE_DELAY_MS,
  recordDisconnect,
  clearDisconnect
};
