# Contributing to stellar-tx-builder

Thank you for your interest in contributing to `stellar-tx-builder`. This guide covers everything you need to get from zero to a merged pull request.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Conventions](#commit-conventions)
- [Branch Strategy](#branch-strategy)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Code Style](#code-style)
- [Documentation](#documentation)
- [Release Process](#release-process)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold these standards. Please report unacceptable behaviour to **hello@stellarbuild.io**.

---

## Ways to Contribute

You do not need to write code to make a meaningful contribution:

| Type | How |
|---|---|
| 🐛 Report a bug | Open a [Bug Report](https://github.com/stellarbuild/stellar-tx-builder/issues/new?template=bug_report.yml) |
| 🚀 Suggest a feature | Open a [Feature Request](https://github.com/stellarbuild/stellar-tx-builder/issues/new?template=feature_request.yml) |
| 📚 Improve docs | Open a [Documentation Issue](https://github.com/stellarbuild/stellar-tx-builder/issues/new?template=documentation_issue.yml) or a PR |
| 🔧 Fix a bug | Assign yourself to an open issue and submit a PR |
| ✅ Write tests | Improve test coverage for untested edge cases |
| 💬 Answer questions | Help others in [GitHub Discussions](https://github.com/stellarbuild/stellar-tx-builder/discussions) |

---

## Getting Started

### Prerequisites

| Tool | Minimum Version |
|---|---|
| Node.js | 18.x |
| npm | 9.x |
| Git | 2.x |

### Setup

```bash
# 1. Fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/stellar-tx-builder.git
cd stellar-tx-builder

# 2. Add the upstream remote
git remote add upstream https://github.com/stellarbuild/stellar-tx-builder.git

# 3. Install dependencies
npm install

# 4. Verify everything works
npm run build
npm run test
```

---

## Development Workflow

```bash
# Build both CJS and ESM outputs
npm run build

# Build CJS only (faster during development)
npm run build:cjs

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Lint source files
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Type-check without emitting files
npm run typecheck

# Format source files with Prettier
npm run format

# Check formatting without modifying files
npm run format:check
```

---

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/). All commit messages **must** follow this format:

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or improving tests |
| `chore` | Build process, tooling, or dependency updates |
| `perf` | Performance improvements |
| `ci` | CI/CD configuration changes |
| `revert` | Reverts a previous commit |

### Examples

```
feat(builder): add PathPaymentStrictReceive operation
fix(validation): throw on zero-length asset code for custom assets
docs(api): document InvokeContractParams fields
test(builder): add edge cases for setTimebounds with ISO strings
chore(deps): update @stellar/stellar-sdk to 15.2.0
```

### Breaking Changes

Append `!` to the type and add a `BREAKING CHANGE:` footer:

```
feat(builder)!: rename addManageOffer to addManageSellOffer

BREAKING CHANGE: The method addManageOffer has been renamed to
addManageSellOffer for consistency with the Stellar SDK naming convention.
Migration: replace all calls to addManageOffer() with addManageSellOffer().
```

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code — protected, requires PR |
| `develop` | Integration branch for upcoming releases |
| `feat/<name>` | Feature branches |
| `fix/<name>` | Bug fix branches |
| `docs/<name>` | Documentation-only branches |
| `chore/<name>` | Tooling or build changes |

Always branch from `develop` for new work, not `main`.

---

## Pull Request Process

1. **Create an issue first** for significant changes, so the approach can be discussed before you invest time in implementation.
2. **Branch from `develop`**: `git checkout -b feat/my-feature develop`
3. **Keep PRs focused**: one logical change per PR. Split large changes into smaller, reviewable pieces.
4. **Fill in the PR template** completely — incomplete templates will be returned.
5. **Ensure all checks pass** before requesting review:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run format:check`
   - `npm run test`
   - `npm run build`
6. **Request a review** from a maintainer.
7. **Respond to feedback** promptly. PRs inactive for more than 14 days may be closed.

### Review SLA

Maintainers aim to provide an initial review within **5 business days**.

---

## Testing Requirements

All code changes must include corresponding tests. We use [Jest](https://jestjs.io/) with `ts-jest`.

### Test file location

Tests live in `tests/` and mirror the source structure:
- `src/TxBuilder.ts` → `tests/TxBuilder.test.ts`

### Coverage targets

| Metric | Minimum |
|---|---|
| Statements | 85% |
| Branches | 80% |
| Functions | 85% |
| Lines | 85% |

### Running tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode during development
npm run test:watch

# Run integration tests only
npm run test:integration
```

### Writing good tests

- Each test should test **one behaviour**.
- Use descriptive `it()` labels: `it('throws when destination address is not a valid Stellar public key')`.
- Mock Horizon calls — do not make real network requests in unit tests.
- Test both the **happy path** and **error cases**.

---

## Code Style

This project enforces consistent style via [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/).

Key conventions:

- Use **explicit TypeScript types** for all public-facing interfaces and function signatures.
- Prefer `interface` over `type` for object shapes.
- Use `const` by default; `let` only when reassignment is required.
- Use `async/await` over raw Promises.
- Never use `any` without a comment explaining why.
- Helper functions should be module-level and pure where possible.
- All public methods must have JSDoc comments.

See [docs/coding-standards.md](docs/coding-standards.md) for the complete style guide.

---

## Documentation

- All new public API surface must be documented with JSDoc comments.
- Significant new features should update the relevant file in `docs/`.
- `CHANGELOG.md` must be updated under `[Unreleased]` for every PR.
- Breaking changes must document a migration path.

---

## Release Process

Releases are managed by maintainers. The process is:

1. Merge all changes to `develop`.
2. Bump the version in `package.json` following [Semantic Versioning](https://semver.org/).
3. Update `CHANGELOG.md` — move `[Unreleased]` items to the new version section.
4. Open a PR from `develop` → `main` labelled `release: vX.Y.Z`.
5. Merge and tag: `git tag vX.Y.Z && git push --tags`.
6. The `release.yml` workflow publishes to npm automatically.

See [docs/publishing.md](docs/publishing.md) for the full release runbook.
