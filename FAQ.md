# Frequently Asked Questions

---

## General

### What is stellar-tx-builder?

`stellar-tx-builder` is a fluent, type-safe TypeScript library that wraps the
official `@stellar/stellar-sdk` to provide a chainable builder API for
constructing, signing, and submitting Stellar network transactions. It reduces
boilerplate without replacing or re-implementing Stellar primitives.

---

### How is this different from using `@stellar/stellar-sdk` directly?

The Stellar SDK gives you full control but requires you to manually:

- Load the account from Horizon
- Instantiate `TransactionBuilder` with the correct network passphrase
- Call verbose `Operation.*` factory functions
- Manage memo encoding, timebound formatting, and asset resolution separately

`stellar-tx-builder` handles all of that scaffolding in a single fluent chain.
If you need low-level control that this library doesn't expose, you should use
the SDK directly — this library does not block that.

---

### Does this library work in the browser?

Yes. The ESM build (`dist/esm/`) is compatible with modern bundlers (Vite,
webpack, Rollup, esbuild). The library has no Node.js-specific runtime
dependencies in the critical path.

Note: `@stellar/stellar-sdk` itself has browser compatibility requirements —
consult the [Stellar SDK documentation](https://github.com/stellar/js-stellar-sdk)
for bundle configuration guidance.

---

### Does this library store or transmit my private keys?

No. `stellar-tx-builder` never stores, logs, or transmits private keys. You
pass a `Keypair` object to the builder at construction time, and that keypair
is only used during `.sign()` to sign the transaction locally. All signing
happens in-process using the Stellar SDK's cryptographic implementation.

---

### Which Stellar networks are supported?

Three networks are supported out of the box:

| Value | Network |
|---|---|
| `'testnet'` | Stellar Testnet — use this for development |
| `'mainnet'` | Stellar Mainnet (Public Network) |
| `'futurenet'` | Stellar Futurenet — pre-release features |

You can also override the Horizon URL via `TxBuilderOptions.horizonUrl` to
target a private Horizon instance.

---

### What Node.js version is required?

Node.js **18 or higher** is required. This aligns with the Node.js LTS schedule
and the requirements of `@stellar/stellar-sdk`.

---

## Installation & Setup

### I installed the package but TypeScript cannot find the types.

Ensure you have `@stellar/stellar-sdk` installed as a peer dependency, and that
your `tsconfig.json` includes `"moduleResolution": "bundler"` or `"node16"` /
`"nodenext"` for ESM, or `"node"` for CommonJS projects.

```bash
npm install @stellarbuild/stellar-tx-builder @stellar/stellar-sdk
```

See [docs/installation.md](docs/installation.md) for the complete setup guide.

---

### Can I use this with CommonJS (`require`)?

Yes. The CJS build is at `dist/cjs/index.js` and is selected automatically
when you use `require()`:

```javascript
const { TxBuilder } = require('@stellarbuild/stellar-tx-builder');
```

---

### Can I use this with ESM (`import`)?

Yes. The ESM build is at `dist/esm/index.js` and is selected automatically:

```typescript
import { TxBuilder } from '@stellarbuild/stellar-tx-builder';
```

---

## API & Usage

### How do I send XLM to another account?

```typescript
const tx = await TxBuilder.for(keypair, { network: 'testnet' })
  .addPayment({
    destination: 'G...',
    amount: '10',
    asset: 'XLM',
  })
  .build();

await tx.sign(keypair).submit();
```

---

### How do I send a custom asset (e.g. USDC)?

Pass an object with `code` and `issuer` instead of `'XLM'`:

```typescript
.addPayment({
  destination: 'G...',
  amount: '100',
  asset: {
    code: 'USDC',
    issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  },
})
```

---

### How do I set a transaction timeout?

Use `setTimebounds()` with a relative time string:

```typescript
.setTimebounds({ maxTime: '+5m' })   // expires in 5 minutes
.setTimebounds({ maxTime: '+1h' })   // expires in 1 hour
.setTimebounds({ maxTime: '+2d' })   // expires in 2 days
```

You can also pass an absolute Unix timestamp or ISO 8601 string:

```typescript
.setTimebounds({ maxTime: 1800000000 })
.setTimebounds({ maxTime: '2025-12-31T23:59:59Z' })
```

---

### How do I build a multisig transaction?

Chain multiple `.sign()` calls before `.submit()`:

```typescript
const built = await TxBuilder.for(sourceKeypair, { network: 'testnet' })
  .addPayment({ destination: 'G...', amount: '10', asset: 'XLM' })
  .build();

await built
  .sign(signer1)
  .sign(signer2)
  .submit();
```

---

### How do I get the XDR without submitting?

```typescript
const built = await TxBuilder.for(keypair, { network: 'testnet' })
  .addPayment({ destination: 'G...', amount: '10', asset: 'XLM' })
  .build();

built.sign(keypair);
const xdr = built.toXDR();
// Use xdr with Freighter, Stellar Laboratory, or an external signer
```

---

### Can I add multiple operations in one transaction?

Yes. Up to 100 operations can be included in a single Stellar transaction.
Chain as many operation methods as needed:

```typescript
const tx = await TxBuilder.for(keypair, { network: 'testnet' })
  .addChangeTrust({ asset: { code: 'USDC', issuer: 'G...' } })
  .addPayment({ destination: 'G...', amount: '100', asset: 'XLM' })
  .addManageData({ name: 'metadata', value: 'value' })
  .build();
```

---

### Why does `invokeContract()` throw "not yet fully implemented"?

Full Soroban / `InvokeHostFunction` support requires complex XDR construction
that is planned for v0.4.0. For now, the method validates your inputs but
throws before building. For Soroban operations in the meantime, use
`@stellar/stellar-sdk` directly:

```typescript
import { Operation, xdr } from '@stellar/stellar-sdk';

const op = Operation.invokeHostFunction({
  func: xdr.HostFunction.hostFunctionTypeInvokeContract(
    new xdr.InvokeContractArgs({ ... })
  ),
  auth: [],
});
```

See the [Roadmap](ROADMAP.md) for the planned Soroban release timeline.

---

### Why does `wrapInFeeBump()` throw during `build()`?

The fee bump implementation requires resolving a SDK compatibility path for
`TransactionBuilder.buildFeeBumpTransaction()`. It is planned for v0.6.0. For
now, use the Stellar SDK directly:

```typescript
import { TransactionBuilder, Keypair, Networks } from '@stellar/stellar-sdk';

const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
  feePayer,
  '500',
  innerTransaction,
  Networks.TESTNET
);
```

---

## Errors & Troubleshooting

### I get "Invalid Stellar address for destination" — what does that mean?

Destination addresses must be valid Stellar public keys (56 characters,
starting with `G`). Double-check the address you are passing. If you are
using a muxed account (`M...`) or a contract ID, you must resolve it to a
`G...` address first.

---

### I get "Cannot build a transaction with no operations"

You must add at least one operation before calling `.build()`. Ensure you
have called at least one `add*()` method:

```typescript
const tx = await TxBuilder.for(keypair, { network: 'testnet' })
  .addPayment({ ... })   // ← required
  .build();
```

---

### My transaction is rejected by Horizon with `tx_bad_seq`

This means the transaction's sequence number does not match the current
sequence number on the account. This typically happens when:

- Multiple transactions are built from the same account simultaneously
- An earlier transaction with a higher sequence number was already submitted
- The account sequence was advanced between `.build()` and `.submit()`

Build and submit transactions sequentially for the same account, or manage
sequence numbers explicitly using the Stellar SDK.

---

### Where can I find more troubleshooting help?

See [docs/troubleshooting.md](docs/troubleshooting.md) for a comprehensive
list of common errors and their resolutions.
