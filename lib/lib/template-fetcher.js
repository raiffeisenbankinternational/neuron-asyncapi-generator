const { PromisePool } = require("@supercharge/promise-pool");
const pacote = require("pacote");
const Arborist = require("@npmcli/arborist");
const path = require("path");

class TemplateFetcher {
  constructor(root, registry, logger) {
    this.path = root;
    this.registry = registry;
    this.logger = logger;
  }

  async installTemplate(templates) {
    if (typeof templates === "string") {
      templates = [templates];
    } else if (!Array.isArray(templates)) {
      throw new Error("Parameter must be a string or an array of strings");
    }

    // Fetch templates in parallel
    const out = await PromisePool.for(templates)
      .onTaskFinished(generator => {
        if (this.logger) {
          this.logger.info(`fetched template '${generator.template}'`);
        }
      })
      .process(async generator => {
        const p = await this._resolveTemplate(generator.template);

        const fetched = await this._fetchDependencies(p);

        // Merge the input generator with output of fetch to
        // add the installed template path
        return { ...generator, ...fetched };
      });

    if (out.errors.length > 0) {
      for (const e of out.errors) {
        this.logger.error(e.raw);
      }
      throw new Error("Failed to install templates");
    }

    return out.results;
  }

  // Resolve path to template.
  // If template is a local path we just return that path resolved
  // otherwise we fetch the template from npm, git, http or somewhere
  // else and return the extracted path instead.
  async _resolveTemplate(template) {
    const tmpl = template;
    const manifest = await pacote.manifest(tmpl, { registry: this.registry });

    if (manifest._from.startsWith("file:")) {
      return manifest._resolved;
    } else {
      // If the template is over http(s) it most likely has a file extension
      // we replace `.` with `_` in the output path (any archive is unarchived).
      // my-awesome-template.tar.gz -> my-awesome-template_tar_gz/
      if (template.startsWith("http://") || template.startsWith("https://")) {
        template = template.split("/").slice(-1)[0].replace(/\./g, "_");
      }

      const p = path.resolve(this.path, template);
      await pacote.extract(tmpl, p, { registry: this.registry });

      return p;
    }
  }

  // Fetch all dependencies in a template from its package.json
  _fetchDependencies(templatePath) {
    const arb = new Arborist({
      registry: this.registry,
      path: templatePath,
    });

    return new Promise(async (resolve, reject) => {
      try {
        const installResult = await arb.reify({
          omit: ["dev"],
        });

        const packageName = installResult.name;
        const packageVersion = installResult.version;
        const packagePath = installResult.path;

        resolve({
          template: `${packageName}@${packageVersion}`,
          path: packagePath,
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}

module.exports = TemplateFetcher;
