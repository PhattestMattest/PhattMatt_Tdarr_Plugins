const details = () => ({
  id: 'Tdarr_Plugin_PhattMatt_Filter_Unwanted_Video_Codecs',
  Stage: 'Pre-processing',
  Name: 'Phatt Matt: Filter Out Unwanted Video Codecs V1.1',
  Type: 'Video',
  Operation: 'Filter',
  Description:
    'Skips files if any video stream contains a codec from the unwanted list. Otherwise, processes the file.',
  Version: '1.1',
  Tags: 'filter',
  Inputs: [
    {
      name: 'unwantedVideoCodecs',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip:
        'Enter a comma-separated list of unwanted video codecs. If any are present, the file will be skipped.',
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

  const unwantedList = inputs.unwantedVideoCodecs
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  const matchedUnwanted = streamCodecs.filter((c) =>
    unwantedList.includes(c)
  );

  response.infoLog += `Video stream codecs found: ${streamCodecs.join(', ')}\n`;

  if (matchedUnwanted.length > 0) {
    response.processFile = false;
    response.infoLog += `Unwanted codecs present: ${matchedUnwanted.join(', ')}. Skipping file.\n`;
  } else {
    response.infoLog += 'No unwanted codecs found. Processing file.\n';
  }

  return response;
};

module.exports.details = details;
module.exports.plugin = plugin;
