const AniListApi = require('anilist-api-pt');
const fs = require('fs');
const schedule = require('node-schedule');
const util = require('util');
const fs_writeFile = util.promisify(fs.writeFile);
const Command = require('./Command');


// JSONs
const CONFIG = require('./jsons/config');
var topics = require('./jsons/topics');


module.exports = class DailySketch {
  constructor({discord_client, anilist_client_id, anilist_client_secret} = {}) {
    if (!discord_client){
      throw new Error('Discord.Client was not provided.');
    }
    if (!anilist_client_id || !anilist_client_secret){
      throw new Error('Anilist client ID or client secret was not provided.');
    }

    this._anilist = new AniListApi({
      client_id: anilist_client_id,
      client_secret: anilist_client_secret
    });
    this._bot = discord_client;

    //schedule.scheduleJob({second: 10}, ()=>{
    setInterval(()=>{
      this.postRandomTopic();
    //});
    }, 15000);

    let prefix = CONFIG.command_prefix;
    this.commands = [
      new Command({
          regex: `^${prefix}test`,
          description: `${prefix}test - this is test`, 
          execute: message => {
              //this.postRandomTopic();
          }
      })
    ];

    this._bot.on('message', message => {
      let helpRe = new RegExp(`${prefix}help`);
      if (helpRe.test(message.content)){
        let result = 'Here is a list of commands:\n';
        for (let i = 0; i < this.commands.length; i++){
          result += `\t${this.commands[i].description}\n`;
        }
        message.reply(result);
      }
      for (let i = 0; i < this.commands.length; i++){
        this.commands[i].execute(message);
      }
    });
  }

  postRandomTopic(){
    do{
      var random_id = Math.floor(Math.random()*CONFIG.max_id)+1;
    } while (topics.done.hasOwnProperty(random_id))

    // add random_id to the ids that have already been done
    topics.done[random_id] = null;

    this._anilist.auth().then(res=>{
      return this._anilist.anime.getAnime(random_id)
      .then(res=>{
        // exclude mangas and adult anime
        if (res.adult || res.series_type === 'manga'){
          return this.postRandomTopic()
        }

        // save today's topic
        let dateToday = new Date().toISOString().split('T')[0];
        topics.topics[dateToday] = {
          id: random_id,
          title: res.title_english,
          image: res.image_url_lge
        };
        this._saveJSON('topics', topics);

        var msg = `${res.title_english}\n${res.image_url_lge}`;



        this._bot.channels.get(CONFIG.channel_id).send(msg);
      });
    }).catch(err=>{
      this.postRandomTopic();
    });
  }

  _saveJSON(filename, obj){
    fs_writeFile('jsons/'+filename+'.json', JSON.stringify(obj), function(err){});
  }
}