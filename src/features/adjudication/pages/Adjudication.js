import React,{useState}from'react';
import{Lock,ClipboardList,CheckCircle,XCircle,AlertTriangle,RotateCcw,Search,ChevronDown,ArrowUpDown,X}from'lucide-react';
import AdjudicationWorkspace from'../components/AdjudicationWorkspace';

const mockCases=[
{caseNo:'ADJ-2026-000120',appNo:'APP-2026-000145',fullName:'John Michael Doe',matchedName:'Jonathan M. Doe',nationality:'Kenyan',gender:'Male',dob:'10-Jan-1990',passportNo:'A12345678',adjudicationType:'Single Match',matchScore:'98%',priority:'High',riskLevel:'Critical',assignedOfficer:'Grace Temu',status:'Pending Verification',dateAssigned:'12-Jun-2026',isLocked:true},
{caseNo:'ADJ-2026-000119',appNo:'APP-2026-000146',fullName:'Amina Hassan',matchedName:'Amna H. Said',nationality:'Tanzanian',gender:'Female',dob:'15-Mar-1988',passportNo:'T98765432',adjudicationType:'Multiple Matches',matchScore:'96%',priority:'High',riskLevel:'High',assignedOfficer:'James Otieno',status:'Under Review',dateAssigned:'11-Jun-2026',isLocked:true},
{caseNo:'ADJ-2026-000118',appNo:'APP-2026-000147',fullName:'Robert Kimaro',matchedName:'Rob K. Kimaro',nationality:'Kenyan',gender:'Male',dob:'22-Jul-1992',passportNo:'A87654321',adjudicationType:'High-Risk Duplicate',matchScore:'94%',priority:'Medium',riskLevel:'High',assignedOfficer:'Grace Temu',status:'Pending Verification',dateAssigned:'10-Jun-2026',isLocked:true},
{caseNo:'ADJ-2026-000117',appNo:'APP-2026-000148',fullName:'Halima Said',matchedName:'Halima S. Omar',nationality:'Rwandan',gender:'Female',dob:'05-Nov-1985',passportNo:'R11223344',adjudicationType:'Single Match',matchScore:'89%',priority:'Low',riskLevel:'Medium',assignedOfficer:'Juma Kipanya',status:'Completed Review',dateAssigned:'09-Jun-2026',isLocked:true},
{caseNo:'ADJ-2026-000116',appNo:'APP-2026-000149',fullName:'Michael Bwire',matchedName:'Mike Bwire J.',nationality:'Ugandan',gender:'Male',dob:'18-Sep-1995',passportNo:'U55667788',adjudicationType:'Manual Referral',matchScore:'-',priority:'Medium',riskLevel:'Low',assignedOfficer:'James Otieno',status:'Escalated',dateAssigned:'08-Jun-2026',isLocked:true},
{caseNo:'ADJ-2026-000115',appNo:'APP-2026-000150',fullName:'Fatma Juma',matchedName:'Fatuma J. Omar',nationality:'Burundian',gender:'Female',dob:'30-Jan-1990',passportNo:'B99887766',adjudicationType:'Multiple Matches',matchScore:'97%',priority:'High',riskLevel:'Critical',assignedOfficer:'Grace Temu',status:'Under Review',dateAssigned:'07-Jun-2026',isLocked:true},
{caseNo:'ADJ-2026-000114',appNo:'APP-2026-000151',fullName:'Peter Ochieng',matchedName:'P. Ochieng Jr.',nationality:'Kenyan',gender:'Male',dob:'12-Apr-1987',passportNo:'A33445566',adjudicationType:'High-Risk Duplicate',matchScore:'92%',priority:'Medium',riskLevel:'High',assignedOfficer:'Juma Kipanya',status:'Pending Verification',dateAssigned:'06-Jun-2026',isLocked:true},
{caseNo:'ADJ-2026-000113',appNo:'APP-2026-000152',fullName:'Joyce Mwende',matchedName:'Joy M. Kitenge',nationality:'Tanzanian',gender:'Female',dob:'25-Dec-1993',passportNo:'T77889900',adjudicationType:'Single Match',matchScore:'85%',priority:'Low',riskLevel:'Medium',assignedOfficer:'Grace Temu',status:'Completed Review',dateAssigned:'05-Jun-2026',isLocked:true},
{caseNo:'ADJ-2026-000112',appNo:'APP-2026-000153',fullName:'Daniel Ndayisaba',matchedName:'D. Ndayisaba',nationality:'Burundian',gender:'Male',dob:'08-Jun-1991',passportNo:'B22334455',adjudicationType:'Manual Referral',matchScore:'-',priority:'High',riskLevel:'Low',assignedOfficer:'James Otieno',status:'Under Review',dateAssigned:'04-Jun-2026',isLocked:true},
{caseNo:'ADJ-2026-000111',appNo:'APP-2026-000154',fullName:'Grace Akello',matchedName:'Grace A. Lwanga',nationality:'Ugandan',gender:'Female',dob:'14-Feb-1989',passportNo:'U66778899',adjudicationType:'Multiple Matches',matchScore:'95%',priority:'Medium',riskLevel:'High',assignedOfficer:'Juma Kipanya',status:'Escalated',dateAssigned:'03-Jun-2026',isLocked:true},
{caseNo:'ADJ-2026-000110',appNo:'APP-2026-000155',fullName:'Samuel Kagame',matchedName:'Sam K. Rugema',nationality:'Rwandan',gender:'Male',dob:'19-Oct-1994',passportNo:'R44556677',adjudicationType:'Single Match',matchScore:'82%',priority:'Low',riskLevel:'Low',assignedOfficer:'Grace Temu',status:'Pending Verification',dateAssigned:'02-Jun-2026',isLocked:true},
{caseNo:'ADJ-2026-000109',appNo:'APP-2026-000156',fullName:'Esther Wanjiku',matchedName:'Esther W. Muthoni',nationality:'Kenyan',gender:'Female',dob:'03-May-1986',passportNo:'A55667788',adjudicationType:'High-Risk Duplicate',matchScore:'99%',priority:'High',riskLevel:'Critical',assignedOfficer:'James Otieno',status:'Under Review',dateAssigned:'01-Jun-2026',isLocked:true},
];

