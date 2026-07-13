# Troubleshooting

This guide lists common errors encountered when using `stellar-tx-builder` and
how to resolve them.

---

## Build Errors

### `Cannot find module '@stellarbuild/stellar-tx-builder'`

**Cause:** The package is not installed.

**Fix:**
```bash
npm install @stellarbuild/stellar-tx-builder @stellar/stellar-sdk
```

---

### `Cannot find module '@stellar/stellar-sdk'`

**Cause:** The peer dependency is not installed.

**Fix:**
```bash
npm install @stellar/stellar-sdk
```

---

### TypeScript: `Could not find a declaration file for module '...'`

**Cause:** Module resolution is not configured correctly for your project.

**Fix:** In `tsconfig.json`, set `moduleResolution` to `"node"` (CJS) or
`"bundler"` (ESM/Vite):

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

---

## Validation Errors (Thrown by `add*()` methods)

### `Invalid Stellar address for <label>: "..."...`

**Cause:** An address you passed is not a valid Stellar public key. Stellar
public keys are 56 characters long and start with `G`.

**Fix:** Verify the address with the [Stellar Laboratory](https://lab.stellar.org)
or by calling:
```typescript
import { StrKey } from '@stellar/stellar-sdk';
console.log(StrKey.isValidEd25519PublicKey('G...'));
```

Common mistakes:
- Passing a secret key (`S...`) instead of a public key (`G...`)
- Passing a muxed account address (`M...`) — not yet supported
- Whitespace characters in the address string

---

### `<label> must be a non-empty string`

**Cause:** A required string parameter is empty or `undefined`.

**Fix:** Ensure all required fields have non-empty string values before passing
them to the builder.

---

### `Invalid amount for <label>: "..." must be greater than 0`

**Cause:** The amount passed is zero, negative, or not a valid number string.

**Fix:** Amounts must be positive decimal strings:
```typescript
.addPayment({ amount: '10' })    // ✅
.addPayment({ amount: '0.001' }) // ✅
.addPayment({ amount: '0' })     // ❌
.addPayment({ amount: '-5' })    // ❌
.addPayment({ amount: 10 as any }) // ❌ — must be a string
```

---

### `Asset code must be a non-empty string`

**Cause:** You passed an empty string for a custom asset code.

**Fix:**
```typescript
// ❌ Invalid
{ code: '', issuer: 'G...' }

// ✅ Correct
{ code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' }
```

---

### `Memo text exceeds 28-byte limit`

**Cause:** Your memo string exceeds the 28-byte Stellar protocol limit.
Note that multibyte UTF-8 characters (emoji, CJK) consume more than 1 byte.

**Fix:** Shorten the memo to 28 bytes or fewer:
```typescript
// ✅ Safe
builder.setMemo('Order #1234');

// ❌ Too long
builder.setMemo('This memo is definitely too long for Stellar');
```

---

### `Data name exceeds 64-byte limit`

**Cause:** `addManageData()` received a `name` string longer than 64 UTF-8 bytes.

**Fix:** Keep data entry names concise. The Stellar protocol limits both key
and value to 64 bytes.

---

### `Invalid time value: "..."`

**Cause:** `setTimebounds()` received a relative time string in an unrecognised
format.

**Fix:** Use the supported formats:
```typescript
// ✅ Relative formats
setTimebounds({ maxTime: '+30s' })
setTimebounds({ maxTime: '+5m' })
setTimebounds({ maxTime: '+1h' })
setTimebounds({ maxTime: '+2d' })

// ✅ Unix timestamp (number)
setTimebounds({ maxTime: 1800000000 })

// ✅ ISO 8601 string
setTimebounds({ maxTime: '2025-12-31T23:59:59Z' })

// ❌ Unsupported relative format
setTimebounds({ maxTime: '+5x' })
```

---

## Build / Network Errors

### `Cannot build a transaction with no operations`

**Cause:** `build()` was called without adding any operations.

**Fix:** Add at least one operation before calling `build()`:
```typescript
const tx = await TxBuilder.for(keypair, { network: 'testnet' })
  .addPayment({ ... }) // ← required
  .build();
```

---

### `Horizon 404: Account not found`

**Cause:** The source account keypair you passed to `TxBuilder.for()` does not
exist on the target network. Horizon returns a 404 when `loadAccount()` is
called for a non-existent account.

**Fix:**
- On testnet: use [Friendbot](https://friendbot.stellar.org) to fund the account.
- On mainnet: the account must be funded with at least 1 XLM before transactions can be sent.
- Verify you are using the correct network:
  ```typescript
  TxBuilder.for(keypair, { network: 'testnet' }) // not 'mainnet'
  ```

---

### `Horizon 400: tx_bad_seq`

**Cause:** The transaction sequence number is incorrect. This happens when:
- Two transactions were built concurrently from the same account
- A previous transaction advanced the account sequence before this one was submitted

**Fix:** Always build transactions sequentially for the same source account.
If you need to submit multiple transactions rapidly, use a sequence management
strategy and reload the account between builds.

---

### `Horizon 400: tx_insufficient_fee`

**Cause:** The fee you specified is below the current network minimum.

**Fix:** Increase the `fee` in `TxBuilderOptions`. Query the current fee stats:

```typescript
const server = new Horizon.Server('https://horizon-testnet.stellar.org');
const feeStats = await server.feeStats();
console.log(feeStats.fee_charged.p70); // 70th percentile fee
```

---

### `Horizon 400: op_no_trust`

**Cause:** You attempted to send a custom asset to an account that does not
have a trustline for it.

**Fix:** The destination account must call `addChangeTrust()` for the asset
before it can receive it.

---

### `Soroban contract invocation is not yet fully implemented`

**Cause:** `invokeContract()` has not been fully implemented yet.

**Fix:** Use `@stellar/stellar-sdk` directly for Soroban operations, or wait
for v0.4.0. See [FAQ.md](../FAQ.md) for an example.

---

### `Fee bump transaction requires SDK compatibility fixes`

**Cause:** `wrapInFeeBump()` has not been fully implemented yet.

**Fix:** Use `TransactionBuilder.buildFeeBumpTransaction()` from `@stellar/stellar-sdk`
directly. See [FAQ.md](../FAQ.md) for an example.

---

## Getting Further Help

If your issue is not listed here:

1. Search [existing GitHub issues](https://github.com/stellarbuild/stellar-tx-builder/issues).
2. Ask in [GitHub Discussions](https://github.com/stellarbuild/stellar-tx-builder/discussions).
3. Include your `stellar-tx-builder` version, `@stellar/stellar-sdk` version, Node.js version, and a minimal reproduction.
