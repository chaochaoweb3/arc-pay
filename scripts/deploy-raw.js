// Deploy ArcPay via the SSH tunnel (no direct RPC egress from this VM).
// Usage: DEPLOYER_KEY=0x... node scripts/deploy-raw.js [testnet|mainnet]
const { ethers } = require("ethers");
const { rpc, waitForReceipt } = require("./tunnel-rpc");
const artifact = require("../build/ArcPay.json");

const CHAINS = { testnet: 5042002, mainnet: 5042 };

async function main() {
  const netName = process.argv[2] || "testnet";
  const chainId = CHAINS[netName];
  if (!chainId) throw new Error("unknown network " + netName);
  const key = process.env.DEPLOYER_KEY;
  if (!key) throw new Error("set DEPLOYER_KEY");

  const wallet = new ethers.Wallet(key);
  const from = wallet.address;
  console.log(`network : ${netName} (chainId ${chainId})`);
  console.log(`deployer: ${from}`);

  const balHex = await rpc(netName, "eth_getBalance", [from, "latest"]);
  const bal = BigInt(balHex);
  console.log(`balance : ${ethers.formatUnits(bal, 18)} USDC (native)`);
  if (bal === 0n) throw new Error("deployer has no funds — get USDC first");

  const nonceHex = await rpc(netName, "eth_getTransactionCount", [from, "latest"]);
  const nonce = BigInt(nonceHex);

  // Fee params: try EIP-1559, fall back to legacy gasPrice
  let txReq;
  try {
    const [maxFee, maxPrio] = await Promise.all([
      rpc(netName, "eth_gasPrice", []),
      rpc(netName, "eth_maxPriorityFeePerGas", []),
    ]);
    txReq = {
      type: 2,
      chainId,
      nonce,
      to: null,
      data: artifact.bytecode,
      value: 0n,
      gasLimit: 800000n,
      maxFeePerGas: BigInt(maxFee),
      maxPriorityFeePerGas: BigInt(maxPrio),
    };
    console.log(`fees    : EIP-1559 maxFee=${maxFee} maxPrio=${maxPrio}`);
  } catch {
    const gasPrice = await rpc(netName, "eth_gasPrice", []);
    txReq = {
      type: 0,
      chainId,
      nonce,
      to: null,
      data: artifact.bytecode,
      value: 0n,
      gasLimit: 800000n,
      gasPrice: BigInt(gasPrice),
    };
    console.log(`fees    : legacy gasPrice=${gasPrice}`);
  }

  const signed = await wallet.signTransaction(txReq);
  console.log("sending deployment tx...");
  const hash = await rpc(netName, "eth_sendRawTransaction", [signed]);
  console.log(`tx hash : ${hash}`);
  const rcpt = await waitForReceipt(netName, hash);
  console.log(`status  : ${rcpt.status === "0x1" ? "SUCCESS" : "FAILED"}`);
  console.log(`contract: ${rcpt.contractAddress}`);

  const fs = require("fs");
  const path = require("path");
  const infoPath = path.join(__dirname, "..", "deployments.json");
  let info = {};
  try {
    info = JSON.parse(fs.readFileSync(infoPath, "utf8"));
  } catch {}
  info[netName] = {
    address: rcpt.contractAddress,
    txHash: hash,
    chainId,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));
  console.log("saved to deployments.json");
}

main().catch((e) => {
  console.error("DEPLOY FAILED:", e.message);
  process.exit(1);
});
