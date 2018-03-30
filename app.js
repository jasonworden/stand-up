const _ = require('lodash');
const Promise = require('bluebird');
const notifier = require('node-notifier');
const spotify = require('./lib/spotify.js');
const objectPath = require('object-path');
const log = require('./lib/log.js');

const CsvReader = require('promised-csv');
const reader = new CsvReader();

const commandLineUsage = require('command-line-usage');
const commandLineArgs = require('command-line-args');

const optionDefinitions = [{  name: 'duration',  alias: 'd',  type: Number,  defaultValue: 10,
  typeLabel: '{underline seconds}',
  description: 'The total duration of the alarm.',
}, {  name: 'volume',  alias: 'v',  type: Number,  typeLabel: '{underline percent}',
  description: 'The volume of the alarm on Spotify.',
}, {  name: 'fade-in',  alias: 'i',  type: Number,  typeLabel: '[{underline seconds}]',
  description: 'Whether or not to fade in, optionally the time to fade in.',
}, {  name: 'fade-out',  alias: 'o',  type: Number,  typeLabel: '[{underline seconds}]',
  description: 'Whether or not to fade out, optionally the time to fade out.',
}, {  name: 'help',  alias: 'h',  type: Boolean,  description: 'This help dialog',
}, {  name: 'verbose',  type: Boolean,
  description: 'Verbose output',
}];

const sections = [{
  header: 'Stand Up',
  content: 'Play music from Spotify for stand-up',
}, {
  header: 'Options',
  optionList: optionDefinitions,
}];

const options = commandLineArgs(optionDefinitions);

if ('fade-in' in options) {
  options['fadeIn'] = !options['fade-in'] ? DEFAULT_FADE_DURATION_SECONDS : options['fade-in'];
  delete options['fade-in'];
}

if ('fade-out' in options) {
  options['fadeOut'] = !options['fade-out'] ? DEFAULT_FADE_DURATION_SECONDS : options['fade-out'];
  delete options['fade-out'];
}

log.setIsVerbose(options.verbose);

log.trace('options', options);

if (options.help) {
  const usage = commandLineUsage(sections);
  log.info(usage);
  process.exit(0);
}

const nonFadeDuration = options.duration - (options.fadeIn || 0) - (options.fadeOut || 0);

if (nonFadeDuration < 0) {
  log.info('Notice: Fade in and fade out are longer than the duration.');
}

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

const VOLUME_STEPS_PER_SECOND = 10;

const volumeFade = async (from, to, { durationSeconds }) => {
  log.trace(`fading volume from ${from} to ${to} over ${durationSeconds}`);
  const isIncreasing = from < to;
  // NOTE(dzaman): this won't be perfect because it doesn't take into account the time to execute commands
  const stepSize = (to - from) / (durationSeconds * VOLUME_STEPS_PER_SECOND);
  let current = from;

  while (isIncreasing ? current < to : current > to) {
    await spotify.setVolume(current);
    await Promise.delay(SECONDS_TO_MS/VOLUME_STEPS_PER_SECOND);

    // stepSize may be negative
    current += stepSize;
  }
};

const DEFAULT_CALL_TIMEOUT_SECONDS = 10;
const SECONDS_TO_MS = 1000;

const run = async () => {
  // start up spotify
  log.info('Standing up!');
  await spotify.ascertainIsOpened({ timeoutSeconds: DEFAULT_CALL_TIMEOUT_SECONDS });

  const { volume } = await spotify.getState();
  const { uri, startingPoint } = await getRandomTrackFromList();
   // pause the player
  await spotify.pause();
  // mute the volume
  await spotify.muteVolume();
  // change the track
  await spotify.playTrack(uri);

  // wait until new track is playing so jump is successful
  await spotify.waitForTrackToLoad(uri, { timeoutSeconds: DEFAULT_CALL_TIMEOUT_SECONDS });
  // jump to position in song
  await spotify.jumpTo(startingPoint);

  // unmute the volume
  await spotify.unmuteVolume();

  if (options.fadeIn) {
    await spotify.setVolume(0);
  }

  // await spotify.unmuteVolume();
  await spotify.play();

  // this doesn't need to block
  showCurrentTrackNotification();

  if (options.fadeIn) {
    await volumeFade(0, options.volume, { durationSeconds: options.fadeIn });
  } else {
    await spotify.setVolume(options.volume);
  }

  await Promise.delay(nonFadeDuration * SECONDS_TO_MS);

  if (options.fadeOut) {
    await volumeFade(options.volume, 0, { durationSeconds: options.fadeOut });
  }

  await spotify.pause();

  // TODO(matt): restore what was previously playing if applicable
};

Promise.resolve()
.then(run)
.catch(console.error)
.finally(() => {
  log.info('Sitting down...');
  process.exit(0);
});
