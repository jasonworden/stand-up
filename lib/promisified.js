const Promise = require('bluebird');
const child_process = require('child_process');

const exec = Promise.promisify(child_process.exec);
const execFile = Promise.promisify(child_process.execFile);

module.exports = {
  exec,
  execFile,
};
