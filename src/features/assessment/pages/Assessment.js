import React,{useState,useEffect,useCallback}from'react';
import{ClipboardCheck,CheckCircle,XCircle,AlertTriangle,ClipboardList,Search,ChevronDown,ArrowUpDown,FolderOpen,RotateCcw,X}from'lucide-react';
import AssessmentWorkspace from'../components/AssessmentWorkspace';
import{getAssessmentQueue,assessCase}from'../../../services/managementService';

const mockAssessments=[
{caseNo:'ICRCS-ASM-2026-000120',appNo:'APP-2026-000145',fullName:'John Michael Doe',nationality:'Kenyan',gender:'Male',dob:'10-Jan-1990',passportNo:'A12345678',status:'Under Assessment',priority:'High',assignedDate:'12-Jun-2026',officer:'Grace Temu',documents:['passport_copy.pdf','birth_cert.jpg']},
{caseNo:'ICRCS-ASM-2026-000119',appNo:'APP-2026-000146',fullName:'Amina Hassan',nationality:'Tanzanian',gender:'Female',dob:'15-Mar-1988',passportNo:'T98765432',status:'Pending Assessment',priority:'Medium',assignedDate:'11-Jun-2026',officer:'James Otieno',documents:['passport.pdf']},
{caseNo:'ICRCS-ASM-2026-000118',appNo:'APP-2026-000147',fullName:'Robert Kimaro',nationality:'Kenyan',gender:'Male',dob:'22-Jul-1992',passportNo:'A87654321',status:'In Progress',priority:'High',assignedDate:'10-Jun-2026',officer:'Grace Temu',documents:['id_card.jpg','utility_bill.pdf']},
{caseNo:'ICRCS-ASM-2026-000117',appNo:'APP-2026-000148',fullName:'Halima Said',nationality:'Rwandan',gender:'Female',dob:'05-Nov-1985',passportNo:'R11223344',status:'Under Assessment',priority:'Low',assignedDate:'09-Jun-2026',officer:'Juma Kipanya',documents:['passport.pdf','marriage_cert.jpg']},
{caseNo:'ICRCS-ASM-2026-000116',appNo:'APP-2026-000149',fullName:'Michael Bwire',nationality:'Ugandan',gender:'Male',dob:'18-Sep-1995',passportNo:'U55667788',status:'Completed',priority:'Medium',assignedDate:'08-Jun-2026',officer:'James Otieno',documents:['passport.pdf']},
{caseNo:'ICRCS-ASM-2026-000115',appNo:'APP-2026-000150',fullName:'Fatma Juma',nationality:'Burundian',gender:'Female',dob:'30-Jan-1990',passportNo:'B99887766',status:'Escalated',priority:'High',assignedDate:'07-Jun-2026',officer:'Grace Temu',documents:['passport.jpg','ref_letter.pdf']},
{caseNo:'ICRCS-ASM-2026-000114',appNo:'APP-2026-000151',fullName:'Peter Ochieng',nationality:'Kenyan',gender:'Male',dob:'12-Apr-1987',passportNo:'A33445566',status:'Pending Assessment',priority:'Medium',assignedDate:'06-Jun-2026',officer:'Juma Kipanya',documents:['passport.pdf']},
{caseNo:'ICRCS-ASM-2026-000113',appNo:'APP-2026-000152',fullName:'Joyce Mwende',nationality:'Tanzanian',gender:'Female',dob:'25-Dec-1993',passportNo:'T77889900',status:'In Progress',priority:'Low',assignedDate:'05-Jun-2026',officer:'Grace Temu',documents:['id_card.jpg']},
{caseNo:'ICRCS-ASM-2026-000112',appNo:'APP-2026-000153',fullName:'Daniel Ndayisaba',nationality:'Burundian',gender:'Male',dob:'08-Jun-1991',passportNo:'B22334455',status:'Under Assessment',priority:'High',assignedDate:'04-Jun-2026',officer:'James Otieno',documents:['passport.pdf','employment_letter.pdf']},
{caseNo:'ICRCS-ASM-2026-000111',appNo:'APP-2026-000154',fullName:'Grace Akello',nationality:'Ugandan',gender:'Female',dob:'14-Feb-1989',passportNo:'U66778899',status:'Completed',priority:'Medium',assignedDate:'03-Jun-2026',officer:'Juma Kipanya',documents:['passport.jpg']},
{caseNo:'ICRCS-ASM-2026-000110',appNo:'APP-2026-000155',fullName:'Samuel Kagame',nationality:'Rwandan',gender:'Male',dob:'19-Oct-1994',passportNo:'R44556677',status:'Pending Assessment',priority:'Low',assignedDate:'02-Jun-2026',officer:'Grace Temu',documents:['passport.pdf']},
{caseNo:'ICRCS-ASM-2026-000109',appNo:'APP-2026-000156',fullName:'Esther Wanjiku',nationality:'Kenyan',gender:'Female',dob:'03-May-1986',passportNo:'A55667788',status:'Under Assessment',priority:'High',assignedDate:'01-Jun-2026',officer:'James Otieno',documents:['passport.pdf','medical_cert.jpg']},
];

