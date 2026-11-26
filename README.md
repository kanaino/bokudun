# ぼくらのダンジョン　Webアプリ版の公開手順

このフォルダの中身をWebに置くと、だれでもリンクから遊べて、スマホのホーム画面にアプリとして追加できます。
マルチ・フレンド・セーブの同期には Firebase（Googleの無料サービス）を使います。

## 入っているファイル
| ファイル | 役割 |
|---|---|
| index.html | ゲーム本体 |
| firebase-config.js | Firebaseの設定（あなたが書きかえる） |
| fb-adapter.js | Firebaseとつなぐ部分（さわらない） |
| sw.js / manifest.webmanifest / *.png | アプリ化（ホーム画面・オフライン）用 |
| firestore.rules / database.rules.json | Firebaseのセキュリティルール（コピーして貼る） |

## 1. Firebase の準備（約15分）
1. https://console.firebase.google.com を開き、Googleアカウントでログイン →「プロジェクトを作成」。名前は自由（例：bokudun）。Googleアナリティクスはオフでよい。
2. 左メニュー「構築」→「Authentication」→「始める」→「ログイン方法」タブ →「匿名」を有効にして保存。
3. 「構築」→「Firestore Database」→「データベースを作成」→ ロケーションは asia-northeast1（東京）→「本番環境モード」で作成。
   できたら「ルール」タブを開き、中身をすべて消して **firestore.rules** の中身を貼りつけ →「公開」。
4. 「構築」→「Realtime Database」→「データベースを作成」→ ロケーションはシンガポールなど近い場所 →「ロックモード」で作成。
   「ルール」タブで中身を消して **database.rules.json** の中身を貼りつけ →「公開」。
5. 歯車アイコン「プロジェクトの設定」→ 下の「マイアプリ」→「</>」（ウェブ）→ アプリ名を入れて登録。
   表示される `firebaseConfig = { ... }` の **{ } の中身** を、**firebase-config.js** の { } の中に貼りつけて保存。
   `databaseURL` が入っていなければ、Realtime Database の画面上部に出ている URL（https://〜.firebasedatabase.app）を自分で書き足す。

## 2. GitHub Pages で公開（約10分・スマホのブラウザでもOK）
1. https://github.com でアカウントを作成 →「New repository」→ 名前（例：bokudun）、**Public** を選んで作成。
2. 「Add file」→「Upload files」→ このフォルダの**中のファイルをすべて**選んでアップロード →「Commit changes」。
   （README.md はあってもなくてもOK。フォルダごとではなく中身を入れる）
3. 「Settings」→「Pages」→ Source を「Deploy from a branch」、Branch を「main」「/ (root)」にして Save。
4. 1〜2分待つと `https://（ユーザー名）.github.io/bokudun/` で遊べるようになります。
5. Firebase に戻り「Authentication」→「設定」→「承認済みドメイン」に `（ユーザー名）.github.io` を追加。

## 3. 友だちに配る
- URL を送るだけ。開いたら
  - iPhone（Safari）：共有ボタン →「ホーム画面に追加」
  - Android（Chrome）：メニュー →「ホーム画面に追加」／「アプリをインストール」
- アカウント登録は不要（裏で自動ログインします）。

## 4. ゲームを更新するとき
- 新しい **index.html** を GitHub に「Upload files」で上書きアップロードするだけ。1〜2分で反映され、
  みんなが次にアプリを開いたときに新しい版になります（ホーム画面のアプリもそのまま更新）。
- firebase-config.js は一度設定したら上書きしないこと。

## 注意
- セーブは「claude.ai版」と「アプリ版」で別々です。
- iPhoneでは「Safariで開いた場合」と「ホーム画面から開いた場合」でも端末内の保存場所が別になります（Firebaseにつながっていれば同じ端末内では引き継がれます）。
- Firebase の無料枠（Sparkプラン）で、友だち同士で遊ぶ規模なら費用はかかりません。
- firebase-config.js の apiKey は公開されても問題ない種類の値です（守りはルールで行っています）。
