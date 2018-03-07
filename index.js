const Discord = require('discord.js');
const client = new Discord.Client();

const DailySketch = require('./DailySketch.js')

const ds = new DailySketch({
	discord_client: client,
	anilist_client_id: process.env.ANILIST_CLIENT_ID,
	anilist_client_secret: process.env.ANILIST_CLIENT_SECRET
});

client.on('ready', ()=>{
	console.log('Bot is online');
});

client.login(process.env.DISCORD_TOKEN);
