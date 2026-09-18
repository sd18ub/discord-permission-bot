const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  EndBehaviorType,
  entersState,
} = require('@discordjs/voice');
const prism = require('prism-media');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { matchAndExecute, normalize } = require('./voiceCommands');

const WHISPER_BIN = path.join(__dirname, '..', 'whisper', 'Release', 'whisper-cli.exe');
const WHISPER_MODEL = path.join(__dirname, '..', 'whisper', 'models', 'ggml-small.bin');
const TEMP_DIR = path.join(__dirname, '..', 'voice-commands-temp');
const CONFIRM_TIMEOUT_MS = 15_000;

const activeSessions = new Map(); // guildId -> { connection, receiver, handleSpeakingStart, processing }

function checkWhisperReady() {
  if (!fs.existsSync(WHISPER_BIN)) {
    throw new Error("Le moteur de reconnaissance vocale n'est pas encore installe (whisper-cli.exe manquant).");
  }
  if (!fs.existsSync(WHISPER_MODEL)) {
    throw new Error("Le modele de reconnaissance vocale n'est pas encore telecharge (ggml-small.bin manquant).");
  }
}

async function joinAndListen(interaction) {
  checkWhisperReady();

  const voiceChannel = interaction.member.voice?.channel;
  if (!voiceChannel) {
    throw new Error('Tu dois etre dans un salon vocal pour utiliser /join.');
  }
  if (activeSessions.has(interaction.guild.id)) {
    throw new Error('Le bot ecoute deja des commandes vocales sur ce serveur. Utilise `/leave` pour arreter avant.');
  }

  fs.mkdirSync(TEMP_DIR, { recursive: true });

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
    throw new Error(`Impossible de rejoindre le salon vocal : ${err.message}`);
  }

  const receiver = connection.receiver;
  const commanderId = interaction.user.id;
  const textChannel = interaction.channel;
  const session = { connection, receiver, handleSpeakingStart: null, processing: false };

  session.handleSpeakingStart = (userId) => {
    // Seule la personne qui a lance /join peut donner des commandes vocales.
    if (userId !== commanderId || session.processing) return;

    const opusStream = receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: 700 },
    });
    const pcmStream = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
    const chunks = [];

    opusStream.pipe(pcmStream);
    pcmStream.on('data', (chunk) => chunks.push(chunk));
    pcmStream.on('end', async () => {
      session.processing = true;
      try {
        await processUtterance(Buffer.concat(chunks), interaction.guild, textChannel, commanderId);
      } catch (err) {
        console.error('Erreur traitement commande vocale:', err);
      } finally {
        session.processing = false;
      }
    });
  };

  receiver.speaking.on('start', session.handleSpeakingStart);
  activeSessions.set(interaction.guild.id, session);

  return voiceChannel;
}

async function transcribe(pcmBuffer) {
  if (pcmBuffer.length < 48000) return ''; // moins d'~0.25s, probablement du bruit

  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rawPath = path.join(TEMP_DIR, `${id}.pcm`);
  const wavPath = path.join(TEMP_DIR, `${id}.wav`);
  fs.writeFileSync(rawPath, pcmBuffer);

  try {
    await new Promise((resolve, reject) => {
      const ff = spawn(ffmpegPath, [
        '-y', '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', rawPath,
        '-ar', '16000', '-ac', '1', wavPath,
      ]);
      ff.on('error', reject);
      ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
    });

    const whisper = spawnSync(WHISPER_BIN, ['-m', WHISPER_MODEL, '-f', wavPath, '-l', 'fr', '-nt', '-np'], {
      encoding: 'utf8',
    });

    return (whisper.stdout || '').trim();
  } finally {
    fs.existsSync(rawPath) && fs.unlinkSync(rawPath);
    fs.existsSync(wavPath) && fs.unlinkSync(wavPath);
  }
}

async function processUtterance(pcmBuffer, guild, textChannel, commanderId) {
  const text = await transcribe(pcmBuffer);
  if (!text) return;

  const outcome = await matchAndExecute(guild, text);

  if (!outcome.matched) {
    await textChannel.send(`🎙️ Entendu : "${text}" (aucune commande reconnue)`);
    return;
  }

  if (!outcome.destructive) {
    await textChannel.send(`🎙️ Commande vocale : "${text}"\n→ ${outcome.result}`);
    return;
  }

  // Action destructrice : confirmation obligatoire par ecrit dans le salon, par la
  // meme personne que celle qui a lance /join. Aucune execution sans ce message.
  await textChannel.send(
    `🎙️ Commande vocale entendue : "${text}"\n` +
      `⚠️ Action destructrice proposee : ${outcome.description}\n` +
      `Tape **confirme** ou **annule** dans ce salon dans les 15 secondes.`
  );

  try {
    const collected = await textChannel.awaitMessages({
      filter: (m) => m.author.id === commanderId && /^(confirme|annule)/i.test(normalize(m.content)),
      max: 1,
      time: CONFIRM_TIMEOUT_MS,
      errors: ['time'],
    });
    const reply = collected.first();

    if (normalize(reply.content).startsWith('confirme')) {
      const result = await outcome.run();
      await textChannel.send(`✅ ${result}`);
    } else {
      await textChannel.send('🚫 Commande annulee.');
    }
  } catch {
    await textChannel.send('⌛ Confirmation expiree, aucune action effectuee.');
  }
}

function stopListening(guildId) {
  const session = activeSessions.get(guildId);
  if (!session) return false;
  session.receiver.speaking.removeListener('start', session.handleSpeakingStart);
  session.connection.destroy();
  activeSessions.delete(guildId);
  return true;
}

module.exports = { joinAndListen, stopListening };
