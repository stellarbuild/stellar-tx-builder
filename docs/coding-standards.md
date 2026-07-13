# Coding Standards

This document defines the code style, conventions, and quality standards for
`stellar-tx-builder`. All contributors are expected to follow these guidelines.
The linter and formatter enforce the majority of these rules automatically.

---

## Enforced Automatically

### ESLint

Run: `npm run lint` | Auto-fix: `npm run lint:fix`

Configuration: [`.eslintrc.json`](../.eslintrc.json)

Key rules:
- `@typescript-eslint/no-explicit-any` — **warn** (justify with a comment if unavoidable)
- `@typescript-eslint/no-unused-vars` — **error** (prefix with `_` to suppress)
- `no-console` — avoid `console.*` in library code

### Prettier

Run: `npm run format` | Check: `npm run format:check`

Configuration: [`.prettierrc`](../.prettierrc)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf"
}
```

### TypeScript Strict Mode

All compiler strictness flags are enabled (`"strict": true` in `tsconfig.json`):
- `strictNullChecks`
- `strictFunctionTypes`
- `strictPropertyInitialization`
- `noImplicitAny`
- `noImplicitReturns`

---

## TypeScript Conventions

### Prefer `interface` over `type` for object shapes

```typescript
// ✅ Preferred
interface PaymentParams {
  destination: string;
  amount: string;
}

// ❌ Avoid for simple object shapes
type PaymentParams = {
  destination: string;
  amount: string;
};
```

`type` is appropriate for union types, mapped types, and type aliases:

```typescript
// ✅ Correct use of type for unions
type NetworkName = 'mainnet' | 'testnet' | 'futurenet';
```

### Use explicit return types on public methods

Public class methods must declare their return type explicitly:

```typescript
// ✅
addPayment(params: PaymentParams): this { ... }
async build(): Promise<BuiltTransaction> { ... }

// ❌
addPayment(params: PaymentParams) { ... }
```

### Never use `any` without justification

If `any` is truly required, add a comment explaining why:

```typescript
// ✅ Justified
const operationParams: Record<string, unknown> = {};
// Using Record<string,unknown> because the SDK's SetOptions accepts a dynamic shape

// ❌ Unexplained
const params: any = {};
```

### Prefer `unknown` over `any` when the type is genuinely unknown

```typescript
// ✅
function handleError(err: unknown): void {
  if (err instanceof Error) console.error(err.message);
}

// ❌
function handleError(err: any): void {
  console.error(err.message);
}
```

### Use `import type` for type-only imports

```typescript
// ✅ Tree-shakeable and explicit
import type { TxBuilderOptions, PaymentParams } from './types';

// ❌ Unnecessary value import
import { TxBuilderOptions, PaymentParams } from './types';
```

---

## Class & Method Conventions

### Static factory over public constructor

The `TxBuilder` constructor is `private`. All creation goes through
`TxBuilder.for()`. This enforces consistent initialisation and allows future
changes to instantiation without breaking consumer code.

```typescript
// ✅
const builder = TxBuilder.for(keypair, options);

// ❌ (not possible — constructor is private)
const builder = new TxBuilder(keypair, options);
```

### Method chaining — always return `this`

All operation accumulation methods must return `this`:

```typescript
addPayment(params: PaymentParams): this {
  // ... validation and operation push ...
  return this; // ← required
}
```

### JSDoc on all public methods

Every public method must have a JSDoc block with `@param`, `@returns`, and
`@throws` where applicable:

```typescript
/**
 * Adds a payment operation to the transaction.
 * @param params - Payment configuration including destination, amount, and asset.
 * @returns This builder instance for chaining.
 * @throws {Error} If the destination is not a valid Stellar public key.
 * @throws {Error} If the amount is not a positive number string.
 */
addPayment(params: PaymentParams): this {
  ...
}
```

---

## Naming Conventions

| Construct | Convention | Example |
|---|---|---|
| Classes | `PascalCase` | `TxBuilder`, `BuiltTransactionImpl` |
| Interfaces | `PascalCase` with descriptive noun | `PaymentParams`, `SubmitResult` |
| Methods | `camelCase`, verb-first | `addPayment`, `setMemo`, `build` |
| Private fields | `camelCase` | `this.operations`, `this.keypair` |
| Constants | `UPPER_SNAKE_CASE` | `HORIZON_URLS`, `NETWORK_PASSPHRASES` |
| Helper functions | `camelCase`, verb-first | `resolveAsset`, `validateAddress` |
| Type parameters | Single capital letter or descriptive | `T`, `TResult` |
| Test fixtures | `UPPER_SNAKE_CASE` | `MOCK_SOURCE`, `DEST` |

---

## Validation Conventions

All validation in `add*()` methods follows this pattern:

1. **Validate presence and type first**:
   ```typescript
   if (!params.destination || typeof params.destination !== 'string') {
     throw new Error('destination must be a non-empty string');
   }
   ```

2. **Validate domain rules second** (address format, numeric range, byte length):
   ```typescript
   validateAddress(params.destination, 'destination');
   validateAmount(params.amount, 'payment');
   ```

3. **Resolve SDK types last**:
   ```typescript
   const asset = resolveAsset(params.asset);
   ```

4. **Push the operation**:
   ```typescript
   this.operations.push(Operation.payment({ ... }));
   ```

### Error message format

Error messages must be:
- Complete sentences ending without a period (to allow appending context)
- Consistent with existing messages (search before writing a new one)
- Informative: include the invalid value and what was expected

```typescript
// ✅ Descriptive
throw new Error(`Invalid Stellar address for ${label}: "${address}". Expected a valid public key starting with 'G'.`);

// ❌ Vague
throw new Error('Bad address');
```

---

## File Organisation

### Source files must have section comments

Use section divider comments to delineate logical blocks in longer files:

```typescript
// ── helpers ────────────────────────────────────────────────────────────────

function resolveAsset(...) { ... }

// ── BuiltTransaction impl ──────────────────────────────────────────────────

class BuiltTransactionImpl implements BuiltTransaction { ... }

// ── TxBuilder ──────────────────────────────────────────────────────────────

export class TxBuilder { ... }
```

### Import order

1. External packages (SDK)
2. Internal type imports (`import type ...`)
3. Internal value imports

```typescript
// 1. External
import { Keypair, Operation, Asset } from '@stellar/stellar-sdk';

// 2. Internal types
import type { PaymentParams, TxBuilderOptions } from './types';
```

---

## Testing Standards

- Test files live in `tests/` and follow `<SourceFile>.test.ts` naming.
- Each `describe` block covers one public method.
- Each `it` label is a complete sentence describing the behaviour.
- No `console.log` in tests.
- No real network calls in unit tests — mock Horizon.
- Tests must not depend on each other (no shared state between `it` blocks).

See [docs/testing.md](testing.md) for the full testing guide.
