
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ViewType, 
  Item, 
  Category, 
  Loan, 
  ItemCondition,
  Profile,
  Invite
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);

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
      let userProfile = await dataServiceSupabase.getProfile(userId);
      if (!userProfile) {
        // Criar perfil padrão se não existir (caso o cadastro tenha sido feito fora do fluxo de convite esperado)
        userProfile = await dataServiceSupabase.createProfile({
          user_id: userId,
          display_name: email.split('@')[0],
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
      const [ps, is] = await Promise.all([
        dataServiceSupabase.listProfiles(),
        dataServiceSupabase.listInvites()
      ]);
      setProfiles(ps);
      setInvites(is);
    } catch (err) {
      console.error("Erro admin data:", err);
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
      alert('Por favor, preencha todos os campos obrigatórios.');
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
      await dataServiceSupabase.updateItem(selectedItem.id, { status: 'Emprestado' });

      await loadAllData();
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
      setSelectedItem(null);
    } catch (err: any) {
      alert("Erro ao criar empréstimo: " + err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handleReturnItem = async () => {
    if (!selectedLoan) return;
    setDataLoading(true);
    try {
      await dataServiceSupabase.updateLoan(selectedLoan.id, {
        status: 'Concluído',
        returnDate: new Date().toISOString(),
        returnCondition: returnForm.condition
      });
      
      await dataServiceSupabase.updateItem(selectedLoan.itemId, {
        status: 'Disponível',
        condition: returnForm.condition
      });

      await loadAllData();
      setIsReturnModalOpen(false);
      setSelectedLoan(null);
    } catch (err: any) {
      alert("Erro ao devolver item: " + err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!profile?.can_edit_items && profile?.role !== 'admin') {
      alert("Você não tem permissão para editar itens.");
      return;
    }
    if (!itemForm.name || !itemForm.categoryId) return;
    setDataLoading(true);
    try {
      let imageUrl = itemForm.imageUrl;
      if (itemForm.imageUrl?.startsWith('data:')) {
        imageUrl = await storageServiceSupabase.uploadImage(itemForm.imageUrl, "items");
      }

      const itemData = { ...itemForm, imageUrl };

      if (itemForm.id) {
        await dataServiceSupabase.updateItem(itemForm.id, itemData);
      } else {
        await dataServiceSupabase.createItem({ ...itemData, status: 'Disponível' });
      }
      
      await loadAllData();
      setIsItemModalOpen(false);
      setItemForm({});
    } catch (err: any) {
      alert("Erro ao salvar item: " + err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handleAddCategory = async (name: string) => {
    setDataLoading(true);
    try {
      await dataServiceSupabase.createCategory(name);
      await loadAllData();
    } catch (err: any) {
      alert("Erro ao criar categoria: " + err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta categoria?')) return;
    setDataLoading(true);
    try {
      await dataServiceSupabase.deleteCategory(id);
      await loadAllData();
    } catch (err: any) {
      alert("Erro ao excluir categoria: " + err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handleViewLoanDetails = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsDetailModalOpen(true);
  };

  // --- ADMIN HANDLERS ---
  const handleCreateInvite = async (role: 'admin' | 'user', canEdit: boolean) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setDataLoading(true);
    try {
      await dataServiceSupabase.createInvite({
        code,
        created_by: session.user.id,
        role,
        can_edit_items: canEdit,
        max_uses: 1,
        uses: 0
      });
      await loadAdminData();
    } catch (err: any) {
      alert("Erro ao criar convite: " + err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handleUpdateProfilePermissions = async (userId: string, role: 'admin' | 'user', canEdit: boolean) => {
    setDataLoading(true);
    try {
      await dataServiceSupabase.updateProfile(userId, { role, can_edit_items: canEdit });
      await loadAdminData();
    } catch (err: any) {
      alert("Erro ao atualizar perfil: " + err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const isDark = theme === 'dark';
  const sidebarClass = isDark ? 'bg-black border-zinc-900' : 'bg-zinc-50 border-zinc-200';
  const mobileNavClass = isDark ? 'bg-black/80 border-zinc-900 backdrop-blur-2xl' : 'bg-white/80 border-zinc-100 backdrop-blur-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.05)]';
  const mainClass = isDark ? 'bg-black text-white' : 'bg-white text-black';
  const filterSectionClass = isDark ? 'bg-zinc-950/50 border-zinc-900' : 'bg-zinc-50 border-zinc-200';

  const NAV_ITEMS = [
    { 
      id: 'inventory', 
      label: 'Acervo', 
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
    },
    { 
      id: 'loans', 
      label: 'Saídas', 
      icon: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' 
    },
    { id: 'categories', label: 'Pastas', icon: 'M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z' },
    { id: 'settings', label: 'Ajustes', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    ...(profile?.role === 'admin' ? [{ id: 'admin', label: 'Painel', icon: 'M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0112 3c1.75 0 3.376.448 4.793 1.235m1.34 1.34A10.003 10.003 0 0121 12c0 1.268-.235 2.48-.664 3.593m-1.34 1.34A10.003 10.003 0 0112 21a10.003 10.003 0 01-8.336-4.472M12 11a1 1 0 100-2 1 1 0 000 2z' }] : [])
  ];

  const sortedLoans = useMemo(() => {
    return [...loans].sort((a,b) => b.loanDate.localeCompare(a.loanDate));
  }, [loans]);

  if (authLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-[10px] uppercase tracking-[0.3em] font-black animate-pulse italic">Autenticando Perfil...</div>
    </div>
  );

  if (!session) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row ${mainClass} selection:bg-white selection:text-black`}>
      {dataLoading && (
        <div className="fixed top-0 left-0 right-0 h-[2px] z-[100] overflow-hidden bg-zinc-900">
           <div className="h-full bg-white animate-[loading_1s_infinite] w-1/2"></div>
        </div>
      )}

      {/* DESKTOP ASIDE */}
      <aside className={`hidden lg:flex w-72 border-r flex-shrink-0 flex-col no-print ${sidebarClass}`}>
        <div className="p-10 pb-4">
          <h1 className="text-3xl font-black tracking-tighter italic uppercase">ACERVO</h1>
          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-2">Ministério de Teatro</p>
        </div>
        
        {profile && (
          <div className="px-10 mb-8 animate-in fade-in duration-700">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-zinc-200 truncate">Olá, {profile.display_name}</span>
              <Badge variant={profile.role === 'admin' ? 'success' : 'default'}>
                {profile.role === 'admin' ? 'ADMIN' : 'USUÁRIO'}
              </Badge>
            </div>
            {!profile.can_edit_items && profile.role !== 'admin' && (
              <p className="text-[9px] uppercase font-bold text-zinc-600 tracking-tighter italic">Acesso de visualização</p>
            )}
          </div>
        )}
        
        <nav className="flex-1 px-6 space-y-2">
          {NAV_ITEMS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as ViewType)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs uppercase font-black tracking-widest transition-all ${
                activeView === tab.id 
                ? (isDark ? 'bg-white text-black' : 'bg-black text-white')
                : `text-zinc-500 hover:text-white ${isDark ? 'hover:bg-zinc-900' : 'hover:bg-zinc-100 hover:text-black'}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={tab.icon}/>
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-zinc-900">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs uppercase font-black text-zinc-600 hover:text-white hover:bg-zinc-900 transition-all"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
             Sair
           </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-5 md:p-10 pb-32 lg:pb-10">
        
        {activeView === 'inventory' && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4 md:pt-0">
              <div>
                <h2 className="text-4xl font-black tracking-tighter uppercase italic">Inventário</h2>
                <p className="text-zinc-500 text-sm mt-1">Gestão inteligente do acervo teatral.</p>
              </div>
              {(profile?.can_edit_items || profile?.role === 'admin') && (
                <Button onClick={() => { setItemForm({}); setIsItemModalOpen(true); }} className="w-full md:w-auto">
                  + Novo Item
                </Button>
              )}
            </header>

            <div className={`flex flex-col md:flex-row gap-4 p-4 border rounded-[2rem] ${filterSectionClass}`}>
              <div className="flex-1 relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <Input 
                  placeholder="Procurar no acervo..." 
                  className="pl-12 py-4 border-none bg-transparent"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select 
                className="md:w-60 border-none bg-transparent py-4" 
                value={catFilter} 
                onChange={(e) => setCatFilter(e.target.value)}
              >
                <option value="all">Todas as Pastas</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filteredItems.map(item => (
                <Card key={item.id} className="group flex flex-col h-full border-zinc-900/50 hover:border-zinc-700 transition-all duration-300">
                  <div className={`aspect-square relative overflow-hidden p-3 ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
                    <div className="w-full h-full rounded-[1.5rem] overflow-hidden bg-zinc-900 border border-zinc-900">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-800">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                          </div>
                        )}
                    </div>
                    <div className="absolute top-6 left-6 flex flex-wrap gap-2">
                      <Badge variant={item.status === 'Disponível' ? 'success' : 'warning'}>{item.status}</Badge>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col flex-1">
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">{categories.find(c => c.id === item.categoryId)?.name}</span>
                        <span className="text-[10px] text-zinc-700 font-mono">{item.code}</span>
                      </div>
                      <h3 className="text-xl font-bold tracking-tight mt-1">{item.name}</h3>
                      <div className="flex items-center gap-2 mt-3 text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                         {item.location}
                         <span className="mx-1">•</span>
                         {item.quantity} UN
                      </div>
                    </div>
                    <div className="flex gap-2 mt-8">
                      <Button 
                        fullWidth 
                        variant={item.status === 'Disponível' ? 'primary' : 'secondary'}
                        onClick={() => { 
                          if (item.status === 'Disponível') {
                            setSelectedItem(item); 
                            setIsLoanModalOpen(true); 
                          } else {
                            const loan = loans.find(l => l.itemId === item.id && l.status === 'Ativo');
                            if (loan) handleViewLoanDetails(loan);
                          }
                        }}
                      >
                        {item.status === 'Disponível' ? 'Retirar' : 'Info'}
                      </Button>
                      {(profile?.can_edit_items || profile?.role === 'admin') && (
                        <Button 
                          variant="secondary" 
                          className="px-4"
                          onClick={() => { 
                            setItemForm(item); 
                            setIsItemModalOpen(true); 
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeView === 'admin' && profile?.role === 'admin' && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
             <header className="pt-4 md:pt-0">
              <h2 className="text-4xl font-black tracking-tighter uppercase italic">Painel Admin</h2>
              <p className="text-zinc-500 text-sm mt-1">Controle de acessos, convites e permissões.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* INVITES SECTION */}
               <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black uppercase tracking-widest italic">Convites Ativos</h3>
                    <div className="flex gap-2">
                       <Button variant="outline" onClick={() => handleCreateInvite('user', false)}>+ Convite User</Button>
                       <Button variant="outline" onClick={() => handleCreateInvite('user', true)}>+ Convite Editor</Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {invites.map(inv => (
                      <Card key={inv.id} className="p-5 border-zinc-900">
                        <div className="flex justify-between items-center">
                           <div>
                              <p className="text-lg font-black font-mono tracking-tighter text-white">{inv.code}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge>{inv.role}</Badge>
                                {inv.can_edit_items && <Badge variant="success">PODE EDITAR</Badge>}
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] text-zinc-500 font-bold uppercase">Usos: {inv.uses}/{inv.max_uses}</p>
                              <button onClick={() => inv.id && dataServiceSupabase.deleteInvite(inv.id).then(loadAdminData)} className="text-zinc-700 hover:text-white mt-2 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                              </button>
                           </div>
                        </div>
                      </Card>
                    ))}
                  </div>
               </div>

               {/* PROFILES SECTION */}
               <div className="space-y-6">
                  <h3 className="text-lg font-black uppercase tracking-widest italic">Membros do Ministério</h3>
                  <div className="space-y-3">
                    {profiles.map(p => (
                      <Card key={p.user_id} className="p-5 border-zinc-900">
                         <div className="flex justify-between items-center">
                            <div>
                               <p className="font-bold text-sm text-white">{p.display_name}</p>
                               <div className="flex gap-2 mt-1">
                                 <Badge variant={p.role === 'admin' ? 'success' : 'default'}>{p.role}</Badge>
                                 <Badge variant={p.can_edit_items ? 'success' : 'default'}>{p.can_edit_items ? 'Editor' : 'Leitor'}</Badge>
                               </div>
                            </div>
                            {p.user_id !== session.user.id && (
                               <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleUpdateProfilePermissions(p.user_id, p.role === 'admin' ? 'user' : 'admin', p.can_edit_items)}
                                    className="p-2 border border-zinc-800 rounded-lg hover:bg-zinc-900 text-[9px] font-black uppercase"
                                  >
                                    Mudar Role
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateProfilePermissions(p.user_id, p.role, !p.can_edit_items)}
                                    className="p-2 border border-zinc-800 rounded-lg hover:bg-zinc-900 text-[9px] font-black uppercase"
                                  >
                                    Permissão Item
                                  </button>
                               </div>
                            )}
                         </div>
                      </Card>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeView === 'loans' && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
            <header className="pt-4 md:pt-0">
              <h2 className="text-4xl font-black tracking-tighter uppercase italic">Empréstimos</h2>
              <p className="text-zinc-500 text-sm mt-1">Fluxo de saídas e retornos em tempo real.</p>
            </header>

            <div className="space-y-4">
              {loans.length === 0 ? (
                <div className="py-32 text-center text-zinc-700 border-2 border-dashed border-zinc-900 rounded-[2.5rem]">
                  <p className="text-xs uppercase font-black tracking-[0.3em]">Sem atividade registrada</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {sortedLoans.map(loan => (
                    <Card key={loan.id} className="p-6 border-zinc-900/50 flex flex-col gap-6">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
                                    <img src={loan.borrowerPhoto} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-none mb-1">{loan.borrowerName}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{loan.ministry}</p>
                                </div>
                            </div>
                            <Badge variant={loan.status === 'Ativo' ? 'warning' : 'success'}>{loan.status}</Badge>
                        </div>
                        
                        <div className="bg-zinc-950/50 p-5 rounded-2xl border border-zinc-900">
                            <span className="text-[10px] font-black uppercase text-zinc-600 block mb-1">Item Retirado</span>
                            <p className="font-bold text-sm">{loan.itemName}</p>
                            <div className="flex justify-between mt-4 text-[11px] font-bold text-zinc-500 uppercase tracking-tight">
                                <span>Saída: {new Date(loan.loanDate).toLocaleDateString('pt-BR')}</span>
                                <span className={loan.status === 'Ativo' && new Date() > new Date(loan.dueDate) ? 'text-white underline underline-offset-4' : ''}>
                                    Entrega: {new Date(loan.dueDate).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="secondary" fullWidth onClick={() => handleViewLoanDetails(loan)}>Detalhes</Button>
                            {loan.status === 'Ativo' && (
                                <Button variant="primary" fullWidth onClick={() => { setSelectedLoan(loan); setIsReturnModalOpen(true); }}>Devolver</Button>
                            )}
                        </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {(activeView === 'categories' || activeView === 'settings') && (
            <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in duration-500">
                 <h2 className="text-4xl font-black uppercase italic tracking-tighter">{activeView === 'categories' ? 'Pastas' : 'Ajustes'}</h2>
                 {activeView === 'categories' && (
                    <Card className="p-8 space-y-6">
                        {(profile?.can_edit_items || profile?.role === 'admin') ? (
                          <form className="flex gap-2" onSubmit={(e) => {
                              e.preventDefault();
                              const form = e.target as HTMLFormElement;
                              const name = (form.elements.namedItem('catName') as HTMLInputElement).value;
                              if (name) { handleAddCategory(name); form.reset(); }
                          }}>
                              <Input name="catName" placeholder="Nova pasta..." />
                              <Button type="submit">Add</Button>
                          </form>
                        ) : (
                          <p className="text-[10px] font-black uppercase text-zinc-700 tracking-widest text-center py-2 border border-dashed border-zinc-900 rounded-xl">Visualização apenas</p>
                        )}
                        <div className="space-y-2">
                            {categories.map(cat => (
                                <div key={cat.id} className="flex justify-between items-center p-4 rounded-xl bg-zinc-900/50 border border-zinc-900">
                                    <span className="font-bold uppercase text-xs tracking-widest">{cat.name}</span>
                                    {(profile?.can_edit_items || profile?.role === 'admin') && (
                                      <button onClick={() => handleDeleteCategory(cat.id)} className="text-zinc-600 hover:text-white">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                      </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                 )}
                 {activeView === 'settings' && (
                    <div className="space-y-4">
                        <Card className="p-8 flex justify-between items-center">
                            <div>
                                <h3 className="font-black uppercase text-sm tracking-widest">Tema Visual</h3>
                                <p className="text-xs text-zinc-500 mt-1">Alternar entre claro e escuro.</p>
                            </div>
                            <Button variant="secondary" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                                {theme === 'dark' ? 'Luz' : 'Trevas'}
                            </Button>
                        </Card>
                        <Card className="p-8 flex justify-between items-center border-zinc-800">
                            <div>
                                <h3 className="font-black uppercase text-sm tracking-widest text-zinc-400">Exportar Dados</h3>
                                <p className="text-xs text-zinc-600 mt-1">Salvar cópia do acervo em JSON.</p>
                            </div>
                            <Button variant="outline" className="border-zinc-800" onClick={() => {
                                const data = { categories, items, loans };
                                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `backup_acervo_${new Date().toISOString().split('T')[0]}.json`;
                                a.click();
                            }}>Exportar</Button>
                        </Card>
                        <Button variant="danger" fullWidth onClick={handleLogout} className="mt-10 py-5">Desconectar da Sessão</Button>
                    </div>
                 )}
            </div>
        )}

      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className={`lg:hidden fixed bottom-6 left-6 right-6 h-20 rounded-[2rem] border z-[60] flex items-center justify-around px-2 no-print ${mobileNavClass}`}>
        {NAV_ITEMS.map(tab => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as ViewType)}
              className={`flex flex-col items-center justify-center gap-1.5 w-full h-full transition-all duration-300 ${
                isActive ? 'text-white' : 'text-zinc-600'
              }`}
            >
              <div className={`p-2 rounded-xl transition-all duration-500 ${isActive ? (isDark ? 'bg-zinc-800 scale-110' : 'bg-black text-white scale-110') : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "3" : "2"} strokeLinecap="round" strokeLinejoin="round">
                  <path d={tab.icon}/>
                </svg>
              </div>
              <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      <Modal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} title="Termo de Saída">
        <div className="space-y-8 pb-10">
           <div className="space-y-6">
                <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Responsável</label>
                    <Input value={loanForm.borrowerName} onChange={e => setLoanForm({...loanForm, borrowerName: e.target.value})} placeholder="Nome completo" />
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Departamento</label>
                    <div className="grid grid-cols-2 gap-2">
                        {MINISTRIES.map(m => (
                            <button key={m} onClick={() => setLoanForm({...loanForm, ministry: m})} className={`px-4 py-3 text-[10px] font-black uppercase rounded-xl border transition-all ${loanForm.ministry === m ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Finalidade</label>
                        <Input value={loanForm.reason} onChange={e => setLoanForm({...loanForm, reason: e.target.value})} placeholder="Ex: Culto de Jovens" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Devolução Prevista</label>
                        <Input type="date" value={loanForm.dueDate} onChange={e => setLoanForm({...loanForm, dueDate: e.target.value})} />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Foto de Identificação</label>
                    {loanForm.photo ? (
                        <div className="relative rounded-[2rem] overflow-hidden border-2 border-zinc-800">
                            <img src={loanForm.photo} className="w-full aspect-video object-cover" />
                            <button onClick={() => setLoanForm({...loanForm, photo: ''})} className="absolute top-4 right-4 p-3 bg-black/80 rounded-full text-white backdrop-blur-md">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>
                    ) : (
                        <CameraCapture onCapture={(img) => setLoanForm({...loanForm, photo: img})} onCancel={() => {}} />
                    )}
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Assinatura Digital</label>
                    <SignatureCanvas onSave={(sig) => setLoanForm({...loanForm, signature: sig})} onClear={() => {}} isDark={isDark} />
                </div>
                <div className="flex items-start gap-4 p-6 rounded-[2rem] border border-zinc-900 bg-zinc-950/40">
                    <input type="checkbox" id="consent" className="mt-1.5 h-5 w-5 rounded-md border-zinc-800 bg-black accent-white" checked={loanForm.consent} onChange={e => setLoanForm({...loanForm, consent: e.target.checked})} />
                    <label htmlFor="consent" className="text-[11px] leading-relaxed text-zinc-500 font-bold uppercase">Autorizo o registro digital para controle do acervo e comprometo-me com a integridade do item.</label>
                </div>
           </div>
           <Button onClick={handleCreateLoan} fullWidth className="py-5">Finalizar Retirada</Button>
        </div>
      </Modal>

      <ConfirmDialog 
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={performLogout}
        title="Sair"
        message="Deseja realmente sair do sistema de gestão do acervo?"
        confirmLabel="Sair agora"
        cancelLabel="Voltar"
      />

      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Detalhes do Registro">
        {selectedLoan && (
          <div className="space-y-8 pb-10">
            <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden border-2 border-zinc-900 shadow-2xl">
              <img src={selectedLoan.borrowerPhoto} className="w-full h-full object-cover grayscale" alt="Responsável" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-8">
                 <Badge variant={selectedLoan.status === 'Ativo' ? 'warning' : 'success'}>{selectedLoan.status}</Badge>
                 <h3 className="text-3xl font-black italic uppercase tracking-tighter mt-2">{selectedLoan.borrowerName}</h3>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{selectedLoan.ministry}</p>
              </div>
            </div>
            <div className="bg-zinc-900/40 p-6 rounded-[2rem] border border-zinc-900 flex flex-col gap-4">
                <section>
                    <span className="text-[10px] font-black uppercase text-zinc-600 block mb-1">Item</span>
                    <p className="font-bold text-sm uppercase">{selectedLoan.itemName}</p>
                </section>
                <section>
                    <span className="text-[10px] font-black uppercase text-zinc-600 block mb-1">Finalidade</span>
                    <p className="text-sm italic text-zinc-300">"{selectedLoan.reason || 'Não informado'}"</p>
                </section>
            </div>
            <div className="bg-zinc-900/40 p-6 rounded-[2rem] border border-zinc-900">
                <span className="text-[10px] font-black uppercase text-zinc-600 block mb-4">Assinatura Digital</span>
                <img src={selectedLoan.signature} className="h-16 object-contain invert opacity-80" alt="Assinatura" />
            </div>
            <Button variant="secondary" fullWidth onClick={() => setIsDetailModalOpen(false)}>Fechar Detalhes</Button>
          </div>
        )}
      </Modal>

      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title="Ficha do Item">
        <div className="space-y-6 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Identificador</label>
                        <Input value={itemForm.name || ''} onChange={e => setItemForm({...itemForm, name: e.target.value})} placeholder="Ex: Túnica de Seda" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Cód. Interno</label>
                            <Input value={itemForm.code || ''} onChange={e => setItemForm({...itemForm, code: e.target.value})} placeholder="FIG-001" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Estoque</label>
                            <Input type="number" value={itemForm.quantity || 1} onChange={e => setItemForm({...itemForm, quantity: parseInt(e.target.value)})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Pasta</label>
                        <Select value={itemForm.categoryId || ''} onChange={e => setItemForm({...itemForm, categoryId: e.target.value})}>
                            <option value="">Selecione...</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Foto de Referência</label>
                    {itemForm.imageUrl ? (
                        <div className="relative rounded-[2rem] overflow-hidden border-2 border-zinc-800">
                            <img src={itemForm.imageUrl} className="w-full aspect-square object-cover" />
                            <button onClick={() => setItemForm({...itemForm, imageUrl: ''})} className="absolute top-4 right-4 p-3 bg-black/80 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>
                    ) : (
                        <CameraCapture onCapture={(img) => setItemForm({...itemForm, imageUrl: img})} onCancel={() => {}} />
                    )}
                </div>
            </div>
            <Button onClick={handleSaveItem} fullWidth className="py-5">Salvar Alterações</Button>
        </div>
      </Modal>

      <Modal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} title="Confirmar Devolução">
        <div className="space-y-8 pb-10 text-center">
            <div className="flex justify-center">
                <div className="w-24 h-24 rounded-[2rem] border-4 border-zinc-900 overflow-hidden shadow-2xl">
                    <img src={selectedLoan?.borrowerPhoto} className="w-full h-full object-cover" />
                </div>
            </div>
            <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">{selectedLoan?.borrowerName}</h3>
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-[0.2em] mt-2">Retornando: {selectedLoan?.itemName}</p>
            </div>
            <div className="text-left space-y-4 bg-zinc-950/50 p-6 rounded-[2rem] border border-zinc-900">
                <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-600 mb-2 tracking-widest">Estado na Devolução</label>
                    <Select value={returnForm.condition} onChange={e => setReturnForm({...returnForm, condition: e.target.value as any})}>
                        {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </Select>
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-600 mb-2 tracking-widest">Observações</label>
                    <textarea 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                        rows={3}
                        placeholder="Alguma avaria ou detalhe?"
                        value={returnForm.observations}
                        onChange={e => setReturnForm({...returnForm, observations: e.target.value})}
                    />
                </div>
            </div>
            <Button onClick={handleReturnItem} fullWidth className="py-5">Confirmar Recebimento</Button>
        </div>
      </Modal>
    </div>
  );
};

export default App;
