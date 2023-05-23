const url = require("url");
const fs = require("fs");
const yaml = require("js-yaml");

const paramParser = input => {
  const params = {};

  if (!input) return params;
  if (!input.includes("=")) {
    throw new Error(
      `Invalid param ${input}. It must be in the format of name=value.`
    );
  }

  input.split(" ").forEach(el => {
    const chunks = el.split("=");
    const paramName = chunks[0];
    const paramValue = chunks[1];
    params[paramName] = paramValue;
  });

  return params;
};

const isFilePath = str => {
  return !url.parse(str).hostname;
};

const readConfig = path => {
  try {
    const conf = fs.readFileSync(path, "utf8");
    return yaml.load(conf) || {};
  } catch (e) {
    if (e.code === "ENOENT") {
      return {};
    }
    throw e;
  }
};

module.exports = {
  paramParser,
  isFilePath,
  readConfig,
};
