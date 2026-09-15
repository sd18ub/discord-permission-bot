require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits } = require('discord.js');

const { DISCORD_TOKEN, GUILD_ID } = process.env;
const targetUserId = process.argv[2];
const reason = process.argv.slice(3).join(' ') || 'Ban demande via script ban-user';

if (!targetUserId) {
  console.error('Usage: node scripts/ban-user.js <userId> [raison]');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.ban(targetUserId, { reason });
    console.log(`Utilisateur ${targetUserId} banni. Raison: ${reason}`);
  } catch (err) {
    console.error('Erreur:', err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(DISCORD_TOKEN);
