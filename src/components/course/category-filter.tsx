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
    <div className="flex flex-wrap gap-2">
      <Link
        href="/courses"
        className={`rounded-full px-3 py-1.5 text-sm font-medium ${
          !activeSlug ? "bg-[#0F63FF] text-white" : "bg-white text-[#0c0910] ring-1 ring-[#0c0910]/10"
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
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              isActive ? "bg-[#0F63FF] text-white" : "bg-white text-[#0c0910] ring-1 ring-[#0c0910]/10"
            }`}
          >
            {category.name}
          </Link>
        );
      })}
    </div>
  );
}

