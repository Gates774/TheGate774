import { useRef, useState } from "react";
import { Upload, X, Loader2, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  userId: string;
  paths: string[];
  onChange: (paths: string[]) => void;
}

/**
 * Uploads complaint evidence to the PRIVATE `complaint-evidence` bucket,
 * under `<user_id>/<uuid>-<filename>` so RLS storage policies match.
 * Stores object PATHS (not URLs); previews are generated via short-lived signed URLs.
 */
export function ComplaintEvidenceUploader({ userId, paths, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});

  const refreshPreview = async (path: string) => {
    const { data } = await supabase.storage
      .from("complaint-evidence")
      .createSignedUrl(path, 60 * 10);
    if (data?.signedUrl) {
      setSigned((s) => ({ ...s, [path]: data.signedUrl }));
    }
  };

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
        const path = `${userId}/${crypto.randomUUID()}-${cleanName}`;
        const { error } = await supabase.storage
          .from("complaint-evidence")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          toast.error(`Upload failed: ${file.name}`);
          continue;
        }
        next.push(path);
        void refreshPreview(path);
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
    // best-effort delete from storage
    void supabase.storage.from("complaint-evidence").remove([path]);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,application/pdf"
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
        {uploading ? "Uploading…" : "Attach evidence (photo, video, PDF)"}
      </Button>

      {paths.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {paths.map((p, i) => {
            const url = signed[p];
            const isVideo = /\.(mp4|mov|webm)$/i.test(p);
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(p);
            return (
              <div
                key={p}
                className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
              >
                {url && isVideo ? (
                  <video src={url} className="h-full w-full object-cover" />
                ) : url && isImage ? (
                  <img src={url} alt={`Evidence ${i + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <FileImage className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label="Remove evidence"
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Files are stored privately. Only you and authorised reviewers can access them.
      </p>
    </div>
  );
}