import type { Control } from './index.js';

// Starter control catalogue. Covers the headline frameworks in full:
//   • ISO/IEC 27001:2022 Annex A — all 93 controls across the 4 themes
//   • CIS Controls v8 — all 18 controls
//   • NIST CSF 2.0 — the 6 core functions
// Regional regulations (GDPR, NIS2, national laws) are registered in the
// framework list and extended here as the programme matures. Titles follow the
// published Annex A / CIS / CSF structure; validate against the licensed
// standard text before relying on them for a formal audit.

const tuples = (framework: string, group: string, items: [string, string][]): Control[] =>
  items.map(([ref, title]) => ({ framework, ref, title, group }));

const ISO_ORGANIZATIONAL: [string, string][] = [
  ['A.5.1', 'Policies for information security'],
  ['A.5.2', 'Information security roles and responsibilities'],
  ['A.5.3', 'Segregation of duties'],
  ['A.5.4', 'Management responsibilities'],
  ['A.5.5', 'Contact with authorities'],
  ['A.5.6', 'Contact with special interest groups'],
  ['A.5.7', 'Threat intelligence'],
  ['A.5.8', 'Information security in project management'],
  ['A.5.9', 'Inventory of information and other associated assets'],
  ['A.5.10', 'Acceptable use of information and other associated assets'],
  ['A.5.11', 'Return of assets'],
  ['A.5.12', 'Classification of information'],
  ['A.5.13', 'Labelling of information'],
  ['A.5.14', 'Information transfer'],
  ['A.5.15', 'Access control'],
  ['A.5.16', 'Identity management'],
  ['A.5.17', 'Authentication information'],
  ['A.5.18', 'Access rights'],
  ['A.5.19', 'Information security in supplier relationships'],
  ['A.5.20', 'Addressing information security within supplier agreements'],
  ['A.5.21', 'Managing information security in the ICT supply chain'],
  ['A.5.22', 'Monitoring, review and change management of supplier services'],
  ['A.5.23', 'Information security for use of cloud services'],
  ['A.5.24', 'Information security incident management planning and preparation'],
  ['A.5.25', 'Assessment and decision on information security events'],
  ['A.5.26', 'Response to information security incidents'],
  ['A.5.27', 'Learning from information security incidents'],
  ['A.5.28', 'Collection of evidence'],
  ['A.5.29', 'Information security during disruption'],
  ['A.5.30', 'ICT readiness for business continuity'],
  ['A.5.31', 'Legal, statutory, regulatory and contractual requirements'],
  ['A.5.32', 'Intellectual property rights'],
  ['A.5.33', 'Protection of records'],
  ['A.5.34', 'Privacy and protection of personal identifiable information (PII)'],
  ['A.5.35', 'Independent review of information security'],
  ['A.5.36', 'Compliance with policies, rules and standards for information security'],
  ['A.5.37', 'Documented operating procedures'],
];

const ISO_PEOPLE: [string, string][] = [
  ['A.6.1', 'Screening'],
  ['A.6.2', 'Terms and conditions of employment'],
  ['A.6.3', 'Information security awareness, education and training'],
  ['A.6.4', 'Disciplinary process'],
  ['A.6.5', 'Responsibilities after termination or change of employment'],
  ['A.6.6', 'Confidentiality or non-disclosure agreements'],
  ['A.6.7', 'Remote working'],
  ['A.6.8', 'Information security event reporting'],
];

const ISO_PHYSICAL: [string, string][] = [
  ['A.7.1', 'Physical security perimeters'],
  ['A.7.2', 'Physical entry'],
  ['A.7.3', 'Securing offices, rooms and facilities'],
  ['A.7.4', 'Physical security monitoring'],
  ['A.7.5', 'Protecting against physical and environmental threats'],
  ['A.7.6', 'Working in secure areas'],
  ['A.7.7', 'Clear desk and clear screen'],
  ['A.7.8', 'Equipment siting and protection'],
  ['A.7.9', 'Security of assets off-premises'],
  ['A.7.10', 'Storage media'],
  ['A.7.11', 'Supporting utilities'],
  ['A.7.12', 'Cabling security'],
  ['A.7.13', 'Equipment maintenance'],
  ['A.7.14', 'Secure disposal or re-use of equipment'],
];

