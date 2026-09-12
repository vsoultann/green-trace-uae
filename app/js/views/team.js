/**
 * The team.
 *
 * v1 drew a percentage bar for each member — 28%, 20%, 19% — which was working
 * directly against the thing it was meant to evidence: the assessment grades
 * equal participation, and a chart ranking five teammates against each other
 * argues the opposite. It was also a number nobody could actually measure.
 *
 * What replaces it is what an evaluator can check: what each person was
 * responsible for, and which part of the presentation they deliver. v1 also
 * listed two people as Team Leader; there is one.
 */
import { html, raw } from '../ui/dom.js';
import { bilingual } from '../ui/bilingual.js';
import { t, lang, L } from '../i18n.js';
import { SUPERVISOR, LEADER, MEMBERS } from '../data/team.js';
import { CONFIG } from '../config.js';
import { projectNav } from './project.js';

export default function teamView() {
  return {
    html: html`<div class="shell team-page">
      ${raw(projectNav('/team'))}

      <header class="page-head">
        ${raw(bilingual({ en: 'Team', ar: 'الفريق' }, { size: 'l', tag: 'h1' }))}
        <p class="lede">${t('team.equal')}</p>
      </header>

      ${raw(schoolCard())}

      <section aria-labelledby="supervisor-title" class="team-section">
        <div class="section-head"><h2 id="supervisor-title">${t('team.supervisor')}</h2></div>
        <article class="panel person person-supervisor">
          <div class="person-head">
            ${raw(avatar(initials(SUPERVISOR.name)))}
            <div>
              ${raw(bilingual({ en: SUPERVISOR.name, ar: SUPERVISOR.ar }, { size: 'm', tag: 'h3' }))}
              <p class="small muted">${L(SUPERVISOR.role)}</p>
            </div>
          </div>
          <p>${L(SUPERVISOR.note)}</p>
          ${raw(CONFIG.supervisor.todo ? `<p><span class="todo">${t('misc.todo')}</span> <span class="small muted">${CONFIG.supervisor.todo}</span></p>` : '')}
        </article>
      </section>

      <section aria-labelledby="leader-title" class="team-section">
        <div class="section-head"><h2 id="leader-title">${t('team.leader')}</h2></div>
        ${raw(person(LEADER))}
      </section>

      <section aria-labelledby="members-title" class="team-section">
        <div class="section-head"><h2 id="members-title">${t('team.members')}</h2></div>
        <div class="member-grid">
          ${raw(MEMBERS.map(person))}
        </div>
      </section>
    </div>`,
  };
}

/**
 * The school lockup.
 *
 * Falls back to type when app/img/ats-logo.png has not been added yet, rather
 * than showing a broken image on a page an evaluator is reading. The file is
 * listed in CONFIG with a note, and `npm test` prints that note.
 */
function schoolCard() {
  return html`<section class="panel school" aria-labelledby="school-title">
    ${raw(CONFIG.school.hasLogo
      ? `<img class="school-logo" src="${CONFIG.school.logo}" alt="" width="120" height="120">`
      : `<span class="school-mark" aria-hidden="true">${CONFIG.school.short}</span>`)}
    <div>
      ${raw(bilingual({ en: CONFIG.school.en, ar: CONFIG.school.ar }, { size: 'm', tag: 'h2', id: 'school-title' }))}
      <p class="small muted">${L(CONFIG.programme)} — ${CONFIG.programme.year}</p>
      ${raw(CONFIG.school.todo ? `<p class="small muted"><span class="todo">${t('misc.todo')}</span> ${CONFIG.school.todo}</p>` : '')}
    </div>
  </section>`;
}

function person(m) {
  return `<article class="panel person" id="member-${m.id}">
    <div class="person-head">
      ${avatar(m.initials)}
      <div>
        <div class="bi bi-m">
          <h3 class="bi-lead" ${lang() === 'ar' ? 'lang="ar" dir="rtl"' : 'lang="en" dir="ltr"'}>${lang() === 'ar' ? m.ar : m.name}</h3>
          <span class="bi-alt" ${lang() === 'ar' ? 'lang="en" dir="ltr"' : 'lang="ar" dir="rtl"'}>${lang() === 'ar' ? m.name : m.ar}</span>
        </div>
        <p class="small muted">${L(m.role)}</p>
      </div>
    </div>

    <h4 class="person-label">${t('team.responsibilities')}</h4>
    <ul class="person-list">
      ${L(m.responsibilities).map((r) => `<li>${r}</li>`).join('')}
    </ul>

    <h4 class="person-label">${t('team.speaks')}</h4>
    <p class="person-speaks">${L(m.speaks)}</p>
  </article>`;
}

/**
 * A placeholder portrait.
 *
 * The team have not supplied photographs, and two initials set in the display
 * face is an honest placeholder — unlike a stock silhouette, which pretends to
 * be a person. Replace with real portraits by adding an `img` to each entry in
 * data/team.js.
 */
function avatar(text) {
  return `<span class="avatar" aria-hidden="true">${text}</span>`;
}

function initials(name) {
  return name.replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, '')
    .split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}
