const Promise = require('bluebird');
const spotify = require('spotify-node-applescript');
const promisified = require('./promisified.js');

const DEFAULT_OPENING_GRACE_PERIOD_MS = 5 * 1000;

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
const playTrack = Promise.promisify(spotify.playTrack);
const jumpTo = Promise.promisify(spotify.jumpTo);

const play = Promise.promisify(spotify.play);
const pause = Promise.promisify(spotify.pause);
const playPause = Promise.promisify(spotify.playPause);

const muteVolume = Promise.promisify(spotify.muteVolume);
const setVolume = Promise.promisify(spotify.setVolume);
const unmuteVolume = Promise.promisify(spotify.unmuteVolume);
const getOpenedState = Promise.promisify(spotify.isRunning);

const getShuffleState = Promise.promisify(spotify.isShuffling);
const toggleShuffleState = Promise.promisify(spotify.toggleShuffling);
const ascertainShuffleState = async (value) => {
  const isShuffling = await getShuffleState();
  if (isShuffling !== value) {
    await toggleShuffleState();
  }
};

const open = async (waitTime = DEFAULT_OPENING_GRACE_PERIOD_MS) => {
  await promisified.exec('open /Applications/Spotify.app');
  // wait a few seconds to ensure delay
  await Promise.delay(waitTime);
};

const ascertainIsOpened = async (waitTimeAfterOpening) => {
  const isOpened = await getOpenedState();
  if (!isOpened) {
    await open();
  }
}

module.exports = {
  // open related:
  open,
  getOpenedState,
  ascertainIsOpened,

  // volume related:
  setVolume,
  muteVolume,
  unmuteVolume,

  // track related:
  playTrack,
  getTrack,
  jumpTo,

  // play/pause:
  play,
  pause,
  playPause,

  // shuffle related:
  getShuffleState,
  toggleShuffleState,
  ascertainShuffleState,
};
