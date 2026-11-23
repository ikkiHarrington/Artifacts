import { spawn } from "node:child_process";
import { mkdir, readdir } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { CLAUDE_MODEL } from "./claude";
import { AiError, type AiProvider, type ChatTurn, type CompletionRequest } from "./types";

/**
 * Claude Code の CLI(`claude -p`)経由で呼び出すプロバイダー。
 * claude.ai のサブスクリプションのログインで動くため、API の従量課金はかからない(サブスクの利用枠を使う)。
 *
 * - ツールはすべて無効(--tools "")。AI はファイルやコマンドに触れない
 * - 空の作業フォルダで実行し、リポジトリの CLAUDE.md などを読ませない
 * - ANTHROPIC_API_KEY などを子プロセスに渡さない(渡すと API キーで課金されるため)
 */

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

export type Runner = (command: string, args: string[], options: { input: string; cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number }) => Promise<RunResult>;

const TIMEOUT_MS = 5 * 60 * 1000;

/** API キーで認証させないため、子プロセスから外す環境変数 */
const STRIPPED_ENV = ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"];

export const defaultRunner: Runner = (command, args, { input, cwd, env, timeoutMs }) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new AiError(`Claude Code の応答が ${timeoutMs / 1000} 秒以内に返りませんでした。`));
    }, timeoutMs);
    // チャンクの境目で日本語の多バイト文字が分かれても化けないよう、文字列としてデコードして受け取る
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (d: string) => (stdout += d));
    child.stderr.on("data", (d: string) => (stderr += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    child.stdin.end(input, "utf8");
  });

/** "2.1.330" のようなバージョンを比較する */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * CLI の場所を決める。CLAUDE_CODE_PATH > VS Code 拡張に同梱の最新版 > PATH 上の claude。
 * 拡張は更新のたびにフォルダ名が変わるので、毎回探し直す。
 */
export async function resolveClaudeCodePath(
  env: Record<string, string | undefined> = process.env,
  extensionsDir = path.join(homedir(), ".vscode", "extensions"),
): Promise<string> {
  if (env.CLAUDE_CODE_PATH?.trim()) return env.CLAUDE_CODE_PATH.trim();

  let entries: string[] = [];
  try {
    entries = await readdir(/*turbopackIgnore: true*/ extensionsDir);
  } catch {
    // 拡張フォルダがなければ PATH に任せる
  }
  const latest = entries
    .map((name) => ({ name, version: /^anthropic\.claude-code-(\d+(?:\.\d+)*)/.exec(name)?.[1] }))
    .filter((e): e is { name: string; version: string } => e.version !== undefined)
    .sort((a, b) => compareVersions(b.version, a.version))[0];
  if (latest) {
    const exe = process.platform === "win32" ? "claude.exe" : "claude";
    return path.join(extensionsDir, latest.name, "resources", "native-binary", exe);
  }
  return "claude";
}

/** CLI は1つのプロンプトしか受け取らないので、会話履歴を1つのテキストにまとめる */
export function renderTranscript(messages: ChatTurn[]): string {
  if (messages.length === 1) return messages[0].content;
  const history = messages
    .slice(0, -1)
    .map((m) => `${m.role === "user" ? "ユーザー" : "アシスタント"}: ${m.content}`)
    .join("\n\n");
  return `これまでの会話:\n\n${history}\n\n---\n\n新しい質問: ${messages.at(-1)!.content}`;
}

export function buildArgs(system: string, effort: CompletionRequest["effort"]): string[] {
  return [
    "-p",
    "--output-format",
    "json",
    "--tools",
    "",
    "--no-session-persistence",
    "--strict-mcp-config",
    "--model",
    CLAUDE_MODEL,
    "--effort",
    effort,
    "--system-prompt",
    system,
  ];
}

export function childEnv(env: Record<string, string | undefined> = process.env): NodeJS.ProcessEnv {
  const copy = { ...env } as NodeJS.ProcessEnv;
  for (const key of STRIPPED_ENV) delete copy[key];
  return copy;
}

interface CliResult {
  result?: unknown;
  is_error?: unknown;
}

export function createClaudeCodeProvider(
  deps: { run?: Runner; resolvePath?: () => Promise<string>; workDir?: string } = {},
): AiProvider {
  const run = deps.run ?? defaultRunner;
  const resolvePath = deps.resolvePath ?? (() => resolveClaudeCodePath());
  const workDir = deps.workDir ?? path.join(tmpdir(), "portfolio-claude-code");

  return {
    name: `Claude Code(サブスク・${CLAUDE_MODEL})`,
    external: true,
    async complete({ system, messages, effort }) {
      const command = await resolvePath();
      await mkdir(/*turbopackIgnore: true*/ workDir, { recursive: true });

      let out: RunResult;
      try {
        out = await run(command, buildArgs(system, effort), {
          input: renderTranscript(messages),
          cwd: workDir,
          env: childEnv(),
          timeoutMs: TIMEOUT_MS,
        });
      } catch (e) {
        if (e instanceof AiError) throw e;
        if ((e as NodeJS.ErrnoException).code === "ENOENT") {
          throw new AiError(
            `Claude Code の CLI が見つかりません(${command})。portfolio/.env.local の CLAUDE_CODE_PATH に claude.exe のパスを設定してください。`,
          );
        }
        throw new AiError(`Claude Code を起動できませんでした: ${(e as Error).message}`);
      }

      let parsed: CliResult;
      try {
        parsed = JSON.parse(out.stdout) as CliResult;
      } catch {
        const detail = (out.stderr || out.stdout).trim().slice(0, 300);
        throw new AiError(`Claude Code の実行に失敗しました(終了コード ${out.code})。${detail}`);
      }
      const text = typeof parsed.result === "string" ? parsed.result : "";
      if (parsed.is_error === true) {
        throw new AiError(`Claude Code がエラーを返しました: ${text || "詳細不明"}(claude にログインしているか確認してください)`);
      }
      if (!text) throw new AiError("Claude Code から空の応答が返りました。");
      return text;
    },
  };
}
