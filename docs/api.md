# API Reference

Complete reference for all public classes, methods, and types exported by
`@stellarbuild/stellar-tx-builder`.

---

## Exports

```typescript
import {
  TxBuilder,

  // Types (import with `import type` where possible)
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
  NetworkPassphrase,
} from '@stellarbuild/stellar-tx-builder';
```

---

## `TxBuilder`

The primary class. Use the static `for()` factory to create an instance.

### `TxBuilder.for(keypair, options)`

**Creates a new builder for the given source account keypair and network.**

```typescript
static for(keypair: Keypair, options: TxBuilderOptions): TxBuilder
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `keypair` | `Keypair` | ✅ | Source account keypair (from `@stellar/stellar-sdk`) |
| `options` | `TxBuilderOptions` | ✅ | Network and builder configuration |

**Example:**
```typescript
import { Keypair } from '@stellar/stellar-sdk';
import { TxBuilder } from '@stellarbuild/stellar-tx-builder';

const keypair = Keypair.fromSecret('S...');
const builder = TxBuilder.for(keypair, { network: 'testnet' });
```

---

### `TxBuilderOptions`

```typescript
interface TxBuilderOptions {
  network: 'mainnet' | 'testnet' | 'futurenet';
  fee?: string;        // base fee in stroops (default: '100')
  horizonUrl?: string; // override default Horizon endpoint
  timeout?: number;    // request timeout in ms (reserved for future use)
}
```

| Field | Default | Description |
|---|---|---|
| `network` | — | Target network. Determines Horizon URL and passphrase. |
| `fee` | `'100'` | Base fee per operation in stroops (1 XLM = 10,000,000 stroops) |
| `horizonUrl` | Auto | Override the Horizon URL. Useful for private Horizon instances. |
| `timeout` | — | Reserved — not yet applied |

---

## Operation Methods

All operation methods are **synchronous** and **return `this`** for chaining.
Input validation is performed immediately — errors are thrown before any network
call.

---

### `.addPayment(params)`

Adds a payment operation to send XLM or a custom asset to a destination account.

```typescript
addPayment(params: PaymentParams): this
```

**`PaymentParams`:**

```typescript
interface PaymentParams {
  destination: string;                                    // Stellar public key (G...)
  amount: string;                                         // Amount to send (e.g. '100')
  asset: 'XLM' | { code: string; issuer: string };       // Asset to send
  memo?: string;                                          // Optional text memo (max 28 bytes)
}
```

**Throws:**
- `destination` is not a valid Stellar public key
- `amount` is not a positive number string
- Asset `code` or `issuer` is empty

**Example:**
```typescript
builder
  .addPayment({ destination: 'G...', amount: '10', asset: 'XLM' })
  .addPayment({
    destination: 'G...',
    amount: '50',
    asset: { code: 'USDC', issuer: 'GA5ZSEJ...' },
    memo: 'Invoice #42',
  });
