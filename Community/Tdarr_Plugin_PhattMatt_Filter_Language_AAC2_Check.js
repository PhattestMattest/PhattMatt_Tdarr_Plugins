const details = () => ({
  id: 'Tdarr_Plugin_PhattMatt_Filter_Language_AAC2_Check',
  Stage: 'Pre-processing',
  Name: 'Filter: Language Must Be AAC 2.0',
  Type: 'Audio',
  Operation: 'Filter',
  Description: 'Checks if audio streams for selected languages are AAC 2.0 (if present).',
  Version: '1.0',
  Tags: 'filter,audio,language,aac,channels',
  Inputs: [
    {
      name: 'languagesToCheck',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Comma-separated list of language codes to check (e.g., eng,jpn,spa).',
    },
  ],
});

const plugin = (file, librarySettings, inputs, otherArguments) => {
  const lib = require('../methods/lib')();
  inputs = lib.loadDefaultValues(inputs, details);

  const response = {
    processFile: true,
    infoLog: '',
  };

  if (!file.ffProbeData || !file.ffProbeData.streams) {
    response.infoLog += 'No ffprobe stream data found. Treating file as passing.\n';
    return response;
  }

  const audioStreams = file.ffProbeData.streams.filter(
    (s) => s.codec_type === 'audio'
  );

  if (audioStreams.length === 0) {
    response.infoLog += 'No audio streams found. Treating file as passing.\n';
    return response;
  }

  const languages = inputs.languagesToCheck
    .toLowerCase()
    .split(',')
    .map((lang) => lang.trim())
    .filter((lang) => lang.length > 0);

  if (languages.length === 0) {
    response.infoLog += 'No languages specified. Treating file as passing.\n';
    return response;
  }

  let hasTargetLanguages = false;
  let hasInvalidStreams = false;

  audioStreams.forEach((stream) => {
    const lang = (stream.tags && stream.tags.language) ? stream.tags.language.toLowerCase() : '';
    const codec = stream.codec_name ? stream.codec_name.toLowerCase() : '';
    const channels = stream.channels || 0;

    if (languages.includes(lang)) {
      hasTargetLanguages = true;

      const isAAC2 = codec === 'aac' && channels === 2;
      response.infoLog += `Stream ${stream.index}: lang=${lang}, codec=${codec}, channels=${channels}, isAAC2=${isAAC2}\n`;

      if (!isAAC2) {
        hasInvalidStreams = true;
      }
    }
  });

  if (!hasTargetLanguages) {
    response.infoLog += 'No matching languages present in the file. Treating file as passing.\n';
    response.processFile = true;
    return response;
  }

  if (hasInvalidStreams) {
    response.infoLog += 'At least one stream in the selected languages is not AAC 2.0. Breaking out of plugin stack.\n';
    response.processFile = false;
  } else {
    response.infoLog += 'All matching language streams are AAC 2.0. Passing file to next plugin.\n';
    response.processFile = true;
  }

  return response;
};

module.exports.details = details;
module.exports.plugin = plugin;
