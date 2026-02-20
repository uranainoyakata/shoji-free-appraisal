/**
 * =============================================
 *  Google Apps Script — スプレッドシート連携
 *  Code.gs
 * =============================================
 *
 *  【このファイルの役割】
 *  フォームから送信されたデータを受け取り、
 *  Googleスプレッドシートに書き込む。
 *
 *  【使い方】
 *  1. Google ドライブで新しいスプレッドシートを作成
 *  2. 「拡張機能」→「Apps Script」を開く
 *  3. このファイルの内容をすべてコピーして貼り付け
 *  4. 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」を選択
 *     - 「次のユーザーとして実行」→「自分」
 *     - 「アクセスできるユーザー」→「全員」
 *  5. デプロイして表示されるURLをコピー
 *  6. js/form.js の FORM_CONFIG.endpoint にそのURLを貼り付ける
 *
 *  【注意】
 *  - スプレッドシートの1行目にヘッダーを自動作成します
 *  - 初回デプロイ時にGoogleの権限承認が必要です
 *
 *  【将来ここをDBに置き換える】
 *  このスクリプトは将来不要になります。
 *  Supabase / Firebase に移行する場合は、
 *  js/form.js の FORM_CONFIG.endpoint を
 *  新しいAPIのURLに差し替えるだけでOK。
 */

// ===========================================
//  POSTリクエストを受け取る関数
//  フォームからのデータ送信はここで処理される
// ===========================================
function doPost(e) {
  try {
    // --- 送信されたデータを取得 ---
    // FormData形式（e.parameter）とJSON形式（e.postData）の両方に対応
    // 現在はフロントからFormData形式で送信しているため e.parameter を使用
    var data;
    if (e.parameter && e.parameter.line_name) {
      // FormData形式（現在の方式）
      data = e.parameter;
    } else if (e.postData && e.postData.contents) {
      // JSON形式（将来DB移行時のフォールバック）
      data = JSON.parse(e.postData.contents);
    } else {
      throw new Error('データが送信されていません');
    }

    // --- スプレッドシートにデータを書き込む ---
    saveToSpreadsheet(data);

    // --- 成功レスポンスを返す ---
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        message: 'データを保存しました'
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // --- エラーレスポンスを返す ---
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// ===========================================
//  GETリクエスト（動作確認用）
//  ブラウザでURLにアクセスした時に表示される
// ===========================================
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: '鑑定受付APIは正常に動作しています'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}


// ===========================================
//  スプレッドシートへの書き込み処理
// ===========================================
function saveToSpreadsheet(data) {
  // --- アクティブなスプレッドシートを取得 ---
  // （このスクリプトが紐づいているスプレッドシート）
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // --- ヘッダー行がなければ作成する ---
  // 初回実行時に自動でヘッダーを設定する
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      '受付番号',         // A列: 自動採番
      '送信日時',         // B列: タイムスタンプ
      'LINEの名前',      // C列:
      'ニックネーム',     // D列:
      '生年月日',         // E列:
      'お悩み',           // F列:
      'ステータス',       // G列: 鑑定の進捗管理用
      '記録日時'          // H列: スプレッドシートに書き込んだ日時
    ]);
  }

  // --- 受付番号を生成 ---
  // 現在の行数からヘッダー行を引いた数 + 1
  var rowCount = sheet.getLastRow();
  var receiptNumber = 'K-' + String(rowCount).padStart(4, '0');

  // --- 新しい行にデータを追加 ---
  sheet.appendRow([
    receiptNumber,                              // 受付番号（例: K-0001）
    data.submitted_at || '',                    // フォームからのタイムスタンプ
    data.line_name || '',                       // LINEの名前
    data.nickname || '',                        // ニックネーム
    data.birthday || '',                        // 生年月日
    data.concern || '',                         // お悩み
    '',                                         // ステータス（チェックボックスが入るため空文字）
    new Date().toLocaleString('ja-JP')          // サーバー側の記録日時
  ]);

  // ステータス列（G列=7列目）にチェックボックスを挿入
  var row = sheet.getLastRow();
  sheet.getRange(row, 7).insertCheckboxes();
}
