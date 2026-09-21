# 保守・運用ガイド

この文書は、今後このサイトを更新・保守するときに、既存の構成・検証方法・リリース方針を引き継ぐための記録です。

## 開発環境と検証

Node.js 20以上。GitHub ActionsではNode.js 24を使用します。追加のnpm依存パッケージはありません。

```sh
git clone https://github.com/yt0sh/arakawa-suigai-viewer.git
cd arakawa-suigai-viewer
npm test
npm run check
npm run build
```

- `npm test`: 現行版のビルド後、APIハンドラーと画面の既存テストを実行
- `npm run check`: ビルド後、主要JavaScriptファイルの構文を検証
- `npm run build`: `scripts/build-v08.mjs` で `public/` から `dist/` を生成し、本番用の雨雲表示範囲を適用

`dist/` は生成物です。画面は `public/`、APIは `api/`、取得・解析処理は `lib/` を編集してください。静的ファイルだけを配信するローカルサーバーでは `/api/*` は動作しません。APIを含む確認にはVercelのプレビュー環境等を使用します。

```text
public/                  画面・スタイル・ブラウザー側処理
api/                     Vercel Functionsのエンドポイント
lib/                     公式データの取得・解析処理
scripts/build-v08.mjs    現行の本番ビルド（ファイル名は互換性のため維持）
tests/                   API・画面の検証
vercel.json              ビルド・配信設定
```

Vercelは `npm run build` を実行し、`dist/` と `api/` を配信します。旧版用の `build-v07.mjs`、`verify-release.mjs`、`check-live.mjs` は過去の検証用で、現行版のリリース判定には使用しません。

## 水位表示と情報源

国土交通省「水文水質データベース」の10分水位を取得します。表示期間は **12時間／5日間** で切り替え、初期表示は **5日間** です。実際に描画できる範囲は取得元の観測データによります。

| 観測所 | 観測所ID | グラフの固定縦軸 | カメラ提供元 |
| --- | --- | --- | --- |
| 熊谷 | `303041283308030` | 0〜6 m | 荒川上流河川事務所 |
| 治水橋 | `303041283308060` | 0〜14 m | 荒川上流河川事務所 |
| 岩淵水門（上）※画面表記は「岩淵水門」 | `303041283309040` | 0〜8 m | 荒川下流河川事務所 |

背景色は、平常＝青、水防団待機＝緑、氾濫注意＝黄、避難判断＝赤、氾濫危険＝紫の淡色です。基準水位は観測所ごとに設定しています。単一観測所の水位から避難指示を自動生成するものではありません。

主な情報源:

- [気象庁](https://www.jma.go.jp/bosai/): 警報・注意報、洪水予報、雨雲
- [水文水質データベース](https://www1.river.go.jp/): 水位観測値
- [川の防災情報](https://www.river.go.jp/): 河川情報の原典確認
- [荒川上流河川事務所](https://www.ktr.mlit.go.jp/arajo/index.html)・[荒川下流河川事務所](https://www.ktr.mlit.go.jp/arage/index.html): 河川カメラ・河川情報
- [東京都水防災総合情報システム](https://www.kasen-suibo.metro.tokyo.lg.jp/): 東京都の河川・カメラ情報
- [荒川区防災情報](https://bosai.city.arakawa.tokyo.jp/): 避難情報・避難所開設状況

## 警報・注意報の取得

荒川区の警報・注意報は、気象庁防災情報XMLのJSON変換データ `https://www.jma.go.jp/bosai/warning/data/r8/130000.json` から取得します。対象地域コードは荒川区の `1311800` です。

- 取得結果の最上位は配列です。すべての発表を走査し、対象地域に該当する警報・注意報を集約します。
- 複数の情報が同時に発表されている場合はすべて表示し、最も高い相当レベルをカードの色に使用します。
- 取得失敗、形式変更、未対応コードを「発表なし」として扱いません。判定できない場合は取得不能または未対応として表示します。
- 解析処理を変更した場合は `tests/jma-warning.test.mjs` を更新し、既知コード・複数発表・解除・異常データを検証します。

この表示は入口となる要約です。内容の確認先は気象庁の公式ページです。

## ブランチとリリース

- `main` を公開版のソースとします。
- 変更は短期間の作業ブランチで行い、PRで `main` に取り込みます。`main` へのpushとPRで既存のテスト・構文チェックを実行します。
- `main` への反映は随時デプロイします。すべてのデプロイでバージョンを変更するわけではありません。
- 文言・リンク・表示位置・軽微な不具合修正はパッチ版（例：`0.9.1`）、新しい情報ブロック・データ取得先・機能追加はマイナー版（例：`0.10.0`）として更新します。
- バージョン更新時は `package.json`、README内の非表示コメント、`vX.Y.Z` タグ、GitHub Releaseを同じ内容に揃えます。バージョンは公開画面とREADME本文には表示しません。
- `package.json` のバージョンを更新して `main` に反映すると、GitHub Actionsが同名のタグとReleaseを作成します。`docs/releases/vX.Y.Z.md` がある場合はリリース説明に使用します。
- 取り込み・検証が終わった作業ブランチは整理します。2026年9月の整理内容は[ブランチ整理記録](branch-archive.md)を参照してください。

## アクセス解析

GA4（測定ID `G-T0QZT180EM`）を `public/analytics.js` で読み込みます。本番ホスト `arakawa-suigai-viewer.vercel.app` のみを計測し、localhost・Vercelプレビューは対象外です。Googleシグナルと広告パーソナライズのシグナルを無効にしています。

## 外部リンクの検査

外部リンクは `config/external-links.json` で管理します。各URLに表示名・分類・提供元・重要度・参照元ファイルを付けています。X・LINE・YouTubeなど自動アクセスの制限が起こりやすいリンクは `policy: "advisory"` とし、失敗時は要目視確認として扱います。

```sh
npm run check:links:validate  # 台帳の構造、参照元、公開リンクの登録漏れを確認
npm run check:links           # 実際に外部URLへ接続して結果を表示
```

GitHub Actionsの「External links」は、関連ファイルの更新時、毎月1日12:17（日本時間）、手動実行時に検査します。結果はActionsの実行サマリーへ分類付きの表として残し、当初はIssueや外部サービスへの通知を自動作成しません。

公開リポジトリに60日間活動がない場合、GitHubが定期ワークフローを自動停止することがあります。台風・大雨前のメンテ時にはActions画面から手動実行してください。

## 関連資料

- [ブランチ整理記録](branch-archive.md)
- [リリースノート](releases/)
