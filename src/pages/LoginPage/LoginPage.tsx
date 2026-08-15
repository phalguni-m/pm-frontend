import { PageHeader } from "@/components/primitives/PageHeader";

// Stub route — owned by Namana (auth). Backing endpoint: POST /api/auth/login
// (public — see docs/API_CONTRACT.md). Mounting a real form here is the only
// change needed; AuthLayout and the /login route are already wired.
export function LoginPage() {
  return <PageHeader title="Log in" />;
}
