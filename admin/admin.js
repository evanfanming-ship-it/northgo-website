const $ = selector => document.querySelector(selector);
const states = { new: '新進', in_progress: '處理中', closed: '已結案' };
const services = ['貨運物流', '專案物流', '倉儲物流', '船務代理'];
const offices = { tpe:'台北', txg:'台中', khh:'高雄', lax:'洛杉磯', hcm:'胡志明市', tyo:'東京', osa:'大阪' };
const languages = { 'zh-tw':'繁體中文', en:'English', ja:'日本語', vi:'Tiếng Việt' };
let page = 1;
let generation = 0;
let sort = 'created_at';
let direction = 'desc';
let searchTimer;
let mutating = false;
const recordDialog = $('#record-dialog');
const displayDialog = $('#settings-dialog');
const taipeiTime = new Intl.DateTimeFormat('sv-SE', {
  timeZone:'Asia/Taipei', dateStyle:'short', timeStyle:'medium'
});
function displayTime(value) { return taipeiTime.format(new Date(value)).replaceAll('-', '/'); }
function message(text) {
  const modalMessage = recordDialog.open && $('#dialog-message');
  (modalMessage || $('#message')).textContent = text;
}
function loginMode() {
  generation++;
  recordDialog.close();
  displayDialog.close();
  $('#detail').replaceChildren();
  $('#account-name').textContent = '';
  $('#dashboard').hidden = $('#logout').hidden = true;
  $('#login-panel').hidden = false;
  $('#list').replaceChildren();
}
async function api(path, method = 'GET', body) {
  const response = await fetch('/api/admin/' + path, {
    method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
  });
  if (!response.ok) throw Object.assign(new Error('Request failed'), { status: response.status });
  return response.json();
}
function element(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}
function handle(error) {
  if (error.status === 401) { loginMode(); message('請登入管理後台。'); }
  else if (error.status === 429) message('操作過於頻繁，請稍後再試。');
  else if (error.status === 400) message('請確認必填欄位、Email 格式和預計日期。');
  else if (error.status === 404 || error.status === 409) message('這筆詢問可能已被更新或刪除。請先保留未儲存的內容，再重新查詢。');
  else message('操作失敗，請稍後再試。');
}
function action(label, handler, className = '') {
  const button = element('button', label);
  button.type = 'button';
  button.className = className;
  button.onclick = handler;
  return button;
}
function openRecord(title) {
  const detail = $('#detail');
  const heading = element('h2', title);
  heading.id = 'dialog-title';
  heading.tabIndex = -1;
  const feedback = element('p', '');
  feedback.id = 'dialog-message';
  feedback.setAttribute('role', 'status');
  detail.replaceChildren(heading, feedback);
  $('#message').textContent = '';
  if (!recordDialog.open) recordDialog.showModal();
  heading.focus();
  return detail;
}
function showDetail(item) {
  const detail = openRecord('詢問詳情');
  const values = {
    編號:item.id, 服務:services[item.service], 據點:offices[item.office], 姓名:item.name, Email:item.email,
    起運地或需求地點:item.origin, 目的地:item.destination, 需求內容:item.cargo,
    預計日期:item.planned_date, 語系:languages[item.language], 處理狀態:states[item.status],
    內部備註:item.notes, 收件時間:displayTime(item.created_at)
  };
  const details = document.createElement('dl');
  for (const [key, value] of Object.entries(values)) details.append(element('dt', key), element('dd', value || '—'));
  detail.append(details);
  const actions = element('div', '');
  actions.className = 'detail-actions';
  actions.append(action('關閉', () => recordDialog.close()), action('編輯詢問', () => showEditor(item), 'primary'));
  detail.append(actions);
}
function confirmRemoval(item) {
  const detail = openRecord('刪除詢問');
  detail.append(element('p', `確定刪除「${item.company}」的這筆詢問？刪除後無法復原。`));
  const cancelDelete = action('取消', () => recordDialog.close());
  const confirmDelete = action('確定刪除', async () => {
    mutating = true;
    confirmDelete.disabled = cancelDelete.disabled = true;
    try {
      await api('enquiries/' + item.id, 'DELETE', { updatedAt: item.updated_at });
      recordDialog.close();
      await load();
      message('已刪除詢問。');
    } catch (error) { handle(error); }
    finally { mutating = false; confirmDelete.disabled = cancelDelete.disabled = false; }
  }, 'danger');
  const confirmationActions = element('div', '');
  confirmationActions.className = 'detail-actions';
  confirmationActions.append(cancelDelete, confirmDelete);
  detail.append(confirmationActions);
  cancelDelete.focus();
}
function showEditor(item) {
  const detail = openRecord(item ? '編輯詢問' : '新增詢問');
  const form = document.createElement('form');
  const fields = element('div', '');
  fields.className = 'editor-fields';
  const add = (name, title, value, { options, type = 'text', max, optional = false, wide = false } = {}) => {
    const label = element('label', title);
    if (wide) label.className = 'wide';
    const input = document.createElement(options ? 'select' : type === 'textarea' ? 'textarea' : 'input');
    input.name = name;
    input.required = !optional;
    if (options) for (const [key, label] of Object.entries(options)) input.add(new Option(label, key));
    else if (type === 'textarea') input.rows = 4;
    else input.type = type;
    if (max) input.maxLength = max;
    input.value = value;
    label.append(input);
    fields.append(label);
    return input;
  };
  const service = add('service', '服務', item?.service ?? '0', { options: services });
  add('office', '據點', item?.office ?? 'tpe', { options: offices });
  add('name', '姓名', item?.name ?? '', { max:200 });
  add('company', '公司', item?.company ?? '', { max:200 });
  add('email', 'Email', item?.email ?? '', { type:'email', max:200, wide:true });
  add('from', '起運地或需求地點', item?.origin ?? '', { max:200 });
  const destination = add('to', '目的地', item?.destination ?? '', { max:200 });
  add('cargo', '需求內容', item?.cargo ?? '', { type:'textarea', max:3000, wide:true });
  add('date', '預計日期', item?.planned_date ?? '', { type:'date', optional:true });
  add('language', '語系', item?.language ?? 'zh-tw', { options:languages });
  add('status', '處理狀態', item?.status ?? 'new', { options:states });
  add('notes', '內部備註', item?.notes ?? '', { type:'textarea', max:4000, optional:true, wide:true });
  const adjustDestination = () => {
    destination.disabled = Number(service.value) >= 2;
    destination.required = !destination.disabled;
    destination.closest('label').hidden = destination.disabled;
  };
  service.onchange = adjustDestination;
  adjustDestination();
  const actions = element('div', '');
  actions.className = 'detail-actions';
  const save = element('button', item ? '儲存更新' : '建立詢問');
  save.className = 'primary';
  const cancel = action('取消', () => recordDialog.close());
  actions.append(cancel, save);
  form.append(fields, actions);
  form.onsubmit = async event => {
    event.preventDefault();
    const draft = Object.fromEntries(new FormData(form));
    if (item) draft.updatedAt = item.updated_at;
    mutating = true;
    save.disabled = cancel.disabled = true;
    try {
      await api(item ? 'enquiries/' + item.id : 'enquiries', item ? 'PATCH' : 'POST', draft);
      if (!item) {
        $('#filters [name=q]').value = '';
        $('#filters [name=status]').value = '';
        sort = 'created_at';
        direction = 'desc';
        page = 1;
      }
      recordDialog.close();
      await load();
      message(item ? '已儲存更新。' : '已新增詢問。');
    } catch (error) { handle(error); }
    finally { mutating = false; save.disabled = cancel.disabled = false; }
  };
  detail.append(form);
}
async function openItem(item, render, button) {
  button.disabled = true;
  try {
    const updated = await api('enquiries/' + item.id);
    if (button.isConnected && !$('#dashboard').hidden && !recordDialog.open && !displayDialog.open) {
      button.disabled = false;
      button.focus();
      render(updated);
    }
  } catch (error) { handle(error); }
  finally { button.disabled = false; }
}
async function load() {
  const current = ++generation;
  const query = new URLSearchParams(new FormData($('#filters')));
  query.set('page', page);
  query.set('sort', sort);
  query.set('direction', direction);
  const result = await api('enquiries?' + query);
  if (current !== generation) return;
  page = result.page;
  $('#login-panel').hidden = true;
  $('#dashboard').hidden = $('#logout').hidden = false;
  $('#account-name').textContent = result.username + '（管理者）';
  const list = $('#list');
  list.replaceChildren();
  if (!result.items.length) {
    const cell = element('td', '沒有符合條件的詢問。');
    cell.colSpan = 6;
    cell.className = 'empty';
    const row = document.createElement('tr');
    row.append(cell);
    list.append(row);
  }
  for (const item of result.items) {
    const row = document.createElement('tr');
    const name = document.createElement('td');
    const view = action(item.name, () => openItem(item, showDetail, view), 'record-name');
    view.setAttribute('aria-label', '查看詢問：' + item.name);
    name.append(view);
    const time = element('td', displayTime(item.created_at));
    time.className = 'record-time';
    const operations = document.createElement('td');
    operations.className = 'record-actions';
    const edit = action('編輯', () => openItem(item, showEditor, edit));
    const remove = action('刪除', () => openItem(item, confirmRemoval, remove), 'outline-danger');
    operations.append(edit, remove);
    row.append(time, name, element('td', item.company), element('td', item.email), element('td', states[item.status]), operations);
    list.append(row);
  }
  for (const sortButton of document.querySelectorAll('[data-sort]')) {
    const header = sortButton.closest('th');
    const active = sortButton.dataset.sort === sort;
    if (active) header.setAttribute('aria-sort', direction === 'asc' ? 'ascending' : 'descending');
    else header.removeAttribute('aria-sort');
    sortButton.querySelector('span').textContent = active ? (direction === 'asc' ? '↑' : '↓') : '↕';
  }
  $('#count').textContent = `共 ${result.total} 筆， 第 ${page} / ${result.lastPage} 頁`;
  $('#previous').disabled = page <= 1;
  $('#next').disabled = page >= result.lastPage;
}
$('#login').onsubmit = async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    await api('login', 'POST', Object.fromEntries(new FormData(form)));
    form.reset();
    message('');
    await load();
  } catch (error) {
    if (error.status === 401) message('帳號或密碼錯誤。');
    else handle(error);
  } finally { button.disabled = false; }
};
$('#logout').onclick = async () => {
  try { await api('logout', 'POST', {}); loginMode(); message('已登出。'); }
  catch (error) { handle(error); }
};
function refresh(pageOffset = 0) {
  clearTimeout(searchTimer);
  if (recordDialog.open || displayDialog.open) return;
  page = pageOffset ? page + pageOffset : 1;
  message('');
  load().catch(handle);
}
$('#create').onclick = () => showEditor();
$('#filters').onsubmit = event => { event.preventDefault(); refresh(); };
$('#filters [name=q]').oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(refresh, 250); };
$('#filters [name=status]').onchange = () => refresh();
$('#filters [name=pageSize]').onchange = () => refresh();
for (const button of document.querySelectorAll('[data-sort]')) {
  button.onclick = () => {
    const nextSort = button.dataset.sort;
    direction = nextSort === sort && direction === 'asc' ? 'desc' : 'asc';
    sort = nextSort;
    refresh();
  };
}
$('#settings').onclick = () => displayDialog.showModal();
$('[data-close=settings-dialog]').onclick = () => displayDialog.close();
const density = $('#display-settings [name=density]');
try { density.value = localStorage.getItem('northgo-admin-density') === 'compact' ? 'compact' : 'comfortable'; } catch {}
$('#dashboard').dataset.density = density.value;
$('#display-settings').onsubmit = event => {
  event.preventDefault();
  $('#dashboard').dataset.density = density.value;
  try { localStorage.setItem('northgo-admin-density', density.value); } catch {}
  displayDialog.close();
};
displayDialog.addEventListener('close', () => { density.value = $('#dashboard').dataset.density; });
recordDialog.addEventListener('cancel', event => { if (mutating) event.preventDefault(); });
$('#previous').onclick = () => refresh(-1);
$('#next').onclick = () => refresh(1);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !recordDialog.open && !displayDialog.open && !$('#dashboard').hidden) load().catch(handle);
});
load().catch(handle);
