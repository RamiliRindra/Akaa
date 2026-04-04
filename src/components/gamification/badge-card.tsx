import Image from "next/image";

type BadgeCardProps = {
  name: string;
  description?: string | null;
  iconUrl: string;
  earnedAt?: string | null;
};

export function BadgeCard({ name, description, iconUrl, earnedAt }: BadgeCardProps) {
  return (
    <article className="panel-card p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-[1.4rem] bg-[linear-gradient(135deg,rgba(255,200,87,0.18),rgba(101,86,112,0.08))] p-2.5">
          <Image src={iconUrl} alt={name} width={48} height={48} className="h-12 w-12" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display text-lg font-bold text-[#2c2f31]">{name}</h3>
          {description ? <p className="text-sm leading-6 text-[#2c2f31]/66">{description}</p> : null}
          {earnedAt ? <p className="text-xs font-medium text-[#775600]/80">Obtenu le {earnedAt}</p> : null}
        </div>
      </div>
    </article>
  );
}
