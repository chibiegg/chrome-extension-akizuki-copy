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

async function loadPreview() {
  const preview = document.getElementById('preview');
  try {
    const tab = await getActiveTab();
    const text = await runExtract(tab);
    if (!text) {
      preview.className = 'format-example empty';
      preview.textContent = '買い物かごにデータがありません';
      return;
    }
    preview.className = 'format-example';
    preview.innerHTML = text.split('\n').map(line => {
      const [code, qty] = line.split('\t');
      return `<span class="row-code">${code}</span><span class="tab">TAB</span><span class="row-qty">${qty}</span>`;
    }).join('<br>');
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
