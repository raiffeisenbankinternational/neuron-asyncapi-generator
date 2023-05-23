# @neuron/asyncapi-python-model-template

Generates python models to be used by [pulsar-client](https://pulsar.apache.org/docs/next/client-libraries-python#schema-definition-reference).

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
└── models.py
```

**models.py**
```python
from pulsar import SerDe
from pulsar.schema import *


class UserSignedUp(Record):
    # Name of the user
    displayName = String(required=False)
    # Email of the user
    email = String(required=False)
```
