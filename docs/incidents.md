# Incident procedure

For backend risk, pause traffic and revoke affected keys independently of the CLI version. For client risk, preserve the released version, mark it withdrawn, deprecate the `@adrouter/cli` npm version, and issue a new beta version. If beta.2 is defective, publish beta.3 and move both `beta` and `latest`; never overwrite beta.2.

Record the affected versions, keys, providers, time window, artifact hashes, observed metadata, containment, and recovery. Do not copy prompts, output, tool payloads, or credentials into incident logs. Validate revocation, quota enforcement, privacy logging, and settlement reconciliation before resuming rollout.
