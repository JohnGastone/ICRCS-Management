import React,{useState,useEffect,useCallback}from'react';
import{ClipboardCheck,CheckCircle,XCircle,AlertTriangle,Search,ChevronDown,ArrowUpDown,FolderOpen,Eye,X}from'lucide-react';
import ApproveDecisionWorkspace from'../components/ApproveDecisionWorkspace';
import{getApprovalQueue,decideCase}from'../../../services/managementService';

const isTerminal=s=>['APPROVED','REJECTED','ESCALATED'].includes(s);
const STATUS_LABELS={ASSESSMENT_COMPLETE:'Pending Approval',APPROVED:'Approved',REJECTED:'Rejected',ESCALATED:'Escalated'};
const statusLabel=s=>STATUS_LABELS[s]||s;
const statusBadge=s=>{const m={ASSESSMENT_COMPLETE:'bg-sky-50 text-sky-700 border-sky-200',APPROVED:'bg-green-50 text-green-700 border-green-200',REJECTED:'bg-red-50 text-red-700 border-red-200',ESCALATED:'bg-purple-50 text-purple-700 border-purple-200'};return m[s]||'bg-gray-50 text-gray-600 border-gray-200'};
const PRIORITY_LABELS={HIGH:'High',MEDIUM:'Medium',LOW:'Low'};
const priorityLabel=p=>PRIORITY_LABELS[p]||p;
const priorityBadge=p=>{const m={HIGH:'bg-red-50 text-red-700 border-red-200',MEDIUM:'bg-amber-50 text-amber-700 border-amber-200',LOW:'bg-green-50 text-green-700 border-green-200'};return m[p]||'bg-gray-50 text-gray-600 border-gray-200'};

