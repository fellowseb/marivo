export function assertUnreachable(_shouldNotBe: never): never {
  throw new Error('Unhandled logic case');
}