```

---

### `.addCreateAccount(params)`

Creates a new Stellar account by funding it with an initial XLM balance.

```typescript
addCreateAccount(params: CreateAccountParams): this
```

**`CreateAccountParams`:**

```typescript
interface CreateAccountParams {
  destination: string;   // New account public key (G...)
  startingBalance: string; // Initial XLM balance (minimum: '1')
}
```

**Throws:**
- `destination` is not a valid Stellar public key
- `startingBalance` is not a positive number string

---

### `.addChangeTrust(params)`

Adds or modifies a trustline for a custom asset on the source account.
Pass `limit: '0'` to remove the trustline.

```typescript
addChangeTrust(params: ChangeTrustParams): this
```

**`ChangeTrustParams`:**

```typescript
interface ChangeTrustParams {
  asset: { code: string; issuer: string }; // Asset to trust
  limit?: string; // Trust limit. Omit for max; '0' to remove
}
```

---

### `.addManageOffer(params)`

Places or updates a sell offer on the Stellar DEX.

```typescript
addManageOffer(params: ManageOfferParams): this
```

**`ManageOfferParams`:**

```typescript
interface ManageOfferParams {
  selling: { code: string; issuer: string } | 'XLM';
  buying:  { code: string; issuer: string } | 'XLM';
  amount:  string;                              // Amount of 'selling' asset to sell
  price:   string | { n: number; d: number };  // Price in terms of buying/selling
  offerId?: string; // '0' creates a new offer (default); existing ID modifies it
}
```

**Throws:**
- `amount` is not a positive number string
- `price` is not a valid positive decimal or `{ n, d }` fraction
- Asset code or issuer is empty

---

### `.addManageBuyOffer(params)`

Places or updates a buy offer on the Stellar DEX.

```typescript
addManageBuyOffer(params: ManageBuyOfferParams): this
```

**`ManageBuyOfferParams`:**

```typescript
interface ManageBuyOfferParams {
  selling: { code: string; issuer: string } | 'XLM';
  buying:  { code: string; issuer: string } | 'XLM';
  amount:  string;                              // Amount of 'buying' asset to buy
  price:   string | { n: number; d: number };  // Price in terms of selling/buying
  offerId?: string;
}
```

---

### `.addPathPayment(params)`

Adds a path payment strict-send operation — sends an exact amount of one asset
and receives at least a minimum amount of another, traversing the DEX order
books along an asset path.

```typescript
addPathPayment(params: PathPaymentParams): this
```

**`PathPaymentParams`:**

```typescript
interface PathPaymentParams {
  destination: string;
  sendAsset:   { code: string; issuer: string } | 'XLM';
  sendAmount:  string;  // Exact amount to send
  destAsset:   { code: string; issuer: string } | 'XLM';
  destAmount:  string;  // Minimum amount to receive (slippage floor)
  path?: ({ code: string; issuer: string } | 'XLM')[]; // Intermediate assets
}
```

---

### `.addSetOptions(params)`

Sets account options such as signers, thresholds, flags, and home domain.
All fields are optional — only supplied fields are modified.

```typescript
addSetOptions(params: SetOptionsParams): this
```

**`SetOptionsParams`:**

```typescript
interface SetOptionsParams {
  inflationDest?: string;   // Stellar public key
  clearFlags?: number;      // Bitmask of flags to clear
  setFlags?: number;        // Bitmask of flags to set
  masterWeight?: number;    // 0–255
  lowThreshold?: number;    // 0–255
  medThreshold?: number;    // 0–255
  highThreshold?: number;   // 0–255
  homeDomain?: string;      // Max 32 characters
  signer?: {
    ed25519PublicKey?: string; // Stellar public key signer
    sha256Hash?: string;       // 64-hex-char SHA256 hash
    preAuthTx?: string;        // 64-hex-char pre-auth transaction hash
    weight: number;            // 0–255 (0 removes the signer)
  };
}
```

**Throws:**
- `inflationDest` is not a valid Stellar address
- Any threshold or weight is outside the 0–255 range
- `homeDomain` exceeds 32 characters
- `signer` is specified without a type (`ed25519PublicKey`, `sha256Hash`, or `preAuthTx`)
- `sha256Hash` or `preAuthTx` is not exactly 64 hex characters

---

### `.addManageData(params)`

Stores or removes a key-value data entry on the source account.

```typescript
addManageData(params: ManageDataParams): this
```

**`ManageDataParams`:**

```typescript
interface ManageDataParams {
  name: string;  // UTF-8 key, max 64 bytes
  value: string; // UTF-8 value, max 64 bytes. Empty string removes the entry.
}
```

**Throws:**
- `name` is empty or exceeds 64 bytes
- `value` exceeds 64 bytes
- `value` is not a string

---

### `.invokeContract(params)` *(Validation stub — v0.4 planned)*

Validates Soroban contract invocation parameters but **throws a not-implemented
error** at runtime. Full implementation is planned for v0.4.0.

```typescript
invokeContract(params: InvokeContractParams): this
```

**`InvokeContractParams`:**

```typescript
interface InvokeContractParams {
  contractId: string;   // Stellar contract address (C... or G...)
  functionName: string; // Exported contract function name
  args?: (
    | string
    | number
    | boolean
    | { address: string }
    | { amount: string; asset: { code: string; issuer: string } | 'XLM' }
  )[];
}
```

---

### `.wrapInFeeBump(feeSource, fee?)` *(Validation stub — v0.6 planned)*

Validates fee bump parameters but currently throws during `build()`. Full
implementation is planned for v0.6.0.

```typescript
wrapInFeeBump(feeSource: string, fee?: string): this
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `feeSource` | `string` | ✅ | Public key of the fee-paying account |
| `fee` | `string` | ❌ | Fee to pay in stroops (default: base fee) |

---

## Transaction Metadata Methods

### `.setMemo(text)`

Sets a text memo on the transaction.

```typescript
setMemo(text: string): this
```

| Parameter | Constraint |
|---|---|
| `text` | Non-empty string, maximum **28 UTF-8 bytes** |

**Note:** If `addPayment()` is called with a `memo` field, `setMemo()` called
afterwards will override it.

---

### `.setTimebounds(bounds)`

Sets the validity window for the transaction.

```typescript
setTimebounds(bounds: TimeboundParams): this
```

**`TimeboundParams`:**

```typescript
interface TimeboundParams {
  minTime?: string | number; // Earliest valid time
  maxTime?: string | number; // Latest valid time (expiry)
}
```

Accepted value formats:
| Format | Example | Notes |
|---|---|---|
| Relative string | `'+5m'`, `'+1h'`, `'+2d'`, `'+30s'` | Relative to current time |
| Unix timestamp | `1800000000` | Seconds since epoch |
| ISO 8601 string | `'2025-12-31T23:59:59Z'` | Parsed via `new Date()` |
| `0` | `0` | No bound (only valid for `minTime`) |

If `setTimebounds()` is not called, the transaction uses `TimeoutInfinite`
(no expiry).

---

## Build & Submit

### `.build()`

Loads the source account from Horizon and assembles the transaction.

```typescript
async build(): Promise<BuiltTransaction>
```

**Throws:**
- If no operations have been added: `'Cannot build a transaction with no operations'`
- If Horizon is unreachable: network error from SDK
- If `wrapInFeeBump()` was called: not-yet-implemented error (v0.6)

---

## `BuiltTransaction`

The object returned by `build()`.

```typescript
interface BuiltTransaction {
  xdr: string;                                   // Current XDR (updated after sign())
  sign(keypair: Keypair): BuiltTransaction;       // Sign and return this for chaining
  toXDR(): string;                               // Return current XDR string
  submit(): Promise<SubmitResult>;               // Submit to Horizon
}
```

---

## `SubmitResult`

Returned by `submit()`.

```typescript
interface SubmitResult {
  hash:       string;  // Transaction hash
  ledger:     number;  // Ledger number in which the transaction was included
  successful: boolean; // Whether the transaction was applied successfully
  resultXdr:  string;  // Base64-encoded XDR result envelope
}
```
