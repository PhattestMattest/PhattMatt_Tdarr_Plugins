"use strict";

const { createReadStream, createWriteStream } = require("fs");
const { statSync, existsSync, mkdirSync } = require("fs");
const { getFileName, getContainer } = require("../../../../FlowHelpers/1.0.0/fileUtils");
const normJoinPath = require("../../../../FlowHelpers/1.0.0/normJoinPath").default;

const details = () => ({
  name: "Copy to Working Directory (Optimized)",
  description: "Efficiently copy the input file to the working directory if it's not already there.",
  style: { borderColor: "green" },
  tags: "",
  isStartPlugin: false,
  pType: "",
  requiresVersion: "2.11.01",
  sidebarPosition: -1,
  icon: "faArrowRight",
  inputs: [],
  outputs: [
    { number: 1, tooltip: "Continue to next plugin" }
  ],
});

const plugin = async (args) => {
  const lib = require("../../../../../methods/lib")();
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  const inputPath = args.inputFileObj._id;
  const outputDir = args.workDir;
  const fileName = getFileName(inputPath);
  const container = getContainer(inputPath);
  const outputFile = normJoinPath({
    upath: args.deps.upath,
    paths: [outputDir, `${fileName}.${container}`],
  });

  args.jobLog(`Input: ${inputPath}`);
  args.jobLog(`Output: ${outputFile}`);

  if (inputPath === outputFile) {
    args.jobLog("Input and output path are the same. Skipping copy.");
    return {
      outputFileObj: { _id: inputPath },
      outputNumber: 1,
      variables: args.variables,
    };
  }

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  await new Promise((resolve, reject) => {
    const readStream = createReadStream(inputPath);
    const writeStream = createWriteStream(outputFile);

    readStream.on("error", reject);
    writeStream.on("error", reject);
    writeStream.on("close", resolve);

    readStream.pipe(writeStream);
  });

  return {
    outputFileObj: { _id: outputFile },
    outputNumber: 1,
    variables: args.variables,
  };
};

exports.details = details;
exports.plugin = plugin;
