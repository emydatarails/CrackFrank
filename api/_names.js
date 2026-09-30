// Player-name check for the public leaderboard (used by api/register.js). No dependencies.
// Names are already limited to 3–20 letters, digits, dots, dashes and underscores (USER_RE in _lib.js), so the usual
// dodges are digits for letters (5h1t), separators (s.h.i.t) and repeated letters (shiiit). All three are undone first.
// Two lists, so innocent words aren't caught (the "Scunthorpe problem"):
//   ANYWHERE: blocked even inside a longer name, minus the known innocent words in ALLOW.
//   WHOLE:    blocked only as a whole name or as one word of it (Big_Dick, BigDick), because they sit inside
//             real words and names (analyst, Dickens, Hancock, grape, cumulus, Sussex).
// RESERVED: names that could pass for staff or the company.

const ANYWHERE = ['fuck', 'shit', 'cunt', 'nigger', 'nigga', 'faggot', 'whore', 'slut', 'bitch', 'bastard', 'asshole',
  'motherf', 'wanker', 'twat', 'bollock', 'dildo', 'jizz', 'porn', 'penis', 'vagina', 'rapist', 'retard', 'hitler',
  'nazis', 'pedo', 'paedo', 'molest'];
const WHOLE = ['cock', 'cocks', 'dick', 'dicks', 'pussy', 'rape', 'raped', 'raping', 'nazi', 'anal', 'anus', 'cum', 'tits',
  'titty', 'boobs', 'sex', 'sexy', 'chink', 'spic', 'kike', 'wank', 'fag', 'fags', 'dyke', 'tranny', 'coon',
  'gook', 'wop', 'jap', 'nig', 'ass', 'arse', 'piss', 'prick', 'nude', 'naked', 'horny', 'milf', 'hoe', 'hoes', 'thot',
  'jihad', 'kkk'];
const ALLOW = ['scunthorp', 'penistone', 'therapist', 'snigger', 'shitake', 'shiitake', 'retardant', 'cockburn',
  'pedometer', 'torpedo', 'speedo', 'pedal', 'pedro'];
const RESERVED = ['admin', 'administrator', 'root', 'system', 'sysadmin', 'moderator', 'mod', 'support', 'staff', 'official',
  'helpdesk', 'it', 'packa', 'packacorp', 'packacorporation', 'datarails', 'null', 'undefined', 'anonymous', 'guest'];

const LEET = { 0: 'o', 1: 'i', 2: 'z', 3: 'e', 4: 'a', 5: 's', 6: 'g', 7: 't', 8: 'b', 9: 'g' };
const collapse = s => s.replace(/(.)\1+/g, '$1');               // shiiit → shit
const letters = s => s.toLowerCase().replace(/[0-9]/g, d => LEET[d]).replace(/[^a-z]/g, '');
const bare = s => s.toLowerCase().replace(/[^a-z]/g, '');        // digits dropped instead (Frank2 → frank)
// each word also in its collapsed spelling (asshole → ashole), unless that leaves under 3 letters (kkk → k)
const REAL = ['niger'];                                           // collapsed spellings that are real words (Niger, Nigeria)
const both = w => collapse(w).length >= 3 && !REAL.includes(collapse(w)) ? [w, collapse(w)] : [w];
const setOf = a => new Set(a.flatMap(both));
const ANY_FORMS = ANYWHERE.flatMap(both), ALLOW_FORMS = ALLOW.flatMap(w => [w, collapse(w)]);
const WHOLE_SET = setOf(WHOLE), RESERVED_SET = new Set(RESERVED);

// the words of a name: split at . _ - and at camelCase (BigDick → Big, Dick)
const words = name => name.split(/[._-]+|(?<=[a-z])(?=[A-Z])/).filter(Boolean);

function nameProblem(name) {
  const n = String(name || '');
  const forms = new Set([letters(n), bare(n)]);
  for (const f of [...forms]) forms.add(collapse(f));
  for (const f of forms) if (RESERVED_SET.has(f)) return 'reserved';
  for (let f of forms) {
    for (const ok of ALLOW_FORMS) f = f.split(ok).join('');
    for (const w of ANY_FORMS) if (f.includes(w)) return 'rude';
  }
  const parts = [n, ...words(n)];
  for (const p of parts) for (const f of [letters(p), bare(p)]) {
    if (WHOLE_SET.has(f) || WHOLE_SET.has(collapse(f))) return 'rude';
  }
  return null;
}

module.exports = { nameProblem };
