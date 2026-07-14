# stellar-tx-builder

<div align="center">

[![npm version](https://img.shields.io/npm/v/@stellarbuild/stellar-tx-builder.svg?style=flat-square)](https://www.npmjs.com/package/@stellarbuild/stellar-tx-builder)
[![CI](https://github.com/stellarbuild/stellar-tx-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/stellarbuild/stellar-tx-builder/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Stellar SDK](https://img.shields.io/badge/Stellar%20SDK-%3E%3D12-blueviolet?style=flat-square)](https://github.com/stellar/js-stellar-sdk)

**A fluent, type-safe TypeScript transaction builder for the [Stellar](https://stellar.org) network.**

[Documentation](docs/) · [API Reference](docs/api.md) · [Changelog](CHANGELOG.md) · [Roadmap](ROADMAP.md) · [Contributing](CONTRIBUTING.md)

</div>

---

## Table of Contents

- [Why stellar-tx-builder Exists](#why-stellar-tx-builder-exists)
- [How It Works](#how-it-works)
- [Architecture Overview](#architecture-overview)
- [Key Features](#key-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage Examples](#usage-examples)
- [Supported Operations](#supported-stellar-operations)
- [Error Handling](#error-handling)
- [TypeScript Support](#typescript-support)
- [Local Development](#local-development)
- [Repository Structure](#repository-structure)
- [Security](#security)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [FAQ](#faq)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Why stellar-tx-builder Exists

Building Stellar transactions with the official `@stellar/stellar-sdk` requires developers to manually:

- Load the source account from Horizon
- Instantiate a `TransactionBuilder` with the correct network passphrase
- Call low-level `Operation.*` factory functions with verbose parameters
- Handle asset resolution, memo encoding, and timebound formatting independently
- Manage the build → sign → submit lifecycle explicitly

This is correct and powerful, but verbose. For teams building products on Stellar — wallets, exchanges, payment rails, DeFi applications — the boilerplate accumulates and becomes a source of mistakes.

**`stellar-tx-builder` wraps the Stellar SDK in a fluent, chainable builder API** that handles the repetitive scaffolding while staying transparently thin over the SDK. It does not re-implement Stellar primitives — it composes them.

---

## How It Works

The builder follows a three-stage pipeline:

```
TxBuilder.for(keypair, options)   ← configure network & source account
  .addPayment(params)             ← declare operations (chainable)
  .setMemo('Invoice #42')         ← optional metadata
  .setTimebounds({ maxTime: '+5m' }) ← optional validity window
  .build()                        ← async: loads account, assembles transaction
  .then(tx => tx.sign(keypair))   ← sign with one or more keypairs
  .then(tx => tx.submit())        ← submit to Horizon
```

Each step validates its inputs eagerly — before any network call — so errors surface immediately in development rather than at submission time.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Your Application                    │
└────────────────────────┬────────────────────────────────┘
                         │ TxBuilder.for(keypair, options)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                      TxBuilder                          │
│  ┌────────────────────────────────────────────────┐     │
│  │  Operation Queue (validated xdr.Operation[])   │     │
│  ├────────────────────────────────────────────────┤     │
│  │  Memo  │  Timebounds  │  Fee Bump Config        │     │
│  └────────────────────────────────────────────────┘     │
│                         │ .build()                      │
└─────────────────────────┼───────────────────────────────┘
                          │ async: loadAccount()
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Horizon.Server                        │
│                 (@stellar/stellar-sdk)                  │
└─────────────────────────┬───────────────────────────────┘
                          │ StellarTransactionBuilder
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  BuiltTransaction                        │
│         .sign(keypair) → .submit() → SubmitResult       │
└─────────────────────────────────────────────────────────┘
```

See [docs/architecture.md](docs/architecture.md) for a detailed breakdown.

---

## Key Features

| Feature | Details |
|---|---|
| **Fluent builder API** | Chainable methods for all common operations |
| **Full TypeScript support** | Strict types for all params, full IntelliSense |
| **Eager validation** | Input errors thrown before any network call |
| **Multi-operation transactions** | Chain any combination of supported operations |
| **Relative timebounds** | `'+5m'`, `'+1h'`, `'+2d'` in addition to timestamps |
| **Asset resolution** | Pass `'XLM'` or `{ code, issuer }` — SDK Asset handled internally |
| **Dual CJS/ESM build** | Works in Node.js, Vite, Next.js, and browser bundlers |
| **Zero extra runtime deps** | Only peer-depends on `@stellar/stellar-sdk` |

---

## Installation

```bash
# npm
npm install @stellarbuild/stellar-tx-builder

# yarn
yarn add @stellarbuild/stellar-tx-builder

# pnpm
pnpm add @stellarbuild/stellar-tx-builder
```

**Peer dependency** — you must also have the Stellar SDK installed:

```bash
npm install @stellar/stellar-sdk
```

> **Requires** Node.js ≥ 18 and `@stellar/stellar-sdk` ≥ 12.

See [docs/installation.md](docs/installation.md) for advanced setup, ESM configuration, and version compatibility matrix.

---

## Quick Start

```typescript
import { TxBuilder } from '@stellarbuild/stellar-tx-builder';
import { Keypair } from '@stellar/stellar-sdk';

const sourceKeypair = Keypair.fromSecret('SCZANGBA5RLPKD2EPQNZJ4QPIMESUHW26IUSQQ7VFXZ4HNPNGJXS23');

const tx = await TxBuilder.for(sourceKeypair, { network: 'testnet' })
  .addPayment({
    destination: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
    amount: '100',
    asset: 'XLM',
    memo: 'Payment for services',
  })
  .setTimebounds({ maxTime: '+5m' })
  .build();

const result = await tx.sign(sourceKeypair).submit();

console.log('Transaction hash:', result.hash);
console.log('Ledger:', result.ledger);
```

---

## Usage Examples

### Send a Custom Asset (USDC)

```typescript
const tx = await TxBuilder.for(keypair, { network: 'mainnet' })
  .addPayment({
    destination: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
    amount: '50',
    asset: {
      code: 'USDC',
      issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    },
  })
  .build();
```

### Create a New Account

```typescript
const tx = await TxBuilder.for(keypair, { network: 'testnet' })
  .addCreateAccount({
    destination: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
    startingBalance: '2', // minimum 1 XLM
  })
  .build();
```

### Add a Trustline

```typescript
const tx = await TxBuilder.for(keypair, { network: 'testnet' })
  .addChangeTrust({
    asset: {
      code: 'USDC',
      issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    },
    limit: '10000', // omit to set maximum, pass '0' to remove
  })
  .build();
```

### Place a DEX Sell Offer

```typescript
const tx = await TxBuilder.for(keypair, { network: 'testnet' })
  .addManageOffer({
    selling: { code: 'USDC', issuer: 'GA5ZSEJ...' },
    buying: 'XLM',
    amount: '500',
    price: '0.25', // or { n: 1, d: 4 } as a fraction
  })
  .build();
```

### Path Payment (DEX Swap)

```typescript
const tx = await TxBuilder.for(keypair, { network: 'mainnet' })
  .addPathPayment({
    destination: 'GDQP2KPQ...',
    sendAsset: 'XLM',
    sendAmount: '100',
    destAsset: { code: 'USDC', issuer: 'GA5ZSEJ...' },
    destAmount: '25', // minimum to receive
    path: [{ code: 'yXLM', issuer: 'GARDNEUQQ...' }],
  })
  .build();
```

### Multi-operation Transaction

```typescript
const tx = await TxBuilder.for(keypair, { network: 'testnet' })
  .addChangeTrust({ asset: { code: 'USDC', issuer: 'GA5ZSEJ...' } })
  .addPayment({ destination: 'GDQP2KPQ...', amount: '100', asset: 'XLM' })
  .addManageData({ name: 'last_payment', value: new Date().toISOString() })
  .setMemo('Setup + payment')
  .setTimebounds({ minTime: 0, maxTime: '+10m' })
  .build();
```

### Sign with Multiple Signers

```typescript
const built = await TxBuilder.for(keypair, { network: 'testnet' })
  .addPayment({ destination: DEST, amount: '10', asset: 'XLM' })
  .build();

// Chain multiple .sign() calls for multisig transactions
const result = await built
  .sign(signer1Keypair)
  .sign(signer2Keypair)
  .submit();
```

### Get XDR without Submitting

```typescript
const built = await TxBuilder.for(keypair, { network: 'testnet' })
  .addPayment({ destination: DEST, amount: '10', asset: 'XLM' })
  .build();

built.sign(keypair);
const xdr = built.toXDR();
// Send xdr to an external signer, Stellar Laboratory, or Freighter wallet
```

---

## Supported Stellar Operations

| Method | Stellar Operation |
|---|---|
| `addPayment()` | `Payment` |
| `addCreateAccount()` | `CreateAccount` |
| `addChangeTrust()` | `ChangeTrust` |
| `addManageOffer()` | `ManageSellOffer` |
| `addManageBuyOffer()` | `ManageBuyOffer` |
| `addPathPayment()` | `PathPaymentStrictSend` |
| `addSetOptions()` | `SetOptions` |
| `addManageData()` | `ManageData` |
| `invokeContract()` | `InvokeHostFunction` *(planned — see Roadmap)* |

---

## Error Handling

All validation is performed synchronously, before any network request, so you can catch configuration mistakes early:

```typescript
try {
  const tx = await TxBuilder.for(keypair, { network: 'testnet' })
    .addPayment({
      destination: 'not-a-valid-address', // throws immediately
      amount: '10',
      asset: 'XLM',
    })
    .build();
} catch (err) {
  // err.message: "Invalid Stellar address for destination: ..."
  console.error(err.message);
}
```

Common errors and their causes are documented in [docs/troubleshooting.md](docs/troubleshooting.md).

---

## TypeScript Support

The library ships with full TypeScript declarations. All parameter interfaces are exported:

```typescript
import type {
  TxBuilderOptions,
  PaymentParams,
  CreateAccountParams,
  ChangeTrustParams,
  ManageOfferParams,
  ManageBuyOfferParams,
  PathPaymentParams,
  SetOptionsParams,
  ManageDataParams,
  InvokeContractParams,
  TimeboundParams,
  BuiltTransaction,
  SubmitResult,
} from '@stellarbuild/stellar-tx-builder';
```

---

## Local Development

```bash
# 1. Clone the repository
git clone https://github.com/stellarbuild/stellar-tx-builder.git
cd stellar-tx-builder

# 2. Install dependencies
npm install

# 3. Build (CJS + ESM)
npm run build

# 4. Run tests
npm run test

# 5. Run tests with coverage
npm run test:coverage

# 6. Lint
npm run lint

# 7. Type-check
npm run typecheck
```

See [docs/development.md](docs/development.md) for a complete local development guide.

---

## Repository Structure

```
stellar-tx-builder/
├── src/
│   ├── TxBuilder.ts        # Core builder class
│   ├── types.ts            # All TypeScript interfaces
│   └── index.ts            # Public API surface
├── tests/
│   └── TxBuilder.test.ts   # Unit test suite
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── transaction-builder.md
│   ├── installation.md
│   ├── development.md
│   ├── testing.md
│   ├── publishing.md
│   ├── troubleshooting.md
│   ├── coding-standards.md
│   └── design-decisions.md
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── release.yml
│   ├── ISSUE_TEMPLATE/
│   ├── CODEOWNERS
│   ├── dependabot.yml
│   └── pull_request_template.md
├── dist/                   # Generated — do not edit
│   ├── cjs/
│   └── esm/
├── CHANGELOG.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── GOVERNANCE.md
├── ROADMAP.md
├── SECURITY.md
├── SUPPORT.md
├── FAQ.md
└── LICENSE
```

---

## Security

`stellar-tx-builder` is a **transaction construction library** — it does not transmit, store, or manage private keys. Private key handling is the responsibility of the caller.

To report a security vulnerability, please follow our [Security Policy](SECURITY.md). Do **not** open a public GitHub issue for security concerns.

---

## Contributing

Contributions are welcome and appreciated. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

Quick summary:
1. Fork the repository and create a feature branch.
2. Make your changes with tests.
3. Ensure `npm run lint`, `npm run typecheck`, and `npm run test` all pass.
4. Open a pull request against `main`.

---

## Roadmap

Upcoming features planned for future releases:

- **v0.4** — Full Soroban / `InvokeHostFunction` support
- **v0.5** — `PathPaymentStrictReceive` operation
- **v0.6** — `CreateClaimableBalance` and `ClaimClaimableBalance`
- **v1.0** — Stable API, full Soroban coverage, comprehensive integration tests

See [ROADMAP.md](ROADMAP.md) for the full roadmap.

---

## FAQ

See [FAQ.md](FAQ.md) for answers to common questions.

---

## License

[MIT](LICENSE) © [StellarBuild](https://stellarbuild.io)[MIT](LICENSE) © [stellarbuild](https://github.com/stellarbuild)

---

## Acknowledgements

- [Stellar Development Foundation](https://stellar.org) for the Stellar network and JavaScript SDK
- The [Stellar Ecosystem Proposals](https://github.com/stellar/stellar-protocol/tree/master/ecosystem) community
- All [contributors](https://github.com/stellarbuild/stellar-tx-builder/graphs/contributors) who have improved this library