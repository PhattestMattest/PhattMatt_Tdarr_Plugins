const details = () => ({
  id: 'Tdarr_Plugin_PhattMatt_Filter_Stream_Order_Match',
  Stage: 'Pre-processing',
  Name: 'Phatt Matt: Stream Order Match V1.5',
  Type: 'Filter',
  Operation: 'Filter',
  Description:
    'Checks that streams are ordered as video > audio (in specified language/channel order) > subtitles. Routes to Output 1 if correct, Output 2 if not.',
  Version: '1.5',
  Tags: 'pre-processing,filter,stream order,audio,language,channel',
  Inputs: [
    {
      name: 'preferredAudioLanguages',
      type: 'string',
      defaultValue: 'eng,jpn,chi',
      inputText: 'Preferred Audio Languages (comma-separated, e.g., eng,jpn,chi)',
    },
  ],
});

const plugin = ({ ffprobeData, inputs }) => {
  if (!ffprobeData || !ffprobeData.streams) {
    return {
      processFile: false,
      preset: '',
      container: '',
      infoLog: 'No ffprobe data available',
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
    if (type === 'video') videoStreams.push({ index, type, codec, channels, language });
    else if (type === 'audio') audioStreams.push({ index, type, codec, channels, language });
    else if (type === 'subtitle') subtitleStreams.push({ index, type, codec, channels, language });
    return { index, type, codec, channels, language };
  });

  // Check stream type section order: video -> audio -> subtitle
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
      infoLog: `Stream grouping invalid. Order must be video > audio > subtitle. Found order: ${typeOrder.join(',')}`,
      output: 2,
    };
  }

  // Build expected audio order based on language priority and channel count
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

  // Sort per-language group by descending channels
  const expectedAudioOrder = [];
  for (const lang of preferredLangs) {
    const sorted = grouped[lang].sort((a, b) => b.channels - a.channels);
    expectedAudioOrder.push(...sorted);
  }
  expectedAudioOrder.push(...undOrOther);

  // Compare actual vs expected audio order
  const actualAudioOrder = audioStreams.map(s => `${s.language}-${s.channels}`);
  const expectedAudioOrderStrings = expectedAudioOrder.map(s => `${s.language}-${s.channels}`);

  const audioOrderMismatch = actualAudioOrder.join('|') !== expectedAudioOrderStrings.join('|');

  if (audioOrderMismatch) {
    return {
      processFile: false,
      preset: '',
      container: '',
      infoLog: `Audio stream order invalid. Actual: [${actualAudioOrder.join(' ')}] Expected: [${expectedAudioOrderStrings.join(' ')}]`,
      output: 2,
    };
  }

  // All checks passed
  const summary = streamInfoList.map(s => `[${s.index} type=${s.type} codec=${s.codec} channels=${s.channels} language=${s.language}]`).join(' ');
  return {
    processFile: false,
    preset: '',
    container: '',
    infoLog: `Stream order valid. ${summary}`,
    output: 1,
  };
};

module.exports = { plugin, details };
