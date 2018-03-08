module.exports = class Command {
  constructor({regex, description, execute} = {}) {
    this.regex = regex;
    if (!(regex instanceof RegExp)) {
      this.regex = new RegExp(regex);
    }
    this.description = description;
    this.execute = (message, matches) => {
      if (this.regex.test(message.content)){
        execute(message, matches);
      }
    };
  }
}
