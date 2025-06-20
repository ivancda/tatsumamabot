require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube, Playlist } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const axios = require('axios');

// Cria cliente Discord com intents necessárias
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

// Inicializa o DisTube com plugin de streaming
const distube = new DisTube(client, {
	emitNewSongOnly: true,
	plugins: [
		new SpotifyPlugin(),
		new SoundCloudPlugin(),
		new YtDlpPlugin({ update: true }),
	],
});

// Pegue o plugin que herda de PlayableExtractorPlugin
const extractorPlugin = distube.plugins.find(
	p => p.constructor.name === 'YtDlpPlugin',
);


client.once('ready', () => {
	console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
	if (message.author.bot || !message.guild) return;

	const [cmd, ...args] = message.content.trim().split(/\s+/);

	if (cmd === '!pula') {
		const queue = distube.getQueue(message);
		if (!queue) {
			return message.reply(
				'❌ Não tem nenhuma música tocando agora meu caro texugo.',
			);
		}
		try {
			await queue.skip();
			message.reply('⏭️ Pulando para a próxima música 100=');
		}
		catch (err) {
			console.error('❌ Erro ao tentar pular fera:', err);
			message.reply('❌ Não foi possível pular a música fera.');
		}
	}

	if (cmd === '!pare') {
		const queue = distube.getQueue(message);
		if (!queue) {return message.reply('❌ Não tem nenhuma música tocando agora.');}
		try {
			await queue.stop();
			message.reply('⏹️ Música parada e fila limpa 100=');
		}
		catch (err) {
			console.error('❌ Erro ao tentar parar fera:', err);
			message.reply('❌ Não foi possível parar a música fera.');
		}
	}

	if (cmd === '!embaralhe') {
		const queue = distube.getQueue(message);
		if (!queue) {return message.reply('❌ Não tem nenhuma música tocando agora.');}
		try {
			await queue.shuffle();
			message.reply('⏹️ Música embRaralda!');
		}
		catch (err) {
			console.error('❌ Erro ao tentar embaralhar:', err);
			message.reply('❌ Não foi possível embaralhar a música.');
		}
	}

	if (cmd === '!coloca') {
		const query = args.join(' ');
		if (!query) return message.reply('⚠️ Envie o tempo em segundos!');

		const voiceChannel = message.member.voice.channel;
		if (!voiceChannel) {return message.reply('🎧 Você precisa estar em um canal de voz!');}

		try {
			const queue = distube.getQueue(message);
			if (!queue) {return message.reply('❌ Não tem nenhuma música tocando agora.');}

			const time = parseInt(query, 10);
			if (isNaN(time) || time < 0) {return message.reply('⚠️ Envie um número válido de segundos!');}

			await queue.seek(time);
			message.reply(`⏱️ Música avançada para ${time} segundos!`);
		}
		catch (err) {
			console.error('❌ Erro ao tentar avançar a música:', err);
			message.reply('❌ Não foi possível avançar a música.');
		}
	}

	if (cmd === '!limpa') {
		try {
			// Lista de comandos do bot
			const comandos = [
				'!toca',
				'!pula',
				'!pare',
				'!embaralhe',
				'!coloca',
				'!limpa',
				'!ajuda',
			];

			// Busca as últimas 100 mensagens do canal
			const messages = await message.channel.messages.fetch({ limit: 100 });

			// Filtra mensagens enviadas pelo bot OU que contenham algum comando do bot
			const msgsParaApagar = messages.filter(
				(m) =>
					m.author.id === client.user.id ||
          comandos.some((cmd) => m.content.trim().startsWith(cmd)),
			);

			if (msgsParaApagar.size === 0) {
				return message.reply(
					'🤖 Não encontrei mensagens para apagar cachoera.',
				);
			}

			// Deleta as mensagens filtradas em massa (até 100)
			await message.channel.bulkDelete(msgsParaApagar, true);
			message.channel
				.send('🧹 Mensagens de comandos e do bot foram limpas cachoera!')
				.then((msg) => setTimeout(() => msg.delete(), 3000));
		}
		catch (err) {
			console.error('❌ Erro ao limpar mensagens cachoera:', err);
			message.reply('❌ Não consegui limpar as mensagens cachoera.');
		}
		return;
	}

	if (cmd === '!ajuda') {
		return message.reply(
			'🤖 **toma meu consagruaido:**\n' +
    '`!toca <nome ou link>` — Toca uma música\n' +
    '`!pula` — Pula para a próxima música\n' +
    '`!pare` — Para a música e limpa a fila\n' +
    '`!embaralhe` — Embaralha a fila de músicas\n' +
    '`!coloca <segundos>` — Avança a música para o tempo informado\n' +
    '`!limpa` — Limpa as mensagens de comandos e do bot\n' +
    '`!fila` — Mostra a fila de músicas\n' +
    '`!ajuda` — Mostra esta mensagem',
		);
	}

	if (cmd === '!fila') {
		const queue = distube.getQueue(message);
		if (!queue) {
			return message.reply('❌ Não tem nenhuma música tocando agora.');
		}
		const songs = queue.songs.map((song, index) => {
			return `${index + 1}. **${song.name}** - ${song.formattedDuration}`;
		}).join('\n');
		const resposta = `🎶 **Fila de músicas:**\n${songs}`;
		message.channel.send(resposta);
		return;
	}

	if (cmd === '!toca') {
		const query = args.join(' ');
		console.log(`\nquery: ${query}\n`);

		if (!query) return message.reply('⚠️ Envie o link ou nome da música!');

		// Se não for link, busca no YouTube (como fallback)
		const isLink = query.startsWith('http');
		let finalQuery = query;

		if (!isLink) {
			const youtubeLink = await buscarYoutubeLink(query);
			if (!youtubeLink) {return message.reply('❌ Não encontrei nada no YouTube.');}
			finalQuery = youtubeLink;
		}

		if (finalQuery.includes('youtube.com') && finalQuery.includes('&')) {

			// if (finalQuery.includes("list=")) {
			//   // Se for uma playlist, busca os vídeos
			//   const playlistId = finalQuery.split("list=")[1].split("&")[0];
			//   console.log("🎵 Buscando vídeos da playlist:", playlistId);

			//   playPlaylist(playlistId, distube, message.member.voice.channel, message)
			//     .then(() => {
			//       message.reply(`🎶 Playlist ${playlistId} adicionada à fila!`);
			//     })
			//     .catch((err) => {
			//       console.error("❌ Erro ao tocar playlist:", err);
			//       message.reply("❌ Não consegui tocar a playlist.");
			//     });

			//   // videoUrls.forEach((url) => {
			//   //   console.log("🎵 Adicionando vídeo da playlist:", url)
			//   //   const urlLimpa = url.split("&")[0]; // remove parâmetros extras
			//   //   tocar(message.member.voice.channel, urlLimpa, message);
			//   // });
			//   return;
			// } else {
			// Se for um vídeo único, mantém o link original
			finalQuery = finalQuery.split('&')[0]; // remove parâmetros extras
			// }

		}

		if (/spotify\.com\/.*\/track/.test(finalQuery)) {
			try {
				const nomeBusca = await buscarNomeSpotify(finalQuery);
				console.log('🎵 Buscando no YouTube por:', nomeBusca);
				const youtubeLink = await buscarYoutubeLink(nomeBusca);
				if (!youtubeLink) {return message.reply('❌ Não encontrei a música no YouTube.');}
				finalQuery = youtubeLink; // ⚠️ Aqui substitui o link original!
			}
			catch (err) {
				console.error('Erro ao buscar info do Spotify:', err);
				return message.reply('❌ Não consegui buscar essa música do Spotify.');
			}
		}

		tocar(message.member.voice.channel, finalQuery, message);
	}
});

