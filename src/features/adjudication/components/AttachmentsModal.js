import React,{useState,useRef}from'react';
import{Paperclip,X,FileText,Eye,Download,Trash2,Plus,Upload,AlertTriangle}from'lucide-react';

const initialDocs=[
  {id:1,name:'Passport Copy.pdf',type:'PDF',date:'12-Jun-2026 09:15',size:'1.2 MB',uploader:'G. Temu'},
  {id:2,name:'Birth Certificate.pdf',type:'PDF',date:'12-Jun-2026 09:22',size:'0.8 MB',uploader:'G. Temu'},
  {id:3,name:'Interview Report.pdf',type:'PDF',date:'12-Jun-2026 10:45',size:'2.1 MB',uploader:'J. Otieno'},
  {id:4,name:'Assessment Summary.pdf',type:'PDF',date:'12-Jun-2026 11:20',size:'1.5 MB',uploader:'G. Temu'},
  {id:5,name:'Biometric Report.pdf',type:'PDF',date:'12-Jun-2026 12:00',size:'3.4 MB',uploader:'J. Kipanya'},
];

export default function AttachmentsModal({row,isOpen,onClose}){
  const[docs,setDocs]=useState(initialDocs);
  const[uploadQueue,setUploadQueue]=useState([]);
  const[previewDoc,setPreviewDoc]=useState(null);
  const[toast,setToast]=useState('');
  const fileRef=useRef(null);

  if(!isOpen||!row)return null;

  const handleUpload=e=>{
    const files=Array.from(e.target.files);
    files.forEach(f=>{
      if(f.type!=='application/pdf'){setToast(`${f.name} is not a PDF.`);setTimeout(()=>setToast(''),3000);return;}
      if(f.size>5*1024*1024){setToast(`${f.name} exceeds 5 MB.`);setTimeout(()=>setToast(''),3000);return;}
      const r=new FileReader();
      r.onload=ev=>{
        const ts=new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
        setUploadQueue(q=>[...q,{id:Date.now()+Math.random(),name:f.name,type:'PDF',date:ts,size:(f.size/1024/1024).toFixed(1)+' MB',preview:ev.target.result,status:'ready'}]);
      };
      r.readAsDataURL(f);
    });
    e.target.value='';
  };

  const removeQueued=id=>{setUploadQueue(q=>q.filter(x=>x.id!==id));if(previewDoc?.id===id)setPreviewDoc(null);};
  const removeExisting=id=>{setDocs(d=>d.filter(x=>x.id!==id));};

  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white w-full h-full md:w-[90%] md:h-[90vh] lg:w-[80%] lg:max-w-[1200px] lg:h-auto lg:max-h-[85vh] rounded-none md:rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-icrcs-navy/10 flex items-center justify-center"><Paperclip className="h-5 w-5 text-icrcs-navy"/></div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Attachments & Evidence</h2>
              <p className="text-sm text-gray-400 font-mono">{row.caseNo} / {row.appNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-icrcs-navy/10 text-icrcs-navy border-icrcs-navy/30">{row.adjudicationType}</span>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors ml-2"><X className="h-4 w-4 text-gray-500"/></button>
          </div>
        </div>

        {/* Toast */}
        {toast&&<div className="mx-5 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-2 shrink-0"><AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" strokeWidth={2.5}/><span className="text-sm font-medium text-amber-700">{toast}</span><button onClick={()=>setToast('')} className="ml-auto"><X className="h-3.5 w-3.5 text-amber-600"/></button></div>}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Left — Document List */}
            <div className="lg:w-[55%] space-y-4">
              <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-gray-800">Existing Documents ({docs.length})</h3><span className="text-xs text-gray-400">Read-only view. Download or preview only.</span></div>
              <div className="space-y-2">
                {docs.map(d=>{
                  const ext=d.name.split('.').pop().toLowerCase();
                  return(
                    <div key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0"><span className="text-[0.5625rem] font-bold text-red-600 uppercase">{ext}</span></div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-gray-700 truncate">{d.name}</div>
                          <div className="text-[0.625rem] text-gray-400">{d.size} · {d.date} · {d.uploader}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={()=>setPreviewDoc(d)} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors"><Eye className="h-3.5 w-3.5"/></button>
                        <button className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors"><Download className="h-3.5 w-3.5"/></button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {uploadQueue.length>0&&(
                <>
                  <div className="flex items-center justify-between pt-2"><h3 className="text-sm font-bold text-gray-800">Pending Uploads ({uploadQueue.length})</h3></div>
                  <div className="space-y-2">
                    {uploadQueue.map(d=>{
                      const ext=d.name.split('.').pop().toLowerCase();
                      return(
                        <div key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-dashed border-green-300 bg-green-50/30">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0"><span className="text-[0.5625rem] font-bold text-green-600 uppercase">{ext}</span></div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-gray-700 truncate">{d.name}</div>
                              <div className="text-[0.625rem] text-green-600">{d.size} · Ready</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={()=>setPreviewDoc(d)} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-icrcs-navy transition-colors"><Eye className="h-3.5 w-3.5"/></button>
                            <button onClick={()=>removeQueued(d.id)} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5"/></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Upload Area */}
              <div className="p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-center">
                <input type="file" accept=".pdf" multiple ref={fileRef} onChange={handleUpload} className="hidden"/>
                <button onClick={()=>fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm">
                  <Upload className="h-4 w-4"/>Upload Document
                </button>
                <p className="text-[0.6875rem] text-gray-400 mt-2">Supported: PDF only · Max 5 MB per file</p>
              </div>
            </div>

            {/* Right — Preview */}
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
                    <p className="text-xs text-gray-400 mb-4">{previewDoc.size} · {previewDoc.date}</p>
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-white transition-colors">Close</button>
          <div className="flex items-center gap-2">
            {uploadQueue.length>0&&<span className="text-xs text-gray-400">{uploadQueue.length} file(s) ready to upload</span>}
            <button onClick={()=>{setToast('Documents uploaded successfully.');setTimeout(()=>setToast(''),3000);setUploadQueue([]);}} className="px-5 py-2.5 rounded-xl bg-icrcs-navy text-white text-sm font-semibold hover:bg-icrcs-navy-light transition-colors shadow-sm">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
