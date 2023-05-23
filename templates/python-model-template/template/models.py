from pulsar import SerDe
from pulsar.schema import *
{%- if asyncapi.hasEnum() %}
from enum import Enum
{%- endif %}

{% for schemaName, schema in asyncapi.neuronSchemas() %}
{%- if schema.doc() %}
{{ schema.doc() | pythonComment | safe }}
{%- endif %}
{%- if schema.isRecord() %}
class {{ schemaName }}(Record):
    {%- if schema.namespace() %}
    _avro_namespace = "{{ schema.namespace() }}"
    {%- endif %}
    {%- for field in schema.fields() %}
    {%- if field.doc() %}
    {{ field.doc() | pythonComment | safe | indent(4) }}
    {%- endif %}
    {{ field.name() }} = {{ field | toPulsarField }}
    {%- endfor %}
{% elif schema.isEnum() %}
class {{ schemaName }}(str, Enum):
    {%- for symbol in schema.symbols() %}
    {{ symbol }} = "{{ symbol }}"
    {%- endfor %}
{% endif %}
{%- endfor %}
