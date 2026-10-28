import { createFileRoute, redirect } from "@tanstack/react-router";
import { commerceHead } from "@/lib/commerce-schema";
import { safeAccessReturn } from "@/lib/site-access";

export const Route = createFileRoute("/acesso-restrito")({
  validateSearch: (search: Record<string, unknown>) => ({ returnTo: safeAccessReturn(search["returnTo"]) }),
  head: () => commerceHead("Acesso à Empiria", "Conheça a Empiria e seus programas de formação jurídica prática."),
  beforeLoad: ({ search }) => { throw redirect({ href: safeAccessReturn(search.returnTo), replace: true }); },
});
