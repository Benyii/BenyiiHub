// src/index.js
const fs = require('node:fs');
const path = require('node:path');
const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Events
} = require('discord.js');
const { discord } = require('./config/config');
const { startTwitchWatcher } = require('./services/twitchWatcher');
const { reloadAllRolePanels } = require('./services/rolePanelService');
const logger = require('./config/logger');

// Intents necesarios para:
// - Slash commands / eventos de interacción
// - Mensajes (para contar mensajes)
// - Voice (para tiempo conectado y canales dinámicos)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages   // 👈 AGREGA ESTA
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User]
});

client.commands = new Collection();

// Cargar comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs
    .readdirSync(folderPath)
    .filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      // 🔒 Si el comando está en la carpeta "admin", márcalo como solo-admin
      if (folder.toLowerCase() === 'admin') {
        command.isAdmin = true;
      }

      client.commands.set(command.data.name, command);
      logger.info(
        `Comando cargado: ${command.data.name}` +
        (command.isAdmin ? ' (ADMIN ONLY)' : '')
      );
    } else {
      logger.warn(`Comando inválido en ${filePath}`);
    }
  }
}

// Cargar eventos
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Evento de cliente listo
client.once(Events.ClientReady, (c) => {
  logger.info(`Bot iniciado como ${c.user.tag}`);

  // Inicia el watcher de Twitch (anuncios de streams)
  startTwitchWatcher(client);
  reloadAllRolePanels(client);
  logger.info('Twitch watcher iniciado.');
});

// Login del bot
client.login(discord.token).catch(err => {
  logger.error('Error al iniciar sesión en Discord:', err);
});

module.exports = client;
