require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { discord } = require('./config/config');

const rest = new REST({ version: '10' }).setToken(discord.token);

(async () => {
  try {
    console.log('🧹 Iniciando limpieza de comandos...');

    /* =========================================================
       1) BORRAR COMANDOS GLOBALES
    ========================================================= */
    console.log('🌍 Eliminando comandos globales...');

    const globalCommands = await rest.get(
      Routes.applicationCommands(discord.clientId)
    );

    for (const cmd of globalCommands) {
      await rest.delete(
        Routes.applicationCommand(discord.clientId, cmd.id)
      );
      console.log(`✅ Global eliminado: ${cmd.name}`);
    }

    /* =========================================================
       2) BORRAR COMANDOS DE TODAS LAS GUILDS
    ========================================================= */
    console.log('🏠 Buscando guilds del bot...');

    const guilds = await rest.get(
      Routes.userGuilds()
    );

    console.log(`🔎 Encontradas ${guilds.length} guild(s)`);

    for (const guild of guilds) {
      console.log(`\n🧹 Limpiando comandos en guild: ${guild.name} (${guild.id})`);

      const guildCommands = await rest.get(
        Routes.applicationGuildCommands(discord.clientId, guild.id)
      );

      for (const cmd of guildCommands) {
        await rest.delete(
          Routes.applicationGuildCommand(discord.clientId, guild.id, cmd.id)
        );
        console.log(`✅ Guild eliminado: ${cmd.name}`);
      }
    }

    console.log('\n✅ Limpieza total completada.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error limpiando comandos:', error);
    process.exit(1);
  }
})();
