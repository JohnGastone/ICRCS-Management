import React,{useState,useRef,useEffect}from'react';
import{CheckCircle,XCircle,AlertTriangle,FileText,MessageSquare,ClipboardList,Upload,X,FolderOpen,SendHorizontal,User,ArrowLeft,ChevronDown,ChevronUp,Copy,Clock,Eye,Trash2,Plus,Download,Building2,RotateCcw,Check}from'lucide-react';
import ApplicantInfoView from'../../../components/common/ApplicantInfoView';
import{getApplicantReview}from'../../../services/managementService';

const assessorCheckedItems=['Identity verification completed','Documents validated','Fingerprint verification reviewed','Interview conducted (if required)','Criminal/immigration check cleared','Eligibility confirmed'];
const approverChecklistItems=['Travel history reviewed','Biometric enrollment verified','Medical clearance obtained','Financial proof assessed','Accommodation details confirmed','Security clearance approved'];

function mimeToExt(mimeType){
  if(!mimeType)return'doc';
  if(mimeType==='application/pdf')return'pdf';
  if(mimeType==='image/jpeg'||mimeType==='image/jpg')return'jpg';
  if(mimeType==='image/png')return'png';
  return mimeType.split('/')[1]||'doc';
}

const history=[
  {id:1,ts:'12-Jun-2026 09:15 AM',officer:'G. Temu',text:'Assessment review initiated. All documents verified and biometric confirmation received.',recommendation:null},
  {id:2,ts:'12-Jun-2026 10:30 AM',officer:'G. Temu',text:'Recommendation submitted: Recommend Approve. Applicant meets all criteria for Citizen by Descent status.',recommendation:'approve',attachments:[
    {id:'att-1',name:'Assessment Summary.pdf',size:'1.5 MB',date:'12-Jun-2026',status:'ready'},
    {id:'att-2',name:'Supporting Documents.pdf',size:'2.3 MB',date:'12-Jun-2026',status:'ready'}
  ]},
  {id:3,ts:'12-Jun-2026 11:00 AM',officer:'A. Mwenda',text:'Approver review started. Case forwarded to decision queue for final determination.',recommendation:null}
];

const departmentOptions=[
  'Citizenship department',
  'Border Management and Control',
  'Legal Department'
];

const finalStatuses=[
  'CITIZEN','MIGRANT','REFUGEE','ASYLUM_SEEKER','ILLEGAL_MIGRANT','LEGAL_MIGRANT'
];

