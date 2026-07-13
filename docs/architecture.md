# Architecture

This document describes the internal architecture of `stellar-tx-builder` — how
it is structured, how data flows through it, and how it relates to the Stellar
SDK.

---

## Overview

`stellar-tx-builder` is a thin, composable layer above `@stellar/stellar-sdk`.
It implements the **Builder pattern** to provide a fluent, chainable API for
assembling Stellar transactions. It does not reimplement any Stellar protocol
logic — all XDR encoding, cryptography, and network communication is delegated
to the Stellar SDK and Horizon.

```
┌─────────────────────────────────────────────────────────────────┐
│                       Consumer Application                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    TxBuilder.for(keypair, options)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         TxBuilder                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Operation Queue                             │    │
│  │   xdr.Operation[]  ←  addPayment() / addManageOffer()   │    │
│  │                        addChangeTrust() / ...           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │      Memo        │  │   Timebounds      │  │  FeeBump     │  │
│  │  Memo.text(str)  │  │  { min, max }     │  │  Config      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
│                        .build()  (async)                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                   │                     │
          ▼                   ▼                     ▼
  Horizon.Server      resolveAsset()         resolvePrice()
  .loadAccount()      parseRelativeTime()    validateAddress()
  (network I/O)       (pure helpers)         validateAmount()
          │
          ▼
  StellarTransactionBuilder
  (from @stellar/stellar-sdk)
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BuiltTransaction                            │
│                                                                  │
│   .sign(keypair)   →  tx.sign(keypair)   (mutates, returns this) │
│   .toXDR()         →  tx.toXDR()                                │
│   .submit()        →  server.submitTransaction(tx)              │
│   .xdr             →  current XDR string (updated after sign)   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Package Structure

```
src/
├── TxBuilder.ts       The core class — builder state, operation methods, build()
├── types.ts           All exported TypeScript interfaces
└── index.ts           Public API re-exports only
```

### `src/types.ts`

Contains all public-facing TypeScript interfaces:

| Type | Purpose |
|---|---|
| `TxBuilderOptions` | Configuration for network, fee, Horizon URL, timeout |
| `PaymentParams` | Parameters for `addPayment()` |
| `CreateAccountParams` | Parameters for `addCreateAccount()` |
| `ChangeTrustParams` | Parameters for `addChangeTrust()` |
| `ManageOfferParams` | Parameters for `addManageOffer()` |
| `ManageBuyOfferParams` | Parameters for `addManageBuyOffer()` |
| `PathPaymentParams` | Parameters for `addPathPayment()` |
| `SetOptionsParams` | Parameters for `addSetOptions()` |
| `ManageDataParams` | Parameters for `addManageData()` |
| `InvokeContractParams` | Parameters for `invokeContract()` (planned) |
| `TimeboundParams` | Parameters for `setTimebounds()` |
| `BuiltTransaction` | Interface returned by `build()` |
| `SubmitResult` | Interface returned by `submit()` |
| `NetworkPassphrase` | Union of supported network passphrase strings |

### `src/TxBuilder.ts`

Structured into four sections:

1. **Module-level constants** — `HORIZON_URLS`, `NETWORK_PASSPHRASES`
2. **Pure helper functions** — `resolveAsset`, `resolvePrice`, `parseRelativeTime`, `validateAddress`, `validateAmount`
3. **`BuiltTransactionImpl` class** — internal implementation of the `BuiltTransaction` interface
4. **`TxBuilder` class** — the main exported class

### `src/index.ts`

Thin re-export barrel. Exports `TxBuilder` as a named value and all types as
`type` re-exports (tree-shakeable).

---

## Transaction Builder Pipeline

### Stage 1: Configuration

`TxBuilder.for(keypair, options)` creates a builder instance. The constructor
is private — the factory enforces this entry point.

State initialised:
- `keypair: Keypair` — the transaction source account
- `options: TxBuilderOptions` — network, fee, optional Horizon URL
- `operations: xdr.Operation[]` — empty queue
- `memo?: Memo` — undefined
- `timebounds?: { minTime, maxTime }` — undefined
- `feeBumpSource?: string` — undefined
- `feeBumpFee?: string` — undefined

### Stage 2: Operation Accumulation

Each `add*()` method:
1. Validates inputs eagerly (throws `Error` synchronously on bad input)
2. Resolves assets and prices to SDK types
3. Creates an `xdr.Operation` via `Operation.*()` factory
4. Pushes it to `this.operations[]`
5. Returns `this` for chaining

### Stage 3: Build (Async)

`build()` performs the following steps:

1. Guards: throws if `operations` is empty
2. Resolves the Horizon URL from options or the `HORIZON_URLS` map
3. Resolves the network passphrase from the `NETWORK_PASSPHRASES` map
4. Creates a `Horizon.Server` instance
5. Loads the source account from Horizon (`server.loadAccount`)
6. Instantiates a `StellarTransactionBuilder` with fee and network passphrase
7. Iterates `this.operations[]` and calls `builder.addOperation()` for each
8. Applies memo if set
9. Applies timebounds if set; otherwise uses `TimeoutInfinite`
10. Calls `builder.build()` to produce a `Transaction`
11. Returns a `BuiltTransactionImpl` wrapping the transaction and server

### Stage 4: Sign & Submit

`BuiltTransactionImpl.sign(keypair)`:
- Calls `tx.sign(keypair)` on the inner transaction (mutates)
- Updates `this.xdr` to the new signed XDR
- Returns `this` (chainable — supports multisig)

`BuiltTransactionImpl.submit()`:
- Calls `server.submitTransaction(this.tx)`
- Maps the Horizon response to the `SubmitResult` interface

---

## Helper Functions

### `resolveAsset(asset)`

Converts `'XLM'` or `{ code, issuer }` to an `Asset` instance.
- `'XLM'` → `Asset.native()`
- `{ code, issuer }` → `new Asset(code, issuer)` — throws on empty values

### `resolvePrice(price)`

Converts a price to `{ n: number, d: number }`:
- `string` → parsed as decimal, converted to `{ n: Math.floor(n * 10_000_000), d: 10_000_000 }`
- `{ n, d }` → validated and returned directly

### `parseRelativeTime(value)`

Converts to a Unix timestamp in seconds:
- `number` → returned as-is
- `'+5m'` / `'+1h'` / `'+2d'` / `'+30s'` → `now + offset`
- ISO 8601 string → `Math.floor(new Date(value).getTime() / 1000)`

### `validateAddress(address, label)`

Calls `Keypair.fromPublicKey(address)` — throws with a descriptive message on
failure. Label is used in the error message for context.

### `validateAmount(amount, label)`

Parses `parseFloat(amount)` — throws if not a valid positive number.

---

## Network Configuration

```
network: 'testnet'
  → horizonUrl: 'https://horizon-testnet.stellar.org'
  → passphrase: Networks.TESTNET

