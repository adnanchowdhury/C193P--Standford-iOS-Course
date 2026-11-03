# Codex PR autofix

Installation is disabled by default. It becomes eligible only when both repository variables are set:

- `CODEX_AUTOFIX_ENABLED=true`
- `CODEX_AUTOFIX_BUDGET_READY=30-usd-hard-limit`

It also requires the dedicated encrypted Actions secret `CODEX_AUTOFIX_OPENAI_API_KEY`. The key must belong to the separate **Codex Code Reviews** OpenAI project, whose monthly hard limit is $30. Do not use a production application key. OpenAI notes that enforcement lag can cause a small overrun. GitHub Actions runner usage is billed separately under the account's existing plan.

Only new submitted inline findings from the verified Codex GitHub bot on the current same-repository PR head are eligible. Forks, draft/closed PRs, stale findings, protected paths, duplicate runs and reruns are skipped. One automatic commit per PR prevents fix loops. Repositories with `blocked_reason` are review-only until their validation prerequisites are resolved.

The workflow loads its controller/config from the default branch. A no-key preflight must pass the configured checks before any API spend. Codex runs on a separate hosted Linux runner with a read-only GitHub token, a key proxy, a workspace sandbox, no sudo, a 10-minute step limit, GPT-6.1 Sol and medium reasoning. A fresh no-key job applies and validates the candidate. The final publisher executes only the trusted controller and commits the exact bounded candidate through GitHub's Git API, using a non-forced branch update. It never merges, approves, deploys or changes the base branch.

The publisher uses `GITHUB_TOKEN`. GitHub does not trigger ordinary push/PR Actions from commits made with that token. Candidate validation is recorded in this run; normal required CI may need a new user-authored push/trigger before merging. A rerun of an old CI run still tests its old SHA. This setup does not bypass required checks or branch protection.

Repository collaborators with write access are trusted, as in ordinary same-repository CI. They can change workflows and access repository Actions secrets; this is not an isolation boundary against a malicious repository writer. Application tests run without production credentials. AI fixes still require human review, including visual and clinical review where relevant.

## Validation and rollback

Run `node --test .github/codex-autofix/controller.test.cjs` for synthetic eligibility, path, patch and Git tests. Repository commands are explicit in `config.json`; failing or unavailable checks prevent paid generation/publication. Passing these unit tests is not proof of a live paid autofix run.

To stop immediately, set `CODEX_AUTOFIX_ENABLED=false` and cancel in-progress autofix runs. Remove the workflow/controller in a normal PR if uninstalling. Revert any unwanted fix commit on its PR branch. Do not revoke a shared key used by application services.

Sources: [OpenAI Codex GitHub Action](https://learn.chatgpt.com/docs/github-action), [non-interactive autofix pattern](https://learn.chatgpt.com/docs/non-interactive-mode), [OpenAI spend limits](https://developers.openai.com/api/docs/guides/spend-limits).
