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

// postMessage protocol: parent → iframe
export interface RunCodeMessage {
  type: "RUN_CODE";
  exampleId: string;
  libraryCode: string;
  exampleCode: string;
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

export interface SpecConversationTurn {
  question: string;
  answer: string;
}

export interface VersionedExample {
  id: string;
  name: string;
  code: string;
}


export interface SpecRequestBody {
  examples: { id: string; name: string; code: string }[];
  refinementInstruction: string;
  conversationHistory: SpecConversationTurn[];
}

export type SpecResponse =
  | { type: "question"; question: string }
  | { type: "update"; examples: { id: string; name: string; code: string }[] }
  | { type: "passthrough" };

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
  description?: string
  author?: string
  github?: string
  license: string
}

export interface ExportRequestBody {
  meta: ExportMeta
  libraryCode: string
  examples: { name: string; code: string }[]
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
