// src/services/rankCardService.js
const { createCanvas, loadImage } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const logger = require('../config/logger');

const CARD_WIDTH = 1000;
const CARD_HEIGHT = 250;

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function generateRankCard(member, { xp, lvl, rank }) {
  try {
    const user = member.user;

    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    const ctx = canvas.getContext('2d');

    // Fondo principal
    ctx.fillStyle = '#050816'; // azul muy oscuro
    drawRoundedRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, 30);
    ctx.fill();

    // Círculos decorativos
    ctx.fillStyle = '#0b1024';
    for (let i = 0; i < 12; i++) {
      const r = 8 + Math.random() * 18;
      const x = Math.random() * CARD_WIDTH;
      const y = Math.random() * CARD_HEIGHT;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Aro grande celeste detrás del avatar
    const centerX = 125;
    const centerY = CARD_HEIGHT / 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
    ctx.fillStyle = '#009dff';
    ctx.fill();

    // Avatar
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: false });
    const avatarImg = await loadImage(avatarURL);

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 70, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImg, centerX - 70, centerY - 70, 140, 140);
    ctx.restore();

    // Pequeña luna amarilla en la esquina del avatar
    ctx.beginPath();
    ctx.arc(centerX + 55, centerY + 55, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#ffb84d';
    ctx.fill();

    // Username
    ctx.font = 'bold 32px "Sans"';
    ctx.fillStyle = '#15b3ff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const username = user.username.length > 18 ? user.username.slice(0, 15) + '…' : user.username;
    ctx.fillText(username, 230, 85);

    // LVL y RANK (derecha arriba)
    ctx.font = '24px "Sans"';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#30c0ff';
    ctx.fillText('LVL', 640, 70);

    ctx.font = 'bold 42px "Sans"';
    ctx.fillText(String(lvl), 690, 72);

    ctx.font = '24px "Sans"';
    ctx.fillText('RANK', 780, 70);

    ctx.font = 'bold 42px "Sans"';
    ctx.fillText(String(rank), 860, 72);

    // Cálculo de progreso de XP para el nivel actual
    const xpPerLevel = 100; // mismo valor que en statsService
    const xpForPrevLevel = (lvl - 1) * xpPerLevel;
    const xpForNextLevel = lvl * xpPerLevel;
    const currentLevelXp = Math.max(0, xp - xpForPrevLevel);
    const levelTotalXp = xpForNextLevel - xpForPrevLevel || xpPerLevel;
    const progress = Math.max(0, Math.min(1, currentLevelXp / levelTotalXp));

    // Texto XP (derecha, mitad)
    ctx.font = '28px "Sans"';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#2ec0ff';
    const xpText = `${currentLevelXp}/${levelTotalXp} xp`;
    ctx.fillText(xpText, CARD_WIDTH - 60, 120);

    // Barra de progreso
    const barX = 230;
    const barY = 165;
    const barW = 720;
    const barH = 36;
    const radius = barH / 2;

    // Barra base
    drawRoundedRect(ctx, barX, barY, barW, barH, radius);
    ctx.fillStyle = '#0b1933';
    ctx.fill();

    // Barra rellena
    const filledW = Math.max(radius * 2, barW * progress);
    drawRoundedRect(ctx, barX, barY, filledW, barH, radius);
    ctx.fillStyle = '#22a1ff';
    ctx.fill();

    // Pequeños círculos debajo de la barra
    ctx.fillStyle = '#0b1933';
    ctx.beginPath();
    ctx.arc(barX + barW * 0.2, barY + barH + 30, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(barX + barW * 0.7, barY + barH + 25, 12, 0, Math.PI * 2);
    ctx.fill();

    const buffer = canvas.toBuffer('image/png');
    return new AttachmentBuilder(buffer, { name: 'rank.png' });
  } catch (err) {
    logger.error('Error generando Rank Card:', err);
    return null;
  }
}

module.exports = {
  generateRankCard
};
