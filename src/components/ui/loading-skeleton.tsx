import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function PostSkeleton() {
  return (
    <Card className="card-civic overflow-hidden">
      <CardHeader className="flex-row items-start gap-4 space-y-0">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="pt-4">
        <div className="flex items-center justify-between w-full">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </CardFooter>
    </Card>
  );
}

export function ComplaintSkeleton() {
  return (
    <Card className="card-civic">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16 font-mono" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex items-center gap-4 pt-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DiscussionSkeleton() {
  return (
    <Card className="card-civic">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ChatChannelSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  );
}

export function ChatMessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[70%] space-y-2 rounded-2xl px-4 py-3",
        isOwn ? "bg-primary/10" : "bg-muted"
      )}>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-28" />
        <div className="flex justify-end">
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

export function InitiativeSkeleton() {
  return (
    <Card className="card-civic">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-4">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      </div>
      <Separator />
      <div className="space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  variant: "post" | "complaint" | "discussion" | "chat-channel" | "chat-message" | "initiative";
  className?: string;
}

export function SkeletonList({ count = 3, variant, className }: SkeletonListProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i);
  
  const SkeletonComponent = {
    post: PostSkeleton,
    complaint: ComplaintSkeleton,
    discussion: DiscussionSkeleton,
    "chat-channel": ChatChannelSkeleton,
    "chat-message": ChatMessageSkeleton,
    initiative: InitiativeSkeleton,
  }[variant];

  return (
    <div className={cn("space-y-4", className)}>
      {skeletons.map((i) => (
        <SkeletonComponent key={i} />
      ))}
    </div>
  );
}
