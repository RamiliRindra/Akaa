import Link from "next/link";

type CategoryFilterItem = {
  id: string;
  name: string;
  slug: string;
};

type CategoryFilterProps = {
  categories: CategoryFilterItem[];
  activeSlug?: string;
};

export function CategoryFilter({ categories, activeSlug }: CategoryFilterProps) {
  return (
    <div className="surface-section px-4 py-4 sm:px-5">
      <div className="flex flex-wrap gap-2">
      <Link
        href="/courses"
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          !activeSlug
            ? "bg-[linear-gradient(135deg,#0050d6,#0f63ff)] !text-white shadow-[0_18px_28px_-22px_rgba(0,80,214,0.9)] hover:!text-white"
            : "bg-white/85 text-[#2c2f31] ring-1 ring-[#2c2f31]/8 hover:bg-white"
        }`}
      >
        Tous
      </Link>
      {categories.map((category) => {
        const isActive = activeSlug === category.slug;
        return (
          <Link
            key={category.id}
            href={`/courses?category=${category.slug}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-[linear-gradient(135deg,#0050d6,#0f63ff)] !text-white shadow-[0_18px_28px_-22px_rgba(0,80,214,0.9)] hover:!text-white"
                : "bg-white/85 text-[#2c2f31] ring-1 ring-[#2c2f31]/8 hover:bg-white"
            }`}
          >
            {category.name}
          </Link>
        );
      })}
      </div>
    </div>
  );
}
