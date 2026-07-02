import { Keypair } from '@stellar/stellar-sdk';
import { TxBuilder } from '../src/TxBuilder';

// ── fixtures ──────────────────────────────────────────────────────────────
const SOURCE = Keypair.random();
const DEST   = Keypair.random().publicKey();

// Mock Horizon — no network calls in unit tests
jest.mock('@stellar/stellar-sdk', () => {
  const actual = jest.requireActual('@stellar/stellar-sdk');
  // We need SOURCE's public key at mock-setup time, so generate one here
  // and re-use it as the mocked account id.
  const sourceKp = actual.Keypair.random();

  const mockAccount = new actual.Account(sourceKp.publicKey(), '100');

  return {
    ...actual,
    _mockSourceKp: sourceKp,   // exposed so tests can reference it
    Horizon: {
      ...actual.Horizon,
      Server: jest.fn().mockImplementation(() => ({
        loadAccount:       jest.fn().mockResolvedValue(mockAccount),
        submitTransaction: jest.fn().mockResolvedValue({
          hash:       'abc123',
          ledger:     1000,
          successful: true,
          result_xdr: 'AAAA',
        }),
      })),
    },
  };
});

// Pull the mock keypair so we can build valid TxBuilders against it
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { _mockSourceKp: MOCK_SOURCE } = require('@stellar/stellar-sdk') as {
  _mockSourceKp: Keypair;
};

function builder() {
  return TxBuilder.for(MOCK_SOURCE, { network: 'testnet' });
}

// ── tests ─────────────────────────────────────────────────────────────────

describe('TxBuilder.for()', () => {
  it('returns a TxBuilder instance', () => {
    expect(builder()).toBeDefined();
  });
});

describe('addPayment()', () => {
  it('accepts a valid XLM payment and returns this for chaining', () => {
    const b = builder();
    expect(b.addPayment({ destination: DEST, amount: '10', asset: 'XLM' })).toBe(b);
  });

  it('accepts a custom asset payment', () => {
    expect(() =>
      builder().addPayment({ destination: DEST, amount: '50', asset: { code: 'USDC', issuer: DEST } })
    ).not.toThrow();
  });

  it('throws on invalid destination address', () => {
    expect(() =>
      builder().addPayment({ destination: 'not-an-address', amount: '10', asset: 'XLM' })
    ).toThrow('Invalid Stellar address');
  });

  it('throws on empty destination address', () => {
    expect(() =>
      builder().addPayment({ destination: '', amount: '10', asset: 'XLM' })
    ).toThrow('must be a non-empty string');
  });

  it('throws on zero amount', () => {
    expect(() =>
      builder().addPayment({ destination: DEST, amount: '0', asset: 'XLM' })
    ).toThrow('must be greater than 0');
  });

  it('throws on negative amount', () => {
    expect(() =>
      builder().addPayment({ destination: DEST, amount: '-5', asset: 'XLM' })
    ).toThrow('must be greater than 0');
  });

  it('throws on empty amount', () => {
    expect(() =>
      builder().addPayment({ destination: DEST, amount: '', asset: 'XLM' })
    ).toThrow('must be a non-empty string');
  });

  it('throws on invalid amount string', () => {
    expect(() =>
      builder().addPayment({ destination: DEST, amount: 'not-a-number', asset: 'XLM' })
    ).toThrow('is not a valid number');
  });

  it('throws on custom asset with empty code', () => {
    expect(() =>
      builder().addPayment({ destination: DEST, amount: '10', asset: { code: '', issuer: DEST } })
    ).toThrow('Asset code must be a non-empty string');
  });

  it('throws on custom asset with empty issuer', () => {
    expect(() =>
      builder().addPayment({ destination: DEST, amount: '10', asset: { code: 'USDC', issuer: '' } })
    ).toThrow('Asset issuer must be a non-empty string');
  });
});

