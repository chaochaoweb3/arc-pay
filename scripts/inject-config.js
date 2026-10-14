// Inject the deployed contract address into frontend/index.html.
// Usage: node scripts/inject-config.js [testnet|mainnet]
const fs = require("fs");
const path = require("path");

const netName = process.argv[2] || "mainnet";
const deployments = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "deployments.json"), "utf8")
);
const dep = deployments[netName];
if (!dep) throw new Error(`no deployment recorded for ${netName}`);

const config = {
  contractAddress: dep.address,
  chainId: dep.chainId,
  rpc: dep.rpc || (netName === "mainnet" ? "https://rpc.mainnet.arc.io" : "https://rpc.testnet.arc.network"),
  explorer: dep.explorer || (netName === "mainnet" ? "https://explorer.arc.io" : "https://testnet.arcscan.app"),
};

const htmlPath = path.join(__dirname, "..", "frontend", "index.html");
let html = fs.readFileSync(htmlPath, "utf8");
const marker = 'const CONFIG = /*__CONFIG__*/';
const idx = html.indexOf(marker);
if (idx === -1) throw new Error("CONFIG marker not found in index.html");
// Replace from marker to the end of the statement (next semicolon)
const endIdx = html.indexOf(";", idx);
if (endIdx === -1) throw new Error("CONFIG statement end not found");
html =
  html.slice(0, idx) +
  `const CONFIG = ${JSON.stringify(config)}` +
  html.slice(endIdx);
fs.writeFileSync(htmlPath, html);
console.log(`injected ${netName} config:`, JSON.stringify(config, null, 2));
