import { File } from "@asyncapi/generator-react-sdk";
import { schema } from "@neuron/asyncapi-template-lib";

export default function ({ asyncapi }) {
  const schemas = [];
  let namespace;

  if (asyncapi.id()) {
    // Replace `urn:my:example:id` with `my.example.id`.
    namespace = asyncapi.id().replace(/^urn:/, "").replaceAll(":", ".");
  }

  // Iterating over all messages and rendering them as
  // Avro schemas.
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

      // Add Avro schema to file output array
      schemas.push(
        <File name={`${avro.name}.avsc`}>{JSON.stringify(avro, null, 2)}</File>
      );
    } else {
      // Otherwise we normalize the jsonschema payload
      // to try to infer schema names and then convert it to
      // avro schema.
      const normalized = schema.normalize(m.payload().json(), true, namespace);
      const avroized = schema.jsonSchemaToAvro(normalized);
      avroized.name = schema.pascalize(name);

      // Add Avroized schema to file output array
      schemas.push(
        <File name={`${avroized.name}.avsc`}>
          {JSON.stringify(avroized, null, 2)}
        </File>
      );
    }
  }

  // List of react File components.
  // [<File>...</File>, <File>...</File>, ...]
  return schemas;
}
