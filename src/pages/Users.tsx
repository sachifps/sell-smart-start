
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, UserMinus, UserCog, CheckCircle, Save, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { User, UserRole } from '@/types/supabase';

interface NewUserForm {
  email: string;
  password: string;
  role: UserRole;
}

const Users = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    email: '',
    password: '',
    role: 'user',
  });
  const [editingRole, setEditingRole] = useState<{id: string, role: UserRole} | null>(null);

  // Check if current user is admin
  React.useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single() as { data: { role: UserRole } | null; error: any };
          
          if (data && data.role === 'admin') {
            setIsAdmin(true);
          } else {
            // Redirect non-admin users away from this page
            window.location.href = '/dashboard';
          }
        } catch (error) {
          console.error("Error checking user role:", error);
          // Redirect on error
          window.location.href = '/dashboard';
        }
      }
    };

    checkUserRole();
  }, [user]);

  // Query users
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        // We need to join user data with roles
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('*, user_roles(role)')
          .order('created_at', { ascending: false }) as { data: any[] | null; error: any };
        
        if (usersError) throw usersError;
        
        return (usersData || []).map((userData: any) => ({
          id: userData.id,
          email: userData.email,
          role: userData.user_roles && userData.user_roles.length > 0 
            ? userData.user_roles[0].role 
            : 'user',
          created_at: userData.created_at
        })) as User[];
      } catch (error) {
        console.error("Error fetching users:", error);
        return [];
      }
    },
    enabled: isAdmin, // Only run query if user is admin
  });

  // Create new user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: NewUserForm) => {
      // First, create the user in Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });
      
      if (authError) throw authError;
      
      if (!authData.user) throw new Error("Failed to create user");
      
      // Then, assign the role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: authData.user.id,
          role: userData.role,
        }]);
      
      if (roleError) throw roleError;
      
      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setAddUserDialogOpen(false);
      resetNewUserForm();
      toast({
        title: "User created",
        description: "New user has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating user",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: UserRole }) => {
      // First, check if role exists
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select()
        .eq('user_id', userId) as { data: any[] | null; error: any };
      
      if (checkError) throw checkError;
      
      if (existingRole && existingRole.length > 0) {
        // Update existing role
        const { data, error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId)
          .select();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new role
        const { data, error } = await supabase
          .from('user_roles')
          .insert([{
            user_id: userId,
            role: role,
          }])
          .select();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingRole(null);
      toast({
        title: "Role updated",
        description: "User role has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating role",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Admin can delete any user except themselves
      if (userId === user?.id) {
        throw new Error("You cannot delete your own account");
      }
      
      // Delete user's role and profile
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (roleError) throw roleError;
        
      // Then delete the user from auth
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) throw error;
      
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "User deleted",
        description: "User has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting user",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  const handleNewUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUserForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNewUserRoleChange = (value: string) => {
    setNewUserForm(prev => ({
      ...prev,
      role: value as UserRole
    }));
  };

  const handleAddUser = () => {
    if (!newUserForm.email || !newUserForm.password) {
      toast({
        title: "Validation Error",
        description: "Email and password are required",
        variant: "destructive",
      });
      return;
    }
    
    createUserMutation.mutate(newUserForm);
  };

  const resetNewUserForm = () => {
    setNewUserForm({
      email: '',
      password: '',
      role: 'user',
    });
  };

  const handleEditRole = (userId: string, currentRole: UserRole) => {
    setEditingRole({ id: userId, role: currentRole });
  };

  const handleSaveRole = () => {
    if (!editingRole) return;
    
    updateUserRoleMutation.mutate({
      userId: editingRole.id,
      role: editingRole.role,
    });
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-center mb-4">
              You do not have permission to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Users Management</CardTitle>
          <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account and assign a role.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="email" className="text-right">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    className="col-span-3"
                    value={newUserForm.email}
                    onChange={handleNewUserInputChange}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="password" className="text-right">
                    Password
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    className="col-span-3"
                    value={newUserForm.password}
                    onChange={handleNewUserInputChange}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="role" className="text-right">
                    Role
                  </label>
                  <Select
                    value={newUserForm.role}
                    onValueChange={handleNewUserRoleChange}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users && users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {editingRole && editingRole.id === user.id ? (
                          <Select
                            value={editingRole.role}
                            onValueChange={(value) => setEditingRole({
                              ...editingRole,
                              role: value as UserRole
                            })}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.role === 'admin' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {editingRole && editingRole.id === user.id ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setEditingRole(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm"
                                onClick={handleSaveRole}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditRole(user.id, user.role)}
                              >
                                <UserCog className="h-4 w-4" />
                              </Button>
                              {/* Don't allow deletion of own account */}
                              {user.id !== user?.id && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <UserMinus className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
