import { Building2, Landmark, MapPin, ArrowRight, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LEVEL_LABELS, type GovLevel } from "@/data/govResponsibilities";

export interface Analysis {
  level: GovLevel | string;
  category: string;
  mda: string;
  officer: string;
  rationale: string;
  next_steps: string[];
  contact: string;
}

const LEVEL_ICON: Record<string, typeof Landmark> = {
  exclusive: Landmark,
  concurrent: Building2,
  residual: MapPin,
};

export function VerdictCard({ analysis }: { analysis: Analysis }) {
  const level = (analysis.level as GovLevel) ?? "concurrent";
  const Icon = LEVEL_ICON[level] ?? Building2;
  const label = LEVEL_LABELS[level] ?? "Government";

  return (
    <Card className="border-primary/30 shadow-civic animate-slide-up">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <Badge variant="secondary" className="mb-1">{label}</Badge>
            <CardTitle className="text-xl leading-tight">{analysis.mda}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Category</div>
            <div className="font-medium">{analysis.category}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Responsible Officer</div>
            <div className="font-medium">{analysis.officer}</div>
          </div>
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed">{analysis.rationale}</p>

        {analysis.next_steps?.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Recommended next steps</div>
            <ul className="space-y-2">
              {analysis.next_steps.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" strokeWidth={2} />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.contact && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-secondary/40 text-sm">
            <Phone className="h-4 w-4 text-primary shrink-0" strokeWidth={1.75} />
            <span className="font-medium">Contact:</span>
            {analysis.contact.startsWith("http") ? (
              <a href={analysis.contact} target="_blank" rel="noreferrer" className="text-primary underline truncate">
                {analysis.contact}
              </a>
            ) : (
              <span className="truncate">{analysis.contact}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}