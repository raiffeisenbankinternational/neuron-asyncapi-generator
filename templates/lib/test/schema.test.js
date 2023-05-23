const { pascalize, jsonSchemaToAvro, normalize } = require("../lib/schema");

describe("pascalize", () => {
  test("should correctly pascalize a camelCase string", () => {
    expect(pascalize("camelCase")).toEqual("CamelCase");
  });

  test("should not change already PascalCase string", () => {
    expect(pascalize("PascalCase")).toEqual("PascalCase");
  });
});

describe("normalize", () => {
  test("should add namespace where applicable", () => {
    const jsonschema = {
      name: "MySchema",
      type: "object",
      properties: {
        gender: {
          type: "string",
          enum: ["male", "female", "non-binary"],
        },
      },
    };

    const expected = {
      name: "MySchema",
      type: "object",
      namespace: "my.namespace",
      properties: {
        gender: {
          type: "string",
          name: "Gender",
          namespace: "my.namespace",
          enum: ["male", "female", "non-binary"],
        },
      },
    };

    expect(normalize(jsonschema, true, "my.namespace")).toStrictEqual(expected);
  });

  test("should not add namespace where not already set", () => {
    const jsonschema = {
      name: "MySchema",
      type: "object",
      namespace: "already.set",
      properties: {
        gender: {
          type: "string",
          enum: ["male", "female", "non-binary"],
        },
      },
    };

    const expected = {
      name: "MySchema",
      type: "object",
      namespace: "already.set",
      properties: {
        gender: {
          type: "string",
          name: "Gender",
          namespace: "my.namespace",
          enum: ["male", "female", "non-binary"],
        },
      },
    };

    expect(normalize(jsonschema, true, "my.namespace")).toStrictEqual(expected);
  });
});

