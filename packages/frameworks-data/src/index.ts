// Authoritative catalogue registry. The complete control set (incl. all 93 ISO
// 27001:2022 Annex A controls and the regional regulations) is seeded into the
// database from catalogue.seed.json; this module exports the framework registry
// plus the TypeScript contracts shared across the API, worker and web tiers.
export interface Framework {
  id: string; name: string; short: string;
  authority: string; kind: string; region: string; description: string;
}
export interface Control {
  framework: string; ref: string; title: string;
  group: string; help?: string; isCustom?: boolean;
}

export const REGION_ORDER = [
  'Global','EU','United States','Sweden','Norway','Finland','Denmark',
  'Switzerland','Poland','Netherlands','Turkey','Hong Kong','Vietnam','China',
] as const;

export const FRAMEWORKS: Framework[] = [
  { id:'iso27001', short:'ISO 27001', name:'ISO/IEC 27001:2022', authority:'ISO/IEC', kind:'Standard', region:'Global', description:'ISMS. Annex A — 93 controls across 4 themes.' },
  { id:'iso27701', short:'ISO 27701', name:'ISO/IEC 27701:2019', authority:'ISO/IEC', kind:'Standard', region:'Global', description:'Privacy information management (PIMS).' },
  { id:'iso22301', short:'ISO 22301', name:'ISO 22301:2019', authority:'ISO', kind:'Standard', region:'Global', description:'Business continuity management.' },
  { id:'iso42001', short:'ISO 42001', name:'ISO/IEC 42001:2023', authority:'ISO/IEC', kind:'Standard', region:'Global', description:'AI management system.' },
  { id:'nistcsf', short:'NIST CSF 2.0', name:'NIST Cybersecurity Framework 2.0', authority:'NIST', kind:'Framework', region:'Global', description:'Govern, Identify, Protect, Detect, Respond, Recover.' },
  { id:'cis', short:'CIS v8', name:'CIS Controls v8', authority:'CIS', kind:'Framework', region:'Global', description:'18 prioritized safeguards.' },
  { id:'soc2', short:'SOC 2', name:'SOC 2 (AICPA TSC)', authority:'AICPA', kind:'Attestation', region:'Global', description:'Trust services criteria.' },
  { id:'mitre', short:'MITRE ATT&CK', name:'MITRE ATT&CK (Enterprise)', authority:'MITRE', kind:'Knowledge base', region:'Global', description:'Adversary tactics & techniques.' },
  { id:'pcidss', short:'PCI DSS', name:'PCI DSS v4.0', authority:'PCI SSC', kind:'Standard', region:'Global', description:'12 payment-security requirements.' },
  { id:'gdpr', short:'GDPR', name:'GDPR (EU 2016/679)', authority:'EU', kind:'Regulation', region:'EU', description:'Personal data protection.' },
  { id:'nis2', short:'NIS2', name:'NIS2 Directive (EU 2022/2555)', authority:'EU', kind:'Directive', region:'EU', description:'Network & information security.' },
  { id:'aiact', short:'EU AI Act', name:'EU AI Act (Reg. 2024/1689)', authority:'EU', kind:'Regulation', region:'EU', description:'Risk-tiered AI obligations.' },
  { id:'dora', short:'DORA', name:'DORA (EU 2022/2554)', authority:'EU', kind:'Regulation', region:'EU', description:'Digital operational resilience (finance).' },
  { id:'cra', short:'EU CRA', name:'EU Cyber Resilience Act (2024/2847)', authority:'EU', kind:'Regulation', region:'EU', description:'Cybersecurity of digital products.' },
  { id:'dsa', short:'EU DSA', name:'Digital Services Act (EU 2022/2065)', authority:'EU', kind:'Regulation', region:'EU', description:'Online platforms & marketplaces.' },
  { id:'psd2', short:'PSD2', name:'PSD2 (EU 2015/2366)', authority:'EU', kind:'Directive', region:'EU', description:'Payment services & SCA.' },
  { id:'eidas', short:'eIDAS', name:'eIDAS 2.0 (Reg. 2024/1183)', authority:'EU', kind:'Regulation', region:'EU', description:'Digital identity & trust services.' },
  { id:'nist80053', short:'NIST 800-53', name:'NIST SP 800-53 Rev. 5', authority:'NIST', kind:'Catalog', region:'United States', description:'Security & privacy controls.' },
  { id:'nist800171', short:'NIST 800-171', name:'NIST SP 800-171 Rev. 3', authority:'NIST', kind:'Catalog', region:'United States', description:'Protecting CUI.' },
  { id:'se_psa', short:'SE Protective Security', name:'Säkerhetsskyddslagen', authority:'Säkerhetspolisen', kind:'Law', region:'Sweden', description:'Protective security.' },
  { id:'se_dpa', short:'SE Data Protection', name:'Dataskyddslagen', authority:'IMY', kind:'Law', region:'Sweden', description:'GDPR complements (SE).' },
  { id:'no_nsm', short:'NSM Principles', name:'NSM Basic Principles for ICT Security 2.0', authority:'NSM', kind:'Framework', region:'Norway', description:'Baseline ICT security.' },
  { id:'no_pda', short:'NO Data Protection', name:'Personopplysningsloven', authority:'Datatilsynet', kind:'Law', region:'Norway', description:'GDPR in Norwegian law.' },
  { id:'fi_katakri', short:'Katakri', name:'Katakri 2020', authority:'Finnish authorities', kind:'Framework', region:'Finland', description:'Information security audit criteria.' },
  { id:'fi_dpa', short:'FI Data Protection', name:'Tietosuojalaki', authority:'Tietosuoja', kind:'Law', region:'Finland', description:'GDPR complements (FI).' },
  { id:'dk_dmark', short:'D-mærket', name:'D-mærket label', authority:'D-mærket', kind:'Label', region:'Denmark', description:'IT-security & data-ethics label.' },
  { id:'dk_dpa', short:'DK Data Protection', name:'Databeskyttelsesloven', authority:'Datatilsynet', kind:'Law', region:'Denmark', description:'GDPR complements (DK).' },
  { id:'ch_minstd', short:'CH ICT Min. Standard', name:'ICT Minimum Standard (NCSC)', authority:'NCSC', kind:'Framework', region:'Switzerland', description:'Minimum ICT resilience.' },
  { id:'fadp', short:'Swiss FADP', name:'Swiss FADP / nFADP (revDSG)', authority:'FDPIC', kind:'Law', region:'Switzerland', description:'Revised data protection act.' },
  { id:'pl_ksc', short:'PL KSC', name:'National Cybersecurity System Act', authority:'Poland', kind:'Law', region:'Poland', description:'NIS implementation (PL).' },
  { id:'pl_uodo', short:'PL Data Protection', name:'PL Personal Data Protection Act', authority:'UODO', kind:'Law', region:'Poland', description:'GDPR complements (PL).' },
  { id:'nl_bio', short:'NL BIO', name:'Baseline Informatiebeveiliging Overheid', authority:'NL Gov', kind:'Framework', region:'Netherlands', description:'Gov info-security baseline.' },
  { id:'nl_uavg', short:'NL Data Protection', name:'UAVG', authority:'AP', kind:'Law', region:'Netherlands', description:'GDPR implementation (NL).' },
  { id:'tr_kvkk', short:'KVKK', name:'KVKK (Law No. 6698)', authority:'KVKK Authority', kind:'Law', region:'Turkey', description:'Personal data protection.' },
  { id:'tr_cyber', short:'TR Cybersecurity', name:'Turkish Cybersecurity Law', authority:'Cybersecurity Presidency', kind:'Law', region:'Turkey', description:'Critical-service cybersecurity.' },
  { id:'hk_pdpo', short:'HK PDPO', name:'Personal Data (Privacy) Ordinance', authority:'PCPD', kind:'Ordinance', region:'Hong Kong', description:'Data protection principles.' },
  { id:'vn_pdpd', short:'VN PDPD', name:'Personal Data Protection Decree 13/2023', authority:'MPS', kind:'Decree', region:'Vietnam', description:'Personal data protection.' },
  { id:'vn_cyber', short:'VN Cybersecurity', name:'Law on Cybersecurity (2018)', authority:'MPS', kind:'Law', region:'Vietnam', description:'Network security & localization.' },
  { id:'cn_pipl', short:'PIPL', name:'Personal Information Protection Law', authority:'CAC', kind:'Law', region:'China', description:'Personal information protection.' },
  { id:'cn_dsl', short:'China DSL', name:'Data Security Law', authority:'CAC', kind:'Law', region:'China', description:'Data classification & security.' },
  { id:'cn_csl', short:'China CSL', name:'Cybersecurity Law', authority:'CAC', kind:'Law', region:'China', description:'Network security & MLPS.' },
  { id:'cn_mlps', short:'MLPS 2.0', name:'MLPS 2.0 (Classified Protection)', authority:'MPS', kind:'Standard', region:'China', description:'Graded protection (Shanghai ops).' },
];

export const frameworkById = (id: string) => FRAMEWORKS.find(f => f.id === id);

// Control catalogue (ISO 27001:2022 Annex A, CIS v8, NIST CSF 2.0).
export { CONTROLS } from './catalogue.js';
