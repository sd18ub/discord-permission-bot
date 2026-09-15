const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-info')
    .setDescription("Affiche les permissions actuelles d'un role")
    .addRoleOption((opt) =>
      opt.setName('role').setDescription('Role a inspecter').setRequired(true)
    )
    .setDMPermission(false),

  async execute(interaction) {
    const role = interaction.options.getRole('role', true);
    const perms = role.permissions.toArray();

    await interaction.reply({
      content:
        `Role: ${role}\n` +
        `Position: ${role.position}\n` +
        `Permissions (${perms.length}): ${perms.length ? perms.join(', ') : 'aucune'}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
