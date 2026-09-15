require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits, OverwriteType, ChannelType } = require('discord.js');

const { DISCORD_TOKEN, GUILD_ID } = process.env;
const targetUserId = process.argv[2];

if (!targetUserId) {
  console.error('Usage: node scripts/deny-view-channel.js <userId>');
  process.exit(1);
}

const NO_OVERWRITE_TYPES = new Set([
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
]);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channels = await guild.channels.fetch();

    let count = 0;
    for (const channel of channels.values()) {
      if (!channel || NO_OVERWRITE_TYPES.has(channel.type)) continue;

      await channel.permissionOverwrites.edit(
        targetUserId,
        { ViewChannel: false },
        { type: OverwriteType.Member, reason: 'Restriction demandee via script deny-view-channel' }
      );
      console.log(`Refuse "Voir le salon" sur: ${channel.name}`);
      count++;
    }

    console.log(`Termine. ${count} salon(s) mis a jour pour l'utilisateur ${targetUserId}.`);
  } catch (err) {
    console.error('Erreur:', err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(DISCORD_TOKEN);
