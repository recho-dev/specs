export function extractCodeFromBuffer(buffer: string): string {
  const fenceMatch = buffer.match(/^```(?:javascript|js)?\n?([\s\S]*?)\n?```\s*$/m);
  if (fenceMatch) return fenceMatch[1].trim();
  return buffer.trim();
}
