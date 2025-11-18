// src/services/twitchApiService.js
const axios = require('axios');
const logger = require('../config/logger');

let appToken = null;
let appTokenExpiresAt = 0;

async function getAppAccessToken() {
  const now = Date.now();

  if (appToken && now < appTokenExpiresAt - 60_000) {
    return appToken;
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logger.error('TWITCH_CLIENT_ID o TWITCH_CLIENT_SECRET no configurados en .env');
    return null;
  }

  try {
    const res = await axios.post(
      'https://id.twitch.tv/oauth2/token',
      null,
      {
        params: {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials'
        }
      }
    );

    appToken = res.data.access_token;
    appTokenExpiresAt = now + res.data.expires_in * 1000;
    logger.info('Token de app Twitch obtenido correctamente');
    return appToken;
  } catch (err) {
    logger.error('Error obteniendo token de Twitch:', err.response?.data || err);
    return null;
  }
}

/**
 * Obtiene streams en vivo para una lista de logins.
 */
async function getStreamsByLogins(logins) {
  const result = new Map();
  const unique = [...new Set(logins.map(l => l.toLowerCase()))];

  if (!unique.length) return result;

  const token = await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID;

  if (!token || !clientId) {
    return result;
  }

  try {
    const chunks = [];
    const size = 100;
    for (let i = 0; i < unique.length; i += size) {
      chunks.push(unique.slice(i, i + size));
    }

    for (const chunk of chunks) {
      const params = new URLSearchParams();
      for (const login of chunk) {
        params.append('user_login', login);
      }

      const res = await axios.get('https://api.twitch.tv/helix/streams', {
        headers: {
          'Client-Id': clientId,
          'Authorization': `Bearer ${token}`
        },
        params
      });

      const data = res.data.data;
      for (const s of data) {
        const login = s.user_login.toLowerCase();
        result.set(login, s);
      }
    }

    for (const l of unique) {
      if (!result.has(l)) result.set(l, null);
    }

    return result;
  } catch (err) {
    logger.error('Error consultando streams de Twitch:', err.response?.data || err);
    return result;
  }
}

/**
 * Obtiene datos de usuario de Twitch (incluye profile_image_url).
 */
async function getUserById(userId) {
  const token = await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID;

  if (!token || !clientId) return null;

  try {
    const res = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-Id': clientId,
        'Authorization': `Bearer ${token}`
      },
      params: { id: userId }
    });

    const data = res.data.data;
    if (!data || !data.length) return null;
    return data[0];
  } catch (err) {
    logger.error('Error obteniendo datos de usuario Twitch:', err.response?.data || err);
    return null;
  }
}

module.exports = {
  getStreamsByLogins,
  getUserById
};
