const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { parsePermissions, VALID_PERMISSIONS } = require('../permissionList');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edit-role')
    .setDescription("Ajoute ou retire des permissions sur un role existant")
    .addRoleOption((opt) =>
      opt.setName('role').setDescription('Role a modifier').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('ajouter')
        .setDescription('Permissions a ajouter, separees par des virgules')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('retirer')
        .setDescription('Permissions a retirer, separees par des virgules')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),

  async execute(interaction) {
    const role = interaction.options.getRole('role', true);
    const addInput = interaction.options.getString('ajouter');
    const removeInput = interaction.options.getString('retirer');

    if (!addInput && !removeInput) {
      await interaction.reply({
        content: 'Precise au moins "ajouter" ou "retirer".',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { valid: toAdd, invalid: invalidAdd } = parsePermissions(addInput);
    const { valid: toRemove, invalid: invalidRemove } = parsePermissions(removeInput);
    const invalid = [...invalidAdd, ...invalidRemove];

    if (invalid.length > 0) {
      await interaction.reply({
        content:
          `Permission(s) inconnue(s): ${invalid.join(', ')}\n` +
          `Permissions valides: ${VALID_PERMISSIONS.join(', ')}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Le role du bot doit etre plus haut que le role cible pour pouvoir le modifier
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      await interaction.reply({
        content:
          "Je ne peux pas modifier ce role : il est plus haut (ou egal) que mon propre role dans la hierarchie. " +
          "Deplace mon role au-dessus dans les parametres du serveur.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const current = role.permissions.toArray();
      const updated = new Set(current);
      toAdd.forEach((p) => updated.add(p));
      toRemove.forEach((p) => updated.delete(p));

      await role.setPermissions(Array.from(updated), {
        reason: `Modifie par ${interaction.user.tag} via /edit-role`,
      });

      await interaction.reply({
        content:
          `Role ${role} mis a jour.\n` +
          (toAdd.length ? `Ajoutees: ${toAdd.join(', ')}\n` : '') +
          (toRemove.length ? `Retirees: ${toRemove.join(', ')}` : ''),
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: `Erreur lors de la modification du role: ${err.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
