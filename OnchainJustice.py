# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


class DisputeStatus:
    OPEN = 0          # funds locked, no dispute raised
    DISPUTED = 1      # a party raised a dispute, awaiting evidence / resolution
    RESOLVED = 2      # AI ruling produced, funds distributed


class OnchainJustice(gl.Contract):
    """
    Onchain Justice — a decentralized AI dispute resolution system.

    Two parties (buyer & seller / client & freelancer) lock funds in escrow
    against an agreed contract description. If everything goes well, the
    payer releases the funds. If there's a disagreement, either party can
    raise a dispute, both submit evidence, and an AI consensus ruling
    splits the funds fairly.
    """

    # registry of all cases
    case_count: u256
    cases: TreeMap[u256, str]   # case_id -> JSON blob with all case data

    def __init__(self) -> None:
        self.case_count = u256(0)

    # ----- helpers -----------------------------------------------------

    def _load(self, case_id: u256):
        raw = self.cases.get(case_id, "")
        if raw == "":
            raise Exception("Case not found")
        return json.loads(raw)

    def _save(self, case_id: u256, data) -> None:
        self.cases[case_id] = json.dumps(data)

    # ----- write methods -----------------------------------------------

    @gl.public.write.payable
    def create_case(
        self,
        counterparty: str,
        agreement: str,
    ) -> u256:
        """
        Payer creates a new escrow case, locking the sent value as the
        amount in dispute. `counterparty` is the address of the other
        party (the payee).
        """
        case_id = int(self.case_count)
        payer = str(gl.message.sender_address)
        amount = int(gl.message.value)

        data = {
            "id": case_id,
            "payer": payer,
            "payee": counterparty,
            "agreement": agreement,
            "amount": amount,
            "status": DisputeStatus.OPEN,
            "payer_claim": "",
            "payee_claim": "",
            "payer_evidence": [],
            "payee_evidence": [],
            "ruling": "",
            "payer_share": 0,
            "payee_share": 0,
            "created_at": str(gl.message.sender_address),
        }
        self._save(u256(case_id), data)
        self.case_count = u256(case_id + 1)
        return u256(case_id)

    @gl.public.write
    def release_funds(self, case_id: u256) -> None:
        """Payer voluntarily releases funds to payee — happy path."""
        data = self._load(case_id)
        sender = str(gl.message.sender_address)
        if sender.lower() != data["payer"].lower():
            raise Exception("Only payer can release funds")
        if data["status"] != DisputeStatus.OPEN:
            raise Exception("Case is not open")
        data["status"] = DisputeStatus.RESOLVED
        data["payer_share"] = 0
        data["payee_share"] = data["amount"]
        data["ruling"] = "Payer voluntarily released funds in full to payee."
        self._save(case_id, data)

    @gl.public.write
    def raise_dispute(self, case_id: u256, claim: str) -> None:
        """Either party formally opens a dispute with their initial claim."""
        data = self._load(case_id)
        sender = str(gl.message.sender_address).lower()
        if data["status"] != DisputeStatus.OPEN:
            raise Exception("Case is not open")
        if sender == data["payer"].lower():
            data["payer_claim"] = claim
        elif sender == data["payee"].lower():
            data["payee_claim"] = claim
        else:
            raise Exception("Only parties of the case can raise a dispute")
        data["status"] = DisputeStatus.DISPUTED
        self._save(case_id, data)

    @gl.public.write
    def submit_evidence(
        self,
        case_id: u256,
        claim: str,
        evidence: str,
    ) -> None:
        """Add a claim + evidence (text or URL) to an active dispute."""
        data = self._load(case_id)
        sender = str(gl.message.sender_address).lower()
        if data["status"] != DisputeStatus.DISPUTED:
            raise Exception("Case is not in dispute")
        if sender == data["payer"].lower():
            if claim:
                data["payer_claim"] = claim
            data["payer_evidence"].append(evidence)
        elif sender == data["payee"].lower():
            if claim:
                data["payee_claim"] = claim
            data["payee_evidence"].append(evidence)
        else:
            raise Exception("Only parties of the case can submit evidence")
        self._save(case_id, data)

    @gl.public.write
    def resolve_with_ai(self, case_id: u256) -> None:
        """
        Trigger the AI consensus ruling. The LLM reads the agreement,
        both claims, and all submitted evidence, and returns a JSON
        ruling with the percentage split between payer and payee plus
        a reasoned explanation.
        """
        data = self._load(case_id)
        if data["status"] != DisputeStatus.DISPUTED:
            raise Exception("Case is not in dispute")

        agreement = data["agreement"]
        amount = int(data["amount"])
        payer_claim = data["payer_claim"] or "(no claim provided)"
        payee_claim = data["payee_claim"] or "(no claim provided)"
        payer_evidence = "\n- " + "\n- ".join(data["payer_evidence"]) if data["payer_evidence"] else "(none)"
        payee_evidence = "\n- " + "\n- ".join(data["payee_evidence"]) if data["payee_evidence"] else "(none)"

        def evaluate() -> str:
            task = f"""You are an impartial arbitrator for an onchain escrow dispute.
You must rule fairly based ONLY on the agreement and the evidence both parties provided.

ORIGINAL AGREEMENT:
{agreement}

AMOUNT IN ESCROW: {amount} wei

PAYER'S CLAIM:
{payer_claim}

PAYER'S EVIDENCE:{payer_evidence}

PAYEE'S CLAIM:
{payee_claim}

PAYEE'S EVIDENCE:{payee_evidence}

Decide what percentage of the escrow each party deserves. The two
percentages MUST sum to exactly 100. Provide a clear, neutral, reasoned
explanation citing the agreement and the evidence.

Respond with ONLY a valid JSON object (no markdown, no commentary) of
the form:
{{
  "payer_percent": <integer 0-100>,
  "payee_percent": <integer 0-100>,
  "reasoning": "<1-3 paragraph explanation>"
}}"""
            return gl.nondet.exec_prompt(task)

        raw = gl.eq_principle.prompt_comparative(
            evaluate,
            "Both rulings must agree on the same winning party (whoever has the higher percent, or both within 20 points = tie) and provide reasoning grounded in the same evidence. Exact wording and small percent differences are acceptable.",
        )
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        ruling = json.loads(cleaned)

        payer_pct = int(ruling.get("payer_percent", 0))
        payee_pct = int(ruling.get("payee_percent", 0))
        if payer_pct + payee_pct != 100:
            # normalize defensively
            total = max(payer_pct + payee_pct, 1)
            payer_pct = int(round(payer_pct * 100 / total))
            payee_pct = 100 - payer_pct

        payer_share = amount * payer_pct // 100
        payee_share = amount - payer_share

        data["status"] = DisputeStatus.RESOLVED
        data["ruling"] = str(ruling.get("reasoning", ""))
        data["payer_share"] = payer_share
        data["payee_share"] = payee_share
        self._save(case_id, data)

    # ----- read methods ------------------------------------------------

    @gl.public.view
    def get_case(self, case_id: u256) -> str:
        return self.cases.get(case_id, "")

    @gl.public.view
    def get_total_cases(self) -> u256:
        return self.case_count

    @gl.public.view
    def list_cases(self) -> str:
        out = []
        total = int(self.case_count)
        for i in range(total):
            raw = self.cases.get(u256(i), "")
            if raw:
                out.append(json.loads(raw))
        return json.dumps(out)
