const {
  filters,
  schema,
  AvroSchema,
} = require("@neuron/asyncapi-template-lib");
const wordwrap = require("wordwrapjs");

const typeMap = {
  string: {
    binary: "bytes",
    default: "string",
  },
  number: {
    float: "float",
    double: "double",
    default: "float",
  },
  integer: {
    int32: "int",
    int64: "long",
    default: "int",
  },
  boolean: {
    default: "boolean",
  },
  null: {
    default: "null",
  },
};

const typeClassMap = {
  bytes: "Bytes",
  float: "Float",
  double: "Double",
  int: "Integer",
  long: "Long",
  string: "String",
  boolean: "Boolean",
  null: "Null",
};

function mapType(fieldType, fieldFormat) {
  const format = fieldFormat || "default";
  return typeMap[fieldType][format] || typeMap[fieldType].default;
}
filters.mapType = mapType;

function mapClassType(fieldType, fieldFormat) {
  return typeClassMap[mapType(fieldType, fieldFormat)];
}
filters.mapClassType = mapClassType;

function normalizeForPython(fieldName) {
  switch (fieldName) {
    case "type":
      return "type_";
    default:
      return fieldName;
  }
}
filters.normalizeForPython = normalizeForPython;

function pythonComment(text) {
  return wordwrap
    .lines(text, { width: 60 })
    .filter(l => l !== "") // Filter out empty lines
    .map(l => `# ${l}`) // Prepend each line with #
    .join("\n"); // Join all lines together into a single string
}
filters.pythonComment = pythonComment;

// Handle all primitive types:
// https://avro.apache.org/docs/current/spec.html#schema_primitive
// https://github.com/apache/pulsar/blob/master/pulsar-client-cpp/python/pulsar/schema/definition.py
function _mapFieldType(fieldType) {
  switch (fieldType) {
    // Fields that are not simply pascalized
    case "int":
      return "Integer";
    // Fields that are only pascalized
    case "null":
    case "boolean":
    case "long":
    case "float":
    case "double":
    case "bytes":
    case "string":
      return schema.pascalize(fieldType);
    default:
      // Best effort return the type
      return fieldType;
  }
}

function _findPulsarType(field) {
  switch (field.type()) {
    case "record":
      return [field.name()];
    case "array":
      let type;
      const items = field.items();
      if (typeof items === "string") {
        type = `${_mapFieldType(items)}()`;
      } else if (items instanceof AvroSchema) {
        type = toPulsarField(items);
      } else if (Array.isArray(items)) {
        if (items.length > 1) {
          throw new Error(
            `a multi type field is currently not supported by this template. '${field.name()}' has ${
              items.length
            } possible types.`
          );
        }
        type = type[0];
      }
      return ["Array", type];
    case "enum":
      return ["CustomEnum", field.name()];
    default:
      // If field.type() is another instance of AvroSchema
      // we have to recurse until we find something we can
      // output.
      if (field.type() instanceof AvroSchema) {
        return _findPulsarType(field.type());
      }

      return [_mapFieldType(field.type())];
  }
}

function toPulsarField(field) {
  if (Array.isArray(field.type())) {
    throw new Error(
      `a multi type field is currently not supported by this template. '${field.name()}' has ${
        field.type().length
      } possible types.`
    );
  }

  const opts = [`required=${field.required() ? "True" : "False"}`];

  const [pulsarType, secondaryType] = _findPulsarType(field);

  if (secondaryType) {
    opts.unshift(secondaryType);
  }

  return `${pulsarType}(${opts.join(", ")})`;
}
filters.toPulsarField = toPulsarField;

module.exports = filters;