describe("jsonSchemaToAvro", () => {
  test("should throw an error when no schema is provided", () => {
    expect(() => {
      jsonSchemaToAvro();
    }).toThrow();
  });

  test("should convert a simple object to record", () => {
    const jsonschema = {
      name: "MySchema",
      type: "object",
      description: "My awesome schema",
    };
    const expected = {
      name: "MySchema",
      type: "record",
      doc: "My awesome schema",
      fields: [],
    };

    expect(jsonSchemaToAvro(jsonschema)).toStrictEqual(expected);
  });

  test("should convert an object with object property correctly", () => {
    const jsonschema = {
      name: "MySchema",
      type: "object",
      description: "My awesome schema",
      required: ["person"],
      properties: {
        person: {
          type: "object",
          description: "Represents a person",
        },
      },
    };
    const expected = {
      name: "MySchema",
      type: "record",
      doc: "My awesome schema",
      fields: [
        {
          name: "person",
          doc: "Represents a person",
          type: {
            type: "record",
            name: "Person",
            fields: [],
          },
        },
      ],
    };

    expect(jsonSchemaToAvro(jsonschema)).toStrictEqual(expected);
  });

  test("should convert an object with optional object property correctly", () => {
    const jsonschema = {
      name: "MySchema",
      type: "object",
      description: "My awesome schema",
      properties: {
        person: {
          type: "object",
          description: "Represents a person",
        },
      },
    };
    const expected = {
      name: "MySchema",
      type: "record",
      doc: "My awesome schema",
      fields: [
        {
          name: "person",
          doc: "Represents a person",
          default: null,
          type: ["null",{
            type: "record",
            name: "Person",
            fields: [],
          }],
        },
      ],
    };

    expect(jsonSchemaToAvro(jsonschema)).toStrictEqual(expected);
  });

  test("should convert an object with array property correctly", () => {
    const jsonschema = {
      name: "MySchema",
      type: "object",
      description: "My awesome schema",
      required: ["people"],
      properties: {
        people: {
          type: "array",
          description: "People of relevance",
          items: {
            name: "Person",
            type: "object",
          },
        },
      },
    };

    const expected = {
      name: "MySchema",
      type: "record",
      doc: "My awesome schema",
      fields: [
        {
          name: "people",
          doc: "People of relevance",
          type: {
            type: "array",
            items: {
              type: "record",
              name: "Person",
              fields: [],
            },
          },
        },
      ],
    };

    expect(jsonSchemaToAvro(jsonschema)).toStrictEqual(expected);
  });

  test("should convert an object with enum property correctly", () => {
    const jsonschema = {
      name: "MySchema",
      type: "object",
      description: "My awesome schema",
      required: ["lifecyclePolicy"],
      properties: {
        lifecyclePolicy: {
          type: "string",
          enum: ["KeepAfterDeletion", "CleanUpAfterDeletion"],
        },
      },
    };

    const expected = {
      name: "MySchema",
      type: "record",
      doc: "My awesome schema",
      fields: [
        {
          name: "lifecyclePolicy",
          type: {
            type: "enum",
            name: "LifecyclePolicy",
            symbols: ["KeepAfterDeletion", "CleanUpAfterDeletion"],
          },
        },
      ],
    };

    expect(jsonSchemaToAvro(jsonschema)).toStrictEqual(expected);
  });

  test("should convert an object with a simple property correctly", () => {
    const jsonschema = {
      name: "MySchema",
      type: "object",
      description: "My awesome schema",
      required: ["name"],
      properties: {
        name: {
          type: "string",
        },
        birthday: {
          type: "string",
          format: "date-time",
        },
      },
    };

    const expected = {
      name: "MySchema",
      type: "record",
      doc: "My awesome schema",
      fields: [
        {
          name: "name",
          type: "string",
        },
        {
          name: "birthday",
          default: null,
          type: [
            "null",
            {
              type: "long",
              logicalType: "timestamp-millis",
            },
          ],
        },
      ],
    };

    expect(jsonSchemaToAvro(jsonschema)).toStrictEqual(expected);
  });

  test("should convert an object with complex nesting correctly", () => {
    const jsonschema = {
      name: "MySchema",
      type: "object",
      description: "My awesome schema",
      required: ["details"],
      properties: {
        details: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: {
                type: "string",
              },
              issue: {
                type: "string",
              },
            },
          },
        },
      },
    };

    const expected = {
      name: "MySchema",
      type: "record",
      doc: "My awesome schema",
      fields: [
        {
          name: "details",
          type: {
            type: "array",
            items: {
              type: "record",
              name: "Details",
              fields: [
                {
                  name: "field",
                  default: null,
                  type: ["null", "string"],
                },
                {
                  name: "issue",
                  default: null,
                  type: ["null", "string"],
                },
              ],
            },
          },
        },
      ],
    };

    expect(jsonSchemaToAvro(jsonschema)).toStrictEqual(expected);
  });

  test("should handle anyOf correctly", () => {
    const jsonschema = {
      name: "MySchema",
      type: "object",
      description: "My awesome schema",
      properties: {
        details: {
          anyOf: [
            {
              type: "string",
            },
            {
              type: "number",
            },
          ],
        },
      },
    };

    const expected = {
      name: "MySchema",
      type: "record",
      doc: "My awesome schema",
      fields: [
        {
          name: "details",
          default: null,
          type: ["null", "string", "float"],
        },
      ],
    };

    expect(jsonSchemaToAvro(jsonschema)).toStrictEqual(expected);
  });

  test("should preserve namespace field", () => {
    const jsonschema = {
      name: "MySchema",
      type: "object",
      namespace: "my.namespace",
      description: "My awesome schema",
      required: ["details","lifecyclePolicy"],
      properties: {
        details: {
          name: "Details",
          type: "object",
          namespace: "another.namespace",
          properties: {
            name: {
              type: "string",
            },
          },
        },
        lifecyclePolicy: {
          type: "string",
          namespace: "my.namespace",
          enum: ["KeepAfterDeletion", "CleanUpAfterDeletion"],
        },
      },
    };

    const expected = {
      name: "MySchema",
      type: "record",
      doc: "My awesome schema",
      namespace: "my.namespace",
      fields: [
        {
          name: "details",
          type: {
            name: "Details",
            type: "record",
            namespace: "another.namespace",
            fields: [
              {
                name: "name",
                default: null,
                type: ["null", "string"],
              },
            ],
          },
        },
        {
          name: "lifecyclePolicy",
          type: {
            type: "enum",
            name: "LifecyclePolicy",
            namespace: "my.namespace",
            symbols: ["KeepAfterDeletion", "CleanUpAfterDeletion"],
          },
        },
      ],
    };

    expect(jsonSchemaToAvro(jsonschema)).toStrictEqual(expected);
  });
});
