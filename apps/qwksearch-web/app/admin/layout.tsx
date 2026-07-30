import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const authorized = await isAdmin(session.user.email);
  if (!authorized) {
    redirect("/");
  }

  return <AdminNav>{children}</AdminNav>;
}
