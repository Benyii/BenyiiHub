// src/services/goodbyeImageService.js
const Canvas = require('@napi-rs/canvas');
const path = require('node:path');
const fs = require('node:fs');
const { AttachmentBuilder } = require('discord.js');
const logger = require('../config/logger');

async function generateGoodbyeImage(member, shortName) {
  try {
    const user = member.user;

    // Banner (1920x1080) → ponlo en assets/
    const basePath = path.join(__dirname, '..', 'assets', 'goodbye_banner.png');
    if (!fs.existsSync(basePath)) return null;

    const canvas = Canvas.createCanvas(1920, 1080);
    const ctx = canvas.getContext('2d');

    const background = await Canvas.loadImage(basePath);
    ctx.drawImage(background, 0, 0, 1920, 1080);

    // Avatar
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 512, forceStatic: false });
    const avatar = await Canvas.loadImage(avatarURL);

    // Clip circular grande
    const avatarSize = 420;
    const avatarX = 960 - avatarSize / 2;
    const avatarY = 340;

    ctx.save();
    ctx.beginPath();
    ctx.arc(960, 550, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Texto principal
    ctx.font = '100px Sans-Black';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 10;

    // "Goodbye!"
    ctx.strokeText('GOODBYE!', 960, 200);
    ctx.fillText('GOODBYE!', 960, 200);

    // Username
    ctx.font = '80px Sans-Black';
    ctx.strokeText(user.username, 960, 880);
    ctx.fillText(user.username, 960, 880);

    const buffer = await canvas.encode('png');
    return new AttachmentBuilder(buffer, { name: 'goodbye.png' });
  } catch (err) {
    logger.error('Error generando imagen de despedida:', err);
    return null;
  }
}

module.exports = {
  generateGoodbyeImage
};
