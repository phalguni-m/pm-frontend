import { PageHeader } from "@/components/primitives/PageHeader";

export interface NotFoundPageProps {
  message?: string;
}

export function NotFoundPage({ message = "This page doesn't exist." }: NotFoundPageProps) {
  return <PageHeader title="Not found" description={message} />;
}
