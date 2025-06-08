'use strict';

const fs = require('fs');
const { getFileName, getContainer, getSubStem } = require('../../../../FlowHelpers/1.0.0/fileUtils');
const normJoinPath = require('../../../../FlowHelpers/1.0.0/normJoinPath').default;
const lib = require('../../../../../methods/lib')();

const details = () => ({
  name: 'Copy to Directory (Optimized)',
  description: 'Copy the working file to a directory using high-speed streams',
  style: { borderColor: 'green' },
  tags: '',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: 'faArrowRight',
  inputs: [
    {
      label: 'Output Directory',
      name: 'outputDirectory',
      type: 'string',
      defaultValue: '',
      inputUI: { type: 'directory' },
      tooltip: 'Specify output directory',
    },
    {
      label: 'Keep Relative Path',
      name: 'keepRelativePath',
      type: 'boolean',
      defaultValue: 'false',
      inputUI: { type: 'switch' },
      tooltip: 'Specify whether to keep the relative path',
    },
    {
      label: 'Make Working File',
      name: 'makeWorkingFile',
      type: 'boolean',
      defaultValue: 'false',
      inputUI: { type: 'switch' },
      tooltip: 'Make the copied file the working file',
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Continue to next plugin',
    },
  ],
});

const plugin = async (args) => {
  args.inputs = lib.loadDefaultValues(args.inputs, details);
  const { keepRelativePath, makeWorkingFile } = args.inputs;
  const outputDirectory = String(args.inputs.outputDirectory);

  const originalFileName = getFileName(args.inputFileObj._id);
  const newContainer = getContainer(args.inputFileObj._id);

  let outputPath = '';
  if (keepRelativePath) {
    const subStem = getSubStem({
      inputPathStem: args.librarySettings.folder,
      inputPath: args.originalLibraryFile._id,
    });
    outputPath = normJoinPath({
      upath: args.deps.upath,
      paths: [outputDirectory, subStem],
    });
  } else {
    outputPath = outputDirectory;
  }

  const outputFilePath = normJoinPath({
    upath: args.deps.upath,
    paths: [outputPath, `${originalFileName}.${newContainer}`],
  });

  let workingFile = args.inputFileObj._id;
  if (makeWorkingFile) {
    workingFile = outputFilePath;
  }

  if (args.environment === 'development') {
    args.jobLog(`Input path: ${args.inputFileObj._id}`);
    args.jobLog(`Output path: ${outputPath}`);
  }

  if (args.inputFileObj._id === outputFilePath) {
    args.jobLog('Input and output path are the same, skipping copy.');
    return {
      outputFileObj: { _id: args.inputFileObj._id },
      outputNumber: 1,
      variables: args.variables,
    };
  }

  await args.deps.fsextra.ensureDir(outputPath);

  // Fast copy using streams
  await new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(args.inputFileObj._id, { highWaterMark: 64 * 1024 * 1024 });
    const writeStream = fs.createWriteStream(outputFilePath);
    readStream.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('close', resolve);
    readStream.pipe(writeStream);
  });

  return {
    outputFileObj: { _id: workingFile },
    outputNumber: 1,
    variables: args.variables,
  };
};

exports.details = details;
exports.plugin = plugin;
