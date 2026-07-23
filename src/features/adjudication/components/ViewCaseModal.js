import React,{useState,useEffect}from'react';
import{X,FileText,Eye,Download,Copy,ClipboardList}from'lucide-react';
import ApplicantInfoView from'../../../components/common/ApplicantInfoView';
import{getApplicantReview}from'../../../services/managementService';

function joinName(...parts){return parts.filter(Boolean).join(' ');}
function joinPlace(...parts){return parts.filter(Boolean).join(', ')||'—';}

function mapReviewToApplicant(r){
  if(!r) return {};
  const p=r.personalDetails||{};
  const birth=r.birthDetails||{};
  const addrs=r.addresses||[];
  const cur=addrs.find(a=>a.addressType==='CURRENT')||addrs[0];
  const perm=addrs.find(a=>a.addressType==='PERMANENT');
  const father=(r.parents||[]).find(x=>x.parentType==='FATHER');
  const mother=(r.parents||[]).find(x=>x.parentType==='MOTHER');
  const emp=r.employment;
  const mapParent = x => {
    if (!x) return null;
    let country = x.residenceLocation?.country || x.residenceCountry || '';
    let region = x.residenceLocation?.region || '';
    let district = x.residenceLocation?.district || '';
    let ward = x.residenceLocation?.ward || '';
    let street = x.residenceLocation?.street || '';
    if (!region && !district && typeof x.residence === 'string' && x.residence.includes(',')) {
      const parts = x.residence.split(',').map(s => s.trim());
      if (parts.length > 0) country = parts[parts.length - 1];
      if (parts.length > 1) region = parts[parts.length - 2];
      if (parts.length > 2) district = parts[parts.length - 3];
      if (parts.length > 3) ward = parts[parts.length - 4];
      if (parts.length > 4) street = parts.slice(0, parts.length - 4).join(', ');
    } else if (!region && !district && typeof x.residence === 'string') {
      street = x.residence;
    }
    return {
      fullName: joinName(x.firstName, x.middleName, x.lastName) || x.fullName,
      dob: x.dateOfBirth || x.dob,
      phone: x.phoneNumber || x.phone || '—',
      nationality: x.nationality,
      residenceCountry: country,
      residenceRegion: region,
      residenceDistrict: district,
      residenceWard: ward,
      residenceStreet: street,
      residence: typeof x.residence === 'string' ? x.residence : joinPlace(district, x.residenceCity || region, country),
    };
  };
  const mapKin=x=>({
    fullName:joinName(x.firstName,x.middleName,x.lastName),
    gender:x.sex,dob:x.dateOfBirth,
    relationship:x.relationshipType,
    phone:x.phoneNumber||'—',
    nationality:x.nationality,
    residence:joinPlace(x.residenceLocation?.district,x.residenceCity,x.residenceCountry),
  });
  const mapAddr=a=>a?{
    country:a.country||a.location?.country,
    city:a.city,
    region:a.location?.region,
    district:a.location?.district,
    ward:a.location?.ward,
    houseStreet:a.houseNo,
    postalCode:a.postalAddress,
  }:null;
  return{
    fullName:joinName(p.firstName,p.middleName,p.lastName),
    gender:p.sex,dob:p.dateOfBirth,
    citizenshipType:r.citizenshipType,
    nationality:p.nationality,
    countryOfBirth:p.countryOfBirth||birth.countryOfBirth,
    region:cur?.location?.region,
    district:cur?.location?.district,
    ward:cur?.location?.ward,
    villageStreet:cur?.location?.street,
    birthCertificateNo:birth.birthCertificateNo||'—',
    maritalStatus:p.maritalStatus,
    phone:cur?.phoneNumber,
    email:cur?.email,
    currentAddress:mapAddr(cur),
    permanentSameAsCurrent:!perm,
    permanentAddress:mapAddr(perm),
    father:mapParent(father),
    mother:mapParent(mother),
    spouses:(r.spouses||[]).map(mapKin),
    relatives:(r.relatives||[]).map(mapKin),
    children:(r.children||[]).map(mapKin),
    education:(r.educationList||[]).map(e=>({
      level:e.educationLevel,institution:e.schoolName,
      completionYear:e.completionYear?String(e.completionYear):'—',
      city:joinPlace(e.city,e.country),indexNo:e.registrationNumber,
    })),
    employment:emp?{
      status:emp.employmentStatus,
      occupation:emp.occupationType||emp.otherOccupation||'—',
      employer:emp.organizationName||'—',
    }:null,
    documents:(r.documents||[]).map(d=>({type:d.documentType,number:d.documentNumber})),
    emergencyContacts:(r.emergencyContacts||[]).map(c=>({
      fullName:c.fullName,relationship:c.relationshipType,
      occupation:c.occupationType||'—',gender:c.gender||'—',
      phone:c.phoneNumber||'—',nationality:c.nationality||'—',
      residence:joinPlace(c.residenceLocation?.district,c.residenceCity,c.country),
    })),
  };
}

function mimeToExt(mimeType){
  if(!mimeType)return'doc';
  if(mimeType==='application/pdf')return'pdf';
  if(mimeType==='image/jpeg'||mimeType==='image/jpg')return'jpg';
  if(mimeType==='image/png')return'png';
  return mimeType.split('/')[1]||'doc';
}

