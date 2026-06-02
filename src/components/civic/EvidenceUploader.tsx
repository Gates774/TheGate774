import { useRef, useState } from "react";
import { Upload, X, Loader2, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  urls: string[];
  onChange: (urls: string[]) => void;
}

export function EvidenceUploader({ urls, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const next = [...urls];
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 20MB`);
          continue;
        }
        const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
        const { error } = await supabase.storage.from("report-evidence").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (error) {
          toast.error(`Upload failed: ${file.name}`);
          continue;
        }
        const { data: pub } = supabase.storage.from("report-evidence").getPublicUrl(path);
        next.push(pub.publicUrl);
      }
      onChange(next);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading} className="gap-2">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? "Uploading…" : "Add photo or video"}
      </Button>

      {urls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {urls.map((u, i) => (
            <div key={u} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
              {/\.(mp4|mov|webm)$/i.test(u) ? (
                <video src={u} className="h-full w-full object-cover" />
              ) : /\.(jpg|jpeg|png|gif|webp)$/i.test(u) ? (
                <img src={u} alt={`Evidence upload preview ${i + 1}`} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center"><FileImage className="h-6 w-6 text-muted-foreground" /></div>
              )}
              <button
                type="button"
                onClick={() => onChange(urls.filter((_, j) => j !== i))}
                aria-label="Remove evidence"
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}