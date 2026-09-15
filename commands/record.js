const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  EndBehaviorType,
  entersState,
} = require('@discordjs/voice');
const prism = require('prism-media');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

// Une session active par serveur (guildId -> session)
const activeSessions = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('record')
    .setDescription('Enregistre le salon vocal (avec annonce visible)')
    .addSubcommand((sub) =>
      sub.setName('start').setDescription("Demarre l'enregistrement du salon vocal ou tu es")
    )
    .addSubcommand((sub) =>
      sub.setName('stop').setDescription("Arrete l'enregistrement en cours et sauvegarde l'audio")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'start') return startRecording(interaction);
    return stopRecording(interaction);
  },
};

async function startRecording(interaction) {
  const voiceChannel = interaction.member.voice?.channel;

  if (!voiceChannel) {
    await interaction.reply({
      content: 'Tu dois etre dans un salon vocal pour lancer un enregistrement.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (activeSessions.has(interaction.guild.id)) {
    await interaction.reply({
      content: 'Un enregistrement est deja en cours sur ce serveur.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Annonce visible AVANT de commencer, dans le salon texte -> tout le monde le voit
  await interaction.reply(
    `🔴 **Enregistrement demarre** dans le salon vocal **${voiceChannel.name}**, demande par ${interaction.user}.\n` +
      'Toute personne presente dans ce salon vocal est en train d\'etre enregistree tant que ce message reste actif.'
  );

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: interaction.guild.id,
    adapterCreator: interaction.guild.voiceAdapterCreator,
    selfDeaf: false,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  } catch (err) {
    connection.destroy();
    await interaction.followUp("Impossible de rejoindre le salon vocal : " + err.message);
    return;
  }

  const outputDir = path.join(
    __dirname,
    '..',
    'recordings',
    `${Date.now()}_${voiceChannel.id}`
  );
  fs.mkdirSync(outputDir, { recursive: true });

  const receiver = connection.receiver;
  const userStreams = new Map();

  const handleSpeakingStart = (userId) => {
    if (userStreams.has(userId)) return;

    const opusStream = receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.Manual },
    });
    const pcmStream = new prism.opus.Decoder({
      frameSize: 960,
      channels: 2,
      rate: 48000,
    });
    const outFile = path.join(outputDir, `${userId}.pcm`);
    const fileStream = fs.createWriteStream(outFile);

    opusStream.pipe(pcmStream).pipe(fileStream);
    userStreams.set(userId, { opusStream, pcmStream, fileStream, outFile });
  };

  receiver.speaking.on('start', handleSpeakingStart);

  activeSessions.set(interaction.guild.id, {
    connection,
    receiver,
    handleSpeakingStart,
    userStreams,
    outputDir,
  });
}

async function stopRecording(interaction) {
  const session = activeSessions.get(interaction.guild.id);

  if (!session) {
    await interaction.reply({
      content: 'Aucun enregistrement en cours sur ce serveur.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply("⏹️ **Enregistrement arrete.** Conversion des fichiers audio en cours...");

  session.receiver.speaking.removeListener('start', session.handleSpeakingStart);

  for (const { opusStream, pcmStream, fileStream } of session.userStreams.values()) {
    opusStream.destroy();
    pcmStream.destroy();
    fileStream.end();
  }

  session.connection.destroy();
  activeSessions.delete(interaction.guild.id);

  // Laisser le temps aux flux de terminer l'ecriture sur disque
  await new Promise((resolve) => setTimeout(resolve, 500));

  const wavFiles = [];
  for (const [userId, { outFile }] of session.userStreams) {
    if (!fs.existsSync(outFile) || fs.statSync(outFile).size === 0) continue;
    const wavFile = outFile.replace(/\.pcm$/, '.wav');
    try {
      await pcmToWav(outFile, wavFile);
      fs.unlinkSync(outFile);
      wavFiles.push({ userId, wavFile });
    } catch (err) {
      console.error(`Conversion echouee pour ${userId}:`, err);
    }
  }

  if (wavFiles.length === 0) {
    await interaction.followUp("Aucun audio n'a ete capture (personne n'a parle pendant l'enregistrement).");
    return;
  }

  const list = wavFiles
    .map(({ userId, wavFile }) => `<@${userId}> -> \`${path.basename(wavFile)}\``)
    .join('\n');

  await interaction.followUp(
    `Enregistrement termine. Fichiers audio sauvegardes localement dans :\n\`${session.outputDir}\`\n${list}`
  );
}

function pcmToWav(pcmPath, wavPath) {
  return new Promise((resolve, reject) => {
    const args = ['-y', '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', pcmPath, wavPath];
    const ff = spawn(ffmpegPath, args);
    let stderr = '';
    ff.stderr.on('data', (d) => (stderr += d));
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${stderr}`))));
  });
}