network: 'mainnet'
  → horizonUrl: 'https://horizon.stellar.org'
  → passphrase: Networks.PUBLIC

network: 'futurenet'
  → horizonUrl: 'https://horizon-futurenet.stellar.org'
  → passphrase: Networks.FUTURENET
```

A custom `horizonUrl` in `TxBuilderOptions` overrides the default for that
network while still using the correct network passphrase.

---

## Error Handling Strategy

Errors are thrown as native JavaScript `Error` objects with descriptive messages.
All validation is **synchronous and eager** — errors surface before any async
network call. This means:

1. Invalid input → throws at the `add*()` call site
2. Network failure → rejects the `build()` or `submit()` Promise
3. Horizon error responses → propagate as rejections from the SDK

Future versions will introduce structured error classes
(`TxBuilderValidationError`, `TxBuilderNetworkError`) for programmatic error
handling. See the [Roadmap](../ROADMAP.md).

---

## Extension Points

### Adding a new operation

1. Add a new interface to `src/types.ts`
2. Export the interface from `src/index.ts`
3. Add a method to `TxBuilder` that validates params, resolves assets, calls
   the appropriate `Operation.*()` factory, and pushes to `this.operations`
4. Add tests in `tests/TxBuilder.test.ts`
5. Document the method in `docs/api.md`

### Adding a new network

1. Add the network key, Horizon URL, and passphrase to `HORIZON_URLS` and
   `NETWORK_PASSPHRASES` in `src/TxBuilder.ts`
2. Add the network to the `TxBuilderOptions.network` union in `src/types.ts`
3. Add the network passphrase to `NetworkPassphrase` in `src/types.ts`

---

## Design Decisions

See [docs/design-decisions.md](design-decisions.md) for a record of significant
architectural choices and the reasoning behind them.
