# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] — 2026-07-03

### Fixed

- **BREAKING**: Corrected timebounds implementation in `setTimebounds()` and `build()`. Previously, relative time values (e.g., `'+5m'`) were incorrectly passed to `setTimeout()`, which expects a duration from now, not an absolute timestamp. This caused transaction validity windows to be wildly incorrect (e.g., `'+5m'` produced a ~56-year window instead of 5 minutes). Now uses `setTimebounds()` with absolute Unix timestamps when timebounds are set. If you were relying on the broken (effectively infinite) timebound behavior, your transactions will now have the correct validity windows.

### Changed

- Removed broken `"module": "dist/index.esm.js"` field from package.json (file was never generated). Library now ships CommonJS only; ESM support is planned for future work.
- `addChangeTrust()` now uses the `resolveAsset()` helper for consistent validation, producing friendly error messages like `"Invalid asset: code=\"X\", issuer=\"Y\""` instead of raw SDK errors.
- Deleted dead root-level `TxBuilder.test.ts` file (237 lines). Jest was configured to only run tests in `tests/` directory, so this file never executed and could confuse contributors.

### Added

- Coverage reporting to CI with 80% threshold (branches, functions, lines, statements). Current coverage: 95.36% lines, 92.59% branches, 96% functions.
- Added `repository`, `bugs`, and `homepage` fields to package.json for better npm metadata.
- Regression tests for timebounds to verify absolute timestamps are correctly set for relative time values.

---

## [0.2.0] — 2026-05-11

### Added

- `TxBuilder.addPayment(params)` — send XLM or any Stellar asset with runtime validation on address and amount
- `TxBuilder.addCreateAccount(params)` — create and fund a new Stellar account
- `TxBuilder.addChangeTrust(params)` — add or remove a trustline, with optional `limit` override
- `TxBuilder.setMemo(text)` — attach a text memo; enforces the 28-byte limit at call time
- `TxBuilder.setTimebounds({ minTime?, maxTime? })` — accepts relative strings (`'+5m'`, `'+1h'`, `'+1d'`), unix timestamps, and ISO date strings
- `TxBuilder.build()` — loads source account from Horizon and assembles the transaction; throws immediately if no operations have been added
- `BuiltTransaction.sign(keypair)` — signs the transaction and updates `.xdr`; returns `this` for chaining
- `BuiltTransaction.submit()` — submits to Horizon and returns a typed `SubmitResult`
- `BuiltTransaction.toXDR()` — inspect the raw XDR string without submitting
- `types.ts` — full TypeScript interfaces: `TxBuilderOptions`, `PaymentParams`, `CreateAccountParams`, `ChangeTrustParams`, `TimeboundParams`, `BuiltTransaction`, `SubmitResult`
- `index.ts` — clean public API surface exporting the class and all types
- `tsconfig.json` — strict ES2020 TypeScript config
- `jest.config.js` — ts-jest test setup
- 26 unit tests covering all operations, edge cases, validation errors, and the full fluent chain

### Fixed

- Corrected SDK import: `TimeoutInfinite` is a named export, not `TransactionBuilder.TimeoutInfinite`
- Corrected operation type: `addOperation()` expects `xdr.Operation`, not the high-level `Operation` object

---

## [0.1.0] — 2026-05-08

### Added

- Initial project scaffold: `TxBuilder` class skeleton with fluent API shape
- `package.json`, CI workflow (`.github/workflows/ci.yml`), `CONTRIBUTING.md`, `LICENSE`
- Stubbed methods: `addPayment()`, `addCreateAccount()`, `setMemo()`, `setTimebounds()`, `build()` — all marked `// TODO`