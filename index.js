const Discord = require('discord.js');
const client = new Discord.Client();

const DailySketch = require('./DailySketch.js')

const ds = new DailySketch({
	discord_client: client
});

client.on('ready', ()=>{
	console.log('Bot is online');
});

client.login(process.env.DISCORD_TOKEN);
