const AniListApi = require('anilist-api-pt');
const fs = require('fs');
const schedule = require('node-schedule');
const util = require('util');
const fs_writeFile = util.promisify(fs.writeFile);
const Command = require('./Command');


// JSONs
const CONFIG = require('./jsons/config');
var topics = require('./jsons/topics');
var submissions = require('./jsons/submissions');


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

    // posts a new topic at midnight
    schedule.scheduleJob({hour: 0, minute: 0}, ()=>{
      this.postRandomTopic();
    });

    let prefix = CONFIG.command_prefix;
    this.commands = [
      new Command({
        regex: `^${prefix}skipTopic$`,
        description: `\`${prefix}skipTopic\` - skips the current topic (admin only)`, 
        execute: (message) => {
          if (message.author.id == CONFIG.admin_id) {
            message.channel.send('Finding new topic...').then(() => {
              this.postRandomTopic();
            });
          } else{
            message.reply('You cannot use this command.');
          }
        }
      }),
      new Command({
        regex: `^${prefix}topic$`,
        description: `\`${prefix}topic\` - displays today's topic`,
        execute: (message) => {
          let dateToday = this.getDate();
          let topic = topics.topics[dateToday];
          message.channel.send(`${topic.title}\n${topic.image}`);
        }
      }),
      new Command({
        regex: `^${prefix}topics$`,
        description: `\`${prefix}topics\` - lists the previous topics`,
        execute: (message) => {
          let topicList = [];

          for (var t in topics.topics){
            topicList.push(`\`${t}\` - ${topics.topics[t].title}`);
          }

          topicList.sort();

          message.channel.send(topicList.join('\n'));
        }
      }),
      new Command({
        regex: `^${prefix}submit( .*)?$`,
        description: `\`${prefix}submit <link|attachement>\` - archives your submission for the day.`,
        execute: (message, matches) => {
          var embeds = message.embeds;
          var attachments = message.attachments.array();

          // accept the message only if there are either
          //   1 embed 
          // xor
          //   1 attachement
          if (embeds.length == 1 ^ attachments.length == 1) {
            if (embeds[0]){
              if (embeds[0].type === 'image'){
                var submissionURL = embeds[0].url;
              }
            } else if (attachments[0]){
              // attachements do not seem to have a type identifier
              var submissionURL = attachments[0].url;
            }

            let user_id = message.author.id;
            let dateToday = this.getDate();
            let topic = topics.topics[dateToday].title;

            if (!(submissions.submissions.hasOwnProperty(user_id))){
              submissions.submissions[user_id] = {};
            }
            submissions.submissions[user_id][dateToday] = {
              topic: topic,
              url: submissionURL
            };

            this._saveJSON('submissions',submissions);
              
            message.reply('submission successful.');
          } else {
            return message.channel.send(
              `To use the submit command type either:\n`+
              `\`~submit <url-to-image>\`\n`+
              `or\n`+
              `\`~submit\` (and send the image as an attachement)`);
          }
        } 
      }),
      new Command({
        regex: `^${prefix}submissions <@!?(\\d+)>( (\\d{4}-\\d\\d-\\d\\d))?$`,
        description: `\`${prefix}submissions @<user> <submission date>\` - shows `+
                     `the submission by the user at a given date\n`+
                     `    you can see the topics of a given date with ${prefix}topics`,
        execute: (message, matches) =>{
          let user_id = matches[1];
          let date = matches[3];
          let sub = submissions.submissions;

          if (date){
            if (sub.hasOwnProperty(user_id) && sub[user_id].hasOwnProperty(date)){
              return message.reply(
                `\n${date} - ${submissions.submissions[user_id][date].topic}\n`+
                `${submissions.submissions[user_id][date].url}`);
            } else {
              return message.reply(`The user has not submitted a sketch on ${date}.`);
            }
          } else if (sub.hasOwnProperty(user_id)){
            let result = '\n';
            for (let topic in sub[user_id]){
              result += `\`${topic}\` - ${sub[user_id][topic].topic}\n`;
            }
            return message.reply(result);
          } else {
            return message.reply(`The user has not submitted any sketches.`);
          }
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
        message.channel.send(result);
      }
      for (let i = 0; i < this.commands.length; i++){
        this.commands[i].execute(
          message, this.commands[i].regex.exec(message.content)
        );
      }
    });
  }

  postRandomTopic(){
    do{
      var random_id = Math.floor(Math.random()*CONFIG.max_id)+1;
    } while (topics.done.hasOwnProperty(random_id))

    // add random_id to the ids that have already been done
    topics.done[random_id] = null;

    return this._anilist.auth().then(res=>{
      return this._anilist.anime.getAnime(random_id)
      .then(res=>{
        // exclude mangas, adult anime, and movies
        if (res.adult || res.series_type === 'manga' || res.type === 'Movie'){
          return this.postRandomTopic()
        }

        // save today's topic
        let dateToday = this.getDate();
        topics.topics[dateToday] = {
          id: random_id,
          title: res.title_english,
          image: res.image_url_lge
        };
        this._saveJSON('topics', topics);

        var msg = `${res.title_english}\n${res.image_url_lge}`;


        let channel = this._bot.channels.get(CONFIG.channel_id);
        channel.send(msg);
        channel.setTopic(`Today's topic: ${res.title_english}`);
      });
    }).catch(err=>{
      this.postRandomTopic();
    });
  }

  getDate(){
    let d = new Date();
    return d.getFullYear() + "-" +
     ("0"+(d.getMonth()+1)).slice(-2) + "-" +
    ("0" + d.getDate()).slice(-2);
  }

  _saveJSON(filename, obj){
    fs_writeFile(__dirname+'/jsons/'+filename+'.json', JSON.stringify(obj), function(err){});
  }
}