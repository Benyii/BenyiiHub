// src/index.js
const fs = require('node:fs');
const path = require('node:path');
const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials
} = require('discord.js');
const { discord } = require('./config/config');
const pool = require('./config/database');
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

// La inicialización "on ready" (twitch watcher, paneles de roles, sync de
// guilds, avisos) vive toda en src/events/ready.js. Antes había además un
// segundo handler de ClientReady aquí, que duplicaba el log "Bot iniciado".

// Red de seguridad: no dejar caer el proceso por promesas sin manejar.
process.on('unhandledRejection', (reason) => {
  logger.error('Promesa rechazada sin manejar:', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Excepción no capturada:', err);
});

// Apagado limpio (PM2 manda SIGINT en restart/stop).
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Recibida señal ${signal}. Cerrando limpiamente...`);

  const timer = setTimeout(() => process.exit(0), 5000);
  if (typeof timer.unref === 'function') timer.unref();

  try { await client.destroy(); } catch (e) { logger.error('Error cerrando cliente de Discord:', e); }
  try { await pool.end(); } catch (e) { logger.error('Error cerrando el pool de MySQL:', e); }

  process.exit(0);
}
['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));

// Login del bot
client.login(discord.token).catch(err => {
  logger.error('Error al iniciar sesión en Discord:', err);
});

module.exports = client;
