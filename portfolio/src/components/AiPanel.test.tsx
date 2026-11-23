import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiPanel } from "./AiPanel";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("AiPanel", () => {
  it("送信内容を確認すると、匿名設定を付けてプレビューを取得して表示する", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ provider: "Claude", external: true, text: "銘柄A | 日本株" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AiPanel reviews={[]} onReviewsChange={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "送信内容を確認" }));

    expect(await screen.findByLabelText("送信内容")).toHaveTextContent("銘柄A | 日本株");
    expect(screen.getByText(/外部 API/)).toBeInTheDocument();
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe("/api/ai/preview?revealNames=false");
  });

  it("レポート作成で onReviewsChange に新しい履歴を渡す", async () => {
    const reviews = [{ createdAt: "2026-11-23T00:00:00Z", text: "新しいレポート" }];
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ review: reviews[0], reviews })));
    const onReviewsChange = vi.fn();
    render(<AiPanel reviews={[]} onReviewsChange={onReviewsChange} />);

    await userEvent.click(screen.getByLabelText(/銘柄名を送る/));
    await userEvent.click(screen.getByRole("button", { name: "見直しレポートを作成" }));

    await vi.waitFor(() => expect(onReviewsChange).toHaveBeenCalledWith(reviews));
    const [, init] = (vi.mocked(fetch).mock.calls[0] as unknown[]) as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ revealNames: true });
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

  it("チャットは履歴を送り、回答を会話に追加する", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ text: "業種が偏っています" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AiPanel reviews={[]} onReviewsChange={() => {}} />);

    await userEvent.type(screen.getByLabelText("質問"), "偏りは?");
    await userEvent.click(screen.getByRole("button", { name: "送信" }));

    expect(await screen.findByText("業種が偏っています")).toBeInTheDocument();
    const [url, init] = (fetchMock.mock.calls[0] as unknown[]) as [string, RequestInit];
    expect(url).toBe("/api/ai/chat");
    expect(JSON.parse(String(init.body))).toEqual({ revealNames: false, messages: [{ role: "user", content: "偏りは?" }] });
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
