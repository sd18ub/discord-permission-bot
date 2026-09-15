# Discord Permission Bot

Bot Discord (Node.js / discord.js) pour gerer les roles et permissions de ton serveur via des commandes slash.

## Commandes disponibles

- `/create-role nom permissions couleur affiche_separement mentionnable` - cree un role
- `/edit-role role ajouter retirer` - ajoute/retire des permissions sur un role existant
- `/role-info role` - affiche les permissions d'un role
- `/assign-role membre role action` - donne ou retire un role a un membre
- `/record start` - annonce publiquement le debut d'un enregistrement puis rejoint ton salon vocal
- `/record stop` - arrete l'enregistrement, convertit l'audio et indique ou sont sauvegardes les fichiers

Les commandes de gestion (`create-role`, `edit-role`, `assign-role`, `record`) sont limitees par defaut aux membres ayant la permission Discord "Gerer les roles".

### Enregistrement vocal (`/record`)

- `/record start` poste d'abord un message visible dans le salon texte annoncant l'enregistrement (qui l'a demande, dans quel salon vocal) avant que le bot ne rejoigne le vocal. C'est le seul mecanisme de consentement : assure-toi que les personnes presentes voient ce message avant de parler.
- Un seul enregistrement actif a la fois par serveur.
- `/record stop` sauvegarde un fichier `.wav` par personne ayant parle, dans `recordings/<horodatage>_<id-du-salon>/` (dossier ignore par git, jamais commite).
- Necessite `ffmpeg-static` (installe automatiquement avec `npm install`, aucun ffmpeg systeme requis) et l'intent **Server Members Intent** deja active pour `/assign-role`.

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

## Scripts ponctuels (`scripts/`)

En dehors des commandes slash, quelques scripts a lancer manuellement avec `node scripts/<fichier>.js <args>` pour des actions ciblees (ils utilisent le meme `.env`) :

- `deny-view-channel.js <userId>` - refuse la permission "Voir le salon" a un membre precis sur tous les salons du serveur
- `reset-view-channel.js <userId>` - supprime cette restriction (annule `deny-view-channel.js`)
- `check-overwrite.js <userId>` - liste les eventuels overwrites de permission pour un membre, salon par salon
- `ban-user.js <userId> [raison]` - bannit un membre du serveur (impossible sur le proprietaire du serveur, restriction imposee par Discord)
- `diagnose-ban.js <userId>` - affiche la hierarchie des roles (bot vs cible) et si la cible est le proprietaire, utile pour comprendre un echec de ban/kick
