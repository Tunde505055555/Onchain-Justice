import { useWallet, shortAddr } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from "lucide-react";
import { toast } from "sonner";

export function ConnectWalletButton() {
  const { address, connect, connecting, disconnect, hasWallet } = useWallet();

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-mono text-xs text-foreground/90 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_10px] shadow-success/60" />
          {shortAddr(address)}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={disconnect}
          aria-label="Disconnect wallet"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="default"
      onClick={async () => {
        try {
          await connect();
        } catch (e: any) {
          toast.error(e?.message ?? "Failed to connect wallet");
        }
      }}
      disabled={connecting}
      className="gap-2"
    >
      <Wallet className="h-4 w-4" />
      {connecting ? "Connecting…" : hasWallet ? "Connect wallet" : "Get a wallet"}
    </Button>
  );
}
