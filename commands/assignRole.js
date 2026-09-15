const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('assign-role')
    .setDescription('Donne ou retire un role a un membre')
    .addUserOption((opt) =>
      opt.setName('membre').setDescription('Membre cible').setRequired(true)
    )
    .addRoleOption((opt) =>
      opt.setName('role').setDescription('Role a donner/retirer').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('action')
        .setDescription('Donner ou retirer le role')
        .setRequired(true)
        .addChoices(
          { name: 'donner', value: 'add' },
          { name: 'retirer', value: 'remove' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),

  async execute(interaction) {
    const member = interaction.options.getMember('membre');
    const role = interaction.options.getRole('role', true);
    const action = interaction.options.getString('action', true);

    if (!member) {
      await interaction.reply({
        content: 'Membre introuvable sur ce serveur.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      await interaction.reply({
        content:
          "Je ne peux pas gerer ce role : il est plus haut (ou egal) que mon propre role. " +
          "Deplace mon role au-dessus dans les parametres du serveur.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      if (action === 'add') {
        await member.roles.add(role, `Ajoute par ${interaction.user.tag} via /assign-role`);
        await interaction.reply({
          content: `${role} donne a ${member}.`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await member.roles.remove(role, `Retire par ${interaction.user.tag} via /assign-role`);
        await interaction.reply({
          content: `${role} retire de ${member}.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: `Erreur: ${err.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
