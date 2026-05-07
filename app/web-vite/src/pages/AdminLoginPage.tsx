import { useEffect } from "react";
import { apiFetch } from "../lib/api";
import { withBasePath } from "../lib/paths";
import LoginForm from "../components/LoginForm";

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
  );
}
