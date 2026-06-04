# stellar-tx-builder 🔧

> A fluent, type-safe TypeScript transaction builder for Stellar — chain operations, validate inputs, and submit with confidence.

[![npm version](https://img.shields.io/npm/v/@stellarbuild/stellar-tx-builder)](https://npmjs.com/package/@stellarbuild/stellar-tx-builder)
[![CI](https://github.com/stellarbuild/stellar-tx-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/stellarbuild/stellar-tx-builder/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Stellar Wave](https://img.shields.io/badge/Stellar-Wave_Program-blue)](https://www.drips.network/wave/stellar)

## Why stellar-tx-builder?

The Stellar SDK is powerful, but constructing multi-operation transactions requires verbose, imperative boilerplate:

```ts
// Raw SDK — repetitive, easy to get wrong
const account = await server.loadAccount(sourceKeypair.publicKey());
const tx = new TransactionBuilder(account, {
  fee: BASE_FEE,
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(Operation.payment({ destination, asset: Asset.native(), amount: '100' }))
  .addMemo(Memo.text('payout'))
  .setTimeout(300)
  .build();
tx.sign(sourceKeypair);
const result = await server.submitTransaction(tx);
```

`stellar-tx-builder` wraps this in a chainable, readable API with runtime validation and full TypeScript types:

```ts
// stellar-tx-builder — clean, validated, safe
import { TxBuilder } from '@stellarbuild/stellar-tx-builder';

const result = await (
  await TxBuilder.for(sourceKeypair, { network: 'testnet' })
    .addPayment({ destination: 'G...DEST', amount: '100', asset: 'XLM' })
    .addPayment({ destination: 'G...DEST', amount: '50', asset: { code: 'USDC', issuer: 'G...ISSUER' } })
    .setMemo('batch payout')
    .setTimebounds({ maxTime: '+5m' })
    .build()
)
  .sign(sourceKeypair)
  .submit();

console.log(result.hash);
```

## Installation

```bash
npm install @stellarbuild/stellar-tx-builder @stellar/stellar-sdk
# or
yarn add @stellarbuild/stellar-tx-builder @stellar/stellar-sdk
```

> **Peer dependency:** `@stellar/stellar-sdk >= 12`

## Quick Start

### Single payment

```ts
import { Keypair } from '@stellar/stellar-sdk';
import { TxBuilder } from '@stellarbuild/stellar-tx-builder';

const keypair = Keypair.fromSecret('S...');

const result = await (
  await TxBuilder.for(keypair, { network: 'testnet' })
    .addPayment({
      destination: 'G...RECIPIENT',
      amount: '25',
      asset: 'XLM',
    })
    .build()
)
  .sign(keypair)
  .submit();

console.log('Submitted:', result.hash);
```

### Custom asset (e.g. USDC)

```ts
await TxBuilder.for(keypair, { network: 'mainnet' })
  .addChangeTrust({ asset: { code: 'USDC', issuer: 'G...ISSUER' } })
  .addPayment({
    destination: 'G...RECIPIENT',
    amount: '100',
    asset: { code: 'USDC', issuer: 'G...ISSUER' },
  })
  .setMemo('invoice-42')
  .build();
```

### Batch payouts with timebounds

```ts
const tx = await TxBuilder.for(keypair, { network: 'testnet' })
  .addPayment({ destination: recipientA, amount: '50', asset: 'XLM' })
  .addPayment({ destination: recipientB, amount: '50', asset: 'XLM' })
  .addPayment({ destination: recipientC, amount: '50', asset: 'XLM' })
  .setMemo('grant-wave-3')
  .setTimebounds({ maxTime: '+1h' })
  .build();

const result = await tx.sign(keypair).submit();
```

### Create and fund a new account

```ts
await TxBuilder.for(keypair, { network: 'testnet' })
  .addCreateAccount({
    destination: newAccount.publicKey(),
    startingBalance: '2', // minimum 1 XLM
  })
  .build();
```

### Preview XDR without submitting

```ts
const tx = await TxBuilder.for(keypair, { network: 'testnet' })
  .addPayment({ destination: 'G...', amount: '10', asset: 'XLM' })
  .build();

console.log(tx.toXDR()); // inspect before signing
```

## API

### `TxBuilder.for(keypair, options)`

Creates a new builder instance.

| Parameter | Type | Description |
|---|---|---|
| `keypair` | `Keypair` | Source account keypair |
| `options.network` | `'mainnet' \| 'testnet' \| 'futurenet'` | Target network |
| `options.fee` | `string` (optional) | Base fee in stroops. Default: `'100'` |
| `options.horizonUrl` | `string` (optional) | Override the default Horizon endpoint |

### Operations

| Method | Description |
|---|---|
| `.addPayment(params)` | Send XLM or any Stellar asset |
| `.addCreateAccount(params)` | Create and fund a new account |
| `.addChangeTrust(params)` | Add or remove a trustline |

### Modifiers

| Method | Description |
|---|---|
| `.setMemo(text)` | Attach a text memo (max 28 bytes) |
| `.setTimebounds({ minTime?, maxTime? })` | Set validity window. Accepts unix timestamps, ISO strings, or relative values like `'+5m'`, `'+1h'`, `'+1d'` |

### `build()` → `Promise<BuiltTransaction>`

Loads the source account from Horizon and assembles the transaction. Throws if no operations have been added.

### `BuiltTransaction`

| Method | Description |
|---|---|
| `.sign(keypair)` | Sign the transaction. Returns `this` for chaining |
| `.submit()` | Submit to Horizon. Returns `Promise<SubmitResult>` |
| `.toXDR()` | Return the raw XDR string without submitting |
| `.xdr` | The current XDR string (updated after each `.sign()` call) |

### `SubmitResult`

```ts
interface SubmitResult {
  hash:       string;
  ledger:     number;
  successful: boolean;
  resultXdr:  string;
}
```

## Validation

All inputs are validated before the transaction is assembled, not at submission time:

- Destination addresses are checked against the Stellar key format
- Amounts must be positive numbers
- Memo text is checked against the 28-byte limit
- Relative timebound strings must match `+<number><s|m|h|d>`

Invalid inputs throw descriptive errors immediately so you catch problems in development, not on-chain.

## Supported Operations

| Method | Stellar Operation | Status |
|---|---|---|
| `.addPayment(params)` | `payment` | ✅ Implemented |
| `.addCreateAccount(params)` | `createAccount` | ✅ Implemented |
| `.addChangeTrust(params)` | `changeTrust` | ✅ Implemented |
| `.addManageOffer(params)` | `manageSellOffer` | 🔜 Planned |
| `.addManageBuyOffer(params)` | `manageBuyOffer` | 🔜 Planned |
| `.addPathPayment(params)` | `pathPaymentStrictSend` | 🔜 Planned |
| `.addSetOptions(params)` | `setOptions` | 🔜 Planned |
| `.addManageData(params)` | `manageData` | 🔜 Planned |
| `.invokeContract(params)` | `invokeHostFunction` (Soroban) | 🔜 Planned |
| `.wrapInFeeBump(feeSource)` | Fee bump transaction | 🔜 Planned |

Want to implement one of these? See [Contributing](#contributing).

## Contributing

This project participates in the **[Stellar Wave Program](https://www.drips.network/wave/stellar)** on Drips. Contributors earn on-chain rewards for merged pull requests.

See [CONTRIBUTING.md](CONTRIBUTING.md) and browse issues tagged [`Stellar Wave`](https://github.com/stellarbuild/stellar-tx-builder/issues?q=label%3A%22Stellar+Wave%22).

Issues are pre-scoped with:
- Clear acceptance criteria
- Complexity rating (Trivial / Medium / High)
- Links to relevant Stellar documentation

## License

MIT © [stellarbuild](https://github.com/stellarbuild)