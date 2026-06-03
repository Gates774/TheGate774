import { useRef, useState } from "react";
import { Upload, X, Loader2, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  /** Folder prefix in the bucket — typically the tracking code or a temp session id */
  folder: string;
  paths: string[];
  onChange: (paths: string[]) => void;
}

/**
 * Uploads to the PRIVATE `report-evidence` bucket. Anyone (incl. anonymous
 * reporters) can upload; only admins can read back. Stores object paths.
 */
export function ReportEvidenceUploader({ folder, paths, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const next = [...paths];
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 20MB`);
          continue;
        }
        const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const path = `${folder}/${crypto.randomUUID()}-${cleanName}`;
        const { error } = await supabase.storage
          .from("report-evidence")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          toast.error(`Upload failed: ${file.name}`);
          continue;
        }
        next.push(path);
      }
      onChange(next);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (i: number) => {
    const path = paths[i];
    onChange(paths.filter((_, j) => j !== i));
    void supabase.storage.from("report-evidence").remove([path]);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,application/pdf,audio/*"
        multiple
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="gap-2 rounded-xl"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? "Uploading…" : "Attach evidence (photo, video, audio, PDF)"}
      </Button>

      {paths.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {paths.map((p, i) => (
            <div
              key={p}
              className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center"
            >
              <div className="flex flex-col items-center text-center px-2">
                <FileImage className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground mt-1 truncate w-full">
                  {p.split("/").pop()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Remove evidence"
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Stored privately. Only authorised reviewers can open the files.
      </p>
    </div>
  );
}