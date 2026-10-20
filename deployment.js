/**
 * (c) 2021, Micro:bit Educational Foundation and contributors
 *
 * SPDX-License-Identifier: MIT
 */
const {
  createDeploymentDetailsFromOptions,
} = require("@microbit/website-deploy-s3");

// The buckets and their distributions are defined in
// microbit-foundation/microbit-org (apps/simulator), along with the version
// aliases such as /v/0.1/, which move when a release is added there.
const { s3Config } = createDeploymentDetailsFromOptions({
  production: {
    bucket: "python-simulator-usermbit-org-production",
    mode: "patch",
  },
  staging: {
    bucket: "python-simulator-usermbit-org-production",
    prefix: "staging",
  },
  review: {
    bucket: "python-simulator-usermbit-org-review",
    mode: "branch-prefix",
  },
});
module.exports = {
  ...s3Config,
  region: "eu-west-1",
  // The buckets are private (BucketOwnerEnforced), so objects take no ACL.
  acl: null,
  findDistribution: true,
  removeNonexistentObjects: true,
  params: {
    "**/*": {
      CacheControl: "public, max-age=0, must-revalidate",
    },
    // We need hashes in the filenames to enable these
    // "**/**/!(sw).js": { CacheControl: "public, max-age=31536000, immutable" },
    // "**/**.wasm": { CacheControl: "public, max-age=31536000, immutable" },
  },
};
