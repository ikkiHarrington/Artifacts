import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { parsePortfolioData } from "./portfolio";
import type { PortfolioData } from "@/types/portfolio";

/** 保存先。PORTFOLIO_DATA_PATH で変更できる(既定は data/portfolio.json。.gitignore 済み) */
export function dataPath(): string {
  return process.env.PORTFOLIO_DATA_PATH || path.join(process.cwd(), "data", "portfolio.json");
}

export async function loadPortfolio(file = dataPath()): Promise<PortfolioData> {
  let text: string;
  try {
    text = await readFile(/*turbopackIgnore: true*/ file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { holdings: [], snapshots: [], reviews: [] };
    throw e;
  }
  try {
    return parsePortfolioData(JSON.parse(text));
  } catch {
    // 壊れたファイルを空データで上書きしないよう、読み込みエラーとして扱う
    throw new Error(`保存データを読み込めません(JSON が壊れています): ${file}`);
  }
}

/** 一時ファイルに書いてから置き換え、書き込み途中で壊れないようにする */
export async function savePortfolio(data: PortfolioData, file = dataPath()): Promise<void> {
  await mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(/*turbopackIgnore: true*/ tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(/*turbopackIgnore: true*/ tmp, file);
}
