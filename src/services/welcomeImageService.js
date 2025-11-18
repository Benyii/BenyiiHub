const path = require('node:path');
const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const logger = require('../config/logger');

const BANNER_PATH = path.join(__dirname, '..', 'assets', 'welcome_banner.png');

// Banner pensado en 1920x1080
// Avatar aún más grande y centrado
const AVATAR_RADIUS = 230;
const AVATAR_CENTER_Y_FACTOR = 0.45; // 45% de alto

async function createBaseCanvas() {
  const banner = await loadImage(BANNER_PATH);
  const canvas = createCanvas(banner.width, banner.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(banner, 0, 0, banner.width, banner.height);

  return { canvas, ctx };
}

async function drawAvatar(ctx, canvas, member) {
  const isAnimated = member.user.avatar && member.user.avatar.startsWith('a_');

  const avatarURL = member.user.displayAvatarURL({
    extension: isAnimated ? 'gif' : 'png',
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

  // Borde blanco
  ctx.beginPath();
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#FFFFFF';
  ctx.arc(cx, cy, r + 10, 0, Math.PI * 2, true);
  ctx.stroke();

  // Borde exterior oscuro suave
  ctx.beginPath();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#00000088';
  ctx.arc(cx, cy, r + 22, 0, Math.PI * 2, true);
  ctx.stroke();
}

/**
 * Texto blanco con borde negro.
 * mode = 'welcome' o 'boost'
 */
function drawText(ctx, canvas, member, mode, shortGuildName) {
  const displayName = member.displayName || member.user.username;
  const cx = canvas.width / 2;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;

  if (mode === 'welcome') {
    // Nombre
    ctx.font = 'bold 80px Sans';
    const nameY = canvas.height - 210;
    ctx.strokeText(displayName, cx, nameY);
    ctx.fillText(displayName, cx, nameY);

    // "Bienvenido/a"
    ctx.font = 'bold 96px Sans';
    const welcomeY = canvas.height - 115;
    const text1 = 'Bienvenido/a';
    ctx.strokeText(text1, cx, welcomeY);
    ctx.fillText(text1, cx, welcomeY);

    // "al servidor (Nombre)"
    const serverName = shortGuildName || 'al servidor';
    ctx.font = 'bold 72px Sans';
    const serverY = canvas.height - 30;
    const text2 = `al servidor (${serverName})`;
    ctx.strokeText(text2, cx, serverY);
    ctx.fillText(text2, cx, serverY);
  } else if (mode === 'boost') {
    // Nombre
    ctx.font = 'bold 80px Sans';
    const nameY = canvas.height - 180;
    ctx.strokeText(displayName, cx, nameY);
    ctx.fillText(displayName, cx, nameY);

    // Texto de boost
    ctx.font = 'bold 72px Sans';
    const boostY = canvas.height - 70;
    const text = 'ha boosteado el servidor 💜';
    ctx.strokeText(text, cx, boostY);
    ctx.fillText(text, cx, boostY);
  }
}

async function generateWelcomeImage(member, shortGuildName) {
  try {
    const { canvas, ctx } = await createBaseCanvas();
    await drawAvatar(ctx, canvas, member);
    drawText(ctx, canvas, member, 'welcome', shortGuildName);

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
    drawText(ctx, canvas, member, 'boost');

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
