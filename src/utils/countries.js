// Country-code → display-name helper.
//
// The backend returns ISO 3166-1 codes in several places (queue rows use
// alpha-3 like "BDI"/"TZA", some fields use alpha-2, and others already carry a
// full name such as "UNITED REPUBLIC OF TANZANIA"). Officers can't read raw
// codes, so everything user-facing goes through countryName().

const ALPHA3_TO_ALPHA2 = {
  AFG: 'AF', ALA: 'AX', ALB: 'AL', DZA: 'DZ', ASM: 'AS', AND: 'AD', AGO: 'AO', AIA: 'AI',
  ATA: 'AQ', ATG: 'AG', ARG: 'AR', ARM: 'AM', ABW: 'AW', AUS: 'AU', AUT: 'AT', AZE: 'AZ',
  BHS: 'BS', BHR: 'BH', BGD: 'BD', BRB: 'BB', BLR: 'BY', BEL: 'BE', BLZ: 'BZ', BEN: 'BJ',
  BMU: 'BM', BTN: 'BT', BOL: 'BO', BES: 'BQ', BIH: 'BA', BWA: 'BW', BVT: 'BV', BRA: 'BR',
  IOT: 'IO', BRN: 'BN', BGR: 'BG', BFA: 'BF', BDI: 'BI',
  CPV: 'CV', KHM: 'KH', CMR: 'CM', CAN: 'CA', CYM: 'KY', CAF: 'CF', TCD: 'TD', CHL: 'CL',
  CHN: 'CN', CXR: 'CX', CCK: 'CC', COL: 'CO', COM: 'KM', COG: 'CG', COD: 'CD', COK: 'CK',
  CRI: 'CR', CIV: 'CI', HRV: 'HR', CUB: 'CU', CUW: 'CW', CYP: 'CY', CZE: 'CZ',
  DNK: 'DK', DJI: 'DJ', DMA: 'DM', DOM: 'DO',
  ECU: 'EC', EGY: 'EG', SLV: 'SV', GNQ: 'GQ', ERI: 'ER', EST: 'EE', SWZ: 'SZ', ETH: 'ET',
  FLK: 'FK', FRO: 'FO', FJI: 'FJ', FIN: 'FI', FRA: 'FR', GUF: 'GF', PYF: 'PF', ATF: 'TF',
  GAB: 'GA', GMB: 'GM', GEO: 'GE', DEU: 'DE', GHA: 'GH', GIB: 'GI', GRC: 'GR', GRL: 'GL',
  GRD: 'GD', GLP: 'GP', GUM: 'GU', GTM: 'GT', GGY: 'GG', GIN: 'GN', GNB: 'GW', GUY: 'GY',
  HTI: 'HT', HMD: 'HM', VAT: 'VA', HND: 'HN', HKG: 'HK', HUN: 'HU',
  ISL: 'IS', IND: 'IN', IDN: 'ID', IRN: 'IR', IRQ: 'IQ', IRL: 'IE', IMN: 'IM', ISR: 'IL',
  ITA: 'IT', JAM: 'JM', JPN: 'JP', JEY: 'JE', JOR: 'JO',
  KAZ: 'KZ', KEN: 'KE', KIR: 'KI', PRK: 'KP', KOR: 'KR', KWT: 'KW', KGZ: 'KG',
  LAO: 'LA', LVA: 'LV', LBN: 'LB', LSO: 'LS', LBR: 'LR', LBY: 'LY', LIE: 'LI', LTU: 'LT',
  LUX: 'LU', MAC: 'MO', MDG: 'MG', MWI: 'MW', MYS: 'MY', MDV: 'MV', MLI: 'ML', MLT: 'MT',
  MHL: 'MH', MTQ: 'MQ', MRT: 'MR', MUS: 'MU', MYT: 'YT', MEX: 'MX', FSM: 'FM', MDA: 'MD',
  MCO: 'MC', MNG: 'MN', MNE: 'ME', MSR: 'MS', MAR: 'MA', MOZ: 'MZ', MMR: 'MM',
  NAM: 'NA', NRU: 'NR', NPL: 'NP', NLD: 'NL', NCL: 'NC', NZL: 'NZ', NIC: 'NI', NER: 'NE',
  NGA: 'NG', NIU: 'NU', NFK: 'NF', MKD: 'MK', MNP: 'MP', NOR: 'NO', OMN: 'OM',
  PAK: 'PK', PLW: 'PW', PSE: 'PS', PAN: 'PA', PNG: 'PG', PRY: 'PY', PER: 'PE', PHL: 'PH',
  PCN: 'PN', POL: 'PL', PRT: 'PT', PRI: 'PR', QAT: 'QA',
  REU: 'RE', ROU: 'RO', RUS: 'RU', RWA: 'RW',
  BLM: 'BL', SHN: 'SH', KNA: 'KN', LCA: 'LC', MAF: 'MF', SPM: 'PM', VCT: 'VC', WSM: 'WS',
  SMR: 'SM', STP: 'ST', SAU: 'SA', SEN: 'SN', SRB: 'RS', SYC: 'SC', SLE: 'SL', SGP: 'SG',
  SXM: 'SX', SVK: 'SK', SVN: 'SI', SLB: 'SB', SOM: 'SO', ZAF: 'ZA', SGS: 'GS', SSD: 'SS',
  ESP: 'ES', LKA: 'LK', SDN: 'SD', SUR: 'SR', SJM: 'SJ', SWE: 'SE', CHE: 'CH', SYR: 'SY',
  TWN: 'TW', TJK: 'TJ', TZA: 'TZ', THA: 'TH', TLS: 'TL', TGO: 'TG', TKL: 'TK', TON: 'TO',
  TTO: 'TT', TUN: 'TN', TUR: 'TR', TKM: 'TM', TCA: 'TC', TUV: 'TV',
  UGA: 'UG', UKR: 'UA', ARE: 'AE', GBR: 'GB', USA: 'US', UMI: 'UM', URY: 'UY', UZB: 'UZ',
  VUT: 'VU', VEN: 'VE', VNM: 'VN', VGB: 'VG', VIR: 'VI',
  WLF: 'WF', ESH: 'EH', YEM: 'YE', ZMB: 'ZM', ZWE: 'ZW',
};

let displayNames;
function regionNames() {
  if (displayNames === undefined) {
    try {
      displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      displayNames = null; // unsupported engine — fall back to the raw value
    }
  }
  return displayNames;
}

/**
 * Resolve an ISO 3166-1 alpha-2/alpha-3 country code to its English name.
 * Values that aren't codes (already a full country name, or unrecognised) are
 * returned unchanged, so this is safe to wrap around any country-ish field.
 * @param {string} code
 * @returns {string}
 */
export function countryName(code) {
  if (code === undefined || code === null) return code;
  const raw = String(code).trim();
  if (!raw) return code;

  const upper = raw.toUpperCase();
  const alpha2 = upper.length === 3 ? ALPHA3_TO_ALPHA2[upper] : upper.length === 2 ? upper : null;
  if (!alpha2) return raw; // already a name (or something we don't recognise)

  const names = regionNames();
  if (!names) return raw;
  try {
    const name = names.of(alpha2);
    return name && name !== alpha2 ? name : raw;
  } catch {
    return raw;
  }
}

export default countryName;
