import React,{useState,useEffect}from'react';
import{User,X,FileText,Eye,Download,Copy,ClipboardList,CheckCircle,Building2,Loader2}from'lucide-react';
import ApplicantInfoView from'../../../components/common/ApplicantInfoView';
import{getApplicantReview}from'../../../services/managementService';

const existingDocs=[
  {name:'Passport Copy.pdf',type:'PDF',date:'12-Jun-2026 09:15',size:'1.2 MB'},
  {name:'Birth Certificate.pdf',type:'PDF',date:'12-Jun-2026 09:22',size:'0.8 MB'},
  {name:'Interview Report.pdf',type:'PDF',date:'12-Jun-2026 10:45',size:'2.1 MB'},
  {name:'Assessment Summary.pdf',type:'PDF',date:'12-Jun-2026 11:20',size:'1.5 MB'},
  {name:'Biometric Report.pdf',type:'PDF',date:'12-Jun-2026 12:00',size:'3.4 MB'},
];

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
  const[applicant,setApplicant]=useState(null);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState('');
  useEffect(()=>{
    if(!isOpen||!row?.caseNo)return;
    let cancelled=false;
    setApplicant(null);setError('');setLoading(true);
    getApplicantReview(row.caseNo)
      .then(d=>{if(!cancelled)setApplicant(d);})
      .catch(e=>{if(!cancelled)setError(e.message||'Failed to load applicant data.');})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[isOpen,row?.caseNo]);

  if(!isOpen||!row)return null;

  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white w-full h-full md:w-[85%] md:h-[90vh] lg:w-[88%] lg:max-w-[90rem] lg:h-auto lg:max-h-[85vh] rounded-none md:rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden">
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
            {loading
              ?<div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400"><Loader2 className="h-6 w-6 animate-spin"/><span className="text-sm">Loading applicant details…</span></div>
              :error
                ?<div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2"><X className="h-4 w-4 text-red-600 shrink-0"/><span className="text-sm font-medium text-red-700">{error}</span></div>
                :<ApplicantInfoView data={applicant}/>}

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

              {/* Attachments & Timeline */}
              <div className="lg:w-1/2 space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 p-3 bg-gray-50/60 border-b border-gray-100"><FileText className="h-4 w-4 text-icrcs-navy"/><span className="text-sm font-semibold text-gray-700">Attachments / Evidence</span></div>
                  <div className="p-3 space-y-2">
                    {existingDocs.map((d,i)=>{
                      const ext=d.name.split('.').pop().toLowerCase();
                      return(
                        <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0"><span className="text-[0.5625rem] font-bold text-red-600 uppercase">{ext}</span></div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-gray-700 truncate">{d.name}</div>
                              <div className="text-[0.625rem] text-gray-400">{d.size} · {d.date}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="View"><Eye className="h-3.5 w-3.5"/></button>
                            <button className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors" title="Download"><Download className="h-3.5 w-3.5"/></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 p-3 bg-gray-50/60 border-b border-gray-100"><Building2 className="h-4 w-4 text-icrcs-navy"/><span className="text-sm font-semibold text-gray-700">Processing Timeline</span></div>
                  <div className="p-3 space-y-3">
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center"><div className="h-2 w-2 rounded-full bg-green-500"></div><div className="w-px h-full bg-gray-200 mt-1"></div></div>
                      <div className="pb-3"><div className="text-xs font-semibold text-gray-700">Application Received</div><div className="text-[0.625rem] text-gray-400">{row.dateAssigned} · Registration Officer</div></div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center"><div className="h-2 w-2 rounded-full bg-green-500"></div><div className="w-px h-full bg-gray-200 mt-1"></div></div>
                      <div className="pb-3"><div className="text-xs font-semibold text-gray-700">Biometric Enrollment</div><div className="text-[0.625rem] text-gray-400">{row.dateAssigned} · Biometric Officer</div></div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center"><div className="h-2 w-2 rounded-full bg-green-500"></div><div className="w-px h-full bg-gray-200 mt-1"></div></div>
                      <div className="pb-3"><div className="text-xs font-semibold text-gray-700">Assessment Review</div><div className="text-[0.625rem] text-gray-400">{row.dateAssigned} · {row.assignedOfficer}</div></div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center"><div className="h-2 w-2 rounded-full bg-amber-500"></div></div>
                      <div><div className="text-xs font-semibold text-gray-700">Adjudication Review</div><div className="text-[0.625rem] text-gray-400">Pending · Approver</div></div>
                    </div>
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
