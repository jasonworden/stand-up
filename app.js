const _ = require('lodash');
const Promise = require('bluebird');
const notifier = require('node-notifier');
const spotify = require('./lib/spotify.js');
const objectPath = require('object-path');

const CsvReader = require('promised-csv');
const reader = new CsvReader();

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

const run = async () => {
  console.log('Standing up!');
  await spotify.ascertainIsOpened();
  await spotify.ascertainShuffleState(true);

  const { uri, startingPoint } = await getRandomTrackFromList();
  await spotify.playTrack(uri);

  await spotify.pause();
  // give time for new song to register so we can jump to desired spot successfully:
  await Promise.delay(1000);
  await spotify.jumpTo(startingPoint);
  await spotify.play();

  const track = await spotify.getTrack();
  notifier.notify({
    title: 'Stand up!',
    message: `${track.name} by ${track.artist}`,
    icon: 'https://secure.static.tumblr.com/325cf030a255dd186faa6aec64f555d2/k3htaqs/Dxynz1uj7/tumblr_static_spotify-logo_128.png',
  });
};

Promise.resolve()
.then(run)
.catch(console.error)
.finally(() => {
  console.log('Sitting down...');
  process.exit(0);
});
