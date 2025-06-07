const details = () => ({
  id: 'Tdarr_Plugin_PhattMatt_Filter_Stream_Order_Match',
  Stage: 'Pre-processing',
  Name: 'Phatt Matt: Stream Order Match V1.6',
  Type: 'Filter',
  Operation: 'Filter',
  Description:
    'Checks that streams are ordered as video > audio (in specified language/channel order) > subtitles. Routes to Output 1 if correct, Output 2 if not. Compatible with Tdarr V2 format.',
  Version: '1.6',
  Tags: 'pre-processing,debug,ffprobe,filter',
  Inputs: [
    {
      name: 'preferredAudioLanguages',
      type: 'string',
      defaultValue: 'eng,jpn,chi',
      inputText: 'Preferred Audio Languages (comma-separated, e.g., eng,jpn,chi)',
    },
  ],
});

const plugin = (file, librarySettings, inputs, otherArguments) => {
  const ffprobeData = file.ffProbeData;

  if (!ffprobeData) {
    return {
      processFile: false,
      preset: '',
      container: '',
      infoLog: `No ffProbeData object found for file: ${file.file}`,
      output: 2,
    };
  }

  if (!ffprobeData.streams || ffprobeData.streams.length === 0) {
    return {
      processFile: false,
      preset: '',
      container: '',
      infoLog: `ffProbeData.streams is missing or empty for file: ${file.file}`,
      output: 2,
    };
  }

  const preferredLangs = inputs.preferredAudioLanguages
    .split(',')
    .map(l => l.trim().toLowerCase())
    .filter(l => l);

  const streams = ffprobeData.streams;

  const videoStreams = [];
  const audioStreams = [];
  const subtitleStreams = [];

  const streamInfoList = streams.map((stream, index) => {
    const type = stream.codec_type || '';
    const codec = stream.codec_name || '';
    const channels = stream.channels || 0;
    const language = (stream.tags && stream.tags.language) ? stream.tags.language.toLowerCase() : 'und';
    const info = `[${index} type=${type} codec=${codec} channels=${channels} language=${language}]`;
    if (type === 'video') videoStreams.push({ index, type, codec, channels, language });
    else if (type === 'audio') audioStreams.push({ index, type, codec, channels, language });
    else if (type === 'subtitle') subtitleStreams.push({ index, type, codec, channels, language });
    return { index, type, codec, channels, language, info };
  });

  const allStreamSummary = streamInfoList.map(s => s.info).join(' ');

  const typeOrder = streams.map(s => s.codec_type);
  const firstAudio = typeOrder.findIndex(t => t === 'audio');
  const firstSubtitle = typeOrder.findIndex(t => t === 'subtitle');
  const lastVideo = typeOrder.lastIndexOf('video');
  const lastAudio = typeOrder.lastIndexOf('audio');

  const hasBadOrder =
    (firstAudio !== -1 && firstAudio < lastVideo) ||
    (firstSubtitle !== -1 && firstSubtitle < lastAudio) ||
    (firstSubtitle !== -1 && firstSubtitle < lastVideo);

  if (hasBadOrder) {
    return {
      processFile: false,
      preset: '',
      container: '',
      infoLog: `FAIL: Stream group order invalid. Found order: ${typeOrder.join(',')} | ${allStreamSummary}`,
      output: 2,
    };
  }

  const grouped = {};
  preferredLangs.forEach(lang => {
    grouped[lang] = [];
  });
  const undOrOther = [];

  for (const stream of audioStreams) {
    if (preferredLangs.includes(stream.language)) {
      grouped[stream.language].push(stream);
    } else {
      undOrOther.push(stream);
    }
  }

  const expectedAudioOrder = [];
  for (const lang of preferredLangs) {
    const sorted = grouped[lang].sort((a, b) => b.channels - a.channels);
    expectedAudioOrder.push(...sorted);
  }
  expectedAudioOrder.push(...undOrOther);

  const actualAudioOrder = audioStreams.map(s => `${s.language}-${s.channels}`);
  const expectedAudioOrderStrings = expectedAudioOrder.map(s => `${s.language}-${s.channels}`);

  const audioOrderMismatch = actualAudioOrder.join('|') !== expectedAudioOrderStrings.join('|');

  if (audioOrderMismatch) {
    return {
      processFile: false,
      preset: '',
      container: '',
      infoLog: `FAIL: Audio stream order mismatch. Actual: [${actualAudioOrder.join(' ')}] Expected: [${expectedAudioOrderStrings.join(' ')}] | ${allStreamSummary}`,
      output: 2,
    };
  }

  return {
    processFile: false,
    preset: '',
    container: '',
    infoLog: `PASS: Stream order valid. ${allStreamSummary}`,
    output: 1,
  };
};

module.exports = {
  plugin,
  details,
};
