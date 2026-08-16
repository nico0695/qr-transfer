/** Joins truthy class names with a space — the one place this repeated across primitives. */
export function cx(...classes: Array<string | false | undefined | null>): string {
  return classes.filter(Boolean).join(' ')
}
