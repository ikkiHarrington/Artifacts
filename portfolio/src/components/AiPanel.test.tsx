import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiPanel } from "./AiPanel";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("AiPanel", () => {
  it("銘柄名を送る設定は既定でオン。送信内容の確認でその設定を付けてプレビューを取得する", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ provider: "Claude", external: true, text: "テスト工業(9999) | 日本株" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AiPanel reviews={[]} onReviewsChange={() => {}} />);

    expect(screen.getByLabelText(/銘柄名を送る/)).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "送信内容を確認" }));

    expect(await screen.findByLabelText("送信内容")).toHaveTextContent("テスト工業(9999) | 日本株");
    expect(screen.getByText(/外部 API/)).toBeInTheDocument();
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe("/api/ai/preview?revealNames=true");
  });

  it("送信内容の確認で、プロンプトとその読み込み元も見られる", async () => {
    const prompts = {
      system: "データの読み方…",
      review: "レポートの構成…",
      source: { system: "file", review: "default" },
    };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ provider: "Claude", external: true, text: "データ", prompts })));
    render(<AiPanel reviews={[]} onReviewsChange={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "送信内容を確認" }));
    await userEvent.click(await screen.findByText("AI への指示(プロンプト)も見る"));

    expect(screen.getByLabelText("システムプロンプト")).toHaveTextContent("データの読み方…");
    expect(screen.getByText("システムプロンプト: prompts/system.md")).toBeInTheDocument();
    expect(screen.getByLabelText("レポートの指示")).toHaveTextContent("レポートの構成…");
    expect(screen.getByText("レポートの指示: 既定(prompts/review.md がないため)")).toBeInTheDocument();
  });

  it("レポート作成で onReviewsChange に新しい履歴を渡す。オフにすると匿名で送る", async () => {
    const reviews = [{ createdAt: "2026-11-23T00:00:00Z", text: "新しいレポート" }];
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ review: reviews[0], reviews })));
    const onReviewsChange = vi.fn();
    render(<AiPanel reviews={[]} onReviewsChange={onReviewsChange} />);

    await userEvent.click(screen.getByLabelText(/銘柄名を送る/));
    await userEvent.click(screen.getByRole("button", { name: "見直しレポートを作成" }));

    await vi.waitFor(() => expect(onReviewsChange).toHaveBeenCalledWith(reviews));
    const [, init] = (vi.mocked(fetch).mock.calls[0] as unknown[]) as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ revealNames: false });
  });

  it("最新のレポートと過去のレポートを表示する", () => {
    render(
      <AiPanel
        reviews={[
          { createdAt: "2026-11-23T00:00:00Z", text: "今週のレポート" },
          { createdAt: "2026-11-16T00:00:00Z", text: "先週のレポート" },
        ]}
        onReviewsChange={() => {}}
      />,
    );
    expect(screen.getByText("今週のレポート")).toBeVisible();
    expect(screen.getByText("過去のレポート(1件)")).toBeInTheDocument();
  });

  it("レポートは Markdown として表示し(記号を残さない)、大きく表示して Esc で閉じられる", async () => {
    render(
      <AiPanel
        reviews={[{ createdAt: "2026-11-23T00:00:00Z", text: "## 全体の状況\n集中度は **66.1%** です。\n- 現金 16%" }]}
        onReviewsChange={() => {}}
      />,
    );
    expect(screen.getByRole("heading", { name: "全体の状況" })).toBeInTheDocument();
    expect(screen.getByText("66.1%").tagName).toBe("STRONG");
    expect(screen.getByRole("listitem")).toHaveTextContent("現金 16%");
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "大きく表示" }));
    expect(screen.getByRole("dialog", { name: "見直しレポート" })).toHaveTextContent("集中度は 66.1% です。");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("チャットは履歴を送り、回答を会話に追加する", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ text: "業種が偏っています" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AiPanel reviews={[]} onReviewsChange={() => {}} />);

    await userEvent.type(screen.getByLabelText("質問"), "偏りは?");
    await userEvent.click(screen.getByRole("button", { name: "送信" }));

    expect(await screen.findByText("業種が偏っています")).toBeInTheDocument();
    const [url, init] = (fetchMock.mock.calls[0] as unknown[]) as [string, RequestInit];
    expect(url).toBe("/api/ai/chat");
    expect(JSON.parse(String(init.body))).toEqual({ revealNames: true, messages: [{ role: "user", content: "偏りは?" }] });
  });

  it("チャットが失敗したらエラーを表示し、質問を入力欄に戻す", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "API キーが設定されていません" }, 502)));
    render(<AiPanel reviews={[]} onReviewsChange={() => {}} />);

    await userEvent.type(screen.getByLabelText("質問"), "偏りは?");
    await userEvent.click(screen.getByRole("button", { name: "送信" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("API キーが設定されていません");
    expect(screen.getByLabelText("質問")).toHaveValue("偏りは?");
    expect(screen.queryByRole("list", { name: "会話" })).not.toBeInTheDocument();
  });
});
