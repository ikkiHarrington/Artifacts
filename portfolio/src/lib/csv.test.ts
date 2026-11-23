import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("引用符内のカンマ・改行・エスケープを扱う", () => {
    expect(parseCsv('a,"1,234","x""y"\r\n"改\n行",b\r\n')).toEqual([
      ["a", "1,234", 'x"y'],
      ["改\n行", "b"],
    ]);
  });

  it("空行は空配列、最終行に改行がなくてもよい", () => {
    expect(parseCsv("a\r\n\r\nb,c")).toEqual([["a"], [], ["b", "c"]]);
  });
});
