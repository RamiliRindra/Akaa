/**
 * Types et constantes d'état pour les Server Actions `generateApiTokenAction`
 * et `revokeApiTokenAction`.
 *
 * Ce fichier existe à part parce qu'un fichier Next.js 16 marqué
 * `"use server"` ne peut exporter que des **fonctions async**. Les
 * constantes d'état initial (`initial*State`) et les types d'état sont donc
 * isolés ici pour pouvoir être importés depuis les client components ET
 * depuis le fichier d'actions sans casser la contrainte.
 */

export type GenerateApiTokenState =
  | { status: "idle" }
  | {
      status: "success";
      token: string;
      userEmail: string;
      userName: string | null;
      generatedAt: string;
    }
  | { status: "error"; error: string };

export type RevokeApiTokenState =
  | { status: "idle" }
  | { status: "success"; userEmail: string }
  | { status: "error"; error: string };

export const initialGenerateApiTokenState: GenerateApiTokenState = {
  status: "idle",
};

export const initialRevokeApiTokenState: RevokeApiTokenState = {
  status: "idle",
};
