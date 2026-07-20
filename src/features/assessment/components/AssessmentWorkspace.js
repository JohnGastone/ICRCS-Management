import React,{useState,useRef,useEffect}from'react';
import{CheckCircle,XCircle,AlertTriangle,FileText,MessageSquare,ClipboardList,Upload,X,FolderOpen,SendHorizontal,User,ArrowLeft,ChevronDown,ChevronUp,Copy,Clock,Eye,Trash2,Plus,Download,Building2,Check,Loader2,PlayCircle}from'lucide-react';
import ApplicantInfoView from'../../../components/common/ApplicantInfoView';
import{getCaseDetail}from'../../../services/managementService';

const checklistItems=['Identity verification completed','Documents validated','Fingerprint verification reviewed','Interview conducted (if required)','Criminal/immigration check cleared','Eligibility confirmed','Travel history reviewed','Biometric enrollment verified','Medical clearance obtained','Financial proof assessed','Accommodation details confirmed','Security clearance approved'];

const statusBadge=s=>{const m={'Pending Assessment':'bg-sky-50 text-sky-700 border-sky-200','Under Assessment':'bg-amber-50 text-amber-700 border-amber-200','In Progress':'bg-blue-50 text-blue-700 border-blue-200','Completed':'bg-green-50 text-green-700 border-green-200','Escalated':'bg-red-50 text-red-700 border-red-200'};return m[s]||'bg-gray-50 text-gray-600 border-gray-200'};

// Backend sexId (1=Male, 2=Female) -> label used by ApplicantInfoView.
const sexLabel=s=>s===1?'Male':s===2?'Female':undefined;

// Maps a management Case Detail response to the ApplicantInfoView shape. Only the
// person-summary fields the backend is known to return are populated; the richer
// address/parents/education sections fill in automatically if the backend
// includes them under these keys, otherwise ApplicantInfoView renders “—”.
function mapDetailToApplicant(detail){
  const p=detail?.person||{};
  return{
    fullName:p.fullName,gender:sexLabel(p.sexId),dob:p.dateOfBirth,
    citizenshipType:p.citizenshipType,nationality:p.nationalityCode,
    countryOfBirth:p.countryOfBirth,region:p.region,district:p.district,
    ward:p.ward,villageStreet:p.villageStreet,birthCertificateNo:p.birthCertificateNo,
    maritalStatus:p.maritalStatus,phone:p.phone,email:p.email,
    currentAddress:p.currentAddress,permanentSameAsCurrent:p.permanentSameAsCurrent,
    permanentAddress:p.permanentAddress,father:p.father,mother:p.mother,
    education:p.education||[],employment:p.employment,emergencyContacts:p.emergencyContacts||[],
  };
}

// Normalises whatever document list the case detail carries (field names vary)
// into the row shape this workspace renders.
function mapDocuments(detail){
  return(detail?.documents||[]).map((d,i)=>({
    id:d.id??d.documentId??i,
    name:d.name||d.fileName||d.documentType||'Document',
    date:d.uploadedAt||d.date||'',
    size:d.size||'',
    uploader:d.uploadedBy||d.uploader||'',
  }));
}

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

const finalStatuses=[
  'Citizen by Birth','Citizen by Descent','Citizen by Naturalization','Citizen by Registration',
  'Resident','Visitor','Refugee','Asylum Seeker','Stateless Person',
  'Settled Migrant','Migrant','Illegal Migrant','Other Authorized Status'
];

const departmentOptions=[
  'Citizenship department',
  'Border Management and Control',
  'Legal Department'
];

