# ぼくらのダンジョン　アプリ版の公開手順

GitHub Pages（無料）にゲームを置き、Firebase（Googleの無料サービス）でセーブとランキングを自動で集めます。
友だちはアカウント不要。リンクを開くだけで遊べて、ホーム画面にアプリとして追加できます。

## 入っているファイル
| ファイル | 役割 |
|---|---|
| index.html | ゲーム本体 |
| firebase-config.js | Firebaseの設定（あなたが書きかえる） |
| fb-adapter.js | Firebaseとつなぐ部分（さわらない） |
| firestore.rules | Firebaseのセキュリティルール（コピーして貼る） |
| sw.js / manifest.webmanifest / *.png | アプリ化（ホーム画面・オフライン）用 |

## A. Firebase の準備
1. https://console.firebase.google.com →「プロジェクトを作成」→ 名前（例：bokudun）→ Googleアナリティクスはオフ → 作成
2. 「構築」→「Authentication」→「始める」→「ログイン方法」→「匿名」をオン → 保存
3. 「構築」→「Firestore Database」→「データベースを作成」→ ロケーション asia-northeast1（東京）→「本番環境モード」で作成
4. Firestore の「ルール」タブ → 中身を全部消して firestore.rules の中身を貼る →「公開」
5. 歯車「プロジェクトの設定」→ 下の「マイアプリ」→「</>」（ウェブ）→ 名前を入れて登録
   → 出てきた firebaseConfig の { } の中身を firebase-config.js の { } の中に貼って保存

## B. GitHub Pages で公開
1. https://github.com でアカウント作成 →「New repository」→ 名前 bokudun、Public で作成
2. 「uploading an existing file」→ フォルダの中のファイルを全部アップロード →「Commit changes」
3. 「Settings」→「Pages」→ Branch を「main」「/ (root)」にして Save
4. 1〜2分で https://（ユーザー名）.github.io/bokudun/ が開けるようになる
5. Firebase「Authentication」→「設定」→「承認済みドメイン」→「ドメインを追加」で （ユーザー名）.github.io を追加

## 遊び方・引き継ぎ
- 友だちにはURLを送るだけ。iPhoneはSafariの共有→「ホーム画面に追加」、AndroidはChromeのメニュー→「ホーム画面に追加」
- セーブは自動でサーバーにも保存。ダンジョン画面「みんなの記録」でランキングと「引き継ぎコード」が見られる
- スマホを変えたら、タイトルの「引き継ぎコードで再開」にコードを入れると続きから遊べる

## 更新するとき
新しい index.html を GitHub の「Add file」→「Upload files」で上書き。firebase-config.js は上書きしないこと。
