# GitHub Action for Generator

This github action generates code or documentation from AsyncAPI documents using arbitrary templates. [AsyncAPI Generator](https://github.com/asyncapi/generator/) is used to run the templates and generate code or documentation.

It was agreed that AsyncAPI documents would be used to describe application APIs in [Neuron](https://code.rbi.tech/raiffeisen/neuron).

### Neuron templates
- [@neuron/asyncapi-helm-crd-template](templates/helm-crd-template) generates a working helm chart with CRDs for [Neuron operator](https://code.rbi.tech/raiffeisen/neuron-operator-application).
- [@neuron/asyncapi-kustomize-crd-template](templates/kustomize-crd-template) generates a working kustomize application with CRDs for [Neuron operator](https://code.rbi.tech/raiffeisen/neuron-operator-application).
- [@neuron/asyncapi-python-model-template](templates/python-model-template) generates Pulsar models for Python.
- [@neuron/asyncapi-avroschema-template](templates/avroschema-template) generates avroschemas in `.avsc` files.

If you would like to see new templates create a new `Template Request` issue on this repository.

## Example usage

### Basic

In case all defaults are fine for you, just add such step:

```yaml
- name: Generating CRDs from my AsyncAPI document
  uses: raiffeisen/neuron-asyncapi-generator@v2
  with:
    template: '@neuron/asyncapi-python-model-template'
    output: src/models
```

### Use configuration file

In case you want to specify multiple templates to run, a configuration file is needed. By default the generator looks for `.github/asyncapi.yaml` but this can be set to something different using the `config_file` parameter.

Example of such a config file:
```yaml
generators:
  - template: '@neuron/asyncapi-python-model-template'
    output: src/models
  - template: '@neuron/asyncapi-helm-crd-template'
    output: deployment
```

and then there is no need to specify `template` or `output` as parameters to the action (but they do take precedence over the config file if they are specified).
```yaml
- name: Generating code from my AsyncAPI document
  uses: raiffeisen/neuron-asyncapi-generator@v2
```

### Simplest possible workflow

In [neuron-action](https://code.rbi.tech/raiffeisen/neuron-action) there is a pre-defined reusable workflow that can be used that handles linting your AsyncAPI document, running the generator and finally automatically commit any changed output data.

Example usage:
```yaml
name: AsyncAPI linting and code generation

on:
  pull_request:
    paths:
      - 'asyncapi/asyncapi.yaml'
      - '.github/workflows/asyncapi.yml'
      - '.github/asyncapi.yaml'

jobs:
  asyncapi:
    uses: raiffeisen/neuron-action/.github/workflows/asyncapi.yaml@v1
    # You can also pass in the parameters here (or just have it read your config file).
    # with:
    #   template: '@neuron/asyncapi-python-model-template'
    #   output: src/models
```

## Inputs

### `template`

Template for the generator. You can pass template as npm package, url to git repository, link to tar file or local template.

### `filepath`

Location of the AsyncAPI document.

**Default** expects `asyncapi/asyncapi.yaml` in the root of the working directory.

### `parameters`

The template that you use might support and even require specific parameters to be passed to the template for the generation.

**Example format** `parameter1=hello parameter2=world`

### `output`

Directory where to put the generated files.

**Default** points to `output` directory in the working directory.

### `registry`

The npm registry to use when pulling generator templates.

**Default** https://artifacts.rbi.tech/artifactory/api/npm/npm-group/

### `config_file`

A path to a config file that can be used to set above inputs for a repository. The action attempts to load this file and then merges any set input on top of that.

**Default** `.github/asyncapi.yaml`

Example:
```yaml
generators:
  - template: '@neuron/asyncapi-kustomize-crd-template'
    output: deployment/base
  - template: '@neuron/asyncapi-python-model-template'
    output: src/models
```

## Troubleshooting

You can enable more log information in GitHub Action by adding `ACTIONS_STEP_DEBUG` secret to repository where you want to use this action. Set the value of this secret to `true` and you''ll notice more debug logs from this action.

## Development

All source code lives in `lib/` (with action and cli separate entrypoints). When making changes to any code you will need to run `npm run build` and then commit any resulting changes in `dist/`. Why? see [issue#53](https://code.rbi.tech/raiffeisen/neuron-asyncapi-generator/issues/53).

### Local testing

When testing changes to source code you can simply run `node action.js` or better yet `node cli.js` as they are simply thin wrappers around the main app logic (but with different logging made for different consumers, being github actions or humans).

### Releasing

When you have made changes to the source code, built it with `npm run build` and pushed the changes to `main` you need to tag the commit with a version tag.

```bash
# tag v1 already exists, so we move it to HEAD
git tag -a -m "Release v1" v1 --force
git push --tags --force
```

**Please think about first if your changes introduce a breaking behaviour. If someone is pointing to v1 in their workflow they will get the new changes on next run and their workflow will break. Consider creating a new v2 tag instead in such cases.**
