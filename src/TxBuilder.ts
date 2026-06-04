import {
  Keypair,
  Networks,
  TransactionBuilder as StellarTransactionBuilder,
  TimeoutInfinite,
  Operation,
  Asset,
  Memo,
  Horizon,
  Transaction,
  xdr,
} from '@stellar/stellar-sdk';
import type {
  TxBuilderOptions,
  PaymentParams,
  CreateAccountParams,
  ChangeTrustParams,
  TimeboundParams,
  BuiltTransaction,
  SubmitResult,
  NetworkPassphrase,
} from './types';

// ── helpers ────────────────────────────────────────────────────────────────

const HORIZON_URLS: Record<string, string> = {
  mainnet:   'https://horizon.stellar.org',
  testnet:   'https://horizon-testnet.stellar.org',
  futurenet: 'https://horizon-futurenet.stellar.org',
};

const NETWORK_PASSPHRASES: Record<string, NetworkPassphrase> = {
  mainnet:   Networks.PUBLIC,
  testnet:   Networks.TESTNET,
  futurenet: Networks.FUTURENET,
};

function resolveAsset(asset: PaymentParams['asset']): Asset {
  if (asset === 'XLM') return Asset.native();
  return new Asset(asset.code, asset.issuer);
}

function parseRelativeTime(value: string | number): number {
  if (typeof value === 'number') return value;

  const now = Math.floor(Date.now() / 1000);
  const match = value.match(/^\+(\d+)(s|m|h|d)$/);
  if (match) {
    const amount = parseInt(match[1], 10);
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return now + amount * multipliers[match[2]];
  }

  const parsed = Math.floor(new Date(value).getTime() / 1000);
  if (isNaN(parsed)) throw new Error(`Invalid time value: "${value}"`);
  return parsed;
}

function validateAddress(address: string, label: string): void {
  try {
    Keypair.fromPublicKey(address);
  } catch {
    throw new Error(`Invalid Stellar address for ${label}: "${address}"`);
  }
}

function validateAmount(amount: string, label: string): void {
  const n = parseFloat(amount);
  if (isNaN(n) || n <= 0) throw new Error(`Invalid amount for ${label}: "${amount}"`);
}

// ── BuiltTransaction impl ──────────────────────────────────────────────────

class BuiltTransactionImpl implements BuiltTransaction {
  private tx: Transaction;
  private server: Horizon.Server;
  xdr: string;

  constructor(tx: Transaction, server: Horizon.Server) {
    this.tx     = tx;
    this.server = server;
    this.xdr    = tx.toXDR();
  }

  sign(keypair: Keypair): BuiltTransaction {
    this.tx.sign(keypair);
    this.xdr = this.tx.toXDR();
    return this;
  }

  toXDR(): string {
    return this.tx.toXDR();
  }

  async submit(): Promise<SubmitResult> {
    const response = await this.server.submitTransaction(this.tx);
    return {
      hash:       response.hash,
      ledger:     response.ledger,
      successful: response.successful,
      resultXdr:  response.result_xdr,
    };
  }
}

// ── TxBuilder ──────────────────────────────────────────────────────────────

export class TxBuilder {
  private keypair: Keypair;
  private options: TxBuilderOptions;
  private operations: xdr.Operation[] = [];
  private memo?: Memo;
  private timebounds?: { minTime: number; maxTime: number };

  private constructor(keypair: Keypair, options: TxBuilderOptions) {
    this.keypair = keypair;
    this.options = options;
  }

  /** Entry point — create a builder for a given keypair and network. */
  static for(keypair: Keypair, options: TxBuilderOptions): TxBuilder {
    return new TxBuilder(keypair, options);
  }

  // ── operations ────────────────────────────────────────────────────────

  addPayment(params: PaymentParams): this {
    validateAddress(params.destination, 'destination');
    validateAmount(params.amount, 'payment');

    this.operations.push(
      Operation.payment({
        destination: params.destination,
        asset:       resolveAsset(params.asset),
        amount:      params.amount,
      })
    );

    if (params.memo) this.memo = Memo.text(params.memo);
    return this;
  }

  addCreateAccount(params: CreateAccountParams): this {
    validateAddress(params.destination, 'destination');
    validateAmount(params.startingBalance, 'startingBalance');

    this.operations.push(
      Operation.createAccount({
        destination:     params.destination,
        startingBalance: params.startingBalance,
      })
    );
    return this;
  }

  addChangeTrust(params: ChangeTrustParams): this {
    const asset = new Asset(params.asset.code, params.asset.issuer);
    this.operations.push(
      Operation.changeTrust({
        asset,
        ...(params.limit !== undefined ? { limit: params.limit } : {}),
      })
    );
    return this;
  }

  setMemo(text: string): this {
    if (Buffer.byteLength(text, 'utf8') > 28)
      throw new Error('Memo text must be 28 bytes or fewer');
    this.memo = Memo.text(text);
    return this;
  }

  setTimebounds(bounds: TimeboundParams): this {
    this.timebounds = {
      minTime: bounds.minTime !== undefined ? parseRelativeTime(bounds.minTime) : 0,
      maxTime: bounds.maxTime !== undefined ? parseRelativeTime(bounds.maxTime) : 0,
    };
    return this;
  }

  // ── build ─────────────────────────────────────────────────────────────

  async build(): Promise<BuiltTransaction> {
    if (this.operations.length === 0)
      throw new Error('Cannot build a transaction with no operations');

    const horizonUrl = this.options.horizonUrl ?? HORIZON_URLS[this.options.network];
    const passphrase = NETWORK_PASSPHRASES[this.options.network];
    const server     = new Horizon.Server(horizonUrl);

    const sourceAccount = await server.loadAccount(this.keypair.publicKey());

    const builder = new StellarTransactionBuilder(sourceAccount, {
      fee:               this.options.fee ?? '100',
      networkPassphrase: passphrase,
    });

    for (const op of this.operations) {
      builder.addOperation(op);
    }

    if (this.memo) builder.addMemo(this.memo);

    const timeout = this.timebounds?.maxTime ?? TimeoutInfinite;
    builder.setTimeout(timeout);

    const tx = builder.build() as Transaction;
    return new BuiltTransactionImpl(tx, server);
  }
}