const statusBadge=s=>{const m={'Pending Assessment':'bg-sky-50 text-sky-700 border-sky-200','Under Assessment':'bg-amber-50 text-amber-700 border-amber-200','In Progress':'bg-blue-50 text-blue-700 border-blue-200','Completed':'bg-green-50 text-green-700 border-green-200','Escalated':'bg-red-50 text-red-700 border-red-200'};return m[s]||'bg-gray-50 text-gray-600 border-gray-200'};
const priorityBadge=p=>{const m={'High':'bg-red-50 text-red-700 border-red-200','Medium':'bg-amber-50 text-amber-700 border-amber-200','Low':'bg-green-50 text-green-700 border-green-200'};return m[p]||'bg-gray-50 text-gray-600 border-gray-200'};

export default function Assessment(){
const[assessments,setAssessments]=useState([]);
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
    const data=await getAssessmentQueue({page:0,size:100});
    const items=(data?.items||[]).map(c=>({
      caseNo:c.caseNo,
      appNo:c.subjectId,
      fullName:c.fullName,
      nationality:c.nationalityCode,
      gender:c.sexId===1?'Male':'Female',
      dob:c.dateOfBirth,
      status:c.status,
      priority:c.priority,
      assignedDate:c.assignedDate,
      officer:c.assignedOfficerName||'',
      registrationType:c.registrationType,
    }));
    setAssessments(items);
  }catch(e){setQueueError(e.message);}
  finally{setLoadingQueue(false);}
},[]);

useEffect(()=>{loadQueue();},[loadQueue]);
const rowsPerPageOptions=[5,20,50,100];

const filtered=assessments.filter(a=>{
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
    await assessCase(caseNo,formData);
    setSuccessMsg(`Case ${caseNo} assessment submitted.`);setTimeout(()=>setSuccessMsg(''),5000);
    loadQueue();
  }catch(e){setSuccessMsg('');setQueueError(e.message);}
};

const kpis=[
{label:'Total Assigned',value:assessments.length,color:'bg-icrcs-navy',icon:ClipboardList},
{label:'Pending',value:assessments.filter(a=>a.status==='Pending Assessment').length,color:'bg-sky-500',icon:AlertTriangle},
{label:'In Progress',value:assessments.filter(a=>a.status==='In Progress'||a.status==='Under Assessment').length,color:'bg-blue-500',icon:RotateCcw},
{label:'Completed',value:assessments.filter(a=>a.status==='Completed').length,color:'bg-green-500',icon:CheckCircle},
{label:'Escalated',value:assessments.filter(a=>a.status==='Escalated').length,color:'bg-red-500',icon:XCircle},
];

return(
<div className="space-y-6 pb-20 lg:pb-0">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div><h1 className="text-2xl font-bold text-gray-900">Assessments</h1><p className="text-sm text-gray-500 mt-1">Review cases, conduct assessments, and submit recommendations</p></div>
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
    <div className="relative"><select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setCurrentPage(1);}} className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 cursor-pointer"><option value="All">All Status</option><option value="Pending Assessment">Pending</option><option value="Under Assessment">Under Assessment</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option><option value="Escalated">Escalated</option></select><ChevronDown className="h-3.5 w-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"/></div>
    <div className="relative"><select value={priorityFilter} onChange={e=>{setPriorityFilter(e.target.value);setCurrentPage(1);}} className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 cursor-pointer"><option value="All">All Priority</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select><ChevronDown className="h-3.5 w-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"/></div>
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
      <td className="px-4 py-3"><span className={`text-sm px-2 py-0.5 rounded-full border font-medium ${statusBadge(row.status)}`}>{row.status}</span></td>
      <td className="px-4 py-3"><span className={`text-sm px-2 py-0.5 rounded-full border font-medium ${priorityBadge(row.priority)}`}>{row.priority}</span></td>
      <td className="px-4 py-3 text-sm text-gray-500">{row.assignedDate}</td>
      <td className="px-4 py-3 text-right"><button onClick={()=>openWorkspace(row)} className="px-2.5 py-1.5 rounded-lg bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm flex items-center gap-1 ml-auto"><FolderOpen className="h-3 w-3"/>Open</button></td>
     </tr>)}
     {paginated.length===0&&<tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No assessments found matching your criteria.</td></tr>}
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

 <AssessmentWorkspace row={workspaceRow} isOpen={workspaceOpen} onClose={closeWorkspace} onSubmit={handleSubmit}/>
</div>
);
}
