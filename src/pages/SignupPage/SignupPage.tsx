import { PageHeader } from "@/components/primitives/PageHeader";

// Stub route — owned by Namana (auth). Backing endpoint: POST /api/auth/signup
// (public — see docs/API_CONTRACT.md). Mounting a real form here is the only
// change needed; AuthLayout and the /signup route are already wired.
export function SignupPage() {
  return <PageHeader title="Sign up" />;
}
