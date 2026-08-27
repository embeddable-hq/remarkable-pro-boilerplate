import { defineConfig } from "@embeddable.com/sdk-core";
import react from "@embeddable.com/sdk-react";

export default defineConfig({
  plugins: [react],
  
  /*
   * Uncomment for US deployments
   */
  region: "US",

  /*
   * Uncomment for EU deployments
   */
  // region: 'EU',

  /*
   * Adds the remarkable-pro components to your workspace.
   */
  componentLibraries: ["@embeddable.com/remarkable-pro"],

  //For internal use only (this helps us help you debug issues)
  //
  // previewBaseUrl: 'http://localhost:3000/',
  pushBaseUrl: 'http://localhost:8080',
  previewBaseUrl: 'https://app.dev.embeddable.com',
  // pushBaseUrl: 'https://api.dev.embeddable.com/',
  audienceUrl: 'https://api.dev.embeddable.com/',
  authDomain: 'embeddable-dev.eu.auth0.com',
  authClientId: 'xOKco5ztFCpWn54bJbFkAcT8mV4LLcpG',

  // /**
  //  * This gives you some example dashboards to play with
  //  */
  starterEmbeddables: {
    'US': [
      'deb9b9d7-c267-449d-bfc6-a079f534a197'
    ],
    'EU': [
      'bf93fb35-c6e1-4d08-9ede-9ac11a72a74d',
      'ad3ca5f1-020a-47f9-8a0f-44edd73207e5'
    ]
  }
});
