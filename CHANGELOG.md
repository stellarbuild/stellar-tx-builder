# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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