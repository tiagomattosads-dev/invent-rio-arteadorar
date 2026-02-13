
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ViewType, 
  Item, 
  Category, 
  Loan, 
  ItemCondition,
  Profile,
  Invite,
  UserRole,
  ItemStatus
} from './types';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_ITEMS, 
  MINISTRIES, 
  CONDITIONS 
} from './constants';
import { storageService } from './services/storageService';
import { supabase } from './services/supabaseClient';
import { dataServiceSupabase } from './services/dataServiceSupabase';
import { storageServiceSupabase } from './services/storageServiceSupabase';
import { 
  Button, 
  Input, 
  Select, 
  Card, 
  Badge, 
  Modal 
} from './components/UI';
import CameraCapture from './components/CameraCapture';
import SignatureCanvas from './components/SignatureCanvas';
import Login from './components/Login';
import ConfirmDialog from './components/ConfirmDialog';
import AlertDialog from './components/AlertDialog';

const App: React.FC = () => {
  // --- AUTH & PROFILE STATE ---
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- APP STATE ---
  const [activeView, setActiveView] = useState<ViewType>('inventory');
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [dataLoading, setDataLoading] = useState(false);
  
  // Admin Lists
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [allInvites, setAllInvites] = useState<Invite[]>([]);

  // Inventory Filtering
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  // Modals state
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // Feedback Modals State
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; onOk?: () => void }>({
    isOpen: false,
    title: '',
    message: ''
  });
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Loan Form State
  const [loanForm, setLoanForm] = useState({
    borrowerName: '',
    borrowerPhone: '',
    ministry: '',
    otherMinistry: '',
    reason: '',
    dueDate: '',
    consent: false,
    photo: '',
    signature: ''
  });

  // Return Form State
  const [returnForm, setReturnForm] = useState({
    condition: 'Boas Condições' as ItemCondition,
    observations: ''
  });

  // Edit/New Item Form State
  const [itemForm, setItemForm] = useState<Partial<Item>>({});

  // --- INITIALIZATION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        bootstrapProfile(session.user.id, session.user.email || '');
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        bootstrapProfile(session.user.id, session.user.email || '');
      } else {
        setProfile(null);
        setAuthLoading(false);
      }
    });

    const storedTheme = storageService.getTheme();
    if (storedTheme) setTheme(storedTheme);

    return () => subscription.unsubscribe();
  }, []);

  const bootstrapProfile = async (userId: string, email: string) => {
    try {
      const pendingCode = localStorage.getItem('pending_invite_code');
      if (pendingCode) {
        try {
          await dataServiceSupabase.redeemInvite(pendingCode);
          localStorage.removeItem('pending_invite_code');
        } catch (err) {
          console.error("Erro ao resgatar convite pendente:", err);
        }
      }

      let userProfile = await dataServiceSupabase.getProfile(userId);
      
      if (!userProfile) {
        userProfile = await dataServiceSupabase.createProfile({
          user_id: userId,
          display_name: email,
          role: 'user',
          can_edit_items: false
        });
      }
      setProfile(userProfile);
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (session && profile) {
      loadAllData();
      if (profile.role === 'admin') {
        loadAdminData();
      }
    }
  }, [session, profile]);

  const loadAllData = async () => {
    setDataLoading(true);
    try {
      const [cats, its, lns] = await Promise.all([
        dataServiceSupabase.listCategories(),
        dataServiceSupabase.listItems(),
        dataServiceSupabase.listLoans()
      ]);
      setCategories(cats.length > 0 ? cats : INITIAL_CATEGORIES);
      setItems(its.length > 0 ? its : INITIAL_ITEMS);
      setLoans(lns);
    } catch (err) {
      console.error("Erro ao carregar dados do Supabase:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      const [profilesList, invitesList] = await Promise.all([
        dataServiceSupabase.listProfiles(),
        dataServiceSupabase.listInvites()
      ]);
      setAllProfiles(profilesList);
      setAllInvites(invitesList);
    } catch (err) {
      console.error("Erro ao carregar dados admin:", err);
    }
  };

  useEffect(() => {
    storageService.saveTheme(theme);
    if (theme === 'light') {
      document.body.classList.remove('bg-black', 'text-white');
      document.body.classList.add('bg-white', 'text-black');
    } else {
      document.body.classList.remove('bg-white', 'text-black');
      document.body.classList.add('bg-black', 'text-white');
    }
  }, [theme]);

  // --- HANDLERS ---
  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const performLogout = async () => {
    await supabase.auth.signOut();
  };

  const showAlert = (message: string, title: string = 'Aviso', onOk?: () => void) => {
    setAlertConfig({ isOpen: true, title, message, onOk });
  };

  const showConfirm = (message: string, title: string, onConfirm: () => void) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm });
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                           item.code.toLowerCase().includes(search.toLowerCase());
      const matchesCat = catFilter === 'all' || item.categoryId === catFilter;
      return matchesSearch && matchesCat;
    });
  }, [items, search, catFilter]);

  const handleGenerateCode = () => {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    setItemForm({ ...itemForm, code: `REF-${random}` });
  };

  const handleCreateLoan = async () => {
    if (!selectedItem) return;
    if (!loanForm.borrowerName || !loanForm.dueDate || !loanForm.consent || !loanForm.photo || !loanForm.signature || !loanForm.ministry) {
      showAlert('Por favor, preencha todos os campos obrigatórios, incluindo ministério, foto e assinatura.');
      return;
    }

    setDataLoading(true);
    try {
      const photoUrl = await storageServiceSupabase.uploadImage(loanForm.photo, "borrowers");
      const signatureUrl = await storageServiceSupabase.uploadImage(loanForm.signature, "signatures");

      const newLoan: Partial<Loan> = {
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        borrowerName: loanForm.borrowerName,
        ministry: loanForm.ministry === 'Outro' ? loanForm.otherMinistry : loanForm.ministry,
        reason: loanForm.reason,
        loanDate: new Date().toISOString(),
        dueDate: loanForm.dueDate,
        consent: loanForm.consent,
        borrowerPhoto: photoUrl,
        signature: signatureUrl,
        status: 'Ativo'
      };

      await dataServiceSupabase.createLoan(newLoan);
      // Fixed line 273: Added type cast to ItemStatus and properly closed statement
      await dataServiceSupabase.updateItem(selectedItem.id, { status: 'Emprestado' as ItemStatus });
      
      showAlert('Empréstimo registrado com sucesso!', 'Sucesso');
      setIsLoanModalOpen(false);
      setLoanForm({
        borrowerName: '',
        borrowerPhone: '',
        ministry: '',
        otherMinistry: '',
        reason: '',
        dueDate: '',
        consent: false,
        photo: '',
        signature: ''
      });
      loadAllData();
    } catch (err) {
      console.error(err);
      showAlert('Erro ao processar empréstimo.');
    } finally {
      setDataLoading(false);
    }
  };

  const handleReturnLoan = async () => {
    if (!selectedLoan) return;
    setDataLoading(true);
    try {
      await dataServiceSupabase.updateLoan(selectedLoan.id, {
        status: 'Concluído',
        returnDate: new Date().toISOString(),
        returnCondition: returnForm.condition
      });
      await dataServiceSupabase.updateItem(selectedLoan.itemId, { 
        status: 'Disponível' as ItemStatus,
        condition: returnForm.condition
      });
      showAlert('Item devolvido com sucesso!', 'Sucesso');
      setIsReturnModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error(err);
      showAlert('Erro ao processar devolução.');
    } finally {
      setDataLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!itemForm.name || !itemForm.categoryId || !itemForm.code) {
      showAlert('Preencha os campos obrigatórios (Nome, Categoria, Código).');
      return;
    }
    setDataLoading(true);
    try {
      if (itemForm.id) {
        await dataServiceSupabase.updateItem(itemForm.id, itemForm);
      } else {
        await dataServiceSupabase.createItem({
          ...itemForm,
          status: 'Disponível' as ItemStatus
        });
      }
      setIsItemModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error(err);
      showAlert('Erro ao salvar item.');
    } finally {
      setDataLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    showConfirm('Tem certeza que deseja excluir este item?', 'Excluir Item', async () => {
      setDataLoading(true);
      try {
        await dataServiceSupabase.deleteItem(id);
        loadAllData();
      } catch (err) {
        console.error(err);
        showAlert('Erro ao excluir item.');
      } finally {
        setDataLoading(false);
      }
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-black text-white' : 'bg-zinc-50 text-black'}`}>
      {/* Header */}
      <header className={`p-4 border-b flex items-center justify-between sticky top-0 z-40 backdrop-blur-md ${theme === 'dark' ? 'bg-black/80 border-zinc-900' : 'bg-white/80 border-zinc-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded-lg flex items-center justify-center overflow-hidden">
            <img src="https://res.cloudinary.com/dutufef4s/image/upload/v1770989288/theatre_njtpog.png" alt="Logo" className="w-5 h-5 grayscale" />
          </div>
          <h1 className="font-bold uppercase tracking-tighter text-lg hidden sm:block">Acervo Teatro</h1>
        </div>

        <nav className="flex items-center gap-1 sm:gap-4 overflow-x-auto">
          <button 
            onClick={() => setActiveView('inventory')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeView === 'inventory' ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Inventário
          </button>
          <button 
            onClick={() => setActiveView('loans')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeView === 'loans' ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Empréstimos
          </button>
          {profile?.role === 'admin' && (
            <button 
              onClick={() => setActiveView('admin')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeView === 'admin' ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Admin
            </button>
          )}
          <button 
            onClick={() => setActiveView('settings')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeView === 'settings' ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Ajustes
          </button>
        </nav>

        <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {activeView === 'inventory' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <Input 
                  placeholder="Buscar por nome ou código..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-md"
                />
                <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="w-full sm:w-48">
                  <option value="all">Todas Categorias</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              {profile?.can_edit_items && (
                <Button onClick={() => { setItemForm({}); setIsItemModalOpen(true); }}>
                  + Novo Item
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map(item => (
                <Card key={item.id} className="flex flex-col">
                  <div className="aspect-square bg-zinc-900 relative group overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover grayscale transition-all group-hover:grayscale-0 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-800">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant={item.status === 'Disponível' ? 'success' : 'warning'}>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 space-y-3 flex-1 flex flex-col">
                    <div>
                      <h3 className="font-bold text-sm uppercase tracking-tight line-clamp-1">{item.name}</h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{item.code} • {categories.find(c => c.id === item.categoryId)?.name}</p>
                    </div>
                    
                    <div className="flex gap-2 pt-2 mt-auto">
                      {item.status === 'Disponível' ? (
                        <Button fullWidth onClick={() => { setSelectedItem(item); setIsLoanModalOpen(true); }}>
                          Emprestar
                        </Button>
                      ) : (
                        <Button fullWidth variant="secondary" disabled>
                          Indisponível
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => { setSelectedItem(item); setIsDetailModalOpen(true); }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {filteredItems.length === 0 && (
              <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
                <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Nenhum item encontrado</p>
              </div>
            )}
          </div>
        )}

        {activeView === 'loans' && (
          <div className="space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-6 border-l-2 border-white pl-3">Controle de Empréstimos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loans.map(loan => (
                <Card key={loan.id} className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold uppercase tracking-tight">{loan.itemName}</h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{loan.borrowerName} • {loan.ministry}</p>
                    </div>
                    <Badge variant={loan.status === 'Ativo' ? 'warning' : 'success'}>{loan.status}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-[10px] uppercase tracking-widest text-zinc-500 pt-2">
                    <div>
                      <p className="text-zinc-700 mb-1">Retirada</p>
                      <p className="text-zinc-300">{new Date(loan.loanDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-zinc-700 mb-1">Devolução Prevista</p>
                      <p className="text-zinc-300">{new Date(loan.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {loan.status === 'Ativo' && (
                    <Button fullWidth onClick={() => { setSelectedLoan(loan); setIsReturnModalOpen(true); }}>
                      Receber Devolução
                    </Button>
                  )}
                </Card>
              ))}
              {loans.length === 0 && (
                <div className="col-span-full text-center py-20 border border-dashed border-zinc-800 rounded-xl">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Nenhum empréstimo registrado</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="max-w-xl mx-auto space-y-8">
            <h2 className="text-sm font-bold uppercase tracking-widest border-l-2 border-white pl-3">Ajustes do Sistema</h2>
            <Card className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-600 mb-4 tracking-widest">Tema Visual</label>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setTheme('dark')}
                    className={`flex-1 p-4 rounded-lg border flex flex-col items-center gap-3 transition-all ${theme === 'dark' ? 'bg-zinc-900 border-white' : 'border-zinc-200'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-black border border-white/20" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Modo Escuro</span>
                  </button>
                  <button 
                    onClick={() => setTheme('light')}
                    className={`flex-1 p-4 rounded-lg border flex flex-col items-center gap-3 transition-all ${theme === 'light' ? 'bg-zinc-100 border-black' : 'border-zinc-800'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white border border-black/20" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Modo Claro</span>
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Item Modal */}
      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title={itemForm.id ? "Editar Item" : "Novo Item"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Nome do Item</label>
              <Input value={itemForm.name || ''} onChange={e => setItemForm({...itemForm, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Código/Ref</label>
              <div className="flex gap-2">
                <Input value={itemForm.code || ''} onChange={e => setItemForm({...itemForm, code: e.target.value})} />
                <Button variant="secondary" onClick={handleGenerateCode}>Gera</Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Categoria</label>
              <Select value={itemForm.categoryId || ''} onChange={e => setItemForm({...itemForm, categoryId: e.target.value})}>
                <option value="">Selecione...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Condição</label>
              <Select value={itemForm.condition || 'Boas Condições'} onChange={e => setItemForm({...itemForm, condition: e.target.value as ItemCondition})}>
                {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Observações</label>
            <Input value={itemForm.observations || ''} onChange={e => setItemForm({...itemForm, observations: e.target.value})} />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsItemModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem}>Salvar Alterações</Button>
          </div>
        </div>
      </Modal>

      {/* Loan Modal */}
      <Modal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} title="Novo Empréstimo">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Quem está levando?</label>
                <Input placeholder="Nome completo" value={loanForm.borrowerName} onChange={e => setLoanForm({...loanForm, borrowerName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Ministério Responsável</label>
                <Select value={loanForm.ministry} onChange={e => setLoanForm({...loanForm, ministry: e.target.value})}>
                  <option value="">Selecione...</option>
                  {MINISTRIES.map(m => <option key={m} value={m}>{m}</option>)}
                </Select>
              </div>
              {loanForm.ministry === 'Outro' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Especifique o Ministério</label>
                  <Input value={loanForm.otherMinistry} onChange={e => setLoanForm({...loanForm, otherMinistry: e.target.value})} />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Data Prevista de Devolução</label>
                <Input type="date" value={loanForm.dueDate} onChange={e => setLoanForm({...loanForm, dueDate: e.target.value})} />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest block">Foto de Identificação</label>
              {loanForm.photo ? (
                <div className="relative aspect-square rounded-lg overflow-hidden border border-zinc-800">
                  <img src={loanForm.photo} className="w-full h-full object-cover" alt="Borrower" />
                  <button onClick={() => setLoanForm({...loanForm, photo: ''})} className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              ) : (
                <CameraCapture onCapture={base64 => setLoanForm({...loanForm, photo: base64})} onCancel={() => {}} />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest block">Assinatura do Termo</label>
            <SignatureCanvas onSave={base64 => setLoanForm({...loanForm, signature: base64})} onClear={() => setLoanForm({...loanForm, signature: ''})} isDark={theme === 'dark'} />
          </div>

          <div className="flex items-start gap-3 p-4 bg-zinc-900 rounded-lg">
            <input type="checkbox" id="consent" checked={loanForm.consent} onChange={e => setLoanForm({...loanForm, consent: e.target.checked})} className="mt-1" />
            <label htmlFor="consent" className="text-[10px] leading-relaxed text-zinc-400 uppercase tracking-wider">
              ESTOU CIENTE DE QUE DEVO DEVOLVER O ITEM NA DATA COMBINADA E NAS MESMAS CONDIÇÕES EM QUE O RECEBI.
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsLoanModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateLoan} disabled={dataLoading}>{dataLoading ? 'Processando...' : 'Finalizar Empréstimo'}</Button>
          </div>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} title="Concluir Devolução">
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Condição na Entrega</label>
            <Select value={returnForm.condition} onChange={e => setReturnForm({...returnForm, condition: e.target.value as ItemCondition})}>
              {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Observações da Devolução</label>
            <Input placeholder="Descreva qualquer dano ou observação..." value={returnForm.observations} onChange={e => setReturnForm({...returnForm, observations: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsReturnModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleReturnLoan} disabled={dataLoading}>Confirmar Recebimento</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Detalhes do Item">
        {selectedItem && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                {selectedItem.imageUrl ? (
                  <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover grayscale" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-800">Sem Foto</div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-[10px] font-bold uppercase text-zinc-600 tracking-widest mb-1">Status Atual</h3>
                  <Badge variant={selectedItem.status === 'Disponível' ? 'success' : 'warning'}>{selectedItem.status}</Badge>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase text-zinc-600 tracking-widest mb-1">Identificação</h3>
                  <p className="font-bold uppercase">{selectedItem.name}</p>
                  <p className="text-[10px] text-zinc-500 tracking-widest">{selectedItem.code}</p>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase text-zinc-600 tracking-widest mb-1">Localização no Acervo</h3>
                  <p className="text-sm uppercase">{selectedItem.location || 'Não informada'}</p>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase text-zinc-600 tracking-widest mb-1">Observações</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed italic">"{selectedItem.observations || 'Nenhuma observação cadastrada'}"</p>
                </div>
              </div>
            </div>
            
            <div className="pt-6 border-t border-zinc-900 flex justify-between items-center">
              {profile?.can_edit_items && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setItemForm(selectedItem); setIsDetailModalOpen(false); setIsItemModalOpen(true); }}>Editar</Button>
                  <Button variant="danger" onClick={() => { setIsDetailModalOpen(false); handleDeleteItem(selectedItem.id); }}>Excluir</Button>
                </div>
              )}
              <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Feedback Dialogs */}
      <AlertDialog 
        isOpen={alertConfig.isOpen} 
        title={alertConfig.title} 
        message={alertConfig.message} 
        onClose={() => { setAlertConfig({...alertConfig, isOpen: false}); alertConfig.onOk?.(); }} 
      />
      <ConfirmDialog 
        isOpen={confirmConfig.isOpen} 
        title={confirmConfig.title} 
        message={confirmConfig.message} 
        onConfirm={confirmConfig.onConfirm} 
        onClose={() => setConfirmConfig({...confirmConfig, isOpen: false})} 
      />
      <ConfirmDialog 
        isOpen={isLogoutConfirmOpen}
        title="Sair do Sistema"
        message="Deseja realmente encerrar sua sessão?"
        onConfirm={performLogout}
        onClose={() => setIsLogoutConfirmOpen(false)}
      />
    </div>
  );
};

export default App;
