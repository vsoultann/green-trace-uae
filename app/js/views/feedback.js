/**
 * Evaluator feedback.
 *
 * Four ratings and a comment box, stored on the device. Nothing is sent
 * anywhere — there is no server to send it to, which is the same reason the
 * scanning works offline — so `?admin=1` exports what has been collected as a
 * CSV the team can put in the workbook.
 *
 * The ratings are diamonds rather than stars: it is the motif at the heart of
 * the mark, and a star rating on a school project reads like an app store.
 * Underneath they are real radio inputs in a real fieldset, so they work from
 * the keyboard and announce themselves properly.
 */
import { html, raw, $, $$, toast, announce } from '../ui/dom.js';
import { bilingual } from '../ui/bilingual.js';
import { t, lang, L, num } from '../i18n.js';
import { icon } from '../icons.js';
import { CONFIG } from '../config.js';

const STORE = 'warif.feedback';
const SCALE = [1, 2, 3, 4, 5];

const RATINGS = [
  { id: 'clarity', key: 'feedback.clarity' },
  { id: 'usefulness', key: 'feedback.usefulness' },
  { id: 'design', key: 'feedback.design' },
  { id: 'innovation', key: 'feedback.innovation' },
];

const ROLES = [
  { id: 'evaluator', key: 'feedback.roleEvaluator' },
  { id: 'teacher', key: 'feedback.roleTeacher' },
  { id: 'parent', key: 'feedback.roleParent' },
  { id: 'student', key: 'feedback.roleStudent' },
  { id: 'guest', key: 'feedback.roleGuest' },
];

/* --------------------------------------------------------------- storage */

function read() {
  try { return JSON.parse(localStorage.getItem(STORE) ?? '[]'); } catch { return []; }
}

function write(rows) {
  try { localStorage.setItem(STORE, JSON.stringify(rows)); return true; } catch { return false; }
}

/* ------------------------------------------------------------------ view */

export default function feedbackView(ctx) {
  const admin = ctx.query.get('admin') === '1';
  const stored = read();

  return {
    html: html`<div class="shell feedback-page">
      <header class="page-head">
        ${raw(bilingual({ en: 'Your feedback', ar: 'رأيك' }, { size: 'l', tag: 'h1' }))}
        <p class="lede">${t('feedback.sub')}</p>
      </header>

      <div class="feedback-layout">
        <form class="panel feedback-form" id="feedback-form" novalidate>
          ${raw(RATINGS.map(ratingGroup))}

          <div class="field">
            <label for="fb-comment">${t('feedback.comment')}</label>
            <textarea class="input" id="fb-comment" name="comment"
                      placeholder="${t('feedback.commentPlaceholder')}"></textarea>
          </div>

          <div class="field">
            <label for="fb-role">${t('feedback.role')}</label>
            <select class="input" id="fb-role" name="role">
              ${raw(ROLES.map((r) => `<option value="${r.id}">${t(r.key)}</option>`))}
            </select>
          </div>

          <div class="field">
            <label for="fb-name">${t('feedback.name')}</label>
            <input class="input" id="fb-name" name="name" type="text" autocomplete="name">
          </div>

          <button class="btn btn-primary btn-lg btn-wide" type="submit">${t('feedback.submit')}</button>
        </form>

        <aside class="feedback-side">
          ${raw(phonePanel())}
          ${raw(admin ? adminPanel(stored) : '')}
        </aside>
      </div>
    </div>`,

    mount: (root) => mount(root, admin),
  };
}

function ratingGroup(r) {
  return `<fieldset class="rating">
    <legend>${t(r.key)}</legend>
    <div class="rating-scale">
      ${SCALE.map((n) => `<label class="diamond-radio">
        <input type="radio" name="${r.id}" value="${n}" required>
        <span class="diamond-mark" aria-hidden="true"></span>
        <span class="sr">${t('feedback.stars', { n })}</span>
        <span class="diamond-num" aria-hidden="true">${num(n)}</span>
      </label>`).join('')}
    </div>
  </fieldset>`;
}

