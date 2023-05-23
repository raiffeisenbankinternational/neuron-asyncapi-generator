// Class for working with avro schemas more nicely
class AvroSchema {
  constructor(schema) {
    this._schema = schema;
    this.options = {};
  }

  name() {
    return this._schema.name;
  }

  namespace() {
    return this._schema.namespace;
  }

  doc() {
    return this._schema.doc;
  }

  type() {
    let type = this._schema.type;

    // If type is an array we want to try to squash it down to
    // a single type
    if (Array.isArray(type)) {
      // Filter out all nulls
      const nonNull = type.filter(i => i !== "null");

      // If what we have left is an array with a single item
      // we can just return that item.
      if (nonNull.length === 1) {
        type = nonNull[0];
      } else {
        // Otherwise we have to return the list but convert all
        // objects in the list to an instance of AvroSchema so
        // whoever is calling the function can benefit from the
        // helper class.
        return nonNull.map(t => {
          if (typeof t === "object") return new AvroSchema(t);
          return t;
        });
      }
    }

    // If type is only a single object we return that wrapped
    // in the AvroSchema class
    if (typeof type === "object") {
      return new AvroSchema(type);
    }

    // Type is trivial (most likely just a string)
    return type;
  }

  isComplex() {
    const simpleTypes = [
      "null",
      "boolean",
      "int",
      "long",
      "float",
      "double",
      "bytes",
      "string",
    ];
    return !simpleTypes.includes(this.type());
  }

  required() {
    // If type is an array we check if it contains 'null'.
    // If so, it's not required
    if (Array.isArray(this._schema.type)) {
      return !this._schema.type.some(i => i === "null");
    }
    // Type is a single item, if it's not literally 'null'
    // it's required.
    return this._schema.type !== "null";
  }

  fields() {
    // Map all fields to an instance of AvroSchema class
    if (this._schema.fields) {
      return this._schema.fields.map(f => new AvroSchema(f));
    }

    return [];
  }

  items() {
    if (this._schema.items) {
      // If items is an array we have to iterate over the
      // list and map each item to an instance of AvroSchema
      // class if it's an object, otherwise just unmodified.
      if (Array.isArray(this._schema.items)) {
        return this._schema.items.map(i => {
          if (typeof i === "object") {
            return new AvroSchema(i);
          }
          return i;
        });
      } else if (typeof this._schema.items === "object") {
        // Otherwise we just return the item wrapped in
        // AvroSchema class.
        return new AvroSchema(this._schema.items);
      }
    }
    return this._schema.items;
  }

  symbols() {
    return this._schema.symbols;
  }

  isRecord() {
    return this.type() === "record";
  }

  isArray() {
    return this.type() === "array";
  }

  isEnum() {
    return this.type() === "enum";
  }
}

module.exports = AvroSchema;
