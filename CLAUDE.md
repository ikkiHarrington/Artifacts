# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## リポジトリ構成

- `taskboard/` — メインのアプリ。Next.js(App Router、Turbopack)+ React + Tailwind v4 のカンバンボード。以下のコマンドはすべてこのディレクトリで実行する。
- `taskapp/index.html` — 以前作られた単一ファイルのタスクアプリ。`taskboard/` とは独立している。
- `portfolio/` — 資産(株式中心)をローカルで見直すダッシュボード。構成・コマンドは taskboard と同じ(dev は `127.0.0.1:3001`)。保有データは `portfolio/data/`(`.gitignore` 済み)に保存し、**絶対にコミットしない**。AI にはマスク済みデータだけを送る方針(ローカル AI はスタブで差し替え可能にする)。マスクは `src/lib/mask.ts`(割合・損益率・指数のみ。金額・数量・単価・id は送らない)で、送信内容を変えるときは `mask.test.ts` の「含まない」テストも更新する。AI 実装は `src/lib/ai/`(`AiProvider` を `AI_PROVIDER` で切り替え。`claude`=API キー、`claude-code`=サブスクで `claude -p` を呼ぶ、`ollama`=スタブ)。`claude-code` では子プロセスに `ANTHROPIC_API_KEY` を渡さない(渡すと API 課金になる)。楽天証券 CSV の取り込みは `src/lib/rakutenCsv.ts`(取り込んだ保有は `source: "rakuten"` で見分けて再取り込み時に入れ替える)。アプリの AI には銘柄名と比率を送ってよい(「銘柄名を送る」は既定オン。金額・数量・単価・総資産額は常に送らない)。一方、開発作業をする Claude はユーザーの実データ(`portfolio/data/` の CSV・`portfolio.json` など)を、マスクした形でも読まない・開かない・集計しない(ユーザーの条件)。動作確認は `PORTFOLIO_DATA_PATH` をスクラッチパッドに向け、`rakutenCsv.fixture.ts` などの架空データだけで行う。実データでしか確かめられないことは、ユーザーに実行してもらい結果を聞く。有料 API を使うため、AI の呼び出しはボタン操作による手動実行だけにする(定期実行・画面表示時の自動実行・価格更新に連動した呼び出しは追加しない。ユーザーの要望)。AI の回答(レポート・チャット)は `src/components/Markdown.tsx` で Markdown として描画し、`**` などの記号を生のまま見せない(ユーザーの指摘。HTML として埋め込まず React 要素で描画する)。損益の色は、利益(+)を緑、損失(−)を赤にする(ユーザーの指定。色は `globals.css` の `--color-gain` / `--color-loss`、使い分けは `ui.ts` の `pnlTextClass`。色だけに頼らず符号も付ける)。ポート 3001 が応答しているときはユーザーが実データで起動しているので、ブラウザで開かない。Next.js は同じフォルダで開発サーバーを2つ起動できないため、その間の画面確認はテストで行うか、ユーザーに確認してもらう。
- Windows の Git Bash から `npx vitest` を実行すると「failed to find the current suite」で失敗することがある(パス表記の違いが原因)。テストは PowerShell から実行する。

## コマンド(`taskboard/` で実行)

```bash
npm run dev          # next dev --turbopack(http://localhost:3000)
npm run build        # next build --turbopack
npm run lint         # eslint(フラット設定 eslint.config.mjs)
npm test             # vitest run(全テストを1回実行)
npm run test:watch   # vitest ウォッチモード
npx vitest run src/lib/taskReducer.test.ts          # 単一テストファイル
npx vitest run -t "テスト名"                          # 名前指定で単一テスト
```

## Next.js バージョンに関する注意

`taskboard/AGENTS.md` によると、この Next.js(16.x)には学習データと異なる破壊的変更がある。Next.js 固有のコードを書く前に、`taskboard/node_modules/next/dist/docs/` の該当ガイドを読み、非推奨の通知に従うこと。(`next dev` がこの AGENTS.md のブロックを再生成するため、削除せずコミットすること。)

## アーキテクチャ

状態は純粋なリデューサーに集約し、その上に薄い層を重ねる構成になっている。列は `未着手 / 進行中 / 保留 / 完了` の4つ。

