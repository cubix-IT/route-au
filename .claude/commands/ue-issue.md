# UE Issue Sync — Post-Deploy Housekeeping

Run after every deploy to close resolved issues and review open backlog.

```bash
npm run issue-sync
```

## What it does

1. Reads the last two deploys from `deploy_log` table to find the commit range
2. Extracts `#N` issue references from commits in that range
3. For each referenced open issue: posts a closing comment + closes it
4. Lists all remaining open issues not touched by this deploy

## Commit message convention
Use `closes #N` or `fixes #N` in commits so issue-sync picks them up:
```
feat: wizard region search (closes #33)
fix: scroll lock on iOS Safari (closes #61)
```

Multiple issues per commit:
```
feat: DX skills — db:status + e2e tests (closes #59, closes #60)
```

## After running
- Check the open issues list printed at the bottom
- Reopen any issue that has regressed with a comment explaining what broke
- Update the GitHub wiki (ue-docs) with a summary of what shipped

## Manual close
```bash
gh issue close 42 --comment "Fixed in deploy $(git rev-parse --short HEAD)"
```

## Manual reopen (regression)
```bash
gh issue reopen 42 --comment "Regressed in 6417c0d — scroll lock broken on Safari"
```