/**
 * The phone route into the same feedback.
 *
 * Only drawn when a form URL has actually been configured and the QR for it
 * generated — a code that resolves to nothing is worse than no code, because
 * somebody will scan it in front of you.
 */
function phonePanel() {
  if (!CONFIG.links.feedbackFormUrl) return '';
  return `<section class="panel">
    <h2 class="section-title">${t('feedback.onPhone')}</h2>
    <p class="small muted">${t('feedback.onPhoneBody')}</p>
    <div class="qr"><img src="./assets/qr-feedback.svg" alt="" width="132" height="132"></div>
  </section>`;
}

function adminPanel(rows) {
  return `<section class="panel panel-sunk" id="admin-panel">
    <h2 class="section-title">${t('feedback.admin')}</h2>
    <p class="tnum">${t('feedback.count', { n: rows.length })}</p>
    <div class="row">
      <button class="btn btn-outline" id="act-export" type="button">${icon('download', { size: 'sm' })}${t('feedback.export')}</button>
      <button class="btn btn-quiet" id="act-clear" type="button">${t('feedback.clear')}</button>
    </div>
    ${rows.length ? `<ul class="admin-list">${rows.slice(-8).reverse().map((r) => `<li>
      <b class="tnum">${RATINGS.map((x) => num(r[x.id] ?? 0)).join(' / ')}</b>
      <span class="small muted">${r.role ?? ''}${r.name ? ` — ${r.name}` : ''}</span>
      ${r.comment ? `<span class="small">${r.comment}</span>` : ''}
    </li>`).join('')}</ul>` : ''}
  </section>`;
}

/* ----------------------------------------------------------------- mount */

function mount(root, admin) {
  const form = $('#feedback-form', root);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);

    const missing = RATINGS.filter((r) => !data.get(r.id));
    if (missing.length) {
      // Focus the first unanswered group rather than only colouring it red:
      // at a kiosk the person is standing up and reading from a metre away.
      $(`input[name="${missing[0].id}"]`, root)?.focus();
      toast(t('feedback.sub'));
      return;
    }

    const row = {
      at: new Date().toISOString(),
      lang: lang(),
      role: data.get('role') ?? '',
      name: String(data.get('name') ?? '').trim(),
      comment: String(data.get('comment') ?? '').trim(),
    };
    for (const r of RATINGS) row[r.id] = Number(data.get(r.id));

    const rows = read();
    rows.push(row);
    write(rows);

    form.innerHTML = `<div class="feedback-thanks">
      <p class="thanks-mark" aria-hidden="true">${icon('check', { size: 'lg' })}</p>
      <p>${t('feedback.thanks')}</p>
      <button class="btn btn-outline" id="act-again" type="button">${t('feedback.another')}</button>
    </div>`;
    announce(t('feedback.thanks'));
  });

  root.addEventListener('click', (e) => {
    if (e.target.closest('#act-again')) { location.reload(); return; }
    if (!admin) return;

    if (e.target.closest('#act-export')) exportCsv();
    if (e.target.closest('#act-clear') && confirm(t('feedback.confirmClear'))) {
      write([]);
      location.reload();
    }
  });
}

/**
 * CSV export.
 *
 * Written with a UTF-8 byte-order mark because the workbook is opened in Excel
 * on Windows, which reads a BOM-less UTF-8 CSV as Latin-1 and turns every
 * Arabic comment into mojibake.
 */
function exportCsv() {
  const rows = read();
  if (!rows.length) { toast(t('feedback.count', { n: 0 })); return; }

  const columns = ['at', 'lang', 'role', 'name', ...RATINGS.map((r) => r.id), 'comment'];
  const escape = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const csv = [
    columns.join(','),
    ...rows.map((r) => columns.map((c) => escape(r[c])).join(',')),
  ].join('\r\n');

  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `warif-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
