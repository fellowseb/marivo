export function assertUnreachable(_: never): never {
  throw new Error("Unhandled logic case");
}
