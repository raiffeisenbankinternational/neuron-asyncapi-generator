const lib = require("@neuron/asyncapi-template-lib");

module.exports = {
  "generate:before": generator => {
    const asyncapi = generator.asyncapi;

    // Traverse down an avro schema calling a callback
    // function on every non-trivial type.
    const traverseAvro = (schema, cb, level = 0) => {
      // If schema is not an instance of AvroSchema we
      // can't traverse further
      if (!(schema instanceof lib.AvroSchema)) return;

      /* eslint-disable brace-style */
      // We're not interested in getting trivial types
      if (schema.isComplex()) {
        // Handle records
        if (schema.isRecord()) {
          for (const f of schema.fields()) {
            traverseAvro(f, cb, level + 1);
          }
          cb(schema, level);
        }
        // Handle arrays
        else if (schema.isArray()) {
          const items = schema.items();
          if (Array.isArray(items)) {
            for (const i of items) {
              traverseAvro(i, cb, level + 1);
            }
          } else {
            traverseAvro(schema.items(), cb, level + 1);
          }
        }
        // Handle enums
        else if (schema.isEnum()) {
          cb(schema, level);
        }
        // If multiple types are allowed we have to traverse all of them
        else if (Array.isArray(schema.type())) {
          for (const t of schema.type()) {
            traverseAvro(t, cb, level + 1);
          }
        }
        // If schema.type() returns an AvroSchema, that's
        // the schema we're interested in
        else if (schema.type() instanceof lib.AvroSchema) {
          traverseAvro(schema.type(), cb, level + 1);
        }
      }
    };

    // Add a function to the asyncapi instance passed to the templates
    // so we can get schemas in a format we like.
    asyncapi.neuronSchemas = () => {
      const toplevel = new Map();
      const schemas = new Map();

      // Iterate over all messages to pull out the schemas
      for (const [name, m] of asyncapi.allMessages()) {
        // If the message has a `x-parser-original-schema-format`
        // and that value includes the string `avro` we assume
        // the original payload was an avro schema and pull that
        // out instead.
        if (
          m.hasExt("x-parser-original-schema-format") &&
          m.ext("x-parser-original-schema-format").includes("avro")
        ) {
          const avro = m.ext("x-parser-original-payload");
          toplevel.set(avro.name, new lib.AvroSchema(avro));
        } else {
          // Otherwise we normalize the the jsonschema payload
          // to try to infer schema names and then convert it to
          // avro schema.
          const normalized = lib.schema.normalize(m.payload().json());
          const avroized = lib.schema.jsonSchemaToAvro(normalized);
          avroized.name = lib.schema.pascalize(name);
          toplevel.set(
            lib.schema.pascalize(name),
            new lib.AvroSchema(avroized)
          );
        }
      }

      // Once we have found all top level schemas we traverse
      // down them and pull all sub-schemas we're interested in.
      for (const [_, schema] of toplevel) {
        traverseAvro(schema, (s, l) => {
          if (s.isComplex()) {
            s.options.level = l;
            if (!schemas.has(s.name())) {
              schemas.set(s.name(), s);
            }
          }
        });
      }

      // Sort array so that the most nested schemas are on top
      // in an attempt to build correct dependency tree
      return [...schemas].sort(([_an, a], [_bn, b]) => {
        return b.options.level - a.options.level;
      });
    };

    asyncapi.hasEnum = () => {
      return asyncapi
        .neuronSchemas()
        .some(([_n, s]) => s instanceof lib.AvroSchema && s.isEnum());
    };
  },
};