describe('addCreateAccount()', () => {
  it('chains correctly with a valid address and balance', () => {
    const b = builder();
    expect(b.addCreateAccount({ destination: DEST, startingBalance: '2' })).toBe(b);
  });

  it('throws on invalid address', () => {
    expect(() =>
      builder().addCreateAccount({ destination: 'bad', startingBalance: '2' })
    ).toThrow('Invalid Stellar address');
  });

  it('throws on zero startingBalance', () => {
    expect(() =>
      builder().addCreateAccount({ destination: DEST, startingBalance: '0' })
    ).toThrow('Invalid amount');
  });
});

describe('addChangeTrust()', () => {
  it('chains correctly', () => {
    const b = builder();
    expect(b.addChangeTrust({ asset: { code: 'USDC', issuer: DEST } })).toBe(b);
  });

  it('accepts an optional limit', () => {
    expect(() =>
      builder().addChangeTrust({ asset: { code: 'USDC', issuer: DEST }, limit: '1000' })
    ).not.toThrow();
  });
});

describe('addManageOffer()', () => {
  it('chains correctly with XLM to custom asset', () => {
    const b = builder();
    expect(
      b.addManageOffer({
        selling: 'XLM',
        buying: { code: 'USDC', issuer: DEST },
        amount: '100',
        price: '0.5',
      })
    ).toBe(b);
  });

  it('chains correctly with custom asset to XLM', () => {
    const b = builder();
    expect(
      b.addManageOffer({
        selling: { code: 'USDC', issuer: DEST },
        buying: 'XLM',
        amount: '50',
        price: '2.0',
      })
    ).toBe(b);
  });

  it('accepts price as fraction object', () => {
    expect(() =>
      builder().addManageOffer({
        selling: 'XLM',
        buying: { code: 'USDC', issuer: DEST },
        amount: '100',
        price: { n: 1, d: 2 },
      })
    ).not.toThrow();
  });

  it('accepts optional offerId', () => {
    expect(() =>
      builder().addManageOffer({
        selling: 'XLM',
        buying: { code: 'USDC', issuer: DEST },
        amount: '100',
        price: '0.5',
        offerId: '12345',
      })
    ).not.toThrow();
  });

  it('throws on invalid amount', () => {
    expect(() =>
      builder().addManageOffer({
        selling: 'XLM',
        buying: { code: 'USDC', issuer: DEST },
        amount: '0',
        price: '0.5',
      })
    ).toThrow('must be greater than 0');
  });

  it('throws on invalid price string', () => {
    expect(() =>
      builder().addManageOffer({
        selling: 'XLM',
        buying: { code: 'USDC', issuer: DEST },
        amount: '100',
        price: 'not-a-number',
      })
    ).toThrow('Invalid price');
  });

  it('throws on negative price', () => {
    expect(() =>
      builder().addManageOffer({
        selling: 'XLM',
        buying: { code: 'USDC', issuer: DEST },
        amount: '100',
        price: '-1.5',
      })
    ).toThrow('must be a positive number');
  });

  it('throws on invalid price fraction', () => {
    expect(() =>
      builder().addManageOffer({
        selling: 'XLM',
        buying: { code: 'USDC', issuer: DEST },
        amount: '100',
        price: { n: -1, d: 2 },
      })
    ).toThrow('numerator and denominator must be positive');
  });

  it('throws on empty selling asset code', () => {
    expect(() =>
      builder().addManageOffer({
        selling: { code: '', issuer: DEST },
        buying: 'XLM',
        amount: '100',
        price: '0.5',
      })
    ).toThrow('Asset code must be a non-empty string');
  });

  it('throws on empty buying asset code', () => {
    expect(() =>
      builder().addManageOffer({
        selling: 'XLM',
        buying: { code: '', issuer: DEST },
        amount: '100',
        price: '0.5',
      })
    ).toThrow('Asset code must be a non-empty string');
  });
});

