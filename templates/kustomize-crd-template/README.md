# @neuron/asyncapi-kustomize-crd-template

Generates a working kustomize application with CRDs for [Neuron operator](https://code.rbi.tech/raiffeisen/neuron-operator-application) from an AsyncAPI definition.

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
├── kustomization.yaml
├── neuron-connection.yaml
└── resources
    ├── accounts-tenant.yaml
    ├── kustomization.yaml
    ├── signedup-schema.yaml
    ├── signedup-topic.yaml
    └── user-namespace.yaml
```

**kustomization.yaml** (only generated if no kustomization.yaml exists, no overwrite)
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Add auto-generated neuron resources
bases:
- resources

# Add a neuron connection object
resources:
- neuron-connection.yaml
```

**neuron-connection.yaml** (only generated if no neuron-connection.yaml exists, no overwrite)
```yaml
apiVersion: neuron.rbi.tech/v1alpha1
kind: NeuronConnection
metadata:
  name: neuron-connection
spec:
  ref:
    service: dev01-neuron-pulsar-proxy
    namespace: dev01-neuron-pulsar
```

**resources/kustomization.yaml**
```yaml
# This file was generated by asyncapi-generator.
# Any changes will be overwritten.

apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - accounts-tenant.yaml
  - user-namespace.yaml
  - signedup-topic.yaml
  - signedup-schema.yaml
```

**resources/accounts-tenant.yaml**
```yaml
# This file was generated by asyncapi-generator.
# Any changes will be overwritten.

apiVersion: neuron.isf/v1alpha1
kind: NeuronTenant
metadata:
  name: accounts
spec:
  connectionRef:
    name: neuron-connection
```

**resources/signedup-schema.yaml**
```yaml
# This file was generated by asyncapi-generator.
# Any changes will be overwritten.

apiVersion: neuron.isf/v1alpha1
kind: NeuronSchema
metadata:
  name: signedup
spec:
  connectionRef:
    name: neuron-connection
  tenant: accounts
  namespace: user
  type: AVRO
  schema:
    name: User
    type: record
    fields:
      - name: displayName
        doc: Name of the user
        default: null
        type:
          - 'null'
          - string
      - name: email
        doc: Email of the user
        default: null
        type:
          - 'null'
          - string
```

**resources/signedup-topic.yaml**
```yaml
# This file was generated by asyncapi-generator.
# Any changes will be overwritten.

apiVersion: neuron.isf/v1alpha1
kind: NeuronTopic
metadata:
  name: signedup
spec:
  connectionRef:
    name: neuron-connection
  tenant: accounts
  namespace: user
```

**resources/user-namespace.yaml**
```yaml
# This file was generated by asyncapi-generator.
# Any changes will be overwritten.

apiVersion: neuron.isf/v1alpha1
kind: NeuronNamespace
metadata:
  name: user
spec:
  connectionRef:
    name: neuron-connection
  tenant: accounts
```