function extractCartData() {
  const rows = document.querySelectorAll('tr.block-cart--goods-list');
  const items = [];
  rows.forEach(function(row) {
    const codeEl = row.querySelector('td.item-goods a');
    const qtyEl = row.querySelector('td.item-qty input[name^="qty"]');
    if (codeEl && qtyEl) {
      const code = codeEl.textContent.trim();
      const qty = qtyEl.value.trim();
      items.push(code + '\t' + qty);
    }
  });
  return items.join('\n');
}

function extractHistoryDetailData() {
  const rows = document.querySelectorAll('.block-purchase-history-detail--order-detail-items tbody tr');
  const items = [];
  rows.forEach(function(row) {
    const codeEl = row.querySelector('.block-purchase-history-detail--goods-code');
    const qtyEl = row.querySelector('.block-purchase-history-detail--goods-qty');
    if (codeEl && qtyEl) {
      const code = codeEl.textContent.trim();
      const qty = qtyEl.textContent.replace(/\s/g, '');
      items.push(code + '\t' + qty);
    }
  });
  return items.join('\n');
}

function detectPageType() {
  return document.body.classList.contains('page-historydetail') ? 'historydetail' : 'other';
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function runExtract(tab) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractCartData,
  });
  return results[0].result;
}

async function runExtractHistory(tab) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractHistoryDetailData,
  });
  return results[0].result;
}

async function runDetectPageType(tab) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: detectPageType,
  });
  return results[0].result;
}

function renderPreview(previewEl, text, emptyMessage) {
  if (!text) {
    previewEl.className = 'format-example empty';
    previewEl.textContent = emptyMessage;
    return;
  }
  previewEl.className = 'format-example';
  previewEl.innerHTML = text.split('\n').map(line => {
    const [code, qty] = line.split('\t');
    return `<span class="row-code">${code}</span><span class="tab">TAB</span><span class="row-qty">${qty}</span>`;
  }).join('<br>');
}

async function loadPreview() {
  const preview = document.getElementById('preview');
  const historySection = document.getElementById('historySection');
  const historyPreview = document.getElementById('historyPreview');
  try {
    const tab = await getActiveTab();
    const pageType = await runDetectPageType(tab);

    if (pageType === 'historydetail') {
      historySection.style.display = 'block';
      const historyText = await runExtractHistory(tab);
      renderPreview(historyPreview, historyText, '注文履歴にデータがありません');
    }

    const text = await runExtract(tab);
    renderPreview(preview, text, '買い物かごにデータがありません');
  } catch (e) {
    preview.className = 'format-example empty';
    preview.textContent = '秋月電子の買い物かごページで開いてください';
  }
}

loadPreview();

document.getElementById('copyBtn').addEventListener('click', async () => {
  let tab = await getActiveTab();

  let text;
  try {
    text = await runExtract(tab);
  } catch (e) {
    showStatus('error', 'スクリプト実行エラー: ' + e.message);
    return;
  }
  if (!text) {
    showStatus('error', '買い物かごが空か、対応ページではありません');
    return;
  }

  await navigator.clipboard.writeText(text);
  const count = text.split('\n').length;
  showStatus('success', `✓ ${count}件コピーしました`);
});

document.getElementById('copyHistoryBtn').addEventListener('click', async () => {
  let tab = await getActiveTab();

  let text;
  try {
    text = await runExtractHistory(tab);
  } catch (e) {
    showStatus('error', 'スクリプト実行エラー: ' + e.message);
    return;
  }
  if (!text) {
    showStatus('error', '注文履歴にデータがありません');
    return;
  }

  await navigator.clipboard.writeText(text);
  const count = text.split('\n').length;
  showStatus('success', `✓ ${count}件コピーしました`);
});

let statusTimer = null;
function showStatus(type, message) {
  const status = document.getElementById('status');
  if (statusTimer) clearTimeout(statusTimer);
  status.className = type;
  status.textContent = message;
  statusTimer = setTimeout(() => {
    status.className = '';
    status.textContent = '';
    status.style.display = '';
  }, 3000);
}
