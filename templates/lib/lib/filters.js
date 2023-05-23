const yaml = require("js-yaml");
const schema = require("./schema");

const prepareSchema = data => {
  const ret = {};
  if (data.hasExt("x-type")) {
    if (data.ext("x-type").includes("avro")) {
      ret.type = "AVRO";
    } else if (data.ext("x-type").includes("json")) {
      ret.type = "JSON";
    }
  }

  // If `x-parser-original-schema-format` includes `avro` the parser has converted
  // the original avro schema payload to json schema.
  // Here we just pull out the original avro schema set in `x-parser-original-payload`.
  if (
    data.hasExt("x-parser-original-schema-format") &&
    data.ext("x-parser-original-schema-format").includes("avro")
  ) {
    ret.schema = data.ext("x-parser-original-payload");

    // Otherwise we convert the json schema payload to avro schema.
  } else {
    const normalized = schema.normalize(data.payload()._json);
    const avroized = schema.jsonSchemaToAvro(normalized);
    ret.schema = avroized;
  }

  return ret;
};

const toYaml = data => {
  return yaml.dump(data);
};

module.exports = {
  prepareSchema,
  toYaml,
};
