const path = require("path");
const arg = require("arg");
const App = require("./lib/app");
const CLILogger = require("./lib/cli-logger");
const { readConfig } = require("./lib/utils");

const DEFAULT_FILEPATH = "asyncapi/asyncapi.yaml";
const DEFAULT_REGISTRY =
  "https://artifacts.rbi.tech/artifactory/api/npm/npm-group/";
const DEFAULT_CONFIG = ".github/asyncapi.yaml";
const DEFAULT_OUTPUT = "output";

// Parsing args
const args = arg({
  "--template": String,
  "-t": "--template",
  "--filepath": String,
  "-f": "--filepath",
  "--output": String,
  "-o": "--output",
  "--params": String,
  "-p": "--params",
  "--registry": String,
  "-r": "--registry",
  "--config": String,
  "-c": "--config",
  "--dir": String,
  "-d": "--dir",
  "--debug": Boolean,
});

const dir = args["--dir"] || process.cwd();

// Initialize logger
const logger = new CLILogger(args["--debug"]);

// Parse config
const config = readConfig(
  path.resolve(dir, args["--config"] || DEFAULT_CONFIG)
);

// Merge with arguments
if (args["--filepath"]) {
  config.filepath = args["--filepath"];
}
if (args["--registry"]) {
  config.registry = args["--registry"];
}
if (args["--template"]) {
  config.generators = [
    {
      template: args["--template"],
      output: args["--output"] || DEFAULT_OUTPUT,
      params: args["--params"],
    },
  ];
}

// Set defaults
if (!config.filepath) {
  config.filepath = DEFAULT_FILEPATH;
}
if (!config.registry) {
  config.registry = DEFAULT_REGISTRY;
}

// Handle no generators specified
if (!config.generators) {
  logger.error(
    "no generators specified.\neither include a list of generators in config file or use '--template' flag."
  );
  process.exit(1);
}

// Resolve paths
config.filepath = path.resolve(dir, config.filepath);
config.generators = config.generators.map(generator => {
  return {
    template: generator.template,
    output: path.resolve(dir, generator.output),
    params: generator.params,
  };
});

const app = new App({
  ...config,
  logger,
});

app.run();
