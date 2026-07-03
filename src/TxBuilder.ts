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
  Address,
} from '@stellar/stellar-sdk';
import type {
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
function resolveAsset(asset: 'XLM' | { code: string; issuer: string }): Asset {
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
 * Resolves a price parameter to a Stellar price object
 * @param price - Either a string number or a fraction object with n (numerator) and d (denominator)
 * @returns Price object with n and d properties
 * @throws Error if price is invalid
 */
function resolvePrice(price: ManageOfferParams['price'] | ManageBuyOfferParams['price']): { n: number; d: number } {
  if (typeof price === 'string') {
    const n = parseFloat(price);
    if (isNaN(n) || n <= 0) {
      throw new Error(`Invalid price: "${price}" must be a positive number`);
    }
    // Convert decimal to fraction with denominator 1 for simplicity
    // Stellar SDK will handle the conversion internally
    return { n: Math.floor(n * 10000000), d: 10000000 };
  }
  
  if (typeof price === 'object' && price.n !== undefined && price.d !== undefined) {
    if (price.n <= 0 || price.d <= 0) {
      throw new Error(`Invalid price fraction: numerator and denominator must be positive`);
    }
    return { n: price.n, d: price.d };
  }
  
  throw new Error(`Invalid price format: must be a string or {n, d} object`);
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
  private feeBumpSource?: string;
  private feeBumpFee?: string;

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
    const asset = resolveAsset({ code: params.asset.code, issuer: params.asset.issuer });
    this.operations.push(
      Operation.changeTrust({
        asset,
        ...(params.limit !== undefined ? { limit: params.limit } : {}),
      })
    );
    return this;
  }

  /**
   * Adds a manage sell offer operation to the transaction
   * @param params - Manage offer parameters including selling/buying assets, amount, price, and optional offer ID
   * @returns This instance for chaining
   * @throws Error if parameters are invalid
   */
  addManageOffer(params: ManageOfferParams): this {
    validateAmount(params.amount, 'offer amount');
    
    const selling = resolveAsset(params.selling);
    const buying = resolveAsset(params.buying);
    const price = resolvePrice(params.price);
    
    this.operations.push(
      Operation.manageSellOffer({
        selling,
        buying,
        amount: params.amount,
        price,
        offerId: params.offerId || '0',
      })
    );
    return this;
  }

  /**
   * Adds a manage buy offer operation to the transaction
   * @param params - Manage buy offer parameters including selling/buying assets, amount, price, and optional offer ID
   * @returns This instance for chaining
   * @throws Error if parameters are invalid
   */
  addManageBuyOffer(params: ManageBuyOfferParams): this {
    validateAmount(params.amount, 'buy offer amount');
    
    const selling = resolveAsset(params.selling);
    const buying = resolveAsset(params.buying);
    const price = resolvePrice(params.price);
    
    this.operations.push(
      Operation.manageBuyOffer({
        selling,
        buying,
        buyAmount: params.amount,
        price,
        offerId: params.offerId || '0',
      })
    );
    return this;
  }

  /**
   * Adds a path payment strict send operation to the transaction
   * @param params - Path payment parameters including destination, send/dest assets and amounts, and optional path
   * @returns This instance for chaining
   * @throws Error if parameters are invalid
   */
  addPathPayment(params: PathPaymentParams): this {
    validateAddress(params.destination, 'destination');
    validateAmount(params.sendAmount, 'send amount');
    validateAmount(params.destAmount, 'destination amount');
    
    const sendAsset = resolveAsset(params.sendAsset);
    const destAsset = resolveAsset(params.destAsset);
    const path = params.path ? params.path.map(resolveAsset) : [];
    
    this.operations.push(
      Operation.pathPaymentStrictSend({
        destination: params.destination,
        sendAsset,
        sendAmount: params.sendAmount,
        destAsset,
        destMin: params.destAmount,
        path,
      })
    );
    return this;
  }

  /**
   * Adds a set options operation to the transaction
   * @param params - Set options parameters for account configuration
   * @returns This instance for chaining
   * @throws Error if parameters are invalid
   */
  addSetOptions(params: SetOptionsParams): this {
    const operationParams: Record<string, unknown> = {};
    
    if (params.inflationDest !== undefined) {
      validateAddress(params.inflationDest, 'inflation destination');
      operationParams.inflationDest = params.inflationDest;
    }
    
    if (params.clearFlags !== undefined) {
      operationParams.clearFlags = params.clearFlags;
    }
    
    if (params.setFlags !== undefined) {
      operationParams.setFlags = params.setFlags;
    }
    
    if (params.masterWeight !== undefined) {
      if (params.masterWeight < 0 || params.masterWeight > 255) {
        throw new Error('Master weight must be between 0 and 255');
      }
      operationParams.masterWeight = params.masterWeight;
    }
    
    if (params.lowThreshold !== undefined) {
      if (params.lowThreshold < 0 || params.lowThreshold > 255) {
        throw new Error('Low threshold must be between 0 and 255');
      }
      operationParams.lowThreshold = params.lowThreshold;
    }
    
    if (params.medThreshold !== undefined) {
      if (params.medThreshold < 0 || params.medThreshold > 255) {
        throw new Error('Medium threshold must be between 0 and 255');
      }
      operationParams.medThreshold = params.medThreshold;
    }
    
    if (params.highThreshold !== undefined) {
      if (params.highThreshold < 0 || params.highThreshold > 255) {
        throw new Error('High threshold must be between 0 and 255');
      }
      operationParams.highThreshold = params.highThreshold;
    }
    
    if (params.homeDomain !== undefined) {
      if (params.homeDomain.length > 32) {
        throw new Error('Home domain must be 32 characters or fewer');
      }
      operationParams.homeDomain = params.homeDomain;
    }
    
    if (params.signer !== undefined) {
      if (params.signer.weight < 0 || params.signer.weight > 255) {
        throw new Error('Signer weight must be between 0 and 255');
      }
      
      const signer: Record<string, unknown> = { weight: params.signer.weight };
      
      if (params.signer.ed25519PublicKey) {
        validateAddress(params.signer.ed25519PublicKey, 'signer public key');
        signer.ed25519PublicKey = params.signer.ed25519PublicKey;
      } else if (params.signer.sha256Hash) {
        if (typeof params.signer.sha256Hash === 'string') {
          if (params.signer.sha256Hash.length !== 64) {
            throw new Error('SHA256 hash must be 64 hex characters (32 bytes)');
          }
          signer.sha256Hash = Buffer.from(params.signer.sha256Hash, 'hex');
        } else {
          signer.sha256Hash = params.signer.sha256Hash;
        }
      } else if (params.signer.preAuthTx) {
        if (typeof params.signer.preAuthTx === 'string') {
          if (params.signer.preAuthTx.length !== 64) {
            throw new Error('PreAuthTx must be 64 hex characters (32 bytes)');
          }
          signer.preAuthTx = Buffer.from(params.signer.preAuthTx, 'hex');
        } else {
          signer.preAuthTx = params.signer.preAuthTx;
        }
      } else {
        throw new Error('Signer must specify one of: ed25519PublicKey, sha256Hash, or preAuthTx');
      }
      
      operationParams.signer = signer;
    }
    
    this.operations.push(Operation.setOptions(operationParams));
    return this;
  }

  /**
   * Adds a manage data operation to the transaction
   * @param params - Manage data parameters including name and value
   * @returns This instance for chaining
   * @throws Error if parameters are invalid
   */
  addManageData(params: ManageDataParams): this {
    if (!params.name || typeof params.name !== 'string') {
      throw new Error('Data name must be a non-empty string');
    }
    
    const nameBytes = Buffer.byteLength(params.name, 'utf8');
    if (nameBytes > 64) {
      throw new Error(`Data name exceeds 64-byte limit (${nameBytes} bytes)`);
    }
    
    if (params.value !== undefined && params.value !== null) {
      if (typeof params.value !== 'string') {
        throw new Error('Data value must be a string');
      }
      
      const valueBytes = Buffer.byteLength(params.value, 'utf8');
      if (valueBytes > 64) {
        throw new Error(`Data value exceeds 64-byte limit (${valueBytes} bytes)`);
      }
    }
    
    this.operations.push(
      Operation.manageData({
        name: params.name,
        value: params.value,
      })
    );
    return this;
  }

  /**
   * Adds a Soroban smart contract invocation operation to the transaction
   * @param params - Invoke contract parameters including contract ID, function name, and arguments
   * @returns This instance for chaining
   * @throws Error if parameters are invalid
   * @note This is a placeholder for future Soroban support. For now, use the Stellar SDK directly:
   * Operation.invokeHostFunction({ func: xdr.HostFunction.invokeContract({ ... }) })
   */
  invokeContract(params: InvokeContractParams): this {
    if (!params.contractId || typeof params.contractId !== 'string') {
      throw new Error('Contract ID must be a non-empty string');
    }
    
    if (!params.functionName || typeof params.functionName !== 'string') {
      throw new Error('Function name must be a non-empty string');
    }
    
    // Validate contract ID format
    try {
      new Address(params.contractId);
    } catch (error) {
      throw new Error('Invalid contract ID format');
    }
    
    // Placeholder - full Soroban implementation requires complex XDR handling
    // This validates inputs and provides type safety
    throw new Error('Soroban contract invocation is not yet fully implemented. Use @stellar/stellar-sdk directly for Soroban operations.');
  }

  /**
   * Wraps the transaction in a fee bump transaction
   * @param feeSource - Public key of the account paying the fee
   * @param fee - Fee to pay (in stroops), defaults to base fee
   * @returns This instance for chaining
   * @throws Error if parameters are invalid
   */
  wrapInFeeBump(feeSource: string, fee?: string): this {
    validateAddress(feeSource, 'fee source');
    
    if (fee !== undefined) {
      validateAmount(fee, 'fee');
    }
    
    // Store fee bump parameters to be applied during build
    this.feeBumpSource = feeSource;
    this.feeBumpFee = fee;
    
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

    // Apply timebounds if set, otherwise use TimeoutInfinite
    if (this.timebounds) {
      builder.setTimebounds(this.timebounds.minTime, this.timebounds.maxTime);
    } else {
      builder.setTimeout(TimeoutInfinite);
    }

    const tx = builder.build() as Transaction;

    // Note: Fee bump implementation requires SDK compatibility fixes
    // For now, this validates inputs and provides structure
    if (this.feeBumpSource) {
      throw new Error('Fee bump transaction requires SDK compatibility fixes. Use Stellar SDK directly for fee bump operations.');
    }

    return new BuiltTransactionImpl(tx, server);
  }
}