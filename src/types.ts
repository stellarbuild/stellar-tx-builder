import type { Keypair, Networks } from '@stellar/stellar-sdk';

export type NetworkPassphrase = typeof Networks.PUBLIC | typeof Networks.TESTNET | typeof Networks.FUTURENET;

export interface TxBuilderOptions {
  network: 'mainnet' | 'testnet' | 'futurenet';
  fee?: string;         // base fee in stroops, default '100'
  horizonUrl?: string;  // override default Horizon endpoint
  timeout?: number;     // request timeout in ms
}

export interface PaymentParams {
  destination: string;
  amount: string;
  asset: 'XLM' | { code: string; issuer: string };
  memo?: string;
}

export interface CreateAccountParams {
  destination: string;
  startingBalance: string; // minimum 1 XLM
}

export interface ChangeTrustParams {
  asset: { code: string; issuer: string };
  limit?: string; // omit to remove trustline
}

export interface TimeboundParams {
  minTime?: string | number; // ISO string, unix timestamp, or relative e.g. '+5m'
  maxTime?: string | number;
}

export interface BuiltTransaction {
  xdr: string;
  sign: (keypair: Keypair) => BuiltTransaction;
  submit: () => Promise<SubmitResult>;
  toXDR: () => string;
}

export interface SubmitResult {
  hash: string;
  ledger: number;
  successful: boolean;
  resultXdr: string;
}