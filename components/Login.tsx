
import React, { useState } from 'react';
import { Button, Input, Card } from './UI';
import { supabase } from '../services/supabaseClient';
import { dataServiceSupabase } from '../services/dataServiceSupabase';
import AlertDialog from './AlertDialog';

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

  // Alert State
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; onOk?: () => void }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const showAlert = (message: string, title: string = 'Aviso', onOk?: () => void) => {
    setAlertConfig({ isOpen: true, title, message, onOk });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isRegistering) {
        if (!name || !email || !password || !confirmPassword || !inviteCode) {
          showAlert('Por favor, preencha todos os campos, incluindo o código de convite.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          showAlert('As senhas não coincidem.');
          setLoading(false);
          return;
        }

        // Validação do convite via RPC
        const isValid = await dataServiceSupabase.validateInvite(inviteCode.toUpperCase().trim());
        if (!isValid) {
          showAlert('Código de convite inválido ou expirado.');
          setLoading(false);
          return;
        }

        // Salvar código para resgate após o login/confirmação
        localStorage.setItem('pending_invite_code', inviteCode.toUpperCase().trim());

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        });
        if (error) {
          localStorage.removeItem('pending_invite_code');
          throw error;
        }

        showAlert(
          'Cadastro realizado! Verifique seu email para confirmar ou tente entrar.', 
          'Sucesso',
          () => {
            setIsRegistering(false);
          }
        );
      } else {
        if (!email || !password) {
          showAlert('Preencha todos os campos.');
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin();
      }
    } catch (err: any) {
      console.error(err);
      showAlert(err.message || 'Erro ao processar. Tente novamente.', 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      showAlert('Digite seu email primeiro.');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      showAlert('Se esse email existir, enviamos um link para redefinir sua senha.');
    } catch (err: any) {
      showAlert(err.message, 'Erro');
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
            {isRegistering ? 'Um código de convite é obrigatório para cadastro' : 'Acesso Restrito ao Ministério'}
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
                    placeholder="Código 6-8 caracteres" 
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
              {loading ? 'Processando...' : (isRegistering ? 'Registrar' : 'Entrar no Sistema')}
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

export default Login;
