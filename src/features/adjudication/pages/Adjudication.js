import React,{useState,useEffect,useCallback}from'react';
import{Lock,ClipboardList,CheckCircle,XCircle,AlertTriangle,RotateCcw,Search,ChevronDown,ArrowUpDown,X}from'lucide-react';
import AdjudicationWorkspace from'../components/AdjudicationWorkspace';
import{getAdjudicationQueue}from'../../../services/managementService';

// Real backend statuses are UPPER_SNAKE_CASE (see BiometricMatchResult) - map
// to display labels rather than assuming the raw value is already Title Case.
const STATUS_LABELS={PENDING_VERIFICATION:'Pending Verification',UNDER_REVIEW:'Under Review',COMPLETED_REVIEW:'Completed Review',ESCALATED:'Escalated'};
const statusLabel=s=>STATUS_LABELS[s]||s;
const statusBadge=s=>{const m={PENDING_VERIFICATION:'bg-sky-50 text-sky-700 border-sky-200',UNDER_REVIEW:'bg-amber-50 text-amber-700 border-amber-200',COMPLETED_REVIEW:'bg-green-50 text-green-700 border-green-200',ESCALATED:'bg-red-50 text-red-700 border-red-200'};return m[s]||'bg-gray-50 text-gray-600 border-gray-200'};
const genderLabel=sexId=>sexId===1?'Male':sexId===2?'Female':'—';

