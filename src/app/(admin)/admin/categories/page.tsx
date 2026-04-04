import { redirect } from "next/navigation";

import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/actions/admin";
import { CategoryFormFields } from "@/components/admin/category-form-fields";
import { CategoryIcon } from "@/components/admin/category-icon";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

type AdminCategoriesPageProps = {
  searchParams: Promise<{
    type?: string;
    message?: string;
  }>;
};

export default async function AdminCategoriesPage({ searchParams }: AdminCategoriesPageProps) {
  const [feedback, session] = await Promise.all([searchParams, getCachedSession()]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const categories = await db.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      color: true,
      icon: true,
      order: true,
      isActive: true,
      _count: {
        select: {
          courses: true,
        },
      },
    },
  });

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#0c0910]">Catégories de formation</h2>
        <p className="text-sm text-[#0c0910]/70">
          Gérez le référentiel des catégories affichées dans le catalogue et dans le builder de cours.
        </p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <form
        action={createCategoryAction}
        className="grid gap-4 rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm lg:grid-cols-2"
      >
        <div className="space-y-2 lg:col-span-2">
          <h3 className="text-lg font-semibold text-[#0c0910]">Créer une catégorie</h3>
          <p className="text-sm text-[#0c0910]/60">
            Les catégories actives sont proposées aux formateurs lors de la création et de l’import des cours.
          </p>
        </div>

        <label className="space-y-2 text-sm font-medium text-[#0c0910]">
          Nom
          <input
            name="name"
            required
            className="form-input text-sm"
            placeholder="Marketing digital"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-[#0c0910]">
          Description
          <textarea
            name="description"
            rows={3}
            className="form-textarea text-sm"
            placeholder="Regroupe les cours orientés acquisition, marque et performance."
          />
        </label>

        <div className="lg:col-span-2">
          <CategoryFormFields />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Ordre
            <input
              name="order"
              required
              type="number"
              min="0"
              defaultValue="0"
              className="form-input text-sm"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            État
            <select
              name="isActive"
              defaultValue="true"
              className="form-select text-sm"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          className="primary-button px-4 py-2 text-sm font-semibold lg:col-span-2 lg:w-fit"
        >
          Ajouter la catégorie
        </button>
      </form>

      <div className="space-y-4">
        {categories.map((category) => (
          <article
            key={category.id}
            className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${category.color}1A`, color: category.color }}
              >
                <CategoryIcon iconName={category.icon} className="h-4 w-4" />
              </span>
              <span className="text-lg font-semibold text-[#0c0910]">{category.name}</span>
              <span className="rounded-full bg-[#0c0910]/5 px-2.5 py-1 text-xs font-medium text-[#0c0910]/70">
                {category.slug}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  category.isActive
                    ? "bg-[#119da4]/10 text-[#119da4]"
                    : "bg-[#c2410c]/10 text-[#c2410c]"
                }`}
              >
                {category.isActive ? "Active" : "Inactive"}
              </span>
              <span className="rounded-full bg-[#0F63FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0F63FF]">
                {category._count.courses} cours
              </span>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
              <form action={updateCategoryAction.bind(null, category.id)} className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                  Nom
                  <input
                    name="name"
                    required
                    defaultValue={category.name}
                    className="form-input text-sm"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-[#0c0910] lg:col-span-2">
                  Description
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={category.description ?? ""}
                    className="form-textarea text-sm"
                  />
                </label>

                <div className="lg:col-span-2">
                  <CategoryFormFields defaultIcon={category.icon} defaultColor={category.color} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    Ordre
                    <input
                      name="order"
                      required
                      type="number"
                      min="0"
                      defaultValue={category.order}
                      className="form-input text-sm"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    État
                    <select
                      name="isActive"
                      defaultValue={String(category.isActive)}
                      className="form-select text-sm"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </label>
                </div>

                <button
                  type="submit"
                  className="primary-button px-4 py-2 text-sm font-semibold lg:col-span-2 lg:w-fit"
                >
                  Enregistrer
                </button>
              </form>

              <form action={deleteCategoryAction.bind(null, category.id)} className="xl:self-start">
                <button
                  type="submit"
                  className="danger-button px-4 py-2 text-sm font-semibold"
                >
                  Supprimer
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
