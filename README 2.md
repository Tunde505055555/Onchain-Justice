# ⚖️ Onchain Justice

> Decentralized AI-powered dispute resolution on **GenLayer**.
> Lock funds in escrow, agree on terms, and let an impartial AI arbitrator settle disagreements onchain.

**Live app:** https://justice-layer.lovable.app
**Contract address (GenLayer Studionet):** `0xe2456D3345Dcd811c140B657B990c8061C2c48a3`

---

## ✨ What is it?

Onchain Justice is a trust-minimized escrow + arbitration protocol. Two parties (e.g. client & freelancer, buyer & seller) agree on a deal, lock funds in a smart contract, and follow one of two paths:

- **Happy path** → the payer releases funds to the payee.
- **Disputed path** → either side raises a dispute, both submit evidence, and a GenLayer **AI consensus ruling** decides how to split the escrow — automatically and onchain.

The AI arbitrator is powered by GenLayer's `gl.eq_principle.prompt_comparative`, which forces multiple validators to reach consensus on a fair ruling before the contract executes the payout.

---

## 🧩 Features

- 🔐 **Onchain escrow** — funds are locked in the contract, not held by a middleman.
- 🤖 **AI arbitration** — disputes are resolved by an impartial LLM bound to consensus rules.
- 🧾 **Structured claims & evidence** — each side submits an "Expected / Actual / Issue" breakdown plus supporting evidence (tx hashes, screenshots, message excerpts).
- 📊 **Clear dispute UI** — role-aware ("You (Payer)" vs "Counterparty (Payee)"), status badges, and a step-by-step timeline.
- 💸 **Automatic payout** — once the AI rules, the contract distributes the escrow according to the percentage split.
- 🦊 **MetaMask integration** — auto-adds the GenLayer Studio network.

---

## 🏗 Tech Stack

| Layer        | Tech                                                              |
| ------------ | ----------------------------------------------------------------- |
| Smart contract | **Python** (GenLayer Intelligent Contracts SDK)                 |
| AI consensus | `gl.eq_principle.prompt_comparative`                              |
| Frontend     | **React 19**, **TanStack Start v1**, **Vite 7**                   |
| Styling      | **Tailwind CSS v4**, shadcn/ui, Framer Motion                     |
| Wallet / RPC | `genlayer-js`, MetaMask                                           |
| Network      | GenLayer **Studionet** (chain id `61999`)                         |

---

## 📂 Project Structure

```
.
├── contracts/
│   └── OnchainJustice.py        # The Intelligent Contract (escrow + AI ruling)
├── src/
│   ├── components/
│   │   ├── CaseCard.tsx
│   │   ├── CaseDetail.tsx       # Main dispute interface
│   │   ├── NewCaseDialog.tsx    # Open a new escrow
│   │   ├── ConnectWalletButton.tsx
│   │   └── ui/                  # shadcn/ui primitives
│   ├── lib/
│   │   ├── justice.ts           # Contract read/write helpers
│   │   ├── genlayer.ts          # GenLayer client + network config
│   │   ├── wallet.tsx           # Wallet provider hook
│   │   └── contractSource.ts
│   ├── routes/
│   │   ├── __root.tsx
│   │   └── index.tsx            # Home page
│   ├── router.tsx
│   └── styles.css               # Design tokens (oklch)
├── package.json
├── vite.config.ts
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) (or Node 18+)
- [MetaMask](https://metamask.io/) browser extension
- Some test **GEN** on GenLayer Studionet

### Install & Run

```bash
bun install
bun dev
```

Open http://localhost:5173 — the app will prompt MetaMask to add the GenLayer Studio network automatically on first connect.

### Build

```bash
bun run build
```

---

## 🌐 Network Configuration

| Field              | Value                                              |
| ------------------ | -------------------------------------------------- |
| Network name       | GenLayer Studio                                    |
| Chain ID           | `61999` (`0xf21f`)                                 |
| RPC URL            | `https://studio.genlayer.com/api`                  |
| Currency           | `GEN`                                              |
| Block explorer     | `https://explorer-studio.genlayer.com`             |

The frontend will switch / add this network automatically when you click **Connect wallet**.

---

## 🧠 How It Works

### 1. Create an escrow (`create_case`)
The payer calls `create_case(counterparty, agreement)` and sends GEN as `msg.value`. The funds are now locked and the case starts in status **OPEN**.

### 2a. Happy path (`release_funds`)
If everything goes well, the payer calls `release_funds(case_id)` → 100% goes to the payee. Status → **RESOLVED**.

### 2b. Disputed path (`raise_dispute` → `submit_evidence` → `resolve_with_ai`)

1. Either party calls `raise_dispute(case_id, claim)` with their initial position. Status → **DISPUTED**.
2. Both sides call `submit_evidence(case_id, claim, evidence)` to add supporting material — tx hashes, screenshot URLs, message excerpts, etc.
3. Anyone calls `resolve_with_ai(case_id)`. The contract:
   - Builds a single prompt containing the agreement, both claims, and all evidence.
   - Runs it through `gl.eq_principle.prompt_comparative` so multiple validators must agree on the ruling.
   - Parses the JSON ruling: `{ payer_percent, payee_percent, reasoning }`.
   - Splits the escrow accordingly. Status → **RESOLVED**.

### Contract storage (per case)

```jsonc
{
  "id": 0,
  "payer": "0x…",
  "payee": "0x…",
  "agreement": "string",
  "amount": 1000000000000000000,
  "status": 0,             // 0=OPEN, 1=DISPUTED, 2=RESOLVED
  "payer_claim": "",
  "payee_claim": "",
  "payer_evidence": [],
  "payee_evidence": [],
  "ruling": "",
  "payer_share": 0,
  "payee_share": 0
}
```

---

## 🖥 Using the App

1. **Connect wallet** — top-right button. MetaMask will be prompted to switch to GenLayer Studio.
2. **Open a new escrow** — paste the counterparty's address, write the agreement clearly (the AI will rule based on this exact text), and lock the GEN amount.
3. **Resolve**:
   - As payer, click **Release funds** if the work is satisfactory.
   - Otherwise, **Raise dispute**, fill in *Expected / Actual / Issue*, and submit evidence.
4. **Call AI ruling** — once both sides have submitted, anyone can trigger the AI arbitrator. The result + reasoning + payout split appears in the case view.

---

## 🔒 Security Notes

- The contract holds funds — only the payer can `release_funds`, and only the two parties can submit claims/evidence.
- The AI ruling is gated by GenLayer's equivalence principle: rulings must agree on the winning party (within a 20-point tolerance) and cite the same evidence, otherwise consensus fails.
- Percentages are normalized defensively so the split always sums to 100.
- The frontend never custodies keys — all writes go through MetaMask.

---

## 🛠 Useful Commands

```bash
bun dev              # start dev server
bun run build        # production build
bun run typecheck    # TypeScript check (if configured)
```

---

## 📜 License

MIT — do whatever, just don't blame us if your AI judge sides with the other guy.

---

## 🙌 Credits

- Built on [**GenLayer**](https://genlayer.com) — Intelligent Contracts with AI consensus.
- UI powered by [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS](https://tailwindcss.com).
- Routing by [TanStack Start](https://tanstack.com/start).
