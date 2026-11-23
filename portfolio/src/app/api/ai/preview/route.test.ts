import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { GET } from "./route";

describe("GET /api/ai/preview", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "portfolio-preview-"));
    // 架空のデータとプロンプトだけを使う。AI は呼ばない
    vi.stubEnv("AI_PROVIDER", "ollama");
    vi.stubEnv("PORTFOLIO_DATA_PATH", path.join(dir, "portfolio.json"));
    vi.stubEnv("PORTFOLIO_PROMPTS_DIR", dir);
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const preview = async () => (await GET(new Request("http://localhost/api/ai/preview?revealNames=true"))).json();

  it("プロンプトファイルの変更が、再起動なしで次の呼び出しに反映される", async () => {
    await writeFile(path.join(dir, "system.md"), "<!-- メモ -->\nシステム v1");
    expect((await preview()).prompts).toMatchObject({ system: "システム v1", source: { system: "file", review: "default" } });

    await writeFile(path.join(dir, "system.md"), "システム v2");
    expect((await preview()).prompts.system).toBe("システム v2");
  });
});