function SectionCard({title,icon,children,defaultOpen=true}){
  const[open,setOpen]=useState(defaultOpen);
  return(
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={()=>setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">{icon}{title}</div>
        {open?<ChevronUp className="h-4 w-4 text-gray-400"/>:<ChevronDown className="h-4 w-4 text-gray-400"/>}
      </button>
      {open&&<div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function InfoRow({label,value,highlight,mono}){
  const copy=()=>{navigator.clipboard.writeText(value);};
  return(
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0 group">
      <span className="text-sm text-gray-400 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`text-sm text-right ${mono?'font-mono':''} ${highlight?'font-semibold text-icrcs-navy':'text-gray-700'}`}>{value}</span>
        <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100"><Copy className="h-3 w-3 text-gray-400"/></button>
      </div>
    </div>
  );
}

const statusBadge=s=>{const m={'Pending Approval':'bg-sky-50 text-sky-700 border-sky-200','Under Assessment':'bg-amber-50 text-amber-700 border-amber-200','In Progress':'bg-blue-50 text-blue-700 border-blue-200','Completed':'bg-green-50 text-green-700 border-green-200','Escalated':'bg-red-50 text-red-700 border-red-200'};return m[s]||'bg-gray-50 text-gray-600 border-gray-200'};

function joinName(...parts){return parts.filter(Boolean).join(' ');}
function joinPlace(...parts){return parts.filter(Boolean).join(', ')||'—';}

function mapReviewToApplicant(r){
  const p=r.personalDetails||{};
  const birth=r.birthDetails||{};
  const addrs=r.addresses||[];
  const cur=addrs.find(a=>a.addressType==='CURRENT')||addrs[0];
  const perm=addrs.find(a=>a.addressType==='PERMANENT');
  const father=(r.parents||[]).find(x=>x.parentType==='FATHER');
  const mother=(r.parents||[]).find(x=>x.parentType==='MOTHER');
  const emp=r.employment;
  const mapParent=(x,gender)=>x?{
    fullName:joinName(x.firstName,x.middleName,x.lastName),
    dob:x.dateOfBirth,gender,
    phone:x.phoneNumber||'—',
    nationality:x.nationality,
    placeOfBirth:joinPlace(x.residenceLocation?.district,x.residenceCity,x.residenceCountry),
    village:x.residenceLocation?.ward||'—',
    residence:joinPlace(x.residenceLocation?.district,x.residenceCity,x.residenceCountry),
  }:null;
  const mapAddr=a=>a?{
    country:a.country,
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
    father:mapParent(father,'Male'),
    mother:mapParent(mother,'Female'),
    education:(r.educationList||[]).map(e=>({
      level:e.educationLevel,institution:e.schoolName,
      completionYear:e.completionYear?String(e.completionYear):'—',
      district:e.city||e.country||'—',indexNo:e.registrationNumber,
    })),
    employment:emp?{
      status:emp.employmentStatus,
      occupation:emp.occupationType||emp.otherOccupation||'—',
      employer:emp.organizationName||'—',
      nationalId:'—',
    }:null,
    emergencyContacts:(r.emergencyContacts||[]).map(c=>({
      fullName:c.fullName,relationship:c.relationshipType,
      occupation:'—',dob:'—',gender:'—',
      phone:c.phoneNumber||'—',nationality:'—',
      placeOfBirth:joinPlace(c.residenceLocation?.district,c.residenceCity,c.country),
      village:c.residenceLocation?.ward||'—',
      residence:joinPlace(c.residenceLocation?.district,c.residenceCity,c.country),
    })),
  };
}

export default function ApproveDecisionWorkspace({row,isOpen,onClose,onSubmit}){
  const[checks,setChecks]=useState(new Array(approverChecklistItems.length).fill(false));
  const[findings,setFindings]=useState('');
  const[notes,setNotes]=useState('');
  const[decision,setDecision]=useState('');
  const[finalStatus,setFinalStatus]=useState('');
  const[documentType,setDocumentType]=useState('');
  const[reason,setReason]=useState('');
  const[escalationDept,setEscalationDept]=useState('');
  const[docFields,setDocFields]=useState([]);
  const[previewDoc,setPreviewDoc]=useState(null);
  const[historyPreviewDoc,setHistoryPreviewDoc]=useState(null);
  const[confirm,setConfirm]=useState(false);
  const[toast,setToast]=useState('');
  const[activeTab,setActiveTab]=useState('info');
  const[historyList,setHistoryList]=useState(history);
  const[newNote,setNewNote]=useState('');
  const[decisionAttachments,setDecisionAttachments]=useState([]);
  const fileRefs=useRef({});
  const decisionFileRef=useRef({});
  const findingsRef=useRef(null);
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

  const isReadOnly=['approved','rejected','escalated to department','escalated'].includes(row.status?.toLowerCase());

  const attachmentDocs=(reviewData?.attachments||[]).map((att,i)=>{
    const ext=mimeToExt(att.mimeType);
    const isImage=att.mimeType?.startsWith('image/');
    return{id:i+1,attachmentType:att.attachmentType||'Document',name:(att.attachmentType||'Document')+'.'+ext,url:att.fileUrl,mimeType:att.mimeType||'application/pdf',isImage,ext};
  });

  const toggle=i=>setChecks(c=>c.map((v,idx)=>idx===i?!v:v));
  const allDone=checks.every(Boolean);

  const addDocField=()=>{setDocFields(d=>[...d,{id:Date.now()+Math.random(),file:null,name:'',preview:'',status:'pending'}]);};
  const removeDocField=id=>{setDocFields(d=>d.filter(x=>x.id!==id));if(previewDoc&&previewDoc.id===id)setPreviewDoc(null);};

  const handleDocUpload=(id,e)=>{
    const f=e.target.files?.[0];if(!f)return;
    if(f.type!=='application/pdf'){setToast('PDF only.');setTimeout(()=>setToast(''),3000);e.target.value='';return;}
    if(f.size>5*1024*1024){setToast('File exceeds 5 MB.');setTimeout(()=>setToast(''),3000);e.target.value='';return;}
    const r=new FileReader();
    r.onload=ev=>{setDocFields(d=>d.map(x=>x.id===id?{...x,file:f,name:f.name,preview:ev.target.result,status:'ready'}:x));};
    r.readAsDataURL(f);e.target.value='';
  };

  const addDecisionAttachment=()=>{setDecisionAttachments(d=>[...d,{id:Date.now()+Math.random(),file:null,name:'',preview:'',status:'pending'}]);};
  const removeDecisionAttachment=id=>{setDecisionAttachments(d=>d.filter(x=>x.id!==id));};
  const handleDecisionAttachmentUpload=(id,e)=>{
    const f=e.target.files?.[0];if(!f)return;
    if(f.type!=='application/pdf'){setToast('PDF only.');setTimeout(()=>setToast(''),3000);e.target.value='';return;}
    if(f.size>5*1024*1024){setToast('File exceeds 5 MB.');setTimeout(()=>setToast(''),3000);e.target.value='';return;}
    const r=new FileReader();
    r.onload=ev=>{setDecisionAttachments(d=>d.map(x=>x.id===id?{...x,file:f,name:f.name,preview:ev.target.result,status:'ready'}:x));};
    r.readAsDataURL(f);e.target.value='';
  };
  const autoResizeFindings=e=>{const t=e.target;t.style.height='auto';t.style.height=t.scrollHeight+'px';};

  const saveNote=()=>{
    if(!newNote.trim()){setToast('Note cannot be empty.');setTimeout(()=>setToast(''),3000);return;}
    const ts=new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    setHistoryList(h=>[{id:Date.now(),ts,officer:'Current Officer',text:newNote.trim(),recommendation:null},...h]);
    setNewNote('');setToast('Note saved.');setTimeout(()=>setToast(''),3000);
  };

  const submit=()=>{
    if(!allDone){setToast('Complete all checklist items first.');setTimeout(()=>setToast(''),4000);return;}
    if(!decision){setToast('Select a decision.');setTimeout(()=>setToast(''),4000);return;}
    if(decision==='escalate'&&!escalationDept){setToast('Select a department.');setTimeout(()=>setToast(''),4000);return;}
    if((decision==='reject'||decision==='return'||decision==='escalate')&&!reason.trim()){setToast('Enter a reason.');setTimeout(()=>setToast(''),4000);return;}
    if(decision==='approve'&&!finalStatus){setToast('Select a final immigration status.');setTimeout(()=>setToast(''),4000);return;}
    onSubmit(row.caseNo,{
      decision:decision==='return'?'RETURN_TO_ASSESSMENT':decision.toUpperCase(),
      finalStatus:decision==='approve'?finalStatus:undefined,
      documentType:decision==='approve'&&finalStatus==='LEGAL_MIGRANT'?documentType:undefined,
      reason:(decision==='reject'||decision==='return'||decision==='escalate')?reason:undefined,
      notes:notes||undefined,
    });
    setConfirm(false);onClose();
  };

  const applicant=applicantData||{};

  const tabs=[
    {id:'info',label:'Applicant Info',icon:<User className="h-4 w-4"/>},
    {id:'attachments',label:'Attachments',icon:<FolderOpen className="h-4 w-4"/>},
    {id:'checklist',label:'Checklist',icon:<ClipboardList className="h-4 w-4"/>},
    ...(!isReadOnly?[{id:'decision',label:'Decision',icon:<SendHorizontal className="h-4 w-4"/>}]:[]),
  ];

  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white w-full h-full md:w-[85%] md:h-[90vh] lg:w-[75%] lg:max-w-[1100px] lg:h-auto lg:max-h-[85vh] rounded-none md:rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><ArrowLeft className="h-4 w-4 text-gray-500"/></button>
            <div><h2 className="text-base font-bold text-gray-800">Approve Decision Workspace</h2><p className="text-sm text-gray-400 font-mono">{row.caseNo} / {row.appNo}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${statusBadge(row.status)}`}>{row.status}</span>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X className="h-4 w-4 text-gray-500"/></button>
          </div>
        </div>

        {/* Toast */}
        {toast&&<div className="mx-5 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" strokeWidth={2.5}/><span className="text-sm font-medium text-amber-700">{toast}</span><button onClick={()=>setToast('')} className="ml-auto"><X className="h-3.5 w-3.5 text-amber-600"/></button></div>}

        {/* Read-only banner for finalized cases */}
        {isReadOnly&&<div className="mx-5 mt-3 p-3 rounded-xl bg-green-50 border border-green-200 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600 shrink-0" strokeWidth={2.5}/><span className="text-sm font-medium text-green-800">This case has already been <strong>{row.status.toLowerCase()}</strong> and cannot be modified. View-only mode.</span></div>}

        {/* Tabs */}
        <div className="px-5 sm:px-6 pt-4 border-b border-gray-100 bg-white">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(t=>(<button key={t.id} onClick={()=>setActiveTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${activeTab===t.id?'border-icrcs-navy text-icrcs-navy bg-icrcs-navy/5':'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>{t.icon}{t.label}</button>))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {activeTab==='info'&&(loadingApplicant
            ?<div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading applicant data...</div>
            :applicantError
              ?<div className="flex flex-col items-center justify-center py-20 gap-2">
                 <p className="text-sm text-red-500 font-medium">Failed to load applicant data</p>
                 <p className="text-xs text-gray-400">{applicantError}</p>
               </div>
              :<ApplicantInfoView data={applicant}/>
          )}

          {activeTab==='attachments'&&(
            <div className="flex flex-col lg:flex-row gap-5">
              <div className="lg:w-[55%] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800">
                    {loadingApplicant?'Applicant Documents (loading…)':`Applicant Documents (${attachmentDocs.length})`}
                  </h3>
                  <span className="text-xs text-gray-400">Read-only view. Download or preview only.</span>
                </div>
                {applicantError&&<p className="text-xs text-red-500">{applicantError}</p>}
                <div className="space-y-2">
                  {attachmentDocs.length===0&&!loadingApplicant&&(
                    <div className="text-xs text-gray-400 py-4 text-center">No attachments found for this applicant.</div>
                  )}
                  {attachmentDocs.map(d=>(
                    <div key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${d.isImage?'bg-blue-50':'bg-red-50'}`}>
                          <span className={`text-[9px] font-bold uppercase ${d.isImage?'text-blue-600':'text-red-600'}`}>{d.ext}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-gray-700 truncate">{d.name}</div>
                          <div className="text-[10px] text-gray-400">{d.attachmentType}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={()=>setPreviewDoc(d)} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Preview"><Eye className="h-3.5 w-3.5"/></button>
                        <a href={d.url} target="_blank" rel="noreferrer" download={d.name} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Download"><Download className="h-3.5 w-3.5"/></a>
                      </div>
                    </div>
                  ))}
                </div>
                {docFields.length>0&&(
                  <>
                    <div className="flex items-center justify-between pt-2"><h3 className="text-sm font-bold text-gray-800">Pending Uploads ({docFields.length})</h3></div>
                    <div className="space-y-2">
                      {docFields.map(d=>{
                        const ext=d.name.split('.').pop().toLowerCase();
                        return(
                          <div key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-dashed border-green-300 bg-green-50/30">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0"><span className="text-[9px] font-bold text-green-600 uppercase">{ext||'PDF'}</span></div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-gray-700 truncate">{d.name||'New Document'}</div>
                                <div className="text-[10px] text-green-600">{d.status==='ready'?'Ready':'Waiting for upload'}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {d.status==='ready'&&<button onClick={()=>setPreviewDoc(d)} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Preview"><Eye className="h-3.5 w-3.5"/></button>}
                              <button onClick={()=>removeDocField(d.id)} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-red-500 transition-colors" title="Remove"><Trash2 className="h-3.5 w-3.5"/></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                <div className="p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-center">
                  <input type="file" accept=".pdf" ref={el=>fileRefs.current['new']=el} onChange={e=>{
                    const f=e.target.files?.[0];if(!f)return;
                    if(f.type!=='application/pdf'){setToast('PDF only.');setTimeout(()=>setToast(''),3000);e.target.value='';return;}
                    if(f.size>5*1024*1024){setToast('File exceeds 5 MB.');setTimeout(()=>setToast(''),3000);e.target.value='';return;}
                    const r=new FileReader();
                    r.onload=ev=>{setDocFields(d=>[...d,{id:Date.now()+Math.random(),file:f,name:f.name,preview:ev.target.result,status:'ready'}]);};
                    r.readAsDataURL(f);e.target.value='';
                  }} className="hidden"/>
                  <button onClick={()=>fileRefs.current['new']?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm">
                    <Upload className="h-4 w-4"/>Upload Document
                  </button>
                  <p className="text-[11px] text-gray-400 mt-2">Supported: PDF only &middot; Max 5 MB per file</p>
                </div>
              </div>
              <div className="lg:w-[45%] space-y-4">
                {previewDoc?(
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-icrcs-navy"/><span className="text-sm font-semibold text-gray-700 truncate max-w-[180px]">{previewDoc.name}</span></div>
                      <button onClick={()=>setPreviewDoc(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400 shrink-0"><X className="h-3.5 w-3.5"/></button>
                    </div>
                    {previewDoc.isImage?(
                      <div className="flex-1 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center min-h-[280px]">
                        <img src={previewDoc.url} alt={previewDoc.name} className="max-w-full max-h-[420px] object-contain rounded"/>
                      </div>
                    ):(()=>{const src=previewDoc.url||previewDoc.preview;return(
                      <div className="flex-1 rounded-lg bg-gray-50 border border-gray-100 p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
                        <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mb-3"><span className="text-sm font-bold text-red-600 uppercase">{previewDoc.ext||'PDF'}</span></div>
                        <p className="text-sm font-medium text-gray-700 mb-1">{previewDoc.name}</p>
                        {previewDoc.attachmentType&&<p className="text-xs text-gray-400 mb-4">{previewDoc.attachmentType}</p>}
                        {src&&<div className="flex items-center gap-2">
                          <a href={src} target="_blank" rel="noreferrer" download={previewDoc.name} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:bg-white transition-colors flex items-center gap-1"><Download className="h-3 w-3"/>Download</a>
                          <button onClick={()=>window.open(src,'_blank')} className="px-3 py-1.5 rounded-lg bg-icrcs-navy text-white text-xs font-medium hover:bg-icrcs-navy-light transition-colors">Open in Browser</button>
                        </div>}
                      </div>
                    );})()}
                  </div>
                ):(
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full flex flex-col items-center justify-center text-center min-h-[280px]">
                    <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3"><FileText className="h-6 w-6 text-gray-300"/></div>
                    <p className="text-sm font-medium text-gray-500">Select a document to preview</p>
                    <p className="text-xs text-gray-400 mt-1">Click the eye icon on any document</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab==='checklist'&&(
            <div className="flex flex-col lg:flex-row gap-5">
              {/* Left column — Assessor checked items */}
              <div className="lg:w-1/2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h4 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600"/>Assessor Checked Items</h4>
                <p className="text-xs text-gray-400 mb-4">Items completed by the assessor during the assessment phase.</p>
                <ul className="space-y-2">
                  {assessorCheckedItems.map((item,i)=>{
                    const initials=item.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
                    return(
                      <li key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-green-50/40 border border-green-100">
                        <div className="h-7 w-7 rounded-lg bg-green-100 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[9px] font-bold text-green-700">{initials}</span></div>
                        <div className="flex-1 min-w-0"><span className="text-sm text-gray-700 leading-snug">{item}</span></div>
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" strokeWidth={2.5}/>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Right column — Unaccessed Items */}
              <div className="lg:w-1/2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h4 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-icrcs-navy"/>Unaccessed Items</h4>
                <p className="text-xs text-gray-400 mb-4">Items to be verified and checked by the approver before final decision.</p>
                <div className="space-y-1">
                  {approverChecklistItems.map((item,i)=>{
                    const c=checks[i];
                    return(
                      <div key={i} onClick={()=>!isReadOnly&&toggle(i)} className={`flex items-center justify-between gap-2 py-2.5 border-b border-gray-100 rounded-lg px-3 transition-colors ${isReadOnly?'cursor-default':'cursor-pointer hover:bg-gray-50/60'}`}>
                        <span className={`text-sm ${c?'text-gray-500 line-through':'text-gray-700'}`}>{item}</span>
                        {c?<CheckCircle className="h-4 w-4 text-green-500 shrink-0" strokeWidth={2.5}/>:<div className="h-4 w-4 rounded-full border-2 border-gray-200 shrink-0"/>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{checks.filter(Boolean).length} of {approverChecklistItems.length} completed</span>
                  {allDone&&<span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-semibold">All Complete</span>}
                </div>
              </div>
            </div>
          )}

          {activeTab==='decision'&&(
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><Clock className="h-4 w-4 text-icrcs-navy"/>Assessment Notes & Recommendations History</h4>
                <div className="space-y-4">
                  {historyList.map(h=>{
                    const recBadge=h.recommendation==='approve'?{cls:'bg-green-50 text-green-700 border-green-200',label:'Approved'}:h.recommendation==='reject'?{cls:'bg-red-50 text-red-700 border-red-200',label:'Rejected'}:h.recommendation==='escalate'?{cls:'bg-amber-50 text-amber-700 border-amber-200',label:'Escalated'}:null;
                    return(
                      <div key={h.id} className="border-l-2 border-gray-200 pl-4 py-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-semibold text-icrcs-navy">{h.ts}</span>
                          <span className="text-xs text-gray-400">Officer: {h.officer}</span>
                          {recBadge&&<span className={`text-xs px-2 py-0.5 rounded-full border ${recBadge.cls}`}>{recBadge.label}</span>}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{h.text}</p>
                        {h.attachments && h.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {h.attachments.map(att=>{
                              const ext=att.name.split('.').pop().toLowerCase();
                              return(
                                <div key={att.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50/50">
                                  <div className="h-7 w-7 rounded-md bg-green-50 flex items-center justify-center shrink-0"><span className="text-[8px] font-bold text-green-600 uppercase">{ext}</span></div>
                                  <div className="flex-1 min-w-0"><p className="text-xs text-gray-700 truncate">{att.name}</p><p className="text-[10px] text-gray-400">{att.size} &middot; {att.date}</p></div>
                                  <button onClick={()=>setHistoryPreviewDoc(att)} className="p-1 rounded hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="View"><Eye className="h-3.5 w-3.5"/></button>
                                  <button className="p-1 rounded hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Download"><Download className="h-3.5 w-3.5"/></button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}</div>
                </div>
                {historyPreviewDoc && (
                  <div className="mt-4 bg-gray-50 rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200/60">
                      <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-icrcs-navy"/><span className="text-xs font-semibold text-gray-700">Attachment Preview</span></div>
                      <button onClick={()=>setHistoryPreviewDoc(null)} className="p-1 rounded hover:bg-gray-200 text-gray-400"><X className="h-3.5 w-3.5"/></button>
                    </div>
                    <div className="rounded-lg bg-white border border-gray-100 p-5 flex flex-col items-center justify-center text-center min-h-[180px]">
                      <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center mb-2"><span className="text-xs font-bold text-red-600 uppercase">{historyPreviewDoc.name.split('.').pop()}</span></div>
                      <p className="text-sm font-medium text-gray-700 mb-1">{historyPreviewDoc.name}</p>
                      <p className="text-xs text-gray-400 mb-3">{historyPreviewDoc.size||''} &middot; {historyPreviewDoc.date||''}</p>
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:bg-white transition-colors flex items-center gap-1"><Download className="h-3 w-3"/>Download</button>
                        <button className="px-3 py-1.5 rounded-lg bg-icrcs-navy text-white text-xs font-medium hover:bg-icrcs-navy-light transition-colors">Open in Viewer</button>
                      </div>
                    </div>
                  </div>
                )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-icrcs-navy"/>Determination Findings</h4>
                  <textarea ref={findingsRef} rows={3} value={findings} onChange={e=>setFindings(e.target.value)} onInput={autoResizeFindings} placeholder="Record determination findings, observations, and interview notes..." style={{minHeight:'80px'}} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy resize-none overflow-hidden transition-all"/>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Decision Attachments <span className="text-gray-400 normal-case font-normal">(Optional)</span></h5>
                      <button onClick={addDecisionAttachment} className="flex items-center gap-1 text-xs font-medium text-icrcs-navy hover:text-icrcs-navy-light transition-colors"><Plus className="h-3 w-3"/>Add</button>
                    </div>
                    {decisionAttachments.length===0&&<p className="text-xs text-gray-400">No attachments added yet.</p>}
                    <div className="space-y-2">
                      {decisionAttachments.map(d=>{
                        const ext=d.name.split('.').pop().toLowerCase();
                        return(
                          <div key={d.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-2 min-w-0">
                              {d.status==='ready'?<><div className="h-7 w-7 rounded-md bg-green-50 flex items-center justify-center shrink-0"><span className="text-[8px] font-bold text-green-600 uppercase">{ext}</span></div><span className="text-xs text-gray-700 truncate">{d.name}</span><span className="text-[10px] text-green-600 shrink-0">Ready</span></>:<><div className="h-7 w-7 rounded-md bg-gray-100 flex items-center justify-center shrink-0"><FileText className="h-3 w-3 text-gray-400"/></div><span className="text-xs text-gray-400">No file selected</span></>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {d.status==='pending'&&(<>
                                <input type="file" accept=".pdf" ref={el=>{if(el)decisionFileRef.current[d.id]=el;}} onChange={e=>handleDecisionAttachmentUpload(d.id,e)} className="hidden"/>
                                <button onClick={()=>decisionFileRef.current[d.id]?.click()} className="px-2 py-1 rounded-lg border border-gray-200 text-[10px] font-medium text-gray-500 hover:bg-white transition-colors">Choose</button>
                              </>)}
                              <button onClick={()=>removeDecisionAttachment(d.id)} className="p-1 rounded hover:bg-white text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="h-3 w-3"/></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2"><SendHorizontal className="h-4 w-4 text-icrcs-navy"/>Final Decision</h4>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button onClick={()=>setDecision('approve')} className={`p-3 rounded-xl border-2 text-center transition-all ${decision==='approve'?'border-green-500 bg-green-50':'border-gray-100 hover:border-green-300'}`}><CheckCircle className="h-5 w-5 mx-auto mb-1.5 text-green-600"/><span className="text-xs font-semibold text-gray-800">Approve</span></button>
                    <button onClick={()=>setDecision('reject')} className={`p-3 rounded-xl border-2 text-center transition-all ${decision==='reject'?'border-red-500 bg-red-50':'border-gray-100 hover:border-red-300'}`}><XCircle className="h-5 w-5 mx-auto mb-1.5 text-red-600"/><span className="text-xs font-semibold text-gray-800">Reject</span></button>
                    <button onClick={()=>setDecision('return')} className={`p-3 rounded-xl border-2 text-center transition-all ${decision==='return'?'border-amber-500 bg-amber-50':'border-gray-100 hover:border-amber-300'}`}><RotateCcw className="h-5 w-5 mx-auto mb-1.5 text-amber-600"/><span className="text-xs font-semibold text-gray-800">Return</span></button>
                    <button onClick={()=>setDecision('escalate')} className={`p-3 rounded-xl border-2 text-center transition-all ${decision==='escalate'?'border-purple-500 bg-purple-50':'border-gray-100 hover:border-purple-300'}`}><Building2 className="h-5 w-5 mx-auto mb-1.5 text-purple-600"/><span className="text-xs font-semibold text-gray-800">Escalate</span></button>
                  </div>
                  {decision==='approve'&&(
                    <div className="mt-3">
                      <label className="text-sm font-medium text-gray-600">Final Immigration Status <span className="text-red-500">*</span></label>
                      <div className="relative mt-1">
                        <select value={finalStatus} onChange={e=>setFinalStatus(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy cursor-pointer transition-all">
                          <option value="">Select final status...</option>
                          {finalStatuses.map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="h-3.5 w-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"/>
                      </div>
                    </div>
                  )}
                  {decision==='escalate'&&(
                    <div className="mt-3">
                      <label className="text-sm font-medium text-gray-600">Department <span className="text-red-500">*</span></label>
                      <div className="relative mt-1">
                        <select value={escalationDept} onChange={e=>setEscalationDept(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy cursor-pointer transition-all">
                          <option value="">Select department...</option>
                          {departmentOptions.map(d=><option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDown className="h-3.5 w-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"/>
                      </div>
                    </div>
                  )}
                  {(decision==='reject'||decision==='return'||decision==='escalate')&&<div className="mt-3"><label className="text-sm font-medium text-gray-600">Reason <span className="text-red-500">*</span></label><textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder={`Enter reason for ${decision==='reject'?'rejection':decision==='return'?'return':'escalation'}...`} className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy resize-none transition-all"/></div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0 sticky bottom-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-base font-medium text-gray-500 hover:bg-white transition-colors">Close</button>
          {!isReadOnly&&<div className="flex items-center gap-2">
            {!confirm?(
              <button onClick={()=>setConfirm(true)} className="px-6 py-2.5 rounded-xl bg-icrcs-navy text-white text-base font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm flex items-center gap-1.5"><SendHorizontal className="h-4 w-4"/>Submit Decision</button>
            ):(
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-sm text-amber-700 font-medium">Submit this decision?</span>
                <button onClick={()=>setConfirm(false)} className="text-sm px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-white transition-colors">Cancel</button>
                <button onClick={submit} className="text-sm px-2 py-1 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors">Confirm</button>
              </div>
            )}
          </div>}
        </div>
      </div>
    </div>
  );
}
