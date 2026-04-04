import { Spinner } from "@/components/ui/spinner";

type SectionLoadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionLoading({ eyebrow, title, description }: SectionLoadingProps) {
  return (
    <div className="app-shell-bg flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="glass-panel ambient-ring flex w-full max-w-md flex-col items-center gap-4 px-8 py-10 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-[linear-gradient(135deg,rgba(0,80,214,0.12),rgba(15,99,255,0.18))] text-[#0050d6]">
          <Spinner className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <p className="editorial-eyebrow">{eyebrow}</p>
          <h2 className="font-display text-2xl font-black text-[#2c2f31]">{title}</h2>
          <p className="text-sm leading-6 text-[#2c2f31]/68">{description}</p>
        </div>
      </div>
    </div>
  );
}
