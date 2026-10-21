# CLI installation verification

Date: 2026-10-21 (Asia/Hong_Kong).

Source revision: `8c4246eb75bbc4b2e6b723d81c4b5c65da7324bc`.

Environment: macOS; Node.js `22.22.2`; DSH `0.2.1-rc.2`; pnpm `10.26.2` invoked by DSH.

## Commands checked

Each install used a separate temporary `DSH_HOME`. The active user's DSH profiles and credentials were not copied or modified. The package manager reused its ordinary shared content cache; this was not a clean-cache download benchmark.

```sh
dsh plugin --profile web add "github:caizhidian-ops/always-on-board#8c4246eb75bbc4b2e6b723d81c4b5c65da7324bc"
dsh plugin --profile web add "github:caizhidian-ops/always-on-board"
```

Both commands exited successfully. The pinned install fetched the GitHub source archive; the unpinned install reused the cached artifact for the then-current main revision.

The generated profile package recorded `@local/dsh-ops-board` as a dependency and included it in `dsh.profile.bundles`, after the standard base and Web bundles.

```sh
dsh --profile web --dump-config
```

Configuration composition exited successfully and included:

```yaml
# == @local/dsh-ops-board
- id: ops-board
  name: '@local/dsh-ops-board'
```

The installed host entry was imported directly without invoking `apply()`. It exported `name: 'ops-board'`, `apply` as a function, and `inject: ['webServer']`. This verifies host module resolution and import, without reading task snapshots or mounting a new server.

## Limits

This is package installation and configuration evidence. No Web server was started from these temporary profiles, no browser UI acceptance was repeated, and no Agent message, model request, repair or task termination was executed. Existing UI verification documented elsewhere is a separate evidence layer.

The uninstall command in the READMEs follows the installed dependency name. Uninstall was not executed during this check; the temporary profiles were retained locally for inspection.
