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

describe('addManageBuyOffer()', () => {
  it('chains correctly with XLM to custom asset', () => {
    const b = builder();
    expect(
      b.addManageBuyOffer({
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
      b.addManageBuyOffer({
        selling: { code: 'USDC', issuer: DEST },
        buying: 'XLM',
        amount: '50',
        price: '2.0',
      })
    ).toBe(b);
  });

  it('accepts price as fraction object', () => {
    expect(() =>
      builder().addManageBuyOffer({
        selling: 'XLM',
        buying: { code: 'USDC', issuer: DEST },
        amount: '100',
        price: { n: 1, d: 2 },
      })
    ).not.toThrow();
  });

  it('accepts optional offerId', () => {
    expect(() =>
      builder().addManageBuyOffer({
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
      builder().addManageBuyOffer({
        selling: 'XLM',
        buying: { code: 'USDC', issuer: DEST },
        amount: '0',
        price: '0.5',
      })
    ).toThrow('must be greater than 0');
  });

  it('throws on invalid price string', () => {
    expect(() =>
      builder().addManageBuyOffer({
        selling: 'XLM',
        buying: { code: 'USDC', issuer: DEST },
        amount: '100',
        price: 'not-a-number',
      })
    ).toThrow('Invalid price');
  });

  it('throws on negative price', () => {
    expect(() =>
      builder().addManageBuyOffer({
        selling: 'XLM',
        buying: { code: 'USDC', issuer: DEST },
        amount: '100',
        price: '-1.5',
      })
    ).toThrow('must be a positive number');
  });

  it('throws on invalid price fraction', () => {
    expect(() =>
      builder().addManageBuyOffer({
        selling: 'XLM',
        buying: { code: 'USDC', issuer: DEST },
        amount: '100',
        price: { n: -1, d: 2 },
      })
    ).toThrow('numerator and denominator must be positive');
  });

  it('throws on empty selling asset code', () => {
    expect(() =>
      builder().addManageBuyOffer({
        selling: { code: '', issuer: DEST },
        buying: 'XLM',
        amount: '100',
        price: '0.5',
      })
    ).toThrow('Asset code must be a non-empty string');
  });

  it('throws on empty buying asset code', () => {
    expect(() =>
      builder().addManageBuyOffer({
        selling: 'XLM',
        buying: { code: '', issuer: DEST },
        amount: '100',
        price: '0.5',
      })
    ).toThrow('Asset code must be a non-empty string');
  });
});

describe('addPathPayment()', () => {
  it('chains correctly with XLM to custom asset', () => {
    const b = builder();
    expect(
      b.addPathPayment({
        destination: DEST,
        sendAsset: 'XLM',
        sendAmount: '100',
        destAsset: { code: 'USDC', issuer: DEST },
        destAmount: '50',
      })
    ).toBe(b);
  });

  it('chains correctly with custom asset to XLM', () => {
    const b = builder();
    expect(
      b.addPathPayment({
        destination: DEST,
        sendAsset: { code: 'USDC', issuer: DEST },
        sendAmount: '50',
        destAsset: 'XLM',
        destAmount: '100',
      })
    ).toBe(b);
  });

  it('accepts optional path array', () => {
    expect(() =>
      builder().addPathPayment({
        destination: DEST,
        sendAsset: 'XLM',
        sendAmount: '100',
        destAsset: { code: 'USDC', issuer: DEST },
        destAmount: '50',
        path: [{ code: 'EUR', issuer: DEST }],
      })
    ).not.toThrow();
  });

  it('accepts empty path array', () => {
    expect(() =>
      builder().addPathPayment({
        destination: DEST,
        sendAsset: 'XLM',
        sendAmount: '100',
        destAsset: { code: 'USDC', issuer: DEST },
        destAmount: '50',
        path: [],
      })
    ).not.toThrow();
  });

  it('throws on invalid destination address', () => {
    expect(() =>
      builder().addPathPayment({
        destination: 'not-an-address',
        sendAsset: 'XLM',
        sendAmount: '100',
        destAsset: { code: 'USDC', issuer: DEST },
        destAmount: '50',
      })
    ).toThrow('Invalid Stellar address');
  });

  it('throws on invalid send amount', () => {
    expect(() =>
      builder().addPathPayment({
        destination: DEST,
        sendAsset: 'XLM',
        sendAmount: '0',
        destAsset: { code: 'USDC', issuer: DEST },
        destAmount: '50',
      })
    ).toThrow('must be greater than 0');
  });

  it('throws on invalid destination amount', () => {
    expect(() =>
      builder().addPathPayment({
        destination: DEST,
        sendAsset: 'XLM',
        sendAmount: '100',
        destAsset: { code: 'USDC', issuer: DEST },
        destAmount: '0',
      })
    ).toThrow('must be greater than 0');
  });

  it('throws on empty send asset code', () => {
    expect(() =>
      builder().addPathPayment({
        destination: DEST,
        sendAsset: { code: '', issuer: DEST },
        sendAmount: '100',
        destAsset: { code: 'USDC', issuer: DEST },
        destAmount: '50',
      })
    ).toThrow('Asset code must be a non-empty string');
  });

  it('throws on empty dest asset code', () => {
    expect(() =>
      builder().addPathPayment({
        destination: DEST,
        sendAsset: 'XLM',
        sendAmount: '100',
        destAsset: { code: '', issuer: DEST },
        destAmount: '50',
      })
    ).toThrow('Asset code must be a non-empty string');
  });

  it('throws on invalid path asset code', () => {
    expect(() =>
      builder().addPathPayment({
        destination: DEST,
        sendAsset: 'XLM',
        sendAmount: '100',
        destAsset: { code: 'USDC', issuer: DEST },
        destAmount: '50',
        path: [{ code: '', issuer: DEST }],
      })
    ).toThrow('Asset code must be a non-empty string');
  });
});

describe('addSetOptions()', () => {
  it('chains correctly with inflation destination', () => {
    const b = builder();
    expect(b.addSetOptions({ inflationDest: DEST })).toBe(b);
  });

  it('chains correctly with clear flags', () => {
    const b = builder();
    expect(b.addSetOptions({ clearFlags: 1 })).toBe(b);
  });

  it('chains correctly with set flags', () => {
    const b = builder();
    expect(b.addSetOptions({ setFlags: 1 })).toBe(b);
  });

  it('chains correctly with master weight', () => {
    const b = builder();
    expect(b.addSetOptions({ masterWeight: 100 })).toBe(b);
  });

  it('chains correctly with thresholds', () => {
    const b = builder();
    expect(b.addSetOptions({ lowThreshold: 1, medThreshold: 2, highThreshold: 3 })).toBe(b);
  });

  it('chains correctly with home domain', () => {
    const b = builder();
    expect(b.addSetOptions({ homeDomain: 'example.com' })).toBe(b);
  });

  it('chains correctly with ed25519 signer', () => {
    const b = builder();
    expect(
      b.addSetOptions({
        signer: { ed25519PublicKey: DEST, weight: 1 },
      })
    ).toBe(b);
  });

  it('chains correctly with sha256 signer', () => {
    const b = builder();
    expect(
      b.addSetOptions({
        signer: { sha256Hash: 'a'.repeat(64), weight: 1 },
      })
    ).toBe(b);
  });

  it('chains correctly with preAuthTx signer', () => {
    const b = builder();
    expect(
      b.addSetOptions({
        signer: { preAuthTx: 'b'.repeat(64), weight: 1 },
      })
    ).toBe(b);
  });

  it('throws on invalid inflation destination', () => {
    expect(() => builder().addSetOptions({ inflationDest: 'not-an-address' })).toThrow('Invalid Stellar address');
  });

  it('throws on master weight out of range', () => {
    expect(() => builder().addSetOptions({ masterWeight: 256 })).toThrow('must be between 0 and 255');
  });

  it('throws on low threshold out of range', () => {
    expect(() => builder().addSetOptions({ lowThreshold: -1 })).toThrow('must be between 0 and 255');
  });

  it('throws on home domain too long', () => {
    expect(() => builder().addSetOptions({ homeDomain: 'a'.repeat(33) })).toThrow('32 characters or fewer');
  });

  it('throws on signer weight out of range', () => {
    expect(() =>
      builder().addSetOptions({
        signer: { ed25519PublicKey: DEST, weight: 256 },
      })
    ).toThrow('must be between 0 and 255');
  });

  it('throws on signer without type', () => {
    expect(() =>
      builder().addSetOptions({
        signer: { weight: 1 } as any,
      })
    ).toThrow('must specify one of');
  });

  it('throws on invalid signer public key', () => {
    expect(() =>
      builder().addSetOptions({
        signer: { ed25519PublicKey: 'not-an-address', weight: 1 },
      })
    ).toThrow('Invalid Stellar address');
  });
});

describe('addManageData()', () => {
  it('chains correctly with name and value', () => {
    const b = builder();
    expect(b.addManageData({ name: 'key', value: 'value' })).toBe(b);
  });

  it('chains correctly with name only (deletes data)', () => {
    const b = builder();
    expect(b.addManageData({ name: 'key', value: '' })).toBe(b);
  });

  it('accepts name at 64-byte limit', () => {
    expect(() => builder().addManageData({ name: 'a'.repeat(64), value: 'value' })).not.toThrow();
  });

  it('accepts value at 64-byte limit', () => {
    expect(() => builder().addManageData({ name: 'key', value: 'b'.repeat(64) })).not.toThrow();
  });

  it('throws on empty name', () => {
    expect(() => builder().addManageData({ name: '', value: 'value' })).toThrow('must be a non-empty string');
  });

  it('throws on name exceeding 64 bytes', () => {
    expect(() => builder().addManageData({ name: 'a'.repeat(65), value: 'value' })).toThrow('exceeds 64-byte limit');
  });

  it('throws on value exceeding 64 bytes', () => {
    expect(() => builder().addManageData({ name: 'key', value: 'b'.repeat(65) })).toThrow('exceeds 64-byte limit');
  });

  it('throws on non-string value', () => {
    expect(() => builder().addManageData({ name: 'key', value: 123 as any })).toThrow('must be a string');
  });
});

describe('invokeContract()', () => {
  it('validates contract ID format then throws not implemented', () => {
    expect(() =>
      builder().invokeContract({
        contractId: DEST,
        functionName: 'hello',
      })
    ).toThrow('not yet fully implemented');
  });

  it('throws on empty contract ID', () => {
    expect(() =>
      builder().invokeContract({
        contractId: '',
        functionName: 'hello',
      })
    ).toThrow('must be a non-empty string');
  });

  it('throws on empty function name', () => {
    expect(() =>
      builder().invokeContract({
        contractId: DEST,
        functionName: '',
      })
    ).toThrow('must be a non-empty string');
  });

  it('throws on invalid contract ID format', () => {
    expect(() =>
      builder().invokeContract({
        contractId: 'not-an-address',
        functionName: 'hello',
      })
    ).toThrow('Invalid contract ID format');
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
