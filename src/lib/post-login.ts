/** Only persisted commercial records influence the post-login destination. */
export function postLoginDestination(account: {
  orders: readonly unknown[];
  enrollments: readonly unknown[];
}): "/cursos" | "/compras" {
  return account.orders.length > 0 || account.enrollments.length > 0
    ? "/compras"
    : "/cursos";
}