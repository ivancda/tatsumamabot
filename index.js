import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { DisTube, Playlist } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import { YouTubePlugin } from '@distube/youtube';
import { SpotifyPlugin } from '@distube/spotify';
import { SoundCloudPlugin } from '@distube/soundcloud';
import axios from 'axios';
//

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
		new YouTubePlugin(), // <-- Use este como extrator principal do YouTube
		// new YtDlpPlugin({ update: true }),
	],
});

// Pegue o plugin que herda de PlayableExtractorPlugin
// const extractorPlugin = distube.plugins.find(
// 	p => p.constructor.name === 'YtDlpPlugin',
// );
const extractorPlugin = distube.plugins.find(
	p => p.constructor.name === 'YouTubePlugin',
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
		if (!queue) { return message.reply('❌ Não tem nenhuma música tocando agora.'); }
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
		if (!queue) { return message.reply('❌ Não tem nenhuma música tocando agora.'); }
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
		if (!voiceChannel) { return message.reply('🎧 Você precisa estar em um canal de voz!'); }

		try {
			const queue = distube.getQueue(message);
			if (!queue) { return message.reply('❌ Não tem nenhuma música tocando agora.'); }

			const time = parseInt(query, 10);
			if (isNaN(time) || time < 0) { return message.reply('⚠️ Envie um número válido de segundos!'); }

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
			const results = await extractorPlugin.search(query, { type: 'video', limit: 1 });
			if (!results || results.length === 0) {
				return message.reply('❌ Não encontrei nada no YouTube.');
			}
			finalQuery = results[0].url;
		}

		if (/spotify\.com\/.*\/track/.test(finalQuery)) {
			try {
				const nomeBusca = await buscarNomeSpotify(finalQuery);
				console.log('🎵 Buscando no YouTube por:', nomeBusca);
				const youtubeLink = await buscarYoutubeLink(nomeBusca);
				if (!youtubeLink) { return message.reply('❌ Não encontrei a música no YouTube.'); }
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
		const resolved = await extractorPlugin.resolve(query, {
			member: message.member,
			distube: distube,
		});

		if (resolved && Array.isArray(resolved.songs) && resolved.songs.length > 0) {
			// É playlist
			await distube.play(voiceChannel, resolved, {
				textChannel: message.channel,
				member: message.member,
			});
			return message.reply(`🎶 Playlist "${resolved.name}" adicionada à fila com ${resolved.songs.length} músicas!`);
		}

		if (/list=RD/.test(query)) {

			// Toca o vídeo principal
			await distube.play(voiceChannel, query, {
				textChannel: message.channel,
				member: message.member,
			});

			// Adiciona os vídeos relacionados na fila, max 25
			if (resolved.related && Array.isArray(resolved.related)) {
				for (const rel of resolved.related.slice(0, 25)) {
					const url = `https://www.youtube.com/watch?v=${rel.id}`;
					await distube.play(voiceChannel, url, {
						textChannel: message.channel,
						member: message.member,
					});
				}
			}
			return message.reply(`🎶 Mix do yt "${resolved.name}" adicionada à fila com ${resolved.related.length} músicas relacionadas!`);
		}

		// Se não for playlist, toca normalmente
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
	const results = await extractorPlugin.search(query, { type: 'video', limit: 1 });
	if (results && results.length > 0) {
		return results[0].url;
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