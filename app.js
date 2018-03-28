const _ = require('lodash');
const Promise = require('bluebird');
const notifier = require('node-notifier');
const spotify = require('./lib/spotify.js');
const objectPath = require('object-path');

const CsvReader = require('promised-csv');
const reader = new CsvReader();

const DEFAULT_START_VOLUME = 25;

// returns promise:
const getTrackList = () => reader.read('songs.csv', (data) => {
  const min = _.toInteger(data[1]);
  const sec = _.toNumber(data[2]);
  return {
    uri: data[0],
    startingPoint: (min * 60) + sec,
  };
});

const getRandomTrackFromList = async () => {
  const trackList = await getTrackList();
  return _.sample(trackList);
};

const showCurrentTrackNotification = async () => {
  const track = await spotify.getTrack();
  notifier.notify({
    title: 'Stand up!',
    message: `${track.name} by ${track.artist}`,
    icon: 'https://secure.static.tumblr.com/325cf030a255dd186faa6aec64f555d2/k3htaqs/Dxynz1uj7/tumblr_static_spotify-logo_128.png',
  });
};

const increaseVolumeWithEasing = async ({
  duration = 8 * 1000,
  intervalsCount = 10,
  startVolume = DEFAULT_START_VOLUME,
  endVolume = 100,
} = {}) => {
  await spotify.setVolume(startVolume);
  const intervalDuration = duration / intervalsCount;
  for (let i = 0; i <= intervalsCount; i++) {
    const volume = startVolume + (i / intervalsCount) * (endVolume - startVolume);
    await spotify.setVolume(volume);
    await Promise.delay(intervalDuration);
  }
};

const decreaseVolumeFromMaxWithEasing = async ({
  duration = 10 * 1000,
  intervalsCount = 10,
  endVolume = 0,
} = {}) => {
  const startVolume = 100;
  const intervalDuration = duration / intervalsCount;
  for (let i = 0; i <= intervalsCount; i++) {
  // for (let i = intervalsCount; i >= 0; i--) {
    const volume = startVolume - (i / intervalsCount) * (startVolume - endVolume);
    await spotify.setVolume(volume);
    await Promise.delay(intervalDuration);
  }
};


const run = async () => {
  await spotify.pause();

  console.log('Standing up!');
  await spotify.ascertainIsOpened();

  const { uri, startingPoint } = await getRandomTrackFromList();
  await spotify.playTrack(uri);

  await spotify.pause();
  // await spotify.muteVolume();
  // give time for new song to register so we can jump to desired spot successfully:
  await Promise.delay(1 * 1000);
  await spotify.jumpTo(startingPoint);
  // await spotify.unmuteVolume();
  await spotify.setVolume(DEFAULT_START_VOLUME);
  await spotify.play();

  await Promise.all([
    showCurrentTrackNotification(),
    increaseVolumeWithEasing(),
  ]);
  await Promise.delay(22 * 1000);
  await decreaseVolumeFromMaxWithEasing();
};

Promise.resolve()
.then(run)
.catch(console.error)
.finally(() => {
  console.log('Sitting down...');
  process.exit(0);
});
