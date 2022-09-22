/**
 * (c) 2021, Micro:bit Educational Foundation and contributors
 *
 * SPDX-License-Identifier: MIT
 */
const {
  createDeploymentDetailsFromOptions,
} = require("@microbit-foundation/website-deploy-aws-config");

const { s3Config } = createDeploymentDetailsFromOptions({
  production: {
    bucket: "python-simulator.usermbit.org",
    mode: "patch",
  },
  staging: {
    bucket: "python-simulator.usermbit.org",
    prefix: "staging",
  },
  review: {
    bucket: "review-python-simulator.usermbit.org",
    mode: "branch-prefix",
  },
});
module.exports = {
  ...s3Config,
  region: "eu-west-1",
  removeNonexistentObjects: true,
  enableS3StaticWebsiteHosting: true,
  errorDocumentKey: "index.html",
  redirects: [],
  params: {
    "**/*": {
      CacheControl: "public, max-age=0, must-revalidate",
    },
    // We need hashes in the filenames to enable these
    // "**/**/!(sw).js": { CacheControl: "public, max-age=31536000, immutable" },
    // "**/**.wasm": { CacheControl: "public, max-age=31536000, immutable" },
  },
};
