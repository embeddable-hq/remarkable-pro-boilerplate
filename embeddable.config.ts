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
   * Uncomment to use ALL remarkable-pro components.
   */
  componentLibraries: ["@embeddable.com/remarkable-pro"],

  //For internal use only (this helps us help you debug issues)
  //
  // previewBaseUrl: "https://app.dev.embeddable.com",
  // pushBaseUrl: "https://api.dev.embeddable.com",
  // audienceUrl: "https://api.dev.embeddable.com/",
  // authDomain: "embeddable-dev.eu.auth0.com",
  // authClientId: "xOKco5ztFCpWn54bJbFkAcT8mV4LLcpG",

  starterEmbeddables: {
    'US': [
      'ad3d57d7-2335-4fbd-a3b4-09fa18145f5d',
      'f5a21ac9-d0c4-4318-aac1-a2df49d755ff'
    ],
    'EU': [
      'bf93fb35-c6e1-4d08-9ede-9ac11a72a74d', 
      'ad3ca5f1-020a-47f9-8a0f-44edd73207e5'
    ]
  }
});
