# Contributing

Always-on Board currently focuses on macOS launchd tasks inside DeepSeek Harness.

For bug reports, include macOS and DSH versions, reproducible steps, expected and actual behavior, and whether the task belongs to the user or system domain. Use synthetic task names and sanitized examples; do not post environment files, real command arguments, hostnames, snapshots or logs containing credentials.

Before submitting changes, run `npm run check` and `npm test` with Node.js 22. For UI changes, record the DSH version and which rendered flows you checked. Distinguish source checks, host UI verification, task execution and business-output verification.

Keep reads separate from actions. Menu items prepare drafts; do not add automatic execution without an explicit product and permission design. Treat task content and logs as untrusted data. Preserve user notes and task data.

This project is licensed under the [MIT License](LICENSE).
