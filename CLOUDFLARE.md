# Northgo Cloudflare 部署

Workers 同時提供首頁、`/admin` 和詢問 API。D1 保存詢問及登入工作階段。Node 本機後端與 Worker 共用 API 和建表 SQL。GitHub Pages 的靜態建置沿用郵件草稿流程。

使用 Node.js 24 和支援 Rate Limiting bindings 的 Wrangler 4。先將程式推送到 GitHub，再從該版本的工作目錄建置。

```sh
npm run build
npm run build:cloudflare
npx wrangler login
npx wrangler whoami
npx wrangler d1 list
```

首次部署且尚無 `northgo-enquiries` 時，執行 `npx wrangler d1 create northgo-enquiries`。取得本次部署的 D1 UUID，再產生環境專用設定並套用遷移。

```sh
node configure-cloudflare.mjs <D1-UUID>
npx wrangler d1 migrations apply DB --remote --config wrangler.remote.json
```

首次發布時，準備本機檔案 `.cloudflare-secrets.env`，內容為 `ADMIN_PASSWORD=<新產生的專用密碼>`，至少 16 字元。可另加 `ADMIN_USERNAME`，預設為 `admin`。使用 Cloudflare secret 上傳，完成後妥善保存帳密。日常重部署可省略 `--secrets-file`，沿用現有 secret。

```sh
npx wrangler deploy --config wrangler.remote.json --secrets-file .cloudflare-secrets.env
```

`wrangler.json` 中的全零 UUID 只供本機模擬。遠端命令一律使用產生的 `wrangler.remote.json`。如登入的帳號尚無 Workers 子網域，首次發布時須在 Cloudflare 設定 `workers.dev` 子網域。

部署後以 Wrangler 回傳的 HTTPS 網址開啟首頁與 `/admin`。確認未登入的詢問管理 API 回傳 401，使用測試資料驗證公開送出、登入、查詢、更新及刪除。部署只建立資料表。本機詢問、工作階段與 `.env` 保留在本機。

本機模擬可使用 `npx wrangler d1 migrations apply DB --local`，再設定 `.dev.vars` 中的測試密碼並以 `npx wrangler dev` 啟動。
