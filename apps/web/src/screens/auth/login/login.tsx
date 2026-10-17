import { AuthLayout } from "./AuthLayout";
import { LoginFormCard } from "./LoginFormCard";
import { useLoginTenant } from "./useLoginTenant";
import "./platform-login.css";

export function LoginScreen() {
  const { data: tenant } = useLoginTenant();
  const variant = tenant === null ? "platform" : "default";

  return (
    <AuthLayout variant={variant}>
      <LoginFormCard variant={variant} />
    </AuthLayout>
  );
}
