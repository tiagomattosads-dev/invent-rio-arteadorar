
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ViewType, 
  Item, 
  Category, 
  Loan, 
  ItemCondition,
  Profile,
  Invite,
  UserRole
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
  const [isSplashVisible, setIsSplashVisible] = useState(false);
  const splashStarted = useRef(false);

  // --- APP STATE ---
  const [activeView, setActiveView] = useState<ViewType>('inventory');
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [dataLoading, setDataLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  
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
        bootstrapProfile(session);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        bootstrapProfile(session);
      } else {
        setProfile(null);
        setAuthLoading(false);
        // Reset splash state on logout to allow it to show on next login
        sessionStorage.removeItem('splash_shown');
        splashStarted.current = false;
      }
    });

    const storedTheme = storageService.getTheme();
    if (storedTheme) setTheme(storedTheme);

    return () => subscription.unsubscribe();
  }, []);

  // PARTE A: Control Splash Screen visibility with fixed timers
  useEffect(() => {
    const splashShown = sessionStorage.getItem('splash_shown');
    // FIXED DURATION LOGIC (4s) + FAIL-SAFE (4.5s)
    if (session && !authLoading && !splashShown && !splashStarted.current) {
      splashStarted.current = true;
      setIsSplashVisible(true);
      sessionStorage.setItem('splash_shown', 'true');
      
      const primaryTimer = setTimeout(() => {
        setIsSplashVisible(false);
        setActiveView('inventory');
      }, 4000);

      const failSafeTimer = setTimeout(() => {
        setIsSplashVisible(false);
        setActiveView('inventory');
      }, 4500);

      return () => {
        clearTimeout(primaryTimer);
        clearTimeout(failSafeTimer);
      };
    }
  }, [session, authLoading]);

  const bootstrapProfile = async (currentSession: any) => {
    const { user } = currentSession;
    const userId = user.id;
    
    try {
      // 1. Verificar se há convite pendente para resgate
      const pendingCode = localStorage.getItem('pending_invite_code');
      if (pendingCode) {
        try {
          await dataServiceSupabase.redeemInvite(pendingCode);
          localStorage.removeItem('pending_invite_code');
        } catch (err) {
          console.error("Erro ao resgatar convite pendente:", err);
        }
      }

      // 2. Buscar perfil existente
      let userProfile = await dataServiceSupabase.getProfile(userId);
      
      // 3. Prioridade de Nome: Metadata (Cadastro) > Fallback Genérico (NUNCA email)
      const metaName = user.user_metadata?.full_name;
      const finalDisplayName = metaName || 'Usuário';

      // 4. Criar ou Atualizar perfil (Overwrite de display_name)
      if (!userProfile) {
        userProfile = await dataServiceSupabase.createProfile({
          user_id: userId,
          display_name: finalDisplayName,
          role: 'user',
          can_edit_items: false
        });
      } else if (metaName && userProfile.display_name !== metaName) {
        // Se o nome no Auth Metadata mudou (ex: no cadastro recente), atualiza o Profile
        await dataServiceSupabase.updateProfile(userId, { display_name: metaName });
        userProfile = { ...userProfile, display_name: metaName };
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
      showAlert("Erro ao criar empréstimo: " + err.message, 'Erro');
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
      showAlert("Erro ao devolver item: " + err.message, 'Erro');
    } finally {
      setDataLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!profile?.can_edit_items && profile?.role !== 'admin') {
      showAlert("Você não tem permissão para editar itens.");
      return;
    }
    if (!itemForm.name || !itemForm.categoryId) {
      showAlert('Preencha pelo menos o nome e a categoria do item.');
      return;
    }
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
      showAlert("Erro ao salvar item: " + err.message, 'Erro');
    } finally {
      setDataLoading(false);
    }
  };

  const handleAddCategory = async (name: string) => {
    if (!profile?.can_edit_items && profile?.role !== 'admin') return;
    setDataLoading(true);
    try {
      await dataServiceSupabase.createCategory(name);
      await loadAllData();
    } catch (err: any) {
      showAlert("Erro ao criar categoria: " + err.message, 'Erro');
    } finally {
      setDataLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!profile?.can_edit_items && profile?.role !== 'admin') return;
    showConfirm('Deseja realmente excluir esta categoria? Os itens vinculados a ela não serão excluídos, mas ficarão sem categoria.', 'Confirmar Exclusão', async () => {
      setDataLoading(true);
      try {
        await dataServiceSupabase.deleteCategory(id);
        await loadAllData();
      } catch (err: any) {
        showAlert("Erro ao excluir categoria: " + err.message, 'Erro');
      } finally {
        setDataLoading(false);
      }
    });
  };

  const handleViewLoanDetails = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsDetailModalOpen(true);
  };

  // --- ADMIN HANDLERS ---
  const handleGenerateInvite = async (role: UserRole, canEdit: boolean) => {
    if (profile?.role !== 'admin') return;
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
      showAlert("Erro ao gerar convite: " + err.message, 'Erro');
    } finally {
      setDataLoading(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    if (profile?.role !== 'admin') return;
    showConfirm('Excluir este convite permanentemente?', 'Confirmar Revogação', async () => {
      setDataLoading(true);
      try {
        await dataServiceSupabase.deleteInvite(id);
        await loadAdminData();
      } catch (err: any) {
        showAlert("Erro ao excluir convite: " + err.message, 'Erro');
      } finally {
        setDataLoading(false);
      }
    });
  };

  const handleUpdateUserProfile = async (userId: string, updates: Partial<Profile>) => {
    if (profile?.role !== 'admin') return;
    setDataLoading(true);
    try {
      await dataServiceSupabase.updateProfile(userId, updates);
      await loadAdminData();
    } catch (err: any) {
      showAlert("Erro ao atualizar perfil: " + err.message, 'Erro');
    } finally {
      setDataLoading(false);
    }
  };

  const canEdit = profile?.role === 'admin' || profile?.can_edit_items === true;
  const isAdmin = profile?.role === 'admin';

  const isDark = theme === 'dark';
  const sidebarClass = isDark ? 'bg-zinc-950 border-zinc-900' : 'bg-zinc-50 border-zinc-200';
  const mobileNavClass = isDark ? 'bg-zinc-950/90 border-zinc-900 backdrop-blur-md' : 'bg-white/90 border-zinc-200 backdrop-blur-md shadow-[0_-2px_10px_rgba(0,0,0,0.05)]';
  const mainClass = isDark ? 'bg-black text-white' : 'bg-white text-black';
  const filterSectionClass = isDark ? 'bg-zinc-950 border-zinc-900' : 'bg-zinc-50/50 border-zinc-200';

  const NAV_ITEMS = [
    { 
      id: 'inventory', 
      label: 'Itens', 
      icon: 'https://res.cloudinary.com/dutufef4s/image/upload/v1770911547/box-open_hbnaza.svg',
      isUrl: true
    },
    { 
      id: 'loans', 
      label: 'Emprestados', 
      icon: 'https://res.cloudinary.com/dutufef4s/image/upload/v1770912478/grab_z6q4u6.png',
      isUrl: true 
    },
    { id: 'categories', label: 'Categorias', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'settings', label: 'Ajustes', icon: 'M12.22 2h-.44a2 2 0 0 0-2 2 2 2 0 0 1-2 2 2 2 0 0 0-2 2 2 2 0 0 1-2 2 2 2 0 0 0-2 2 2 2 0 0 1 0 4 2 2 0 0 0 2 2 2 2 0 0 1 2 2 2 2 0 0 0 2 2 2 2 0 0 1 2 2 2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2 2 2 0 0 1 2-2 2 2 0 0 0 2-2 2 2 0 0 1 2-2 2 2 0 0 0 2-2 2 2 0 0 1 0-4 2 2 0 0 0-2-2 2 2 0 0 1-2-2 2 2 0 0 0-2-2 2 2 0 0 1-2-2 2 2 0 0 0-2-2zM12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }] : [])
  ];

  const sortedLoans = useMemo(() => {
    return [...loans].sort((a,b) => b.loanDate.localeCompare(a.loanDate));
  }, [loans]);

  if (authLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-xs uppercase tracking-widest font-bold animate-pulse">Iniciando Sistema...</div>
    </div>
  );

  if (!session) {
    return <Login onLogin={() => {}} />;
  }

  // PARTE B: Priority for name display on Splash (REMOVIDO EMAIL)
  if (isSplashVisible) {
    // Priority: profile.display_name > metadata.full_name > Fallback
    const displayName = profile?.display_name || session?.user?.user_metadata?.full_name || 'Usuário';
    return (
      <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center animate-in fade-in duration-500 ${isDark ? 'bg-black text-white' : 'bg-white text-black'}`}>
        <div className="flex flex-col items-center gap-6 max-w-sm px-6 text-center">
          <div className={`w-24 h-24 p-5 rounded-3xl overflow-hidden flex items-center justify-center shadow-lg transition-all duration-500 ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-50 border border-zinc-200'}`}>
            <img 
              src="https://res.cloudinary.com/dutufef4s/image/upload/v1770989288/theatre_njtpog.png" 
              alt="Logo" 
              className={`w-16 h-16 object-contain grayscale ${isDark ? 'invert' : ''}`}
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter uppercase">Acervo Teatro</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em]">Boas-vindas, {displayName}</p>
          </div>
          <div className="pt-4 flex flex-col items-center gap-4">
            <div className="flex gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce"></div>
            </div>
            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest animate-pulse">Carregando Acervo...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row ${mainClass}`}>
      {dataLoading && (
        <div className="fixed top-0 left-0 right-0 h-1 z-[100] overflow-hidden bg-zinc-900">
           <div className="h-full bg-white animate-[loading_1.5s_infinite] w-1/3"></div>
        </div>
      )}

      <aside className={`hidden lg:flex w-64 border-r flex-shrink-0 flex-col no-print ${sidebarClass}`}>
        <div className="p-8">
          <h1 className={`text-xl font-bold tracking-tighter flex items-center gap-2 ${isDark ? 'text-white' : 'text-black'}`}>
            {!logoError ? (
              <img 
                src="https://res.cloudinary.com/dutufef4s/image/upload/v1770989288/theatre_njtpog.png" 
                alt="Acervo Teatro" 
                className={`w-6 h-6 object-contain grayscale ${isDark ? 'invert' : ''}`}
                onError={() => setLogoError(true)}
              />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-1.9a1.9 1.9 0 0 0 0-2.6L4.1 15.7a1.9 1.9 0 0 1 0-2.6L12 5.2a1.9 1.9 0 0 1 2.6 0l.8.8a1.9 1.9 0 0 0 2.6 0l1.9-1.9a1.9 1.9 0 0 1 2.6 0l.5.5"/><path d="m15 15 6 6"/><path d="m17.5 17.5 2.5 2.5"/></svg>
            )}
            ACERVO TEATRO
          </h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Gestão de Inventário</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {NAV_ITEMS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as ViewType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                activeView === tab.id 
                ? (isDark ? 'bg-white text-black font-bold' : 'bg-black text-white font-bold')
                : `text-zinc-500 hover:text-white ${isDark ? 'hover:bg-zinc-900' : 'hover:bg-zinc-200 hover:text-black'}`
              }`}
            >
              {tab.isUrl ? (
                <div 
                  style={{ 
                    maskImage: `url(${tab.icon})`, 
                    WebkitMaskImage: `url(${tab.icon})`,
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain'
                  }}
                  className="w-[18px] h-[18px] bg-current" 
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={tab.icon as string}/>
                </svg>
              )}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-900 mt-auto">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-all"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
             Sair do Sistema
           </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 pb-24 lg:pb-10">
        
        {activeView === 'inventory' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Itens do Acervo</h2>
                <p className="text-zinc-500">Gerencie o acervo de figurinos e cenários.</p>
              </div>
              {canEdit && (
                <Button onClick={() => { setItemForm({}); setIsItemModalOpen(true); }} variant="primary">
                  + Novo Item
                </Button>
              )}
            </header>

            {!canEdit && (
              <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-500 italic">
                Você não tem permissão para editar itens. Entre em contato com um administrador para solicitar permissões de edição.
              </div>
            )}

            <div className={`flex flex-col md:flex-row gap-4 p-4 border rounded-lg ${filterSectionClass}`}>
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <Input 
                  placeholder="Buscar por nome ou código..." 
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select 
                className="md:w-48" 
                value={catFilter} 
                onChange={(e) => setCatFilter(e.target.value)}
              >
                <option value="all">Todas Categorias</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <Card key={item.id} className="group flex flex-col h-full">
                  <div className={`aspect-[4/3] relative overflow-hidden ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2 pointer-events-none">
                      <Badge variant={item.status === 'Disponível' ? 'success' : 'warning'}>{item.status}</Badge>
                      <Badge>{item.condition}</Badge>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1 gap-4">
                    <div className="flex-1">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{categories.find(c => c.id === item.categoryId)?.name} • {item.code}</span>
                      <h3 className={`text-lg font-bold truncate leading-tight mt-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{item.name}</h3>
                      <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                         {item.location}
                         <span className="mx-1">•</span>
                         {item.quantity} un.
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        fullWidth 
                        variant={item.status === 'Disponível' ? 'primary' : 'outline'}
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
                        {item.status === 'Disponível' ? 'Emprestar' : 'Ver Empréstimo'}
                      </Button>
                      {canEdit && (
                        <Button 
                          variant="secondary" 
                          className="px-2"
                          disabled={item.status === 'Emprestado'}
                          onClick={() => { 
                            if (item.status !== 'Emprestado') {
                              setItemForm(item); 
                              setIsItemModalOpen(true); 
                            }
                          }}
                          title={item.status === 'Emprestado' ? "Item em uso (devolva para editar)" : "Editar item"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"/></svg>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full py-20 text-center text-zinc-500 bg-zinc-50 dark:bg-zinc-900/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  <p>Nenhum item encontrado.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'loans' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header>
              <h2 className="text-3xl font-bold tracking-tight">Itens Emprestados</h2>
              <p className="text-zinc-500">Acompanhe retiradas e devoluções em tempo real.</p>
            </header>

            {/* DESKTOP TABLE VIEW */}
            <div className={`hidden lg:block overflow-x-auto border rounded-xl shadow-sm ${isDark ? 'bg-zinc-950 border-zinc-900 shadow-none' : 'bg-white border-zinc-200'}`}>
              <table className="w-full text-sm text-left">
                <thead className={`text-xs uppercase border-b ${isDark ? 'bg-zinc-900/50 text-zinc-500 border-zinc-900' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}`}>
                  <tr>
                    <th className="px-6 py-5 font-bold">Item</th>
                    <th className="px-6 py-5 font-bold">Responsável</th>
                    <th className="px-6 py-5 font-bold">Retirada</th>
                    <th className="px-6 py-5 font-bold">Entrega Prevista</th>
                    <th className="px-6 py-5 font-bold">Status</th>
                    <th className="px-6 py-5 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-zinc-900' : 'divide-zinc-200'}`}>
                  {loans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-zinc-400">Nenhum registro de empréstimo.</td>
                    </tr>
                  ) : (
                    sortedLoans.map(loan => (
                      <tr 
                        key={loan.id} 
                        className={`${isDark ? 'hover:bg-zinc-900/30' : 'hover:bg-zinc-50/50'} transition-colors cursor-pointer group`}
                        onClick={() => handleViewLoanDetails(loan)}
                      >
                        <td className="px-6 py-4">
                          <div className={`font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{loan.itemName}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">ID: {loan.itemId.slice(0,8).toUpperCase()}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                              <img src={loan.borrowerPhoto} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <div className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{loan.borrowerName}</div>
                              <div className="text-[10px] text-zinc-500 font-bold uppercase">{loan.ministry}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 tabular-nums">
                          {new Date(loan.loanDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                           <span className={new Date() > new Date(loan.dueDate) && loan.status === 'Ativo' ? 'text-red-500 font-bold underline decoration-2 underline-offset-4' : 'text-zinc-500 tabular-nums'}>
                            {new Date(loan.dueDate).toLocaleDateString('pt-BR')}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={loan.status === 'Ativo' ? 'warning' : 'success'}>
                            {loan.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                          {loan.status === 'Ativo' ? (
                            <Button variant="secondary" onClick={() => { setSelectedLoan(loan); setIsReturnModalOpen(true); }}>
                              Devolver
                            </Button>
                          ) : (
                            <div className="flex items-center justify-end gap-1 text-zinc-400">
                               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                               <span className="text-[10px] font-bold uppercase">Finalizado</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE SIMPLIFIED VIEW */}
            <div className="lg:hidden space-y-4">
              {loans.length === 0 ? (
                <div className="py-20 text-center text-zinc-400 border border-dashed border-zinc-800 rounded-xl">
                  Nenhum registro de empréstimo.
                </div>
              ) : (
                sortedLoans.map(loan => (
                  <Card key={loan.id} className="p-5 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Item</span>
                         {loan.status === 'Ativo' && new Date() > new Date(loan.dueDate) && (
                           <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Atrasado</span>
                         )}
                      </div>
                      <h3 className={`font-bold text-lg leading-tight ${isDark ? 'text-white' : 'text-black'}`}>{loan.itemName}</h3>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Responsável</span>
                      <p className={`font-semibold flex items-center gap-2 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                         <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-800">
                           <img src={loan.borrowerPhoto} className="w-full h-full object-cover" />
                         </div>
                         {loan.borrowerName}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button variant="secondary" fullWidth onClick={() => handleViewLoanDetails(loan)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        Ver Detalhes
                      </Button>
                      {loan.status === 'Ativo' ? (
                        <Button variant="primary" fullWidth onClick={() => { setSelectedLoan(loan); setIsReturnModalOpen(true); }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                          Devolver
                        </Button>
                      ) : (
                        <div className={`flex items-center justify-center gap-2 border rounded-md text-[10px] font-bold uppercase ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-zinc-50 border-zinc-200 text-zinc-400'}`}>
                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                           Concluído
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeView === 'categories' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header>
                <h2 className="text-3xl font-bold tracking-tight">Categorias</h2>
                <p className="text-zinc-500">Defina os tipos de itens do acervo para facilitar a busca.</p>
            </header>

            <div className={`border rounded-xl p-8 space-y-6 ${isDark ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-zinc-200 shadow-sm'}`}>
              {canEdit ? (
                <form 
                  className="flex gap-2" 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const name = (form.elements.namedItem('catName') as HTMLInputElement).value;
                    if (name) {
                      handleAddCategory(name);
                      form.reset();
                    }
                  }}
                >
                  <Input name="catName" placeholder="Ex: Móveis, Cabeças, Tecidos..." />
                  <Button type="submit" variant="primary">Adicionar</Button>
                </form>
              ) : (
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-600 text-center uppercase font-bold tracking-widest">
                   Modo de Visualização
                </div>
              )}

              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat.id} className={`p-4 rounded-lg flex justify-between items-center group transition-colors ${isDark ? 'hover:bg-zinc-900 border border-transparent' : 'hover:bg-zinc-50 border border-zinc-100'}`}>
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>{cat.name}</span>
                    {canEdit && (
                      <Button 
                        variant="danger" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1"
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'admin' && isAdmin && (
           <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <header>
                <h2 className="text-3xl font-bold tracking-tight">Gestão Administrativa</h2>
                <p className="text-zinc-500">Gerencie membros e convites de acesso.</p>
             </header>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* INVITES SECTION */}
                <Card className="p-6 space-y-6">
                   <div className="flex items-center justify-between">
                      <h3 className="font-bold uppercase tracking-widest text-xs border-b border-zinc-900 pb-2">Convites Ativos</h3>
                      <div className="flex gap-2">
                         <Button variant="outline" className="text-[10px] px-2 py-1" onClick={() => handleGenerateInvite('user', false)}>+ User</Button>
                         <Button variant="outline" className="text-[10px] px-2 py-1" onClick={() => handleGenerateInvite('user', true)}>+ Editor</Button>
                      </div>
                   </div>
                   <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {allInvites.map(inv => (
                        <div key={inv.id} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded flex items-center justify-between">
                           <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white text-sm">{inv.code}</span>
                                <Badge variant={inv.can_edit_items ? 'success' : 'default'}>{inv.role === 'admin' ? 'ADMIN' : (inv.can_edit_items ? 'EDITOR' : 'LEITOR')}</Badge>
                              </div>
                              <div className="text-[9px] text-zinc-600 mt-1">USOS: {inv.uses} / {inv.max_uses}</div>
                           </div>
                           <button onClick={() => handleDeleteInvite(inv.id)} className="text-zinc-700 hover:text-white transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                           </button>
                        </div>
                      ))}
                      {allInvites.length === 0 && <p className="text-xs text-zinc-700 italic">Nenhum convite gerado.</p>}
                   </div>
                </Card>

                {/* USERS SECTION */}
                <Card className="p-6 space-y-6">
                   <h3 className="font-bold uppercase tracking-widest text-xs border-b border-zinc-900 pb-2">Membros Registrados</h3>
                   <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {allProfiles.map(p => (
                        <div key={p.user_id} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded flex items-center justify-between">
                           <div className="flex flex-col gap-0.5 max-w-[60%]">
                              <span className="text-xs font-bold text-white truncate">{p.display_name}</span>
                              <div className="flex gap-1 mt-1">
                                 <Badge variant={p.role === 'admin' ? 'success' : 'default'}>{p.role.toUpperCase()}</Badge>
                                 <Badge variant={p.can_edit_items ? 'success' : 'default'}>{p.can_edit_items ? 'Pode Editar' : 'Apenas Ver'}</Badge>
                              </div>
                           </div>
                           <div className="flex gap-1">
                              {p.user_id !== session.user.id && (
                                <>
                                  <button 
                                    onClick={() => handleUpdateUserProfile(p.user_id, { role: p.role === 'admin' ? 'user' : 'admin' })}
                                    className="p-1.5 border border-zinc-800 rounded hover:bg-zinc-800 text-[10px] text-zinc-500 uppercase font-bold"
                                    title="Alternar Cargo"
                                  >
                                    Cargo
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateUserProfile(p.user_id, { can_edit_items: !p.can_edit_items })}
                                    className="p-1.5 border border-zinc-800 rounded hover:bg-zinc-800 text-[10px] text-zinc-500 uppercase font-bold"
                                    title="Alternar Permissão de Edição"
                                  >
                                    Edit
                                  </button>
                                </>
                              )}
                           </div>
                        </div>
                      ))}
                   </div>
                </Card>
             </div>
           </div>
        )}

        {activeView === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header>
              <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
              <p className="text-zinc-500">Controle a aparência e a persistência dos dados.</p>
            </header>

            <div className="space-y-6">
                <Card className="p-8 space-y-4">
                  <div>
                    <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-zinc-900'}`}>Tema do Aplicativo</h3>
                    <p className="text-sm text-zinc-500">Mude a interface entre tons claros e escuros.</p>
                  </div>
                  <div className="flex gap-3 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
                    <button 
                      onClick={() => setTheme('dark')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${theme === 'dark' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                      Escuro
                    </button>
                    <button 
                      onClick={() => setTheme('light')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${theme === 'light' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                      Claro
                    </button>
                  </div>
                </Card>

                <Card className="p-8 space-y-4">
                  <div>
                    <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-zinc-900'}`}>Sessão do Usuário</h3>
                    <p className="text-sm text-zinc-500">Gerenciar o acesso atual ao sistema ({session?.user?.email}).</p>
                  </div>
                  <Button variant="danger" fullWidth onClick={handleLogout}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                    Encerrar Sessão
                  </Button>
                </Card>

                <Card className="p-8 space-y-4">
                  <div>
                    <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-zinc-900'}`}>Gestão de Dados</h3>
                    <p className="text-sm text-zinc-500">Backup em formato JSON.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button variant="secondary" fullWidth onClick={() => {
                      const data = { categories, items, loans };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `acervo_backup_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                      Exportar Backup
                    </Button>
                  </div>
                </Card>
            </div>
          </div>
        )}
      </main>

      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 h-20 border-t flex items-center justify-around px-2 z-40 no-print ${mobileNavClass}`}>
        {NAV_ITEMS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as ViewType)}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-300 ${
              activeView === tab.id 
              ? (isDark ? 'text-white scale-110' : 'text-black scale-110') 
              : 'text-zinc-500'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${activeView === tab.id ? (isDark ? 'bg-zinc-800' : 'bg-zinc-100') : ''}`}>
              {tab.isUrl ? (
                <div 
                  style={{ 
                    maskImage: `url(${tab.icon})`, 
                    WebkitMaskImage: `url(${tab.icon})`,
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain'
                  }}
                  className="w-[22px] h-[22px] bg-current" 
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeView === tab.id ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
                  <path d={tab.icon as string}/>
                </svg>
              )}
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-tighter ${activeView === tab.id ? 'opacity-100' : 'opacity-70'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>

      {/* LOAN MODAL */}
      <Modal 
        isOpen={isLoanModalOpen} 
        onClose={() => setIsLoanModalOpen(false)} 
        title={`Termo de Empréstimo: ${selectedItem?.name}`}
      >
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Responsável</label>
                <Input 
                  value={loanForm.borrowerName}
                  onChange={e => setLoanForm({...loanForm, borrowerName: e.target.value})}
                  placeholder="Nome completo"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-2 tracking-widest">Ministério / Depto</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MINISTRIES.map(m => {
                    const isSelected = loanForm.ministry === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setLoanForm({...loanForm, ministry: m})}
                        className={`group relative flex items-center justify-center px-2 py-3 text-[10px] font-bold uppercase rounded-lg border transition-all duration-200 text-center leading-tight ${
                          isSelected 
                            ? (isDark ? 'bg-white text-black border-white ring-2 ring-zinc-400 ring-offset-2 ring-offset-black' : 'bg-black text-white border-black ring-2 ring-zinc-500 ring-offset-2 ring-offset-white')
                            : (isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:bg-zinc-800' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-100')
                        }`}
                      >
                        {m}
                        {isSelected && (
                          <div className="absolute top-1 right-1">
                             <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {loanForm.ministry === 'Outro' && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-300">
                    <Input 
                      placeholder="Qual outro departamento?"
                      value={loanForm.otherMinistry}
                      onChange={e => setLoanForm({...loanForm, otherMinistry: e.target.value})}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Motivo</label>
                <Input 
                  value={loanForm.reason}
                  onChange={e => setLoanForm({...loanForm, reason: e.target.value})}
                  placeholder="Ex: Culto de Jovens"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Devolução Prevista</label>
                <Input 
                  type="date"
                  value={loanForm.dueDate}
                  onChange={e => setLoanForm({...loanForm, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Registro Fotográfico</label>
              {loanForm.photo ? (
                <div className={`relative rounded-xl overflow-hidden border-2 ${isDark ? 'border-zinc-800' : 'border-zinc-200 shadow-inner'}`}>
                  <img src={loanForm.photo} className="w-full aspect-square object-cover" />
                  <button 
                    onClick={() => setLoanForm({...loanForm, photo: ''})}
                    className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black rounded-full text-white backdrop-blur-sm transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
              ) : (
                <CameraCapture 
                  onCapture={(img) => setLoanForm({...loanForm, photo: img})} 
                  onCancel={() => {}} 
                />
              )}
            </div>
          </div>

          <div className={`space-y-4 pt-6 border-t ${isDark ? 'border-zinc-900' : 'border-zinc-200'}`}>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Assinatura Digital</label>
            {loanForm.signature ? (
               <div className={`relative rounded-xl overflow-hidden border p-6 flex items-center justify-center ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50 shadow-inner'}`}>
                <img src={loanForm.signature} className="h-24 object-contain" />
                <button 
                  onClick={() => setLoanForm({...loanForm, signature: ''})}
                  className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black rounded-full text-white backdrop-blur-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            ) : (
              <SignatureCanvas 
                onSave={(sig) => setLoanForm({...loanForm, signature: sig})} 
                onClear={() => {}} 
                isDark={isDark}
              />
            )}
          </div>

          <div className={`flex items-start gap-4 p-5 rounded-xl border ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
            <input 
              type="checkbox" 
              id="consent" 
              className={`mt-1.5 h-4 w-4 rounded border-zinc-300 ${isDark ? 'accent-white' : 'accent-black'}`} 
              checked={loanForm.consent}
              onChange={e => setLoanForm({...loanForm, consent: e.target.checked})}
            />
            <label htmlFor="consent" className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Declaro que recebi o item acima em boas condições e comprometo-me a devolvê-lo na data prevista, zelando por sua integridade. Autorizo o armazenamento digital deste termo, incluindo foto e assinatura, para fins de controle interno da organização.
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsLoanModalOpen(false)} disabled={dataLoading}>Cancelar</Button>
            <Button onClick={handleCreateLoan} variant="primary" disabled={dataLoading}>
              {dataLoading ? 'Enviando...' : 'Confirmar Saída'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ITEM EDIT/NEW MODAL */}
      <Modal 
        isOpen={isItemModalOpen} 
        onClose={() => setIsItemModalOpen(false)} 
        title={itemForm.id ? 'Ficha do Item' : 'Novo Item no Acervo'}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Nome Identificador</label>
                <Input 
                  value={itemForm.name || ''} 
                  onChange={e => setItemForm({...itemForm, name: e.target.value})}
                  placeholder="Ex: Capa de Rei Vermelha"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Código de Controle</label>
                <div className="flex gap-2">
                  <Input 
                    value={itemForm.code || ''} 
                    onChange={e => setItemForm({...itemForm, code: e.target.value})}
                    placeholder="Ex: FIG-012"
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleGenerateCode}
                    className="shrink-0"
                  >
                    Gerar
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Categoria</label>
                  <Select 
                    value={itemForm.categoryId || ''} 
                    onChange={e => setItemForm({...itemForm, categoryId: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Quantidade</label>
                  <Input 
                    type="number"
                    min="1"
                    value={itemForm.quantity || 1} 
                    onChange={e => setItemForm({...itemForm, quantity: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Local</label>
                  <Input 
                    value={itemForm.location || ''} 
                    onChange={e => setItemForm({...itemForm, location: e.target.value})}
                    placeholder="Ex: Caixa 04"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Condição</label>
                  <Select 
                    value={itemForm.condition || 'Boas Condições'} 
                    onChange={e => setItemForm({...itemForm, condition: e.target.value as any})}
                  >
                    {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Foto do Item</label>
              {itemForm.imageUrl ? (
                <div className={`relative rounded-xl overflow-hidden border-2 ${isDark ? 'border-zinc-800' : 'border-zinc-200 shadow-inner'}`}>
                  <img src={itemForm.imageUrl} className="w-full aspect-square object-cover" />
                  <button 
                    onClick={() => setItemForm({...itemForm, imageUrl: ''})}
                    className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black rounded-full text-white backdrop-blur-sm transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
              ) : (
                <CameraCapture 
                  onCapture={(img) => setItemForm({...itemForm, imageUrl: img})} 
                  onCancel={() => {}} 
                />
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Observações Técnicas</label>
            <textarea 
              className={`w-full border rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-black'}`}
              rows={3}
              placeholder="Detalhes sobre tecido, fragilidade ou histórico..."
              value={itemForm.observations || ''}
              onChange={e => setItemForm({...itemForm, observations: e.target.value})}
            />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-900">
             {itemForm.id && (
              <Button variant="danger" className="mr-auto" onClick={async () => {
                showConfirm('Deletar este item permanentemente do acervo?', 'Confirmar Exclusão', async () => {
                  setDataLoading(true);
                  try {
                    await dataServiceSupabase.deleteItem(itemForm.id!);
                    await loadAllData();
                    setIsItemModalOpen(false);
                  } catch (err: any) {
                    showAlert("Erro ao excluir item: " + err.message, 'Erro');
                  } finally {
                    setDataLoading(false);
                  }
                });
              }} disabled={dataLoading}>Excluir Registro</Button>
            )}
            <Button variant="secondary" onClick={() => setIsItemModalOpen(false)} disabled={dataLoading}>Cancelar</Button>
            <Button onClick={handleSaveItem} variant="primary" disabled={dataLoading}>
              {dataLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* RETURN MODAL */}
      <Modal 
        isOpen={isReturnModalOpen} 
        onClose={() => setIsReturnModalOpen(false)} 
        title={`Recebimento de Devolução: ${selectedLoan?.itemName}`}
      >
        <div className="space-y-6">
          <div className={`p-6 rounded-xl flex items-center gap-5 border ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-100 shadow-sm'}`}>
            <div className="w-16 h-16 rounded-full border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <img src={selectedLoan?.borrowerPhoto} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className={`font-bold text-lg ${isDark ? 'text-white' : 'text-zinc-900'}`}>{selectedLoan?.borrowerName}</div>
              <div className="text-sm text-zinc-500 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                 Retirado em: {selectedLoan && new Date(selectedLoan.loanDate).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Condição na Devolução</label>
                <Select 
                  value={returnForm.condition} 
                  onChange={e => setReturnForm({...returnForm, condition: e.target.value as any})}
                >
                  {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Relatório de Estado</label>
                <textarea 
                  className={`w-full border rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-black'}`}
                  rows={4}
                  placeholder="Houve alguma avaria, necessidade de lavagem ou reparo?"
                  value={returnForm.observations}
                  onChange={e => setReturnForm({...returnForm, observations: e.target.value})}
                />
              </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsReturnModalOpen(false)} disabled={dataLoading}>Cancelar</Button>
            <Button onClick={handleReturnItem} variant="primary" disabled={dataLoading}>
              {dataLoading ? 'Processando...' : 'Confirmar e Disponibilizar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* LOAN DETAIL MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detalhes do Empréstimo"
      >
        {selectedLoan && (
          <div className="space-y-6">
            <div className={`relative aspect-square md:aspect-video rounded-xl overflow-hidden border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200 shadow-inner'}`}>
              <img src={selectedLoan.borrowerPhoto} className="w-full h-full object-cover" alt="Foto do Responsável" />
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">{selectedLoan.borrowerName}</h3>
                  <p className="text-zinc-300 text-sm font-bold uppercase tracking-widest">{selectedLoan.ministry}</p>
                </div>
                <Badge variant={selectedLoan.status === 'Ativo' ? 'warning' : 'success'}>{selectedLoan.status}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <section>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Item Retirado</label>
                  <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`}>{selectedLoan.itemName}</p>
                  <p className="text-xs text-zinc-500 font-mono">Cód: {selectedLoan.itemId.slice(0,8).toUpperCase()}</p>
                </section>
                <section>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Finalidade</label>
                  <p className={`text-sm italic ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>"{selectedLoan.reason || 'Não informado'}"</p>
                </section>
              </div>
              
              <div className="space-y-4">
                <section>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Cronograma</label>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Retirada:</span>
                      <span className="font-bold tabular-nums">{new Date(selectedLoan.loanDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Devolução Prevista:</span>
                      <span className={`font-bold tabular-nums ${new Date() > new Date(selectedLoan.dueDate) && selectedLoan.status === 'Ativo' ? 'text-red-500' : ''}`}>
                        {new Date(selectedLoan.dueDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </section>
                <section className="pt-2 border-t dark:border-zinc-900 border-zinc-200">
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Assinatura</label>
                  <div className={`h-16 flex items-center justify-start p-2 rounded border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200 shadow-inner'}`}>
                    <img src={selectedLoan.signature} className="h-full object-contain" alt="Assinatura" />
                  </div>
                </section>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="primary" fullWidth onClick={() => setIsDetailModalOpen(false)}>Fechar Detalhes</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog 
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={performLogout}
        title="Sair do sistema"
        message="Deseja realmente sair do sistema?"
        confirmLabel="Sair"
        cancelLabel="Cancelar"
      />

      <ConfirmDialog 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
      />

      <AlertDialog 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => {
          setAlertConfig({ ...alertConfig, isOpen: false });
          if (alertConfig.onOk) alertConfig.onOk();
        }}
      />
    </div>
  );
};

export default App;
