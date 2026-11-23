import { jstDate, percent, yen } from "./format";

describe("format", () => {
  it("yen は円単位に丸める", () => {
    expect(yen(1234567.6)).toBe("￥1,234,568");
  });

  it("percent は小数1桁、signed なら + を付ける", () => {
    expect(percent(0.1234)).toBe("12.3%");
    expect(percent(0.05, { signed: true })).toBe("+5.0%");
    expect(percent(-0.05, { signed: true })).toBe("-5.0%");
  });

  it("jstDate は日本時間の日付を返す", () => {
    expect(jstDate(new Date("2026-11-22T15:30:00Z"))).toBe("2026-11-23");
  });
});
