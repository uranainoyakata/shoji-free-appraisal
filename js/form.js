/* ============================================
 *  無料鑑定受付サイト — フォーム送信スクリプト
 *  form.js
 * ============================================
 *
 *  【このファイルの役割】
 *  フォームの送信処理を一手に担うスクリプト。
 *  送信先の設定・データの整形・エラー処理をここに集約。
 *
 *  【将来ここをDBに置き換える】
 *  現在は Google Apps Script（スプレッドシート）に送信している。
 *  Supabase / Firebase 等に移行する場合は、
 *  以下の FORM_CONFIG と submitToServer() 関数を
 *  差し替えるだけでOK。他のファイルの変更は不要。
 *
 * ============================================ */

(function () {
  'use strict';

  // ===========================================
  //  フォーム送信設定（★ ここを変更するだけで送信先を差し替え可能）
  // ===========================================
  //
  //  【将来ここをDBに置き換える】
  //  - Supabase の場合：endpoint を Supabaseの REST API URL に変更
  //  - Firebase の場合：endpoint を Cloud Functions の URL に変更
  //  - いずれの場合も submitToServer() 関数を合わせて修正する
  //
  const FORM_CONFIG = {
    // Google Apps Script のデプロイURL
    // ★ README.md の手順に従ってURLを取得し、ここに貼り付ける
    endpoint: 'https://script.google.com/macros/s/AKfycbyTqQN7ADJ4P3SLUTq9-aGIfc_-jfa1BWy2QL_m3tDi_So1Vv95WjyLYl1zAoJosyBOOg/exec',

    // 送信完了後のリダイレクト先
    redirectUrl: 'thanks.html',

    // タイムアウト時間（ミリ秒）
    timeout: 15000,
  };


  // ===========================================
  //  DOM要素の取得
  // ===========================================
  const form = document.getElementById('appraisal-form');
  const submitBtn = document.getElementById('submit-btn');
  const errorDiv = document.getElementById('form-error');
  const timestampField = document.getElementById('submitted-at');


  // ===========================================
  //  生年月日セレクトボックスの動的生成
  // ===========================================

  // --- 年の選択肢を生成（1920年〜今年、デフォルト：1970年） ---
  var yearSelect = document.getElementById('birthday-year');
  var currentYear = new Date().getFullYear();
  for (var y = currentYear; y >= 1920; y--) {
    var opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === 1970) opt.selected = true;
    yearSelect.appendChild(opt);
  }

  // --- 日の選択肢を生成（1〜31） ---
  var daySelect = document.getElementById('birthday-day');
  for (var d = 1; d <= 31; d++) {
    var opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    daySelect.appendChild(opt);
  }


  // ===========================================
  //  フォーム送信イベント
  // ===========================================
  form.addEventListener('submit', async function (event) {
    // ブラウザのデフォルト送信を止める
    event.preventDefault();

    // --- スパム対策：ハニーポットチェック ---
    // ハニーポットフィールド（非表示のダミー入力欄）に
    // 値が入っていたらbotと判断して送信を中止する。
    // 人間のユーザーにはこのフィールドが見えないので影響なし。
    const honeypot = document.getElementById('website');
    if (honeypot && honeypot.value !== '') {
      // botの場合は何も表示せず、偽の成功を返す
      console.log('スパム検出：送信をブロックしました');
      window.location.href = FORM_CONFIG.redirectUrl;
      return;
    }

    // --- バリデーション ---
    // HTML5 の required 属性による基本チェック
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // --- 二重送信防止 ---
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中…';
    hideError();

    // --- タイムスタンプをセット ---
    // いつ送信されたかを ISO 8601 形式で記録する
    // 例: "2025-03-15T14:30:00+09:00"
    timestampField.value = new Date().toISOString();

    // --- フォームデータを収集 ---
    // 【将来ここをDBに置き換える】
    // このオブジェクト構造は、そのままDBのレコードとして使える。
    // フィールド名（line_name, nickname, etc.）がDBのカラム名になる。
    // 生年月日を年・月・日のセレクトから結合
    var bYear = document.getElementById('birthday-year').value;
    var bMonth = document.getElementById('birthday-month').value.padStart(2, '0');
    var bDay = document.getElementById('birthday-day').value.padStart(2, '0');
    var birthdayStr = bYear + '-' + bMonth + '-' + bDay;

    const formData = {
      line_name: document.getElementById('line-name').value.trim(),
      nickname: document.getElementById('nickname').value.trim(),
      birthday: birthdayStr,
      concern: document.getElementById('concern').value.trim(),
      submitted_at: timestampField.value,
    };

    // コンソールに送信データを表示（デバッグ用）
    console.log('送信データ:', JSON.stringify(formData, null, 2));

    // --- サーバーに送信 ---
    try {
      await submitToServer(formData);

      // 送信成功 → 完了ページに遷移
      window.location.href = FORM_CONFIG.redirectUrl;

    } catch (error) {
      // 送信失敗 → エラーメッセージを表示
      console.error('送信エラー:', error);
      showError('送信に失敗しました。通信環境をご確認のうえ、再度お試しください。');

      // ボタンを再度有効化
      submitBtn.disabled = false;
      submitBtn.textContent = '鑑定を申し込む';
    }
  });


  // ===========================================
  //  サーバー送信処理
  // ===========================================
  //
  //  【将来ここをDBに置き換える】
  //  この関数を差し替えれば、送信先をDBに変更できる。
  //
  //  例：Supabase に置き換える場合
  //  async function submitToServer(data) {
  //    const { error } = await supabase
  //      .from('appraisals')
  //      .insert([data]);
  //    if (error) throw error;
  //  }
  //
  //  例：Firebase に置き換える場合
  //  async function submitToServer(data) {
  //    await addDoc(collection(db, 'appraisals'), data);
  //  }
  //
  async function submitToServer(data) {
    // --- Google Apps Script 向けの送信処理 ---
    //
    // 【なぜこの方式なのか】
    // Google Apps Script（GAS）は CORS のプリフライトリクエスト（OPTIONS）に
    // 対応していない。プリフライトが発生しない「単純リクエスト」で送信する必要がある。
    //
    // 単純リクエストの条件：
    //   - メソッドが GET, HEAD, POST のいずれか
    //   - Content-Type が以下のいずれか：
    //     ・application/x-www-form-urlencoded ← これを使う
    //     ・multipart/form-data
    //     ・text/plain
    //   - カスタムヘッダーなし
    //
    // 【将来ここをDBに置き換える】
    // Supabase / Firebase に移行する場合は、
    // 通常の JSON + fetch に戻してOK（CORS対応があるため）。

    // URLSearchParams（application/x-www-form-urlencoded 形式）で送信
    // これは HTML の <form> をそのまま送信するのと同じ形式
    const params = new URLSearchParams();
    Object.keys(data).forEach(function (key) {
      params.append(key, data[key]);
    });

    try {
      await fetch(FORM_CONFIG.endpoint, {
        method: 'POST',
        body: params,
        // redirect: 'follow' で GAS のリダイレクトに対応
        redirect: 'follow',
      });

    } catch (error) {
      // ネットワークエラー等の場合
      throw new Error('送信に失敗しました。通信環境をご確認ください。');
    }
  }


  // ===========================================
  //  エラー表示・非表示
  // ===========================================
  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.add('visible');
  }

  function hideError() {
    errorDiv.classList.remove('visible');
  }

})();
