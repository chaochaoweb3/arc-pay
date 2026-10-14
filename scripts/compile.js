// Compile ArcPay.sol with solc-js and dump ABI + bytecode.
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const srcPath = path.join(__dirname, "..", "contracts", "ArcPay.sol");
const source = fs.readFileSync(srcPath, "utf8");

const input = {
  language: "Solidity",
  sources: { "ArcPay.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors) {
  const fatal = output.errors.filter((e) => e.severity === "error");
  for (const e of output.errors) console.error(e.formattedMessage);
  if (fatal.length) process.exit(1);
}

const contract = output.contracts["ArcPay.sol"]["ArcPay"];
const outDir = path.join(__dirname, "..", "build");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "ArcPay.json"),
  JSON.stringify(
    { abi: contract.abi, bytecode: "0x" + contract.evm.bytecode.object },
    null,
    2
  )
);
console.log("compiled OK -> build/ArcPay.json");