describe('setMemo()', () => {
  it('chains correctly', () => {
    const b = builder();
    expect(b.setMemo('hello')).toBe(b);
  });

  it('throws when memo exceeds 28 bytes', () => {
    expect(() => builder().setMemo('a'.repeat(29))).toThrow('28-byte limit');
  });

  it('accepts exactly 28 bytes', () => {
    expect(() => builder().setMemo('a'.repeat(28))).not.toThrow();
  });

  it('throws on empty memo', () => {
    expect(() => builder().setMemo('')).toThrow('must be a non-empty string');
  });
});

describe('setTimebounds()', () => {
  it('chains correctly with a relative maxTime', () => {
    const b = builder();
    expect(b.setTimebounds({ maxTime: '+5m' })).toBe(b);
  });

  it('accepts unix timestamp numbers', () => {
    expect(() =>
      builder().setTimebounds({ maxTime: Math.floor(Date.now() / 1000) + 300 })
    ).not.toThrow();
  });

  it('accepts ISO date strings', () => {
    expect(() =>
      builder().setTimebounds({ maxTime: new Date(Date.now() + 60000).toISOString() })
    ).not.toThrow();
  });

  it('throws on unrecognised relative string', () => {
    expect(() => builder().setTimebounds({ maxTime: '+5x' })).toThrow('Invalid time value');
  });
});

describe('build()', () => {
  it('throws when no operations have been added', async () => {
    await expect(builder().build()).rejects.toThrow('no operations');
  });

  it('resolves with a BuiltTransaction containing valid XDR', async () => {
    const tx = await builder()
      .addPayment({ destination: DEST, amount: '10', asset: 'XLM' })
      .build();

    expect(typeof tx.toXDR()).toBe('string');
    expect(tx.toXDR().length).toBeGreaterThan(0);
  });

  it('supports multi-operation transactions', async () => {
    const tx = await builder()
      .addPayment({ destination: DEST, amount: '10', asset: 'XLM' })
      .addPayment({ destination: DEST, amount: '20', asset: 'XLM' })
      .build();

    expect(tx.toXDR()).toBeTruthy();
  });

  it('sets memo on the built transaction', async () => {
    const tx = await builder()
      .addPayment({ destination: DEST, amount: '10', asset: 'XLM', memo: 'grant-001' })
      .build();
    expect(tx.toXDR()).toBeTruthy();
  });
});

describe('BuiltTransaction.sign()', () => {
  it('returns BuiltTransaction for chaining', async () => {
    const tx = await builder()
      .addPayment({ destination: DEST, amount: '10', asset: 'XLM' })
      .build();

    expect(tx.sign(MOCK_SOURCE)).toBe(tx);
  });

  it('updates xdr after signing', async () => {
    const tx = await builder()
      .addPayment({ destination: DEST, amount: '10', asset: 'XLM' })
      .build();

    const before = tx.xdr;
    tx.sign(MOCK_SOURCE);
    expect(tx.xdr).not.toBe(before);
  });
});

describe('BuiltTransaction.submit()', () => {
  it('returns a SubmitResult with hash, ledger, and successful flag', async () => {
    const result = await (
      await builder()
        .addPayment({ destination: DEST, amount: '10', asset: 'XLM' })
        .build()
    )
      .sign(MOCK_SOURCE)
      .submit();

    expect(result.hash).toBe('abc123');
    expect(result.ledger).toBe(1000);
    expect(result.successful).toBe(true);
  });
});

describe('fluent chain (end-to-end)', () => {
  it('builds, signs, and submits in one chain', async () => {
    const result = await (
      await TxBuilder.for(MOCK_SOURCE, { network: 'testnet' })
        .addPayment({ destination: DEST, amount: '100', asset: 'XLM' })
        .addPayment({ destination: DEST, amount: '50', asset: { code: 'USDC', issuer: DEST } })
        .setMemo('batch payout')
        .setTimebounds({ maxTime: '+5m' })
        .build()
    )
      .sign(MOCK_SOURCE)
      .submit();

    expect(result.successful).toBe(true);
    expect(result.hash).toBeTruthy();
  });
});
