"use client";

import { useId, useState } from "react";

import { CategoryIcon, categoryIconOptions } from "@/components/admin/category-icon";

const suggestedColors = [
  "#0F63FF",
  "#119DA4",
  "#453750",
  "#FFC857",
  "#E76F51",
  "#2A9D8F",
  "#264653",
  "#8B5CF6",
];

type CategoryFormFieldsProps = {
  defaultIcon?: string;
  defaultColor?: string;
};

export function CategoryFormFields({
  defaultIcon = "BookOpen",
  defaultColor = "#0F63FF",
}: CategoryFormFieldsProps) {
  const [icon, setIcon] = useState(defaultIcon);
  const [color, setColor] = useState(defaultColor);
  const radioName = useId();

  return (
    <>
      <input type="hidden" name="icon" value={icon} />

      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--color-text-dark)]">Icône</p>
          <p className="text-xs text-[var(--color-text-dark)]/60">Choisissez une icône visible dans tout le catalogue.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categoryIconOptions.map((option) => {
            const isSelected = icon === option.value;

            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition ${
                  isSelected
                    ? "border-[#0F63FF] bg-[var(--color-primary-bright)]/5 text-[var(--color-primary-bright)]"
                    : "border-[var(--color-text-dark)]/10 bg-white text-[var(--color-text-dark)]"
                }`}
              >
                <input
                  type="radio"
                  name={radioName}
                  className="sr-only"
                  checked={isSelected}
                  onChange={() => setIcon(option.value)}
                />
                <option.Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor={`${radioName}-color`} className="text-sm font-medium text-[var(--color-text-dark)]">
              Couleur hexadécimale
            </label>
            <p className="text-xs text-[var(--color-text-dark)]/60">
              Vous pouvez saisir un code précis ou repartir d’une suggestion.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              id={`${radioName}-color`}
              name="color"
              required
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-11 min-w-[160px] rounded-xl border border-[var(--color-text-dark)]/15 bg-white px-3 text-sm text-[var(--color-text-dark)]"
            />
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value.toUpperCase())}
              className="h-11 w-16 cursor-pointer rounded-xl border border-[var(--color-text-dark)]/15 bg-white p-1"
              aria-label="Choisir une couleur"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestedColors.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setColor(suggestion)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  color.toLowerCase() === suggestion.toLowerCase()
                    ? "border-[#0F63FF] bg-[var(--color-primary-bright)]/5 text-[var(--color-primary-bright)]"
                    : "border-[var(--color-text-dark)]/10 bg-white text-[var(--color-text-dark)]/70"
                }`}
              >
                <span
                  className="inline-flex h-3 w-3 rounded-full"
                  style={{ backgroundColor: suggestion }}
                  aria-hidden="true"
                />
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-[var(--color-text-dark)]/10 bg-[var(--color-surface-high)] p-4">
          <p className="text-sm font-medium text-[var(--color-text-dark)]">Aperçu</p>
          <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-[#0c0910]/8">
            <span
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${color}1A` }}
            >
              <CategoryIcon iconName={icon} className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-dark)]">Catégorie Akaa</p>
              <p className="text-xs text-[var(--color-text-dark)]/60">{icon} • {color.toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
