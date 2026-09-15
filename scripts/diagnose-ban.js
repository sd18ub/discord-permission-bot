require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits } = require('discord.js');

const { DISCORD_TOKEN, GUILD_ID } = process.env;
const targetUserId = process.argv[2];

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.roles.fetch();

    console.log(`Proprietaire du serveur: ${guild.ownerId}`);
    console.log(`La cible est-elle le proprietaire ? ${guild.ownerId === targetUserId}`);

    const me = await guild.members.fetchMe();
    console.log(`Role le plus haut du bot: ${me.roles.highest.name} (position ${me.roles.highest.position})`);
    console.log(`Le bot a-t-il Administrator ? ${me.permissions.has('Administrator')}`);

    try {
      const target = await guild.members.fetch(targetUserId);
      console.log(`Role le plus haut de la cible: ${target.roles.highest.name} (position ${target.roles.highest.position})`);
    } catch (e) {
      console.log(`Impossible de recuperer la cible comme membre (peut-etre deja partie/absente): ${e.message}`);
    }
  } catch (err) {
    console.error('Erreur:', err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(DISCORD_TOKEN);
