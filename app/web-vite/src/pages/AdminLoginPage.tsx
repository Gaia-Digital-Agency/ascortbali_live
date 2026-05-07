import { useEffect } from "react";
import { apiFetch } from "../lib/api";
import { withBasePath } from "../lib/paths";
import LoginForm from "../components/LoginForm";
import { PageMeta } from "../components/PageMeta";

export default function AdminLoginPage() {
  useEffect(() => {
    (async () => {
      try {
        const profile = await apiFetch("/me");
        if (profile.role === "admin") {
          window.location.href = withBasePath("/admin/logged");
        }
      } catch {
        // not logged in, show form
      }
    })();
  }, []);

  return (
    <>
      <PageMeta
        title="Admin — Bali Girls"
        description="Admin login."
        path="/admin"
        index={false}
      />
      <LoginForm
        portal="admin"
        label="ADMIN"
        defaultEmail="admin@email.com"
        defaultPassword="Admin@123"
        emailLabel="USERNAME"
        emailPlaceholder="admin"
        redirectPath="/admin/logged"
        roleCheck={(role) => role === "admin"}
        roleErrorMessage="This account is not an admin."
      />
    </>
  );
}
