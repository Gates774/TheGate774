import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onTranscript: (text: string) => void;
}

export function VoiceRecorder({ onTranscript }: Props) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setBusy(true);
        try {
          const b64 = await blobToBase64(blob);
          const { data, error } = await supabase.functions.invoke("transcribe-voice", {
            body: { audio: b64, mimeType: blob.type },
          });
          if (error || !data?.ok) throw new Error(data?.error ?? "Transcription failed");
          onTranscript(String(data.text).trim());
          toast.success("Voice transcribed");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not transcribe");
        } finally {
          setBusy(false);
        }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      toast.error("Microphone permission denied");
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  return (
    <Button
      type="button"
      variant={recording ? "destructive" : "outline"}
      onClick={recording ? stop : start}
      disabled={busy}
      className="gap-2"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      {busy ? "Transcribing…" : recording ? "Stop recording" : "Record voice note"}
      {recording && <span className="ml-1 h-2 w-2 rounded-full bg-destructive-foreground animate-pulse" />}
    </Button>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = String(reader.result);
      resolve(s.split(",")[1] ?? s);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}