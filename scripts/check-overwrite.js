require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits } = require('discord.js');

const { DISCORD_TOKEN, GUILD_ID } = process.env;
const targetUserId = process.argv[2];

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channels = await guild.channels.fetch();

    for (const channel of channels.values()) {
      if (!channel) continue;
      const overwrite = channel.permissionOverwrites.cache.get(targetUserId);
      console.log(
        `${channel.name} (type ${channel.type}) : ${
          overwrite ? `overwrite present -> allow=${overwrite.allow.bitfield} deny=${overwrite.deny.bitfield}` : 'aucun overwrite'
        }`
      );
    }
  } catch (err) {
    console.error('Erreur:', err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(DISCORD_TOKEN);
