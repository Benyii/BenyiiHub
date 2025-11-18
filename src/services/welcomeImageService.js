// src/services/welcomeImageService.js
const path = require('node:path');
const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const logger = require('../config/logger');

const BANNER_PATH = path.join(__dirname, '..', 'assets', 'welcome_banner.png');

// Coordenadas aproximadas del círculo (puedes ajustarlas si quieres)
const AVATAR_RADIUS = 130;
const AVATAR_CENTER_Y_FACTOR = 0.35; // 35% de la altura (un poco arriba del centro)

/**
 * Dibuja el banner base y retorna { canvas, ctx }
 */
async function createBaseCanvas() {
  const banner = await loadImage(BANNER_PATH);
  const canvas = createCanvas(banner.width, banner.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(banner, 0, 0, banner.width, banner.height);

  return { canvas, ctx };
}

/**
 * Dibuja el avatar circular en el centro superior.
 */
async function drawAvatar(ctx, canvas, member) {
  const avatarURL = member.user.displayAvatarURL({
    extension: 'png',
    size: 512
  });

  const avatar = await loadImage(avatarURL);

  const cx = canvas.width / 2;
  const cy = canvas.height * AVATAR_CENTER_Y_FACTOR;
  const r = AVATAR_RADIUS;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(avatar, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();

  // Borde alrededor del avatar
  ctx.beginPath();
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#D9D9D9';
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2, true);
  ctx.stroke();
}

/**
 * Escribe nombre + "Bienvenido/a" o texto custom.
 */
function drawTextWelcome(ctx, canvas, member, mode = 'welcome') {
  const displayName = member.displayName || member.user.username;
  const cx = canvas.width / 2;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#6b6b6b';
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 4;

  if (mode === 'welcome') {
    // Nombre
    ctx.font = 'bold 64px Sans';
    const nameY = canvas.height - 110;
    ctx.strokeText(displayName, cx, nameY);
    ctx.fillText(displayName, cx, nameY);

    // Bienvenido/a
    ctx.font = 'bold 80px Sans';
    const welcomeY = canvas.height - 30;
    const text = 'Bienvenido/a';
    ctx.strokeText(text, cx, welcomeY);
    ctx.fillText(text, cx, welcomeY);
  } else if (mode === 'boost') {
    // Nombre
    ctx.font = 'bold 64px Sans';
    const nameY = canvas.height - 120;
    ctx.strokeText(displayName, cx, nameY);
    ctx.fillText(displayName, cx, nameY);

    // Texto de boost
    ctx.font = 'bold 60px Sans';
    const boostY = canvas.height - 40;
    const text = 'ha boosteado el servidor 💜';
    ctx.strokeText(text, cx, boostY);
    ctx.fillText(text, cx, boostY);
  }
}

async function generateWelcomeImage(member) {
  try {
    const { canvas, ctx } = await createBaseCanvas();
    await drawAvatar(ctx, canvas, member);
    drawTextWelcome(ctx, canvas, member, 'welcome');

    const buffer = canvas.toBuffer('image/png');
    return new AttachmentBuilder(buffer, {
      name: `welcome-${member.id}.png`
    });
  } catch (err) {
    logger.error('Error generando imagen de bienvenida:', err);
    return null;
  }
}

async function generateBoostImage(member) {
  try {
    const { canvas, ctx } = await createBaseCanvas();
    await drawAvatar(ctx, canvas, member);
    drawTextWelcome(ctx, canvas, member, 'boost');

    const buffer = canvas.toBuffer('image/png');
    return new AttachmentBuilder(buffer, {
      name: `boost-${member.id}.png`
    });
  } catch (err) {
    logger.error('Error generando imagen de boost:', err);
    return null;
  }
}

module.exports = {
  generateWelcomeImage,
  generateBoostImage
};
