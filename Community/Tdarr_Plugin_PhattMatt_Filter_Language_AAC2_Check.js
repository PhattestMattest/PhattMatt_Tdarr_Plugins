const details = () => ({
  id: 'Tdarr_Plugin_PhattMatt_Filter_Language_AAC2_Check',
  Stage: 'Pre-processing',
  Name: 'Phatt Matt: Check for AAC 2.0 V1.2',
  Type: 'Audio',
  Operation: 'Filter',
  Description:
    'If any of the specified languages are present, at least one AAC 2.0 stream must exist for each of them. If none of the specified languages are found, the file is allowed to pass. Logs all audio streams.',
  Version: '1.2',
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

  // Log all audio streams
  response.infoLog += 'Audio streams found:\n';
  audioStreams.forEach((stream) => {
    const lang = (stream.tags && stream.tags.language) ? stream.tags.language.toLowerCase() : 'und';
    const codec = stream.codec_name || 'unknown';
    const channels = stream.channels || '?';
    response.infoLog += `  Stream ${stream.index}: lang=${lang}, codec=${codec}, channels=${channels}\n`;
  });

  let failedLanguageCheck = false;

  for (const lang of languages) {
    const matchingStreams = audioStreams.filter((stream) => {
      const streamLang = (stream.tags && stream.tags.language) ? stream.tags.language.toLowerCase() : '';
      return streamLang === lang;
    });

    if (matchingStreams.length === 0) {
      response.infoLog += `Language '${lang}' not present. Skipping.\n`;
      continue;
    }

    const hasAAC2 = matchingStreams.some((stream) => {
      const codec = stream.codec_name ? stream.codec_name.toLowerCase() : '';
      const channels = stream.channels || 0;
      return codec === 'aac' && channels === 2;
    });

    if (!hasAAC2) {
      response.infoLog += `Language '${lang}' is present but has no AAC 2.0 stream. Failing.\n`;
      failedLanguageCheck = true;
    } else {
      response.infoLog += `Language '${lang}' is present and has at least one AAC 2.0 stream.\n`;
    }
  }

  if (failedLanguageCheck) {
    response.processFile = false;
    response.infoLog += 'One or more specified languages lacked AAC 2.0. Breaking out of plugin stack.\n';
  } else {
    response.processFile = true;
    response.infoLog += 'All present specified languages have at least one AAC 2.0 stream. Passing file.\n';
  }

  return response;
};

module.exports.details = details;
module.exports.plugin = plugin;
