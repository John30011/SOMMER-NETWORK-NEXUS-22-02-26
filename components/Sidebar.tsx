
import React, { useEffect, useState, useRef } from 'react';
import { LayoutDashboard, Radio, Package, LogOut, User, Lock, LogIn, Settings, Cable, CheckCircle, BarChart3, MessageSquare, Bot, AudioLines, BookOpen, Activity } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [imgError, setImgError] = useState(false);
  
  // Prevents infinite loop of profile creation attempts in one session
  const profileAttemptRef = useRef<boolean>(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, public: true },
    { id: 'degradations', label: 'Degradaciones', icon: Activity, public: false },
    { id: 'massive', label: 'Masivos', icon: Radio, public: false },
    { id: 'resolved', label: 'Resueltos', icon: CheckCircle, public: false },
    { id: 'metrics', label: 'Métricas', icon: BarChart3, public: false },
    { id: 'inventory', label: 'Inventario', icon: Package, public: false },
    { id: 'providers', label: 'Proveedores', icon: Cable, public: false },
    { id: 'message', label: 'Mensajería', icon: MessageSquare, public: false },
    { id: 'agent', label: 'Agent Nexus', icon: Bot, public: false },
    { id: 'voice-mode', label: 'Nexus Voice', icon: AudioLines, public: false },
    { id: 'kb', label: 'Nexus KB', icon: BookOpen, public: false },
    { id: 'settings', label: 'Cuenta', icon: Settings, public: false },
  ];

  useEffect(() => {
    // Initial fetch
    getProfile();

    // Listen for auth changes to update sidebar profile immediately
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
            getProfile();
        } else {
            setProfile(null);
            profileAttemptRef.current = false; // Reset attempt on logout
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Reset image error state when profile changes
  useEffect(() => {
      setImgError(false);
  }, [profile?.profile_image_url]);

  const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Try to fetch existing profile from DB
        const { data, error } = await supabase
          .from('users_jj')
          .select('*')
          .eq('id_user', user.id)
          .single();
        
        if (data && !error) {
          // Profile exists
          const dbProfile = data as UserProfile;
          
          // Sync Avatar if missing in DB but present in Auth (Self-healing for Google/OAuth)
          const metaAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.user_metadata?.profile_image_url;
          
          if (!dbProfile.profile_image_url && metaAvatar) {
             dbProfile.profile_image_url = metaAvatar;
          }
          setProfile(dbProfile);
        } else {
          // 2. Profile DOES NOT exist (First time Google Login)
          
          // CRITICAL FIX: Only attempt creation once per session mount to prevent loops
          if (profileAttemptRef.current) return;
          profileAttemptRef.current = true;

          console.log("Perfil no encontrado en DB. Creando registro automático para usuario OAuth...");
          
          const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
          const metaImage = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.user_metadata?.profile_image_url || null;
          
          // Split name logic
          let firstName = 'Usuario';
          let lastName = '';
          
          if (metaName) {
              const parts = metaName.split(' ');
              firstName = parts[0];
              lastName = parts.slice(1).join(' ');
          }

          const newProfile = {
            id_user: user.id,
            email: user.email || '',
            first_name: firstName,
            last_name: lastName,
            role: 'Analyst', // Default role for new Google users
            profile_image_url: metaImage
          };

          // Insert into DB (Fire and forget, but update UI immediately)
          await supabase.from('users_jj').upsert([newProfile], { onConflict: 'id_user' });
          
          // Update local state immediately so user sees their info
          setProfile(newProfile);
        }
      } else {
          setProfile(null);
      }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    // App.tsx logic will handle the redirect/view change
  };

  const getFullName = () => {
      if (!profile) return 'Invitado';
      const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      return name || 'Usuario';
  }

  return (
    <>
        {/* === DESKTOP SIDEBAR (Hidden on Mobile) === */}
        <div className="hidden md:flex fixed left-0 top-0 h-full bg-zinc-950 border-r border-zinc-900 w-16 hover:w-64 transition-all duration-300 ease-in-out group z-50 flex-col shadow-2xl">
        {/* Menu Items */}
        <nav className="flex-1 py-6 flex flex-col gap-2 mt-16 overflow-y-auto no-scrollbar"> 
            {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
                <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative h-12 flex items-center px-4 transition-colors duration-200 shrink-0 ${
                    isActive 
                    ? 'text-blue-500 border-r-2 border-blue-500' 
                    : 'text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
                >
                <div className="relative">
                    <Icon className="w-6 h-6 min-w-[24px]" strokeWidth={isActive ? 2.5 : 2} />
                    {!item.public && !profile && (
                        <div className="absolute -top-1 -right-1 bg-zinc-950 rounded-full">
                            <Lock className="w-2.5 h-2.5 text-zinc-600" />
                        </div>
                    )}
                </div>
                <span className="ml-4 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 overflow-hidden font-medium text-sm">
                    {item.label}
                </span>
                </button>
            );
            })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950">
            <div className="flex items-center overflow-hidden">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg relative ${profile ? 'bg-gradient-to-tr from-blue-600 to-purple-600' : 'bg-zinc-800'}`}>
                {profile?.profile_image_url && !imgError ? (
                <img 
                    src={profile.profile_image_url} 
                    alt="User" 
                    className="w-full h-full rounded-full object-cover" 
                    onError={() => setImgError(true)}
                    referrerPolicy="no-referrer"
                />
                ) : (
                <span className="font-bold text-xs">
                    {profile?.first_name ? profile.first_name.charAt(0).toUpperCase() : <User className="w-4 h-4 text-zinc-500" />}
                </span>
                )}
            </div>
            
            <div className="ml-3 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-200 min-w-0">
                {profile ? (
                    <>
                        <span className="text-sm font-semibold text-zinc-200 truncate" title={getFullName()}>
                            {getFullName()}
                        </span>
                        <span className="text-[10px] text-zinc-500 truncate uppercase tracking-wider">{profile.role || 'N/A'}</span>
                    </>
                ) : (
                    <>
                        <span className="text-sm font-semibold text-zinc-200 truncate">Invitado</span>
                        <button 
                            onClick={() => setActiveTab('login')}
                            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider mt-0.5 transition-colors text-left"
                        >
                            Iniciar Sesión <LogIn className="w-3 h-3" />
                        </button>
                    </>
                )}
            </div>
            
            {profile && (
                <button 
                    onClick={handleLogout}
                    className="ml-auto p-1.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    title="Cerrar Sesión"
                >
                    <LogOut size={16} />
                    <span className="sr-only">Logout</span>
                </button>
            )}
            </div>
        </div>
        </div>

        {/* === MOBILE BOTTOM NAVIGATION (Visible on Mobile) === */}
        <div className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-900 z-50 flex items-center justify-between px-2 pb-safe overflow-x-auto no-scrollbar gap-2">
            {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex flex-col items-center justify-center min-w-[60px] h-full gap-1 shrink-0 ${
                            isActive ? 'text-blue-500' : 'text-zinc-500'
                        }`}
                    >
                        <div className={`p-1 rounded-full ${isActive ? 'bg-blue-500/10' : ''}`}>
                             <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <span className="text-[9px] font-medium whitespace-nowrap">{item.label}</span>
                    </button>
                );
            })}
             {/* Mobile User/Logout shortcut */}
             {profile ? (
                 <button onClick={handleLogout} className="flex flex-col items-center justify-center min-w-[60px] h-full gap-1 text-red-500/70 shrink-0">
                    <LogOut className="w-5 h-5" />
                    <span className="text-[9px] font-medium">Salir</span>
                 </button>
             ) : (
                <button onClick={() => setActiveTab('login')} className="flex flex-col items-center justify-center min-w-[60px] h-full gap-1 text-blue-400/70 shrink-0">
                    <LogIn className="w-5 h-5" />
                    <span className="text-[9px] font-medium">Entrar</span>
                 </button>
             )}
        </div>
    </>
  );
};

export default Sidebar;
