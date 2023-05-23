const config = {
  collectCoverage: true,
  coverageReporters: [
    "clover",
    "json",
    "lcov",
    ["text", { file: "report.txt" }],
    "text",
  ],
};

module.exports = config;
