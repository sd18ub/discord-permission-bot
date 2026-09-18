// Grammaire de commandes vocales : phrases francaises reconnues -> action Discord.
//
// Les commandes destructrices (retirer des permissions, supprimer un role, bannir) ne
// s'executent JAMAIS directement depuis la voix : elles renvoient une action "en attente"
// que l'appelant doit faire confirmer par ecrit avant execution. Seules les commandes
// sans risque (creer un role, voir les infos d'un role) s'executent immediatement.

function stripAccents(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Version minuscule, utilisee pour les comparaisons simples (confirme/annule) et les
// recherches de role/membre insensibles a la casse. Ne PAS utiliser pour extraire les
// arguments d'une commande (ecraserait la casse d'origine, ex: nom de role cree).
function normalize(text) {
  return stripAccents(text).toLowerCase().trim().replace(/[.,!?]+$/, '').trim();
}

// Nettoyage leger qui garde la casse d'origine, pour le matching des commandes : les
// arguments captures (nom de role, pseudo...) conservent alors leur casse telle que dictee.
function cleanKeepCase(text) {
  return stripAccents(text).trim().replace(/[.,!?]+$/, '').trim();
}

function findRoleByName(guild, name) {
  const target = normalize(name);
  return guild.roles.cache.find((r) => normalize(r.name) === target);
}

async function findMemberByExactName(guild, name) {
  await guild.members.fetch();
  const target = normalize(name);
  return guild.members.cache.find(
    (m) => normalize(m.user.username) === target || (m.nickname && normalize(m.nickname) === target)
  );
}

const COMMANDS = [
  {
    name: 'retirer-permissions-role',
    destructive: true,
    pattern: /^retir(?:e|ez)?\s+toutes?\s+les\s+permissions?\s+(?:du|de|d'|au)\s*(?:role\s+)?(.+)$/i,
    describe: (match) => `Retirer **toutes les permissions** du role "${match[1].trim()}"`,
    async execute(guild, match) {
      const roleName = match[1].trim();
      const role = findRoleByName(guild, roleName);
      if (!role) return `Role "${roleName}" introuvable.`;
      await role.setPermissions([], 'Commande vocale (confirmee)');
      return `Toutes les permissions du role **${role.name}** ont ete retirees.`;
    },
  },
  {
    name: 'supprimer-role',
    destructive: true,
    pattern: /^supprime\s+(?:le\s+)?role\s+(.+)$/i,
    describe: (match) => `Supprimer le role "${match[1].trim()}"`,
    async execute(guild, match) {
      const roleName = match[1].trim();
      const role = findRoleByName(guild, roleName);
      if (!role) return `Role "${roleName}" introuvable.`;
      const name = role.name;
      await role.delete('Commande vocale (confirmee)');
      return `Role **${name}** supprime.`;
    },
  },
  {
    name: 'bannir-membre',
    destructive: true,
    pattern: /^bannis\s+(.+)$/i,
    describe: (match) => `Bannir le membre "${match[1].trim()}"`,
    async execute(guild, match) {
      const targetName = match[1].trim();
      const member = await findMemberByExactName(guild, targetName);
      if (!member) return `Membre "${targetName}" introuvable (le nom exact est requis pour un bannissement vocal).`;
      await guild.members.ban(member.id, { reason: 'Commande vocale (confirmee)' });
      return `Membre **${member.user.tag}** banni.`;
    },
  },
  {
    name: 'creer-role',
    destructive: false,
    pattern: /^cr[ee]e\s+(?:un\s+)?role\s+(?:nomm[ee]\s+)?(.+)$/i,
    async execute(guild, match) {
      const roleName = match[1].trim();
      const role = await guild.roles.create({ name: roleName, reason: 'Commande vocale' });
      return `Role **${role.name}** cree.`;
    },
  },
  {
    name: 'renommer-membre',
    destructive: false,
    pattern: /^renomme\s+(.+?)\s+en\s+(.+)$/i,
    async execute(guild, match) {
      const targetName = match[1].trim();
      const newNickname = match[2].trim();
      const member = await findMemberByExactName(guild, targetName);
      if (!member) return `Membre "${targetName}" introuvable (le nom exact est requis).`;
      await member.setNickname(newNickname, 'Commande vocale');
      return `**${targetName}** renomme en **${newNickname}**.`;
    },
  },
  {
    name: 'info-role',
    destructive: false,
    pattern: /^(?:montre|affiche)\s+(?:les\s+)?infos?\s+(?:du\s+)?role\s+(.+)$/i,
    async execute(guild, match) {
      const roleName = match[1].trim();
      const role = findRoleByName(guild, roleName);
      if (!role) return `Role "${roleName}" introuvable.`;
      const perms = role.permissions.toArray();
      return `Role **${role.name}** - permissions : ${perms.length ? perms.join(', ') : 'aucune'}`;
    },
  },
];

// Renvoie soit { matched: false }, soit une action non-destructrice deja executee
// ({ matched: true, destructive: false, result }), soit une action destructrice en
// attente de confirmation ({ matched: true, destructive: true, description, run }).
async function matchAndExecute(guild, text) {
  const cleaned = cleanKeepCase(text);

  for (const command of COMMANDS) {
    const match = cleaned.match(command.pattern);
    if (!match) continue;

    if (command.destructive) {
      return {
        matched: true,
        destructive: true,
        commandName: command.name,
        description: command.describe(match),
        run: () => command.execute(guild, match),
      };
    }

    try {
      const result = await command.execute(guild, match);
      return { matched: true, destructive: false, commandName: command.name, result };
    } catch (err) {
      return { matched: true, destructive: false, commandName: command.name, result: `Erreur : ${err.message}` };
    }
  }

  return { matched: false };
}

module.exports = { matchAndExecute, normalize };
