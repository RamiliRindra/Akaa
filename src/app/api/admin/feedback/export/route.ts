import { UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { buildFeedbackWhere, parseFeedbackAdminSearchParams } from "@/lib/feedback-admin-filters";
import { db } from "@/lib/db";

const MAX_ROWS = 5000;

function escapeCsv(s: string | null | undefined): string {
  const v = String(s ?? "").replace(/"/g, '""');
  if (/[",\n\r]/.test(v)) {
    return `"${v}"`;
  }
  return v;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return new Response("Non autorisé", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseFeedbackAdminSearchParams(raw);
  const where = buildFeedbackWhere(filters);

  const rows = await db.feedback.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: MAX_ROWS,
    select: {
      id: true,
      kind: true,
      rating: true,
      comment: true,
      updatedAt: true,
      targetKey: true,
      user: { select: { name: true, email: true } },
      course: { select: { id: true, title: true, slug: true } },
    },
  });

  const header = [
    "id",
    "mis_a_jour_iso",
    "type",
    "note",
    "utilisateur_nom",
    "utilisateur_email",
    "cours_id",
    "cours_titre",
    "cours_slug",
    "target_key",
    "commentaire",
  ];

  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        escapeCsv(r.id),
        escapeCsv(r.updatedAt.toISOString()),
        escapeCsv(r.kind),
        String(r.rating),
        escapeCsv(r.user.name),
        escapeCsv(r.user.email),
        escapeCsv(r.course?.id ?? ""),
        escapeCsv(r.course?.title ?? ""),
        escapeCsv(r.course?.slug ?? ""),
        escapeCsv(r.targetKey),
        escapeCsv(r.comment),
      ].join(","),
    ),
  ];

  const csv = `\uFEFF${lines.join("\n")}`;
  const filename = `feedback-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
