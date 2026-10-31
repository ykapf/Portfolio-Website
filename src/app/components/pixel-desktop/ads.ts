import { C, col, Gfx, textWidth, truncate, wrap } from "./gfx";
import { BANK } from "./navigation";
import type { PhotoKind } from "./photos";
import { blink, LINKEDIN_URL } from "./ui";

/** The advertiser's own (parody) website, opened inside the browser when the banner is clicked. */
export interface AdSite {
  url: string;
  hero: string;
  photo: PhotoKind;
  features: [string, string][];
  quote: string;
  cta: string;
  ctaResult: string;
  /** Extra product photos shown under the hero, with captions. */
  gallery?: [PhotoKind, string][];
  /** A browser page the CTA navigates to instead of showing `ctaResult`. */
  opens?: number;
}

/** A parody banner ad, drawn either as a tall side skyscraper or a short wide strip. */
export interface Ad {
  name: string;
  head: string[];
  sub: string;
  fine: string;
  cta: string;
  badge?: string;
  bg: number;
  band: number;
  nameC: number;
  headC: number;
  subC: number;
  fineC: number;
  ctaBg: number;
  ctaC: number;
  /** A real page to open instead of an in-browser site. */
  link?: string;
  site?: AdSite;
  /** Mascot drawn in a 22×22 box. */
  art(g: Gfx, x: number, y: number, t: number): void;
  deco?(g: Gfx, w: number, h: number, t: number): void;
}

function clouds(g: Gfx, w: number, h: number, t: number, c: number): void {
  for (let i = 0; i < 4; i++) {
    const x = Math.round(((i * 37 + t * 2) % (w + 24)) - 12);
    const y = 24 + ((i * 53) % Math.max(1, h - 40));
    g.disc(x, y, 5, c);
    g.disc(x + 6, y + 1, 4, c);
    g.disc(x - 6, y + 2, 3, c);
  }
}

function stripes(g: Gfx, w: number, h: number, c: number): void {
  for (let y = 0; y < h; y += 6) g.fill(0, y, w, 2, c);
}

