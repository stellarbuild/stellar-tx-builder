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

/**
 * Horizon API endpoints for each Stellar network
 */
const HORIZON_URLS: Record<string, string> = {
  mainnet:   'https://horizon.stellar.org',
  testnet:   'https://horizon-testnet.stellar.org',
  futurenet: 'https://horizon-futurenet.stellar.org',
};

/**
 * Network passphrases for each Stellar network
 */
const NETWORK_PASSPHRASES: Record<string, NetworkPassphrase> = {
  mainnet:   Networks.PUBLIC,
  testnet:   Networks.TESTNET,
  futurenet: Networks.FUTURENET,
};

/**
 * Resolves a payment asset to a Stellar Asset object
 * @param asset - Either 'XLM' for native asset or a custom asset with code and issuer
 * @returns Stellar Asset instance
 * @throws Error if custom asset code or issuer is invalid
 */
function resolveAsset(asset: PaymentParams['asset']): Asset {
  if (asset === 'XLM') return Asset.native();
  
  if (!asset.code || typeof asset.code !== 'string') {
    throw new Error('Asset code must be a non-empty string');
  }
  if (!asset.issuer || typeof asset.issuer !== 'string') {
    throw new Error('Asset issuer must be a non-empty string');
  }
  
  try {
    return new Asset(asset.code, asset.issuer);
  } catch (error) {
    throw new Error(`Invalid asset: code="${asset.code}", issuer="${asset.issuer}"`);
  }
}

/**
 * Parses a timebound value into a Unix timestamp
 * @param value - Unix timestamp number, ISO date string, or relative time string (e.g., '+5m', '+1h')
 * @returns Unix timestamp in seconds
 * @throws Error if the time value cannot be parsed
 */
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

/**
 * Validates a Stellar public key address
 * @param address - The address to validate
 * @param label - Label for error message context
 * @throws Error if the address is not a valid Stellar public key
 */
function validateAddress(address: string, label: string): void {
  if (!address || typeof address !== 'string') {
    throw new Error(`${label} must be a non-empty string`);
  }
  try {
    Keypair.fromPublicKey(address);
  } catch {
    throw new Error(`Invalid Stellar address for ${label}: "${address}". Expected a valid public key starting with 'G'.`);
  }
}

/**
 * Validates an amount string
 * @param amount - The amount to validate
 * @param label - Label for error message context
 * @throws Error if the amount is not a positive number
 */
function validateAmount(amount: string, label: string): void {
  if (!amount || typeof amount !== 'string') {
    throw new Error(`${label} must be a non-empty string`);
  }
  const n = parseFloat(amount);
  if (isNaN(n)) {
    throw new Error(`Invalid amount for ${label}: "${amount}" is not a valid number`);
  }
  if (n <= 0) {
    throw new Error(`Invalid amount for ${label}: "${amount}" must be greater than 0`);
  }
}

// ── BuiltTransaction impl ──────────────────────────────────────────────────

/**
 * Internal implementation of BuiltTransaction interface
 * Wraps a Stellar Transaction and Horizon Server for signing and submission
 */
class BuiltTransactionImpl implements BuiltTransaction {
  private tx: Transaction;
  private server: Horizon.Server;
  xdr: string;

  constructor(tx: Transaction, server: Horizon.Server) {
    this.tx     = tx;
    this.server = server;
    this.xdr    = tx.toXDR();
  }

  /**
   * Signs the transaction with the provided keypair
   * @param keypair - The keypair to sign with
   * @returns This instance for chaining
   */
  sign(keypair: Keypair): BuiltTransaction {
    this.tx.sign(keypair);
    this.xdr = this.tx.toXDR();
    return this;
  }

  /**
   * Returns the current XDR representation of the transaction
   * @returns XDR string
   */
  toXDR(): string {
    return this.tx.toXDR();
  }

  /**
   * Submits the signed transaction to the Horizon network
   * @returns SubmitResult with transaction hash, ledger, and success status
   * @throws Error if submission fails
   */
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

/**
 * Fluent builder for constructing Stellar transactions
 * Provides a chainable API for adding operations, setting memos/timebounds,
 * building, signing, and submitting transactions
 */
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

  /**
   * Entry point — create a builder for a given keypair and network
   * @param keypair - Source account keypair
   * @param options - Builder options including network, fee, and Horizon URL
   * @returns New TxBuilder instance
   */
  static for(keypair: Keypair, options: TxBuilderOptions): TxBuilder {
    return new TxBuilder(keypair, options);
  }

  // ── operations ────────────────────────────────────────────────────────

  /**
   * Adds a payment operation to the transaction
   * @param params - Payment parameters including destination, amount, and asset
   * @returns This instance for chaining
   * @throws Error if destination address or amount is invalid
   */
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

  /**
   * Adds a create account operation to the transaction
   * @param params - Create account parameters including destination and starting balance
   * @returns This instance for chaining
   * @throws Error if destination address or starting balance is invalid
   */
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

  /**
   * Adds a change trust operation to the transaction
   * @param params - Change trust parameters including asset and optional limit
   * @returns This instance for chaining
   */
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

  /**
   * Sets a text memo for the transaction
   * @param text - Memo text (max 28 bytes)
   * @returns This instance for chaining
   * @throws Error if memo exceeds 28 bytes or is empty
   */
  setMemo(text: string): this {
    if (!text || typeof text !== 'string') {
      throw new Error('Memo must be a non-empty string');
    }
    const byteLength = Buffer.byteLength(text, 'utf8');
    if (byteLength > 28)
      throw new Error(`Memo text exceeds 28-byte limit (${byteLength} bytes)`);
    this.memo = Memo.text(text);
    return this;
  }

  /**
   * Sets timebounds for the transaction validity window
   * @param bounds - Timebound parameters with optional minTime and maxTime
   * @returns This instance for chaining
   */
  setTimebounds(bounds: TimeboundParams): this {
    this.timebounds = {
      minTime: bounds.minTime !== undefined ? parseRelativeTime(bounds.minTime) : 0,
      maxTime: bounds.maxTime !== undefined ? parseRelativeTime(bounds.maxTime) : 0,
    };
    return this;
  }

  // ── build ─────────────────────────────────────────────────────────────

  /**
   * Builds the transaction by loading the source account from Horizon
   * and assembling all operations, memos, and timebounds
   * @returns BuiltTransaction ready for signing and submission
   * @throws Error if no operations have been added
   */
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