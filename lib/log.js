module.exports = class Logger {
  static setIsVerbose(isVerbose) {
    this.isVerbose = isVerbose;
  }

  static trace(...args) {
    if (this.isVerbose) {
      console.log(...args);
    }
  }

  static info(...args) {
    console.log(...args);
  }
};
