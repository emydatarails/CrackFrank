/* FRANK'S COMPUTER — AL PACKA, "Missouri's greatest alpaca hair salon", a Packa Holdings company.
   A website in Frank's Internet Explorer (the last Favorite). Photos: FR.data.images.sa_<key> (src/salon_images.js,
   made in Magnific, packed by tools/make_salon_images.py); a missing photo shows as an empty frame. No puzzle numbers here. */
(() => {
  const esc = FR.esc;
  const HOST = 'alpacka.example', URL0 = 'http://www.alpacka.example/';
  const at = p => URL0 + p;
  const img = (k, alt, cls = '') => {
    const src = FR.data.images && FR.data.images['sa_' + k];
    return src ? `<img class="sa-img ${cls}" src="${src}" alt="${esc(alt)}">` : `<div class="sa-img sa-noimg ${cls}">${esc(alt)}</div>`;
  };
  const PAGES = [['', 'Home'], ['styles.html', 'Styles &amp; Prices'], ['stories.html', 'Client Stories'], ['book.html', 'Book a Chair'], ['about.html', 'About Al']];

  const STYLES = [
    ['pompadour', 'The King', '$65', 'The classic pompadour. Twelve coats of lanolin pomade, one sculpted quiff, zero apologies. Thank you. Thank you very much.', 'Not for use near cacti.'],
    ['mullet', 'The Missouri Mullet', '$45', 'Business at the front, pasture at the back. Our best seller at the State Fair three years running, and the only haircut allowed in a pickup truck commercial.', 'Most requested by: alpacas named Dale.'],
    ['beehive', 'The Beehive', '$80', 'A foot of lift and an hour of lacquer, finished with a silk ribbon. Holds through a thunderstorm, a church picnic and one mild stampede.', 'Please duck under ceiling fans.'],
    ['mohawk', 'The Neon Mohawk', '$95', 'Three colours, one attitude. Vegetable dyes only: washes out in six to eight weeks, or after one enthusiastic roll in the mud.', 'Sides clipped with love, spikes set with sugar water.'],
    ['afro', 'The Full Fleece', '$110', 'Twice the volume, all of the funk. We pick it out by hand, strand by strand, while the stylist plays Earth, Wind &amp; Fire on the boombox.', 'Pick included. Door frames not included.'],
    ['ceo', 'The Quarterly Review', '$55', 'For the alpaca who presents to the Board. A firm side part, a light gel and an expression that says "the forecast is conservative".', 'Very popular with Packa Corporation management the week before a Board meeting.'],
  ];
  const ADDONS = [['Chin fringe shape-up (for the dramatic beard)', '$15'], ['Fringe-only touch-up, walk-in', '$20'], ['Spit guard cape (for the stylist, highly recommended)', '$5'], ['Glitter finish (seasonal, prom and weddings)', '$12'], ['Emotional support goat in the waiting area', 'free']];

  const head = cur => `<div class="sa-top"><marquee scrollamount="4">&#10022; NOW BOOKING PROM &amp; WEDDING SEASON &#10022; WALK-INS WELCOME (ALPACAS ONLY) &#10022; LLAMAS BY APPOINTMENT, AND ONLY IF THEY BEHAVE &#10022; NEW: GLITTER FINISH &#10022;</marquee></div>
    <div class="sa-head"><div class="sa-logo"><span class="sa-al">AL</span><span class="sa-pk">PACKA</span></div>
      <div class="sa-tag">Hair Design for the Discerning Alpaca<br><small>Sedalia, Missouri &middot; Est. 1998 &middot; a Packa Holdings company</small></div></div>
    <div class="sa-nav">${PAGES.map(([p, t]) => `<a data-url="${at(p)}"${p === cur ? ' class="sa-cur"' : ''}>${t}</a>`).join('')}</div>`;
  const foot = () => `<div class="sa-foot">
      <p><b>AL PACKA</b> &middot; 214 South Ohio Avenue, Sedalia, MO &middot; Tue&ndash;Sat 9&ndash;6 &middot; Closed Mondays (Al is at the feed store)</p>
      <p>A <b>Packa Holdings</b> company. Also in the family: Packa Corporation (boxes), Irene's Pies (closed Sundays), and a storage unit in Warsaw we don't talk about.</p>
      <p class="sa-fine">Packa Corporation staff get 15% off. It's intercompany, so Frank says it "eliminates on consolidation". Steve, stop expensing these. &mdash;Diane</p>
      <p class="sa-count">You are visitor <span>0 0 4 7 1 9</span> &middot; Best viewed in Internet Explorer at 800&times;600. Alpacas: any resolution.</p></div>`;
  const wrap = (cur, body) => `<div class="sa">${head(cur)}<div class="sa-body">${body}</div>${foot()}</div>`;

  function home() {
    return wrap('', `
      <div class="sa-hero">${img('salon', 'Inside the salon: a client gets the full blowout', 'sa-hero-i')}
        <div class="sa-hero-t"><h1>Say hello to my little fringe.</h1><p>Missouri's greatest alpaca hair salon.<sup>*</sup></p><a class="sa-btn" data-url="${at('book.html')}">Book a chair &raquo;</a></div></div>
      <p class="sa-star"><sup>*</sup>And, according to the Missouri Department of Agriculture, Missouri's only alpaca hair salon. Still counts.</p>
      <div class="sa-3">
        <div class="sa-box"><h3>&#9986; Cut &amp; Style</h3><p>From a humble fringe trim to a foot-tall beehive. Six signature looks, or bring us a photo of an alpaca you saw on TV.</p><a data-url="${at('styles.html')}">See the styles &raquo;</a></div>
        <div class="sa-box"><h3>&#127942; Show Ready</h3><p>Fair season? Our stylists have groomed more blue-ribbon winners than any salon between Kansas City and the Lake of the Ozarks.</p><a data-url="${at('stories.html')}">Client stories &raquo;</a></div>
        <div class="sa-box"><h3>&#128141; Weddings</h3><p>Ring bearers, flower alpacas, the whole herd. Updos, veils and baby's breath. We travel within 60 miles (Al's truck won't go further).</p><a data-url="${at('book.html')}">Book a wedding &raquo;</a></div>
      </div>
      <div class="sa-quote">&ldquo;Hoo-ah!&rdquo;<span>&mdash; Al Packa, every time a client stands up from the chair</span></div>
      <h2>This month at the salon</h2>
      <ul class="sa-news"><li><b>Prom season is here.</b> The Beehive is booked every Saturday until May. The Missouri Mullet is always available. It is always the right choice.</li>
        <li><b>Welcome Brandi!</b> Our newest stylist comes to us from a very upscale poodle parlor in Branson. She has already been spat on twice and says she "loves it here".</li>
        <li><b>Reminder:</b> we do not cut llamas. Llamas know what they did.</li></ul>`);
  }
  function styles() {
    return wrap('styles.html', `<h1 class="sa-h1">Styles &amp; Prices</h1><p class="sa-lead">Every service includes a lanolin wash, a gentle blow-dry and a carrot. Prices are per alpaca. Twins are not a discount, they are twice the work.</p>
      <div class="sa-grid">${STYLES.map(([k, n, p, d, s]) => `<div class="sa-card">${img(k, n)}<div class="sa-card-t"><h3>${n}<span>${p}</span></h3><p>${d}</p><p class="sa-note">${s}</p></div></div>`).join('')}</div>
      <h2>Add-ons</h2><table class="sa-t">${ADDONS.map(([a, p]) => `<tr><td>${a}</td><td>${p}</td></tr>`).join('')}</table>
      <p class="sa-fine">We use only natural products: lanolin, vegetable dye, sugar water and Al's secret conditioner (it's mayonnaise). Cash, check or hay.</p>`);
  }
  function stories() {
    const S = [
      ['fair', 'Duchess, 6 &middot; Blue ribbon, Missouri State Fair', 'Duchess came in the week before the Fair looking, in her owner\'s words, "like a mop somebody dropped in a creek". Brandi wove a crown of braids and tucked sunflowers into every one of them. The judge gave her Best in Show, then asked for Al\'s number, then asked if we do people.', 'Earl, from the Sedalia Rotary', 'Forty years I\'ve shown alpacas. First time the judge cried. First time I cried, too. Don\'t tell the Rotary.'],
      ['wedding', 'Pickles &middot; Ring bearer, Jolene &amp; Travis\'s barn wedding, Boonville', 'Jolene wanted her alpaca in the wedding. Travis wanted "no animals at the altar". They compromised: Pickles carried the rings in a bridal updo, a lace veil and more baby\'s breath than the bouquet.', 'Jolene, the bride', 'Everyone said the bride looked beautiful. Then they saw Pickles. I\'m not mad. I\'m a little mad. Pickles looked incredible.'],
      ['beforeafter', 'Gustavo, 9 &middot; The Glow-Up', 'Gustavo spent three years cutting his own fleece on a barbed-wire fence. It showed. Four hours, two stylists, a bottle of Al\'s conditioner and one emotional support goat later, he walked out with a Hollywood blowout and hasn\'t stopped looking at his reflection in the water trough.', 'Maria, Gustavo\'s owner', 'He used to hide behind the barn when visitors came. Now he poses for them. He has an attitude now. I created a monster and I love him.'],
      ['mohawk', 'Sid Fleecious &middot; Lead singer, The Spitters', 'Sid had a gig at the Mid-Missouri Battle of the Bands and a look that said "petting zoo". We gave him the Neon Mohawk in three colours. The Spitters came second. Sid says it was political.', 'The Spitters (via their manager, Todd)', 'Sid won\'t let anyone else touch the mohawk. Not even the bass player. Especially not the bass player.'],
    ];
    const GB = [
      ['frank_w', 'Came in for the Quarterly Review before a Board meeting. Left with the Missouri Mullet. No regrets. Steve had regrets.', 5],
      ['Kristians', 'Can you make my alpaca look like an Excel spreadsheet? Green, gridlines, the works. Al said "no". Al said it twice. Four stars because Al was polite about it.', 4],
      ['Linda W.', 'Very nice salon. My son works at Packa, maybe you know him? He never calls. Tell him to call his mother.', 5],
      ['llama_lover_77', 'Why won\'t you cut llamas??? What did they do??', 1],
      ['Al Packa (owner)', 'They know what they did.', 5],
    ];
    return wrap('stories.html', `<h1 class="sa-h1">Client Stories</h1><p class="sa-lead">Every alpaca who sits in our chair leaves with a story. These are some of our favourites, shared with permission (the owners signed; the alpacas spat on the form, which in Missouri counts).</p>
      ${S.map(([k, t, story, who, q], i) => `<div class="sa-story${i % 2 ? ' sa-rev' : ''}">${img(k, t.replace(/&middot;.*/, '').replace(/&[a-z]+;/g, ''), 'sa-story-i')}<div><h3>${t}</h3><p>${story}</p><blockquote>&ldquo;${q}&rdquo;<cite>&mdash; ${who}</cite></blockquote></div></div>`).join('')}
      <h2>Guestbook</h2><div class="sa-gb">${GB.map(([n, t, s]) => `<div class="sa-gbe"><b>${esc(n)}</b> <span class="sa-stars">${'&#9733;'.repeat(s)}${'&#9734;'.repeat(5 - s)}</span><p>${t}</p></div>`).join('')}</div>`);
  }
  function book() {
    return wrap('book.html', `<h1 class="sa-h1">Book a Chair</h1><p class="sa-lead">Fill in the form and Al will call you back from the salon phone. It's a rotary phone. Please allow some time.</p>
      <form class="sa-form" onsubmit="return false">
        <label>Alpaca's name <input type="text" class="sa-f-name" placeholder="e.g. Duchess"></label>
        <label>Your name <input type="text" placeholder="e.g. Earl"></label>
        <label>Style <select class="sa-f-style">${STYLES.map(([, n, p]) => `<option>${n} (${p})</option>`).join('')}<option>Surprise me (Al picks)</option></select></label>
        <fieldset><legend>Temperament</legend>
          <label><input type="radio" name="sa-t" checked> Calm</label><label><input type="radio" name="sa-t"> Spits sometimes</label><label><input type="radio" name="sa-t" class="sa-f-spit"> Spits always, at everyone, on purpose</label></fieldset>
        <label class="sa-chk"><input type="checkbox"> My alpaca is not a llama. (We check.)</label>
        <button class="sa-btn sa-f-go" type="button">Book my chair</button>
      </form>
      <p class="sa-fine">Cancellations: please give us 24 hours' notice, or one carrot per hour less than that.</p>`);
  }
  function about() {
    return wrap('about.html', `<h1 class="sa-h1">About Al</h1>
      <div class="sa-story">${img('salon', 'Al\'s salon on South Ohio Avenue', 'sa-story-i')}<div>
        <p><b>Alfonso "Al" Packa</b> grew up in the family box business in Sedalia, the son of Gerald Packa and a cousin of Steve, who runs Packa Corporation today. Al could fold a box by hand before he could ride a bike. He hated every minute of it.</p>
        <p>In 1998 he walked out of the corrugator room, told his father "I'm not a box man, Pop. I'm an artist," bought three alpacas and a professional hair dryer, and never looked back. His father didn't speak to him for a year. Then Gerald's own alpaca needed a trim for the Fair, and that was that.</p>
        <p>Today AL PACKA is part of <b>Packa Holdings</b>, the family's holding company, next to Packa Corporation and Irene's Pies. Al still comes to the Packa Christmas party. He still refuses to talk about boxes.</p></div></div>
      <h2>Al's rules of the chair</h2>
      <ol class="sa-rules"><li>Every alpaca is beautiful. Some just need a little help.</li><li>Never turn your back on a client mid-rinse.</li><li>We do not cut llamas.</li><li>Just when you think you're out of conditioner, Al pulls you back in.</li><li>Hoo-ah.</li></ol>
      <div class="sa-quote">&ldquo;I'm not a box man. I'm an artist.&rdquo;<span>&mdash; Al Packa, 1998, and at every Thanksgiving since</span></div>`);
  }
  const ROUTES = { '': home, 'index.html': home, 'styles.html': styles, 'stories.html': stories, 'book.html': book, 'about.html': about };
  const pathOf = url => { try { return new URL(url).pathname.replace(/^\/+/, ''); } catch (e) { return ''; } };
  const TITLES = { '': 'AL PACKA — Hair Design for the Discerning Alpaca', 'styles.html': 'Styles & Prices — AL PACKA', 'stories.html': 'Client Stories — AL PACKA', 'book.html': 'Book a Chair — AL PACKA', 'about.html': 'About Al — AL PACKA' };

  FR.ieFavs = (FR.ieFavs || []).concat([['Packa Holdings', [['AL Packa — Alpaca Hair Salon', URL0]]]]);
  FR.iePages = Object.assign(FR.iePages || {}, {
    [HOST]: {
      title: TITLES[''],
      html: url => (ROUTES[pathOf(url)] || home)(),
      onShow: (page, url) => {
        const w = FR.wm.wins.get('ie'), p = pathOf(url);
        if (w && TITLES[p]) w.setTitle(`${TITLES[p]} - Internet Explorer`);
        const go = page.querySelector('.sa-f-go');
        if (go) go.onclick = () => {
          const name = (page.querySelector('.sa-f-name').value || '').trim() || 'your alpaca';
          const style = page.querySelector('.sa-f-style').value.replace(/ \(.*/, '');
          const spit = page.querySelector('.sa-f-spit').checked;
          FR.dialog({ title: 'AL PACKA', icon: 'info', width: 380, message: `Thank you! <b>${esc(name)}</b> is pencilled in for <b>${esc(style)}</b>.<br><br>Al will call you back from the rotary phone.${spit ? '<br><br>Brandi has been told. Brandi is wearing the cape.' : ''}` });
        };
      },
    },
  });
})();
