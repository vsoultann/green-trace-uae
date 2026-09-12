/**
 * The project hub.
 *
 * One story in five parts: this page carries the why, and links to the how, the
 * measurements, the history and the people. Body prose is single-language —
 * v1 stacked English and Arabic paragraph on paragraph, which doubled the
 * length of every page and left both readers hunting for their own thread.
 * Headings stay bilingual, in the manner of UAE road signage.
 */
import { html, raw } from '../ui/dom.js';
import { bilingual } from '../ui/bilingual.js';
import { t, lang, L } from '../i18n.js';
import { icon } from '../icons.js';
import { SECTIONS, QUOTES, LEADERS } from '../data/about.js';
import { CONFIG } from '../config.js';
import { SPECIES } from '../data/species.js';
import { counts } from '../metadata.js';

/** The Project pages, as one navigation, reused by each of them. */
export const PROJECT_NAV = [
  { path: '/project', key: 'project.title' },
  { path: '/project/how', key: 'project.how' },
  { path: '/project/lab', key: 'project.lab' },
  { path: '/project/journey', key: 'project.journey' },
  { path: '/team', key: 'project.team' },
];

export function projectNav(active) {
  return html`<nav class="subnav" aria-label="${t('project.title')}">
    ${raw(PROJECT_NAV.map((p) => `<a href="#${p.path}"${p.path === active ? ' aria-current="page"' : ''}>${t(p.key)}</a>`))}
  </nav>`;
}

export default function projectView() {
  const tally = counts(SPECIES.length);

  return {
    html: html`<div class="shell project-page">
      ${raw(projectNav('/project'))}

      <header class="page-head">
        ${raw(bilingual({ en: 'The project', ar: 'المشروع' }, { size: 'l', tag: 'h1' }))}
        <p class="lede">${L(CONFIG.product.descriptor)}</p>
      </header>

      <section class="panel name-story">
        <div class="section-head">
          ${raw(bilingual({ en: 'The name', ar: 'الاسم' }, { size: 'm', tag: 'h2' }))}
        </div>
        <p class="name-word" lang="ar" dir="rtl">وارِف</p>
        <p class="measure">${L(CONFIG.product.meaning)}</p>
        <p class="name-tagline">${L(CONFIG.product.tagline)}</p>
      </section>

      <div class="prose-columns">
        ${raw(SECTIONS.filter((s) => s.id !== 'how').map(section))}
      </div>

      ${raw(quoteBlock(QUOTES.zayedAgriculture))}

      <section class="leaders" aria-labelledby="leaders-title">
        <h2 id="leaders-title" class="sr">${t('project.title')}</h2>
        <div class="leader-row">
          ${raw(LEADERS.map(leaderCard))}
        </div>
      </section>

      <section class="project-links" aria-labelledby="more-title">
        <div class="section-head"><h2 id="more-title">${t('project.more')}</h2></div>
        <div class="link-cards">
          ${raw(linkCard('/project/how', 'project.how', 'project.howSub', 'weave'))}
          ${raw(linkCard('/project/lab', 'project.lab', 'project.labSub', 'grid'))}
          ${raw(linkCard('/project/journey', 'project.journey', 'project.journeySub', 'clock'))}
          ${raw(linkCard('/team', 'project.team', 'project.teamSub', 'team'))}
        </div>
      </section>

      <p class="small muted">${t('scan.knowsSub', { n: tally.library, m: tally.recognised ?? '—' })} ${L(CONFIG.disclaimer)}</p>
    </div>`,
  };
}

function section(s) {
  return `<section class="prose">
    <h2>${L(s.heading)}</h2>
    ${L(s.body).map((p) => `<p>${p}</p>`).join('')}
  </section>`;
}

/**
 * A quotation, set as one.
 *
 * The `todo` carried in the data becomes a visible marker rather than a comment
 * nobody reads: a line attributed to the Founding Father on a screen in front of
 * evaluators is worth thirty seconds of verification, and the page says so until
 * somebody has done it.
 */
function quoteBlock(q) {
  return `<figure class="quote">
    <blockquote>${L(q)}</blockquote>
    <figcaption>
      <b>${L(q.who)}</b>
      <span class="small muted">${L(q.title)}</span>
      ${q.todo ? `<span class="todo" title="${q.todo}">${t('misc.todo')}</span>` : ''}
    </figcaption>
  </figure>`;
}

/**
 * A leader's portrait.
 *
 * No filter, no crop through the face, no animation, and the official title
 * exactly as it is written. The credit line stays with the photograph.
 */
function leaderCard(l) {
  return `<figure class="leader">
    <img src="${l.img}" alt="${L(l.name)}" width="440" height="440" loading="lazy">
    <figcaption>
      <b>${L(l.name)}</b>
      <span class="small muted">${L(l.title)}</span>
      <span class="small muted credit">${l.credit}</span>
    </figcaption>
  </figure>`;
}

function linkCard(path, titleKey, subKey, iconName) {
  return `<a class="link-card" href="#${path}">
    <span class="link-icon" aria-hidden="true">${icon(iconName)}</span>
    <span>
      <b>${t(titleKey)}</b>
      <span class="small muted">${t(subKey)}</span>
    </span>
  </a>`;
}