// Eventos de músicas
distube
	.on('playSong', (queue, song) => {
		// const src = song.source; // 'youtube', 'spotify', 'soundcloud'
		queue.textChannel.send(`Tocando agora: **${song.name} ▶️ **`);
	})
	.on('addSong', (queue, song) => {
		// queue.textChannel.send(`➕ Adicionada à fila: **${song.name}**`);
	})
	.on('error', (channel, err) => {
		console.error('❌ DisTube erro:', err);

		// Evita crash caso channel não seja um canal válido
		if (channel && typeof channel.send === 'function') {
			channel.send('❌ Ocorreu um erro ao reproduzir.');
		}
	});

client.login(process.env.DISCORD_TOKEN);

async function tocar(voiceChannel, query, message) {
	try {
		await distube.play(voiceChannel, query, {
			textChannel: message.channel,
			member: message.member,
		});
	}
	catch (err) {
		console.error('❌ Erro ao tocar música:', err);

		let respostaErro = '💩 Não consegui tocar a música.';
		if (err.message?.includes('DRM')) {
			respostaErro = '🔒 Essa música é protegida por DRM e não pode ser reproduzida.';
		}
		else if (err.message?.includes('no extractors')) {
			respostaErro = '⚠️ Link inválido ou não suportado.';
		}

		message.reply(respostaErro);
	}
}

