import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type AvatarItem = {
  src?: string | null;
  fallback: string;
  name: string;
};

const avatars = [
  {
    src: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png",
    fallback: "OS",
    name: "Olivia Sparks",
  },
  {
    src: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png",
    fallback: "HL",
    name: "Howard Lloyd",
  },
  {
    src: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png",
    fallback: "HR",
    name: "Hallie Richards",
  },
];

type AvatarGroupMaxDemoProps = {
  items?: AvatarItem[];
  max?: number;
  className?: string;
  extraLabel?: string;
};

const AvatarGroupMaxDemo = ({
  items = avatars,
  max = 3,
  className,
  extraLabel,
}: AvatarGroupMaxDemoProps) => {
  const visibleItems = items.slice(0, max);
  const extraCount = Math.max(items.length - max, 0);
  const extraText = extraLabel ?? (extraCount > 0 ? `+${extraCount}` : null);

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visibleItems.map((avatar, index) => (
        <Avatar key={`${avatar.name}-${index}`} className="ring-2 ring-white">
          <AvatarImage src={avatar.src ?? undefined} alt={avatar.name} />
          <AvatarFallback className="text-xs">{avatar.fallback}</AvatarFallback>
        </Avatar>
      ))}
      {extraText ? (
        <Avatar className="ring-2 ring-white">
          <AvatarFallback className="bg-[var(--color-surface-low)] text-xs text-[var(--color-text)]">{extraText}</AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
};

export default AvatarGroupMaxDemo;
