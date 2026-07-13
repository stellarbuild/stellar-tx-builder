# Local Development Guide

This guide covers everything you need to set up your development environment,
understand the project workflow, and contribute code effectively.

---

## Prerequisites

| Tool | Minimum | Notes |
|---|---|---|
| Node.js | 18.x | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| npm | 9.x | Ships with Node.js |
| Git | 2.x | — |

---

## Initial Setup

```bash
# 1. Fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/stellar-tx-builder.git
cd stellar-tx-builder

# 2. Add the upstream remote to stay in sync
git remote add upstream https://github.com/stellarbuild/stellar-tx-builder.git

# 3. Install all dependencies
npm install

# 4. Verify the setup is working
npm run build
npm run test
```

You should see the build succeed and all tests pass.

---

## Project Scripts

| Script | Command | Description |
|---|---|---|
| Build | `npm run build` | Compile both CJS and ESM outputs |
| Build CJS | `npm run build:cjs` | Compile CommonJS only (faster) |
| Build ESM | `npm run build:esm` | Compile ESM only |
| Clean | `npm run clean` | Delete `dist/` directory |
| Test | `npm test` | Run the full test suite |
| Test coverage | `npm run test:coverage` | Run tests with Istanbul coverage report |
| Test watch | `npm run test:watch` | Run tests in watch mode during development |
| Test integration | `npm run test:integration` | Run integration tests only |
| Lint | `npm run lint` | Run ESLint on `src/` |
| Lint fix | `npm run lint:fix` | Auto-fix ESLint issues |
| Format | `npm run format` | Format with Prettier |
| Format check | `npm run format:check` | Check formatting without modifying files |
| Type check | `npm run typecheck` | TypeScript type check without emitting files |

---

## Recommended Development Loop

1. **Start in watch mode** while developing:

   ```bash
   npm run test:watch
   ```

2. **Build periodically** to check for TypeScript errors:

   ```bash
   npm run build:cjs
   ```
   (CJS is faster to compile during development; run the full `npm run build` before committing.)

3. **Lint and format** before committing:

   ```bash
   npm run lint:fix
   npm run format
   ```

4. **Type-check** as a final gate:

   ```bash
   npm run typecheck
   ```

---

## Source Code Overview

```
src/
├── TxBuilder.ts     Main builder class — start reading here
├── types.ts         All TypeScript interfaces
└── index.ts         Public re-exports (barrel file)
```

All logic lives in `TxBuilder.ts`. It is structured in four clear sections
separated by comments:

1. **Constants** — Horizon URLs and network passphrases
2. **Helper functions** — `resolveAsset`, `validateAddress`, `parseRelativeTime`, etc.
3. **`BuiltTransactionImpl`** — internal class wrapping the signed transaction
4. **`TxBuilder`** — the main exported class

See [docs/architecture.md](architecture.md) for a full breakdown.

---

## Adding a New Operation

Follow this checklist when adding support for a new Stellar operation:

1. **Add the params interface** to `src/types.ts`:

   ```typescript
   export interface ClaimClaimableBalanceParams {
     balanceId: string; // Claimable balance ID
   }
   ```

2. **Export the type** from `src/index.ts`:

   ```typescript
   export type { ClaimClaimableBalanceParams } from './types';
   ```

3. **Add the method** to `TxBuilder` in `src/TxBuilder.ts`:

   ```typescript
   addClaimClaimableBalance(params: ClaimClaimableBalanceParams): this {
     if (!params.balanceId || typeof params.balanceId !== 'string') {
       throw new Error('balanceId must be a non-empty string');
     }
     this.operations.push(
       Operation.claimClaimableBalance({ balanceId: params.balanceId })
     );
     return this;
   }
   ```

4. **Write tests** in `tests/TxBuilder.test.ts`:

   ```typescript
   describe('addClaimClaimableBalance()', () => {
     it('chains correctly with a valid balance ID', () => {
       const b = builder();
       expect(b.addClaimClaimableBalance({ balanceId: '000...' })).toBe(b);
     });
     it('throws on empty balance ID', () => {
       expect(() => builder().addClaimClaimableBalance({ balanceId: '' }))
         .toThrow('must be a non-empty string');
     });
   });
   ```

5. **Update docs** in `docs/api.md` and `README.md`.

6. **Update CHANGELOG** under `[Unreleased]`.

---

## Environment Variables

No environment variables are required for local development or testing.
The test suite mocks all Horizon network calls.

For optional integration testing against a real Horizon instance, you can set:

```bash
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK=testnet
STELLAR_SECRET_KEY=S...   # Testnet keypair — never use a mainnet key
```

These are not used by the library itself — only by any custom integration
tests you write.

---

## Syncing with Upstream

Before starting new work, sync your fork:

```bash
git checkout develop
git fetch upstream
git merge upstream/develop
```

---

## IDE Setup

### VS Code (Recommended)

Install these extensions for the best experience:

- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)
- **Error Lens** (`usernamehw.errorlens`) — surface errors inline

Add this to your workspace `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### JetBrains IDEs (WebStorm / IntelliJ)

- Enable ESLint: *Settings → Languages → JavaScript → Code Quality → ESLint → Automatic*
- Enable Prettier: *Settings → Languages → JavaScript → Prettier → On save*

---

## Troubleshooting Setup Issues

### `npm install` fails

Ensure your Node.js version is 18 or higher:

```bash
node --version
```

### TypeScript errors after fresh clone

Run `npm run build` to generate type declarations before opening the project
in your IDE.

### Tests fail with module not found

Run `npm install` to ensure all dependencies including `ts-jest` are installed.
