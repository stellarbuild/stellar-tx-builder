import type { Keypair, Networks } from '@stellar/stellar-sdk';

/**
 * Supported Stellar network passphrases
 */
export type NetworkPassphrase = typeof Networks.PUBLIC | typeof Networks.TESTNET | typeof Networks.FUTURENET;

/**
 * Configuration options for TxBuilder
 */
export interface TxBuilderOptions {
  network: 'mainnet' | 'testnet' | 'futurenet';
  fee?: string;         // base fee in stroops, default '100'
  horizonUrl?: string;  // override default Horizon endpoint
  timeout?: number;     // request timeout in ms
}

/**
 * Parameters for a payment operation
 */
export interface PaymentParams {
  destination: string;
  amount: string;
  asset: 'XLM' | { code: string; issuer: string };
  memo?: string;
}

/**
 * Parameters for creating a new account
 */
export interface CreateAccountParams {
  destination: string;
  startingBalance: string; // minimum 1 XLM
}

/**
 * Parameters for changing a trustline
 */
export interface ChangeTrustParams {
  asset: { code: string; issuer: string };
  limit?: string; // omit to remove trustline
}

/**
 * Parameters for managing a sell offer
 */
export interface ManageOfferParams {
  selling: { code: string; issuer: string } | 'XLM';
  buying: { code: string; issuer: string } | 'XLM';
  amount: string;
  price: string | { n: number; d: number };
  offerId?: string; // defaults to 0 (new offer)
}

/**
 * Parameters for setting transaction timebounds
 */
export interface TimeboundParams {
  minTime?: string | number; // ISO string, unix timestamp, or relative e.g. '+5m'
  maxTime?: string | number;
}

/**
 * A built transaction ready for signing and submission
 */
export interface BuiltTransaction {
  xdr: string;
  sign: (keypair: Keypair) => BuiltTransaction;
  submit: () => Promise<SubmitResult>;
  toXDR: () => string;
}

/**
 * Result from submitting a transaction to Horizon
 */
export interface SubmitResult {
  hash: string;
  ledger: number;
  successful: boolean;
  resultXdr: string;
}