const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { stopListening } = require('../lib/voiceListener');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription("Arrete l'ecoute des commandes vocales et quitte le salon")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    const stopped = stopListening(interaction.guild.id);
    await interaction.reply({
      content: stopped ? 'Ecoute des commandes vocales arretee.' : 'Aucune ecoute en cours.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
