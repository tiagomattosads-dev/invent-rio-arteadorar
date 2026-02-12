
import React, { useState } from 'react';
import { Button, Input, Card } from './UI';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    // Simulando delay de autenticação
    setTimeout(() => {
      onLogin();
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black">
      <div className="w-full max-w-sm animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white text-black mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-1.9a1.9 1.9 0 0 0 0-2.6L4.1 15.7a1.9 1.9 0 0 1 0-2.6L12 5.2a1.9 1.9 0 0 1 2.6 0l.8.8a1.9 1.9 0 0 0 2.6 0l1.9-1.9a1.9 1.9 0 0 1 2.6 0l.5.5"/><path d="m15 15 6 6"/><path d="m17.5 17.5 2.5 2.5"/></svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tighter text-white">ACERVO TEATRO</h1>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mt-2">Acesso Restrito ao Ministério</p>
        </div>

        <Card className="p-8 border-zinc-900 bg-zinc-950/50 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-2 tracking-widest">E-mail</label>
              <Input 
                type="email" 
                placeholder="nome@igreja.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-2 tracking-widest">Senha</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              fullWidth 
              disabled={loading}
              className="py-3 font-bold"
            >
              {loading ? 'Autenticando...' : 'Entrar no Sistema'}
            </Button>
          </form>
        </Card>
        
        <p className="text-center text-zinc-600 text-[10px] uppercase tracking-wider mt-8">
          Desenvolvido para o Ministério de Artes
        </p>
      </div>
    </div>
  );
};

export default Login;
