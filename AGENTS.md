# AdRouterCLI release instructions

## Exact deployed-version parity

- After every npm publication, GitHub release, dist-tag promotion, or deployment, leave this local
  checkout clean and positioned at the exact immutable tag and commit that produced the deployed
  artifact.
- Build, tag, publish, and promote only from a clean committed tree. Never publish from uncommitted
  source or from a newer local commit than the artifact being deployed.
- If the default branch has advanced beyond the deployed release, prefer checking out the deployed
  tag or its exact commit (including a detached checkout) over leaving this directory on newer code.
- Verify the staged artifact manifest, Git tag, GitHub release, npm package metadata, and local
  `HEAD` all identify the same version and source commit before declaring a release complete.
- Do not edit generated release artifacts by hand. If parity fails, stop and fix forward with a new
  immutable version rather than moving or overwriting an existing version or tag.
