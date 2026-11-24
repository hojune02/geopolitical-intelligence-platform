/*
 * GDELT uses two country code systems:
 *   - ActionGeo (event location): FIPS 10-4, e.g. RS = Russia, CH = China
 *   - Actor country: CAMEO, mostly ISO 3166 alpha-3, e.g. RUS, CHN
 * Both are mapped to ISO alpha-2 so names and flags come from the
 * platform (Intl.DisplayNames, regional-indicator emoji).
 *
 * Format: FIPS:ISO2:ISO3
 */
const TABLE =
  'AF:AF:AFG,AL:AL:ALB,AG:DZ:DZA,AN:AD:AND,AO:AO:AGO,AC:AG:ATG,AR:AR:ARG,AM:AM:ARM,AS:AU:AUS,' +
  'AU:AT:AUT,AJ:AZ:AZE,BF:BS:BHS,BA:BH:BHR,BG:BD:BGD,BB:BB:BRB,BO:BY:BLR,BE:BE:BEL,BH:BZ:BLZ,' +
  'BN:BJ:BEN,BT:BT:BTN,BL:BO:BOL,BK:BA:BIH,BC:BW:BWA,BR:BR:BRA,BX:BN:BRN,BU:BG:BGR,UV:BF:BFA,' +
  'BM:MM:MMR,BY:BI:BDI,CB:KH:KHM,CM:CM:CMR,CA:CA:CAN,CV:CV:CPV,CT:CF:CAF,CD:TD:TCD,CI:CL:CHL,' +
  'CH:CN:CHN,CO:CO:COL,CN:KM:COM,CF:CG:COG,CG:CD:COD,CS:CR:CRI,IV:CI:CIV,HR:HR:HRV,CU:CU:CUB,' +
  'CY:CY:CYP,EZ:CZ:CZE,DA:DK:DNK,DJ:DJ:DJI,DO:DM:DMA,DR:DO:DOM,EC:EC:ECU,EG:EG:EGY,ES:SV:SLV,' +
  'EK:GQ:GNQ,ER:ER:ERI,EN:EE:EST,WZ:SZ:SWZ,ET:ET:ETH,FJ:FJ:FJI,FI:FI:FIN,FR:FR:FRA,GB:GA:GAB,' +
  'GA:GM:GMB,GG:GE:GEO,GM:DE:DEU,GH:GH:GHA,GR:GR:GRC,GJ:GD:GRD,GT:GT:GTM,GV:GN:GIN,PU:GW:GNB,' +
  'GY:GY:GUY,HA:HT:HTI,HO:HN:HND,HK:HK:HKG,HU:HU:HUN,IC:IS:ISL,IN:IN:IND,ID:ID:IDN,IR:IR:IRN,' +
  'IZ:IQ:IRQ,EI:IE:IRL,IS:IL:ISR,IT:IT:ITA,JM:JM:JAM,JA:JP:JPN,JO:JO:JOR,KZ:KZ:KAZ,KE:KE:KEN,' +
  'KR:KI:KIR,KN:KP:PRK,KS:KR:KOR,KV:XK:KSV,KU:KW:KWT,KG:KG:KGZ,LA:LA:LAO,LG:LV:LVA,LE:LB:LBN,' +
  'LT:LS:LSO,LI:LR:LBR,LY:LY:LBY,LS:LI:LIE,LH:LT:LTU,LU:LU:LUX,MA:MG:MDG,MI:MW:MWI,MY:MY:MYS,' +
  'MV:MV:MDV,ML:ML:MLI,MT:MT:MLT,RM:MH:MHL,MR:MR:MRT,MP:MU:MUS,MX:MX:MEX,FM:FM:FSM,MD:MD:MDA,' +
  'MN:MC:MCO,MG:MN:MNG,MJ:ME:MNE,MO:MA:MAR,MZ:MZ:MOZ,WA:NA:NAM,NP:NP:NPL,NL:NL:NLD,NZ:NZ:NZL,' +
  'NU:NI:NIC,NG:NE:NER,NI:NG:NGA,MK:MK:MKD,NO:NO:NOR,MU:OM:OMN,PK:PK:PAK,PS:PW:PLW,PM:PA:PAN,' +
  'PP:PG:PNG,PA:PY:PRY,PE:PE:PER,RP:PH:PHL,PL:PL:POL,PO:PT:PRT,RQ:PR:PRI,QA:QA:QAT,RO:RO:ROU,' +
  'RS:RU:RUS,RW:RW:RWA,SC:KN:KNA,ST:LC:LCA,VC:VC:VCT,WS:WS:WSM,SM:SM:SMR,TP:ST:STP,SA:SA:SAU,' +
  'SG:SN:SEN,RI:RS:SRB,SE:SC:SYC,SL:SL:SLE,SN:SG:SGP,LO:SK:SVK,SI:SI:SVN,BP:SB:SLB,SO:SO:SOM,' +
  'SF:ZA:ZAF,OD:SS:SSD,SP:ES:ESP,CE:LK:LKA,SU:SD:SDN,NS:SR:SUR,SW:SE:SWE,SZ:CH:CHE,SY:SY:SYR,' +
  'TW:TW:TWN,TI:TJ:TJK,TZ:TZ:TZA,TH:TH:THA,TT:TL:TLS,TO:TG:TGO,TN:TO:TON,TD:TT:TTO,TS:TN:TUN,' +
  'TU:TR:TUR,TX:TM:TKM,TV:TV:TUV,UG:UG:UGA,UP:UA:UKR,AE:AE:ARE,UK:GB:GBR,US:US:USA,UY:UY:URY,' +
  'UZ:UZ:UZB,NH:VU:VUT,VT:VA:VAT,VE:VE:VEN,VM:VN:VNM,YM:YE:YEM,ZA:ZM:ZMB,ZI:ZW:ZWE,WE:PS:PSE,' +
  'GZ:PS:,GL:GL:GRL,MC:MO:MAC,NC:NC:NCL,FP:PF:PYF,CJ:KY:CYM,BD:BM:BMU,GQ:GU:GUM,AA:AW:ABW,' +
  'WI:EH:ESH,AQ:AS:ASM,VQ:VI:VIR,GI:GI:GIB,FO:FO:FRO,IM:IM:IMN,JE:JE:JEY,GK:GG:GGY';