async function buscarYoutubeLink(query) {
	const apiKey = process.env.YOUTUBE_API_KEY; // coloque sua chave no .env
	const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(
		query,
	)}&key=${apiKey}`;
	const res = await axios.get(url);
	const items = res.data.items;
	if (items && items.length > 0) {
		return `https://www.youtube.com/watch?v=${items[0].id.videoId}`;
	}
	return null;
}

async function buscarNomeSpotify(spotifyUrl) {
	const id = spotifyUrl.split('/track/')[1].split('?')[0];
	const token = await getSpotifyToken();

	const res = await axios.get(`https://api.spotify.com/v1/tracks/${id}`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	const nome = res.data.name;
	const artista = res.data.artists.map((a) => a.name).join(', ');
	return `${nome} ${artista}`;
}

async function getSpotifyToken() {
	const res = await axios.post(
		'https://accounts.spotify.com/api/token',
		new URLSearchParams({ grant_type: 'client_credentials' }),
		{
			headers: {
				Authorization:
          'Basic ' +
          Buffer.from(
          	`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
          ).toString('base64'),
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		},
	);
	return res.data.access_token;
}

async function playPlaylist(playlistId, distube, voiceChannel, message) {
	const apiKey = process.env.YOUTUBE_API_KEY;
	let nextPageToken = undefined;
	const usedNextPageTokens = [];
	const urlsSet = new Set();

	do {
		const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}` +
      (nextPageToken ? `&pageToken=${nextPageToken}` : '');
		const res = await axios.get(url);

		if (usedNextPageTokens.includes(res.data.nextPageToken)) break;
		usedNextPageTokens.push(res.data.nextPageToken);

		res.data.items.forEach(item => {
			urlsSet.add(`https://www.youtube.com/watch?v=${item.contentDetails.videoId}`);
		});
		nextPageToken = res.data.nextPageToken;
	} while (nextPageToken);

	const urls = Array.from(urlsSet);
	if (urls.length === 0) {
		throw new Error('Nenhum vídeo encontrado na playlist.');
	}

	const songs = await montarSongs(urls, distube, message.member);

	const playlistInfo = {
		id: playlistId,
		name: `Playlist ${playlistId}`,
		songs: songs,
		source: 'youtube',
		url: `https://www.youtube.com/playlist?list=${playlistId}`,
	};

	const playlistObj = new Playlist(playlistInfo, { member: message.member });

	await distube.play(voiceChannel, playlistObj, {
		textChannel: message.channel,
		member: message.member,
	});
}

// Agora use o método resolve para cada URL
async function montarSongs(urls, member, distube) {
	const songs = [];
	for (const url of urls) {
		const song = await extractorPlugin.resolve(url, { member, distube });
		if (song) songs.push(song);
	}
	return songs;
}