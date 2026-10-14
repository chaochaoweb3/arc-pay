// Deploy ArcPay to Arc testnet or mainnet.
// Usage: DEPLOYER_KEY=0x... node scripts/deploy.js [testnet|mainnet]
const { ethers } = require("ethers");
const artifact = require("../build/ArcPay.json");

const NETWORKS = {
  testnet: {
    name: "Arc Testnet",
    rpc: "https://rpc.testnet.arc.network",
    chainId: 5042002,
    explorer: "https://testnet.arcscan.app",
  },
  mainnet: {
    name: "Arc Mainnet",
    rpc: "https://rpc.mainnet.arc.io",
    chainId: 5042,
    explorer: "https://explorer.arc.io",
  },
};

async function main() {
  const netName = process.argv[2] || "testnet";
  const net = NETWORKS[netName];
  if (!net) throw new Error(`unknown network: ${netName}`);

  const key = process.env.DEPLOYER_KEY;
  if (!key) throw new Error("set DEPLOYER_KEY env var");

  const provider = new ethers.JsonRpcProvider(net.rpc, net.chainId);
  const wallet = new ethers.Wallet(key, provider);
  console.log(`network : ${net.name} (chainId ${net.chainId})`);
  console.log(`deployer: ${wallet.address}`);
  const bal = await provider.getBalance(wallet.address);
  console.log(`balance : ${ethers.formatUnits(bal, 18)} USDC (native)`);

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );
  console.log("deploying ArcPay...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log(`deployed: ${addr}`);
  console.log(`explorer: ${net.explorer}/address/${addr}`);

  // Save deployment info for the frontend
  const fs = require("fs");
  const path = require("path");
  const infoPath = path.join(__dirname, "..", "deployments.json");
  let info = {};
  try {
    info = JSON.parse(fs.readFileSync(infoPath, "utf8"));
  } catch {}
  info[netName] = {
    address: addr,
    chainId: net.chainId,
    rpc: net.rpc,
    explorer: net.explorer,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));
  console.log("saved to deployments.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