- `src/types/task.ts` — `Task`(`assignee` / `priority` / `dueDate` を含む。未設定は空文字、優先度の既定は `medium`、期限は `YYYY-MM-DD`)、`TaskStatus`、列の順序を決める `STATUSES` タプル、`STATUS_LABELS`(UI ラベルは日本語)、`PRIORITIES` / `PRIORITY_LABELS`、型ガード `isTaskStatus` / `isTaskPriority`。ステータスを追加するときは `STATUSES` と `STATUS_LABELS` を更新する。`Board` は `STATUSES` の各要素ごとに `Column` を1つ描画する。
- `src/lib/taskReducer.ts` — 純粋なロジック。`taskReducer`(`add` / `move` アクション)、`createTask`(トリム処理を行い、タイトルが空なら `null` を返す。新規タスクは `todo` から始まる。第4引数で担当者・優先度・期限を受け取り、不正な値は既定値に落とす)、`filterByStatus`、`isOverdue`(期限が今日より前で未完了なら true)、`filterTasks` / `EMPTY_FILTER`(タイトル・説明の検索と担当者・優先度の絞り込みを AND で適用)、`listAssignees`。React なしで単体テストできる。
- `src/lib/taskStorage.ts` — localStorage(キー `taskboard:tasks:v1`)を裏に持つ `useSyncExternalStore` 用ストア `createTaskStore`。`dispatch` は `taskReducer` を通して保存・通知し、`getServerSnapshot` は SSR/ハイドレーションで常に空配列を返す。保存データは `parseTasks` で1件ずつ検証・正規化する(壊れたデータや旧形式は既定値で補う)。localStorage が使えない、または書き込みに失敗してもメモリ上で動作し続け、他タブの `storage` イベントも取り込む。
- `src/hooks/useTasks.ts` — `createTaskStore` を `useSyncExternalStore` で購読する。`addTask`(`crypto.randomUUID()` で id を生成し、入力が不正なら `false` を返す)と `moveTask` を公開する。ストアはモジュールスコープではなくフックのインスタンスごとに作る(テストで状態が漏れないようにするため)。バックエンドはない。
- `src/components/` — クライアントコンポーネント(`"use client"`)。`Board` がフックと絞り込み条件(永続化しない `useState`)を保持し、絞り込み後の `tasks` / `onDropTask` を下に渡す。`TaskFilters` は検索・絞り込みの入力。`Column` は HTML5 ドラッグ&ドロップのドロップ先。`TaskCard` はドラッグ元で、`Column` と共有する dataTransfer のキー `DRAG_MIME` をエクスポートする。`TaskForm` は `onAdd` を呼ぶ。
- `src/app/` — App Router のエントリ(`layout.tsx`、`page.tsx`)。`Board` を描画する。

## 成果物のコミット・push

成果物ができたら、ユーザーに頼まれなくてもコミットして push する。確認は不要(この項目が常時の許可にあたる)。

- 対象:Claude が作成・更新した成果物(コード、ドキュメント、スキルやルールのファイルなど)。調査メモなど作業用の一時ファイルや、スクラッチパッドの中身は対象外。
- push 先:現在のブランチが main なら、ブランチを切らずに main へ直接 push する。
- 作業ブランチ:ユーザーが明示的に指定したときだけ作成する。指定がなければ、作業ブランチは作らない(ブランチの運用をユーザーが管理するため)。
- add:作った・変えたファイルを個別に指定する。`git add .` や `git add -A` は使わない。既存の未追跡ファイル(`.claude/agents/`、`reports/`、`research_notes/` など)や、ユーザーが触っている変更は含めない。
- コミットメッセージ:英語の命令形で1行目を書き、必要なら本文で理由を補う。末尾に Co-Authored-By の行を付ける。
- コードの成果物:`npm test` と `npm run lint`(`taskboard/` で実行)が通ってからコミットする。失敗したら push せず、失敗の内容をユーザーに伝える。
- 次の場合は push しない。ユーザーに確認する。
  - 秘密情報の疑いがあるファイル(`.env`、認証情報など)が含まれる
  - 強制 push(`--force`)や履歴の書き換えが必要
  - push が拒否された(リモートに新しいコミットがある場合など)
- 完了したら、コミットのハッシュと push 先をユーザーに短く報告する。

## 再利用できるスクリプト

作業のためにスクリプトを書くとき、今後も使いそうなら、使い捨てにせず再利用しやすい形で作って push する(上の「成果物のコミット・push」に従う)。

- 置き場所:リポジトリ直下の `scripts/`。その場限りの使い捨て(一度きりの確認など)はスクラッチパッドに置き、push しない。
- 再利用しやすくする作り:
  - 入力・出力のパスや値は、コードに埋め込まず引数で受け取る。
  - 先頭に、目的・使い方・引数・実行例をコメントで書く。
  - 依存(Python のパッケージなど)は先頭のコメントか `scripts/README.md` に書く。
  - 失敗したら、原因が分かるメッセージを出して、0 以外の終了コードで終わる。
- 新しい依存を入れる、またはユーザーの環境を変える場合は、先にユーザーに確認する。
- スクリプトを追加・変更したら、`scripts/README.md` の一覧にも1行足す。

## フィードバックのルール化

ユーザーからフィードバック(指摘、好み、やり方の変更の依頼)があったら、その場の修正だけで終わらせず、再発を防ぐルールとしてこの CLAUDE.md に反映する。

- 反映先:内容に合う既存のセクションに書き足す。合うものがなければ新しいセクションを作る。重複したルールは作らず、既存のものを更新する。
- 書き方:何をするか(しないか)と、その理由が分かるように短く書く。
- 一度きりの指示(「今回だけ」「このファイルだけ」など)や、プロジェクトに関係しない個人的な好みは、ルールにしない。迷ったらユーザーに確認する。
- ルールと矛盾する新しい指示が来たら、どちらを優先するかをユーザーに確認し、古いほうを書き換える。
- 反映したら、「成果物のコミット・push」に従ってコミットして push し、何を足したかを一言で報告する。

## テスト

Vitest + jsdom、`globals: true`、セットアップは `vitest.setup.ts`(jest-dom マッチャー、各テスト後に `localStorage` を空にし `vi.unstubAllGlobals()` を呼ぶ)。テストは `src/**/*.test.{ts,tsx}` から収集され、ソースと同じ場所に置く。`@` エイリアスは `src/` を指し、Vitest とアプリの両方で有効(`tsconfig.json` でも設定)。
