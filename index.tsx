import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// Interfaces
interface FileData {
  name: string;
  type: string;
  base64: string;
  size: number;
}

interface Demand {
  id: string;
  patientName: string;
  sendDate: string;
  createdAt: string;
  files: FileData[];
}

const CreativeHub = () => {
  const [view, setView] = useState<'client' | 'admin'>('client');
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [patientName, setPatientName] = useState('');
  const [sendDate, setSendDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data
  useEffect(() => {
    const saved = localStorage.getItem('creative_demands');
    if (saved) {
      setDemands(JSON.parse(saved));
    }
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem('creative_demands', JSON.stringify(demands));
  }, [demands]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleSubmitDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || selectedFiles.length === 0) {
      alert('Por favor, preencha o nome e selecione ao menos um arquivo.');
      return;
    }

    setLoading(true);
    try {
      const fileDataPromises = selectedFiles.map(async (file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        base64: await toBase64(file)
      }));

      const processedFiles = await Promise.all(fileDataPromises);

      const newDemand: Demand = {
        id: crypto.randomUUID(),
        patientName,
        sendDate,
        createdAt: new Date().toISOString(),
        files: processedFiles
      };

      setDemands([newDemand, ...demands]);
      setPatientName('');
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert('Demanda enviada com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao processar arquivos.');
    } finally {
      setLoading(false);
    }
  };

  const downloadZip = async (demand: Demand) => {
    // @ts-ignore - JSZip is loaded via CDN
    const zip = new JSZip();
    
    demand.files.forEach(file => {
      const base64Content = file.base64.split(',')[1];
      zip.file(file.name, base64Content, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Demanda_${demand.patientName.replace(/\s+/g, '_')}_${demand.sendDate}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteDemand = (id: string) => {
    if (confirm('Deseja excluir esta demanda permanentemente?')) {
      setDemands(demands.filter(d => d.id !== id));
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <i className="fas fa-layer-group text-white text-xl"></i>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Creative<span className="text-blue-600">Hub</span></h1>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-full">
          <button 
            onClick={() => setView('client')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${view === 'client' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Cliente
          </button>
          <button 
            onClick={() => setView('admin')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${view === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Equipe Adm
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto mt-8 px-6">
        {view === 'client' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Nova Demanda</h2>
              <p className="text-slate-500">Preencha os dados e anexe os arquivos brutos para edição.</p>
            </header>

            <form onSubmit={handleSubmitDemand} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nome do Paciente</label>
                  <input 
                    type="text" 
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Data de Envio</label>
                  <input 
                    type="date" 
                    value={sendDate}
                    onChange={(e) => setSendDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Arquivos (Vídeos e Fotos)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
                >
                  <i className="fas fa-cloud-upload-alt text-4xl text-slate-300 group-hover:text-blue-500 mb-4"></i>
                  <p className="text-slate-600 font-medium">Arraste arquivos ou clique para selecionar</p>
                  <p className="text-slate-400 text-xs mt-2 uppercase tracking-wider">Múltiplos arquivos permitidos</p>
                  <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden" 
                  />
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className="mt-4 bg-slate-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">{selectedFiles.length} arquivos selecionados:</p>
                    <ul className="text-xs text-slate-500 space-y-1 max-h-32 overflow-y-auto">
                      {selectedFiles.map((f, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <i className="far fa-file"></i> {f.name} ({(f.size / 1024 / 1024).toFixed(2)}MB)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all transform active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <i className="fas fa-circle-notch animate-spin"></i>
                    Processando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    Enviar Demanda
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-8 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Painel de Gestão</h2>
                <p className="text-slate-500">Visualize e baixe os materiais enviados pelos clientes.</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total de Demandas</span>
                <p className="text-3xl font-black text-blue-600">{demands.length}</p>
              </div>
            </header>

            {demands.length === 0 ? (
              <div className="bg-white rounded-2xl p-20 text-center border border-slate-100 shadow-sm">
                <i className="fas fa-inbox text-5xl text-slate-200 mb-4"></i>
                <p className="text-slate-400">Nenhuma demanda enviada até o momento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {demands.map((demand) => (
                  <div key={demand.id} className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <i className="fas fa-user-injured text-xl"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{demand.patientName}</h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <i className="far fa-calendar"></i> {demand.sendDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <i className="fas fa-paperclip"></i> {demand.files.length} arquivos
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => downloadZip(demand)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                      >
                        <i className="fas fa-file-archive"></i>
                        Baixar Arquivos
                      </button>
                      <button 
                        onClick={() => deleteDemand(demand.id)}
                        className="p-2.5 text-slate-400 hover:text-red-500 transition-colors"
                        title="Excluir"
                      >
                        <i className="far fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      
      <footer className="mt-12 text-center text-slate-400 text-xs">
        &copy; 2024 CreativeHub • Sistema de Gestão de Criativos
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<CreativeHub />);