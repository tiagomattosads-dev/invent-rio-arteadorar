
import React, { useState } from 'react';
import { Button, Input, Card } from './UI';
import { supabase } from '../services/supabaseClient';
import { dataServiceSupabase } from '../services/dataServiceSupabase';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isRegistering) {
        if (!name || !email || !password || !confirmPassword || !inviteCode) {
          alert('Por favor, preencha todos os campos, incluindo o código de convite.');
          return;
        }
        if (password !== confirmPassword) {
          alert('As senhas não coincidem.');
          return;
        }

        // Validar convite
        const invite = await dataServiceSupabase.validateInvite(inviteCode.toUpperCase());
        if (!invite) {
          alert('Código de convite inválido ou expirado.');
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          // Criar perfil com permissões do convite
          await dataServiceSupabase.createProfile({
            user_id: signUpData.user.id,
            display_name: name,
            role: invite.role,
            can_edit_items: invite.can_edit_items
          });

          // Incrementar usos do convite
          await dataServiceSupabase.incrementInviteUses(invite.code);
          
          alert('Cadastro realizado! Verifique seu email para confirmar ou tente entrar.');
          setIsRegistering(false);
        }
      } else {
        if (!email || !password) {
          alert('Preencha todos os campos.');
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      alert('Digite seu email primeiro.');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      alert('Se esse email existir, enviamos um link para redefinir sua senha.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black">
      <div className="w-full max-w-sm animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white text-black mb-4 overflow-hidden shadow-lg">
            <img 
              src="https://res.cloudinary.com/dutufef4s/image/upload/v1770989288/theatre_njtpog.png" 
              alt="Logo Teatro" 
              className="w-10 h-10 object-contain grayscale translate-y-[4px]"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tighter text-white uppercase">
            {isRegistering ? 'Criar Conta' : 'Acervo Teatro'}
          </h1>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-2">
            {isRegistering ? 'É necessário um convite para participar' : 'Acesso Restrito ao Ministério'}
          </p>
        </div>

        <Card className="p-8 border-zinc-900 bg-zinc-950/50 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegistering && (
              <>
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-2 tracking-widest">Código de Convite</label>
                  <Input 
                    type="text" 
                    placeholder="ABC-123" 
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                  />
                </div>
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-2 tracking-widest">Nome Completo</label>
                  <Input 
                    type="text" 
                    placeholder="Seu nome" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
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
            {isRegistering && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-2 tracking-widest">Confirmar Senha</label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}
            <Button 
              type="submit" 
              fullWidth 
              disabled={loading}
              className="py-3 font-bold uppercase tracking-widest"
            >
              {loading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Entrar no Sistema')}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-900 text-center flex flex-col gap-4">
            <button 
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
            >
              {isRegistering ? 'Já tem conta? Faça Login' : 'Ainda não tem conta? Cadastre-se'}
            </button>
            {!isRegistering && (
              <button 
                type="button"
                onClick={handleResetPassword}
                className="text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:text-zinc-500 transition-colors"
              >
                Esqueci minha senha
              </button>
            )}
          </div>
        </Card>
        
        <p className="text-center text-zinc-600 text-[10px] uppercase tracking-wider mt-8">
          Desenvolvido para o Ministério de Artes
        </p>
      </div>
    </div>
  );
};

export default Login;
