# Transaction Builder — Deep Dive

This guide explains in detail how `TxBuilder` works internally, the lifecycle
of a transaction, and how to use advanced features.

---

## The Builder Pattern

`TxBuilder` implements the **Builder pattern** — a creational design pattern
that separates the construction of a complex object from its representation.

In this context:
- **Builder** = `TxBuilder` — accumulates configuration through chainable methods
- **Product** = `BuiltTransaction` — the fully assembled, ready-to-sign transaction

The builder is **stateful**: each method call mutates the builder's internal
state and returns `this`, enabling fluent chaining. The builder is **not
reusable** — once `build()` is called, create a new builder for the next
transaction.

---

## Transaction Lifecycle

```
                ┌──────────────────────────────────┐
                │  1. CONSTRUCT                    │
                │  TxBuilder.for(keypair, options) │
                └──────────────┬───────────────────┘
                               │
                               ▼
                ┌──────────────────────────────────┐
                │  2. ACCUMULATE                   │
                │  .addPayment()                   │
                │  .addChangeTrust()               │
                │  .addManageOffer()               │
                │  .setMemo()                      │
                │  .setTimebounds()                │
                └──────────────┬───────────────────┘
                               │
                               ▼ async
                ┌──────────────────────────────────┐
                │  3. BUILD                        │
                │  .build()                        │
                │  → loads account from Horizon    │
                │  → assembles Transaction         │
                │  → returns BuiltTransaction      │
                └──────────────┬───────────────────┘
                               │
                               ▼
                ┌──────────────────────────────────┐
                │  4. SIGN                         │
                │  .sign(keypair)                  │
                │  → signs with one or more keys   │
                │  → returns this (chainable)      │
                └──────────────┬───────────────────┘
                               │
                               ▼ async
                ┌──────────────────────────────────┐
                │  5. SUBMIT                       │
                │  .submit()                       │
                │  → broadcasts to Horizon         │
                │  → returns SubmitResult          │
                └──────────────────────────────────┘
```

---

## Step 1: Construction

```typescript
const builder = TxBuilder.for(keypair, {
  network: 'testnet',
  fee: '500',          // 500 stroops base fee (optional, default: '100')
});
```

The constructor is private. `TxBuilder.for()` is the sole entry point. This
enforces that all builders are properly initialised with a keypair and options.

### Choosing a fee

The `fee` parameter specifies the **base fee per operation** in stroops.
For transactions with multiple operations, the total fee is `fee × operations`.

Recommended values:
- **100** stroops — minimum, sufficient for low-load periods
- **500** stroops — safe for most conditions
- **1000+** stroops — use during network congestion

Use the [Horizon fee stats endpoint](https://developers.stellar.org/api/horizon/resources/fee-stats) to query current network fees dynamically.

---

## Step 2: Accumulating Operations

Operations are accumulated in an internal queue. They will be applied to the
transaction in the order they were added.

```typescript
builder
  .addChangeTrust({ asset: { code: 'USDC', issuer: 'GA5ZSEJ...' } })
  .addPayment({ destination: 'G...', amount: '100', asset: 'XLM' })
  .addManageData({ name: 'version', value: '1' });
```

Stellar supports up to **100 operations per transaction**. Each operation is
validated immediately when its method is called.

### Memo

Only one memo is allowed per transaction. `setMemo()` sets a text memo:

```typescript
builder.setMemo('Payment for order #1234');
```

The memo is limited to **28 UTF-8 bytes** by the Stellar protocol.

If you pass `memo` inside `addPayment()`, it sets the same memo. A subsequent
call to `setMemo()` will override it. Prefer `setMemo()` for clarity.

### Timebounds

Timebounds define when a transaction is valid:

```typescript
builder.setTimebounds({
  minTime: 0,            // valid immediately
  maxTime: '+5m',        // expires in 5 minutes
});
```

**Setting a `maxTime` is strongly recommended for production transactions.**
Without it, a signed transaction can be submitted indefinitely, even if
network conditions change or the operation becomes undesirable.

Without `setTimebounds()`, the transaction uses `TimeoutInfinite` — it never
expires.

---

## Step 3: Building

```typescript
const builtTx = await builder.build();
```

`build()` is **async** because it must load the account's current sequence
number from Horizon to construct a valid transaction. Stellar requires that
the sequence number of a transaction is exactly one greater than the current
account sequence number.

If the account does not exist on the network, `loadAccount()` throws a 404
error from the Stellar SDK.

---

## Step 4: Signing

```typescript
builtTx.sign(keypair);
```

Signing is **synchronous** and **mutates** the `BuiltTransaction`. The `xdr`
property is updated after each `sign()` call.

### Single signer

```typescript
builtTx.sign(sourceKeypair);
```

### Multiple signers (multisig)

For accounts with multisig enabled, chain multiple `.sign()` calls:

```typescript
builtTx
  .sign(signer1Keypair)
  .sign(signer2Keypair);
```

### Signing externally

To sign outside the library (e.g., with a hardware wallet or Freighter):

```typescript
const xdr = builtTx.toXDR();
// Pass xdr to the external signer, receive signedXdr back
// Then reconstruct from signedXdr and submit via Horizon SDK directly
```

---

## Step 5: Submitting

```typescript
const result = await builtTx.submit();
console.log(result.hash);    // Transaction hash
console.log(result.ledger);  // Ledger number
console.log(result.successful); // true/false
```

`submit()` calls `Horizon.Server.submitTransaction()` from the SDK. If the
transaction is rejected by Horizon, the SDK throws a `BadResponseError` with
details including the Horizon error response body.

### Handling submission errors

```typescript
try {
  const result = await builtTx.submit();
} catch (err) {
  if (err instanceof Error && 'response' in err) {
    // Horizon error — inspect err.response.data.extras
    const extras = (err as any).response?.data?.extras;
    console.error('Horizon result codes:', extras?.result_codes);
  } else {
    throw err;
  }
}
```

Common Horizon error codes and their meanings are documented in
[docs/troubleshooting.md](troubleshooting.md).

---

## Advanced: XDR Export & Import

### Export signed XDR

```typescript
const built = await builder.build();
built.sign(keypair);
const xdr = built.toXDR();
```

The XDR string can be:
- Submitted via Stellar Laboratory for debugging
- Stored for deferred submission
- Passed to a co-signer in a multisig flow

### Re-importing XDR

To reconstruct a `Transaction` from XDR using the SDK directly:

```typescript
import { Transaction, Networks } from '@stellar/stellar-sdk';

const tx = new Transaction(xdr, Networks.TESTNET);
// Sign and submit using the Stellar SDK
```

`stellar-tx-builder` does not yet provide a `fromXDR()` factory. This is
planned for v0.7.0. See [ROADMAP.md](../ROADMAP.md).

---

## Operation Order Matters

Stellar transactions apply operations **sequentially**. For example, to
establish a trustline and immediately receive an asset in the same transaction,
add `changeTrust` before `payment`:

```typescript
builder
  .addChangeTrust({ asset: { code: 'USDC', issuer: 'G...' } })
  .addPayment({ destination: 'G_SELF...', amount: '100', asset: { code: 'USDC', issuer: 'G...' } });
```

Reversing the order would fail because the payment operation would execute
before the trustline exists.
