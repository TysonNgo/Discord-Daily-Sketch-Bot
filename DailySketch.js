const AniListApi = require('anilist-api-pt');
const cronParser = require('cron-parser');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const util = require('util');
const fs_writeFile = util.promisify(fs.writeFile);
const Command = require('./Command');
const paginate = require('./paginate');

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
    this._schedule = schedule.scheduleJob(CONFIG.new_topic_time, ()=>{
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
          let t = this.getLatestTopic();
          let newTopicTime = cronParser.parseExpression(CONFIG.new_topic_time);
          let img = this.getNewImgURL(t.topic.image);
          let hoursLeftTilReset = 
            Math.ceil((newTopicTime.next()._date - new Date())/3600000);
          message.channel.send(
          	`**Under ${hoursLeftTilReset} ` +
          	`hour${hoursLeftTilReset > 1 ? 's' : ''} until the next topic**\n`+
          	`${t.topic.title}\n${img}`);
        }
      }),
      new Command({
        regex: `^${prefix}topics$`,
        description: `\`${prefix}topics\` - lists the all the topics`,
        execute: (message) => {
          let topicMap = {};
          let topicList = [];

          for (var id in topics.topics){
            let date = topics.topics[id].date.split('T')[0];
            if (topicMap.hasOwnProperty(date)){
              let date1 = topicMap[date].date;
              let date2 = new Date(topics.topics[id].date);

              if (date2 > date1){
                topicMap[date] = {
                  date: date2,
                  title: `\`${id}\` - ${topics.topics[id].title}`
                }  
              }
            } else {
              topicMap[date] = {
                date: new Date(topics.topics[id].date),
                title: `\`${id}\` - ${topics.topics[id].title}`
              }
            }
          }

          let keys = Object.keys(topicMap).sort();
          for (let i = 0; i < keys.length; i++){
            topicList.push(`[${keys[i]}] ${topicMap[keys[i]].title}`);
          }

          paginate(message, topicList);
        }
      }),
      new Command({
        regex: `^${prefix}submit( .*)?$`,
        description: `\`${prefix}submit <link|attachement>\` - archives your submission for the day.`,
        execute: (message, matches) => {
          let embeds = message.embeds;
          let attachments = message.attachments.array();
          let wrongUsage =
	      	  `To use the submit command type either:\n`+
	          `\`${prefix}submit <url-to-image>\`\n`+
	          `or\n`+
	          `\`${prefix}submit\` (and send the image as an attachement)`;
          // accept the message only if there are either
          //   1 embed 
          // xor
          //   1 attachement
          if (embeds.length == 1 ^ attachments.length == 1) {
            if (embeds[0]){
              if (embeds[0].type === 'image'){
                var submissionURL = embeds[0].url;
              } else {
              	return message.channel.send(wrongUsage);
              }
            } else if (attachments[0]){
              // attachements do not seem to have a type identifier
              var submissionURL = attachments[0].url;
            }

            let user_id = message.author.id;
            let topic = this.getLatestTopic();

            if (!(submissions.submissions.hasOwnProperty(user_id))){
              submissions.submissions[user_id] = {};
            }
            submissions.submissions[user_id][topic.id] = {
              url: submissionURL
            };

            this._saveJSON('submissions',submissions);
              
            message.reply('submission successful.');
          } else {
            return message.channel.send(wrongUsage);
          }
        } 
      }),
      new Command({
        regex: `^${prefix}submissions <@!?(\\d+)>( (\\d+))?$`,
        description: `\`${prefix}submissions @<user> <id>\` - shows `+
                     `the submission by the user at a given date\n`+
                     `    you can see the topics of a given date with ${prefix}topics`,
        execute: (message, matches) =>{
          let user_id = matches[1];
          let anilist_id = matches[3];
          let sub = submissions.submissions;


          if (anilist_id){
            if (sub.hasOwnProperty(user_id) && sub[user_id].hasOwnProperty(anilist_id)){
		          let topic = topics.topics[anilist_id];
		          let date = topic.date.split('T')[0];
		          let title = topic.title;
              return message.reply(
                `\n**[${date}]** \`${anilist_id}\` - ${title}\n`+
                `${sub[user_id][anilist_id].url}`);
            } else {
              return message.reply(`The user has not submitted a sketch for id: \`${anilist_id}.\``);
            }
          } else if (sub.hasOwnProperty(user_id)){
            let topic = topics.topics;
            let theTopics = [];
            for (let a_id in sub[user_id]){
              theTopics.push(`[${topic[a_id].date.split('T')[0]}] \`${a_id}\` - ${topic[a_id].title}`);
            }

            theTopics.sort();
            paginate(message, theTopics);
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
        topics.topics[random_id] = {
          date: this.getDate(),
          title: res.title_english,
          image: res.image_url_lge
        };
        this._saveJSON('topics', topics);

        let img = this.getNewImgURL(res.image_url_lge);
        let msg = `${res.title_english}\n${img}`;


        let channel = this._bot.channels.get(CONFIG.channel_id);
        channel.send(msg);
        channel.setTopic(`Today's topic: ${res.title_english}`);
      })
    }).catch(err=>{
      return this.postRandomTopic();
    });
  }

  getNewImgURL(oldURL){
    /*
      hacky fix
    */
    let img = path.basename(oldURL);
    //return 'https://s3.anilist.co/media/anime/cover/medium/'+img;
    return 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/'+img;
  }

  getDate(){
    return new Date().toJSON();
  }

  getLatestTopic(){
  	let theTopics = topics.topics;
  	let date;
  	let id;
  	let topic;
  	for (let t in theTopics){
  		let newDate = new Date(theTopics[t].date);
  		if (!date){
  			id = t;
  			date = newDate;
  			topic = theTopics[t];
  		} else if (newDate > date){
  			date = newDate;
  			id = t;
  			topic = theTopics[t];
  		}
  	}
  	return {
  		id: id,
  		topic: topic
  	};
  }

  _saveJSON(filename, obj){
    fs_writeFile(__dirname+'/jsons/'+filename+'.json', JSON.stringify(obj), function(err){});
  }
}
