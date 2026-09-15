# Discord Permission Bot

Bot Discord (Node.js / discord.js) pour gerer les roles et permissions de ton serveur via des commandes slash.

## Commandes disponibles

- `/create-role nom permissions couleur affiche_separement mentionnable` - cree un role
- `/edit-role role ajouter retirer` - ajoute/retire des permissions sur un role existant
- `/role-info role` - affiche les permissions d'un role
- `/assign-role membre role action` - donne ou retire un role a un membre

Les commandes de gestion (`create-role`, `edit-role`, `assign-role`) sont limitees par defaut aux membres ayant la permission Discord "Gerer les roles".

## 1. Creer l'application et le bot sur Discord

1. Va sur https://discord.com/developers/applications
2. **New Application** -> donne-lui un nom
3. Dans l'onglet **Bot** :
   - Clique **Add Bot** si necessaire
   - Active l'intent **Server Members Intent** (necessaire pour `/assign-role`)
   - Clique **Reset Token** puis copie le token (garde-le secret, ne le partage jamais)
4. Dans l'onglet **General Information**, copie l'**Application ID** (= CLIENT_ID)
5. Recupere l'**ID de ton serveur** (GUILD_ID) : active le mode developpeur dans Discord (Parametres > Avance > Mode developpeur), puis clic droit sur le serveur > Copier l'ID

## 2. Configurer le projet

```bash
npm install
```

Copie `.env.example` en `.env` et remplis les valeurs :

```
DISCORD_TOKEN=le_token_copie_a_l_etape_precedente
CLIENT_ID=l_application_id
GUILD_ID=l_id_de_ton_serveur
```

## 3. Inviter le bot sur ton serveur

Dans l'onglet **OAuth2 > URL Generator** du portail developpeur :
- Scopes : `bot`, `applications.commands`
- Permissions du bot : au minimum **Manage Roles** (Gerer les roles)

Copie l'URL generee, ouvre-la dans un navigateur, choisis ton serveur et autorise.

**Important** : dans les parametres du serveur > Roles, remonte le role du bot **au-dessus** des roles qu'il devra gerer. Discord interdit a un bot de modifier un role place au-dessus du sien dans la hierarchie.

## 4. Deployer les commandes slash

```bash
npm run deploy
```

A refaire a chaque fois que tu ajoutes/modifies une commande.

## 5. Lancer le bot

```bash
npm start
```

Le bot doit rester lance (ce terminal ouvert) pour repondre aux commandes tant qu'il tourne sur ton PC.

## Liste des noms de permissions

Les noms a utiliser dans `permissions`, `ajouter`, `retirer` correspondent aux cles de `PermissionFlagsBits` de discord.js (ex: `ManageMessages`, `KickMembers`, `BanMembers`, `ManageChannels`, `Administrator`, `ManageRoles`, `ManageGuild`, `MentionEveryone`, `ManageWebhooks`, `ManageNicknames`, etc.). Liste complete : https://discord.js.org/docs/packages/discord.js/main/PermissionFlagsBits:Variable
