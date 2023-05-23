const core = require("@actions/core");
const mkdirp = require("mkdirp");
const axios = require("axios");
const Generator = require("@asyncapi/generator");
const fs = require("fs");
const TemplateFetcher = require("./template-fetcher");
const { PromisePool } = require("@supercharge/promise-pool");
const yaml = require("js-yaml");
const { isFilePath, paramParser } = require("./utils");

const green = text => `\x1b[32m${text}\x1b[0m`;

class App {
  constructor(config) {
    this.asyncapiFile = config.filepath;
    this.registry = config.registry;
    this.generators = config.generators;
    this.logger = config.logger || core;
  }

  async run() {
    try {
      // Below additional log information is visible only if you add
      // ACTIONS_STEP_DEBUG secret to your repository where you run your action.
      // The value of this secret must be "true"
      this.logger.debug(`AsyncAPI: ${this.asyncapiFile}`);
      this.logger.debug(`Registry: ${this.registry}`);
      this.logger.debug(`Generators:\n${yaml.dump(this.generators)}`);

      // Pre-fetch templates
      const templates = await this._fetchTemplates();

      // Pre-fetch asyncapi doc
      const asyncapi = await this._readAsyncapiDoc();

      // Run generator
      await this._runGenerator(asyncapi, templates);

      this.logger.info(green("\n\nDone! ✨"));
    } catch (e) {
      this.logger.setFailed(e);
    }
  }

  async _fetchTemplates() {
    this.logger.startGroup("Fetching templates");
    const fetcher = new TemplateFetcher(
      "/tmp/asyncapi",
      this.registry,
      this.logger
    );
    const templates = await fetcher.installTemplate(this.generators);
    this.logger.endGroup();
    return templates;
  }

  async _readAsyncapiDoc() {
    if (!isFilePath(this.asyncapiFile)) {
      this.logger.startGroup("Fetching remote AsyncAPI doc");
      this.logger.info(`Fetching '${this.asyncapiFile}'...`);
      const opts = {};
      if (
        this.asyncapiFile.startsWith("https://raw.code.rbi.tech") &&
        process.env.GITHUB_TOKEN
      ) {
        opts.headers = { Authorization: `token ${process.env.GITHUB_TOKEN}` };
      }
      const res = await axios.get(this.asyncapiFile, opts);
      this.logger.info(`Successfully downloaded ${this.asyncapiFile}`);
      this.logger.endGroup();
      return res.data;
    } else {
      return fs.readFileSync(this.asyncapiFile, "utf8");
    }
  }

  async _runGenerator(doc, templates) {
    // Special resolver for https://raw.code.rbi.tech and http://code.rbi.tech
    // that uses $GITHUB_TOKEN env variable (if available) to authenticate.
    const ghresolver = {
      order: 1,
      canRead: /^https:\/\/(?:raw\.)?code.rbi.tech/,
      read(f, cb, _) {
        const opts = {};
        if (process.env.GITHUB_TOKEN) {
          opts.headers = { Authorization: `token ${process.env.GITHUB_TOKEN}` };
        }
        this.logger.debug(`Fetching '${f.url}'...`);
        this.logger.debug(`Options: '${opts}'`);
        axios
          .get(f.url, opts)
          .then(res => {
            cb(null, res.data);
          })
          .catch(e => {
            cb(e);
          });
      },
    };
    const opts = {
      resolve: {
        codeRBITech: ghresolver,
      },
    };

    this.logger.startGroup("Running template");

    // Run generators in parallel
    const out = await PromisePool.for(templates).process(async template => {
      await mkdirp(template.output);

      const generatorOpts = { forceWrite: true };

      if (template.params) {
        generatorOpts.templateParams = paramParser(template.params);
      }

      const generator = new Generator(template.path, template.output, generatorOpts);

      await generator.generateFromString(doc, opts);

      return { ...template, success: true };
    });

    if (out.errors.length > 0) {
      for (const e of out.errors) {
        this.logger.error(e.raw);
      }
      throw new Error("Failed to run generator");
    }

    this.logger.endGroup();

    return out.results;
  }
}

module.exports = App;
