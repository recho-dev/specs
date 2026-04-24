export interface ParsedLibrary {
  packageJson: string;
  code: string;
}

const DEFAULT_PACKAGE_JSON = `{
  "name": "my-library",
  "version": "1.0.0"
}`;

export function parseLibraryOutput(buffer: string): ParsedLibrary {
  const stripped = stripFences(buffer.trim());

  const pkgMatch = stripped.match(/\/\/ FILE: package\.json\n([\s\S]*?)(?=\/\/ FILE:|$)/);
  const indexMatch = stripped.match(/\/\/ FILE: src\/index\.js\n([\s\S]*?)(?=\/\/ FILE:|$)/);

  if (pkgMatch && indexMatch) {
    return {
      packageJson: pkgMatch[1].trim(),
      code: indexMatch[1].trim(),
    };
  }

  // Fallback: treat entire output as src/index.js
  return {
    packageJson: DEFAULT_PACKAGE_JSON,
    code: stripped,
  };
}

function stripFences(buffer: string): string {
  const match = buffer.match(/^```(?:javascript|js|json)?\n?([\s\S]*?)\n?```\s*$/m);
  return match ? match[1].trim() : buffer;
}

export function getPackageName(packageJson: string): string {
  try {
    return JSON.parse(packageJson).name ?? "my-library";
  } catch {
    return "my-library";
  }
}
