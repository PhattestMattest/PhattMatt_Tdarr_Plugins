const details = () => ({
  id: 'Tdarr_Plugin_PhattMatt_Filter_All_Video_Codecs',
  Stage: 'Pre-processing',
  Name: 'Filter by Codec (All Video Streams)',
  Type: 'Video',
  Operation: 'Filter',
  Description:
    'Scans all video streams and only allows processing if specified codecs are present or absent.',
  Version: '1.1',
  Tags: 'filter',
  Inputs: [
    {
      name: 'codecsToProcess',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip:
        'Enter a comma-separated list of video codecs to process. Leave blank if using codecsToNotProcess.',
    },
    {
      name: 'codecsToNotProcess',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip:
        'Enter a comma-separated list of video codecs to NOT process. Leave blank if using codecsToProcess.',
    },
  ],
});

const plugin = (file, librarySettings, inputs, otherArguments) => {
  const lib = require('../methods/lib')();
  inputs = lib.loadDefaultValues(inputs, details);

  const response = {
    processFile: false,
    infoLog: '',
  };

  const videoStreams = (file.ffProbeData?.streams || []).filter(
    (s) => s.codec_type === 'video'
  );

  if (videoStreams.length === 0) {
    response.infoLog += 'No video streams found.\n';
    return response;
  }

  const streamCodecs = videoStreams.map((stream) =>
    (stream.codec_name || '').toLowerCase()
  );

  if (inputs.codecsToProcess !== '') {
    const codecsToProcess = inputs.codecsToProcess
      .split(',')
      .map((c) => c.trim().toLowerCase());

    const match = streamCodecs.some((c) => codecsToProcess.includes(c));

    if (match) {
      response.processFile = true;
      response.infoLog += `At least one video stream matched codecsToProcess (${codecsToProcess.join(', ')}).\n`;
    } else {
      response.infoLog += `No video streams matched codecsToProcess (${codecsToProcess.join(', ')}). Skipping file.\n`;
    }
  }

  if (inputs.codecsToNotProcess !== '') {
    const codecsToNotProcess = inputs.codecsToNotProcess
      .split(',')
      .map((c) => c.trim().toLowerCase());

    const match = streamCodecs.some((c) => codecsToNotProcess.includes(c));

    if (match) {
      response.processFile = false;
      response.infoLog += `At least one video stream matched codecsToNotProcess (${codecsToNotProcess.join(', ')}). Skipping file.\n`;
    } else {
      response.processFile = true;
      response.infoLog += `No video streams matched codecsToNotProcess (${codecsToNotProcess.join(', ')}). Processing file.\n`;
    }
  }

  return response;
};

module.exports.details = details;
module.exports.plugin = plugin;