function InfoRow({label,value,highlight,mono}){
  const copy=()=>{navigator.clipboard.writeText(value||'');};
  const display=value||'—';
  return(
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0 group">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`text-xs text-right ${mono?'font-mono':''} ${highlight?'font-semibold text-icrcs-navy':'text-gray-700'}`}>{display}</span>
        {value&&<button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100"><Copy className="h-3 w-3 text-gray-400"/></button>}
      </div>
    </div>
  );
}

export default function ViewCaseModal({row,isOpen,onClose}){
  const[reviewData,setReviewData]=useState(null);
  const[applicantData,setApplicantData]=useState(null);
  const[loadingApplicant,setLoadingApplicant]=useState(false);
  const[applicantError,setApplicantError]=useState('');

  useEffect(()=>{
    if(!isOpen||!row?.caseNo)return;
    setReviewData(null);setApplicantData(null);setApplicantError('');setLoadingApplicant(true);
    getApplicantReview(row.caseNo)
      .then(review=>{
        if(review){setReviewData(review);setApplicantData(mapReviewToApplicant(review));}
        else setApplicantError('No applicant data returned.');
      })
      .catch(err=>{
        console.error('Applicant review error:', err);
        setApplicantError(err.message||'Failed to load applicant data.');
      })
      .finally(()=>setLoadingApplicant(false));
  },[isOpen,row?.caseNo]);

  if(!isOpen||!row)return null;

  const applicant=applicantData||{};
  const attachmentDocs=(reviewData?.attachments||[]).map((att,i)=>{
    const ext=mimeToExt(att.mimeType);
    const isImage=att.mimeType?.startsWith('image/');
    return{id:i+1,attachmentType:att.attachmentType||'Document',name:(att.attachmentType||'Document')+'.'+ext,url:att.fileUrl,mimeType:att.mimeType||'application/pdf',isImage,ext};
  });

  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white w-full h-full md:w-[85%] md:h-[90vh] lg:w-[75%] lg:max-w-[1100px] lg:h-auto lg:max-h-[85vh] rounded-none md:rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-icrcs-navy/10 flex items-center justify-center"><Eye className="h-5 w-5 text-icrcs-navy"/></div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Case Details</h2>
              <p className="text-sm text-gray-400 font-mono">{row.caseNo} / {row.appNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-icrcs-navy/10 text-icrcs-navy border-icrcs-navy/30">{row.adjudicationType}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${row.priority==='High'?'bg-red-50 text-red-700 border-red-200':row.priority==='Medium'?'bg-amber-50 text-amber-700 border-amber-200':'bg-green-50 text-green-700 border-green-200'}`}>{row.priority}</span>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors ml-2"><X className="h-4 w-4 text-gray-500"/></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-5">
            {loadingApplicant
              ?<div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading applicant data...</div>
              :applicantError
                ?<div className="flex flex-col items-center justify-center py-20 gap-2">
                   <p className="text-sm text-red-500 font-medium">Failed to load applicant data</p>
                   <p className="text-xs text-gray-400">{applicantError}</p>
                 </div>
                :<ApplicantInfoView data={applicant}/>
            }

            <div className="flex flex-col lg:flex-row gap-5">
              {/* Case Details */}
              <div className="lg:w-1/2 space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 p-3 bg-gray-50/60 border-b border-gray-100"><ClipboardList className="h-4 w-4 text-icrcs-navy"/><span className="text-sm font-semibold text-gray-700">Case Details</span></div>
                  <div className="p-3 space-y-1">
                    <InfoRow label="Case Number" value={row.caseNo} mono highlight/>
                    <InfoRow label="Application No" value={row.appNo} mono/>
                    <InfoRow label="Assessment Type" value={row.adjudicationType||'Fingerprint Mismatch'}/>
                    <InfoRow label="Status" value={row.status}/>
                    <InfoRow label="Priority" value={row.priority}/>
                    <InfoRow label="Assigned Officer" value={row.assignedOfficer}/>
                    <InfoRow label="Date Assigned" value={row.dateAssigned}/>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div className="lg:w-1/2 space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 p-3 bg-gray-50/60 border-b border-gray-100"><FileText className="h-4 w-4 text-icrcs-navy"/><span className="text-sm font-semibold text-gray-700">
                    {loadingApplicant?'Attachments / Evidence (loading…)':`Attachments / Evidence (${attachmentDocs.length})`}
                  </span></div>
                  <div className="p-3 space-y-2">
                    {attachmentDocs.length===0&&!loadingApplicant&&(
                      <div className="text-xs text-gray-400 py-4 text-center">No attachments found for this applicant.</div>
                    )}
                    {attachmentDocs.map(d=>(
                      <div key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${d.isImage?'bg-blue-50':'bg-red-50'}`}>
                            <span className={`text-[9px] font-bold uppercase ${d.isImage?'text-blue-600':'text-red-600'}`}>{d.ext}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-gray-700 truncate">{d.name}</div>
                            <div className="text-[10px] text-gray-400">{d.attachmentType}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a href={d.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="View"><Eye className="h-3.5 w-3.5"/></a>
                          <a href={d.url} target="_blank" rel="noreferrer" download={d.name} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Download"><Download className="h-3.5 w-3.5"/></a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-400">Read-only view. No changes can be made.</div>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-white transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}