export default function ApproveDecision(){
const[cases,setCases]=useState([]);
const[loadingQueue,setLoadingQueue]=useState(true);
const[queueError,setQueueError]=useState('');
const[search,setSearch]=useState('');
const[statusFilter,setStatusFilter]=useState('All');
const[priorityFilter,setPriorityFilter]=useState('All');
const[currentPage,setCurrentPage]=useState(1);
const[rowsPerPage,setRowsPerPage]=useState(5);
const[sortField,setSortField]=useState('assignedDate');
const[sortDir,setSortDir]=useState('desc');
const[successMsg,setSuccessMsg]=useState('');
const[workspaceOpen,setWorkspaceOpen]=useState(false);
const[workspaceRow,setWorkspaceRow]=useState(null);

const loadQueue=useCallback(async()=>{
  setLoadingQueue(true);setQueueError('');
  try{
    const data=await getApprovalQueue({page:0,size:100});
    const items=(data?.items||[]).map(c=>({
      caseNo:c.caseNo,
      appNo:c.subjectId,
      fullName:c.fullName,
      nationality:c.nationalityCode,
      gender:c.sexId===1?'Male':'Female',
      dob:c.dateOfBirth,
      status:c.status,
      priority:c.priority,
      assignedDate:c.assignedDate||c.createdAt,
      officer:c.assignedOfficerName||'',
      registrationType:c.registrationType,
    }));
    setCases(items);
  }catch(e){setQueueError(e.message);}
  finally{setLoadingQueue(false);}
},[]);

useEffect(()=>{loadQueue();},[loadQueue]);
const rowsPerPageOptions=[5,20,50,100];

const filtered=cases.filter(a=>{
 const ms=a.caseNo.toLowerCase().includes(search.toLowerCase())||a.appNo.toLowerCase().includes(search.toLowerCase())||a.fullName.toLowerCase().includes(search.toLowerCase());
 return ms&&(statusFilter==='All'||a.status===statusFilter)&&(priorityFilter==='All'||a.priority===priorityFilter);
});

const sorted=[...filtered].sort((a,b)=>{
 let cmp=0;
 if(sortField==='assignedDate')cmp=new Date(a.assignedDate)-new Date(b.assignedDate);
 else if(sortField==='fullName')cmp=a.fullName.localeCompare(b.fullName);
 else if(sortField==='priority'){const o={High:3,Medium:2,Low:1};cmp=(o[a.priority]||0)-(o[b.priority]||0);}
 else if(sortField==='status')cmp=a.status.localeCompare(b.status);
 return sortDir==='asc'?cmp:-cmp;
});

const totalPages=Math.max(1,Math.ceil(sorted.length/rowsPerPage));
const safePage=Math.min(currentPage,totalPages);
const startIndex=(safePage-1)*rowsPerPage;
const paginated=sorted.slice(startIndex,startIndex+rowsPerPage);
const goToPage=p=>setCurrentPage(Math.max(1,Math.min(p,totalPages)));

const openWorkspace=row=>{setWorkspaceRow(row);setWorkspaceOpen(true);};
const closeWorkspace=()=>{setWorkspaceOpen(false);setWorkspaceRow(null);};
const handleSubmit=async(caseNo,formData)=>{
  try{
    await decideCase(caseNo,formData);
    setSuccessMsg(`Decision submitted for case ${caseNo}.`);setTimeout(()=>setSuccessMsg(''),5000);
    loadQueue();
  }catch(e){setQueueError(e.message);}
};

const kpis=[
{label:'Total Assigned',value:cases.length,color:'bg-icrcs-navy',icon:ClipboardCheck},
{label:'Pending Approval',value:cases.filter(a=>a.status==='ASSESSMENT_COMPLETE').length,color:'bg-sky-500',icon:AlertTriangle},
{label:'Approved',value:cases.filter(a=>a.status==='APPROVED').length,color:'bg-green-500',icon:CheckCircle},
{label:'Rejected',value:cases.filter(a=>a.status==='REJECTED').length,color:'bg-red-500',icon:XCircle},
{label:'Escalated',value:cases.filter(a=>a.status==='ESCALATED').length,color:'bg-purple-500',icon:XCircle},
];

return(
<div className="space-y-6 pb-20 lg:pb-0">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div><h1 className="text-2xl font-bold text-gray-900">Approve Decision</h1><p className="text-sm text-gray-500 mt-1">Review assessment recommendations and make final determinations</p></div>
 </div>

 {queueError&&<div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2"><XCircle className="h-4 w-4 text-red-600 shrink-0"/><span className="text-xs font-medium text-red-700">{queueError}</span><button onClick={()=>setQueueError('')} className="ml-auto"><X className="h-3.5 w-3.5 text-red-600"/></button></div>}
 {successMsg&&<div className="p-3 rounded-xl bg-green-50 border border-green-100 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600 shrink-0" strokeWidth={2.5}/><span className="text-xs font-medium text-green-700">{successMsg}</span><button onClick={()=>setSuccessMsg('')} className="ml-auto"><X className="h-3.5 w-3.5 text-green-600"/></button></div>}

 <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
  {kpis.map(k=><div key={k.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3"><div className={`h-10 w-10 rounded-xl ${k.color} flex items-center justify-center shrink-0`}><k.icon className="h-5 w-5 text-white"/></div><div><p className="text-xs text-gray-400 font-medium">{k.label}</p><p className="text-lg font-bold text-gray-800">{k.value}</p></div></div>)}
 </div>

 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
  <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
   <div className="relative flex-1 max-w-sm"><Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="text" value={search} onChange={e=>{setSearch(e.target.value);setCurrentPage(1);}} placeholder="Search case, app no, or name..." className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy transition-all"/></div>
   <div className="flex items-center gap-2">
    <div className="relative"><select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setCurrentPage(1);}} className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 cursor-pointer"><option value="All">All Status</option><option value="ASSESSMENT_COMPLETE">Pending Approval</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="ESCALATED">Escalated</option></select><ChevronDown className="h-3.5 w-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"/></div>
    <div className="relative"><select value={priorityFilter} onChange={e=>{setPriorityFilter(e.target.value);setCurrentPage(1);}} className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 cursor-pointer"><option value="All">All Priority</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select><ChevronDown className="h-3.5 w-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"/></div>
   </div>
  </div>

  <div className="overflow-x-auto">
   <table className="w-full text-left text-sm">
    <thead><tr className="border-b border-gray-100 bg-gray-50/60">
     <th className="px-4 py-3 font-semibold text-gray-500 cursor-pointer" onClick={()=>{setSortField('caseNo');setSortDir(sortField==='caseNo'&&sortDir==='asc'?'desc':'asc');}}><div className="flex items-center gap-1">Case No<ArrowUpDown className="h-3 w-3"/></div></th>
     <th className="px-4 py-3 font-semibold text-gray-500 cursor-pointer" onClick={()=>{setSortField('appNo');setSortDir(sortField==='appNo'&&sortDir==='asc'?'desc':'asc');}}><div className="flex items-center gap-1">App No<ArrowUpDown className="h-3 w-3"/></div></th>
     <th className="px-4 py-3 font-semibold text-gray-500 cursor-pointer" onClick={()=>{setSortField('fullName');setSortDir(sortField==='fullName'&&sortDir==='asc'?'desc':'asc');}}><div className="flex items-center gap-1">Applicant<ArrowUpDown className="h-3 w-3"/></div></th>
     <th className="px-4 py-3 font-semibold text-gray-500 cursor-pointer" onClick={()=>{setSortField('status');setSortDir(sortField==='status'&&sortDir==='asc'?'desc':'asc');}}><div className="flex items-center gap-1">Status<ArrowUpDown className="h-3 w-3"/></div></th>
     <th className="px-4 py-3 font-semibold text-gray-500 cursor-pointer" onClick={()=>{setSortField('priority');setSortDir(sortField==='priority'&&sortDir==='asc'?'desc':'asc');}}><div className="flex items-center gap-1">Priority<ArrowUpDown className="h-3 w-3"/></div></th>
     <th className="px-4 py-3 font-semibold text-gray-500">Assigned</th>
     <th className="px-4 py-3 font-semibold text-gray-500 text-right">Action</th>
    </tr></thead>
    <tbody>
     {paginated.map(row=><tr key={row.caseNo} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
      <td className="px-4 py-3 font-mono text-gray-700">{row.caseNo}</td>
      <td className="px-4 py-3 font-mono text-gray-700">{row.appNo}</td>
      <td className="px-4 py-3"><div className="font-medium text-sm text-gray-800">{row.fullName}</div><div className="text-sm text-gray-400">{row.nationality}</div></td>
      <td className="px-4 py-3"><span className={`text-sm px-2 py-0.5 rounded-full border font-medium ${statusBadge(row.status)}`}>{statusLabel(row.status)}</span></td>
      <td className="px-4 py-3"><span className={`text-sm px-2 py-0.5 rounded-full border font-medium ${priorityBadge(row.priority)}`}>{priorityLabel(row.priority)}</span></td>
      <td className="px-4 py-3 text-sm text-gray-500">{row.assignedDate}</td>
      <td className="px-4 py-3 text-right">{isTerminal(row.status)?(<button onClick={()=>openWorkspace(row)} className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors shadow-sm flex items-center gap-1 ml-auto"><Eye className="h-3 w-3"/>View</button>):(<button onClick={()=>openWorkspace(row)} className="px-2.5 py-1.5 rounded-lg bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm flex items-center gap-1 ml-auto"><FolderOpen className="h-3 w-3"/>Open</button>)}</td>
     </tr>)}
     {paginated.length===0&&<tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No cases found matching your criteria.</td></tr>}
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

 <ApproveDecisionWorkspace row={workspaceRow} isOpen={workspaceOpen} onClose={closeWorkspace} onSubmit={handleSubmit}/>
</div>
);
}
