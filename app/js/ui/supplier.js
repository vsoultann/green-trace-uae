/**
 * One shop, as a row.
 *
 * Shared by the result screen and the Help page so the two can never drift into
 * showing the same business differently.
 *
 * Two rules it exists to hold: a phone number that is not in the data does not
 * get a Call button rather than a made-up one, and a shop with no recorded
 * opening hours says so. OpenStreetMap is volunteer data — being honest about
 * its gaps is what makes the rest of it trustworthy.
 */
import { t, lang, L } from '../i18n.js';
import { icon } from '../icons.js';
import { formatDistance, directionsURL, telURL } from '../nearby.js';

export function supplierRow(s) {
  const distance = formatDistance(s.km, lang());
  const hours = s.hours ? L(s.hours) : null;

  return `<li class="supplier">
    <div class="supplier-name">
      <b>${L(s.name)}</b>
      <span class="small muted">${L(s.emirate)}${distance ? ` — ${distance}` : ''}</span>
      <span class="small muted">${hours ?? t('help.noHours')}</span>
    </div>
    <div class="supplier-actions">
      ${s.phone ? `<a class="btn btn-outline" href="${telURL(s.phone)}">${icon('call', { size: 'sm' })}${t('help.call')}</a>` : ''}
      <a class="btn btn-outline" href="${directionsURL(s, lang())}" target="_blank" rel="noopener">
        ${icon('directions', { size: 'sm' })}${t('help.directions')}
      </a>
    </div>
  </li>`;
}
