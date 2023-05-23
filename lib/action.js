const core = require("@actions/core");
const path = require("path");
const App = require("./lib/app");
const { readConfig } = require("./lib/utils");

const DEFAULT_FILEPATH = "asyncapi/asyncapi.yaml";
const DEFAULT_REGISTRY =
  "https://artifacts.rbi.tech/artifactory/api/npm/npm-group/";
const DEFAULT_CONFIG = ".github/asyncapi.yaml";
const DEFAULT_OUTPUT = "output";

const dir = process.env.GITHUB_WORKSPACE || process.cwd();

// Parse config
const config = readConfig(
  path.resolve(dir, core.getInput("config_file") || DEFAULT_CONFIG)
);

// Merge with arguments
if (core.getInput("filepath")) {
  config.filepath = core.getInput("filepath");
}
if (core.getInput("registry")) {
  config.registry = core.getInput("registry");
}
if (core.getInput("template")) {
  config.generators = [
    {
      template: core.getInput("template"),
      output: core.getInput("output") || DEFAULT_OUTPUT,
      params: core.getInput("params"),
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
  core.error(
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
  logger: core,
});

app.run();
