const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Envía un mensaje embebido en este canal')
    .addStringOption(opt =>
      opt.setName('title')
        .setDescription('Título del embed')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('description')
        .setDescription('Descripción del embed')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('color')
        .setDescription('Color en HEX (ej: #00AEFF)')
        .setRequired(false)
    ),
  async execute(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const colorStr = interaction.options.getString('color') || '#00AEFF';

    let color = 0x00aeff;
    try {
      color = parseInt(colorStr.replace('#', ''), 16);
    } catch {
      // fallback
    }

    await interaction.reply({
      embeds: [
        {
          title,
          description,
          color
        }
      ]
    });
  }
};
