# Design Decisions

This document records significant architectural and API design decisions made
in `stellar-tx-builder`, along with the context, alternatives considered, and
rationale. New decisions should be added here as Architecture Decision Records
(ADRs).

---

## ADR-001: Static Factory over Public Constructor

**Date:** 2025-01-20
**Status:** Accepted

### Context

TypeScript classes expose a `constructor` that is `public` by default. For a
builder class, allowing arbitrary direct instantiation makes it harder to
enforce invariants, change the initialisation signature without breaking code,
or introduce future factory variants.

### Decision

The `TxBuilder` constructor is `private`. The sole entry point is the static
factory method `TxBuilder.for(keypair, options)`.

### Rationale

- Enforces a consistent, validated entry point
- Allows renaming or extending factory variants in future (e.g., `TxBuilder.fromXDR()`) without breaking changes to the constructor
- Communicates intent clearly — users are meant to call `for()`, not `new TxBuilder()`

### Alternatives Considered

- **Public constructor** — rejected because it provides no enforced validation at construction time and would expose internal details
- **Factory function** (standalone, not a static method) — rejected to keep the API object-oriented and consistent with SDK conventions

---

## ADR-002: Eager Synchronous Validation

**Date:** 2025-01-20
**Status:** Accepted

### Context

Stellar transaction errors surface at two possible points:
1. When building/assembling the transaction (local)
2. When submitting to Horizon (network)

Horizon error messages (e.g., `tx_bad_auth`, `op_no_trust`) are concise and
require knowledge of Stellar internals to interpret. They also require a full
round-trip to discover.

### Decision

All input validation in `add*()` methods is **synchronous and eager** — errors
are thrown at the call site before any network interaction.

### Rationale

- Developers see errors at the exact line of code where the bad input is passed
- Errors surface in test environments without needing a network
- Error messages can be descriptive (e.g., include the invalid value and expected format) rather than terse SDK codes
- Reduces the cost of debugging production failures

### Alternatives Considered

- **Lazy validation at `build()` time** — rejected because it delays error discovery to async context, making the source harder to trace
- **No validation (trust the SDK)** — rejected because SDK errors are terse and do not include the original invalid value

---

## ADR-003: Wrapping BuiltTransaction Behind an Interface

**Date:** 2025-01-20
**Status:** Accepted

### Context

The `build()` method could return the raw `Transaction` object from
`@stellar/stellar-sdk`. This would expose the full SDK API surface directly
to consumers.

### Decision

`build()` returns a `BuiltTransaction` interface implemented by the internal
`BuiltTransactionImpl` class. The raw `Transaction` is never exposed.

### Rationale

- Limits the public API surface to operations that are safe and supported
- Allows the internal implementation to change without breaking consumer code
- Provides a clean, documented interface (`sign()`, `submit()`, `toXDR()`, `xdr`) that maps to the expected builder workflow
- Simplifies testing — `BuiltTransaction` is easy to mock

### Alternatives Considered

- **Return raw `Transaction`** — rejected because it exposes the full SDK surface, making it harder to ensure correct usage and to maintain stability

---

## ADR-004: XLM as a String Literal, Not an Enum

**Date:** 2025-01-20
**Status:** Accepted

### Context

Assets in operations can be either native (XLM) or custom. These need to be
distinguishable at runtime and in the type system.

### Decision

The native asset is represented as the string literal `'XLM'`. Custom assets
are objects `{ code: string; issuer: string }`.

```typescript
type AssetParam = 'XLM' | { code: string; issuer: string };
```

### Rationale

- `'XLM'` is instantly understandable to any Stellar developer
- Discriminating on `asset === 'XLM'` is simple, readable, and typesafe
- An enum would add indirection and require an import at call sites

### Alternatives Considered

- **Enum `Asset.XLM`** — rejected for API verbosity; `'XLM'` is more ergonomic
- **`null` for native** — rejected because it is semantically unclear

---

## ADR-005: Relative Timebound Syntax

**Date:** 2025-03-15
**Status:** Accepted

