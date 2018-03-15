// JSON containing several sample Anilist API responses
const anilist = require('./anilist.json');
const fs = require('fs');
const util = require('util');
const fs_writeFile = util.promisify(fs.writeFile);
const DailySketch = require('../DailySketch.js')
const config = require('../jsons/config.json')

const t = require('tap');
const test = t.test;


class DiscordClient {
  constructor(){
    this.channels = {}
    this.channels.get = id => {
      return new Channel(config.channel_id);
    }
    this.messageEventCallbacks = [];
  }
  
  on(event, callback){
    if (event === 'message'){
      this.messageEventCallbacks.push(callback);
    }
  }

  // This is just used to mimmmick sending of user messages
  receiveMessage(message) {
    return new Promise((resolve, reject) => {
      if (message instanceof Message){
        this.messageEventCallbacks.forEach(cb=>{
          cb(message);
        });
      }
      resolve();
    })
  }
}

var msgs = [];
class Channel {
  constructor(channel_id){
  }

  send(msg){
    msgs.push(msg);
    return new Promise((resolve, reject) => {
      resolve();
    })
  }

  setTopic(){}
}

class Message {
  /**
   * @param {string} channel_id
   * @param {string} user_id
   * @param {string} message
   * @param {Attachment[]} attachments 
   * @param {Embed[]} embeds
   */
  constructor({channel_id,user_id, message, attachments, embeds} = {}){
    this.channel_id = channel_id
    this.author = {};
    this.author.id = user_id;
    this.content = message;
    this.attachments = {};
    this.attachments.array = () =>{
      return attachments;
    };
    this.embeds = embeds;
    this.channel = new Channel(channel_id);
    this.reply = this.channel.send;
  }
}

class Embed {
  constructor(type, url){
    this.type = type;
    this.url = url;
  }
}

class Attachment{
  constructor(url){
    this.url = url;
  }
}

class AniListApi{
  constructor(){
    this.animes = anilist;
    this.anime = {};
    this.anime.getAnime = id => {
      return new Promise((resolve, reject) => {
        if (this.animes.length > 0){
          resolve(this.animes.pop());
        }
      })
    };
  }

  auth(){
    return new Promise((resolve, reject) => {
      resolve();
    })
  }
}

class User {
  constructor({client, user_id} = {}){
    this.client = client;
    this.user_id = user_id;
  }

  sendMessage(message, channel_id, attachments=[], embeds=[]){
    return client.receiveMessage(new Message({
      channel_id: channel_id,
      user_id: this.user_id,
      message: message,
      attachments: attachments,
      embeds: embeds
    }))
  }
}


const client = new DiscordClient();

DailySketch.prototype._saveJSON = (filename, obj) => {
  fs_writeFile(
    __dirname+'\\jsons\\'+filename+'.json', JSON.stringify(obj, null, 4), function(err){});
}

const ds = new DailySketch({
  discord_client: client,
  anilist_client_id: 'xxx-xxxxx',
  anilist_client_secret: 'xxxxxxxxxxxxxxxxxxxxxxxxxxx'
});
ds._schedule.cancel();
ds._anilist = new AniListApi();

const userAdmin = new User({client: client, user_id: config.admin_id});
const userNotAdmin = new User({client: client, user_id: config.admin_id+'1'});

const prefix = config.command_prefix;

t.afterEach(cb => {
  msgs.length = 0;
  cb();
})

t.todo('Test DailySketch.postRandomTopic function', t => {
  t.end();
})

t.todo('Test help command', t => {
  userAdmin.sendMessage(`${prefix}help`);
  t.end();
})

test('Test skipTopic command', t => {
  userNotAdmin.sendMessage(`${prefix}skipTopic`);
  t.equal(msgs.pop(), 'You cannot use this command.');
  userAdmin.sendMessage(`${prefix}skipTopic`);
  setTimeout(() => {
    if (msgs[0] === 'Finding new topic...'){
      if (msgs[1]){
        t.pass(`'${prefix}skipTopic' sent by an admin user works as intended`);
      } else{
        t.fail(`'${prefix}skipTopic' sent by an admin user does not work as intended`);
      }
    }
    t.end();
  }, 1000);
})

t.todo('Test topic command', t => {
  userAdmin.sendMessage(`${prefix}topic`);
  t.end();
})

t.todo('Test topics command', t => {
  userAdmin.sendMessage(`${prefix}topics`);
  t.end();
})

test('Test submit command', t => {
  let subSucMsg = 'submission successful.';
  let attachment = [new Attachment('http://so.me/image.png')];
  let nonImageEmbed = [new Embed('video', 'http://so.me/video.mp4')];
  let imageEmbed = [new Embed('image', 'http://so.me/image.png')];

  setTimeout(() => {userNotAdmin.sendMessage(`${prefix}submit`, '', attachment)}, 1000);

  // submit success cases:
  //   1: '~submit' attachment; no embed
  //   2: '~submit' no attachment; image embed
  userAdmin.sendMessage(`${prefix}submit`, '', attachment);
  if (msgs.pop() === subSucMsg) t.pass(`'${prefix}submit' with only an attachment works as intended`);
    else t.fail(`'${prefix}submit' with only an attachment does not work as intended`);
  userAdmin.sendMessage(`${prefix}submit ${imageEmbed[0].url}`, '', [], imageEmbed);
  if (msgs.pop() === subSucMsg) t.pass(`'${prefix}submit' with only an image embed works as intended`);
    else t.fail(`'${prefix}submit' with only an image embed does not work as intended`);

  // submit fail cases:
  //   1: '~submit' no attachments; no embeds
  //   2: '~submit' attachment; non-image embed
  //   3: '~submit' attachment; image embed
  //   4: '~submit' no attachment; non-image embed
  userAdmin.sendMessage(`${prefix}submit`);
  if (msgs.pop() !== subSucMsg) t.pass(`'${prefix}submit' with no attachments/embeds works as intended`);
    else t.fail(`'${prefix}submit' with no attachments/embeds does not work as intended`);
  userAdmin.sendMessage(`${prefix}submit`, '', attachment, nonImageEmbed);
  if (msgs.pop() !== subSucMsg) t.pass(`'${prefix}submit' with attachments and non-image embed works as intended`);
    else t.fail(`'${prefix}submit' with attachments and non-image embed does not work as intended`);
  userAdmin.sendMessage(`${prefix}submit`, '', attachment, imageEmbed);
  if (msgs.pop() !== subSucMsg) t.pass(`'${prefix}submit' with attachments and image embed works as intended`);
    else t.fail(`'${prefix}submit' with attachments and image embed does not work as intended`);
  userAdmin.sendMessage(`${prefix}submit`, '', [], nonImageEmbed);
  if (msgs.pop() !== subSucMsg) t.pass(`'${prefix}submit' with no attachments and non-image embed works as intended`);
    else t.fail(`'${prefix}submit' with no attachments and non-image embed does not work as intended`);
  t.end();
})

t.todo('Test submissions command', t => {
  userAdmin.sendMessage(`${prefix}`);
  t.end();
})
