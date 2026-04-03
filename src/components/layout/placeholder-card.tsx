type PlaceholderCardProps = {
  title: string;
  description: string;
};

export function PlaceholderCard({ title, description }: PlaceholderCardProps) {
  return (
    <section className="rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#0c0910]">{title}</h2>
      <p className="mt-2 text-sm text-[#0c0910]/70">{description}</p>
    </section>
  );
}
