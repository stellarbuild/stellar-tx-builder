# Roadmap

This document outlines the planned direction for `stellar-tx-builder`. It is a
living document — items may be added, reprioritised, or removed based on
community feedback, Stellar protocol changes, and maintainer capacity.

To propose an addition to the roadmap, open a
[Feature Request](https://github.com/stellarbuild/stellar-tx-builder/issues/new?template=feature_request.yml).

---

## Status Key

| Symbol | Meaning |
|---|---|
| ✅ | Released |
| 🔨 | In progress |
| 📋 | Planned |
| 💬 | Under discussion |
| ❌ | Deprioritised / not planned |

---

## Released

### v0.1.0
- ✅ `TxBuilder.for()` static factory
- ✅ `addPayment()` — XLM and custom assets
- ✅ `addCreateAccount()`
- ✅ `build()` / `sign()` / `submit()` / `toXDR()` pipeline
- ✅ Mainnet, testnet, futurenet network support
- ✅ Full TypeScript declarations

### v0.2.0
- ✅ `addChangeTrust()`
- ✅ `addManageOffer()` — DEX sell offers
- ✅ `setMemo()` with byte validation
- ✅ `setTimebounds()` with Unix timestamp and ISO string support

### v0.3.0
- ✅ `addManageBuyOffer()` — DEX buy offers
- ✅ `addPathPayment()` — PathPaymentStrictSend
- ✅ `addSetOptions()` — full signer type support
- ✅ `addManageData()`
- ✅ Relative timebound expressions (`+5m`, `+1h`, `+2d`)
- ✅ `invokeContract()` validation stub
- ✅ `wrapInFeeBump()` validation stub

---

## Planned

### v0.4.0 — Soroban Support
Target: Q3 2025

- 📋 Full `invokeContract()` implementation using `Operation.invokeHostFunction`
- 📋 Soroban argument type helpers: `ScVal` builder utilities for `Address`, `i128`, `u64`, `Bytes`, `Vec`, `Map`
- 📋 Soroban transaction fee simulation via `SorobanRpc.Server`
- 📋 `SorobanServer` configuration option in `TxBuilderOptions`

### v0.5.0 — Additional Classic Operations
Target: Q4 2025

- 📋 `addPathPaymentStrictReceive()` — specify exact destination amount
- 📋 `addCreateClaimableBalance()` — create claimable balance entries
- 📋 `addClaimClaimableBalance()` — claim a claimable balance
- 📋 `addRevokeSponsorship()` — revoke account, trustline, or offer sponsorship
- 📋 `addBeginSponsoringFutureReserves()` / `addEndSponsoringFutureReserves()`

### v0.6.0 — Fee Bump Transactions
Target: Q1 2026

- 📋 Full `wrapInFeeBump()` implementation using `TransactionBuilder.buildFeeBumpTransaction()`
- 📋 Fee bump XDR export
- 📋 Fee bump submission via Horizon

### v0.7.0 — Developer Experience
Target: Q2 2026

- 📋 `TxBuilder.fromXDR()` — reconstruct a builder from an existing XDR envelope
- 📋 `simulate()` method for dry-run Soroban transaction simulation
- 📋 `estimateFee()` for Horizon base fee recommendations
- 📋 Structured error classes (`TxBuilderValidationError`, `TxBuilderNetworkError`)

### v1.0.0 — Stable Release
Target: Q3 2026

- 📋 Stable, locked public API
- 📋 Full Soroban operation coverage
- 📋 Comprehensive integration test suite against Stellar testnet
- 📋 Complete API documentation with generated typedoc
- 📋 Audit of all public types and error messages

---

## Under Discussion

- 💬 **React hooks** — a `@stellarbuild/react` package with `useTxBuilder` hook
- 💬 **Browser wallet integration** — Freighter / Albedo signing adapter
- 💬 **Multi-party signing workflow** — helpers for collecting signatures from multiple parties before submission
- 💬 **Ledger hardware wallet support**

---

## Not Planned

- ❌ Stellar account management (creation, funding) — out of scope; use Horizon SDK directly
- ❌ Custom Horizon server implementation
- ❌ Support for Node.js < 18

---

## How to Influence the Roadmap

1. Open a [Feature Request](https://github.com/stellarbuild/stellar-tx-builder/issues/new?template=feature_request.yml) describing your use case.
2. Participate in [GitHub Discussions](https://github.com/stellarbuild/stellar-tx-builder/discussions) to share your priorities.
3. Submit a pull request — working implementations are the most effective way to accelerate roadmap items.
