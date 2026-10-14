# ArcPay — one-link USDC payments on Arc

Create a payment link, share it, get paid in USDC on [Arc](https://www.circle.com/arc)
(Circle's stablecoin-native L1). No ERC-20 approval needed: Arc uses native USDC
as gas (18 decimals), so paying an invoice is a single transaction.

Built for the [Arc Microgrants](https://dorahacks.io/hackathon/arc-microgrants) program.

## How it works

1. Connect a wallet (auto-switches to Arc mainnet, chain ID 5042).
2. Enter an amount + memo → get a shareable `?invoice=N` link.
3. Anyone opening the link can pay it with native USDC in one click.
4. The contract forwards the exact amount to the recipient and emits events.

## Contract

`contracts/ArcPay.sol` — `createInvoice(amount, memo)`, `payInvoice(id)` (payable),
`getInvoice(id)`. Amounts are in native USDC wei (18 decimals).

Deployed: see `deployments.json` (Arc mainnet, chain ID 5042).

## Develop

```bash
npm install
node scripts/compile.js            # solc -> build/ArcPay.json
# deployment goes through a local SSH tunnel (see scripts/tunnel-rpc.js)
DEPLOYER_KEY=0x... node scripts/deploy-raw.js mainnet
node scripts/inject-config.js mainnet   # inject address into frontend
```

Serve `frontend/` as a static site.

## License

MIT
