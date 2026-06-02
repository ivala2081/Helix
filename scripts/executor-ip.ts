// Print the bot's outbound public IP — the address customers must add to their
// Binance API-key IP whitelist (and that Binance must not be blocking). Run this
// ON the VPS that will host the executor.
//
// Usage: npm run executor-ip

import { fetchEgressIp } from "../src/lib/exchange/egress-ip";

fetchEgressIp().then((ip) => {
  if (ip) {
    console.log(ip);
  } else {
    console.error("Could not determine egress IP (network/providers down).");
    process.exit(1);
  }
});
