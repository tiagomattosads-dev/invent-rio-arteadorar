
import React, { useState, useEffect } from 'react';
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
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Alert State
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; onOk?: () => void }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const showAlert = (message: string, title: string = 'Aviso', onOk?: () => void) => {
    setAlertConfig({ isOpen: true, title, message, onOk });
  };

  // Cooldown timer effect
  useEffect(() => {
    let timer: number;
    if (resendCooldown > 0) {
      timer = window.setInterval(() => {
        setResendCooldown((current) => current - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendConfirmation = async () => {
    if (!email) {
      showAlert('Digite o e-mail no campo acima primeiro.');
      return;
    }
    
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          showAlert('Limite temporário de envios. Aguarde alguns minutos e tente novamente.', 'Limite Excedido');
        } else {
          throw error;
        }
      } else {
        showAlert('Link de confirmação reenviado! Verifique sua caixa de entrada.', 'Sucesso');
        setResendCooldown(90);
      }
    } catch (err: any) {
      showAlert(err.message || 'Erro ao reenviar confirmação.', 'Erro');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isRegistering) {
        // Validação obrigatória de Nome
        if (!name.trim()) {
           showAlert('O campo "Nome Completo" é obrigatório para o cadastro.', 'Campo Obrigatório');
           setLoading(false);
           return;
        }
        if (!email || !password || !confirmPassword || !inviteCode) {
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

        // SignUp com full_name no metadata
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } }
        });

        if (error) {
          localStorage.removeItem('pending_invite_code');
          
          if (error.message.includes('rate limit')) {
            showAlert('Limite temporário de envios. Aguarde alguns minutos e tente novamente.', 'Limite Excedido');
            setLoading(false);
            return;
          }

          if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
            showAlert(
              "Este email já foi cadastrado. Verifique sua caixa de entrada para confirmar o email. Se não recebeu, use 'Reenviar confirmação'.",
              "Email já cadastrado"
            );
            setLoading(false);
            return;
          }

          throw error;
        }

        // Persistência DEFINITIVA no public.profiles
        const registeredUser = data.user || (await supabase.auth.getUser()).data.user;
        if (registeredUser) {
           await supabase.from('profiles').upsert({
              user_id: registeredUser.id,
              display_name: name.trim(),
              role: 'user',
              can_edit_items: false,
              updated_at: new Date().toISOString()
           }, { onConflict: 'user_id' });
        }

        showAlert(
          'Cadastro realizado! Verifique seu email para confirmar ou tente entrar.', 
          'Sucesso',
          () => {
            setIsRegistering(false);
            setResendCooldown(90); // Ativa cooldown após cadastro inicial também
          }
        );
      } else {
        if (!email || !password) {
          showAlert('Preencha todos os campos.');
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
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
            {isRegistering && (
              <button 
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendLoading || resendCooldown > 0}
                className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar confirmação de email'}
              </button>
            )}
            
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
