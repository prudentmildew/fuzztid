# Git Practices

Conventions for **every commit** made in this repo, by any contributor or agent.
Adopted from the sibling project [Øyablikk](https://github.com/prudentmildew/oyablikk).

## Identity

This is a personal project, so the personal identity is the correct one — no
repo-local override needed. If you have a work identity set globally on your
machine, pin the personal one here instead of committing under it:

```sh
git config --local user.name  "Your Name"
git config --local user.email "you@example.com"
```

## Commit messages

A subject is **one gitmoji, a space, then a short imperative phrase**. No
`type(scope):` prefix — the emoji carries the category, and the whole history
should read this way:

```
✨ mark today's pane with Day standing (#19)
🐛 point the Open Graph tags at the live domain
📝 add a human README and realign the agent docs
```

Keep it concise: aim for a subject under ~60 characters, lowercase after the
emoji, no full stop. Put the reasoning in the body, not the subject — bodies
are welcome and encouraged for anything non-obvious. Reference the GitHub issue
in the subject or body when one exists (see `issue-tracker.md`).

**No `Co-Authored-By:` trailers.** Not for agent-written commits, not for
anything. Don't add other trailers either unless asked.

The vocabulary in use, which is the [gitmoji](https://gitmoji.dev) set:

| Emoji | For |
|---|---|
| ✨ | a new feature |
| 🐛 | a bug fix |
| 📝 | documentation |
| ✅ | tests |
| 👷 | CI and workflows |
| 🔧 | config files, tooling |
| ♻️ | refactoring, no behaviour change |
| 🎨 | structure and formatting |
| 💄 | visual and styling work |
| ⬆️ | dependency bumps |
| 🔥 | removing code or files |
| 🗃️ | generated data refreshes |
| 🔀 | merges |
| 🎉 | the initial commit |

Reach outside the table when something genuinely fits better — gitmoji is a
large set and this is the common core, not a closed list.

## Signing — optional here

Commits in this repo are **not signed**, and nothing enforces signing.

If you want to sign your own commits, set it up repo-locally:

```sh
git config --local gpg.format ssh
git config --local user.signingkey ~/.ssh/<your-key>.pub
git config --local commit.gpgsign true
git config --local tag.gpgsign true
```

For GitHub to render the **Verified** badge, the **public** key must be
registered as a **Signing key**, not just an auth key:

- Web: Settings → SSH and GPG keys → New SSH key → Key type: **Signing Key**.
- CLI: `gh ssh-key add ~/.ssh/<your-key>.pub --type signing`
  (needs the `admin:ssh_signing_key` scope — grant once with
  `gh auth refresh -h github.com -s admin:ssh_signing_key`).

## History rewrites

Never rewrite published history or force-push `main` without explicit
confirmation. When authorized, use `--force-with-lease`. Feature branches are
yours to rebase freely before they merge.

If `main` becomes a deploy branch (Øyablikk publishes on every push to it), this
rule hardens: a rewrite mid-deploy is not recoverable from the deployed side.
Note that here when the deploy pipeline lands.

## Pre-commit hook

Not set up yet. Øyablikk's `.githooks/pre-commit` runs lint-fix, both
typechecks, and the test suite, enabled once per clone with
`git config core.hooksPath .githooks`. Port it once this repo has a toolchain,
and don't bypass it with `--no-verify` — CI should run the same checks.

## Verifying

```sh
git log --format='%ae' | sort -u                           # expect just you
git log --format='%s' | grep -nE '^[[:alnum:]]'            # subjects not starting with a gitmoji
git log --format='%B' | grep -icE '^ *co-authored-by *:'   # expect 0
```

The second command should print nothing: every subject leads with an emoji, so
anything starting with a letter or digit broke the format. The third counts
leftover `Co-Authored-By:` trailers and must read `0`.