export default function AssessmentWorkspace({row,isOpen,onClose,onSubmit,onStartAssessment}){
  const[detail,setDetail]=useState(null);
  const[loadingDetail,setLoadingDetail]=useState(false);
  const[detailError,setDetailError]=useState('');
  const[starting,setStarting]=useState(false);
  const[checks,setChecks]=useState(new Array(checklistItems.length).fill(false));
  const[findings,setFindings]=useState('');
  const[notes,setNotes]=useState('');
  const[recommendation,setRecommendation]=useState('');
  const[finalStatus,setFinalStatus]=useState('');
  const[reason,setReason]=useState('');
  const[escalateTo,setEscalateTo]=useState('');
  const[docFields,setDocFields]=useState([]);
  const[previewDoc,setPreviewDoc]=useState(null);
  const[confirm,setConfirm]=useState(false);
  const[toast,setToast]=useState('');
  const[activeTab,setActiveTab]=useState('info');
  const[history,setHistory]=useState([]);
  const[recAttachments,setRecAttachments]=useState([]);
  const fileRefs=useRef({});
  const recFileRef=useRef({});
  const findingsRef=useRef(null);

  // Load the full case detail (applicant summary, documents, latest records) each
  // time the workspace opens for a case. Replaces the previous mock applicant.
  useEffect(()=>{
    if(!isOpen||!row?.caseNo)return;
    let cancelled=false;
    setLoadingDetail(true);setDetailError('');setDetail(null);
    getCaseDetail(row.caseNo)
      .then(d=>{if(!cancelled)setDetail(d);})
      .catch(e=>{if(!cancelled)setDetailError(e.message||'Failed to load case detail.');})
      .finally(()=>{if(!cancelled)setLoadingDetail(false);});
    return()=>{cancelled=true;};
  },[isOpen,row?.caseNo]);

  if(!isOpen||!row)return null;

  const startAssessmentNow=async()=>{
    if(!onStartAssessment)return;
    setStarting(true);
    try{await onStartAssessment(row.caseNo);}
    finally{setStarting(false);}
  };

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

  const addRecAttachment=()=>{setRecAttachments(d=>[...d,{id:Date.now()+Math.random(),file:null,name:'',preview:'',status:'pending'}]);};
  const removeRecAttachment=id=>{setRecAttachments(d=>d.filter(x=>x.id!==id));};
  const handleRecAttachmentUpload=(id,e)=>{
    const f=e.target.files?.[0];if(!f)return;
    if(f.type!=='application/pdf'){setToast('PDF only.');setTimeout(()=>setToast(''),3000);e.target.value='';return;}
    if(f.size>5*1024*1024){setToast('File exceeds 5 MB.');setTimeout(()=>setToast(''),3000);e.target.value='';return;}
    const r=new FileReader();
    r.onload=ev=>{setRecAttachments(d=>d.map(x=>x.id===id?{...x,file:f,name:f.name,preview:ev.target.result,status:'ready'}:x));};
    r.readAsDataURL(f);e.target.value='';
  };
  const autoResizeFindings=e=>{const t=e.target;t.style.height='auto';t.style.height=t.scrollHeight+'px';};

  const submit=()=>{
    if(!allDone){setToast('Complete all checklist items first.');setTimeout(()=>setToast(''),4000);return;}
    if(!recommendation){setToast('Select a recommendation.');setTimeout(()=>setToast(''),4000);return;}
    if(recommendation==='approve'&&!finalStatus){setToast('Select a recommended immigration status.');setTimeout(()=>setToast(''),4000);return;}
    if((recommendation==='reject'||recommendation==='escalate')&&!reason.trim()){setToast('Enter a reason.');setTimeout(()=>setToast(''),4000);return;}
    if(recommendation==='escalate'&&!escalateTo.trim()){setToast('Select an escalation department.');setTimeout(()=>setToast(''),4000);return;}
    const checkedIndices=checks.map((v,i)=>v?i:-1).filter(i=>i>=0);
    onSubmit(row.caseNo,{
      checklist:checkedIndices,
      findings,
      notes,
      recommendation:recommendation.toUpperCase(),
      proposedFinalStatus:recommendation==='approve'?finalStatus:undefined,
      reason:(recommendation==='reject'||recommendation==='escalate')?reason:undefined,
      escalateToDepartment:recommendation==='escalate'?escalateTo:undefined,
    });
    setConfirm(false);onClose();
  };

  const applicant=mapDetailToApplicant(detail);
  const existingDocs=mapDocuments(detail);

  const tabs=[
    {id:'info',label:'Applicant Info',icon:<User className="h-4 w-4"/>},
    {id:'attachments',label:'Attachments',icon:<FolderOpen className="h-4 w-4"/>},
    {id:'checklist',label:'Checklist',icon:<ClipboardList className="h-4 w-4"/>},
    {id:'recommend',label:'Recommendation',icon:<SendHorizontal className="h-4 w-4"/>}
  ];

  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white w-full h-full md:w-[85%] md:h-[90vh] lg:w-[75%] lg:max-w-[1100px] lg:h-auto lg:max-h-[85vh] rounded-none md:rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><ArrowLeft className="h-4 w-4 text-gray-500"/></button>
            <div><h2 className="text-base font-bold text-gray-800">Assessment Workspace</h2><p className="text-sm text-gray-400 font-mono">{row.caseNo} / {row.appNo}</p></div>
          </div>
          <div className="flex items-center gap-2">
            {(row.status||'').toUpperCase().replace(/\s+/g,'_')==='PENDING_ASSESSMENT'&&onStartAssessment&&(
              <button onClick={startAssessmentNow} disabled={starting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-icrcs-navy text-white text-xs font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {starting?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<PlayCircle className="h-3.5 w-3.5"/>}Start Assessment
              </button>
            )}
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${statusBadge(row.status)}`}>{row.status}</span>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X className="h-4 w-4 text-gray-500"/></button>
          </div>
        </div>

        {/* Toast */}
        {toast&&<div className="mx-5 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" strokeWidth={2.5}/><span className="text-sm font-medium text-amber-700">{toast}</span><button onClick={()=>setToast('')} className="ml-auto"><X className="h-3.5 w-3.5 text-amber-600"/></button></div>}

        {/* Tabs */}
        <div className="px-5 sm:px-6 pt-4 border-b border-gray-100 bg-white">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(t=>(<button key={t.id} onClick={()=>setActiveTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${activeTab===t.id?'border-icrcs-navy text-icrcs-navy bg-icrcs-navy/5':'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>{t.icon}{t.label}</button>))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {activeTab==='info'&&(
            loadingDetail
              ?<div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400"><Loader2 className="h-6 w-6 animate-spin"/><span className="text-sm">Loading applicant details…</span></div>
              :detailError
                ?<div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2"><XCircle className="h-4 w-4 text-red-600 shrink-0"/><span className="text-sm font-medium text-red-700">{detailError}</span></div>
                :<ApplicantInfoView data={applicant}/>
          )}

          {activeTab==='attachments'&&(
            <div className="flex flex-col lg:flex-row gap-5">
              <div className="lg:w-[55%] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800">Existing Documents ({existingDocs.length})</h3>
                  <span className="text-xs text-gray-400">Read-only view. Download or preview only.</span>
                </div>
                <div className="space-y-2">
                  {existingDocs.map(d=>{
                    const ext=d.name.split('.').pop().toLowerCase();
                    return(
                      <div key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0"><span className="text-[9px] font-bold text-red-600 uppercase">{ext}</span></div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-gray-700 truncate">{d.name}</div>
                            <div className="text-[10px] text-gray-400">{d.size} · {d.date} · {d.uploader}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={()=>setPreviewDoc(d)} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Preview"><Eye className="h-3.5 w-3.5"/></button>
                          <button className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Download"><Download className="h-3.5 w-3.5"/></button>
                        </div>
                      </div>
                    );
                  })}
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
                  <p className="text-[11px] text-gray-400 mt-2">Supported: PDF only · Max 5 MB per file</p>
                </div>
              </div>
              <div className="lg:w-[45%] space-y-4">
                {previewDoc?(
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-icrcs-navy"/><span className="text-sm font-semibold text-gray-700">Document Preview</span></div>
                      <button onClick={()=>setPreviewDoc(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="h-3.5 w-3.5"/></button>
                    </div>
                    <div className="flex-1 rounded-lg bg-gray-50 border border-gray-100 p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
                      <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mb-3"><span className="text-sm font-bold text-red-600 uppercase">{previewDoc.name.split('.').pop()}</span></div>
                      <p className="text-sm font-medium text-gray-700 mb-1">{previewDoc.name}</p>
                      <p className="text-xs text-gray-400 mb-4">{previewDoc.size||''} · {previewDoc.date||''}</p>
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:bg-white transition-colors flex items-center gap-1"><Download className="h-3 w-3"/>Download</button>
                        <button className="px-3 py-1.5 rounded-lg bg-icrcs-navy text-white text-xs font-medium hover:bg-icrcs-navy-light transition-colors">Open in Viewer</button>
                      </div>
                    </div>
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
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-icrcs-navy"/>Assessment Checklist</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                {checklistItems.map((item,i)=>{
                  const c=checks[i];
                  return(
                    <div key={i} onClick={()=>toggle(i)} className="flex items-center justify-between gap-2 py-2.5 border-b border-gray-100 cursor-pointer hover:bg-gray-50/60 rounded-lg px-3 transition-colors">
                      <span className={`text-sm ${c?'text-gray-500 line-through':'text-gray-700'}`}>{item}</span>
                      {c?<CheckCircle className="h-4 w-4 text-green-500 shrink-0" strokeWidth={2.5}/>:<div className="h-4 w-4 rounded-full border-2 border-gray-200 shrink-0"/>}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">{checks.filter(Boolean).length} of {checklistItems.length} completed</span>
                {allDone&&<span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-semibold">All Complete</span>}
              </div>
            </div>
          )}

          {activeTab==='recommend'&&(
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><Clock className="h-4 w-4 text-icrcs-navy"/>Assessment Notes & Recommendations History</h4>
                <div className="space-y-4">
                  {history.map(h=>{
                    const recBadge=h.recommendation==='approve'?{cls:'bg-green-50 text-green-700 border-green-200',label:'Approved'}:h.recommendation==='reject'?{cls:'bg-red-50 text-red-700 border-red-200',label:'Rejected'}:h.recommendation==='escalate'?{cls:'bg-amber-50 text-amber-700 border-amber-200',label:'Escalated'}:null;
                    return(
                      <div key={h.id} className="border-l-2 border-gray-200 pl-4 py-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-semibold text-icrcs-navy">{h.ts}</span>
                          <span className="text-xs text-gray-400">Officer: {h.officer}</span>
                          {recBadge&&<span className={`text-xs px-2 py-0.5 rounded-full border ${recBadge.cls}`}>{recBadge.label}</span>}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{h.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-icrcs-navy"/>Assessment Findings</h4>
                  <textarea ref={findingsRef} rows={3} value={findings} onChange={e=>setFindings(e.target.value)} onInput={autoResizeFindings} placeholder="Record assessment findings, observations, and interview notes..." style={{minHeight:'80px'}} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy resize-none overflow-hidden transition-all"/>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recommendation Attachments <span className="text-gray-400 normal-case font-normal">(Optional)</span></h5>
                      <button onClick={addRecAttachment} className="flex items-center gap-1 text-xs font-medium text-icrcs-navy hover:text-icrcs-navy-light transition-colors"><Plus className="h-3 w-3"/>Add</button>
                    </div>
                    {recAttachments.length===0&&<p className="text-xs text-gray-400">No attachments added yet.</p>}
                    <div className="space-y-2">
                      {recAttachments.map(d=>{
                        const ext=d.name.split('.').pop().toLowerCase();
                        return(
                          <div key={d.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-2 min-w-0">
                              {d.status==='ready'?<><div className="h-7 w-7 rounded-md bg-green-50 flex items-center justify-center shrink-0"><span className="text-[8px] font-bold text-green-600 uppercase">{ext}</span></div><span className="text-xs text-gray-700 truncate">{d.name}</span><span className="text-[10px] text-green-600 shrink-0">Ready</span></>:<><div className="h-7 w-7 rounded-md bg-gray-100 flex items-center justify-center shrink-0"><FileText className="h-3 w-3 text-gray-400"/></div><span className="text-xs text-gray-400">No file selected</span></>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {d.status==='pending'&&(<>
                                <input type="file" accept=".pdf" ref={el=>{if(el)recFileRef.current[d.id]=el;}} onChange={e=>handleRecAttachmentUpload(d.id,e)} className="hidden"/>
                                <button onClick={()=>recFileRef.current[d.id]?.click()} className="px-2 py-1 rounded-lg border border-gray-200 text-[10px] font-medium text-gray-500 hover:bg-white transition-colors">Choose</button>
                              </>)}
                              <button onClick={()=>removeRecAttachment(d.id)} className="p-1 rounded hover:bg-white text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="h-3 w-3"/></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2"><SendHorizontal className="h-4 w-4 text-icrcs-navy"/>Final Recommendation</h4>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button onClick={()=>setRecommendation('approve')} className={`p-3 rounded-xl border-2 text-center transition-all ${recommendation==='approve'?'border-green-500 bg-green-50':'border-gray-100 hover:border-green-300'}`}><CheckCircle className="h-5 w-5 mx-auto mb-1.5 text-green-600"/><span className="text-xs font-semibold text-gray-800">Approve</span></button>
                    <button onClick={()=>setRecommendation('reject')} className={`p-3 rounded-xl border-2 text-center transition-all ${recommendation==='reject'?'border-red-500 bg-red-50':'border-gray-100 hover:border-red-300'}`}><XCircle className="h-5 w-5 mx-auto mb-1.5 text-red-600"/><span className="text-xs font-semibold text-gray-800">Reject</span></button>
                    <button onClick={()=>setRecommendation('escalate')} className={`p-3 rounded-xl border-2 text-center transition-all ${recommendation==='escalate'?'border-amber-500 bg-amber-50':'border-gray-100 hover:border-amber-300'}`}><Building2 className="h-5 w-5 mx-auto mb-1.5 text-amber-600"/><span className="text-xs font-semibold text-gray-800">Escalate</span></button>
                  </div>
                  {recommendation==='approve'&&(
                    <div className="mt-3">
                      <label className="text-sm font-medium text-gray-600">Recommended Immigration Status <span className="text-red-500">*</span></label>
                      <div className="relative mt-1">
                        <select value={finalStatus} onChange={e=>setFinalStatus(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy cursor-pointer transition-all">
                          <option value="">Select recommended status...</option>
                          {finalStatuses.map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="h-3.5 w-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"/>
                      </div>
                    </div>
                  )}
                  {recommendation==='escalate'&&(
                    <div className="mt-3">
                      <label className="text-sm font-medium text-gray-600">Department <span className="text-red-500">*</span></label>
                      <div className="relative mt-1">
                        <select value={escalateTo} onChange={e=>setEscalateTo(e.target.value)} className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy cursor-pointer transition-all">
                          <option value="">Select department...</option>
                          {departmentOptions.map(d=><option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDown className="h-3.5 w-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"/>
                      </div>
                    </div>
                  )}
                  {(recommendation==='reject'||recommendation==='escalate')&&<div className="mt-3"><label className="text-sm font-medium text-gray-600">Reason <span className="text-red-500">*</span></label><textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder={`Enter reason for ${recommendation==='reject'?'rejection':'escalation'}...`} className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy resize-none transition-all"/></div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0 sticky bottom-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-base font-medium text-gray-500 hover:bg-white transition-colors">Cancel</button>
          <div className="flex items-center gap-2">
            {!confirm?(
              <button onClick={()=>setConfirm(true)} className="px-6 py-2.5 rounded-xl bg-icrcs-navy text-white text-base font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm flex items-center gap-1.5"><SendHorizontal className="h-4 w-4"/>Submit Recommendation</button>
            ):(
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-sm text-amber-700 font-medium">Submit this recommendation?</span>
                <button onClick={()=>setConfirm(false)} className="text-sm px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-white transition-colors">Cancel</button>
                <button onClick={submit} className="text-sm px-2 py-1 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors">Confirm</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