export const ADS: Ad[] = [
  {
    name: "ANGSTIPAN",
    head: ["IT", "CURES", "EMO-", "TIONS!"],
    sub: "AMERICA'S FAVOURITE DISSOCIATIVE!",
    fine: "CALL YOUR DOCTOR IF NUMBNESS LASTS MORE THAN 4 HOURS. RESULTS MAY VARY.",
    cta: "ASK YOUR GP",
    badge: "NEW!",
    bg: col(200, 225, 248),
    band: col(40, 110, 200),
    nameC: C.white,
    headC: col(36, 40, 150),
    subC: col(36, 40, 150),
    fineC: col(100, 120, 160),
    ctaBg: col(40, 110, 200),
    ctaC: C.white,
    deco: (g, w, h, t) => clouds(g, w, h, t, col(232, 242, 253)),
    art(g, x, y) {
      const o = col(90, 120, 180);
      const p = col(178, 205, 240);
      g.disc(x + 11, y + 7, 7, o);
      g.disc(x + 11, y + 14, 7, o);
      g.fill(x + 4, y + 7, 15, 8, o);
      g.disc(x + 11, y + 7, 6, p);
      g.disc(x + 11, y + 14, 6, p);
      g.fill(x + 5, y + 7, 13, 8, p);
      g.fill(x + 7, y + 3, 2, 3, C.white);
      g.fill(x + 7, y + 10, 3, 1, C.black);
      g.fill(x + 13, y + 10, 3, 1, C.black);
      g.fill(x + 8, y + 15, 7, 1, C.black);
      g.px(x + 7, y + 14, C.black);
      g.px(x + 15, y + 14, C.black);
    },
    site: {
      url: "ANGSTIPAN.COM",
      hero: "FEEL NOTHING. ACHIEVE EVERYTHING. (ACHIEVEMENT NOT GUARANTEED.)",
      photo: "pills",
      features: [
        ["FAST ACTING", "MOST USERS STOP CARING WITHIN 20 MINUTES. SOME STOP CARING BEFORE THEY EVEN OPEN THE BOX."],
        ["ONE A DAY", "OR TWO. OR WHATEVER. HONESTLY, WHO'S COUNTING? NOT YOU, AFTER THE FIRST ONE."],
        ["CLINICALLY TESTED", "ON 12 VOLUNTEERS, ALL OF WHOM SAID THE RESULTS WERE 'FINE, I GUESS'."],
      ],
      quote: "'I USED TO HAVE FEELINGS. NOW I HAVE A HOBBY: STARING.' - DEBBIE, 41",
      cta: "ORDER NOW",
      ctaResult: "ORDER PLACED. YOU FEEL... NOTHING ABOUT IT. IT'S WORKING ALREADY.",
    },
  },
  {
    name: "SUNNY GETAWAYS",
    head: ["7 NIGHTS", "ONLY", "$9.99*"],
    sub: "SUN, SEA, AND A SURPRISINGLY LONG BUS TRANSFER",
    fine: "*FLIGHTS, HOTEL, FOOD AND SUN NOT INCLUDED. DEPARTS 4AM.",
    cta: "BOOK NOW",
    badge: "-90%",
    bg: col(110, 200, 245),
    band: col(240, 110, 40),
    nameC: C.white,
    headC: C.white,
    subC: col(10, 60, 120),
    fineC: col(30, 90, 150),
    ctaBg: C.yellow,
    ctaC: col(180, 50, 0),
    deco(g, w, h, t) {
      clouds(g, w, h, t * 1.5, col(200, 235, 252));
      g.fill(0, h - 22, w, 22, col(40, 140, 200));
      for (let x = 0; x < w; x += 6) g.px(x + (Math.floor(t * 3) % 6), h - 20, C.white);
    },
    art(g, x, y, t) {
      g.disc(x + 15, y + 7, 6, C.yellow);
      const bob = Math.floor(t * 2) % 2;
      g.fill(x, y + 12 + bob, 18, 3, C.white);
      g.fill(x + 15, y + 10 + bob, 5, 3, C.white);
      g.fill(x + 6, y + 8 + bob, 4, 10, col(220, 230, 240));
      g.fill(x, y + 10 + bob, 2, 3, C.red);
      for (let i = 0; i < 3; i++) g.px(x + 4 + i * 4, y + 13 + bob, col(60, 110, 190));
    },
    site: {
      url: "SUNNYGETAWAYS.TRAVEL",
      hero: "YOUR DREAM HOLIDAY, AT A PRICE THAT SHOULD HAVE BEEN A WARNING.",
      photo: "plane",
      features: [
        ["7 NIGHTS ALL-INCLUSIVE*", "*INCLUDES: A ROOM. EXCLUDES: A WINDOW, A BED, AND THE ROOM."],
        ["SEA VIEW ROOMS", "SEA VISIBLE FROM THE ROOF IF YOU STAND ON THE AIR CONDITIONING UNIT AND SQUINT."],
        ["FREE AIRPORT TRANSFER", "A RELAXING 4 HOUR COACH JOURNEY, STOPPING AT 31 OTHER HOTELS AND A MAN'S HOUSE."],
      ],
      quote: "'THE POOL WAS CLOSED BUT THE CAR PARK WAS LOVELY.' - 2 STARS, TRIPADVISOR",
      cta: "BOOK FOR $9.99",
      ctaResult: "BOOKED! PLUS $1,240 IN TAXES, FEES, SEAT SELECTION AND A 'SUN SURCHARGE'.",
    },
  },
  {
    name: "BEAN MACHINE",
    head: ["SLEEP", "IS FOR", "THE", "WEAK"],
    sub: "NOW WITH 400% MORE CAFFEINE",
    fine: "NOT RECOMMENDED BY ANY DOCTOR, EVER. DO NOT OPERATE HEAVY CODE.",
    cta: "ORDER NOW",
    bg: col(60, 35, 22),
    band: col(150, 90, 40),
    nameC: col(255, 230, 190),
    headC: C.white,
    subC: col(240, 200, 140),
    fineC: col(160, 120, 90),
    ctaBg: col(240, 200, 140),
    ctaC: col(60, 35, 22),
    deco: (g, w, h) => stripes(g, w, h, col(70, 42, 26)),
    art(g, x, y, t) {
      const brown = col(120, 70, 30);
      for (let i = 0; i < 3; i++) g.fill(x + 6 + i * 4, y + 1 + ((Math.floor(t * 4) + i) % 3), 1, 3, col(200, 200, 200));
      g.fill(x + 3, y + 6, 14, 2, col(80, 45, 20));
      g.fill(x + 4, y + 8, 12, 12, C.white);
      g.fill(x + 4, y + 12, 12, 4, brown);
      g.frame(x + 16, y + 10, 4, 6, C.white);
      g.fill(x + 2, y + 20, 16, 1, C.light);
    },
    site: {
      url: "BEANMACHINE.COFFEE",
      hero: "COFFEE SO STRONG YOU'LL HEAR COLOURS.",
      photo: "coffee",
      features: [
        ["THE DEVELOPER", "A QUADRUPLE ESPRESSO POURED DIRECTLY INTO AN ENERGY DRINK. SERVED WITH A DEFIBRILLATOR."],
        ["THE ALL-NIGHTER", "WE DON'T KNOW WHAT'S IN IT. THE BARISTA WHO MADE THE FIRST ONE IS STILL AWAKE."],
        ["DECAF", "WE DON'T DO DECAF. PLEASE LEAVE."],
      ],
      quote: "'I HAD ONE AND REFACTORED THE WHOLE CODEBASE. I DON'T REMEMBER ANY OF IT.' - JAKE, DEV",
      cta: "ORDER A LARGE",
      ctaResult: "ORDER RECEIVED. YOUR HEART RATE HAS BEEN NOTIFIED.",
    },
  },
  {
    name: "SMILEX",
    head: ["NEVER", "FROWN", "AGAIN"],
    sub: "ASK YOUR DOCTOR IF SMILING IS RIGHT FOR YOU.",
    fine: "SIDE EFFECTS MAY INCLUDE PERMANENT GRIN, CHEEK CRAMP AND UNPROMPTED THUMBS UP.",
    cta: "TRY FREE",
    badge: "FREE!",
    bg: col(255, 240, 150),
    band: col(220, 60, 30),
    nameC: C.white,
    headC: col(200, 40, 40),
    subC: C.dark,
    fineC: col(150, 110, 40),
    ctaBg: col(220, 60, 30),
    ctaC: C.white,
    deco(g, w, h) {
      for (let y = 0; y < h; y += 10) for (let x = (y / 10) % 2 ? 5 : 0; x < w; x += 10) g.px(x, y, col(250, 220, 100));
    },
    art(g, x, y) {
      g.disc(x + 11, y + 11, 10, col(180, 120, 0));
      g.disc(x + 11, y + 11, 9, C.yellow);
      g.fill(x + 7, y + 6, 2, 3, C.black);
      g.fill(x + 13, y + 6, 2, 3, C.black);
      g.fill(x + 6, y + 13, 11, 4, C.black);
      g.fill(x + 7, y + 14, 9, 1, C.white);
      g.px(x + 5, y + 12, C.black);
      g.px(x + 17, y + 12, C.black);
    },
    site: {
      url: "SMILEX.HEALTH",
      hero: "THE ONLY SMILE THAT DOESN'T REACH YOUR EYES, BECAUSE IT DOESN'T NEED TO.",
      photo: "pills",
      features: [
        ["PERMANENT RESULTS", "ONE DOSE AND YOU'LL BE SMILING FOREVER. LITERALLY. WE HAVE TRIED TO STOP IT. WE CAN'T."],
        ["GREAT FOR WORK", "SMILE THROUGH MEETINGS, PERFORMANCE REVIEWS AND THE THIRD RESTRUCTURE THIS YEAR."],
        ["FAMILY FRIENDLY", "NOW AVAILABLE FOR DOGS. THEY WERE ALREADY SMILING. NOW THEY CAN'T STOP."],
      ],
      quote: "'I HAVEN'T STOPPED SMILING SINCE MARCH. PLEASE HELP.' - GREG, 29",
      cta: "CLAIM FREE TRIAL",
      ctaResult: "FREE TRIAL STARTED. YOU WILL BE BILLED $49.99 A MONTH UNTIL THE SUN EXPLODES.",
    },
  },
  {
    name: "FLEECA BANK",
    head: ["WE'LL", "HOLD", "YOUR", "MONEY"],
    sub: "PROBABLY.",
    fine: "FLEECA IS NOT RESPONSIBLE FOR HEISTS, ROBBERIES OR GUYS IN MASKS.",
    cta: "OPEN ACCOUNT",
    bg: col(18, 110, 64),
    band: col(8, 70, 40),
    nameC: C.white,
    headC: C.yellow,
    subC: C.white,
    fineC: col(150, 210, 170),
    ctaBg: C.yellow,
    ctaC: col(8, 70, 40),
    deco: (g, w, h) => stripes(g, w, h, col(22, 120, 70)),
    art(g, x, y) {
      g.disc(x + 11, y + 11, 10, col(150, 100, 0));
      g.disc(x + 11, y + 11, 9, C.gold);
      g.disc(x + 11, y + 11, 7, C.yellow);
      g.textC("$", x + 11, y + 6, col(150, 100, 0), 2);
    },
    site: {
      url: "FLEECA.BANK",
      hero: "BANKING THAT'S ALMOST CERTAINLY SAFE.",
      photo: "vault",
      features: [
        ["0.0001% INTEREST", "WATCH YOUR SAVINGS GROW BY ALMOST A WHOLE PENNY OVER THE NEXT 40 YEARS."],
        ["24/7 SUPPORT", "OUR PHONE LINES ARE OPEN 24/7. NOBODY ANSWERS THEM, BUT THEY ARE OPEN."],
        ["STATE OF THE ART VAULT", "PROTECTED BY A 6-DIGIT CODE. THE CODE IS 123456. PLEASE DON'T TELL ANYONE."],
      ],
      quote: "'MY MONEY WAS SAFE RIGHT UP UNTIL IT WASN'T.' - MICHAEL, RETIRED",
      cta: "OPEN BANKING >",
      ctaResult: "",
      opens: BANK,
    },
  },
  {
    name: "GREASE KING",
    head: ["2 FOR", "$1*", "MEGA", "STACK"],
    sub: "FLAME GRILLED. MOSTLY BY ACCIDENT.",
    fine: "*SECOND BURGER IS A PICTURE OF A BURGER. CALORIES: YES.",
    cta: "ORDER NOW",
    badge: "HOT!",
    bg: col(255, 205, 40),
    band: col(200, 24, 24),
    nameC: C.yellow,
    headC: col(200, 24, 24),
    subC: col(110, 20, 10),
    fineC: col(150, 90, 10),
    ctaBg: col(200, 24, 24),
    ctaC: C.yellow,
    deco(g, w, h, t) {
      for (let y = 0; y < h; y += 12) {
        for (let x = ((y / 12) % 2) * 6 - (Math.floor(t * 4) % 12); x < w; x += 12) g.fill(x, y, 3, 2, col(255, 222, 90));
      }
    },
    art(g, x, y) {
      const bun = col(220, 140, 50);
      g.fill(x + 3, y + 4, 16, 6, bun);
      g.fill(x + 5, y + 2, 12, 2, bun);
      for (let i = 0; i < 4; i++) g.px(x + 6 + i * 3, y + 4 + (i % 2), col(255, 240, 200));
      g.fill(x + 2, y + 10, 18, 2, col(80, 190, 60));
      g.fill(x + 3, y + 12, 16, 3, col(110, 50, 25));
      g.fill(x + 2, y + 15, 18, 1, col(255, 200, 30));
      g.fill(x + 3, y + 16, 16, 4, bun);
      g.px(x + 8, y + 6, C.black);
      g.px(x + 13, y + 6, C.black);
      g.fill(x + 9, y + 8, 4, 1, C.black);
    },
    site: {
      url: "GREASEKING.FOOD",
      hero: "FAST FOOD. SLOW DIGESTION. ORDERED WRONG SINCE 1987.",
      photo: "burger",
      gallery: [
        ["burger", "THE MEGA STACK. ACTUAL SIZE MAY BE 40% SMALLER AND 100% SADDER."],
        ["fries", "LARGE FRIES. NOW WITH EXTRA SALT, AND THEN SOME MORE SALT."],
        ["nuggets", "20 PIECE NUGGETS. EACH ONE A DIFFERENT, UNSETTLING SHAPE."],
      ],
      features: [
        ["WE ONLY USE SEED OILS", "EVERYTHING IS FRIED IN A BLEND OF 14 SEED OILS. WE CHANGE IT EVERY LEAP YEAR, WHETHER IT NEEDS IT OR NOT."],
        ["SPAWN-CAMPED CHICKENS", "WE SPAWN CAMP OUR CHICKENS TO MAXIMISE THE AMOUNT AND SPEED OF CHICKEN NUGGETS TO YOUR TABLE. RESPAWN TIME: 4 SECONDS."],
        ["100% NATURALLY BRITISH BEEF", "OUR BEEF IS 100% NATURALLY BRITISH, MADE IN A LAB. THE LAB IS IN BRITAIN. THAT'S THE NATURAL PART."],
        ["FRESH, NEVER FROZEN*", "*FROZEN. BUT EMOTIONALLY, VERY FRESH."],
        ["SECRET SAUCE", "IT'S MAYONNAISE AND KETCHUP. PLEASE STOP ASKING. OUR LAWYERS SAY IT IS STILL A SECRET."],
      ],
      quote: "'I ORDERED A SALAD AND THEY GAVE ME A BURGER ON A LETTUCE. 5 STARS.' - DARREN, 34",
      cta: "ORDER NOW",
      ctaResult: "ORDER PLACED! ESTIMATED DELIVERY: 3-5 WORKING DAYS. IT WILL STILL BE HOT. WE DON'T KNOW WHY.",
    },
  },
  {
    name: "YKAPF",
    head: ["WILL", "CODE", "FOR", "SPRUNK"],
    sub: "OPEN TO WORK",
    fine: "CLICK HERE. GO ON. NO VIRUSES, PROMISE.",
    cta: "HIRE ME",
    badge: "HOT!",
    bg: C.black,
    band: C.pink,
    nameC: C.black,
    headC: C.white,
    subC: C.lime,
    fineC: C.shadow,
    ctaBg: C.lime,
    ctaC: C.black,
    link: LINKEDIN_URL,
    deco(g, w, h, t) {
      for (let i = 0; i < 12; i++) g.px((i * 29) % w, (i * 41 + Math.floor(t * 10)) % h, i % 2 ? C.pink : C.lime);
    },
    art(g, x, y) {
      g.disc(x + 11, y + 11, 10, C.pink);
      g.textC("YK", x + 11, y + 6, C.black, 2);
    },
  },
];

