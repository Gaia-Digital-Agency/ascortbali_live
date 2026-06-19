import { withBasePath } from "../lib/paths";
import LoginForm from "../components/LoginForm";
import { PageMeta } from "../components/PageMeta";

export default function UserLoginPage() {
  return (
    <>
      <PageMeta
        title="Sign In — Bali Girls"
        description="Sign in to your Bali Girls member account."
        path="/user"
      />
      <LoginForm
        portal="user"
        label="USER LOGIN"
        defaultEmail="user@email.com"
        defaultPassword="User@123"
        emailLabel="USER ID"
        emailPlaceholder="name@email.com"
        redirectPath="/"
        roleCheck={(role) => role === "user"}
        roleErrorMessage="This account is not a user account."
        footer={
          <div className="text-center text-xs text-brand-muted">
            No account?{" "}
            <a href={withBasePath("/user/register")} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-brand-gold underline">
              Register here
            </a>
          </div>
        }
      />
    </>
  );
}
