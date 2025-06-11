require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.once('ready', () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (!message.content.startsWith('!toca') || message.author.bot) return;

  message.reply('🔍 Processando seu comando...');
  console.log(`📥 Comando recebido: ${message.content}`);
  const args = message.content.split(' ');
  const url = args[1];

  if (!url || !ytdl.validateURL(url)) {
    return message.reply('⚠️ Forneça uma URL válida do YouTube.');
  }

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.reply('🎧 Você precisa estar em um canal de voz.');

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });

  const stream = ytdl(url, { filter: 'audioonly' });
  const resource = createAudioResource(stream);
  const player = createAudioPlayer();

  player.play(resource);
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Playing, () => {
    message.reply('▶️ Tocando agora!');
  });

  player.on('error', error => {
    console.error(error);
    message.reply('❌ Ocorreu um erro ao tentar reproduzir o áudio.');
  });
});

client.login(process.env.DISCORD_TOKEN);
