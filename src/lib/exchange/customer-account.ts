// Turn a stored exchange_connections row into a ready-to-trade futures client.
// SERVER-ONLY: decrypts the customer's API secret (AES-256-GCM) in memory only.
//
// The connection row holds no testnet/live flag — the executor decides the venue
// globally via its FuturesEnv (Phase B = "testnet"). A 'live' env additionally
// requires the EXECUTOR_LIVE hard gate (see scripts/executor-tick.ts).

import { decryptSecret } from "../crypto/apiKeys";
import { BinanceFuturesClient, type FuturesEnv } from "./binance-futures";

export type ExchangeConnectionRow = {
  user_id: string;
  exchange: string;
  api_key_enc: string;
  api_secret_enc: string;
  status: string;
};

/** Decrypt a connection's credentials into a BinanceFuturesClient for `env`.
 *  Throws if the ciphertext is tampered or the encryption key is wrong. */
export function clientFromConnection(
  conn: ExchangeConnectionRow,
  env: FuturesEnv,
): BinanceFuturesClient {
  const apiKey = decryptSecret(conn.api_key_enc);
  const secret = decryptSecret(conn.api_secret_enc);
  return new BinanceFuturesClient(apiKey, secret, env);
}
