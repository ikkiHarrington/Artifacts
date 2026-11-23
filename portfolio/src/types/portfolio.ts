export const ASSET_CLASSES = ["jp_stock", "fund", "cash", "other"] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  jp_stock: "日本株",
  fund: "投資信託",
  cash: "現金",
  other: "その他",
};

/** 価格が何口あたりか。投資信託の基準価額は 1万口あたり */
export const PRICE_UNITS: Record<AssetClass, number> = {
  jp_stock: 1,
  fund: 10000,
  cash: 1,
  other: 1,
};

export function isAssetClass(value: unknown): value is AssetClass {
  return typeof value === "string" && (ASSET_CLASSES as readonly string[]).includes(value);
}

/**
 * 保有1件。現金・その他は quantity=1、costPrice/currentPrice に金額を入れる。
 * 文字列の未設定は空文字。
 */
export interface Holding {
  id: string;
  assetClass: AssetClass;
  /** 銘柄コード(日本株は 4 桁など。投信・現金は任意) */
  code: string;
  name: string;
  /** 業種などの属性。マスク時に銘柄名の代わりに使う */
  sector: string;
  quantity: number;
  /** 取得単価(PRICE_UNITS あたり) */
  costPrice: number;
  /** 現在値(PRICE_UNITS あたり) */
  currentPrice: number;
  /** 現在値を更新した日時(ISO 8601)。未更新は空文字 */
  priceUpdatedAt: string;
}

/** 定期見直しのための時点の記録 */
export interface Snapshot {
  /** YYYY-MM-DD。同じ日のスナップショットは1件に上書きする */
  date: string;
  totalValue: number;
  totalCost: number;
  byClass: Record<AssetClass, number>;
}

/** AI による見直しレポート */
export interface Review {
  /** 作成日時(ISO 8601) */
  createdAt: string;
  text: string;
}

export interface PortfolioData {
  holdings: Holding[];
  snapshots: Snapshot[];
  /** 新しい順 */
  reviews: Review[];
}
