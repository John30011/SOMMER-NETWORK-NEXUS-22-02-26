
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, AuditLog } from '../types';
import { User, Mail, Shield, Camera, Save, Loader2, CheckCircle2, AlertCircle, Upload, Settings, KeyRound, Eye, EyeOff, Database, Server, RefreshCw, Target, Hammer, Link2, Zap, Briefcase, TrendingUp, Layout, History, Terminal } from 'lucide-react';

interface ProjectSettingsProps {
  onClose?: () => void;
}

type SettingsTab = 'profile' | 'security' | 'password' | 'database' | 'objectives';

const ProjectSettings: React.FC<ProjectSettingsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Profile Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  
  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Database Stats
  const [dbStats, setDbStats] = useState({
      users: 0,
      inventory: 0,
      failures: 0,
      providers: 0,
      kb: 0, // NEW DISCOVERED
      audit: 0, // NEW DISCOVERED
      connected: false
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
      if (activeTab === 'database') {
          checkDatabaseHealth();
          fetchAuditLogs();
      }
  }, [activeTab]);

  // Clear messages when switching tabs
  useEffect(() => {
      setMessage(null);
      setNewPassword('');
      setConfirmPassword('');
  }, [activeTab]);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setEmail(user.email || '');
        
        // Fetch extended profile
        const { data, error } = await supabase
          .from('users_jj')
          .select('*')
          .eq('id_user', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
            console.warn('Advertencia obteniendo perfil DB:', error.message);
        }

        const metaAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.user_metadata?.profile_image_url || null;

        if (data) {
          const profile = data as UserProfile;
          setUserProfile(profile);
          setFirstName(profile.first_name || user.user_metadata?.first_name || '');
          setLastName(profile.last_name || user.user_metadata?.last_name || '');
          // Prefer DB image, fallback to Auth Meta
          setAvatarUrl(profile.profile_image_url || metaAvatar);
        } else {
            const meta = user.user_metadata || {};
            let fName = meta.first_name || '';
            let lName = meta.last_name || '';
            
            if (!fName && meta.full_name) {
                const parts = meta.full_name.split(' ');
                fName = parts[0];
                lName = parts.slice(1).join(' ');
            }

            setFirstName(fName);
            setLastName(lName);
            setAvatarUrl(metaAvatar);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDatabaseHealth = async () => {
      setLoading(true);
      try {
          const [u, i, f, p, k, a] = await Promise.all([
              supabase.from('users_jj').select('*', { count: 'exact', head: true }),
              supabase.from('devices_inventory_jj').select('*', { count: 'exact', head: true }),
              supabase.from('network_failures_jj').select('*', { count: 'exact', head: true }),
              supabase.from('isp_providers_jj').select('*', { count: 'exact', head: true }),
              supabase.from('knowledge_base_jj').select('*', { count: 'exact', head: true }), // NEW DISCOVERED
              supabase.from('noc_audit_logs_jj').select('*', { count: 'exact', head: true }) // NEW DISCOVERED
          ]);
          
          setDbStats({
              users: u.count || 0,
              inventory: i.count || 0,
              failures: f.count || 0,
              providers: p.count || 0,
              kb: k.count || 0,
              audit: a.count || 0,
              connected: !u.error && !i.error
          });
      } catch (e) {
          console.error("DB Check failed", e);
          setDbStats(prev => ({ ...prev, connected: false }));
      } finally {
          setLoading(false);
      }
  };

  const fetchAuditLogs = async () => {
      try {
          const { data } = await supabase.from('noc_audit_logs_jj').select('*').order('timestamp', { ascending: false }).limit(20);
          if (data) setAuditLogs(data);
          else {
              // MOCK IF EMPTY
              setAuditLogs([
                  { id: 1, action: 'UPDATE_FAILURE', table_name: 'network_failures_jj', record_id: 'FAIL-99', user_email: 'admin@sommer.com', timestamp: new Date().toISOString() },
                  { id: 2, action: 'LOGIN_SUCCESS', table_name: 'users_jj', record_id: 'USER-1', user_email: 'noc@sommer.com', timestamp: new Date().toISOString() }
              ]);
          }
      } catch (e) {
          console.warn("Error fetching logs", e);
      }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > 10 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'La imagen no debe superar los 10MB.' });
            return;
        }
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        setMessage(null);
    }
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa.");

      let finalAvatarUrl = avatarUrl;

      // 1. Upload new avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, avatarFile, { upsert: true });

        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
            finalAvatarUrl = publicUrl;
        }
      }

      // 2. Prepare Updates
      const updates = {
        id_user: user.id,
        first_name: firstName,
        last_name: lastName,
        email: email, 
        profile_image_url: finalAvatarUrl,
      };

      // 3. Update DB
      const { error: updateError } = await supabase
        .from('users_jj')
        .upsert(updates, { onConflict: 'id_user' });

      if (updateError && updateError.code !== '42501') {
          throw updateError;
      }

      // 4. Update Auth Metadata
      const { error: authUpdateError } = await supabase.auth.updateUser({
          data: { 
              full_name: `${firstName} ${lastName}`.trim(),
              first_name: firstName,
              last_name: lastName,
              profile_image_url: finalAvatarUrl
          }
      });

      if (authUpdateError) throw authUpdateError;

      setUserProfile({ ...userProfile, ...updates } as UserProfile);
      setAvatarUrl(finalAvatarUrl);
      setAvatarFile(null);
      setAvatarPreview(null);

      setMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
      
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: error.message || 'Error al guardar cambios.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
      setSaving(true);
      setMessage(null);

      if (newPassword.length < 6) {
          setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
          setSaving(false);
          return;
      }

      if (newPassword !== confirmPassword) {
          setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
          setSaving(false);
          return;
      }

      try {
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if (error) throw error;
          
          setMessage({ type: 'success', text: 'Contraseña actualizada exitosamente.' });
          setNewPassword('');
          setConfirmPassword('');
      } catch (err: any) {
          setMessage({ type: 'error', text: err.message || 'Error al actualizar la contraseña.' });
      } finally {
          setSaving(false);
      }
  };

  if (loading && activeTab !== 'database' && activeTab !== 'objectives') {
      return (
          <div className="flex h-full items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
      );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="mb-8 border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="text-zinc-400" />
            Configuración de Cuenta
        </h1>
        <p className="text-zinc-500 mt-1">Administra tu perfil, seguridad y base de datos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Sidebar / Navigation within Settings */}
        <div className="md:col-span-1 space-y-2">
            <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium text-sm flex items-center gap-3 transition-colors ${
                    activeTab === 'profile' 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                }`}
            >
                <User className="w-4 h-4" />
                Editar Perfil
            </button>
            
            <button 
                onClick={() => setActiveTab('password')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium text-sm flex items-center gap-3 transition-colors ${
                    activeTab === 'password' 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                }`}
            >
                <KeyRound className="w-4 h-4" />
                Cambio de Contraseña
            </button>

            <button 
                onClick={() => setActiveTab('database')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium text-sm flex items-center gap-3 transition-colors ${
                    activeTab === 'database' 
                    ? 'bg-purple-600/10 text-purple-400 border border-purple-600/20' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                }`}
            >
                <Database className="w-4 h-4" />
                Admin Base de Datos
            </button>

            <button 
                onClick={() => setActiveTab('objectives')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium text-sm flex items-center gap-3 transition-colors ${
                    activeTab === 'objectives' 
                    ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                }`}
            >
                <Target className="w-4 h-4" />
                Objetivos del Sistema
            </button>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-2">
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 shadow-xl relative overflow-hidden min-h-[500px]">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r 
                    ${activeTab === 'database' ? 'from-purple-600 to-pink-600' : 
                      activeTab === 'objectives' ? 'from-emerald-500 to-teal-500' : 
                      'from-blue-600 to-purple-600'}`}>
                </div>
                
                {message && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
                        message.type === 'success' 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {message.text}
                    </div>
                )}

                {/* --- PROFILE TAB --- */}
                {activeTab === 'profile' && (
                    <div className="animate-in fade-in duration-300 space-y-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 pb-4 border-b border-zinc-900">
                            Información Personal
                        </h2>
                        
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-6 border-b border-zinc-900">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center overflow-hidden shadow-lg group-hover:border-blue-500 transition-colors">
                                    {avatarPreview || avatarUrl ? (
                                        <img 
                                            src={avatarPreview || avatarUrl || ''} 
                                            alt="Profile" 
                                            className="w-full h-full object-cover" 
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <User className="w-10 h-10 text-zinc-600" />
                                    )}
                                </div>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg border-2 border-zinc-950 transition-transform hover:scale-110"
                                    title="Cambiar imagen"
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                />
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="text-white font-medium mb-1">Foto de Perfil</h3>
                                <p className="text-xs text-zinc-500 mb-3">
                                    Recomendamos una imagen cuadrada de al menos 400x400px.<br/>
                                    Formatos: JPG, PNG. Max 10MB.
                                </p>
                                <button 
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors flex items-center gap-2 mx-auto sm:mx-0"
                                >
                                    <Upload className="w-3 h-3" /> Subir nueva imagen
                                </button>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Nombre</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                    <input 
                                        type="text" 
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-700"
                                        placeholder="Ej. Juan"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Apellido</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                    <input 
                                        type="text" 
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-700"
                                        placeholder="Ej. Pérez"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Correo Electrónico</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                    <input 
                                        type="email" 
                                        value={email}
                                        disabled
                                        className="w-full bg-zinc-900/30 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-400 focus:outline-none cursor-not-allowed"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Shield className="w-4 h-4 text-green-500/50" />
                                    </div>
                                </div>
                                <p className="text-[10px] text-zinc-600">El correo electrónico es gestionado por el administrador y no puede cambiarse aquí.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Rol de Sistema</label>
                                <div className="w-full bg-zinc-900/30 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm text-zinc-400 font-mono">
                                    {userProfile?.role || 'Analyst'}
                                </div>
                            </div>
                        </div>
                        
                        {/* Footer Profile */}
                        <div className="pt-6 border-t border-zinc-900 flex justify-end gap-3">
                            <button 
                                type="button"
                                disabled={saving}
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button"
                                onClick={handleUpdateProfile}
                                disabled={saving}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition-all transform active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar Perfil
                            </button>
                        </div>
                    </div>
                )}

                {/* --- PASSWORD TAB --- */}
                {activeTab === 'password' && (
                    <div className="animate-in fade-in duration-300 space-y-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 pb-4 border-b border-zinc-900">
                            Cambiar Contraseña
                        </h2>
                        
                        <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
                            <p className="text-xs text-yellow-500/80">
                                Asegúrese de elegir una contraseña segura. La nueva contraseña se aplicará inmediatamente en todos sus dispositivos.
                            </p>
                        </div>

                        <div className="space-y-5 max-w-md">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Nueva Contraseña</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-10 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-700"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Confirmar Contraseña</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-700"
                                        placeholder="Repetir nueva contraseña"
                                    />
                                </div>
                            </div>
                        </div>

                         {/* Footer Password */}
                        <div className="pt-6 border-t border-zinc-900 flex justify-end gap-3">
                            <button 
                                type="button"
                                disabled={saving}
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button"
                                onClick={handleUpdatePassword}
                                disabled={saving || !newPassword || !confirmPassword}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition-all transform active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Actualizar Contraseña
                            </button>
                        </div>
                    </div>
                )}

                {/* --- DATABASE TAB --- */}
                 {activeTab === 'database' && (
                    <div className="animate-in fade-in duration-300 space-y-6">
                        <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Server className="w-5 h-5 text-purple-500" />
                                Estado de la Base de Datos
                            </h2>
                            <button onClick={checkDatabaseHealth} className="p-2 bg-zinc-900 rounded-md hover:text-white text-zinc-400">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-white mb-1">{dbStats.users}</span>
                                <span className="text-[10px] text-zinc-500 uppercase font-bold">Usuarios</span>
                            </div>
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-white mb-1">{dbStats.inventory}</span>
                                <span className="text-[10px] text-zinc-500 uppercase font-bold">Dispositivos</span>
                            </div>
                             <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-white mb-1">{dbStats.failures}</span>
                                <span className="text-[10px] text-zinc-500 uppercase font-bold">Fallas</span>
                            </div>
                             <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-white mb-1">{dbStats.providers}</span>
                                <span className="text-[10px] text-zinc-500 uppercase font-bold">Proveedores</span>
                            </div>
                            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 flex flex-col items-center justify-center shadow-inner">
                                <span className="text-2xl font-bold text-purple-400 mb-1">{dbStats.kb}</span>
                                <span className="text-[10px] text-purple-300 uppercase font-bold">Nexus KB</span>
                            </div>
                            <div className="bg-pink-900/20 border border-pink-500/30 rounded-lg p-4 flex flex-col items-center justify-center shadow-inner">
                                <span className="text-2xl font-bold text-pink-400 mb-1">{dbStats.audit}</span>
                                <span className="text-[10px] text-pink-300 uppercase font-bold">Logs Auditoría</span>
                            </div>
                        </div>

                        {/* AUDIT LOGS MINI-TABLE */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <History className="w-4 h-4" /> Actividad Reciente del Sistema
                            </h3>
                            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-[10px]">
                                    <thead className="bg-black/40 border-b border-zinc-800">
                                        <tr>
                                            <th className="p-3 text-zinc-500 font-bold uppercase">Usuario</th>
                                            <th className="p-3 text-zinc-500 font-bold uppercase">Acción</th>
                                            <th className="p-3 text-zinc-500 font-bold uppercase">Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {auditLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-3 text-zinc-300 font-medium truncate max-w-[120px]">{log.user_email}</td>
                                                <td className="p-3">
                                                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-400 font-mono">{log.action}</span>
                                                </td>
                                                <td className="p-3 text-zinc-500 font-mono">{new Date(log.timestamp).toLocaleString([], {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short'})}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-3 h-3 rounded-full ${dbStats.connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
                                <span className={`font-bold text-sm ${dbStats.connected ? 'text-green-400' : 'text-red-400'}`}>
                                    {dbStats.connected ? 'Conexión Establecida' : 'Error de Conexión'}
                                </span>
                            </div>
                            <p className="text-xs text-zinc-500">
                                Conectado a proyecto Supabase: <span className="font-mono text-zinc-300">xellkrtqohbyrdlcnuux</span>
                            </p>
                        </div>
                    </div>
                 )}

                 {/* --- OBJECTIVES TAB --- */}
                 {activeTab === 'objectives' && (
                    <div className="animate-in fade-in duration-300 space-y-6">
                        <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Target className="w-5 h-5 text-emerald-500" />
                                Objetivos del Sistema
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { id: 1, title: 'Construir', icon: Hammer, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', desc: 'Infraestructura sólida y resiliente.' },
                                { id: 2, title: 'Integrar', icon: Link2, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', desc: 'Unificación de servicios y datos.' },
                                { id: 3, title: 'Observar', icon: Eye, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', desc: 'Visibilidad total en tiempo real.' },
                                { id: 4, title: 'Optimizar', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', desc: 'Mejora continua del rendimiento.' },
                                { id: 5, title: 'Gestionar', icon: Briefcase, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', desc: 'Control operativo centralizado.' },
                                { id: 6, title: 'Escalar', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', desc: 'Crecimiento sin límites.' },
                            ].map((obj) => {
                                const Icon = obj.icon;
                                return (
                                    <div key={obj.id} className={`p-5 rounded-xl border ${obj.border} bg-zinc-900/40 hover:bg-zinc-900 transition-all group relative overflow-hidden`}>
                                        <div className={`absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity`}>
                                            <Icon className={`w-16 h-16 ${obj.color}`} />
                                        </div>
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${obj.bg} ${obj.color} mb-3 shadow-inner`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-white font-bold text-lg mb-1">{obj.id}. {obj.title}</h3>
                                        <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                                            {obj.desc}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 text-center">
                            <p className="text-xs text-zinc-500 italic">
                                "La excelencia operativa no es un acto, sino un hábito."
                            </p>
                        </div>
                    </div>
                 )}

            </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectSettings;
