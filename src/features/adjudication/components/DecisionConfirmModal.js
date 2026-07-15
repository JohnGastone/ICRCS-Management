import React from 'react';
import{AlertTriangle,X,CheckCircle}from'lucide-react';

export default function DecisionConfirmModal({isOpen,onClose,onConfirm,caseNo,decisionType}){
  if(!isOpen)return null;

  const labels={
    approve:{title:'Approve Case',desc:`You are about to approve case ${caseNo}. This action will finalize the case as approved.`,confirm:'Approve',color:'green'},
    reject:{title:'Reject Case',desc:`You are about to reject case ${caseNo}. This action will finalize the case as rejected.`,confirm:'Reject',color:'red'},
    escalate:{title:'Escalate Case',desc:`You are about to escalate case ${caseNo} to another department for further review.`,confirm:'Escalate',color:'amber'},
    refer:{title:'Return to Assessment',desc:`You are about to return case ${caseNo} to the assessment stage for additional review.`,confirm:'Return',color:'sky'},
  };

  const cfg=labels[decisionType]||labels.approve;
  const colorMap={green:'bg-green-500 hover:bg-green-600',red:'bg-red-500 hover:bg-red-600',amber:'bg-amber-500 hover:bg-amber-600',sky:'bg-sky-500 hover:bg-sky-600'};

  return(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-gray-800">Confirm Decision</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><X className="h-4 w-4 text-gray-500"/></button>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0"><AlertTriangle className="h-5 w-5 text-amber-600"/></div>
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">{cfg.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{cfg.desc}</p>
              <p className="text-xs text-gray-400 mt-2 font-mono">Case: {caseNo}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-4">
            <p className="text-xs text-gray-500">This action cannot be undone. Please ensure all reviews and documentation are complete before proceeding.</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-white transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors shadow-sm ${colorMap[cfg.color]}`}><CheckCircle className="h-4 w-4 inline mr-1.5 -mt-0.5"/>{cfg.confirm}</button>
        </div>
      </div>
    </div>
  );
}
