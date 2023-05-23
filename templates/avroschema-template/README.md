# @neuron/asyncapi-avroschema-template

Generates [avroschema](https://avro.apache.org/docs/1.11.1/specification/) files from the AsyncAPI document.

## Example

### AsyncAPI document
```yaml
asyncapi: '2.4.0'

info:
  title: Account Service
  version: 1.0.0
  description: This service is in charge of processing user signups

channels:
  accounts/user/signedup:
    subscribe:
      message:
        $ref: '#/components/messages/UserSignedUp'

components:
  messages:
    UserSignedUp:
      contentType: avro
      payload:
        name: User
        type: object
        properties:
          displayName:
            type: string
            description: Name of the user
          email:
            type: string
            format: email
            description: Email of the user
```

### Output
```
./output
└── UserSignedUp.avsc
```

**UserSignedUp.avsc**
```json
{
    "name": "UserSignedUp",
    "type": "record",
    "fields": [
        {
            "name": "displayName",
            "doc": "Name of the user",
            "default": null,
            "type": [
                "null",
                "string"
            ]
        },
        {
            "name": "email",
            "doc": "Email of the user",
            "default": null,
            "type": [
                "null",
                "string"
            ]
        }
    ]
}
```
