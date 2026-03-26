<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Ops Notes

- Default release flow for this repo is server-first deploy.
- After finishing implementation work, always run local verification before declaring completion.
- If verification passes, deploy the current changes to production using the operator-provided Sophos/SSH access for this environment.
- Do not store plaintext passwords or secrets in the repository. Credentials must be provided out-of-band by the operator.
- If direct server access is unavailable, use the repository's fallback deploy path only after noting why server-first could not be used.
