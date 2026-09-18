const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { joinAndListen } = require('../lib/voiceListener');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Le bot rejoint ton salon vocal et ecoute tes commandes vocales')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    try {
      const channel = await joinAndListen(interaction);
      await interaction.reply(
        `🎙️ J'ecoute tes commandes vocales dans **${channel.name}**. Seule ta voix compte. ` +
          `Les actions sensibles (bannir, supprimer un role, retirer des permissions) demanderont une ` +
          `confirmation ecrite dans ce salon avant d'etre executees. Utilise \`/leave\` pour arreter.`
      );
    } catch (err) {
      await interaction.reply({ content: err.message, flags: MessageFlags.Ephemeral });
    }
  },
};