interface CountryCodes {
  fips: string;
  iso2: string;
  iso3: string;
}

const ENTRIES: CountryCodes[] = TABLE.split(',').map((entry) => {
  const [fips = '', iso2 = '', iso3 = ''] = entry.split(':');
  return { fips, iso2, iso3 };
});

const BY_FIPS = new Map(ENTRIES.map((entry) => [entry.fips, entry]));

const BY_ISO3 = new Map(
  ENTRIES.filter((entry) => entry.iso3 !== '').map((entry) => [entry.iso3, entry]),
);

const OVERRIDES: Record<string, string> = {
  XK: 'Kosovo',
  PS: 'Palestinian Territories',
  WE: 'West Bank',
  GZ: 'Gaza Strip',
};

/* CAMEO regional and bloc actor codes that are not countries. */
const CAMEO_GROUPS: Record<string, string> = {
  AFR: 'Africa',
  ASA: 'Asia',
  EUR: 'Europe',
  MEA: 'Middle East',
  WST: 'The West',
  SAM: 'South America',
  NMR: 'North America',
  CAU: 'Caucasus',
  BLK: 'Balkans',
  CAS: 'Central Asia',
  SAS: 'South Asia',
  SEA: 'Southeast Asia',
  EAF: 'East Africa',
  WAF: 'West Africa',
  NAF: 'North Africa',
  CRB: 'Caribbean',
  LAM: 'Latin America',
  PGS: 'Persian Gulf',
  SCN: 'Scandinavia',
  MDT: 'Mediterranean',
};

let displayNames: Intl.DisplayNames | null = null;

function regionName(iso2: string): string | null {
  const override = OVERRIDES[iso2];

  if (override !== undefined) {
    return override;
  }

  try {
    displayNames ??= new Intl.DisplayNames(['en'], { type: 'region' });
    const name = displayNames.of(iso2);
    return name === undefined || name === iso2 ? null : name;
  } catch {
    return null;
  }
}

export function flagEmoji(iso2: string | null | undefined): string {
  if (iso2 === null || iso2 === undefined || !/^[A-Z]{2}$/.test(iso2)) {
    return '🌐';
  }

  return String.fromCodePoint(...[...iso2].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

export interface CountryInfo {
  /** The code as GDELT stores it. */
  code: string;
  /** FIPS code used for routing to /countries/:code, when known. */
  fips: string | null;
  iso2: string | null;
  name: string;
  flag: string;
}

/** Event location codes (ActionGeo_CountryCode, FIPS 10-4). */
export function fromFips(code: string | null | undefined): CountryInfo {
  if (code === null || code === undefined || code === '') {
    return { code: '', fips: null, iso2: null, name: 'Unknown location', flag: '🌐' };
  }

  const entry = BY_FIPS.get(code);
  const iso2 = entry?.iso2 ?? null;
  const name = OVERRIDES[code] ?? (iso2 === null ? null : regionName(iso2)) ?? code;

  return { code, fips: code, iso2, name, flag: flagEmoji(iso2) };
}

/** Actor country codes (CAMEO, ISO alpha-3 for countries). */
export function fromCameo(code: string | null | undefined): CountryInfo {
  if (code === null || code === undefined || code === '') {
    return { code: '', fips: null, iso2: null, name: 'Unknown', flag: '🌐' };
  }

  const group = CAMEO_GROUPS[code];

  if (group !== undefined) {
    return { code, fips: null, iso2: null, name: group, flag: '🌐' };
  }

  const entry = BY_ISO3.get(code);
  const iso2 = entry?.iso2 ?? null;

  return {
    code,
    fips: entry?.fips ?? null,
    iso2,
    name: (iso2 === null ? null : regionName(iso2)) ?? code,
    flag: flagEmoji(iso2),
  };
}

/** Every routable country, for search and the command palette. */
export function allCountries(): CountryInfo[] {
  return ENTRIES.map((entry) => fromFips(entry.fips)).sort((a, b) => a.name.localeCompare(b.name));
}
