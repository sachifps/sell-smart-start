
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
      console.log('AuthContext - Fetching roles and permissions for userId:', userId);
      
      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
      } else if (roleData) {
        console.log('AuthContext - Role data:', roleData);
        const role = roleData.role as UserRole;
        setUserRole(role);
        setIsAdmin(role === 'admin');
        console.log('AuthContext - Is admin:', role === 'admin');
      }

      // Fetch user permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('user_permissions')
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
            .from('user_permissions')
            .insert(defaultPerms)
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating default permissions:', createError);
          } else if (newPerms) {
            console.log('AuthContext - Created default permissions:', newPerms);
            setPermissions(newPerms as unknown as UserPermissions);
          }
        }
      } else if (permissionsData) {
        console.log('AuthContext - Permissions data:', permissionsData);
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
    // Add debug info
    console.log('AuthContext - Initial setup');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('AuthContext - Auth state changed:', event);
        console.log('AuthContext - Current session:', currentSession);
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          console.log('AuthContext - User logged in:', currentSession.user);
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
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log('AuthContext - Got existing session:', currentSession);
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
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

      // If user is created successfully, check if this email was pre-registered
      if (data.user) {
        // Check for pre-registered settings
        const { data: preregisteredData, error: preregError } = await supabase
          .from('preregistered_emails' as any)
          .select('*')
          .eq('email', email)
          .single();
        
        let roleToSet: UserRole = 'user';
        let permissions = {
          can_edit_sales: false,
          can_delete_sales: false,
          can_add_sales: false,
          can_edit_sales_detail: false,
          can_delete_sales_detail: false,
          can_add_sales_detail: false
        };
        
        // If email was pre-registered, use those settings
        if (!preregError && preregisteredData) {
          const typedData = preregisteredData as any;
          roleToSet = typedData.role as UserRole;
          permissions = {
            can_edit_sales: typedData.can_edit_sales,
            can_delete_sales: typedData.can_delete_sales,
            can_add_sales: typedData.can_add_sales,
            can_edit_sales_detail: typedData.can_edit_sales_detail,
            can_delete_sales_detail: typedData.can_delete_sales_detail,
            can_add_sales_detail: typedData.can_add_sales_detail
          };
        }

        // Insert the profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email
          });
          
        if (profileError) {
          console.error('Error setting up profile:', profileError);
        }
        
        // Insert the role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: roleToSet as any
          });
        
        if (roleError) {
          console.error('Error setting default role:', roleError);
        }
        
        // Create permissions record
        const { error: permError } = await supabase
          .from('user_permissions')
          .insert({
            user_id: data.user.id,
            ...permissions
          });
          
        if (permError) {
          console.error('Error setting default permissions:', permError);
        }
        
        // Delete the pre-registered email entry if it exists
        if (!preregError && preregisteredData) {
          await supabase
            .from('preregistered_emails' as any)
            .delete()
            .eq('email', email);
        }
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
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
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
