import { pnlTextClass } from "./ui";

describe("pnlTextClass", () => {
  it("利益(+)は緑、損失(−)は赤、0 は灰色", () => {
    expect(pnlTextClass(1)).toBe("text-gain");
    expect(pnlTextClass(-1)).toBe("text-loss");
    expect(pnlTextClass(0)).toBe("text-muted");
  });
});
