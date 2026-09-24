/**
 * Safely resolves a nested property path from an object or array.
 * Supports dot notation ('a.b.c') and array/bracket notation ('items[0].name', 'data["title"]').
 *
 * @param obj The source object or collection to navigate.
 * @param path The key or dot/bracket path to resolve.
 * @returns The resolved value, or undefined if the path does not exist.
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (obj == null || !path) return undefined

  // Fast path: direct property access on the object
  if (typeof obj === "object" && obj !== null && path in (obj as Record<string, unknown>)) {
    return (obj as Record<string, unknown>)[path]
  }

  // Handle prefix matching for top-level keys that may contain special characters
  if (typeof obj === "object" && obj !== null) {
    const record = obj as Record<string, unknown>
    for (const key of Object.keys(record)) {
      if (path === key) return record[key]
      if (path.startsWith(`${key}.`)) {
        return getByPath(record[key], path.slice(key.length + 1))
      }
      if (path.startsWith(`${key}[`)) {
        return getByPath(record[key], path.slice(key.length))
      }
    }
  }

  // Normalize bracket notation: items[0].name -> items.0.name, items['key'] -> items.key
  const normalizedPath = path
    .replace(/\[\s*['"]?([^'"\]]+)['"]?\s*\]/g, ".$1")
    .replace(/^\./, "")

  const segments = normalizedPath.split(".").filter(Boolean)

  let current: any = obj
  for (const segment of segments) {
    if (current == null) {
      return undefined
    }
    current = current[segment]
  }

  return current
}

/**
 * Replaces placeholders like `{{ someNodeId.title }}` or `{{ someNodeId.items[0].name }}`
 * inside a field's string with values from a collection of node outputs.
 *
 * - If a placeholder resolves to `undefined` or `null`, replaces it with an empty string `""`.
 * - If it resolves to an object/array, drops in its JSON string (`JSON.stringify`).
 * - Otherwise, converts the resolved primitive to a string.
 *
 * @param text The input string containing template placeholders.
 * @param outputs Collection of node outputs from this workflow run, keyed by node ID.
 * @returns The interpolated string with all placeholders replaced.
 */
export function interpolate(
  text: string,
  outputs: Record<string, unknown> = {}
): string {
  if (typeof text !== "string") {
    return ""
  }

  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, expression: string) => {
    const trimmedPath = expression.trim()
    const value = getByPath(outputs, trimmedPath)

    if (value === undefined || value === null) {
      return ""
    }

    if (typeof value === "object") {
      try {
        return JSON.stringify(value)
      } catch {
        return ""
      }
    }

    return String(value)
  })
}
