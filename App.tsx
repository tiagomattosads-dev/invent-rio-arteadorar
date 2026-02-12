
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ViewType, 
  Item, 
  Category, 
  Loan, 
  ItemCondition 
} from './types';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_ITEMS, 
  MINISTRIES, 
  CONDITIONS 
} from './constants';
import { storageService } from './services/storageService';
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

const App: React.FC = () => {
  // --- STATE ---
  const [activeView, setActiveView] = useState<ViewType>('inventory');
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  // Inventory Filtering
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  // Modals state
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
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
    condition: 'Bom' as ItemCondition,
    observations: ''
  });

  // Edit/New Item Form State
  const [itemForm, setItemForm] = useState<Partial<Item>>({});

  // --- INITIALIZATION ---
  useEffect(() => {
    const storedCats = storageService.getCategories();
    const storedItems = storageService.getItems();
    const storedLoans = storageService.getLoans();
    const storedTheme = storageService.getTheme();

    setCategories(storedCats || INITIAL_CATEGORIES);
    setItems(storedItems || INITIAL_ITEMS);
    setLoans(storedLoans || []);
    if (storedTheme) setTheme(storedTheme);
  }, []);

  // Sync to Storage
  useEffect(() => {
    if (categories.length > 0) storageService.saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    if (items.length > 0) storageService.saveItems(items);
  }, [items]);

  useEffect(() => {
    storageService.saveLoans(loans);
  }, [loans]);

  useEffect(() => {
    storageService.saveTheme(theme);
    // Apply theme to body for global consistency
    if (theme === 'light') {
      document.body.classList.remove('bg-black', 'text-white');
      document.body.classList.add('bg-white', 'text-black');
    } else {
      document.body.classList.remove('bg-white', 'text-black');
      document.body.classList.add('bg-black', 'text-white');
    }
  }, [theme]);

  // --- HANDLERS ---
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                           item.code.toLowerCase().includes(search.toLowerCase());
      const matchesCat = catFilter === 'all' || item.categoryId === catFilter;
      return matchesSearch && matchesCat;
    });
  }, [items, search, catFilter]);

  const borrowedItems = useMemo(() => {
    return items.filter(item => item.status === 'Emprestado');
  }, [items]);

  const handleGenerateCode = () => {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    setItemForm({ ...itemForm, code: `REF-${random}` });
  };

  const handleCreateLoan = () => {
    if (!selectedItem) return;
    if (!loanForm.borrowerName || !loanForm.dueDate || !loanForm.consent || !loanForm.photo || !loanForm.signature) {
      alert('Por favor, preencha todos os campos obrigatórios, inclua foto e assinatura.');
      return;
    }

    const newLoan: Loan = {
      id: crypto.randomUUID(),
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      borrowerName: loanForm.borrowerName,
      ministry: loanForm.ministry === 'Outro' ? loanForm.otherMinistry : loanForm.ministry,
      reason: loanForm.reason,
      loanDate: new Date().toISOString(),
      dueDate: loanForm.dueDate,
      consent: loanForm.consent,
      borrowerPhoto: loanForm.photo,
      signature: loanForm.signature,
      status: 'Ativo'
    };

    setLoans([...loans, newLoan]);
    setItems(items.map(i => i.id === selectedItem.id ? { ...i, status: 'Emprestado' } : i));
    
    // Reset and Close
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
  };

  const handleReturnItem = () => {
    if (!selectedLoan) return;
    
    const updatedLoans = loans.map(l => 
      l.id === selectedLoan.id ? { 
        ...l, 
        status: 'Concluído' as const, 
        returnDate: new Date().toISOString(),
        returnCondition: returnForm.condition
      } : l
    );
    
    setLoans(updatedLoans);
    setItems(items.map(i => i.id === selectedLoan.itemId ? { ...i, status: 'Disponível' as const, condition: returnForm.condition } : i));
    
    setIsReturnModalOpen(false);
    setSelectedLoan(null);
  };

  const handleSaveItem = () => {
    if (!itemForm.name || !itemForm.categoryId) return;
    
    if (itemForm.id) {
      setItems(items.map(i => i.id === itemForm.id ? (itemForm as Item) : i));
    } else {
      const newItem: Item = {
        ...(itemForm as any),
        id: crypto.randomUUID(),
        status: 'Disponível'
      };
      setItems([...items, newItem]);
    }
    setIsItemModalOpen(false);
    setItemForm({});
  };

  // --- THEME STYLES HELPER ---
  const isDark = theme === 'dark';
  const sidebarClass = isDark ? 'bg-zinc-950 border-zinc-900' : 'bg-zinc-50 border-zinc-200';
  const mobileNavClass = isDark ? 'bg-zinc-950/90 border-zinc-900 backdrop-blur-md' : 'bg-white/90 border-zinc-200 backdrop-blur-md shadow-[0_-2px_10px_rgba(0,0,0,0.05)]';
  const mainClass = isDark ? 'bg-black text-white' : 'bg-white text-black';
  const filterSectionClass = isDark ? 'bg-zinc-950 border-zinc-900' : 'bg-zinc-50/50 border-zinc-200';

  const NAV_ITEMS = [
    { id: 'inventory', label: 'Itens', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
    { id: 'borrowed', label: 'Emprestados', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'loans', label: 'Empréstimos', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 11l2 2 4-4' },
    { id: 'categories', label: 'Categorias', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'settings', label: 'Ajustes', icon: 'M12.22 2h-.44a2 2 0 0 0-2 2 2 2 0 0 1-2 2 2 2 0 0 0-2 2 2 2 0 0 1-2 2 2 2 0 0 0-2 2 2 2 0 0 1 0 4 2 2 0 0 0 2 2 2 2 0 0 1 2 2 2 2 0 0 0 2 2 2 2 0 0 1 2 2 2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2 2 2 0 0 1 2-2 2 2 0 0 0 2-2 2 2 0 0 1 2-2 2 2 0 0 0 2-2 2 2 0 0 1 0-4 2 2 0 0 0-2-2 2 2 0 0 1-2-2 2 2 0 0 0-2-2 2 2 0 0 1-2-2 2 2 0 0 0-2-2zM12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z' }
  ];

  // --- RENDERING ---
  return (
    <div className={`min-h-screen flex flex-col lg:flex-row ${mainClass}`}>
      {/* Sidebar Navigation - DESKTOP ONLY (Large screens 1024px+) */}
      <aside className={`hidden lg:flex w-64 border-r flex-shrink-0 flex-col no-print ${sidebarClass}`}>
        <div className="p-8">
          <h1 className={`text-xl font-bold tracking-tighter flex items-center gap-2 ${isDark ? 'text-white' : 'text-black'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-1.9a1.9 1.9 0 0 0 0-2.6L4.1 15.7a1.9 1.9 0 0 1 0-2.6L12 5.2a1.9 1.9 0 0 1 2.6 0l.8.8a1.9 1.9 0 0 0 2.6 0l1.9-1.9a1.9 1.9 0 0 1 2.6 0l.5.5"/><path d="m15 15 6 6"/><path d="m17.5 17.5 2.5 2.5"/></svg>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={tab.icon}/>
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 pb-24 lg:pb-10">
        
        {/* INVENTORY VIEW */}
        {activeView === 'inventory' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Itens do Acervo</h2>
                <p className="text-zinc-500">Gerencie o acervo de figurinos e cenários.</p>
              </div>
              <Button onClick={() => { setItemForm({}); setIsItemModalOpen(true); }} variant="primary">
                + Novo Item
              </Button>
            </header>

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
                        disabled={item.status !== 'Disponível'}
                        onClick={() => { setSelectedItem(item); setIsLoanModalOpen(true); }}
                      >
                        {item.status === 'Disponível' ? 'Emprestar' : 'Emprestado'}
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="px-2"
                        onClick={() => { setItemForm(item); setIsItemModalOpen(true); }}
                        title="Editar item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"/></svg>
                      </Button>
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

        {/* BORROWED VIEW */}
        {activeView === 'borrowed' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header>
              <h2 className="text-3xl font-bold tracking-tight">Itens Emprestados</h2>
              <p className="text-zinc-500">Visualização rápida de todos os itens que estão fora do acervo.</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {borrowedItems.map(item => (
                <Card key={item.id} className="group flex flex-col h-full">
                  <div className={`aspect-[4/3] relative overflow-hidden ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2 pointer-events-none">
                      <Badge variant="warning">Emprestado</Badge>
                      <Badge>{item.condition}</Badge>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1 gap-4">
                    <div className="flex-1">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{categories.find(c => c.id === item.categoryId)?.name} • {item.code}</span>
                      <h3 className={`text-lg font-bold truncate leading-tight mt-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{item.name}</h3>
                      <div className="mt-2 text-xs text-zinc-500">
                        {loans.find(l => l.itemId === item.id && l.status === 'Ativo')?.borrowerName && (
                          <div className="flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                             Com: {loans.find(l => l.itemId === item.id && l.status === 'Ativo')?.borrowerName}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button 
                      fullWidth 
                      variant="secondary"
                      onClick={() => {
                        const loan = loans.find(l => l.itemId === item.id && l.status === 'Ativo');
                        if (loan) {
                          setSelectedLoan(loan);
                          setIsReturnModalOpen(true);
                        }
                      }}
                    >
                      Processar Devolução
                    </Button>
                  </div>
                </Card>
              ))}
              {borrowedItems.length === 0 && (
                <div className="col-span-full py-20 text-center text-zinc-500 bg-zinc-50 dark:bg-zinc-900/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  <p>Não há itens emprestados no momento.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOANS VIEW */}
        {activeView === 'loans' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header>
              <h2 className="text-3xl font-bold tracking-tight">Empréstimos</h2>
              <p className="text-zinc-500">Acompanhe retiradas e devoluções em tempo real.</p>
            </header>

            <div className={`overflow-x-auto border rounded-xl shadow-sm ${isDark ? 'bg-zinc-950 border-zinc-900 shadow-none' : 'bg-white border-zinc-200'}`}>
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
                    loans.sort((a,b) => b.loanDate.localeCompare(a.loanDate)).map(loan => (
                      <tr key={loan.id} className={`${isDark ? 'hover:bg-zinc-900/30' : 'hover:bg-zinc-50/50'} transition-colors`}>
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
                        <td className="px-6 py-4 text-right">
                          {loan.status === 'Ativo' ? (
                            <Button variant="secondary" size="sm" onClick={() => { setSelectedLoan(loan); setIsReturnModalOpen(true); }}>
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
          </div>
        )}

        {/* CATEGORIES VIEW */}
        {activeView === 'categories' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header>
                <h2 className="text-3xl font-bold tracking-tight">Categorias</h2>
                <p className="text-zinc-500">Defina os tipos de itens do acervo para facilitar a busca.</p>
            </header>

            <div className={`border rounded-xl p-8 space-y-6 ${isDark ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-zinc-200 shadow-sm'}`}>
              <form 
                className="flex gap-2" 
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const name = (form.elements.namedItem('catName') as HTMLInputElement).value;
                  if (name) {
                    setCategories([...categories, { id: crypto.randomUUID(), name }]);
                    form.reset();
                  }
                }}
              >
                <Input name="catName" placeholder="Ex: Móveis, Cabeças, Tecidos..." />
                <Button type="submit" variant="primary">Adicionar</Button>
              </form>

              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat.id} className={`p-4 rounded-lg flex justify-between items-center group transition-colors ${isDark ? 'hover:bg-zinc-900 border border-transparent' : 'hover:bg-zinc-50 border border-zinc-100'}`}>
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>{cat.name}</span>
                    <Button 
                      variant="danger" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1"
                      onClick={() => {
                        if(confirm('Isso pode afetar itens associados. Confirmar?')) {
                          setCategories(categories.filter(c => c.id !== cat.id));
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS VIEW */}
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
                    <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-zinc-900'}`}>Gestão de Dados</h3>
                    <p className="text-sm text-zinc-500">Backup em formato JSON ou redefinição total do banco local.</p>
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                      Exportar Backup
                    </Button>
                    <Button variant="danger" fullWidth onClick={() => {
                      if (confirm('ATENÇÃO: Isso apagará todos os dados do navegador. Continuar?')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      Limpar Tudo
                    </Button>
                  </div>
                </Card>
            </div>
          </div>
        )}
      </main>

      {/* Mobile/Tablet Bottom Navigation Bar - VISIBLE ONLY ON SCREENS BELOW 1024px */}
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
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeView === tab.id ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
                <path d={tab.icon}/>
              </svg>
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-tighter ${activeView === tab.id ? 'opacity-100' : 'opacity-70'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>

      {/* MODALS */}
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
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Ministério / Depto</label>
                <Select 
                  value={loanForm.ministry}
                  onChange={e => setLoanForm({...loanForm, ministry: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  {MINISTRIES.map(m => <option key={m} value={m}>{m}</option>)}
                </Select>
                {loanForm.ministry === 'Outro' && (
                  <Input 
                    className="mt-2"
                    placeholder="Nome do departamento..."
                    value={loanForm.otherMinistry}
                    onChange={e => setLoanForm({...loanForm, otherMinistry: e.target.value})}
                  />
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
                <img src={loanForm.signature} className="h-24 object-contain invert-0 dark:invert" />
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
            <Button variant="secondary" onClick={() => setIsLoanModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateLoan} variant="primary">Confirmar Saída</Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Quantidade Total</label>
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
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Local de Armazenamento</label>
              <Input 
                value={itemForm.location || ''} 
                onChange={e => setItemForm({...itemForm, location: e.target.value})}
                placeholder="Ex: Caixa 04, Setor Sul"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Condição Atual</label>
              <Select 
                value={itemForm.condition || 'Bom'} 
                onChange={e => setItemForm({...itemForm, condition: e.target.value as any})}
              >
                {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">URL da Imagem (Opcional)</label>
            <Input 
              value={itemForm.imageUrl || ''} 
              onChange={e => setItemForm({...itemForm, imageUrl: e.target.value})}
              placeholder="https://sua-imagem.com/foto.jpg"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1 tracking-widest">Observações Técnicas</label>
            <textarea 
              className={`w-full border rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-black'}`}
              rows={4}
              placeholder="Detalhes sobre tecido, fragilidade ou histórico..."
              value={itemForm.observations || ''}
              onChange={e => setItemForm({...itemForm, observations: e.target.value})}
            />
          </div>
          <div className="flex justify-end gap-3 pt-6">
             {itemForm.id && (
              <Button variant="danger" className="mr-auto" onClick={() => {
                if (confirm('Deletar este item permanentemente do acervo?')) {
                  setItems(items.filter(i => i.id !== itemForm.id));
                  setIsItemModalOpen(false);
                }
              }}>Excluir Registro</Button>
            )}
            <Button variant="secondary" onClick={() => setIsItemModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem} variant="primary">Salvar Alterações</Button>
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
            <Button variant="secondary" onClick={() => setIsReturnModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleReturnItem} variant="primary">Confirmar e Disponibilizar</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default App;
