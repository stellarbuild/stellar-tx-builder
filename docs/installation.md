# Installation Guide

This guide covers all installation options, package manager commands, module
system configuration, and compatibility requirements.

---

## Requirements

| Requirement | Minimum Version |
|---|---|
| Node.js | **18.0.0** |
| `@stellar/stellar-sdk` | **12.0.0** |
| TypeScript | **5.0** (for type-only imports) |

---

## Package Manager Installation

### npm

```bash
npm install @stellarbuild/stellar-tx-builder @stellar/stellar-sdk
```

### yarn

```bash
yarn add @stellarbuild/stellar-tx-builder @stellar/stellar-sdk
```

### pnpm

```bash
pnpm add @stellarbuild/stellar-tx-builder @stellar/stellar-sdk
```

> `@stellar/stellar-sdk` is a **peer dependency** — it must be installed
> alongside this library. The library is compatible with SDK versions 12 and
> higher.

---

## Module System Configuration

The package ships with both CommonJS (CJS) and ECMAScript Module (ESM) builds:

| Format | Path | Use case |
|---|---|---|
| CommonJS | `dist/cjs/index.js` | Node.js with `require()`, Jest |
| ESM | `dist/esm/index.js` | Vite, Next.js, Rollup, modern Node.js |
| Types (CJS) | `dist/cjs/index.d.ts` | TypeScript with CJS |
| Types (ESM) | `dist/esm/index.d.ts` | TypeScript with ESM |

The correct build is automatically selected by your toolchain via the
`exports` field in `package.json`. You do not need to configure paths manually.

---

## Usage in CommonJS (Node.js)

```javascript
const { TxBuilder } = require('@stellarbuild/stellar-tx-builder');
const { Keypair } = require('@stellar/stellar-sdk');
```

---

## Usage in ESM

```typescript
import { TxBuilder } from '@stellarbuild/stellar-tx-builder';
import { Keypair } from '@stellar/stellar-sdk';
```

---

## TypeScript Configuration

### For CJS projects (`module: "commonjs"`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### For ESM projects (`module: "ES2020"` or `"ESNext"`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

### For Next.js projects

Next.js handles module resolution automatically. No special configuration is
needed beyond a standard `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "module": "esnext",
    "moduleResolution": "bundler"
  }
}
```

---

## Version Compatibility Matrix

| stellar-tx-builder | @stellar/stellar-sdk | Node.js |
|---|---|---|
| `0.3.x` | `^15.x` | 18, 20, 22 |
| `0.2.x` | `^13.x` — `^14.x` | 18, 20 |
| `0.1.x` | `^12.x` | 18 |

---

## Verifying Your Installation

After installing, verify the package is correctly importable:

```typescript
import { TxBuilder } from '@stellarbuild/stellar-tx-builder';
import { Keypair } from '@stellar/stellar-sdk';

const keypair = Keypair.random();
const builder = TxBuilder.for(keypair, { network: 'testnet' });
console.log('stellar-tx-builder loaded successfully');
```

---

## Browser Bundler Notes

### Vite

No additional configuration needed. Vite resolves the ESM build automatically.

### webpack 5

If you encounter issues with Node.js built-ins (e.g., `buffer`, `crypto`),
add the following to `webpack.config.js`:

```javascript
module.exports = {
  resolve: {
    fallback: {
      buffer: require.resolve('buffer/'),
      crypto: require.resolve('crypto-browserify'),
    },
  },
};
```

This is a requirement of the Stellar SDK, not this library directly.

### Next.js

Add this to `next.config.js` if you encounter module resolution issues:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

module.exports = nextConfig;
```

---

## Upgrading

Check the [CHANGELOG](../CHANGELOG.md) before upgrading for breaking changes.

```bash
npm install @stellarbuild/stellar-tx-builder@latest
```

To check for outdated packages:

```bash
npm outdated
```