export default function Adjudication(){
const[cases,setCases]=useState([]);
const[loadingQueue,setLoadingQueue]=useState(true);
const[queueError,setQueueError]=useState('');
const[search,setSearch]=useState('');
const[statusFilter,setStatusFilter]=useState('All');
const[currentPage,setCurrentPage]=useState(1);
const[rowsPerPage,setRowsPerPage]=useState(5);
const[sortField,setSortField]=useState('dateAssigned');
const[sortDir,setSortDir]=useState('desc');
const[successMsg,setSuccessMsg]=useState('');
const[workspaceOpen,setWorkspaceOpen]=useState(false);
const[workspaceRow,setWorkspaceRow]=useState(null);
const rowsPerPageOptions=[5,20,50,100];

const loadQueue=useCallback(async()=>{
  setLoadingQueue(true);setQueueError('');
  try{
    const data=await getAdjudicationQueue({page:0,size:100});
    const items=(data?.items||[]).map(m=>({
      id:m.id,
      caseNo:m.caseNo,
      appNo:m.subjectId,
      fullName:m.fullName,
      matchedName:m.matchedFullName,
      nationality:m.nationalityCode,
      gender:genderLabel(m.sexId),
      dob:m.dateOfBirth,
      adjudicationType:m.matchType,
      matchScore:`${Math.round(m.bestMatchScore)}%`,
      riskLevel:m.riskLevel,
      assignedOfficer:m.assignedOfficerName||'Unassigned',
      status:m.status,
      dateAssigned:m.createdAt,
    }));
    setCases(items);
  }catch(e){setQueueError(e.message);}
  finally{setLoadingQueue(false);}
},[]);

useEffect(()=>{loadQueue();},[loadQueue]);

const filtered=cases.filter(a=>{
 const ms=a.caseNo.toLowerCase().includes(search.toLowerCase())||a.appNo.toLowerCase().includes(search.toLowerCase())||(a.fullName||'').toLowerCase().includes(search.toLowerCase())||(a.adjudicationType||'').toLowerCase().includes(search.toLowerCase());
 return ms&&(statusFilter==='All'||a.status===statusFilter);
});

const sorted=[...filtered].sort((a,b)=>{
 let cmp=0;
 if(sortField==='dateAssigned')cmp=new Date(a.dateAssigned)-new Date(b.dateAssigned);
 else if(sortField==='fullName')cmp=(a.fullName||'').localeCompare(b.fullName||'');
 else if(sortField==='status')cmp=a.status.localeCompare(b.status);
 else if(sortField==='caseNo')cmp=a.caseNo.localeCompare(b.caseNo);
 return sortDir==='asc'?cmp:-cmp;
});

const totalPages=Math.max(1,Math.ceil(sorted.length/rowsPerPage));
const safePage=Math.min(currentPage,totalPages);
const startIndex=(safePage-1)*rowsPerPage;
const paginated=sorted.slice(startIndex,startIndex+rowsPerPage);
const goToPage=p=>setCurrentPage(Math.max(1,Math.min(p,totalPages)));

const openWorkspace=row=>{setWorkspaceRow(row);setWorkspaceOpen(true);};
const closeWorkspace=()=>{setWorkspaceOpen(false);setWorkspaceRow(null);};
const handleSubmit=()=>{setSuccessMsg(`Case ${workspaceRow?.caseNo} adjudication decision recorded.`);setTimeout(()=>setSuccessMsg(''),5000);loadQueue();};

const kpis=[
{label:'Match Cases',value:cases.length,color:'bg-icrcs-navy',icon:ClipboardList},
{label:'Pending Review',value:cases.filter(a=>a.status==='PENDING_VERIFICATION').length,color:'bg-sky-500',icon:RotateCcw},
{label:'Critical Risk',value:cases.filter(a=>a.riskLevel==='Critical').length,color:'bg-red-500',icon:AlertTriangle},
{label:'Resolved',value:cases.filter(a=>a.status==='COMPLETED_REVIEW').length,color:'bg-green-500',icon:CheckCircle},
{label:'Escalated',value:cases.filter(a=>a.status==='ESCALATED').length,color:'bg-orange-500',icon:XCircle},
];

return(
<div className="space-y-6 pb-20 lg:pb-0">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div><h1 className="text-2xl font-bold text-gray-900">Biometric Match Resolution Center</h1><p className="text-sm text-gray-500 mt-1">Investigate and resolve biometric duplicate matches identified during fingerprint verification</p></div>
  <div className="flex items-center gap-2"><span className="px-3 py-1.5 rounded-lg bg-icrcs-navy/10 text-icrcs-navy text-xs font-semibold border border-icrcs-navy/20">Adjudication Module</span></div>
 </div>

 {queueError&&<div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2"><XCircle className="h-4 w-4 text-red-600 shrink-0"/><span className="text-xs font-medium text-red-700">{queueError}</span><button onClick={()=>setQueueError('')} className="ml-auto"><X className="h-3.5 w-3.5 text-red-600"/></button></div>}
 {successMsg&&<div className="p-3 rounded-xl bg-green-50 border border-green-100 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600 shrink-0" strokeWidth={2.5}/><span className="text-xs font-medium text-green-700">{successMsg}</span><button onClick={()=>setSuccessMsg('')} className="ml-auto"><X className="h-3.5 w-3.5 text-green-600"/></button></div>}

 <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
  {kpis.map(k=><div key={k.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all"><div className={`h-10 w-10 rounded-xl ${k.color} flex items-center justify-center shrink-0`}><k.icon className="h-5 w-5 text-white"/></div><div><p className="text-xs text-gray-400 font-medium">{k.label}</p><p className="text-lg font-bold text-gray-800">{k.value}</p></div></div>)}
 </div>

 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
  <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
   <div className="relative flex-1 max-w-sm"><Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="text" value={search} onChange={e=>{setSearch(e.target.value);setCurrentPage(1);}} placeholder="Search case, app no, name or type..." className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy transition-all"/></div>
   <div className="flex items-center gap-2">
    <div className="relative"><select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setCurrentPage(1);}} className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 cursor-pointer"><option value="All">All Status</option><option value="PENDING_VERIFICATION">Pending Verification</option><option value="UNDER_REVIEW">Under Review</option><option value="COMPLETED_REVIEW">Completed Review</option><option value="ESCALATED">Escalated</option></select><ChevronDown className="h-3.5 w-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"/></div>
   </div>
  </div>

  <div className="overflow-x-auto">
   <table className="w-full text-left text-sm">
    <thead><tr className="border-b border-gray-100 bg-gray-50/60">
     <th className="px-4 py-3 font-semibold text-gray-500 cursor-pointer" onClick={()=>{setSortField('caseNo');setSortDir(sortField==='caseNo'&&sortDir==='asc'?'desc':'asc');}}><div className="flex items-center gap-1">Case No<ArrowUpDown className="h-3 w-3"/></div></th>
     <th className="px-4 py-3 font-semibold text-gray-500">Subject Id</th>
     <th className="px-4 py-3 font-semibold text-gray-500 cursor-pointer" onClick={()=>{setSortField('fullName');setSortDir(sortField==='fullName'&&sortDir==='asc'?'desc':'asc');}}><div className="flex items-center gap-1">Applicant<ArrowUpDown className="h-3 w-3"/></div></th>
     <th className="px-4 py-3 font-semibold text-gray-500">Matched Name</th>
     <th className="px-4 py-3 font-semibold text-gray-500">Match Type</th>
     <th className="px-4 py-3 font-semibold text-gray-500">Match Score</th>
     <th className="px-4 py-3 font-semibold text-gray-500 cursor-pointer" onClick={()=>{setSortField('status');setSortDir(sortField==='status'&&sortDir==='asc'?'desc':'asc');}}><div className="flex items-center gap-1">Status<ArrowUpDown className="h-3 w-3"/></div></th>
     <th className="px-4 py-3 font-semibold text-gray-500">Date Assigned</th>
     <th className="px-4 py-3 font-semibold text-gray-500 text-right">Actions</th>
    </tr></thead>
    <tbody>
     {loadingQueue&&<tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">Loading…</td></tr>}
     {!loadingQueue&&paginated.map(row=><tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
      <td className="px-4 py-3 font-mono text-gray-700">{row.caseNo}</td>
      <td className="px-4 py-3 font-mono text-gray-700">{row.appNo}</td>
      <td className="px-4 py-3"><div className="font-medium text-gray-800">{row.fullName||'—'}</div><div className="text-[10px] text-gray-400">{row.nationality}</div></td>
      <td className="px-4 py-3"><div className="font-medium text-gray-800">{row.matchedName||'—'}</div></td>
      <td className="px-4 py-3 text-gray-700 text-xs">{row.adjudicationType}</td>
      <td className="px-4 py-3"><span className="text-xs font-mono font-semibold text-icrcs-navy">{row.matchScore}</span></td>
      <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusBadge(row.status)}`}>{statusLabel(row.status)}</span></td>
      <td className="px-4 py-3 text-gray-500 text-xs">{row.dateAssigned}</td>
      <td className="px-4 py-3 text-right">
       <div className="flex items-center justify-end">
        <button onClick={()=>openWorkspace(row)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-icrcs-navy text-white hover:bg-icrcs-navy-light transition-colors shadow-sm text-xs font-medium" title="Open Adjudication Workspace"><Lock className="h-3.5 w-3.5"/>Unlock</button>
       </div>
      </td>
     </tr>)}
     {!loadingQueue&&paginated.length===0&&<tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">No biometric match cases found matching your criteria.</td></tr>}
    </tbody>
   </table>
  </div>

  <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
   <div className="flex items-center gap-2 text-[11px] text-gray-500">
    <span>Rows:</span>
    <div className="relative"><select value={rowsPerPage} onChange={e=>{setRowsPerPage(Number(e.target.value));setCurrentPage(1);}} className="appearance-none pl-2 pr-6 py-1 rounded-lg border border-gray-200 bg-white text-[11px] font-medium text-gray-600 focus:outline-none cursor-pointer">{rowsPerPageOptions.map(o=><option key={o} value={o}>{o}</option>)}</select><ChevronDown className="h-3 w-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"/></div>
    <span>Showing {sorted.length>0?startIndex+1:0} to {Math.min(startIndex+rowsPerPage,sorted.length)} of {sorted.length}</span>
   </div>
   <div className="flex items-center gap-1.5">
    <button onClick={()=>goToPage(1)} disabled={safePage<=1} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40">First</button>
    <button onClick={()=>goToPage(safePage-1)} disabled={safePage<=1} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40">Prev</button>
    <span className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[11px] font-semibold text-gray-700">{safePage}/{totalPages}</span>
    <button onClick={()=>goToPage(safePage+1)} disabled={safePage>=totalPages} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40">Next</button>
    <button onClick={()=>goToPage(totalPages)} disabled={safePage>=totalPages} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40">Last</button>
   </div>
  </div>
 </div>

 <AdjudicationWorkspace row={workspaceRow} isOpen={workspaceOpen} onClose={closeWorkspace} onSubmit={handleSubmit}/>
</div>
);
}
