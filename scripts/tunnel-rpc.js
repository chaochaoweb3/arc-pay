// Minimal JSON-RPC client that talks to Arc through the local SSH tunnel.
// Tunnel: 127.0.0.1:8546 -> rpc.mainnet.arc.io:443 (SNI preserved)
const https = require("https");

const TUNNELS = {
  mainnet: { port: 8546, servername: "rpc.mainnet.arc.io" },
  testnet: { port: 8547, servername: "rpc.testnet.arc.network" },
};

let idCounter = 1;

function rpc(netName, method, params = []) {
  const t = TUNNELS[netName];
  if (!t) throw new Error("unknown network " + netName);
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: idCounter++,
    method,
    params,
  });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: "127.0.0.1",
        port: t.port,
        path: "/",
        method: "POST",
        servername: t.servername, // SNI so the cert verifies
        headers: {
          Host: t.servername,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 25000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const j = JSON.parse(data);
            if (j.error) reject(new Error(`RPC ${method}: ${JSON.stringify(j.error)}`));
            else resolve(j.result);
          } catch (e) {
            reject(new Error(`RPC ${method}: bad response: ${data.slice(0, 120)}`));
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("RPC timeout")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function waitForReceipt(netName, hash, tries = 40) {
  for (let i = 0; i < tries; i++) {
    const r = await rpc(netName, "eth_getTransactionReceipt", [hash]);
    if (r && r.blockNumber) return r;
    await new Promise((s) => setTimeout(s, 3000));
  }
  throw new Error("receipt timeout for " + hash);
}

module.exports = { rpc, waitForReceipt };
