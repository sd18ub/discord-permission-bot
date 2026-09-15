const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { parsePermissions, VALID_PERMISSIONS } = require('../permissionList');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-role')
    .setDescription('Cree un nouveau role avec des permissions donnees')
    .addStringOption((opt) =>
      opt.setName('nom').setDescription('Nom du role').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('permissions')
        .setDescription(
          'Permissions separees par des virgules (ex: ManageMessages,KickMembers)'
        )
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName('couleur').setDescription('Couleur hex (ex: #ff0000)').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt
        .setName('affiche_separement')
        .setDescription('Afficher les membres de ce role separement (hoist)')
        .setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt
        .setName('mentionnable')
        .setDescription('Le role peut etre mentionne par tous')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),

  async execute(interaction) {
    const name = interaction.options.getString('nom', true);
    const permsInput = interaction.options.getString('permissions');
    const color = interaction.options.getString('couleur');
    const hoist = interaction.options.getBoolean('affiche_separement') ?? false;
    const mentionable = interaction.options.getBoolean('mentionnable') ?? false;

    const { valid, invalid } = parsePermissions(permsInput);

    if (invalid.length > 0) {
      await interaction.reply({
        content:
          `Permission(s) inconnue(s): ${invalid.join(', ')}\n` +
          `Permissions valides: ${VALID_PERMISSIONS.join(', ')}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const role = await interaction.guild.roles.create({
        name,
        permissions: valid,
        color: color || undefined,
        hoist,
        mentionable,
        reason: `Cree par ${interaction.user.tag} via /create-role`,
      });

      await interaction.reply({
        content: `Role ${role} cree avec les permissions: ${
          valid.length ? valid.join(', ') : 'aucune'
        }`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: `Erreur lors de la creation du role: ${err.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
