import { defineConfig } from "@embeddable.com/sdk-core";
import react from "@embeddable.com/sdk-react";

export default defineConfig({
  plugins: [react],

  /*
   * Uncomment for EU deployments
   */
  // region: 'EU',

  /*
   * Uncomment for US deployments
   */
  region: "US",

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
});
