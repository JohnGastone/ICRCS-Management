import React from 'react';
import { User, Home, Users, GraduationCap, Briefcase, Phone, Copy } from 'lucide-react';

function InfoRow({ label, value, highlight, mono }) {
  const copy = () => { navigator.clipboard.writeText(value || ''); };
  const hasValue = Boolean(value);
  const display = value || '—';
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
  const a = data || {};

  return (
    <div className="space-y-5">
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
          <InfoRow label="Village / Street" value={a.villageStreet} />
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

      {/* 3. Parents Information */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <SectionHeader number="3" title="Parents Information" icon={<Users className="h-4 w-4 text-icrcs-navy" />} />
        {a.father && (
          <SubSection title="Father">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow label="Full Name" value={a.father.fullName} />
              <InfoRow label="Date of Birth" value={a.father.dob} />
              <InfoRow label="Gender" value={a.father.gender} />
              <InfoRow label="Phone" value={a.father.phone} />
              <InfoRow label="Nationality" value={a.father.nationality} />
              <InfoRow label="Place of Birth" value={a.father.placeOfBirth} />
              <InfoRow label="Village" value={a.father.village} />
              <InfoRow label="Residence" value={a.father.residence} />
            </div>
          </SubSection>
        )}
        {a.mother && (
          <SubSection title="Mother">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow label="Full Name" value={a.mother.fullName} />
              <InfoRow label="Date of Birth" value={a.mother.dob} />
              <InfoRow label="Gender" value={a.mother.gender} />
              <InfoRow label="Phone" value={a.mother.phone} />
              <InfoRow label="Nationality" value={a.mother.nationality} />
              <InfoRow label="Place of Birth" value={a.mother.placeOfBirth} />
              <InfoRow label="Village" value={a.mother.village} />
              <InfoRow label="Residence" value={a.mother.residence} />
            </div>
          </SubSection>
        )}
      </div>

      {/* 4. Education & Employment */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <SectionHeader number="4" title="Education & Employment" icon={<GraduationCap className="h-4 w-4 text-icrcs-navy" />} />
        {a.education && a.education.length > 0 && (
          <SubSection title="Education">
            {a.education.map((edu, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <h6 className="text-[11px] font-medium text-gray-500 mb-1">School {i + 1}</h6>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <InfoRow label="Education Level" value={edu.level} />
                  <InfoRow label="School / Institution" value={edu.institution} />
                  <InfoRow label="Completion Year" value={edu.completionYear} />
                  <InfoRow label="School District" value={edu.district} />
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
              <InfoRow label="National ID (NIDA)" value={a.employment.nationalId} mono />
            </div>
          </SubSection>
        )}
      </div>

      {/* 5. Emergency Contacts */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <SectionHeader number="5" title="Emergency Contacts" icon={<Phone className="h-4 w-4 text-icrcs-navy" />} />
        {a.emergencyContacts && a.emergencyContacts.map((contact, i) => (
          <SubSection key={i} title={`Emergency Contact ${i + 1}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow label="Full Name" value={contact.fullName} />
              <InfoRow label="Relationship" value={contact.relationship} />
              <InfoRow label="Occupation" value={contact.occupation} />
              <InfoRow label="Date of Birth" value={contact.dob} />
              <InfoRow label="Gender" value={contact.gender} />
              <InfoRow label="Phone" value={contact.phone} />
              <InfoRow label="Nationality" value={contact.nationality} />
              <InfoRow label="Place of Birth" value={contact.placeOfBirth} />
              <InfoRow label="Village" value={contact.village} />
              <InfoRow label="Residence" value={contact.residence} />
            </div>
          </SubSection>
        ))}
      </div>
    </div>
  );
}
