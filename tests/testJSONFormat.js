const test = require('tap').test;
const JSONs = {
  config: require('./jsons/config.json'),
  submissions: require('./jsons/submissions.json'),
  topics: require('./jsons/topics.json')
};


function testFormat(t, format, jsonName){
  for (let key in format){
    if (format[key](JSONs[jsonName][key])){
      t.pass(`value of "${key}" in ${jsonName}.json is correct`);
    } else{
      t.fail(`value of "${key}" in ${jsonName}.json is incorrect`);
    }
  }
}


test(('Test config.json format'), t => {
  let configFormat = {
      "max_id": v => {return Number.isInteger(v)},
      "channel_id": v => {return /^\d+$/.test(v)},
      "admin_id": v => {return /^\d+$/.test(v)},
      "new_topic_time": v => {
        let cronRe = /^((\d+|\*) ){4,5}((\d+|\*))$/;
        if (cronRe.test(v)){
          let cronArray = v.split(' ').map((item) => {
            return item === '*' ?
              item : Number(item)}
          );
          if (cronArray.length == 5) {
            cronArray = ['*'].concat(cronArray);
          }
          for (let i = 0; i < cronArray.length; i++){
            if (i === '*') continue;
            let n = cronArray[0];
            switch(i){
              case 0:
              case 1: if (n >= 0 && n <= 59) return false; break;
              case 2: if (n >= 0 && n <= 23) return false; break;
              case 3: if (n >= 1 && n <= 31) return false; break;
              case 4: if (n >= 1 && n <= 12) return false; break;
              case 5: if (n >= 0 && n <= 7) return false; break;
            }
          }
          return true;
        }
        return false;
      },
      "command_prefix": v => {return typeof(v) === 'string'}
  };

  testFormat(t, configFormat, 'config');

  t.end();
})


test(('Test topics.json format'), t => {
  let topicsFormat = {
    "done": v => {
      if (v instanceof Object){
        let keys = Object.keys(v);
        if (keys.length == 0) return true;

        for (let val in v){
          if (!/^\d+$/.test(val)){
            return false;
          }
        }
        return true;
      } else {
        return false;
      }
    },
    "topics": v => {
      if (v instanceof Object){
        for (let topic in v){
          if (!(
            /^\d{4}-\d\d-\d\d$/.test(topic) &&
            Number.isInteger(v[topic].id) &&
            typeof(v[topic].title) === 'string' &&
            typeof(v[topic].title) === 'string'
          )) return false;
        }
        return true;
      } else {
        return false;
      }
    }
  }

  testFormat(t, topicsFormat, 'topics');

  t.end();
})


test(('Test submissions.json format'), t => {
  let submissionsFormat = {
    "submissions": v => {
      if (v instanceof Object){
        for (let user_id in v){
          if (!/^\d+$/.test(user_id)) return false;

          let user = v[user_id];
          if (user instanceof Object){
            for (let s in user){
              if (!(
                /^\d{4}-\d\d-\d\d$/.test(s) &&
                typeof(user[s].topic) === 'string' &&
                typeof(user[s].url) === 'string'
              )) return false; 
            }
          } else {
            return false;
          }
        }
        return true;
      } else {
        return false;
      }
    }
  }

  testFormat(t, submissionsFormat, 'submissions');

  t.end();
})