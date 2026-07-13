# ⚓ AnchorEd

**Tamper-proof academic credentials, anchored on the XRP Ledger.**

Credential fraud is a public-safety crisis. In 2023, *Operation Nightingale* uncovered ~7,600
fake nursing diplomas sold in Florida — fraudulent nurses reached real patients. Diploma mills
sell an estimated 100,000+ fake degrees in the US every year, while legitimate verification
still means days of phone calls and per-check fees.

AnchorEd makes a diploma as verifiable as a blockchain transaction — because it is one.

## How it works

1. **Issue** — The institution builds a W3C-style Verifiable Credential for the graduate.
   A salted SHA-256 fingerprint of the credential is minted into an NFT from the
   institution's XRPL wallet (hash in the transaction memo). The student receives the
   credential file + a QR code. **No personal data touches the ledger** — only the fingerprint.
2. **Hold** — The graduate owns their credential (JSON + QR). The salt in the credential
   prevents dictionary attacks against the on-ledger hash.
3. **Verify** — Any employer, licensing board, or agency scans the QR (or uploads the file).
   AnchorEd recomputes the salted hash and checks it against NFTs minted by the issuer's
   address on the public ledger. Match → authentic. Tampered → fail. Seconds, fractions of
   a cent, no intermediary.

## Why XRPL

- ~3–5 second finality, ~$0.0002 per transaction
- Native NFT primitives (XLS-20) — no smart-contract attack surface
- Carbon-neutral consensus
- Full public auditability of every credential an institution has ever issued

## Stack

Vue 3 · TypeScript · Vite · Tailwind CSS · xrpl.js v4

## Run locally

```bash
npm install
npm run dev
```

Currently runs against **XRPL Testnet** (`wss://s.altnet.rippletest.net:51233`).
Create and fund a testnet issuer wallet at the [XRPL faucet](https://xrpl.org/resources/dev-tools/xrp-faucets).

## Roadmap

- [x] Xaman (XUMM) wallet signing — no seeds in the browser
- [x] Hash-only NFT URIs (zero PII on-chain, FERPA-aligned)
- [x] Soulbound (non-transferable) diploma NFTs + issuer revocation
- [ ] `did:web` issuer registry — cryptographically bind XRPL addresses to institution domains
- [ ] Verifier pagination + indexer for high-volume issuers
- [ ] Merkle-batch anchoring for graduating classes
- [ ] Verification API for ATS / licensing-board integration

## Security model (current, testnet)

The issuer seed input in the UI is a **development convenience only** and will be removed
in favor of Xaman signing before any mainnet deployment. Never enter a mainnet seed.

## License

MIT © Andreas Mendes
