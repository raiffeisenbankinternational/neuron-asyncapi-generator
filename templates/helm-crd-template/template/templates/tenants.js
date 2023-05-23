import { File } from "@asyncapi/generator-react-sdk";
import ejs from "ejs";

const resource = `
# This file was generated by asyncapi-generator.
# Any changes will be overwritten.

apiVersion: neuron.isf/v1alpha1
kind: NeuronTenant
metadata:
  name: <%= tenantName %>
spec:
  neuronClusterName: "{{ .Values.neuron.clusterName }}"
  tenant: <%= tenantName %>
  {{- with (( index (.Values.neuron.tenants | default dict) "<%= tenantName %>" ).settings) }}
  settings:
    {{- toYaml . | nindent 4 }}
  {{- end }}
`;

export default function ({ asyncapi }) {
  const tenants = fetchTenants(asyncapi._json.channels);

  return tenants.map(tenant => {
    const filename = `${tenant}-tenant.yaml`;
    const env = { tenantName: tenant };

    return <File name={filename}>{ejs.render(resource, env).trim()}</File>;
  });
}

function fetchTenants(channels) {
  const tenants = new Set();

  for (const channel in channels) {
    if (typeof channel === "string") {
      const parts = channel.split("/");
      const tenant = parts[0];

      tenants.add(tenant);
    }
  }

  return [...tenants];
}