# Discord-Daily-Sketch-Bot
Discord bot that will post random anime titles for users in a Discord server to sketch something in that particular anime for the day.


## How To Use

Modify the applicable fields in `./jsons/config.json`:

* `max_id` - this value is used to obtain a random anime ID from Anilist (it does not need to be changed)
* `channel_id` - set this value to the Discord channel ID in which you would like the bot to send the topic
* `admin_id` - set this value to the Discord user ID of the user that is able to skip the current topic
* `new_topic_time` - set this value (cron time string) to the time you want the topic to change (default is set to midnight)
* `command_prefix` - self-explanatory, the command prefix (ie. to use the topic command send "~topic")

After modifying the config file and installing the necessary dependencies (`npm install`), you can run the main Javascript file, but first you need to set some environment variables:

* `ANILIST_CLIENT_ID` - your Anilist client ID required to use the Anilist API
* `ANILIST_CLIENT_SECRET` - your Anilist client secret required to use the Anilist API
* `DISCORD_TOKEN` - your Discord bot application's token.

Now you can run the application by typing in the terminal:

```
node index.js
```

#### OR

If you take a look at `index.js`, you will notice that all you need to do is pass an instance of a `Discord.Client`, and your client ID and client secret from Anilist to the `DailySketch` class. In other words, you can use your own pre-existing bot that you wrote in Node.js (discord.js 11) along with with `DailySketch` in the same Discord application. 

```js
// index.js
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
```

## JSONs 

#### config.json

```js
{
    "max_id": 100000, // maximum id to obtain a random ID from Anilist
    "channel_id": "100000000000000000", // channel id to post topics to
    "admin_id": "100000000000000000", // user id
    "command_prefix": "~"
}
```

#### topics.json

```js
{
    "done": {
        "10058": null // this is where the IDs that have already been used go
    },
    "topics": {
        "YYYY-MM-DD": {
            "id": 1, // Anilist ID
            "image": "https://cdn.anilist.co/img/dir/anime/reg/1.jpg", // URL of anime cover
            "title": "Cowboy Bebop" // English title of the anime
        }
    }
}
```

#### submissions.json

```js
{
    "submissions": {
        "100000000000000000": { // Discord user ID
            "YYYY-MM-DD": {
                "topic": "Cowboy Bebop",
                "url": "https://link_to_your_image"
            }
        }
    }
}
```
