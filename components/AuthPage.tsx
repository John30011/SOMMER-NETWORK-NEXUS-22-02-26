
import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Activity, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Loader2, Camera, Upload, Eye, EyeOff, ShieldCheck, HelpCircle, Copy, Server, ExternalLink, Sparkles } from 'lucide-react';

type AuthView = 'login' | 'register' | 'forgot_password' | 'update_password';

interface AuthPageProps {
    onLoginSuccess?: (session: any) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<AuthView>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Register States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      // SUCCESS!
      if (onLoginSuccess && data.session) {
          onLoginSuccess(data.session);
      } else {
          setLoading(false);
      }
      
    } catch (err: any) {
      setError(err.message);
      setLoading(false); 
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // Set flag so App.tsx knows to show Welcome screen when user returns from Google
      localStorage.setItem('auth_in_progress', 'true');

      // Use window.location.origin to ensure it works on both localhost and production automatically
      const redirectTo = window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });
      if (error) throw error;
      
      // Note: The redirection happens automatically here, so setLoading(false) might not be reached immediately
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setError(err.message || "Error iniciando sesión con Google");
      setLoading(false);
      localStorage.removeItem('auth_in_progress');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > 10 * 1024 * 1024) {
            setError("La imagen no debe pesar más de 10MB");
            return;
        }
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        setError(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let publicAvatarUrl = null;

      // 1. UPLOAD IMAGE FIRST
      if (avatarFile) {
        try {
            const fileExt = avatarFile.name.split('.').pop();
            const uniqueId = Math.random().toString(36).substring(2, 15);
            const fileName = `pre_reg_${Date.now()}_${uniqueId}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { cacheControl: '3600', upsert: false });

            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
                publicAvatarUrl = publicUrl;
            }
        } catch (upErr) {
            console.error('Excepción subiendo imagen:', upErr);
        }
      }

      // 2. CREATE USER
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(), 
            first_name: firstName,
            last_name: lastName,
            profile_image_url: publicAvatarUrl
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users_jj')
          .upsert([{ 
              id_user: authData.user.id,
              email: email,
              first_name: firstName,
              last_name: lastName,
              profile_image_url: publicAvatarUrl
            }], { onConflict: 'id_user' });

        if (profileError) console.warn('Advertencia RLS:', profileError);

        setMessage('¡Registro exitoso! Por favor verifica tu correo electrónico para confirmar.');
        setView('login');
        
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setAvatarFile(null);
        setAvatarPreview(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) throw error;
      setMessage('Se ha enviado un enlace de recuperación a tu correo.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);

      try {
          const { error } = await supabase.auth.updateUser({ password: password });
          if (error) throw error;
          setMessage("Contraseña actualizada correctamente");
          setTimeout(() => {
              setView('login');
              setMessage(null);
          }, 2000);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  }

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
      
      <div className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl relative z-10 p-8 sm:p-10 max-h-[90vh] overflow-y-auto scrollbar-thin">
        
        {/* ENTERPRISE HEADER */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-700 mb-6 shadow-[0_0_30px_rgba(29,78,216,0.25)] border border-blue-600/30">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 12L19 5" />
                <path d="M12 12L5 5" />
                <path d="M12 12L5 19" />
                <path d="M12 12L19 19" />
                <circle cx="5" cy="5" r="2" />
                <circle cx="19" cy="5" r="2" />
                <circle cx="5" cy="19" r="2" />
                <circle cx="19" cy="19" r="2" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-black text-white tracking-tight mb-2">
            SOMMER <span className="text-zinc-500 font-medium">NETWORK NEXUS</span>
          </h1>
          
          <div className="flex items-center justify-center gap-2 mb-4">
              <div className="h-px w-8 bg-zinc-800"></div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Portal Corporativo
              </span>
              <div className="h-px w-8 bg-zinc-800"></div>
          </div>

          <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">
            {view === 'login' && 'Plataforma integral de operaciones de red. Ingrese sus credenciales para acceder al monitoreo en tiempo real.'}
            {view === 'register' && 'Creación de perfil para personal técnico. Requiere validación administrativa.'}
            {view === 'forgot_password' && 'Sistema de recuperación de credenciales seguro.'}
            {view === 'update_password' && 'Actualización de seguridad de cuenta.'}
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex flex-col gap-2 text-red-400 text-xs font-medium break-words">
            <div className="flex items-center gap-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
            </div>
          </div>
        )}
        {message && (
          <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3 text-green-400 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* FORMS */}
        <form onSubmit={
            view === 'login' ? handleLogin : 
            view === 'register' ? handleRegister : 
            view === 'update_password' ? handleUpdatePassword :
            handleResetPassword
        }>
          <div className="space-y-4">
            
            {/* REGISTER: Avatar Upload */}
            {view === 'register' && (
                <div className="flex justify-center mb-6">
                    <div 
                        className="relative group cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className={`w-20 h-20 rounded-full border border-dashed flex items-center justify-center overflow-hidden transition-all ${avatarPreview ? 'border-blue-500' : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500'}`}>
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <Camera className="w-6 h-6 text-zinc-500 group-hover:text-zinc-300" />
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                    </div>
                </div>
            )}

            {/* Split Name Fields (Register Only) */}
            {view === 'register' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input type="text" placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-zinc-600" required />
                </div>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input type="text" placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-zinc-600" required />
                </div>
              </div>
            )}

            {/* Email */}
            {view !== 'update_password' && (
                <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-zinc-600" required />
                </div>
            )}

            {/* Password */}
            {view !== 'forgot_password' && (
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-3 pl-10 pr-10 text-sm text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-zinc-600"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {view === 'login' && 'INGRESAR'}
                  {view === 'register' && 'REGISTRAR'}
                  {view === 'forgot_password' && 'ENVIAR'}
                  {view === 'update_password' && 'ACTUALIZAR'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>
          </div>
        </form>

        {/* GOOGLE AUTH BUTTON */}
        {(view === 'login' || view === 'register') && (
            <div className="mt-6">
                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-zinc-950 px-2 text-zinc-500">O</span></div>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white hover:bg-zinc-100 text-zinc-900 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                </button>
            </div>
        )}

        {/* Footer Navigation */}
        <div className="mt-8 pt-6 border-t border-zinc-900 flex flex-col gap-3 text-center">
          {view === 'login' && (
            <>
              <p className="text-xs text-zinc-500">¿Nuevo? <button onClick={() => setView('register')} className="text-blue-400 hover:text-blue-300 font-bold">Crear cuenta</button></p>
              <button onClick={() => setView('forgot_password')} className="text-zinc-600 hover:text-zinc-400 text-[10px] uppercase font-bold">Recuperar Contraseña</button>
            </>
          )}
          {view === 'register' && (
            <p className="text-xs text-zinc-500">¿Ya tienes cuenta? <button onClick={() => setView('login')} className="text-blue-400 hover:text-blue-300 font-bold">Ingresar</button></p>
          )}
          {(view === 'forgot_password' || view === 'update_password') && (
            <button onClick={() => setView('login')} className="text-zinc-500 hover:text-white text-xs font-bold">Volver</button>
          )}
        </div>
      </div>
      
      {/* Background Decorative Element */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px]"></div>
      </div>
    </div>
  );
};

export default AuthPage;
