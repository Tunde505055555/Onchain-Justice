import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getContractAddress,
  setContractAddress,
  clearContractAddress,
} from "@/lib/justice";
import { Settings2, ExternalLink } from "lucide-react";
import { EXPLORER_BASE } from "@/lib/genlayer";
import { toast } from "sonner";

export function ContractAddressDialog({ onChange }: { onChange?: () => void }) {
  const [open, setOpen] = useState(false);
  const [addr, setAddr] = useState("");
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(getContractAddress());
  }, [open]);

  const save = () => {
    const v = addr.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(v)) {
      toast.error("Enter a valid 0x… contract address");
      return;
    }
    setContractAddress(v);
    setCurrent(v);
    setAddr("");
    setOpen(false);
    onChange?.();
    toast.success("Contract linked");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          {current ? "Contract linked" : "Link contract"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-display text-2xl">Link your deployed contract</DialogTitle>
          <DialogDescription>
            Deploy <span className="text-mono text-primary">OnchainJustice.py</span> on{" "}
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              GenLayer Studio
            </a>
            , then paste the contract address below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            placeholder="0x…"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            className="text-mono"
          />
          {current && (
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
              <span className="text-mono truncate">{current}</span>
              <a
                href={`${EXPLORER_BASE}/contracts/${current}`}
                target="_blank"
                rel="noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
              >
                Explorer <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          {current && (
            <Button
              variant="ghost"
              onClick={() => {
                clearContractAddress();
                setCurrent(null);
                onChange?.();
              }}
            >
              Unlink
            </Button>
          )}
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
