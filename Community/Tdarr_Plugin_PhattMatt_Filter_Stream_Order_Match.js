const details = () => ({
  id: 'Tdarr_Plugin_PhattMatt_Filter_Stream_Order_Match',
  Stage: 'Pre-processing',
  Name: 'Phatt Matt: Stream Order Match V1.3',
  Type: 'Video',
  Operation: 'Filter',
  Description: `Checks if stream order matches user-defined preferences (languages, codecs, channels, streamTypes), ignoring values not present in the file. Logs stream info for debugging without HTML or line breaks.`,
  Version: '1.3',
  Tags: 'filter',
  Inputs: [
    {
      name: 'processOrder',
      type: 'string',
      defaultValue: 'codecs,channels,languages,streamTypes',
      inputUI: {
        type: 'text',
      },
      tooltip: `Order in which to sort stream properties. Last one takes precedence. Example: codecs,channels,languages,streamTypes`,
    },
    {
      name: 'languages',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: `Comma-separated language priority list. Leave blank to disable. Example: eng,jpn`,
    },
    {
      name: 'channels',
      type: 'string',
      defaultValue: '7.1,5.1,2,1',
      inputUI: {
        type: 'text',
      },
      tooltip: `Comma-separated audio channel order. Example: 7.1,5.1,2,1`,
    },
    {
      name: 'codecs',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: `Comma-separated codec order. Example: aac,ac3`,
    },
    {
      name: 'streamTypes',
      type: 'string',
      defaultValue: 'video,audio,subtitle',
      inputUI: {
        type: 'text',
      },
      tooltip: `Comma-separated stream type order. Example: video,audio,subtitle`,
    },
  ],
});

const plugin = (file, librarySettings, inputs, otherArguments) => {
  const lib = require('../methods/lib')();
  inputs = lib.loadDefaultValues(inputs, details);

  const response = {
    processFile: false,
    preset: '',
    container: `.${file.container}`,
    FFmpegMode: false,
    handBrakeMode: false,
    infoLog: '',
    filterReason: '',
  };

  if (!Array.isArray(file.ffProbeData.streams)) {
    response.filterReason = 'No stream info available';
    return response;
  }

  let { streams } = JSON.parse(JSON.stringify(file.ffProbeData));
  streams.forEach((s, i) => s.typeIndex = i);

  const formatStreamLog = (label, streamList) => {
    let result = label + ':';
    streamList.forEach((s, idx) => {
      const lang = s.tags?.language || '';
      const chan = s.channels || '';
      result += ` [${idx} type=${s.codec_type} codec=${s.codec_name} channels=${chan} language=${lang}]`;
    });
    return result;
  };

  const originalStreams = JSON.stringify(streams);
  response.infoLog += formatStreamLog('OriginalStreamOrder', streams);

  const sortStreams = (sortType) => {
    const allItems = sortType.inputs.split(',').map((x) => x.trim()).filter((x) => x);
    const existingItems = [];

    for (const stream of streams) {
      const value = String(sortType.getValue(stream));
      if (allItems.includes(value) && !existingItems.includes(value)) {
        existingItems.push(value);
      }
    }

    const items = existingItems.reverse();

    for (const item of items) {
      const matched = [];
      for (let j = 0; j < streams.length; j++) {
        const value = String(sortType.getValue(streams[j]));
        if (value === item) {
          if (
            streams[j].codec_long_name?.includes('image') ||
            streams[j].codec_name?.includes('png')
          ) {
            continue;
          }
          matched.push(streams[j]);
          streams.splice(j, 1);
          j--;
        }
      }
      streams = matched.concat(streams);
    }
  };

  const {
    processOrder, languages, channels, codecs, streamTypes,
  } = inputs;

  const sortTypes = {
    languages: {
      getValue: (s) => s.tags?.language || '',
      inputs: languages,
    },
    codecs: {
      getValue: (s) => s.codec_name || '',
      inputs: codecs,
    },
    channels: {
      getValue: (s) => {
        const map = { 8: '7.1', 6: '5.1', 2: '2', 1: '1' };
        return map[s.channels] || '';
      },
      inputs: channels,
    },
    streamTypes: {
      getValue: (s) => s.codec_type || '',
      inputs: streamTypes,
    },
  };

  const orderList = processOrder.split(',').map((x) => x.trim());
  for (const key of orderList) {
    if (sortTypes[key] && sortTypes[key].inputs) {
      sortStreams(sortTypes[key]);
    }
  }

  response.infoLog += ' ' + formatStreamLog('SortedStreamOrder', streams);

  const reordered = JSON.stringify(streams);
  if (reordered !== originalStreams) {
    response.filterReason = 'Streams do not match preferred order';
    response.processFile = true;
  } else {
    response.filterReason = 'Streams already in preferred order';
    response.processFile = false;
  }

  return response;
};

module.exports.details = details;
module.exports.plugin = plugin;
