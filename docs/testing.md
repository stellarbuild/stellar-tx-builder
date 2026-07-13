# Testing Guide

This guide covers the testing strategy, test structure, how to run tests, how
to write new tests, and coverage targets.

---

## Testing Stack

| Tool | Version | Purpose |
|---|---|---|
| [Jest](https://jestjs.io/) | ^29 | Test runner and assertion library |
| [ts-jest](https://kulshekhar.github.io/ts-jest/) | ^29 | TypeScript preprocessor for Jest |
| `@types/jest` | ^29 | TypeScript declarations for Jest |

---

## Test Structure

```
tests/
└── TxBuilder.test.ts   Unit tests for TxBuilder and BuiltTransaction
```

All tests live in `tests/`. Test files follow the naming convention
`<SourceFile>.test.ts`.

---

## Running Tests

```bash
# Run the full test suite once
npm test

# Run with coverage report (generates coverage/ directory)
npm run test:coverage

# Run in watch mode — re-runs on file changes (recommended during development)
npm run test:watch

# Run only integration tests
npm run test:integration

# Run a specific test file
npx jest tests/TxBuilder.test.ts

# Run tests matching a name pattern
npx jest -t "addPayment"
```

---

## Coverage Report

After running `npm run test:coverage`, open `coverage/lcov-report/index.html`
in your browser for a detailed line-by-line coverage view.

### Coverage Targets

| Metric | Target |
|---|---|
| Statements | ≥ 85% |
| Branches | ≥ 80% |
| Functions | ≥ 85% |
| Lines | ≥ 85% |

---

## Mocking Strategy

`stellar-tx-builder` tests use **Jest module mocking** to intercept all
`@stellar/stellar-sdk` Horizon network calls. This ensures:

- Tests are **fast** (no real network requests)
- Tests are **deterministic** (no flakiness from network conditions)
- Tests can run **offline**

### Current mock setup (`TxBuilder.test.ts`)

```typescript
jest.mock('@stellar/stellar-sdk', () => {
  const actual = jest.requireActual('@stellar/stellar-sdk');
  const sourceKp = actual.Keypair.random();
  const mockAccount = new actual.Account(sourceKp.publicKey(), '100');

  return {
    ...actual,
    _mockSourceKp: sourceKp,
    Horizon: {
      ...actual.Horizon,
      Server: jest.fn().mockImplementation(() => ({
        loadAccount: jest.fn().mockResolvedValue(mockAccount),
        submitTransaction: jest.fn().mockResolvedValue({
          hash: 'abc123',
          ledger: 1000,
          successful: true,
          result_xdr: 'AAAA',
        }),
      })),
    },
  };
});
```

The mock:
- Returns a consistent `mockAccount` for `loadAccount()` calls
- Returns a successful `submitTransaction()` response
- Exposes `_mockSourceKp` so tests can build valid transactions against the mocked account

---

## Writing Tests

### Test file structure

```typescript
import { Keypair } from '@stellar/stellar-sdk';
import { TxBuilder } from '../src/TxBuilder';

// 1. Mock setup (see above)
jest.mock('@stellar/stellar-sdk', () => { ... });

const { _mockSourceKp: MOCK_SOURCE } = require('@stellar/stellar-sdk') as {
  _mockSourceKp: Keypair;
};

// 2. Test fixtures
const DEST = Keypair.random().publicKey();

// 3. Builder factory
function builder() {
  return TxBuilder.for(MOCK_SOURCE, { network: 'testnet' });
}

// 4. Test suites
describe('addMyOperation()', () => {
  it('chains correctly with valid params', () => {
    const b = builder();
    expect(b.addMyOperation({ ... })).toBe(b);
  });

  it('throws on invalid input', () => {
    expect(() => builder().addMyOperation({ invalidField: '' }))
      .toThrow('descriptive error message fragment');
  });
});
```

### What to test

For every operation method, test:

| Scenario | What to assert |
|---|---|
| Happy path with minimum valid input | `.toBe(b)` — confirms chaining |
| Happy path with all optional fields | `.not.toThrow()` |
| Invalid required field (empty string) | `.toThrow('must be a non-empty string')` |
| Invalid address | `.toThrow('Invalid Stellar address')` |
| Invalid amount (zero) | `.toThrow('must be greater than 0')` |
| Invalid amount (negative) | `.toThrow('must be greater than 0')` |
| Invalid amount (NaN string) | `.toThrow('is not a valid number')` |
| Any other domain-specific validation | `.toThrow('<relevant message fragment>')` |

For `build()` and `submit()` (async), use `await expect(...).rejects.toThrow(...)`:

```typescript
it('throws when no operations have been added', async () => {
  await expect(builder().build()).rejects.toThrow('no operations');
});

it('resolves with a BuiltTransaction containing valid XDR', async () => {
  const built = await builder()
    .addPayment({ destination: DEST, amount: '10', asset: 'XLM' })
    .build();

  expect(built.xdr).toBeTruthy();
  expect(typeof built.xdr).toBe('string');
  expect(typeof built.sign).toBe('function');
  expect(typeof built.submit).toBe('function');
  expect(typeof built.toXDR).toBe('function');
});
```

### Testing timebounds with tolerance

Network operations and timebound parsing depend on `Date.now()`. Allow a
tolerance of ±5 seconds:

```typescript
it('sets correct maxTime for +5m', async () => {
  const built = await builder()
    .addPayment({ destination: DEST, amount: '10', asset: 'XLM' })
    .setTimebounds({ maxTime: '+5m' })
    .build();

  const sdk = require('@stellar/stellar-sdk');
  const tx = new sdk.Transaction(built.xdr, sdk.Networks.TESTNET);
  const expected = Math.floor(Date.now() / 1000) + 300;
  const actual = parseInt(tx.timeBounds.maxTime.toString());

  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(5);
});
```

---

## Integration Tests

Integration tests make real Horizon network calls against the Stellar Testnet.
They are kept in files matching `*.integration.test.ts` and are excluded from
the standard `npm test` run.

To run integration tests:

```bash
npm run test:integration
```

> Integration tests require a funded testnet keypair. Set `STELLAR_SECRET_KEY`
> to a testnet secret key before running. Use the
> [Stellar Friendbot](https://friendbot.stellar.org) to fund a testnet account.

---

## Continuous Integration

The CI pipeline (`ci.yml`) runs the full test suite on Node.js 18, 20, and 22
on every push and pull request. Coverage reports are uploaded as workflow
artifacts for review.

See [docs/development.md](development.md) for the full CI workflow description.
