# AnchorEd — Project Overview & Progress

> Last updated: July 18, 2026

**Live app:** https://anchor-ed.vercel.app · **Repo:** https://github.com/dre10155/AnchorEd

---

## 1. What AnchorEd is

AnchorEd makes academic credentials **tamper-proof and verifiable in seconds** by anchoring
them on the XRP Ledger. A diploma becomes as verifiable as a blockchain transaction —
because it is one.

### The problem

Credential fraud is a public-safety crisis in the United States:

- **Operation Nightingale (2023, DOJ/HHS-OIG):** ~7,600 fake nursing diplomas sold by
  Florida schools for ~$114M — fraudulently credentialed nurses reached real patients.
- Diploma mills sell an estimated **100,000+ fake US degrees per year**.
- Legitimate verification still means phone calls to registrars or paying clearinghouses
  **$10–30 per check with days-to-weeks of turnaround**.

### How it works

1. **Issue** — The institution builds a W3C-style Verifiable Credential (VC) for the
   graduate. A **salted SHA-256 fingerprint** of the credential is minted into an NFT from
   the institution's XRPL wallet (hash in both the transaction memo and the NFT URI).
   The student receives the credential file + a QR code.
   **No personal data ever touches the ledger** — only the fingerprint.
2. **Hold** — The graduate owns their credential (JSON + QR). The salt prevents
   dictionary attacks against the on-ledger hash.
3. **Verify** — Any employer, licensing board, or agency scans the QR (or uploads the
   file). AnchorEd recomputes the salted hash and checks it against NFTs minted by the
   issuer's address. Seconds, fractions of a cent, no intermediary.

### Trust model (the four verdicts)

| Verdict | Meaning |
|---|---|
| 🟢 **Verified — issued by \<domain\>** | Hash matches a live NFT **and** the issuing wallet passed the did:web identity handshake |
| 🟡 **Anchored — Issuer Unverified** | Hash matches, but the wallet's identity is unproven (the diploma-mill case, visibly flagged) |
| 🟡 **Revoked** | Hash matches a mint transaction, but the issuer has since burned the NFT (rescinded degree) |
| 🔴 **Not Verified** | No matching anchor — likely fraudulent or tampered |

### The did:web identity handshake

Nothing on a bare ledger binds a wallet to a real university, so AnchorEd requires a
**two-way proof**:

- **Domain → wallet:** the institution hosts a DID document at
  `https://<domain>/.well-known/did.json` listing its official XRPL address
  (only someone controlling the domain can do this)
- **Wallet → domain:** the institution signs one `AccountSet` transaction putting the
  domain in the wallet's on-ledger `Domain` field
  (only someone controlling the wallet can do this)

Impersonating an institution now requires compromising its actual website *and* wallet.

### Why XRPL

- ~3–5 second finality, ~$0.0002 per transaction
- Native NFT primitives (XLS-20) — no smart-contract attack surface
- Soulbound support (non-transferable, issuer-burnable NFTs) fits credentials perfectly
- Carbon-neutral consensus; full public auditability of every credential ever issued

---

## 2. Architecture

| Layer | Tech |
|---|---|
| Frontend | Vue 3 + TypeScript + Vite + Tailwind CSS |
| Ledger | XRPL Testnet (mainnet-ready), xrpl.js v4 |
| Signing | **Xaman (XUMM) app** — QR sign flow; seeds never touch the browser |
| Backend | Express (local dev) + Vercel serverless functions (production): Xaman payload proxy, did:web resolution proxy |
| Hosting | Vercel (auto-deploys from `main`) |

Pages: `/` landing · `/issue` (single + batch mint) · `/verify` (file or QR camera scan)
· `/revoke` (burn with confirmation + reason) · `/identity` (did:web onboarding wizard)

---

## 3. Progress

### ✅ Phase 1 — Xaman wallet signing (done)
Removed issuer seeds from the browser entirely. Unsigned `NFTokenMint` goes to a backend
that creates a Xaman sign payload; the registrar scans a QR on their phone; the app polls
until signed and resolves the NFT ID from the validated ledger transaction.
Local-seed signing survives only behind `VITE_DEV_SEED_MODE=true` for testnet development.

### ✅ Phase 2 — Zero PII on-chain (done)
The NFT URI previously embedded raw VC JSON (student name included) truncated to 256
bytes — a permanent PII leak and corrupted data. The URI now carries only
`vc:sha256:<hash>`, giving a second on-chain binding the verifier enforces. FERPA-aligned.

### ✅ Phase 3 — Soulbound diplomas + revocation (done)
Mint flags changed from transferable to **burnable-only**: a diploma is bound to its
graduate, never a tradable asset, while the issuer keeps revocation power. New `/revoke`
page (confirmation dialog + required off-chain reason, Xaman-signed burn). Verifier
gained the amber **REVOKED** state.

### ✅ Phase 4 — did:web issuer identity (done)
Two-way domain/wallet handshake described above. New `/identity` onboarding wizard
(generates the did.json, signs the `AccountSet`, self-checks the handshake). Verifier
distinguishes 🟢 verified-identity from 🟡 anchored-but-unverified.
AnchorEd dogfoods this: `anchor-ed.vercel.app/.well-known/did.json` is live, listing the
demo issuer wallet.

### ✅ Deployed to production (done)
Live at **anchor-ed.vercel.app** with Xaman signing keys in Vercel env vars.
API + SPA routing + payload creation smoke-tested against production.

### ⏳ Phase 5 — Scale: batch minting + verifier robustness (next)
- **Authorized-minter batch flow:** the institution signs *one* Xaman transaction
  (`AccountSet` → `NFTokenMinter`) delegating mint authority to AnchorEd's service
  wallet; the server then mints a whole graduating class (CSV upload) with
  `Issuer: <institution>` stamped on-chain — revocable delegation, no per-diploma QR
  scans. XLS-56 Batch packs up to 8 mints per transaction.
- Verifier pagination (currently caps at the issuer's last 100 transactions)
- Proper CSV parsing (quoted fields), per-row progress, single shared connection

### ⏳ Phase 6 — Hardening (pending)
Explicit Testnet/Mainnet toggle · Vitest unit tests (canonicalization, hashing, verifier
states) · GitHub Actions CI

### Mainnet gate
Flip to mainnet when: Phase 5–6 land **and** the first pilot institution is ready to
issue real credentials. Mainnet launch is itself a PR moment — pair it with an
announcement.

---

## 4. Go-to-market & traction plan

**Business model:** institutions pay to issue (SaaS subscription and/or per-credential);
**verification stays free forever** — every free verification is a reason the next
institution must issue through AnchorEd. Later: a paid verification API for
HR/background-check platforms (incumbents charge $10–30 and take days; AnchorEd answers
in seconds).

**Exposure sequence (in progress):**
1. ✅ Live product + public repo
2. Demo video (mint → verify 🟢 → revoke → verify 🟡) — highest-leverage asset
3. dev.to/Medium article: *"Fighting diploma fraud with the XRP Ledger"*
4. XRPL Grants application (non-dilutive funding + third-party validation)
5. Pilot outreach: coding bootcamps (fastest yes), Saint Lucia institutions
   (home-field advantage), US community colleges / nursing schools (the Nightingale
   story). Free pilots → LOIs → paid conversion at mainnet launch.
6. Custom domain + analytics from day one

---

## 5. Current status in one line

**Four of six engineering phases complete, live in production on XRPL Testnet with
wallet-signed issuance, revocation, and institutional identity — next: batch issuance at
scale (Phase 5), then hardening (Phase 6) and mainnet with the first pilot.**
