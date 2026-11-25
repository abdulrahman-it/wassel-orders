/* =========================================================
   وصّل | Wassel Orders
   Data stays in data/orders.json. This file only reads, filters,
   sorts and renders it — it never changes the source array.
   ========================================================= */

(function () {
  'use strict';

  const DATA_URL = 'data/orders.json';

  const STATUS_LABELS = {
    new: 'جديد',
    on_the_way: 'في الطريق',
    delivered: 'تم التوصيل'
  };

  const STATUS_CLASSES = {
    new: 'status-new',
    on_the_way: 'status-way',
    delivered: 'status-delivered'
  };

  const ARABIC_MONTHS = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const state = {
    orders: [],
    query: '',
    sortField: 'date',
    sortDirection: 'desc',
    status: 'loading'
  };

  const ui = {
    panel: document.getElementById('ordersPanel'),
    count: document.getElementById('ordersCount'),
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    sortButtons: Array.from(document.querySelectorAll('.sort-option')),
    sortDirection: document.getElementById('sortDirection'),
    feedback: document.getElementById('feedback'),
    tableView: document.getElementById('tableView'),
    cardsView: document.getElementById('cardsView'),
    tableBody: document.getElementById('ordersTableBody')
  };

  /* -------------------------- Formatting helpers --------------------------- */

  function normalizeText(value) {
    return String(value == null ? '' : value)
      .replace(/[\u0622\u0623\u0625]/g, '\u0627') // آ أ إ => ا
      .replace(/\u0649/g, '\u064A')             // ى => ي
      .replace(/\u0629/g, '\u0647')             // ة => ه
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase('ar');
  }

  function formatDate(isoDate) {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return '—';

    const parts = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'numeric', year: 'numeric', timeZone: 'Asia/Aden'
    }).formatToParts(date);

    const part = (type) => {
      const found = parts.find((item) => item.type === type);
      return found ? found.value : '';
    };
    const month = ARABIC_MONTHS[Number(part('month')) - 1] || '';
    return `${part('day')} ${month} ${part('year')}`.trim();
  }

  function formatNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? new Intl.NumberFormat('en-US').format(number) : '—';
  }

  function getStatusLabel(order) {
    if (order.status_ar) return order.status_ar;
    return STATUS_LABELS[order.status] || order.status || '—';
  }

  function getStatusClass(order) {
    return STATUS_CLASSES[order.status] || 'status-new';
  }

  /* ----------------------------- Data logic -------------------------------- */

  function compareOrders(first, second) {
    let result;

    if (state.sortField === 'amount') {
      result = Number(first.total) - Number(second.total);
    } else {
      result = new Date(first.created_at).getTime() - new Date(second.created_at).getTime();
    }

    if (!Number.isFinite(result) || result === 0) {
      result = String(first.id).localeCompare(String(second.id), 'en', { numeric: true });
    }
    return state.sortDirection === 'asc' ? result : -result;
  }

  function getVisibleOrders() {
    const query = normalizeText(state.query);
    const filtered = state.orders.filter((order) =>
      !query || normalizeText(order.customer).includes(query)
    );
    // Always sort a copy: the original JSON data must stay untouched.
    return filtered.slice().sort(compareOrders);
  }

  /* -------------------------- DOM construction ----------------------------- */

  function makeElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function makeStatusBadge(order) {
    return makeElement('span', `status-badge ${getStatusClass(order)}`, getStatusLabel(order));
  }

  function makeCustomerBlock(order) {
    const wrapper = makeElement('div', 'customer-cell');
    const initial = String(order.customer || '?').trim().charAt(0) || '?';
    wrapper.append(makeElement('span', 'customer-avatar', initial));
    wrapper.append(makeElement('span', '', order.customer));
    return wrapper;
  }

  function makeAmountBlock(order) {
    const wrapper = makeElement('span');
    wrapper.append(makeElement('span', 'amount-value', formatNumber(order.total)));
    if (order.currency) wrapper.append(makeElement('span', 'amount-currency', order.currency));
    return wrapper;
  }

  function renderTable(orders) {
    ui.tableBody.replaceChildren();

    orders.forEach((order) => {
      const row = makeElement('tr');

      const idCell = makeElement('td');
      idCell.append(makeElement('span', 'order-id', order.id));
      row.append(idCell);

      const customerCell = makeElement('td');
      customerCell.append(makeCustomerBlock(order));
      row.append(customerCell);

      const amountCell = makeElement('td');
      amountCell.append(makeAmountBlock(order));
      row.append(amountCell);

      const dateCell = makeElement('td');
      dateCell.append(makeElement('span', 'date-value', formatDate(order.created_at)));
      row.append(dateCell);

      const statusCell = makeElement('td');
      statusCell.append(makeStatusBadge(order));
      row.append(statusCell);

      ui.tableBody.append(row);
    });
  }

  function renderCards(orders) {
    ui.cardsView.replaceChildren();

    orders.forEach((order) => {
      const card = makeElement('article', 'order-card');

      const top = makeElement('div', 'card-top');
      top.append(makeElement('span', 'order-id', order.id));
      top.append(makeStatusBadge(order));
      card.append(top);

      const customer = makeElement('div', 'card-customer');
      const initial = String(order.customer || '?').trim().charAt(0) || '?';
      customer.append(makeElement('span', 'customer-avatar', initial));
      customer.append(makeElement('span', '', order.customer));
      card.append(customer);

      const meta = makeElement('div', 'card-meta');

      const amountBox = makeElement('div');
      amountBox.append(makeElement('span', 'meta-label', 'المبلغ'));
      amountBox.append(makeElement('span', 'meta-value', `${formatNumber(order.total)} ${order.currency || ''}`.trim()));

      const dateBox = makeElement('div');
      dateBox.append(makeElement('span', 'meta-label', 'التاريخ'));
      dateBox.append(makeElement('span', 'meta-value', formatDate(order.created_at)));

      meta.append(amountBox, dateBox);
      card.append(meta);
      ui.cardsView.append(card);
    });
  }

  /* --------------------------- UI state panels ----------------------------- */

  function showFeedback(options) {
    const icon = makeElement('div', `feedback-icon${options.tone === 'error' ? ' is-error' : ''}`);
    icon.append(makeElement('i', options.iconClass));
    ui.feedback.replaceChildren(
      icon,
      makeElement('h3', '', options.title),
      makeElement('p', '', options.message)
    );

    if (options.actionLabel) {
      const actions = makeElement('div', 'feedback-actions');
      const button = makeElement('button', 'feedback-button', options.actionLabel);
      button.type = 'button';
      button.addEventListener('click', options.onAction);
      actions.append(button);
      ui.feedback.append(actions);
    }

    if (options.skeleton) {
      const stack = makeElement('div', 'skeleton-stack');
      ['90%', '74%', '82%', '62%'].forEach((width) => {
        const line = makeElement('div', 'skeleton-line');
        line.style.width = width;
        stack.append(line);
      });
      ui.feedback.append(stack);
    }

    ui.feedback.hidden = false;
    ui.tableView.hidden = true;
    ui.cardsView.hidden = true;
  }

  function renderLoading() {
    ui.count.textContent = '—';
    ui.panel.setAttribute('aria-busy', 'true');
    showFeedback({
      iconClass: '',
      title: 'جارٍ تحميل الطلبات...',
      message: 'نجهّز قائمة الطلبات، يرجى الانتظار قليلاً.',
      skeleton: true
    });
    // The spinner replaces the icon while loading.
    ui.feedback.querySelector('.feedback-icon').replaceWith(makeElement('div', 'spinner'));
  }

  function renderError(message) {
    ui.count.textContent = '—';
    ui.panel.removeAttribute('aria-busy');
    showFeedback({
      iconClass: 'bi bi-exclamation-triangle',
      tone: 'error',
      title: 'تعذّر تحميل الطلبات',
      message: message || 'تعذّر قراءة ملف البيانات. حاول مرة أخرى.',
      actionLabel: 'إعادة المحاولة',
      onAction: loadOrders
    });
  }

  function renderEmpty() {
    ui.count.textContent = '0 طلب';
    ui.panel.removeAttribute('aria-busy');
    showFeedback({
      iconClass: 'bi bi-inbox',
      title: 'لا توجد طلبات حالياً',
      message: 'ملف البيانات لا يحتوي على أي طلبات لعرضها.'
    });
  }

  function renderNoResults(query) {
    ui.count.textContent = `0 من ${state.orders.length} طلب`;
    ui.panel.removeAttribute('aria-busy');
    showFeedback({
      iconClass: 'bi bi-search',
      title: 'لا توجد نتائج مطابقة',
      message: `لم نجد أي طلب باسم «${query}». جرّب اسماً آخر أو امسح البحث.`,
      actionLabel: 'مسح البحث',
      onAction: clearSearch
    });
  }

  function render() {
    if (state.status === 'loading') {
      renderLoading();
      return;
    }
    if (state.status === 'error') {
      return; // Keep the retry panel until a new load succeeds.
    }

    ui.clearSearch.hidden = normalizeText(state.query).length === 0;

    if (state.orders.length === 0) {
      renderEmpty();
      return;
    }

    const visibleOrders = getVisibleOrders();
    if (visibleOrders.length === 0) {
      renderNoResults(state.query.trim());
      return;
    }

    const total = state.orders.length;
    ui.count.textContent = visibleOrders.length === total
      ? `${total} طلب`
      : `${visibleOrders.length} من ${total} طلب`;

    renderTable(visibleOrders);
    renderCards(visibleOrders);
    ui.feedback.hidden = true;
    ui.tableView.hidden = false;
    ui.cardsView.hidden = false;
    ui.panel.removeAttribute('aria-busy');
  }

  /* ------------------------------- Data load ------------------------------- */

  async function loadOrders() {
    state.status = 'loading';
    renderLoading();

    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`رمز الاستجابة ${response.status}`);

      const data = await response.json();
      const orders = Array.isArray(data) ? data : (data && data.orders);

      if (!Array.isArray(orders)) throw new Error('صيغة ملف البيانات غير صحيحة');

      state.orders = orders;
      state.status = 'ready';
      render();
    } catch (error) {
      state.status = 'error';
      state.orders = [];
      renderError(`تأكد من تشغيل الصفحة عبر خادم محلي، ثم أعد المحاولة. (${error.message})`);
    }
  }

  /* -------------------------------- Events -------------------------------- */

  function clearSearch() {
    ui.searchInput.value = '';
    state.query = '';
    render();
    ui.searchInput.focus();
  }

  function handleSearchInput(event) {
    state.query = event.target.value;
    render();
  }

  function updateDirectionLabels() {
    const byDate = state.sortField === 'date';
    ui.sortDirection.options[0].textContent = byDate ? 'الأحدث أولاً' : 'الأعلى أولاً';
    ui.sortDirection.options[1].textContent = byDate ? 'الأقدم أولاً' : 'الأقل أولاً';
  }

  function handleSortFieldClick(event) {
    const button = event.currentTarget;
    if (button.dataset.sort === state.sortField) return;

    state.sortField = button.dataset.sort;
    ui.sortButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    updateDirectionLabels();
    render();
  }

  function handleDirectionChange(event) {
    state.sortDirection = event.target.value;
    render();
  }

  function init() {
    ui.searchInput.addEventListener('input', handleSearchInput);
    ui.clearSearch.addEventListener('click', clearSearch);
    ui.sortButtons.forEach((button) => button.addEventListener('click', handleSortFieldClick));
    ui.sortDirection.addEventListener('change', handleDirectionChange);
    updateDirectionLabels();
    loadOrders();
  }

  init();
})();
