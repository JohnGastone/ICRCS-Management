import React, { useState } from 'react';
import { User, Home, Users, GraduationCap, Phone, HeartHandshake, Copy } from 'lucide-react';
import { countryName } from '../../utils/countries';

// ── helpers ──────────────────────────────────────────────────────────────────
// Bare yes/no answers carry no information on a review screen — only the data
// they refer to matters — so they are treated as "no value" and never rendered.
const ANSWER_ONLY = new Set(['true', 'false', 'yes', 'no']);
const has = (v) => {
  if (v === undefined || v === null || v === '' || v === '—') return false;
  if (typeof v === 'boolean') return false;
  if (typeof v === 'string' && ANSWER_ONLY.has(v.trim().toLowerCase())) return false;
  return true;
};
const joinName = (...parts) => { const s = parts.filter(has).join(' ').trim(); return s || undefined; };

function InfoRow({ label, value, highlight, mono }) {
  if (!has(value)) return null; // never render fields with no data
  const copy = () => { navigator.clipboard.writeText(String(value)); };
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0 group">
      <span className="text-xs text-gray-400 shrink-0 w-[6.5rem] sm:w-[7.5rem]">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className={`text-sm break-words ${mono ? 'font-mono' : ''} ${highlight ? 'font-semibold text-icrcs-navy' : 'text-gray-900'}`}>{value}</span>
        <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100 shrink-0">
          <Copy className="h-3 w-3 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

// Walks the tree (including fragments, which personRows() returns) looking for a
// descendant InfoRow that actually has a value.
function hasAnyValue(children) {
  return React.Children.toArray(children).some((c) => {
    if (!React.isValidElement(c)) return false;
    if (has(c.props.value)) return true;
    return c.props.children ? hasAnyValue(c.props.children) : false;
  });
}

// Renders a titled subsection only if at least one descendant InfoRow has data.
function SubSection({ title, children }) {
  if (!hasAnyValue(children)) return null;
  return (
    <div className="mb-4 last:mb-0">
      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h5>
      <div className="bg-gray-50/60 rounded-xl border border-gray-100 p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6">{children}</div>
      </div>
    </div>
  );
}

// Common field set for any related person (parent, child, spouse, relative, contact).
// Residence is broken out into individually labelled parts rather than one
// comma-joined string, so "MGALA, IHANGA, NJOMBE" reads as Street/Ward/District.
function personRows(x) {
  const loc = x.residenceLocation || {};
  return (
    <>
      <InfoRow label="Full Name" value={joinName(x.firstName, x.middleName, x.lastName) || x.fullName} highlight />
      <InfoRow label="Relationship" value={x.relationshipType || x.parentType} />
      <InfoRow label="Gender" value={x.sex || x.gender} />
      <InfoRow label="Date of Birth" value={x.dateOfBirth} />
      <InfoRow label="Nationality" value={countryName(x.nationality)} />
      <InfoRow label="Occupation" value={x.occupationType} />
      <InfoRow label="Phone" value={x.phoneNumber} />
      <InfoRow label="Street" value={loc.street} />
      <InfoRow label="Ward" value={loc.ward} />
      <InfoRow label="District" value={loc.district} />
      <InfoRow label="Region" value={loc.region} />
      <InfoRow label="Territory" value={loc.territory} />
      <InfoRow label="City" value={x.residenceCity} />
      <InfoRow label="Country" value={countryName(x.residenceCountry || x.country || loc.country)} />
    </>
  );
}

export default function ApplicantInfoView({ data }) {
  const r = data || {};
  const p = r.personalDetails || {};
  const birth = p.birthDetails || r.birthDetails || {};
  const place = p.placeOfBirth || {};
  const phys = r.physicalDetail || {};
  const travel = r.travelHistory || {};
  const addrs = r.addresses || [];
  const current = addrs.find((a) => a.addressType === 'CURRENT') || null;
  const permanent = addrs.find((a) => a.addressType === 'PERMANENT') || null;
  const parents = r.parents || [];
  const father = parents.find((x) => x.parentType === 'FATHER');
  const mother = parents.find((x) => x.parentType === 'MOTHER');
  const education = (r.educationList || []).filter(Boolean);
  const emp = r.employment || null;
  const contacts = (r.emergencyContacts || []).filter(Boolean);
  const spouses = (r.spouses || []).filter(Boolean);
  const children = (r.children || []).filter(Boolean);
  const relatives = (r.relatives || []).filter(Boolean);
  const documents = (r.documents || []).filter(Boolean);

  // ── section renderers ──────────────────────────────────────────────────────
  const personal = (
    <div className="space-y-4">
      <SubSection title="Personal Information">
        <InfoRow label="Full Name" value={joinName(p.firstName, p.middleName, p.lastName)} highlight />
        <InfoRow label="Other Names" value={p.otherNames} />
        <InfoRow label="Gender" value={p.sex} />
        <InfoRow label="Date of Birth" value={p.dateOfBirth || birth.dateOfBirth} />
        <InfoRow label="Marital Status" value={p.maritalStatus} />
        <InfoRow label="Nationality" value={countryName(p.nationality)} />
        <InfoRow label="Phone Number" value={current?.phoneNumber} />
        <InfoRow label="Email Address" value={current?.email} />
      </SubSection>

      <SubSection title="Place of Birth">
        <InfoRow label="Country of Birth" value={countryName(p.countryOfBirth || birth.countryOfBirth)} />
        <InfoRow label="Region" value={place.region} />
        <InfoRow label="District" value={place.district} />
        <InfoRow label="Ward" value={place.ward} />
        <InfoRow label="Street" value={place.street} />
        <InfoRow label="Territory" value={place.territory} />
        <InfoRow label="Birth Certificate No." value={birth.birthCertificateNo} mono />
      </SubSection>

      <SubSection title="Physical Characteristics">
        <InfoRow label="Tribe" value={phys.tribe} />
        <InfoRow label="Eye Color" value={phys.eyeColor} />
        <InfoRow label="Hair Color" value={phys.hairColor} />
        <InfoRow label="Height (cm)" value={phys.heightCm} />
        <InfoRow label="Special Mark" value={phys.specialMark} />
        <InfoRow label="Language Spoken" value={phys.languageSpoken} />
      </SubSection>

      {documents.length > 0 && (
        <SubSection title="Documents">
          {documents.map((d, i) => (
            <InfoRow key={i} label={d.documentType || `Document ${i + 1}`} value={d.documentNumber} mono />
          ))}
        </SubSection>
      )}

      {/* Travel document and entry details are separate concerns — keeping them in
          one block made the passport dates read as entry dates. */}
      <SubSection title="Travel Document">
        <InfoRow label="Document Type" value={travel.documentType} />
        <InfoRow label="Document No." value={travel.documentNo} mono />
        <InfoRow label="Issue Country" value={countryName(travel.issueCountry)} />
        <InfoRow label="Issue Authority" value={travel.issueAuthority} />
        <InfoRow label="Issued Date" value={travel.issuedDate} />
        <InfoRow label="Expiry Date" value={travel.expiryDate} />
      </SubSection>

      <SubSection title="Entry Information">
        <InfoRow label="First Date of Entry" value={travel.firstDateOfEntry} />
        <InfoRow label="Point of Entry" value={travel.pointOfEntry} />
        <InfoRow label="Transit Country" value={countryName(travel.transitCountry)} />
      </SubSection>
    </div>
  );

  const addrBlock = (a, title) => {
    const loc = a?.location || {};
    return (
      <SubSection title={title}>
        <InfoRow label="Country" value={countryName(a?.country || loc.country)} />
        <InfoRow label="Region" value={loc.region} />
        <InfoRow label="District" value={loc.district} />
        <InfoRow label="Ward" value={loc.ward} />
        <InfoRow label="Street" value={loc.street} />
        <InfoRow label="City" value={a?.city} />
        <InfoRow label="Territory" value={loc.territory} />
        <InfoRow label="Postal Address" value={a?.postalAddress} />
      </SubSection>
    );
  };
  const address = (
    <div className="space-y-4">
      {addrBlock(current, 'Current Address')}
      {addrBlock(permanent, 'Permanent Address')}
    </div>
  );

  const parentsSection = (
    <div className="space-y-4">
      {father && <SubSection title="Father">{personRows(father)}</SubSection>}
      {mother && <SubSection title="Mother">{personRows(mother)}</SubSection>}
    </div>
  );

  const eduEmp = (
    <div className="space-y-4">
      {education.map((e, i) => (
        <SubSection key={i} title={education.length > 1 ? `Education ${i + 1}` : 'Education'}>
          <InfoRow label="Education Level" value={e.educationLevel} />
          <InfoRow label="School / Institution" value={e.schoolName} />
          <InfoRow label="Completion Year" value={e.completionYear && String(e.completionYear)} />
          <InfoRow label="City" value={e.city} />
          <InfoRow label="Country" value={countryName(e.country)} />
          <InfoRow label="Index / Reg. No." value={e.registrationNumber} mono />
        </SubSection>
      ))}
      {emp && (
        <SubSection title="Employment">
          <InfoRow label="Employment Status" value={emp.employmentStatus} />
          <InfoRow label="Occupation" value={emp.occupationType || emp.otherOccupation} />
          <InfoRow label="Employer / Organisation" value={emp.organizationName} />
        </SubSection>
      )}
    </div>
  );

  const emergency = (
    <div className="space-y-4">
      {contacts.map((c, i) => (
        <SubSection key={i} title={`Emergency Contact ${i + 1}`}>{personRows(c)}</SubSection>
      ))}
    </div>
  );

  const family = (
    <div className="space-y-4">
      {spouses.map((s, i) => (<SubSection key={`s${i}`} title={spouses.length > 1 ? `Spouse ${i + 1}` : 'Spouse'}>{personRows(s)}</SubSection>))}
      {children.map((c, i) => (<SubSection key={`c${i}`} title={`Child ${i + 1}`}>{personRows(c)}</SubSection>))}
      {relatives.map((rl, i) => (<SubSection key={`r${i}`} title={`Relative ${i + 1}`}>{personRows(rl)}</SubSection>))}
    </div>
  );

  // ── build the tab list; only include sections that actually have data ───────
  const hasPersonal = has(joinName(p.firstName, p.middleName, p.lastName)) || has(p.dateOfBirth) || has(p.nationality);
  const hasAddress = Boolean(current || permanent);
  const hasParents = Boolean(father || mother);
  const hasEduEmp = education.length > 0 || Boolean(emp);
  const hasEmergency = contacts.length > 0;
  const hasFamily = spouses.length > 0 || children.length > 0 || relatives.length > 0;

  const tabs = [
    hasPersonal && { key: 'personal', label: 'Personal Information', icon: User, content: personal },
    hasAddress && { key: 'address', label: 'Address', icon: Home, content: address },
    hasParents && { key: 'parents', label: 'Parents', icon: Users, content: parentsSection },
    hasEduEmp && { key: 'eduemp', label: 'Education & Employment', icon: GraduationCap, content: eduEmp },
    hasEmergency && { key: 'emergency', label: 'Emergency Contacts', icon: Phone, content: emergency },
    hasFamily && { key: 'family', label: 'Family', icon: HeartHandshake, content: family },
  ].filter(Boolean);

  const [active, setActive] = useState(0);
  const safeActive = Math.min(active, Math.max(0, tabs.length - 1));

  if (tabs.length === 0) {
    return <div className="py-12 text-center text-sm text-gray-400">No applicant information available.</div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Section tabs */}
      <div className="border-b border-gray-100 px-2 pt-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map((t, i) => {
            const Icon = t.icon;
            const isActive = i === safeActive;
            return (
              <button
                key={t.key}
                onClick={() => setActive(i)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${isActive ? 'border-icrcs-navy text-icrcs-navy bg-icrcs-navy/5' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                <Icon className="h-4 w-4" />{t.label}
              </button>
            );
          })}
        </div>
      </div>
      {/* Internally-scrolling content — keeps the modal from growing too tall */}
      <div className="p-4 max-h-[60vh] overflow-y-auto">
        {tabs[safeActive].content}
      </div>
    </div>
  );
}
