const traverse = require("json-schema-traverse");

/// Convert from camelCase to PascalCase

// Changes name to PascalCase
const pascalize = name => {
  return name.charAt(0).toUpperCase() + name.slice(1);
};

/// Normalize JSON Schema

// Namespace should only be set when we encounter an object or
// an enum and namespace is not already set.
function shouldSetNamespace(schema) {
  return (
    (schema.type === "object" || Array.isArray(schema.enum)) &&
    !schema.namespace
  );
}

// Try to infer name of all fields and removes all `x-` properties
const normalize = (data, deleteX = true, namespace = null) => {
  // Deep copy data
  const ret = JSON.parse(JSON.stringify(data));

  // Callback passed to json-schema-traverse
  const cb = (schema, jp, root, pjp, key, pschema, prop) => {
    // If there is no name set we want to try to infer it.
    if ("name" in schema === false) {
      // The asyncapi parser sometimes gets a schema id from somewhere.
      // If that is present we use that.
      // When it can't find it it sets `<anonymous-schema-{number}>` so
      // we skip those.
      if (
        "x-parser-schema-id" in schema &&
        !schema["x-parser-schema-id"].includes("anonymous-schema")
      ) {
        schema.name = pascalize(schema["x-parser-schema-id"]);
        // Otherwise we try to pascalize the field name that is set
        // in the owner of this type
      } else if (typeof prop === "string") {
        schema.name = pascalize(prop);
      }
    }

    // Delete all `x-` properties
    if (deleteX) {
      for (const k in schema) {
        if (k.startsWith("x-")) {
          delete schema[k];
        }
      }
    } else if (schema.name) {
      // Copy name to 'x-parser-schema-id'
      schema["x-parser-schema-id"] = schema.name;
    }

    // Add namespace if needed
    if (typeof namespace === "string") {
      if (shouldSetNamespace(schema)) {
        schema.namespace = namespace;
      }
    }
  };

  // Traverses all schema objects in schema and calls cb on them.
  traverse(ret, { cb });

  return ret;
};

/// JSON Schema to Avro Schema

// Json schema on the left, avro on the right
const typeMapping = {
  string: "string",
  null: "null",
  boolean: "boolean",
  integer: "int",
  number: "float",
};
const reSymbol = /^[A-Za-z_-][A-Za-z0-9_-]*$/;

function jsonSchemaToAvro(schema) {
  if (!schema) {
    throw new Error("No schema provided");
  }

  const record = {
    name: schema.name || "anonymous",
    type: "record",
    fields: schema.properties
      ? _convertProperties(schema.properties, schema.required)
      : [],
  };

  if (schema.description) {
    record.doc = schema.description;
  }
  if (schema.namespace) {
    record.namespace = schema.namespace;
  }

  return record;
}

const _isComplex = schema => schema.type === "object";
const _isArray = schema => schema.type === "array";
const _hasEnum = schema => Boolean(schema.enum);
const _isRequired = (list, item) => list.includes(item);

const _produceRecordType = (name, prop) => {
  const ret = {
    type: "record",
    name: prop.name || pascalize(name),
    fields: _convertProperties(prop.properties || [], prop.required || []),
  };

  if (prop.namespace) {
    ret.namespace = prop.namespace;
  }

  return ret;
};

const _produceSimple = prop => {
  if (prop.type === "string" && prop.format === "date-time") {
    return {
      type: "long",
      logicalType: "timestamp-millis",
    };
  }

  return typeMapping[prop.type];
};

const _convertProperties = (props, required) => {
  return Object.keys(props).map(item => {
    const name = item;
    const prop = props[item];

    let fieldType;
    let defaultValue;
    if (_isComplex(prop)) {
      fieldType = _produceRecordType(name, prop);
    } else if (_isArray(prop)) {
      fieldType = _produceArrayType(name, prop);
    } else if (_hasEnum(prop)) {
      fieldType = _produceEnumType(name, prop);
      if (typeof prop.default !== "undefined") {
        defaultValue = prop.default;
      }
    } else {
      fieldType = _producePropertyType(name, prop);
      if (typeof prop.default !== "undefined") {
        defaultValue = prop.default;
      }
    }
    if (!_isRequired(required || [], item)) {
      // is fieldType an array already => add "null" to array
      if (Array.isArray(fieldType)) {
        fieldType.unshift("null");
      } else {
        fieldType = ["null", fieldType];
      }
      if (!defaultValue) {
        defaultValue = null;
      }
    }

    const field = {
      name,
      type: fieldType
    };

    if (prop.description) {
      field.doc = prop.description;
    }
    if (typeof defaultValue !== "undefined") {
      field.default = defaultValue;
    }

    return field;
  });
};

const _produceArrayType = (name, prop) => {
  return {
    type: "array",
    items: _isComplex(prop.items)
      ? _produceRecordType(prop.items.name || pascalize(name), prop.items)
      : _produceSimple(prop),
  };
};

const _produceEnumType = (name, prop) => {
  if (prop.enum.every(symbol => reSymbol.test(symbol))) {
    const fieldType = {
      type: "enum",
      name: prop.name || pascalize(name),
      symbols: prop.enum,
    };
    if (prop.namespace) {
      fieldType.namespace = prop.namespace;
    }
    return fieldType;
  }

  return "string";
};

const _producePropertyType = (name, value) => {

  // If value has no type but has anyOf that's where the types are
  // defined.
  if (!value.type && value.anyOf) {
    value.type = value.anyOf;
  }

  if (Array.isArray(value.type)) {
    const fieldType =
      value.type
        .filter(type => type !== "null")
        .map(type =>
          _isComplex(type) ? _produceRecordType(name, type) : _produceSimple(type)
        );
    return fieldType.length > 1 ? fieldType : fieldType.shift();
  }
  return _produceSimple(value);
};

module.exports = {
  pascalize,
  normalize,
  jsonSchemaToAvro,
};
