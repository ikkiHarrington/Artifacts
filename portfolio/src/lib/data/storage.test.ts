import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadPortfolio, savePortfolio } from "./storage";
import type { PortfolioData } from "@/types/portfolio";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "portfolio-test-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("storage", () => {
  it("ファイルがなければ空データ", async () => {
    await expect(loadPortfolio(path.join(dir, "none.json"))).resolves.toEqual({ holdings: [], snapshots: [], reviews: [] });
  });

  it("保存したデータを読み戻せる(ディレクトリも作る)", async () => {
    const file = path.join(dir, "sub", "p.json");
    const data: PortfolioData = {
      holdings: [
        {
          id: "a",
          assetClass: "cash",
          code: "",
          name: "預金",
          sector: "",
          quantity: 1,
          costPrice: 100,
          currentPrice: 100,
          priceUpdatedAt: "",
        },
      ],
      snapshots: [],
      reviews: [],
    };
    await savePortfolio(data, file);
    await expect(loadPortfolio(file)).resolves.toEqual(data);
  });

  it("壊れた JSON は空データにせずエラーにする(上書き事故を防ぐ)", async () => {
    const file = path.join(dir, "broken.json");
    await writeFile(file, "{not json", "utf8");
    await expect(loadPortfolio(file)).rejects.toThrow("壊れています");
  });
});
