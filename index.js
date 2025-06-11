require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');

// Cria cliente Discord com intents necessárias
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// Inicializa o DisTube com plugin de streaming
const distube = new DisTube(client, {
  plugins: [new YtDlpPlugin({ update: true })],
  emitNewSongOnly: true,
});

client.once('ready', () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const [cmd, ...args] = message.content.trim().split(/\s+/);

  if (cmd === '!pula') {
    const queue = distube.getQueue(message);
    if (!queue) return message.reply('❌ Não tem nenhuma música tocando agora.');
    try {
      await queue.skip();
      message.reply('⏭️ Pulando para a próxima música!');
    } catch (err) {
      console.error('❌ Erro ao tentar pular:', err);
      message.reply('❌ Não foi possível pular a música.');
    }
  }

  /**
   * TODO
   * comando !pare
   * comando !limpe
   */

  if (cmd !== '!toca') return;

  const query = args.join(' ');
  if (!query) return message.reply('⚠️ Envie o link ou nome da música!');

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.reply('🎧 Você precisa estar em um canal de voz!');

  try {
    await distube.play(voiceChannel, query, {
      textChannel: message.channel,
      member: message.member
    });
  } catch (e) {
    console.error('❌ Erro ao tocar a música:', e);
    message.reply('❌ Não consegui tocar a música.');
  }
});

// Eventos de músicas
distube
  .on('playSong', (queue, song) => {
    queue.textChannel.send(`▶️ Tocando agora: **${song.name}**`);
  })
  .on('addSong', (queue, song) => {
    queue.textChannel.send(`➕ Adicionada à fila: **${song.name}**`);
  })
  .on('error', (channel, err) => {
    console.error('❌ DisTube erro:', err);
    channel.send('❌ Ocorreu um erro ao reproduzir.');
  });

client.login(process.env.DISCORD_TOKEN);