const ISO_TECHNOLOGICAL: [string, string][] = [
  ['A.8.1', 'User endpoint devices'],
  ['A.8.2', 'Privileged access rights'],
  ['A.8.3', 'Information access restriction'],
  ['A.8.4', 'Access to source code'],
  ['A.8.5', 'Secure authentication'],
  ['A.8.6', 'Capacity management'],
  ['A.8.7', 'Protection against malware'],
  ['A.8.8', 'Management of technical vulnerabilities'],
  ['A.8.9', 'Configuration management'],
  ['A.8.10', 'Information deletion'],
  ['A.8.11', 'Data masking'],
  ['A.8.12', 'Data leakage prevention'],
  ['A.8.13', 'Information backup'],
  ['A.8.14', 'Redundancy of information processing facilities'],
  ['A.8.15', 'Logging'],
  ['A.8.16', 'Monitoring activities'],
  ['A.8.17', 'Clock synchronization'],
  ['A.8.18', 'Use of privileged utility programs'],
  ['A.8.19', 'Installation of software on operational systems'],
  ['A.8.20', 'Networks security'],
  ['A.8.21', 'Security of network services'],
  ['A.8.22', 'Segregation of networks'],
  ['A.8.23', 'Web filtering'],
  ['A.8.24', 'Use of cryptography'],
  ['A.8.25', 'Secure development life cycle'],
  ['A.8.26', 'Application security requirements'],
  ['A.8.27', 'Secure system architecture and engineering principles'],
  ['A.8.28', 'Secure coding'],
  ['A.8.29', 'Security testing in development and acceptance'],
  ['A.8.30', 'Outsourced development'],
  ['A.8.31', 'Separation of development, test and production environments'],
  ['A.8.32', 'Change management'],
  ['A.8.33', 'Test information'],
  ['A.8.34', 'Protection of information systems during audit testing'],
];

const CIS_V8: [string, string][] = [
  ['1', 'Inventory and Control of Enterprise Assets'],
  ['2', 'Inventory and Control of Software Assets'],
  ['3', 'Data Protection'],
  ['4', 'Secure Configuration of Enterprise Assets and Software'],
  ['5', 'Account Management'],
  ['6', 'Access Control Management'],
  ['7', 'Continuous Vulnerability Management'],
  ['8', 'Audit Log Management'],
  ['9', 'Email and Web Browser Protections'],
  ['10', 'Malware Defenses'],
  ['11', 'Data Recovery'],
  ['12', 'Network Infrastructure Management'],
  ['13', 'Network Monitoring and Defense'],
  ['14', 'Security Awareness and Skills Training'],
  ['15', 'Service Provider Management'],
  ['16', 'Application Software Security'],
  ['17', 'Incident Response Management'],
  ['18', 'Penetration Testing'],
];

const NIST_CSF_2: [string, string][] = [
  ['GV', 'Govern — strategy, expectations and policy for managing cybersecurity risk'],
  ['ID', 'Identify — understand assets, suppliers and related cybersecurity risks'],
  ['PR', 'Protect — safeguards to manage cybersecurity risks'],
  ['DE', 'Detect — find and analyse possible cybersecurity attacks and compromises'],
  ['RS', 'Respond — take action regarding a detected cybersecurity incident'],
  ['RC', 'Recover — restore assets and operations affected by an incident'],
];

export const CONTROLS: Control[] = [
  ...tuples('iso27001', 'A.5 Organizational', ISO_ORGANIZATIONAL),
  ...tuples('iso27001', 'A.6 People', ISO_PEOPLE),
  ...tuples('iso27001', 'A.7 Physical', ISO_PHYSICAL),
  ...tuples('iso27001', 'A.8 Technological', ISO_TECHNOLOGICAL),
  ...tuples('cis', 'CIS Controls v8', CIS_V8),
  ...tuples('nistcsf', 'Function', NIST_CSF_2),
];
