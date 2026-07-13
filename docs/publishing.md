# Publishing Runbook

This document describes the release process for `@stellarbuild/stellar-tx-builder`.
It is intended for maintainers with npm publish access.

---

## Prerequisites

- npm account with publish access to `@stellarbuild` organisation
- Write access to the GitHub repository
- `NPM_TOKEN` secret configured in the GitHub repository settings

---

## Versioning Policy

This project follows [Semantic Versioning 2.0.0](https://semver.org/):

| Change type | Version bump | Example |
|---|---|---|
| Backwards-compatible bug fix | `PATCH` | `0.3.0` → `0.3.1` |
| New backwards-compatible feature | `MINOR` | `0.3.1` → `0.4.0` |
| Breaking change | `MAJOR` | `0.4.0` → `1.0.0` |
| Pre-release | Append `-alpha.N`, `-beta.N`, or `-rc.N` | `0.4.0-beta.1` |

---

## Release Process

### Step 1: Prepare the release branch

Ensure you are on `develop` and up to date:

```bash
git checkout develop
git pull upstream develop
```

### Step 2: Update `CHANGELOG.md`

Move the items under `[Unreleased]` to a new version section:

```markdown
## [0.4.0] — 2025-09-01

### Added
- Full Soroban invokeContract() implementation
...

## [Unreleased]
(empty)
```

Update the comparison links at the bottom of the file.

### Step 3: Bump the version

```bash
npm version patch   # or minor, major, prepatch, preminor, premajor
```

This updates `package.json` and creates a git commit and tag automatically.

Alternatively, edit `package.json` manually and create the tag by hand:

```bash
# Edit version in package.json manually, then:
git add package.json CHANGELOG.md
git commit -m "chore: release v0.4.0"
git tag v0.4.0
```

### Step 4: Open a release PR

Push the release branch and open a PR from `develop` → `main`:

```bash
git push origin develop
```

Label the PR `release: v0.4.0`. Require at least one maintainer approval.

### Step 5: Merge and push the tag

After the PR is approved and merged:

```bash
git checkout main
git pull upstream main
git push upstream v0.4.0   # Push the tag to trigger release.yml
```

### Step 6: Automated publication

Pushing the tag triggers the `release.yml` GitHub Actions workflow which:

1. Runs all tests
2. Builds CJS and ESM outputs
3. Verifies the `package.json` version matches the tag
4. Publishes to npm with `--provenance`
5. Creates a GitHub Release with auto-generated release notes

Monitor the workflow at:
`https://github.com/stellarbuild/stellar-tx-builder/actions/workflows/release.yml`

### Step 7: Verify the release

```bash
# Verify the package is published
npm view @stellarbuild/stellar-tx-builder versions --json

# Install and test the published version
npm install @stellarbuild/stellar-tx-builder@0.4.0
node -e "const { TxBuilder } = require('@stellarbuild/stellar-tx-builder'); console.log(typeof TxBuilder);"
```

---

## Pre-release Versions

To publish a pre-release (alpha/beta/rc):

```bash
npm version prerelease --preid beta
# Creates 0.4.0-beta.1

git push upstream v0.4.0-beta.1
```

The `release.yml` workflow detects pre-releases (version strings containing `-`)
and marks them as pre-release on GitHub.

To install a pre-release version:

```bash
npm install @stellarbuild/stellar-tx-builder@0.4.0-beta.1
# or
npm install @stellarbuild/stellar-tx-builder@beta
```

---

## Unpublishing

npm does not allow unpublishing packages after 72 hours. If a broken version
is accidentally published:

1. Immediately publish a patch version with the fix.
2. Deprecate the broken version:
   ```bash
   npm deprecate @stellarbuild/stellar-tx-builder@0.4.0 "Critical bug — please upgrade to 0.4.1"
   ```

---

## Setting Up the NPM_TOKEN Secret

1. Log in to npmjs.com and go to *Access Tokens* in your account settings.
2. Generate a new **Automation** token (this type does not require 2FA during CI).
3. In the GitHub repository, go to *Settings → Secrets → Actions*.
4. Create a secret named `NPM_TOKEN` with the token value.

---

## Build Outputs

The `npm run build` command produces:

```
dist/
├── cjs/
│   ├── index.js        CommonJS bundle
│   ├── index.d.ts      TypeScript declarations
│   ├── index.js.map    Source map
│   ├── TxBuilder.js
│   ├── TxBuilder.d.ts
│   ├── types.js
│   └── types.d.ts
└── esm/
    ├── index.js        ESM bundle
    ├── index.d.ts
    ├── index.js.map
    ├── TxBuilder.js
    ├── TxBuilder.d.ts
    ├── types.js
    └── types.d.ts
```

Only the `dist/` directory, `README.md`, `CHANGELOG.md`, and `LICENSE` are
included in the published package (controlled by the `files` field in
`package.json`).
