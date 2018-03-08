# Discord-Daily-Sketch-Bot
Discord bot that will post random anime titles for users in a Discord server to sketch something in that particular anime for the day.





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
