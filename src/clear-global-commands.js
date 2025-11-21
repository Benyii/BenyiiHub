// src/clear-global-commands.js
const path = require('node:path');
const { REST, Routes } = require('discord.js');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
});

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error('Faltan DISCORD_TOKEN o DISCORD_CLIENT_ID en el .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('?? Borrando TODOS los comandos globales de la aplicación...');
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: [] }
    );
    console.log('? Comandos globales eliminados.');
  } catch (error) {
    console.error('? Error limpiando comandos globales:', error);
  }
})();