/** A jagged starburst sticker (r≈9) with a short label. */
function badge(g: Gfx, cx: number, cy: number, label: string, t: number): void {
  const r = 10;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const a = Math.atan2(dy, dx) + t * 0.6;
      const edge = r - (Math.floor(((a + Math.PI) / (Math.PI * 2)) * 24) % 2 ? 2 : 0);
      if (dx * dx + dy * dy <= edge * edge) g.px(cx + dx, cy + dy, C.red);
    }
  }
  g.textC(label, cx, cy - 2, C.yellow);
}

function ctaButton(g: Gfx, ad: Ad, cx: number, y: number, maxW: number, t: number): void {
  const label = truncate(ad.cta, maxW - 6);
  const w = textWidth(label) + 8;
  const x = Math.round(cx - w / 2);
  const on = blink(t, 1.5);
  g.fill(x + 1, y + 1, w, 10, C.black);
  g.fill(x, y, w, 10, on ? ad.ctaBg : ad.band);
  g.frame(x, y, w, 10, C.black);
  g.text(label, x + 4, y + 3, on ? ad.ctaC : ad.nameC);
}

export function drawTallAd(g: Gfx, ad: Ad, w: number, h: number, t: number): void {
  g.fill(0, 0, w, h, ad.bg);
  ad.deco?.(g, w, h, t);
  const cx = w / 2;
  const name = wrap(ad.name, w - 6);
  const bandH = name.length * 7 + 4;
  g.fill(0, 0, w, bandH, ad.band);
  for (let i = 0; i < name.length; i++) g.textC(name[i], cx, 3 + i * 7, ad.nameC);
  let y = bandH + 4;
  const ax = Math.round(cx - 11);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + t * 0.4;
    for (let k = 12; k < 17; k++) g.px(Math.round(ax + 11 + Math.cos(a) * k), Math.round(y + 11 + Math.sin(a) * k), ad.band);
  }
  ad.art(g, ax, y, t);
  if (ad.badge && w >= 40) badge(g, w - 11, y + 2, ad.badge, t);
  y += 30;
  for (let i = 0; i < ad.head.length; i++) {
    const s = textWidth(ad.head[i]) * 2 <= w - 4 ? 2 : 1;
    g.textOC(ad.head[i], cx, y, ad.headC, s === 2 ? C.black : ad.bg, s);
    y += s === 2 ? 12 : 8;
  }
  y += 3;
  const sub = wrap(ad.sub, w - 6);
  for (let i = 0; i < sub.length; i++, y += 7) g.textC(sub[i], cx, y, ad.subC);
  const fine = wrap(ad.fine, w - 6);
  const fy = Math.max(y + 18, h - 3 - fine.length * 7);
  if (fy - 14 > y) ctaButton(g, ad, cx, fy - 14, w, t);
  for (let i = 0; i < fine.length; i++) g.textC(fine[i], cx, fy + i * 7, ad.fineC);
  g.frame(0, 0, w, h, C.black);
  g.frame(1, 1, w - 2, h - 2, ad.band);
}

export function drawWideAd(g: Gfx, ad: Ad, w: number, h: number, t: number): void {
  g.fill(0, 0, w, h, ad.bg);
  ad.deco?.(g, w, h, t);
  g.fill(0, 0, 26, h, ad.band);
  ad.art(g, 2, Math.round((h - 22) / 2), t);
  const x = 30;
  const ctaW = textWidth(ad.cta) + 8;
  const tw = w - x - ctaW - 6;
  g.text(truncate(ad.name, tw), x, 3, ad.subC);
  g.text(truncate(ad.head.join(" ").replace(/- /g, ""), tw), x, 10, ad.headC);
  g.text(truncate(ad.sub, tw), x, 17, ad.subC);
  ctaButton(g, ad, w - ctaW / 2 - 4, Math.round(h / 2 - 5), ctaW + 6, t);
  g.frame(0, 0, w, h, C.black);
}
