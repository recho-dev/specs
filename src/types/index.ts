export type ExampleStatus = "idle" | "running" | "pass" | "fail";

export interface ConsoleLine {
  level: "log" | "warn" | "error" | "info";
  args: string[];
  timestamp: number;
}

export interface Example {
  id: string;
  name: string;
  code: string;
  status: ExampleStatus;
  error: string | null;
  consoleOutput: ConsoleLine[];
}

export interface LibraryState {
  code: string;
  isGenerating: boolean;
  generationError: string | null;
  streamBuffer: string;
}

// postMessage protocol: iframe → parent
export interface RunResultMessage {
  type: "RUN_RESULT";
  exampleId: string;
  status: "pass" | "fail";
  error: string | null;
}

export interface ConsoleMessage {
  type: "CONSOLE";
  exampleId: string;
  level: ConsoleLine["level"];
  args: string[];
}

export type SandboxInboundMessage = RunResultMessage | ConsoleMessage;

export interface GenerateRequestBody {
  examples: { name: string; code: string }[];
  currentLibraryCode: string;
  refinementInstruction: string;
  failedExamples: { name: string; code: string; error: string }[];
}

export interface VersionedExample {
  id: string;
  name: string;
  code: string;
}

export interface Version {
  id: string
  versionNumber: number
  timestamp: number
  description: string
  libraryCode: string
  examples: VersionedExample[]
}

export interface ExportMeta {
  name: string
  version?: string
  description?: string
  author?: string
  github?: string
  license: string
}

export interface ExportRequestBody {
  meta: ExportMeta
  libraryCode: string
  examples: { name: string; code: string }[]
  previewFiles?: PreviewFile[]
  readmeContent?: string
}

export type ExportResult =
  | { ok: true; exportPath: string }
  | { ok: false; error: string }

export interface ProjectFile {
  examples: VersionedExample[]
  libraryCode: string
  activeExampleId: string | null
  viewingLibrary: boolean
  versions: Version[]
  exportMeta?: ExportMeta
}

export interface LoadedProject {
  filePath: string | null
  file: ProjectFile
}

export interface SummarizeRequestBody {
  refinementPrompt: string
  previousLibraryCode: string
  currentLibraryCode: string
  previousExamples: VersionedExample[]
  currentExamples: VersionedExample[]
}

// ── Chat agent types ──────────────────────────────────────────────────────────

export interface ExamplesDiff {
  added: { id: string; name: string }[]
  removed: { id: string; name: string }[]
  modified: { id: string; name: string }[]
}

export interface ChatRequestBody {
  instruction: string
  mode: 'generate' | 'chat'
  examples: { id: string; name: string; code: string; error?: string | null }[]
  libraryCode: string
  diff: ExamplesDiff
}

export type ChatAction =
  | { tool: 'update_library' }
  | { tool: 'add_example'; name: string; code: string }
  | { tool: 'delete_example'; id: string }
  | { tool: 'optimize_example'; id: string; code: string }
  | { tool: 'rename_example'; id: string; name: string }

export type ChatPlan =
  | { type: 'answer'; text: string }
  | { type: 'actions'; steps: ChatAction[]; note?: string }

export interface FileDiff {
  name: string
  before: string
  after: string
  kind: 'added' | 'removed' | 'modified'
}

export interface PreviewFile {
  path: string
  content: string
}

export interface PreviewSyncRequest {
  meta: ExportMeta
  libraryCode: string
  examples: { name: string; code: string }[]
}

export interface GenerateReadmeRequest {
  meta: ExportMeta
  examples: { name: string; code: string }[]
}
