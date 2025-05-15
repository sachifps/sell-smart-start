
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase, ensureUserProfile } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

type UserRole = 'admin' | 'user';

type UserPermissions = {
  can_edit_sales: boolean;
  can_delete_sales: boolean;
  can_add_sales: boolean;
  can_edit_sales_detail: boolean;
  can_delete_sales_detail: boolean;
  can_add_sales_detail: boolean;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  userRole: UserRole | null;
  permissions: UserPermissions | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);

  const fetchUserRoleAndPermissions = async (userId: string) => {
    try {
      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
      } else if (roleData) {
        setUserRole(roleData.role as UserRole);
        setIsAdmin(roleData.role === 'admin');
      }

      // Fetch user permissions using type assertion for the table name
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('user_permissions' as any)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (permissionsError) {
        console.error('Error fetching user permissions:', permissionsError);
        
        // If permissions don't exist yet, create default permissions for the user
        if (permissionsError.code === 'PGRST116') { // No rows found
          const isUserAdmin = roleData?.role === 'admin';
          const defaultPerms = {
            user_id: userId,
            can_edit_sales: isUserAdmin,
            can_delete_sales: isUserAdmin,
            can_add_sales: isUserAdmin,
            can_edit_sales_detail: isUserAdmin,
            can_delete_sales_detail: isUserAdmin,
            can_add_sales_detail: isUserAdmin
          };
          
          const { data: newPerms, error: createError } = await supabase
            .from('user_permissions' as any)
            .insert(defaultPerms)
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating default permissions:', createError);
          } else if (newPerms) {
            setPermissions(newPerms as unknown as UserPermissions);
          }
        }
      } else if (permissionsData) {
        // Type assertion to handle the conversion
        setPermissions(permissionsData as unknown as UserPermissions);
      }
    } catch (error) {
      console.error('Error in fetchUserRoleAndPermissions:', error);
    }
  };

  const refreshPermissions = async () => {
    if (user) {
      await fetchUserRoleAndPermissions(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // Ensure user has a profile
          await ensureUserProfile(currentSession.user.id, currentSession.user.email || '');
          
          // Use setTimeout to avoid potential deadlocks
          setTimeout(() => {
            fetchUserRoleAndPermissions(currentSession.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setIsAdmin(false);
          setPermissions(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        // Ensure user has a profile
        await ensureUserProfile(currentSession.user.id, currentSession.user.email || '');
        fetchUserRoleAndPermissions(currentSession.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signup = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Create user with Supabase
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });
      
      if (error) throw error;

      // Ensure profile is created - in case the DB trigger doesn't work
      if (data.user) {
        await ensureUserProfile(data.user.id, email);
      }

      toast.success('Account created successfully! Please check your email for verification.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Signup failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Ensure profile is created
      if (data.user) {
        await ensureUserProfile(data.user.id, email);
      }
      
      toast.success('Login successful');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Logout failed');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoading, 
      isAdmin, 
      userRole, 
      permissions, 
      login, 
      signup, 
      logout,
      refreshPermissions
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
