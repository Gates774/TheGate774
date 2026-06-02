import { ShieldCheck, MapPin, Sparkles } from "lucide-react";
import logo from "@/assets/gate774-logo.webp";

export function ModuleFooter() {
  return (
    <footer className="relative mt-12 text-primary-foreground">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[hsl(var(--civic-green-dark))] via-primary to-[hsl(var(--civic-green-light))]" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="container max-w-5xl py-10 flex flex-col items-center text-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-lg">
            <img src={logo} alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
          </div>
          <div className="font-heading text-lg font-semibold">
            THE GATE<span className="align-super text-[10px]">®</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/85">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> 1999 Constitution</span>
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> 774 LGAs + 6 Area Councils</span>
          <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> AI-routed to the right MDA</span>
        </div>
        <div className="text-[11px] text-white/60 tracking-wide">
          © {new Date().getFullYear()} THE GATE® · Universal Participation: The Collectives
        </div>
      </div>
    </footer>
  );
}