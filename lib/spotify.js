const Promise = require('bluebird');
const spotify = require('spotify-node-applescript');
const promisified = require('./promisified.js');
const log = require('./log.js');
const _ = require('lodash');

const SECONDS_TO_MS = 1000;
const DEFAULT_OPENING_GRACE_PERIOD_MS = 5 * SECONDS_TO_MS;
const POLLING_FREQUENCY_MS = 100;

/*
  track returned from getTrack Promise = {
    artist: 'Bob Dylan',
    album: 'Highway 61 Revisited',
    disc_number: 1,
    duration: 370,
    played count: 0,
    track_number: 1,
    starred: false,
    popularity: 71,
    id: 'spotify:track:3AhXZa8sUQht0UEdBJgpGc',
    name: 'Like A Rolling Stone',
    album_artist: 'Bob Dylan',
    artwork_url: 'http://images.spotify.com/image/e3d720410b4a0770c1fc84bc8eb0f0b76758a358',
    spotify_url: 'spotify:track:3AhXZa8sUQht0UEdBJgpGc' }
  }
*/

const getTrack = Promise.promisify(spotify.getTrack);
const getState = Promise.promisify(spotify.getState);
const playTrack = Promise.promisify(spotify.playTrack);
const jumpTo = Promise.promisify(spotify.jumpTo);

const play = Promise.promisify(spotify.play);
const pause = Promise.promisify(spotify.pause);
const playPause = Promise.promisify(spotify.playPause);

const muteVolume = Promise.promisify(spotify.muteVolume);
const setVolume = Promise.promisify(spotify.setVolume);
const unmuteVolume = Promise.promisify(spotify.unmuteVolume);
const isRunning = Promise.promisify(spotify.isRunning);

const getShuffleState = Promise.promisify(spotify.isShuffling);
const toggleShuffleState = Promise.promisify(spotify.toggleShuffling);

const ascertainShuffleState = async (value) => {
  const isShuffling = await getShuffleState();
  if (isShuffling !== value) {
    await toggleShuffleState();
  }
};

const open = async () => {
  // NOTE(dzaman): what about just using execSync?
  await promisified.exec('open /Applications/Spotify.app');
};

const waitForCondition = async (fn, { timeoutSeconds } = {}) => {
  const maxTime = timeoutSeconds ? new Date().getTime() + timeoutSeconds * SECONDS_TO_MS : null;

  while (!maxTime || new Date().getTime() < maxTime) {
    if (await fn()) {
      break;
    }

    await Promise.delay(POLLING_FREQUENCY_MS);
  }
};

const ascertainIsOpened = async ({ timeoutSeconds } = {}) => {
  if (!await isRunning()) {
    await open();
    return waitUntilComplete(isRunning, { timeoutSeconds });
  }
};

const waitForTrackToLoad = async (uri, { timeoutSeconds } = {}) => {
  const fn = async () => {
    try {
      const { track_id } = await getState();
      return track_id === uri;
    } catch (e) {
      log.trace('e', e);
    }
  };

  return waitForCondition(fn, { timeoutSeconds });
};

const functions = {
  // open related:
  open,
  isRunning,
  ascertainIsOpened,

  // volume related:
  setVolume,
  muteVolume,
  unmuteVolume,

  // player state (track, volume, status, position)
  getState,

  // track related:
  playTrack,
  getTrack,
  jumpTo,
  waitForTrackToLoad,

  // play/pause:
  play,
  pause,
  playPause,

  // shuffle related:
  getShuffleState,
  toggleShuffleState,
  ascertainShuffleState,
};

// probably excessive, but I like the detailed verbose output with --verbose
module.exports = _.reduce(functions, (acc, value, key) => {
  acc[key] = (...args) => {
    log.trace(`calling ${key}`, ...args);
    return value(...args);
  };

  return acc;
}, {});
