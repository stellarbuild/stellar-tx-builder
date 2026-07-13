# Changelog

All notable changes to `@stellarbuild/stellar-tx-builder` are documented in
this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Dual ESM/CommonJS build output (`dist/cjs/` and `dist/esm/`)
- `exports` field in `package.json` for correct module resolution in bundlers
- `tsconfig.esm.json` for the ESM compilation pass
- `.prettierrc` for consistent code formatting
- `format` and `format:check` npm scripts
- `typecheck` npm script (`tsc --noEmit`)
- `clean` npm script to clear `dist/` before build
- `lint:fix` npm script
- `release.yml` GitHub Actions workflow for automated npm publishing on version tags
- `CODEOWNERS` file routing reviews to appropriate teams
- `dependabot.yml` with grouped dependency update configuration
- GitHub issue form templates (bug report, feature request, documentation issue)
- Pull request template with type-of-change checklist
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1
- `SECURITY.md` — responsible disclosure policy and reporting process
- `GOVERNANCE.md` — project roles, decision-making process, and release policy
- `ROADMAP.md` — public feature roadmap
- `SUPPORT.md` — support channels and community resources
- `FAQ.md` — frequently asked questions
- `docs/architecture.md` — package architecture and pipeline documentation
- `docs/api.md` — complete API reference
- `docs/transaction-builder.md` — deep-dive into the builder pattern
- `docs/installation.md` — installation and compatibility guide
- `docs/development.md` — local development guide
- `docs/testing.md` — testing strategy and guide
- `docs/publishing.md` — release and publishing runbook
- `docs/troubleshooting.md` — common errors and resolutions
- `docs/coding-standards.md` — code style and conventions
- `docs/design-decisions.md` — architecture decision records

### Changed
- `README.md` rewritten to production quality with full API overview, architecture diagram, and usage examples
- `CONTRIBUTING.md` expanded with commit conventions, branch strategy, and full workflow
- `tsconfig.json` updated to output to `dist/cjs/` with additional compiler strictness flags
- `ci.yml` upgraded with `concurrency` cancellation, dedicated quality-checks job, and build artifact verification
- `.gitignore` extended with `temp/`, `*.tgz`, and `npm-debug.log*` patterns
- `package.json` upgraded with `exports`, `publishConfig`, `engines`, `author`, and `sideEffects: false`

---

## [0.3.0] — 2025-06-01

### Added
- `addManageBuyOffer()` operation support
- `addSetOptions()` with full signer type support (ed25519, sha256, preAuthTx)
- `addManageData()` with 64-byte name and value length validation
- `invokeContract()` stub with input validation (full Soroban implementation planned for v0.4)
- `wrapInFeeBump()` with address and fee validation (full implementation planned)
- `addPathPayment()` using `PathPaymentStrictSend`
- Relative timebound expressions: `+5m`, `+1h`, `+2d`, `+30s`
- `resolvePrice()` helper supporting string decimals and `{ n, d }` fractions

### Changed
- `resolveAsset()` improved with explicit error messages for empty code/issuer
- `validateAddress()` now uses `Keypair.fromPublicKey()` for strict public key validation
- `validateAmount()` rejects zero and negative values with descriptive errors

### Fixed
- Memo set via `addPayment()` is now correctly overridden by an explicit `setMemo()` call

---

## [0.2.0] — 2025-03-15

### Added
- `addManageOffer()` for DEX sell offers
- `addChangeTrust()` with optional `limit` parameter
- `setTimebounds()` supporting Unix timestamps and ISO date strings
- `setMemo()` with 28-byte UTF-8 length validation

### Changed
- Builder is now constructed via `TxBuilder.for()` static factory (private constructor)
- `build()` now returns `BuiltTransaction` interface instead of raw `Transaction`

---

## [0.1.0] — 2025-01-20

### Added
- Initial release
- `TxBuilder.for()` static factory
- `addPayment()` supporting XLM and custom assets
- `addCreateAccount()` with minimum balance validation
- `build()` loading account from Horizon and assembling transaction
- `BuiltTransaction.sign()` for keypair signing
- `BuiltTransaction.submit()` for Horizon submission
- `BuiltTransaction.toXDR()` for exporting unsigned/signed XDR
- Support for `mainnet`, `testnet`, and `futurenet` networks
- Full TypeScript declarations
- Unit test suite with Horizon mock

[Unreleased]: https://github.com/stellarbuild/stellar-tx-builder/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/stellarbuild/stellar-tx-builder/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/stellarbuild/stellar-tx-builder/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/stellarbuild/stellar-tx-builder/releases/tag/v0.1.0