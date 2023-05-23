const red = text => `\x1b[31m${text}\x1b[0m`;
const yellow = text => `\x1b[33m${text}\x1b[0m`;
const magenta = text => `\x1b[35m${text}\x1b[0m`;

// Simple class that mimics '@actions/core' API
// but looks better in CLI
class CLILogger {
  constructor(debug) {
    this._debug = debug || false;
  }

  info(text) {
    console.log(text);
  }

  debug(text) {
    if (this._debug) {
      const debugString = text
        .split("\n")
        .filter(line => line !== "")
        .map(line => "DEBUG: " + line)
        .join("\n");
      console.log(yellow(debugString));
    }
  }

  error(text) {
    if (typeof text !== "string") {
      text = text.toString();
    }
    const errorString = text
      .split("\n")
      .filter(line => line !== "")
      .map(line => "ERROR: " + line)
      .join("\n");
    console.log(red(errorString));
  }

  setFailed(text) {
    if (text) {
      this.error(text);
    }
    process.exit(1);
  }

  startGroup(text) {
    console.log(magenta(text));
  }

  endGroup() {
    console.log();
  }
}

module.exports = CLILogger;
