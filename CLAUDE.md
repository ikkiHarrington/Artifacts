# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## リポジトリ構成

- `taskboard/` — メインのアプリ。Next.js(App Router、Turbopack)+ React + Tailwind v4 のカンバンボード。以下のコマンドはすべてこのディレクトリで実行する。
- `taskapp/index.html` — 以前作られた単一ファイルのタスクアプリ。`taskboard/` とは独立している。

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

状態は純粋なリデューサーに集約し、その上に薄い層を重ねる構成になっている。

- `src/types/task.ts` — `Task`(`assignee` / `priority` / `dueDate` を含む。未設定は空文字、優先度の既定は `medium`、期限は `YYYY-MM-DD`)、`TaskStatus`、列の順序を決める `STATUSES` タプル、`STATUS_LABELS`(UI ラベルは日本語)、`PRIORITIES` / `PRIORITY_LABELS`、型ガード `isTaskStatus` / `isTaskPriority`。ステータスを追加するときは `STATUSES` と `STATUS_LABELS` を更新する。`Board` は `STATUSES` の各要素ごとに `Column` を1つ描画する。
- `src/lib/taskReducer.ts` — 純粋なロジック。`taskReducer`(`add` / `move` アクション)、`createTask`(トリム処理を行い、タイトルが空なら `null` を返す。新規タスクは `todo` から始まる。第4引数で担当者・優先度・期限を受け取り、不正な値は既定値に落とす)、`filterByStatus`、`isOverdue`(期限が今日より前で未完了なら true)。React なしで単体テストできる。
- `src/hooks/useTasks.ts` — リデューサーを `useReducer` で包む。`addTask`(`crypto.randomUUID()` で id を生成し、入力が不正なら `false` を返す)と `moveTask` を公開する。状態はメモリ上のみで、永続化やバックエンドはない。
- `src/components/` — クライアントコンポーネント(`"use client"`)。`Board` がフックを保持し、`tasks` / `onDropTask` を下に渡す。`Column` は HTML5 ドラッグ&ドロップのドロップ先。`TaskCard` はドラッグ元で、`Column` と共有する dataTransfer のキー `DRAG_MIME` をエクスポートする。`TaskForm` は `onAdd` を呼ぶ。
- `src/app/` — App Router のエントリ(`layout.tsx`、`page.tsx`)。`Board` を描画する。

## テスト

Vitest + jsdom、`globals: true`、セットアップは `vitest.setup.ts`(jest-dom マッチャー)。テストは `src/**/*.test.{ts,tsx}` から収集され、ソースと同じ場所に置く。`@` エイリアスは `src/` を指し、Vitest とアプリの両方で有効(`tsconfig.json` でも設定)。
