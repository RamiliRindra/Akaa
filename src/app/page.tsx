import { redirect } from "next/navigation";

import { getHomePathForRole } from "@/lib/auth-config";
import { getCachedSession } from "@/lib/auth-session";

export default async function RootPage() {
  const session = await getCachedSession();
  if (session?.user) {
    redirect(getHomePathForRole(session.user.role));
  }
  redirect("/login");
}
