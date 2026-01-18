import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// Interfaces
interface FileData {
  id: string;
  name: string;
  type: string;
  base64: string;
  size: number;
}

type DemandStatus = 'Pendente' | 'Em Edição' | 'Finalizado';
type UserRole = 'client' | 'admin' | null;

interface ClientProfile {
  id: string;
  username: string;
  name: string;
  password: string;
}

interface Demand {
  id: string;
  clientId: string;
  patientName: string;
  sendDate: string;
  createdAt: string;
  files: FileData[];
  status: DemandStatus;
  notes?: string;
}

const CreativeHub = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<UserRole>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [demands, setDemands] = useState<Demand[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Admin Controls
  const [adminTab, setAdminTab] = useState<'demands' | 'clients'>('demands');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [clientFilter, setClientFilter] = useState<string>('Todos');
  const [expandedDemand, setExpandedDemand] = useState<string | null>(null);

  // Client Creation Form
  const [newClientName, setNewClientName] = useState('');
  const [newClientUser, setNewClientUser] = useState('');
  const [newClientPass, setNewClientPass] = useState('');

  // Demand Form
  const [patientName, setPatientName] = useState('');
  const [sendDate, setSendDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedDemands = localStorage.getItem('creative_v3_demands');
    if (savedDemands) setDemands(JSON.parse(savedDemands));
    
    const savedClients = localStorage.getItem('creative_v3_clients');
    if (savedClients) {
      setClients(JSON.parse(savedClients));
    } else {
      // Default client for testing
      const defaultClient = [{ id: 'c1', username: 'cliente', name: 'Cliente Padrão', password: 'cliente123' }];
      setClients(defaultClient);
      localStorage.setItem('creative_v3_clients', JSON.stringify(defaultClient));
    }
    
    const sessionRole = sessionStorage.getItem('creative_role') as UserRole;
    const sessionUser = sessionStorage.getItem('creative_user');
    if (sessionRole) {
      setRole(sessionRole);
      if (sessionUser) setActiveUser(JSON.parse(sessionUser));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('creative_v3_demands', JSON.stringify(demands));
  }, [demands]);

  useEffect(() => {
    localStorage.setItem('creative_v3_clients', JSON.stringify(clients));
  }, [clients]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn === 'admin' && username === 'admin' && password === 'admin123') {
      const adminUser = { name: 'Administrador' };
      setRole('admin');
      setActiveUser(adminUser);
      sessionStorage.setItem('creative_role', 'admin');
      sessionStorage.setItem('creative_user', JSON.stringify(adminUser));
    } else if (isLoggingIn === 'client') {
      const foundClient = clients.find(c => c.username === username && c.password === password);
      if (foundClient) {
        setRole('client');
        setActiveUser(foundClient);
        sessionStorage.setItem('creative_role', 'client');
        sessionStorage.setItem('creative_user', JSON.stringify(foundClient));
      } else {
        alert('Cliente não encontrado ou senha incorreta.');
      }
    } else {
      alert('Credenciais inválidas!');
    }
    setUsername('');
    setPassword('');
  };

  const handleLogout = () => {
    setRole(null);
    setIsLoggingIn(null);
    setActiveUser(null);
    sessionStorage.clear();
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmitDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || selectedFiles.length === 0) return alert('Preencha os dados.');

    setLoading(true);
    try {
      const processedFiles = await Promise.all(selectedFiles.map(async (file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        base64: await toBase64(file)
      })));

      const newDemand: Demand = {
        id: crypto.randomUUID(),
        clientId: activeUser.id,
        patientName,
        sendDate,
        createdAt: new Date().toISOString(),
        files: processedFiles,
        status: 'Pendente'
      };

      setDemands([newDemand, ...demands]);
      setPatientName('');
      setSelectedFiles([]);
      alert('Demanda enviada!');
    } catch (error) {
      alert('Erro ao processar arquivos.');
    } finally {
      setLoading(false);
    }
  };

  const createClient = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: ClientProfile = {
      id: crypto.randomUUID(),
      name: newClientName,
      username: newClientUser,
      password: newClientPass
    };
    setClients([...clients, newClient]);
    setNewClientName('');
    setNewClientUser('');
    setNewClientPass('');
    alert('Cliente criado com sucesso!');
  };

  const removeFileFromDemand = (demandId: string, fileId: string) => {
    if (!confirm('Excluir este arquivo da demanda?')) return;
    setDemands(prev => prev.map(d => {
      if (d.id === demandId) {
        return { ...d, files: d.files.filter(f => f.id !== fileId) };
      }
      return d;
    }));
  };

  const editFileName = (demandId: string, fileId: string) => {
    const demand = demands.find(d => d.id === demandId);
    const file = demand?.files.find(f => f.id === fileId);
    if (!file) return;

    const newName = prompt('Novo nome do arquivo:', file.name);
    if (newName && newName !== file.name) {
      setDemands(prev => prev.map(d => {
        if (d.id === demandId) {
          return {
            ...d,
            files: d.files.map(f => f.id === fileId ? { ...f, name: newName } : f)
          };
        }
        return d;
      }));
    }
  };

  const updateDemandNotes = (id: string, notes: string) => {
    setDemands(prev => prev.map(d => d.id === id ? { ...d, notes } : d));
  };

  const downloadZip = async (demand: Demand) => {
    // @ts-ignore
    const zip = new JSZip();
    demand.files.forEach(file => {
      const base64Content = file.base64.split(',')[1];
      zip.file(file.name, base64Content, { base64: true });
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Demand_${demand.patientName}_${demand.sendDate}.zip`;
    a.click();
  };

  const filteredDemands = demands.filter(d => {
    const client = clients.find(c => c.id === d.clientId);
    const clientName = client?.name || '';
    
    const matchesPatientSearch = d.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClientSearch = clientName.toLowerCase().includes(clientSearchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || d.status === statusFilter;
    const matchesClientFilter = clientFilter === 'Todos' || d.clientId === clientFilter;
    const matchesRoleVisibility = role === 'admin' ? true : d.clientId === activeUser?.id;
    
    return matchesPatientSearch && matchesClientSearch && matchesStatus && matchesClientFilter && matchesRoleVisibility;
  });

  const getStatusStyles = (status: DemandStatus) => {
    switch (status) {
      case 'Pendente': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Em Edição': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Finalizado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  if (!role && !isLoggingIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
            <i className="fas fa-rocket text-white text-2xl"></i>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">CreativeHub <span className="text-blue-600">V3</span></h1>
          <p className="text-slate-500 mb-10 text-sm font-medium">Gestão profissional de demandas e criativos</p>
          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => setIsLoggingIn('client')} className="bg-white border p-6 rounded-2xl flex items-center gap-4 hover:border-blue-500 transition-all text-left shadow-sm">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><i className="fas fa-user"></i></div>
              <div><b className="block text-slate-800">Sou Cliente</b><span className="text-xs text-slate-400">Acesse seu quadro exclusivo</span></div>
            </button>
            <button onClick={() => setIsLoggingIn('admin')} className="bg-white border p-6 rounded-2xl flex items-center gap-4 hover:border-slate-800 transition-all text-left shadow-sm">
              <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center"><i className="fas fa-shield-alt"></i></div>
              <div><b className="block text-slate-800">Equipe Adm</b><span className="text-xs text-slate-400">Gestão global de arquivos</span></div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!role && isLoggingIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
          <button onClick={() => setIsLoggingIn(null)} className="text-slate-400 mb-6 text-sm"><i className="fas fa-chevron-left mr-2"></i> Voltar</button>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Login {isLoggingIn === 'admin' ? 'Equipe' : 'Cliente'}</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Usuário" className="w-full px-4 py-3 bg-slate-50 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500" required />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" className="w-full px-4 py-3 bg-slate-50 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500" required />
            <button className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg text-white"><i className="fas fa-layer-group"></i></div>
          <span className="font-bold text-slate-800">CreativeHub</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-400 hidden sm:block">OLÁ, <span className="text-slate-900">{activeUser?.name.toUpperCase()}</span></span>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors"><i className="fas fa-power-off"></i></button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        {role === 'client' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna de Envio */}
                <div className="lg:col-span-1">
                  <h2 className="text-xl font-bold mb-4">Novo Envio</h2>
                  <form onSubmit={handleSubmitDemand} className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                    <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Nome do Paciente" className="w-full px-4 py-2 border rounded-xl" required />
                    <input type="date" value={sendDate} onChange={e => setSendDate(e.target.value)} className="w-full px-4 py-2 border rounded-xl" required />
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed p-6 rounded-xl text-center cursor-pointer hover:bg-slate-50">
                      <i className="fas fa-cloud-upload-alt text-2xl text-slate-300 mb-2"></i>
                      <p className="text-xs text-slate-500">Clique para anexar arquivos</p>
                      <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    </div>
                    {selectedFiles.length > 0 && <p className="text-[10px] text-blue-600 font-bold">{selectedFiles.length} arquivos selecionados</p>}
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50" disabled={loading}>
                      {loading ? 'Enviando...' : 'Enviar Demanda'}
                    </button>
                  </form>
                </div>
                
                {/* Quadro Próprio */}
                <div className="lg:col-span-2">
                  <h2 className="text-xl font-bold mb-4">Meu Quadro</h2>
                  <div className="space-y-4">
                    {filteredDemands.map(d => (
                      <div key={d.id} className="bg-white p-4 rounded-xl border flex justify-between items-center">
                        <div>
                          <h3 className="font-bold">{d.patientName}</h3>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{d.sendDate} • {d.files.length} arq.</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${getStatusStyles(d.status)}`}>{d.status}</span>
                      </div>
                    ))}
                    {filteredDemands.length === 0 && <p className="text-slate-400 text-center py-10">Nenhuma demanda encontrada.</p>}
                  </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Tabs Admin */}
            <div className="flex gap-4 mb-8 bg-slate-200 p-1 rounded-xl w-fit">
              <button onClick={() => setAdminTab('demands')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${adminTab === 'demands' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Demandas</button>
              <button onClick={() => setAdminTab('clients')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${adminTab === 'clients' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Clientes</button>
            </div>

            {adminTab === 'demands' ? (
              <div className="space-y-6">
                {/* Toolbar */}
                <div className="flex flex-col gap-4 bg-white p-5 rounded-2xl border shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative">
                      <i className="fas fa-search absolute left-3 top-3 text-slate-300 text-xs"></i>
                      <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Nome do Paciente..." className="w-full pl-9 pr-4 py-2 border rounded-xl outline-none text-xs" />
                    </div>
                    <div className="relative">
                      <i className="fas fa-clinic-medical absolute left-3 top-3 text-slate-300 text-xs"></i>
                      <input type="text" value={clientSearchTerm} onChange={e => setClientSearchTerm(e.target.value)} placeholder="Nome do Cliente..." className="w-full pl-9 pr-4 py-2 border rounded-xl outline-none text-xs" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <select 
                        value={clientFilter} 
                        onChange={e => setClientFilter(e.target.value)} 
                        className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                      >
                        <option value="Todos">Todos os Clientes (Lista)</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value)} 
                        className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                      >
                        <option value="Todos">Todos Status</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Em Edição">Em Edição</option>
                        <option value="Finalizado">Finalizado</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Listagem */}
                <div className="space-y-4">
                  {filteredDemands.map(d => (
                    <div key={d.id} className="bg-white rounded-2xl border overflow-hidden shadow-sm transition-all">
                      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => setExpandedDemand(expandedDemand === d.id ? null : d.id)}>
                            <i className={`fas fa-chevron-${expandedDemand === d.id ? 'up' : 'down'} text-sm`}></i>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-800">{d.patientName}</h3>
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">CLI: {clients.find(c => c.id === d.clientId)?.name || 'N/A'}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{d.sendDate} • {d.files.length} ARQUIVOS</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <select value={d.status} onChange={e => setDemands(prev => prev.map(item => item.id === d.id ? {...item, status: e.target.value as DemandStatus} : item))} className={`text-[10px] font-black px-3 py-1.5 rounded-lg border outline-none uppercase ${getStatusStyles(d.status)}`}>
                            <option value="Pendente">Pendente</option>
                            <option value="Em Edição">Em Edição</option>
                            <option value="Finalizado">Finalizado</option>
                          </select>
                          <button onClick={() => downloadZip(d)} className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-emerald-600 transition-colors flex items-center gap-1 uppercase tracking-tight">
                            <i className="fas fa-file-zipper"></i> ZIP
                          </button>
                          <button onClick={() => {if(confirm('Excluir demanda inteira?')) setDemands(demands.filter(x => x.id !== d.id))}} className="text-slate-200 hover:text-red-500 transition-colors p-2"><i className="far fa-trash-can"></i></button>
                        </div>
                      </div>

                      {/* Expanded Section */}
                      {expandedDemand === d.id && (
                        <div className="px-5 pb-5 border-t animate-in fade-in slide-in-from-top-2">
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Arquivos */}
                            <div className="md:col-span-2">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Arquivos e Miniaturas</h4>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {d.files.map(f => (
                                  <div key={f.id} className="group relative border rounded-xl overflow-hidden aspect-square bg-slate-50 border-slate-100 shadow-sm flex flex-col">
                                    <div className="flex-1 overflow-hidden relative">
                                      {f.type.startsWith('image/') ? (
                                        <img src={f.base64} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                      ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100">
                                          <i className={`fas ${f.type.startsWith('video/') ? 'fa-film text-blue-400' : 'fa-file-lines text-slate-400'} text-2xl mb-1`}></i>
                                        </div>
                                      )}
                                      {/* Overlay de Edição Rápida */}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                         <button 
                                          onClick={(e) => { e.stopPropagation(); editFileName(d.id, f.id); }}
                                          className="w-8 h-8 bg-white rounded-full text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-lg"
                                          title="Editar Nome"
                                        >
                                          <i className="fas fa-pen text-xs"></i>
                                        </button>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); removeFileFromDemand(d.id, f.id); }}
                                          className="w-8 h-8 bg-white rounded-full text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-lg"
                                          title="Excluir Arquivo"
                                        >
                                          <i className="fas fa-trash-can text-xs"></i>
                                        </button>
                                      </div>
                                    </div>
                                    <div className="p-1.5 bg-white border-t">
                                      <span className="text-[8px] text-slate-500 uppercase font-bold truncate block">{f.name}</span>
                                    </div>
                                  </div>
                                ))}
                                {d.files.length === 0 && <p className="text-xs text-slate-400 italic py-4">Nenhum arquivo nesta demanda.</p>}
                              </div>
                            </div>
                            
                            {/* Notas */}
                            <div className="md:col-span-1">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Notas de Edição</h4>
                              <textarea 
                                value={d.notes || ''} 
                                onChange={e => updateDemandNotes(d.id, e.target.value)}
                                placeholder="Insira instruções ou observações..."
                                className="w-full h-32 p-3 text-xs border rounded-xl bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500 resize-none font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredDemands.length === 0 && (
                    <div className="bg-white rounded-2xl p-20 text-center border border-dashed border-slate-200 text-slate-400">
                      <i className="fas fa-magnifying-glass mb-4 text-3xl opacity-20"></i>
                      <p className="font-bold text-slate-600">Nenhuma demanda corresponde aos filtros.</p>
                      <p className="text-[10px] mt-1 uppercase tracking-widest">Tente buscar por outro termo ou limpar os filtros.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Criar Cliente */}
                <div className="lg:col-span-1">
                  <h2 className="text-xl font-bold mb-4">Novo Cliente</h2>
                  <form onSubmit={createClient} className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                    <input type="text" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Nome da Clínica/Cliente" className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-1 focus:ring-blue-500" required />
                    <input type="text" value={newClientUser} onChange={e => setNewClientUser(e.target.value)} placeholder="Usuário de Login" className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-1 focus:ring-blue-500" required />
                    <input type="password" value={newClientPass} onChange={e => setNewClientPass(e.target.value)} placeholder="Senha" className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-1 focus:ring-blue-500" required />
                    <button className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-colors">Cadastrar Cliente</button>
                  </form>
                </div>
                {/* Listar Clientes */}
                <div className="lg:col-span-2">
                  <h2 className="text-xl font-bold mb-4">Clientes Cadastrados</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {clients.map(c => (
                      <div key={c.id} className="bg-white p-5 rounded-2xl border flex justify-between items-center group shadow-sm hover:shadow-md transition-shadow">
                        <div>
                          <p className="font-bold text-slate-800">{c.name}</p>
                          <p className="text-xs text-slate-400 uppercase tracking-tighter">User: <span className="font-mono bg-slate-100 px-1 rounded text-slate-600">{c.username}</span></p>
                        </div>
                        <button onClick={() => {
                          if (confirm(`Excluir o cliente ${c.name}? Todas as demandas deste cliente continuarão no sistema mas ficarão sem identificação.`)) {
                            setClients(clients.filter(x => x.id !== c.id));
                          }
                        }} className="text-slate-200 hover:text-red-500 transition-colors p-2"><i className="fas fa-trash-alt"></i></button>
                      </div>
                    ))}
                    {clients.length === 0 && <p className="text-slate-400 text-center col-span-2 py-10 italic">Nenhum cliente cadastrado.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="text-center py-10 opacity-30 text-[10px] font-black uppercase tracking-widest">
        CreativeHub Professional Ecosystem v3.7
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<CreativeHub />);