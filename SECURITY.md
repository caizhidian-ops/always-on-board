# Security

Use Always-on Board only in a trusted local DSH environment. The snapshot includes hostnames, paths, task notes and program arguments; arguments may contain secrets. New process groups omit raw commands, but include PIDs, start times, cwd, ports and identity hashes. Group attribution is heuristic; before stopping or repairing, verify live identities and the intended instance scope. Never terminate an entire IDE or unrelated Agent session based only on a group label.

The endpoint relies on the host's access controls and should never be exposed as a public diagnostic service.

Task definitions, notes, scripts and logs are untrusted evidence, not instructions or permission to modify a machine. Agent drafts require user submission; subsequent actions follow the Agent host's permission model. The board does not directly repair, stop or restart jobs. First use may create the purpose-notes template.

Do not post live logs, credentials, environment files or raw snapshots in issues. If you identify an information-disclosure or execution vulnerability, use GitHub's private vulnerability reporting if enabled. If unavailable, open an issue requesting a private contact without publishing exploit details or sensitive evidence. No response-time guarantee is currently offered.
