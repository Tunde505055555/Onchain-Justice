import { Case } from "@/lib/justice";
import { shortAddr, useWallet } from "@/lib/wallet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Scale, Lock, Gavel, CheckCircle2 } from "lucide-react";

const labels = ["Open", "Disputed", "Resolved"] as const;
const icons = [Lock, Gavel, CheckCircle2];

export function CaseCard({ c, onClick }: { c: Case; onClick: () => void }) {
  const { address } = useWallet();
  const me = address?.toLowerCase();
  const role =
    me === c.payer.toLowerCase() ? "You are payer"
    : me === c.payee.toLowerCase() ? "You are payee"
    : "Observer";
  const Icon = icons[c.status];

  const statusColor =
    c.status === 0 ? "bg-warning/15 text-warning border-warning/30"
    : c.status === 1 ? "bg-destructive/15 text-destructive border-destructive/30"
    : "bg-success/15 text-success border-success/30";

  const eth = (Number(c.amount) / 1e18).toFixed(4);

  return (
    <Card
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden border-border/60 bg-card/60 p-5 backdrop-blur transition-all hover:border-primary/40 hover:shadow-glow"
    >
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:opacity-100 opacity-50" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="text-mono text-xs text-muted-foreground">CASE #{c.id.toString().padStart(4, "0")}</span>
          </div>
          <h3 className="text-display text-2xl leading-tight line-clamp-2">
            {c.agreement.slice(0, 90)}
            {c.agreement.length > 90 ? "…" : ""}
          </h3>
        </div>
        <Badge variant="outline" className={`gap-1 ${statusColor}`}>
          <Icon className="h-3 w-3" />
          {labels[c.status]}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground">Payer</div>
          <div className="text-mono">{shortAddr(c.payer)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Payee</div>
          <div className="text-mono">{shortAddr(c.payee)}</div>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Escrow</div>
          <div className="text-display text-2xl text-gradient-gold">{eth} GEN</div>
        </div>
        <span className="text-xs text-muted-foreground">{role}</span>
      </div>
    </Card>
  );
}