const statusBadge=s=>{const m={'Pending Verification':'bg-sky-50 text-sky-700 border-sky-200','Under Review':'bg-amber-50 text-amber-700 border-amber-200','Completed Review':'bg-green-50 text-green-700 border-green-200','Escalated':'bg-red-50 text-red-700 border-red-200'};return m[s]||'bg-gray-50 text-gray-600 border-gray-200'};

export default function Adjudication(){
const[cases,setCases]=useState(mockCases);
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

const filtered=cases.filter(a=>{
 if(!a.isLocked)return false;
 const ms=a.caseNo.toLowerCase().includes(search.toLowerCase())||a.appNo.toLowerCase().includes(search.toLowerCase())||a.fullName.toLowerCase().includes(search.toLowerCase())||a.adjudicationType.toLowerCase().includes(search.toLowerCase());
 return ms&&(statusFilter==='All'||a.status===statusFilter);
});

const sorted=[...filtered].sort((a,b)=>{
 let cmp=0;
 if(sortField==='dateAssigned')cmp=new Date(a.dateAssigned)-new Date(b.dateAssigned);
 else if(sortField==='fullName')cmp=a.fullName.localeCompare(b.fullName);
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
const handleSubmit=(caseNo,newStatus)=>{setCases(p=>p.map(a=>a.caseNo===caseNo?{...a,status:newStatus}:a));setSuccessMsg(`Case ${caseNo} updated to ${newStatus}.`);setTimeout(()=>setSuccessMsg(''),5000);};

const kpis=[
{label:'Match Cases',value:cases.length,color:'bg-icrcs-navy',icon:ClipboardList},
{label:'Pending Review',value:cases.filter(a=>a.status==='Pending Verification').length,color:'bg-sky-500',icon:RotateCcw},
{label:'Critical Risk',value:cases.filter(a=>a.riskLevel==='Critical').length,color:'bg-red-500',icon:AlertTriangle},
{label:'Resolved',value:cases.filter(a=>a.status==='Completed Review').length,color:'bg-green-500',icon:CheckCircle},
{label:'Escalated',value:cases.filter(a=>a.status==='Escalated').length,color:'bg-orange-500',icon:XCircle},
];

return(
<div className="space-y-6 pb-20 lg:pb-0">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div><h1 className="text-2xl font-bold text-gray-900">Biometric Match Resolution Center</h1><p className="text-sm text-gray-500 mt-1">Investigate and resolve biometric duplicate matches identified during fingerprint verification</p></div>
  <div className="flex items-center gap-2"><span className="px-3 py-1.5 rounded-lg bg-icrcs-navy/10 text-icrcs-navy text-xs font-semibold border border-icrcs-navy/20">Adjudication Module</span></div>
 </div>

 {successMsg&&<div className="p-3 rounded-xl bg-green-50 border border-green-100 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600 shrink-0" strokeWidth={2.5}/><span className="text-xs font-medium text-green-700">{successMsg}</span><button onClick={()=>setSuccessMsg('')} className="ml-auto"><X className="h-3.5 w-3.5 text-green-600"/></button></div>}

 <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
  {kpis.map(k=><div key={k.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all"><div className={`h-10 w-10 rounded-xl ${k.color} flex items-center justify-center shrink-0`}><k.icon className="h-5 w-5 text-white"/></div><div><p className="text-xs text-gray-400 font-medium">{k.label}</p><p className="text-lg font-bold text-gray-800">{k.value}</p></div></div>)}
 </div>

 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
  <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
   <div className="relative flex-1 max-w-sm"><Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="text" value={search} onChange={e=>{setSearch(e.target.value);setCurrentPage(1);}} placeholder="Search case, app no, name or type..." className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 focus:border-icrcs-navy transition-all"/></div>
   <div className="flex items-center gap-2">
    <div className="relative"><select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setCurrentPage(1);}} className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-icrcs-navy/20 cursor-pointer"><option value="All">All Status</option><option value="Pending Verification">Pending Verification</option><option value="Under Review">Under Review</option><option value="Completed Review">Completed Review</option><option value="Escalated">Escalated</option></select><ChevronDown className="h-3.5 w-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"/></div>
   </div>
  </div>

  <div className="overflow-x-auto">
   <table className="w-full text-left text-sm">
    <thead><tr className="border-b border-gray-100 bg-gray-50/60">
     <th className="px-4 py-3 font-semibold text-gray-500 cursor-pointer" onClick={()=>{setSortField('caseNo');setSortDir(sortField==='caseNo'&&sortDir==='asc'?'desc':'asc');}}><div className="flex items-center gap-1">Case No<ArrowUpDown className="h-3 w-3"/></div></th>
     <th className="px-4 py-3 font-semibold text-gray-500">App No</th>
     <th className="px-4 py-3 font-semibold text-gray-500 cursor-pointer" onClick={()=>{setSortField('fullName');setSortDir(sortField==='fullName'&&sortDir==='asc'?'desc':'asc');}}><div className="flex items-center gap-1">Applicant<ArrowUpDown className="h-3 w-3"/></div></th>
     <th className="px-4 py-3 font-semibold text-gray-500">Matched Name</th>
     <th className="px-4 py-3 font-semibold text-gray-500">Match Type</th>
     <th className="px-4 py-3 font-semibold text-gray-500">Match Score</th>
     <th className="px-4 py-3 font-semibold text-gray-500 cursor-pointer" onClick={()=>{setSortField('status');setSortDir(sortField==='status'&&sortDir==='asc'?'desc':'asc');}}><div className="flex items-center gap-1">Status<ArrowUpDown className="h-3 w-3"/></div></th>
     <th className="px-4 py-3 font-semibold text-gray-500">Date Assigned</th>
     <th className="px-4 py-3 font-semibold text-gray-500 text-right">Actions</th>
    </tr></thead>
    <tbody>
     {paginated.map(row=><tr key={row.caseNo} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
      <td className="px-4 py-3 font-mono text-gray-700">{row.caseNo}</td>
      <td className="px-4 py-3 font-mono text-gray-700">{row.appNo}</td>
      <td className="px-4 py-3"><div className="font-medium text-gray-800">{row.fullName}</div><div className="text-[10px] text-gray-400">{row.nationality}</div></td>
      <td className="px-4 py-3"><div className="font-medium text-gray-800">{row.matchedName}</div></td>
      <td className="px-4 py-3 text-gray-700 text-xs">{row.adjudicationType}</td>
      <td className="px-4 py-3"><span className="text-xs font-mono font-semibold text-icrcs-navy">{row.matchScore}</span></td>
      <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusBadge(row.status)}`}>{row.status}</span></td>
      <td className="px-4 py-3 text-gray-500 text-xs">{row.dateAssigned}</td>
      <td className="px-4 py-3 text-right">
       <div className="flex items-center justify-end">
        <button onClick={()=>openWorkspace(row)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-icrcs-navy text-white hover:bg-icrcs-navy-light transition-colors shadow-sm text-xs font-medium" title="Open Adjudication Workspace"><Lock className="h-3.5 w-3.5"/>Unlock</button>
       </div>
      </td>
     </tr>)}
     {paginated.length===0&&<tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">No biometric match cases found matching your criteria.</td></tr>}
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
