import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { childEnv, createClaudeCodeProvider, defaultRunner, renderTranscript, resolveClaudeCodePath, type Runner } from "./claudeCode";
import { AiError } from "./types";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "cc-test-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function provider(run: Runner) {
  return createClaudeCodeProvider({ run, resolvePath: async () => "claude", workDir: path.join(dir, "work") });
}

const request = { system: "システム", messages: [{ role: "user" as const, content: "質問" }], effort: "high" as const };

describe("Claude Code プロバイダー", () => {
  it("ツール無効・JSON 出力で CLI を呼び、プロンプトは標準入力で渡す", async () => {
    const run = vi.fn<Runner>(async () => ({ code: 0, stdout: JSON.stringify({ result: "回答", is_error: false }), stderr: "" }));
    await expect(provider(run).complete(request)).resolves.toBe("回答");

    const [command, args, options] = run.mock.calls[0];
    expect(command).toBe("claude");
    expect(args).toEqual(
      expect.arrayContaining(["-p", "--no-session-persistence", "--strict-mcp-config", "--model", "claude-opus-5-5", "--effort", "high"]),
    );
    expect(args[args.indexOf("--tools") + 1]).toBe("");
    expect(args[args.indexOf("--output-format") + 1]).toBe("json");
    expect(args[args.indexOf("--system-prompt") + 1]).toBe("システム");
    expect(options.input).toBe("質問");
    expect(options.cwd).toBe(path.join(dir, "work"));
  });

  it("API キーを子プロセスに渡さない(サブスクで動かすため)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-secret");
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "token");
    const run = vi.fn<Runner>(async () => ({ code: 0, stdout: JSON.stringify({ result: "ok" }), stderr: "" }));
    await provider(run).complete(request);

    const env = run.mock.calls[0][2].env;
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    expect(childEnv({ PATH: "x", ANTHROPIC_API_KEY: "k" })).toEqual({ PATH: "x" });
  });

  it("is_error はログイン確認を促す AiError にする", async () => {
    const run: Runner = async () => ({ code: 1, stdout: JSON.stringify({ result: "Not logged in", is_error: true }), stderr: "" });
    await expect(provider(run).complete(request)).rejects.toThrow(/Not logged in.*ログイン/);
  });

  it("JSON でない出力は stderr を含めた AiError にする", async () => {
    const run: Runner = async () => ({ code: 2, stdout: "", stderr: "unknown option" });
    await expect(provider(run).complete(request)).rejects.toThrow(/終了コード 2.*unknown option/);
  });

  it("CLI が見つからなければ CLAUDE_CODE_PATH の設定を案内する", async () => {
    const run: Runner = async () => {
      throw Object.assign(new Error("spawn claude ENOENT"), { code: "ENOENT" });
    };
    const p = provider(run).complete(request);
    await expect(p).rejects.toThrow(AiError);
    await expect(p).rejects.toThrow("CLAUDE_CODE_PATH");
  });
});

describe("defaultRunner", () => {
  it("多バイト文字がチャンクの境目で分かれても化けない", async () => {
    // 「預」(E9 A0 90)を 1 バイトと 2 バイトに分けて、間を空けて書き出す
    const script =
      "process.stdout.write(Buffer.from([0xe9]));" +
      "setTimeout(() => process.stdout.write(Buffer.from([0xa0, 0x90, 0x0a])), 50);" +
      "process.stdin.resume(); process.stdin.on('end', () => {});";
    const out = await defaultRunner(process.execPath, ["-e", script], {
      input: "",
      cwd: dir,
      env: process.env,
      timeoutMs: 10000,
    });
    expect(out.code).toBe(0);
    expect(out.stdout).toBe("預\n");
  });
});

describe("renderTranscript", () => {
  it("1件ならそのまま、複数なら履歴と新しい質問に分ける", () => {
    expect(renderTranscript([{ role: "user", content: "A" }])).toBe("A");
    const text = renderTranscript([
      { role: "user", content: "Q1" },
      { role: "assistant", content: "A1" },
      { role: "user", content: "Q2" },
    ]);
    expect(text).toContain("ユーザー: Q1\n\nアシスタント: A1");
    expect(text).toMatch(/新しい質問: Q2$/);
  });
});

describe("resolveClaudeCodePath", () => {
  it("CLAUDE_CODE_PATH を最優先する", async () => {
    await expect(resolveClaudeCodePath({ CLAUDE_CODE_PATH: " C:/x/claude.exe " }, dir)).resolves.toBe("C:/x/claude.exe");
  });

  it("VS Code 拡張の最新バージョンを選ぶ", async () => {
    for (const name of ["anthropic.claude-code-2.1.9-win32-x64", "anthropic.claude-code-2.1.330-win32-x64", "other.ext-9.9.9"]) {
      await mkdir(path.join(dir, name));
    }
    const resolved = await resolveClaudeCodePath({}, dir);
    expect(resolved).toContain("anthropic.claude-code-2.1.330-win32-x64");
    expect(resolved).toContain(path.join("resources", "native-binary"));
  });

  it("見つからなければ PATH 上の claude", async () => {
    await expect(resolveClaudeCodePath({}, path.join(dir, "none"))).resolves.toBe("claude");
  });
});