### Context

Setting a transaction expiry requires a Unix timestamp in seconds. Developers
frequently want to say "expire in 5 minutes" rather than computing
`Math.floor(Date.now() / 1000) + 300` manually.

### Decision

`setTimebounds()` accepts relative time strings in the format `+N[s|m|h|d]`
(e.g., `'+5m'`, `'+1h'`, `'+2d'`, `'+30s'`), in addition to Unix timestamps
and ISO 8601 strings.

### Rationale

- Significantly reduces boilerplate for the most common use case (short expiry windows)
- The `+` prefix makes it unambiguous that the value is relative
- The unit suffixes (`s`, `m`, `h`, `d`) match common conventions

### Alternatives Considered

- **Duration objects** `{ minutes: 5 }` — rejected for being more verbose while providing no additional benefit at this scale
- **Epoch only** — rejected because it forces consumers to compute offsets manually

---

## ADR-006: Single `TxBuilder.ts` Source File

**Date:** 2025-01-20
**Status:** Accepted (subject to review at v0.4+)

### Context

As more operations are added, the source file grows. The question of whether
to split into multiple files (one per operation group, separate files for helpers and the core class) arose during initial design.

### Decision

All implementation lives in a single `src/TxBuilder.ts` file, with
`src/types.ts` for type declarations and `src/index.ts` as a barrel file.

### Rationale

- At the current size (< 700 LOC), a single file is easy to navigate with
  section comments
- Avoids unnecessary module graph complexity for a library of this scope
- Keeps the build simple

### When to Revisit

If `TxBuilder.ts` exceeds ~1,200 LOC or Soroban support adds significant
complexity, split into:

```
src/
├── builder/
│   ├── TxBuilder.ts           Core class and build pipeline
│   ├── operations/
│   │   ├── payment.ts
│   │   ├── offers.ts
│   │   └── soroban.ts
│   └── helpers.ts             Pure validation and resolution helpers
├── types.ts
└── index.ts
```

---

## ADR-007: Dual CJS/ESM Build via Two tsconfig Files

**Date:** 2026-07-13
**Status:** Accepted

### Context

Modern JavaScript projects expect packages to support both CommonJS (`require`)
and ECMAScript Modules (`import`). Without dual output, ESM-first projects
(Vite, Next.js app router) may have issues importing, and CJS projects
(Node.js scripts, Jest) need the CJS fallback.

### Decision

Two separate TypeScript configurations produce two build outputs:
- `tsconfig.json` → `dist/cjs/` (CommonJS, `"module": "commonjs"`)
- `tsconfig.esm.json` → `dist/esm/` (ESM, `"module": "ES2020"`)

The `package.json` `exports` field maps `import` to ESM and `require` to CJS.

### Rationale

- Zero additional runtime dependencies (no `tsup`, `rollup`, or `esbuild` required)
- Full source maps and declaration maps for both outputs
- Precise control over each compilation target
- Transparent to consumers — the correct build is selected automatically

### Alternatives Considered

- **`tsup`** — would simplify the build script but adds a build-time dependency and reduces transparency
- **CJS only** — rejected because ESM-first bundlers cannot consume CJS without workarounds
- **ESM only** — rejected because Jest and Node.js scripts commonly require CJS

---

## ADR-008: No Structured Error Classes (yet)

**Date:** 2025-01-20
**Status:** Accepted (to be revisited at v0.7)

### Context

Using native `Error` objects means consumers cannot programmatically
distinguish between a validation error and a network error without parsing the
message string.

### Decision

Native `Error` objects with descriptive messages are used throughout. No
custom error subclasses are introduced at this stage.

### Rationale

- Keeps the library simple for the v0.x series
- Message strings are stable enough for matching in tests
- Adding structured errors is backwards-compatible (adding subclasses of `Error` is non-breaking)

### When to Revisit

v0.7.0 will introduce `TxBuilderValidationError` and `TxBuilderNetworkError`.
See [ROADMAP.md](../ROADMAP.md).
