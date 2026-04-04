import Image from "next/image";

type BadgeCardProps = {
  name: string;
  description?: string | null;
  iconUrl: string;
  earnedAt?: string | null;
};

export function BadgeCard({ name, description, iconUrl, earnedAt }: BadgeCardProps) {
  return (
    <article className="rounded-2xl border border-[#0c0910]/10 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[#f7f9ff] p-2">
          <Image src={iconUrl} alt={name} width={48} height={48} className="h-12 w-12" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-[#0c0910]">{name}</h3>
          {description ? <p className="text-sm text-[#0c0910]/65">{description}</p> : null}
          {earnedAt ? <p className="text-xs text-[#0c0910]/50">Obtenu le {earnedAt}</p> : null}
        </div>
      </div>
    </article>
  );
}
