import type { Face } from '../Face'
import type { CardProvider } from './providers'
import { shuffle } from './words'

export const gcpIcons: CardProvider = {
  id: 'gcp-icons',
  label: 'GCP Icons',
  icon: '☁️',
  description: 'Official Google Cloud Platform product icons',
  credit: { label: 'GCP Icons', url: 'https://gcpicons.com' },
  hidden: true,
  fetch,
}

// [file key, display name]. Keys are the kebab-case SVG file names published by the
// gcp-icons package; names are the official Google Cloud product / category labels.
const ICONS: [string, string][] = [
  ['agents-512-color', 'Agents'],
  ['aihypercomputer-512-color', 'AI Hypercomputer'],
  ['aimachinelearning-512-color', 'AI & Machine Learning'],
  ['alloydb-512-color', 'AlloyDB'],
  ['anthos-512-color', 'Anthos'],
  ['apigee-512-color-rgb', 'Apigee'],
  ['bigquery-512-color', 'BigQuery'],
  ['businessintelligence-512-color', 'Business Intelligence'],
  ['cloud-storage-512-color', 'Cloud Storage'],
  ['cloudrun-512-color-rgb', 'Cloud Run'],
  ['cloudspanner-512-color', 'Cloud Spanner'],
  ['cloudsql-512-color', 'Cloud SQL'],
  ['collaboration-512-color', 'Collaboration'],
  ['compute-512-color', 'Compute'],
  ['computeengine-512-color-rgb', 'Compute Engine'],
  ['containers-512-color', 'Containers'],
  ['dataanalytics-512-color', 'Data Analytics'],
  ['databases-512-color', 'Databases'],
  ['developer-tools-512-color', 'Developer Tools'],
  ['devops-512-color', 'DevOps'],
  ['distributedcloud-512-color', 'Distributed Cloud'],
  ['gke-512-color', 'Google Kubernetes Engine'],
  ['hybridmulticloud-512-color', 'Hybrid & Multi-cloud'],
  ['hyperdisk-512-color', 'Hyperdisk'],
  ['integrationservices-512-color', 'Integration Services'],
  ['looker-512-color', 'Looker'],
  ['managementtools-512-color', 'Management Tools'],
  ['mandiant-512-color', 'Mandiant'],
  ['mapsgeospatial-512-color', 'Maps & Geospatial'],
  ['marketplace-512-color', 'Marketplace'],
  ['mediaservices-512-color', 'Media Services'],
  ['migration-512-color', 'Migration'],
  ['mixedreality-512-color', 'Mixed Reality'],
  ['networking-512-color-rgb', 'Networking'],
  ['observability-512-color', 'Observability'],
  ['operations-512-color', 'Operations'],
  ['secops-512-color-rgb', 'Security Operations'],
  ['securitycommandcenter-512-color', 'Security Command Center'],
  ['securityidentity-512-color', 'Security & Identity'],
  ['serverlesscomputing-512-color', 'Serverless Computing'],
  ['storage-512-color', 'Storage'],
  ['threatintelligence-512-color', 'Threat Intelligence'],
  ['vertexai-512-color', 'Vertex AI'],
  ['web3-512-color', 'Web3'],
  ['webmobile-512-color', 'Web & Mobile'],
]

async function fetch(): Promise<Face[]> {
  return shuffle(ICONS)
    .slice(0, 20)
    .map(([key, name]) => ({
      kind: 'image',
      url: `https://cdn.jsdelivr.net/npm/gcp-icons@1.0.6/dist/icons/${key}.svg`,
      fit: 'contain',
      tooltip: name,
      link: 'https://gcpicons.com',
    }))
}
