import React, { useState } from 'react';
import { User, Home, Users, GraduationCap, Phone, Copy, FileBadge2, HeartHandshake } from 'lucide-react';

const isEmptyValue = (val) => {
  if (val === undefined || val === null) return true;
  const str = val.toString().trim();
  if (str === '' || str === '—' || str === '-' || str === 'Not specified' || str === 'Not on record' || str === 'N/A') return true;
  if (/XXX/i.test(str)) return true;
  return false;
};

function InfoRow({ label, value, highlight, mono }) {
  if (isEmptyValue(value)) return null;
  const copy = () => { navigator.clipboard.writeText(value || ''); };
  const hasValue = Boolean(value);
  const display = value;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0 group">
      <span className="text-xs text-gray-400 shrink-0 w-[110px] sm:w-[140px]">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-sm text-right break-words ${mono ? 'font-mono' : ''} ${highlight ? 'font-semibold text-icrcs-navy' : 'text-gray-900'}`}>{display}</span>
        {hasValue && (
          <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100 shrink-0">
            <Copy className="h-3 w-3 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ number, title, icon }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-sm font-bold text-icrcs-navy">{number}.</span>
      <span className="text-sm font-bold text-gray-800">{title}</span>
      {icon && <span className="ml-auto">{icon}</span>}
    </div>
  );
}

function SubSection({ title, children }) {
  return (
    <div className="mb-4 last:mb-0">
      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h5>
      <div className="bg-gray-50/60 rounded-xl border border-gray-100 p-3">
        {children}
      </div>
    </div>
  );
}

export default function ApplicantInfoView({ data }) {
  const [activeSubTab, setActiveSubTab] = useState('personal');
  const a = data || {};
  const hasParents = Boolean(a.father || a.mother);
  const hasOtherFamily = Boolean((a.spouses && a.spouses.length > 0) || (a.relatives && a.relatives.length > 0) || (a.children && a.children.length > 0));

  const subTabs = [
    { id: 'personal', label: 'Personal Information', icon: <User className="h-3.5 w-3.5 shrink-0" /> },
    { id: 'parents', label: 'Parents Information', icon: <HeartHandshake className="h-3.5 w-3.5 shrink-0" /> },
    { id: 'family', label: 'Family and Emergency Contacts', icon: <Users className="h-3.5 w-3.5 shrink-0" /> },
    { id: 'education', label: 'Education and Employment', icon: <GraduationCap className="h-3.5 w-3.5 shrink-0" /> },
    { id: 'documents', label: 'Identification Documents', icon: <FileBadge2 className="h-3.5 w-3.5 shrink-0" /> },
  ];

  return (
    <div className="space-y-4">
      {/* 5-Column Grid Sub-Tabs Bar (Single Row, Non-Scrolling, Fits All Screens) */}
      <div className="grid grid-cols-5 w-full gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 select-none">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2 py-1.5 rounded-lg text-[10px] sm:text-[11px] lg:text-xs font-bold transition-all text-center min-w-0 ${activeSubTab === tab.id
              ? 'bg-white text-icrcs-navy shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            title={tab.label}
          >
            <span className="shrink-0">{tab.icon}</span>
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Personal Information (Sections 1 & 2) */}
      {activeSubTab === 'personal' && (
        <div className="space-y-4 animate-fadeIn">
          {/* 1. Personal Information */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <SectionHeader number="1" title="Personal Information" icon={<User className="h-4 w-4 text-icrcs-navy" />} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow label="Full Name" value={a.fullName} highlight />
              <InfoRow label="Gender" value={a.gender} />
              <InfoRow label="Date of Birth" value={a.dob} />
              <InfoRow label="Citizenship Type" value={a.citizenshipType} />
              <InfoRow label="Nationality" value={a.nationality} />
              <InfoRow label="Country of Birth" value={a.countryOfBirth} />
              <InfoRow label="Region" value={a.region} />
              <InfoRow label="District" value={a.district} />
              <InfoRow label="Ward" value={a.ward} />
              <InfoRow label="Street" value={a.villageStreet} />
              <InfoRow label="Birth Certificate No." value={a.birthCertificateNo} mono />
              <InfoRow label="Marital Status" value={a.maritalStatus} />
              <InfoRow label="Phone Number" value={a.phone} />
              <InfoRow label="Email Address" value={a.email} />
            </div>
          </div>

          {/* 2. Residence Information */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <SectionHeader number="2" title="Residence Information" icon={<Home className="h-4 w-4 text-icrcs-navy" />} />
            <SubSection title="Current Address">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <InfoRow label="Country" value={a.currentAddress?.country} />
                <InfoRow label="Region" value={a.currentAddress?.region} />
                <InfoRow label="District" value={a.currentAddress?.district} />
                <InfoRow label="Ward" value={a.currentAddress?.ward} />
                <InfoRow label="House No. / Street" value={a.currentAddress?.houseStreet} />
                <InfoRow label="Postal Code" value={a.currentAddress?.postalCode} />
              </div>
            </SubSection>
            <SubSection title="Permanent Address">
              <InfoRow label="Same as current address" value={a.permanentSameAsCurrent ? 'Yes' : 'No'} />
              {!a.permanentSameAsCurrent && a.permanentAddress && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 mt-2">
                  <InfoRow label="Country" value={a.permanentAddress.country} />
                  <InfoRow label="Region" value={a.permanentAddress.region} />
                  <InfoRow label="District" value={a.permanentAddress.district} />
                  <InfoRow label="Ward" value={a.permanentAddress.ward} />
                  <InfoRow label="House No. / Street" value={a.permanentAddress.houseStreet} />
                  <InfoRow label="Postal Code" value={a.permanentAddress.postalCode} />
                </div>
              )}
            </SubSection>
          </div>
        </div>
      )}

      {/* Tab 2: Parents Information */}
      {activeSubTab === 'parents' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <SectionHeader number="3" title="Parents Information" icon={<HeartHandshake className="h-4 w-4 text-icrcs-navy" />} />
            {hasParents ? (
              <>
                {a.father && (
                  <SubSection title="Father">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                      <InfoRow label="Full Name" value={a.father.fullName} />
                      <InfoRow label="Date of Birth" value={a.father.dob} />
                      <InfoRow label="Phone" value={a.father.phone} />
                      <InfoRow label="Nationality" value={a.father.nationality} />
                      <InfoRow label="Country of Birth" value={a.father.residenceCountry} />
                      <InfoRow label="Region" value={a.father.residenceRegion} />
                      <InfoRow label="District" value={a.father.residenceDistrict} />
                      <InfoRow label="Ward" value={a.father.residenceWard} />
                      <InfoRow label="Street" value={a.father.residenceStreet} />
                      <InfoRow label="Residence" value={!a.father.residenceRegion ? a.father.residence : null} />
                    </div>
                  </SubSection>
                )}
                {a.mother && (
                  <SubSection title="Mother">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                      <InfoRow label="Full Name" value={a.mother.fullName} />
                      <InfoRow label="Date of Birth" value={a.mother.dob} />
                      <InfoRow label="Phone" value={a.mother.phone} />
                      <InfoRow label="Nationality" value={a.mother.nationality} />
                      <InfoRow label="Country of Birth" value={a.mother.residenceCountry} />
                      <InfoRow label="Region" value={a.mother.residenceRegion} />
                      <InfoRow label="District" value={a.mother.residenceDistrict} />
                      <InfoRow label="Ward" value={a.mother.residenceWard} />
                      <InfoRow label="Street" value={a.mother.residenceStreet} />
                      <InfoRow label="Residence" value={!a.mother.residenceRegion ? a.mother.residence : null} />
                    </div>
                  </SubSection>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-400 italic">No parent details provided.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Family and Emergency Contacts */}
      {activeSubTab === 'family' && (
        <div className="space-y-4 animate-fadeIn">
          {/* 4. Family Information */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <SectionHeader number="4" title="Family Information" icon={<Users className="h-4 w-4 text-icrcs-navy" />} />
            {hasOtherFamily ? (
              <>
                {a.spouses && a.spouses.map((s, i) => (
                  <SubSection key={`spouse-${i}`} title={a.spouses.length > 1 ? `Spouse ${i + 1}` : 'Spouse'}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                      <InfoRow label="Full Name" value={s.fullName} />
                      <InfoRow label="Gender" value={s.gender} />
                      <InfoRow label="Date of Birth" value={s.dob} />
                      <InfoRow label="Phone" value={s.phone} />
                      <InfoRow label="Nationality" value={s.nationality} />
                      <InfoRow label="Residence" value={s.residence} />
                    </div>
                  </SubSection>
                ))}
                {a.relatives && a.relatives.map((r, i) => (
                  <SubSection key={`relative-${i}`} title={`Relative ${i + 1}${r.relationship ? ` (${r.relationship})` : ''}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                      <InfoRow label="Full Name" value={r.fullName} />
                      <InfoRow label="Gender" value={r.gender} />
                      <InfoRow label="Date of Birth" value={r.dob} />
                      <InfoRow label="Phone" value={r.phone} />
                      <InfoRow label="Nationality" value={r.nationality} />
                      <InfoRow label="Residence" value={r.residence} />
                    </div>
                  </SubSection>
                ))}
                {a.children && a.children.map((c, i) => (
                  <SubSection key={`child-${i}`} title={`Child ${i + 1}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                      <InfoRow label="Full Name" value={c.fullName} />
                      <InfoRow label="Gender" value={c.gender} />
                      <InfoRow label="Date of Birth" value={c.dob} />
                      <InfoRow label="Nationality" value={c.nationality} />
                      <InfoRow label="Residence" value={c.residence} />
                    </div>
                  </SubSection>
                ))}
              </>
            ) : (
              <p className="text-xs text-gray-400 italic">No spouse, child, or relative details provided.</p>
            )}
          </div>

          {/* 5. Emergency Contacts */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <SectionHeader number="5" title="Emergency Contacts" icon={<Phone className="h-4 w-4 text-icrcs-navy" />} />
            {a.emergencyContacts && a.emergencyContacts.length > 0 ? (
              a.emergencyContacts.map((contact, i) => (
                <SubSection key={i} title={`Emergency Contact ${i + 1}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                    <InfoRow label="Full Name" value={contact.fullName} />
                    <InfoRow label="Relationship" value={contact.relationship} />
                    <InfoRow label="Occupation" value={contact.occupation} />
                    <InfoRow label="Gender" value={contact.gender} />
                    <InfoRow label="Phone" value={contact.phone} />
                    <InfoRow label="Nationality" value={contact.nationality} />
                    <InfoRow label="Residence" value={contact.residence} />
                  </div>
                </SubSection>
              ))
            ) : (
              <p className="text-xs text-gray-400 italic">No emergency contacts provided.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Education and Employment */}
      {activeSubTab === 'education' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <SectionHeader number="6" title="Education and Employment" icon={<GraduationCap className="h-4 w-4 text-icrcs-navy" />} />
            {a.education && a.education.length > 0 && (
              <SubSection title="Education">
                {a.education.map((edu, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <h6 className="text-[11px] font-medium text-gray-500 mb-1">School {i + 1}</h6>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                      <InfoRow label="Education Level" value={edu.level} />
                      <InfoRow label="School / Institution" value={edu.institution} />
                      <InfoRow label="Completion Year" value={edu.completionYear} />
                      <InfoRow label="City / Country" value={edu.city} />
                      <InfoRow label="Index / Reg. No." value={edu.indexNo} mono />
                    </div>
                  </div>
                ))}
              </SubSection>
            )}
            {a.employment && (
              <SubSection title="Employment">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <InfoRow label="Employment Status" value={a.employment.status} />
                  <InfoRow label="Occupation" value={a.employment.occupation} />
                  <InfoRow label="Employer / Organisation" value={a.employment.employer} />
                </div>
              </SubSection>
            )}
            {!a.education?.length && !a.employment && (
              <p className="text-xs text-gray-400 italic">No education or employment details provided.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Identification Documents */}
      {activeSubTab === 'documents' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <SectionHeader number="7" title="Identification Documents" icon={<FileBadge2 className="h-4 w-4 text-icrcs-navy" />} />
            {a.documents && a.documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {a.documents.map((doc, i) => (
                  <InfoRow key={i} label={doc.type} value={doc.number} mono />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No identification documents attached.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
