require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube, ExtractorPlugin } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const axios = require('axios');

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
    if (!queue) return message.reply('❌ Não tem nenhuma música tocando agora meu caro texugo.');
    try {
      await queue.skip();
      message.reply('⏭️ Pulando para a próxima música 100=');
    } catch (err) {
      console.error('❌ Erro ao tentar pular fera:', err);
      message.reply('❌ Não foi possível pular a música fera.');
    }
  }

  if (cmd === '!pare') {
    const queue = distube.getQueue(message);
    if (!queue) return message.reply('❌ Não tem nenhuma música tocando agora.');
    try {
      await queue.stop();
      message.reply('⏹️ Música parada e fila limpa 100=');
    } catch (err) {
      console.error('❌ Erro ao tentar parar fera:', err);
      message.reply('❌ Não foi possível parar a música fera.');
    }
  }

  if (cmd === '!embaralhe') {
    const queue = distube.getQueue(message);
    if (!queue) return message.reply('❌ Não tem nenhuma música tocando agora.');
    try {
      await queue.shuffle();
      message.reply('⏹️ Música embaralhada!');
    } catch (err) {
      console.error('❌ Erro ao tentar embaralhar:', err);
      message.reply('❌ Não foi possível embaralhar a música.');
    }
  }

  if (cmd === '!coloca') {
    const query = args.join(' ');
    if (!query) return message.reply('⚠️ Envie o tempo em segundos!');

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('🎧 Você precisa estar em um canal de voz!');

    try {
      const queue = distube.getQueue(message);
      if (!queue) return message.reply('❌ Não tem nenhuma música tocando agora.');

      const time = parseInt(query, 10);
      if (isNaN(time) || time < 0) return message.reply('⚠️ Envie um número válido de segundos!');

      await queue.seek(time);
      message.reply(`⏱️ Música avançada para ${time} segundos!`);
    } catch (err) {
      console.error('❌ Erro ao tentar avançar a música:', err);
      message.reply('❌ Não foi possível avançar a música.');
    }
  }

  if (cmd === '!limpa') {
    try {
      // Lista de comandos do bot
      const comandos = ['!toca', '!pula', '!pare', '!embaralhe', '!coloca', '!limpa', '!ajuda'];

      // Busca as últimas 100 mensagens do canal
      const messages = await message.channel.messages.fetch({ limit: 100 });

      // Filtra mensagens enviadas pelo bot OU que contenham algum comando do bot
      const msgsParaApagar = messages.filter(m =>
        m.author.id === client.user.id ||
        comandos.some(cmd => m.content.trim().startsWith(cmd))
      );

      if (msgsParaApagar.size === 0) {
        return message.reply('🤖 Não encontrei mensagens para apagar cachoera.');
      }

      // Deleta as mensagens filtradas em massa (até 100)
      await message.channel.bulkDelete(msgsParaApagar, true);
      message.channel.send('🧹 Mensagens de comandos e do bot foram limpas cachoera!').then(msg => setTimeout(() => msg.delete(), 3000));
    } catch (err) {
      console.error('❌ Erro ao limpar mensagens cachoera:', err);
      message.reply('❌ Não consegui limpar as mensagens cachoera.');
    }
    return;
  }

  if (cmd === '!ajuda') {
    return message.reply(
      `🤖 **toma meu consagruaido:**\n` +
      `\`!toca <nome ou link>\` — Toca uma música\n` +
      `\`!pula\` — Pula para a próxima música\n` +
      `\`!pare\` — Para a música e limpa a fila\n` +
      `\`!embaralhe\` — Embaralha a fila de músicas\n` +
      `\`!coloca <segundos>\` — Avança a música para o tempo informado\n` +
      `\`!limpa\` — Limpa a porra a toda\n` +
      `\`!ajuda\` — Mostra esta mensagem`
    );
  }

  if (cmd === '!toca') {
    console.log('🎶 processinggggg 🤖');
    let query = args.join(' ');
    console.log('🔍 vc quer tocar:', query);
    if (!query) return message.reply('⚠️ Envie o link ou nome da música!');
    console.log(`\nquery: ${query}\n`);

    // Verifica se é um link do YouTube
    const youtubeRegex = /www\.youtube\.com\/.+$/;
    if (youtubeRegex.test(query)) {
      // if (query.includes('&list=')) {
      // TODO
      // FAZE A PLAYLIST MANUALMENTE COM API DO YOUTUBE
        
      // } else {
        query = query.trim().split('&')[0];
      // }

    } else {
      console.log('🔍 Buscando música no YouTube:', query);
      // Busca o link do YouTube usando a API
      const youtubeLink = await buscarYoutubeLink(query);
      if (!youtubeLink) {
        return message.reply('❌ Não consegui encontrar a música no YouTube.');
      }
      console.log('🔗 Link encontrado:', youtubeLink)
      query = youtubeLink; // Atualiza a query com o link encontrado
    }
    // console.log('🎶 Tocando música:', query);
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('🎧 Você precisa estar em um canal de voz!');

    try {
      await distube.play(voiceChannel, query, {
        textChannel: message.channel,
        member: message.member
      });
      console.log('🎶 Tocando música:', query);
    } catch (e) {
      console.error('❌ Erro ao tocar a música:', e);
      message.reply('❌ Não consegui tocar a música.');
    }
  };

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

async function buscarYoutubeLink(query) {
  const apiKey = process.env.YOUTUBE_API_KEY; // coloque sua chave no .env
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${apiKey}`;
  const res = await axios.get(url);
  const items = res.data.items;
  if (items && items.length > 0) {
    return `https://www.youtube.com/watch?v=${items[0].id.videoId}`;
  }
  return null;
}