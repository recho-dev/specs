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

export interface Version {
  id: string;
  versionNumber: number;
  timestamp: number;
  libraryCode: string;
  examples: VersionedExample[];
  refinementPrompt: string;
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
