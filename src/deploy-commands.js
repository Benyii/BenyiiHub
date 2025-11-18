require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const { discord } = require('./config/config');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    }
  }
}

const rest = new REST({ version: '10' }).setToken(discord.token);

(async () => {
  try {
    console.log('Iniciando registro de slash commands...');

    if (discord.guildIdDev) {
      // Registro en GUILD específica (rápido para desarrollo)
      await rest.put(
        Routes.applicationGuildCommands(discord.clientId, discord.guildIdDev),
        { body: commands }
      );
      console.log('Slash commands registrados en el servidor de desarrollo.');
      process.exit(0);
    } else {
      // Registro global (tarda más, pero se propaga a todos los servers)
      await rest.put(
        Routes.applicationCommands(discord.clientId),
        { body: commands }
      );
      console.log('Slash commands registrados globalmente.');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error registrando comandos:', error);
    process.exit(1);
  }
})();
