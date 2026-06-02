import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: "discussion" | "chat" | "feed" | "complaint" | "initiative" | "search";
  className?: string;
}

const illustrations = {
  discussion: (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" className="fill-primary/5" />
      <circle cx="100" cy="100" r="60" className="fill-primary/10" />
      <rect x="50" y="70" width="60" height="40" rx="8" className="fill-primary/20" />
      <rect x="55" y="78" width="30" height="4" rx="2" className="fill-primary/40" />
      <rect x="55" y="86" width="45" height="4" rx="2" className="fill-primary/30" />
      <rect x="55" y="94" width="25" height="4" rx="2" className="fill-primary/30" />
      <rect x="90" y="100" width="60" height="40" rx="8" className="fill-primary/30" />
      <rect x="95" y="108" width="35" height="4" rx="2" className="fill-primary/50" />
      <rect x="95" y="116" width="45" height="4" rx="2" className="fill-primary/40" />
      <rect x="95" y="124" width="20" height="4" rx="2" className="fill-primary/40" />
      <circle cx="40" cy="90" r="12" className="fill-secondary" />
      <circle cx="160" cy="120" r="12" className="fill-secondary" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" className="fill-primary/5" />
      <path d="M60 80C60 71.16 67.16 64 76 64H124C132.84 64 140 71.16 140 80V110C140 118.84 132.84 126 124 126H90L70 142V126H76C67.16 126 60 118.84 60 110V80Z" className="fill-primary/20" />
      <circle cx="85" cy="95" r="5" className="fill-primary/50" />
      <circle cx="100" cy="95" r="5" className="fill-primary/50" />
      <circle cx="115" cy="95" r="5" className="fill-primary/50" />
      <circle cx="45" cy="140" r="20" className="fill-secondary/50" />
      <circle cx="155" cy="50" r="15" className="fill-secondary/30" />
      <circle cx="170" cy="130" r="10" className="fill-primary/10" />
    </svg>
  ),
  feed: (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" className="fill-primary/5" />
      <rect x="50" y="50" width="100" height="30" rx="6" className="fill-primary/15" />
      <rect x="56" y="58" width="50" height="4" rx="2" className="fill-primary/40" />
      <rect x="56" y="66" width="70" height="4" rx="2" className="fill-primary/25" />
      <rect x="50" y="90" width="100" height="50" rx="6" className="fill-primary/20" />
      <rect x="56" y="98" width="40" height="4" rx="2" className="fill-primary/45" />
      <rect x="56" y="106" width="80" height="4" rx="2" className="fill-primary/30" />
      <rect x="56" y="114" width="60" height="4" rx="2" className="fill-primary/30" />
      <rect x="56" y="128" width="20" height="6" rx="3" className="fill-primary/40" />
      <rect x="80" y="128" width="20" height="6" rx="3" className="fill-primary/40" />
      <rect x="50" y="150" width="100" height="20" rx="6" className="fill-secondary/30" />
      <circle cx="160" cy="60" r="12" className="fill-secondary/50" />
    </svg>
  ),
  complaint: (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" className="fill-primary/5" />
      <rect x="55" y="45" width="90" height="110" rx="8" className="fill-primary/15" />
      <rect x="65" y="60" width="70" height="6" rx="3" className="fill-primary/40" />
      <rect x="65" y="75" width="50" height="4" rx="2" className="fill-primary/25" />
      <rect x="65" y="85" width="60" height="4" rx="2" className="fill-primary/25" />
      <rect x="65" y="100" width="70" height="30" rx="4" className="fill-secondary/40" />
      <circle cx="100" cy="115" r="8" className="fill-primary/30" />
      <path d="M100 111V115M100 119H100.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="stroke-primary/50" />
      <circle cx="155" cy="80" r="18" className="fill-warning/20" />
      <path d="M155 72V80M155 88H155.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="stroke-warning" />
    </svg>
  ),
  initiative: (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" className="fill-primary/5" />
      <circle cx="100" cy="100" r="50" className="fill-primary/10" />
      <path d="M100 60L108 85H135L113 100L121 125L100 110L79 125L87 100L65 85H92L100 60Z" className="fill-primary/30" />
      <circle cx="100" cy="100" r="20" className="fill-primary/20" />
      <circle cx="50" cy="70" r="15" className="fill-secondary/40" />
      <circle cx="150" cy="130" r="12" className="fill-secondary/30" />
      <circle cx="45" cy="140" r="8" className="fill-primary/15" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" className="fill-primary/5" />
      <circle cx="90" cy="90" r="35" className="fill-primary/15" stroke="hsl(var(--primary))" strokeWidth="4" strokeOpacity="0.3" />
      <line x1="115" y1="115" x2="145" y2="145" className="stroke-primary/40" strokeWidth="6" strokeLinecap="round" />
      <rect x="60" y="80" width="30" height="4" rx="2" className="fill-primary/30" />
      <rect x="65" y="90" width="20" height="4" rx="2" className="fill-primary/20" />
      <circle cx="155" cy="60" r="10" className="fill-secondary/40" />
      <circle cx="50" cy="140" r="15" className="fill-secondary/30" />
    </svg>
  ),
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  illustration = "feed",
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6",
        className
      )}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="w-48 h-48 mb-6"
      >
        {illustrations[illustration]}
      </motion.div>
      
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"
      >
        <Icon className="h-7 w-7 text-primary" strokeWidth={1.75} />
      </motion.div>
      
      <motion.h3
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="text-xl font-heading font-semibold mb-2 text-center"
      >
        {title}
      </motion.h3>
      
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground text-center max-w-sm mb-6"
      >
        {description}
      </motion.p>
      
      {actionLabel && onAction && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <Button onClick={onAction} className="btn-civic gap-2">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
