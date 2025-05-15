import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/app-header';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Shield, Settings, RefreshCcw, UserPlus, AlertCircle, Mail, Lock, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type User = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  last_sign_in_at?: string | null;
  created_at?: string;
};

type UserPermission = {
  id: string;
  user_id: string;
  can_edit_sales: boolean;
  can_delete_sales: boolean;
  can_add_sales: boolean;
  can_edit_sales_detail: boolean;
  can_delete_sales_detail: boolean;
  can_add_sales_detail: boolean;
};

// Define form schema for adding a new user
const addUserSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  name: z.string().min(1, { message: "Name is required" }),
  role: z.enum(['user', 'admin']),
});

type AddUserFormValues = z.infer<typeof addUserSchema>;

const ManageUsers = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermission | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Initialize form for adding users
  const addUserForm = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      role: 'user',
    },
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get all users from Supabase auth
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
        // Fallback to using profiles table
        return fetchUsersFromProfiles();
      }
      
      if (authUsers && authUsers.users) {
        // Get user roles
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');
        
        if (rolesError) throw rolesError;
        
        // Combine data
        const usersList = authUsers.users.map(authUser => {
          const userRole = roles?.find(role => role.user_id === authUser.id);
          return {
            id: authUser.id,
            email: authUser.email || 'No email',
            role: userRole ? userRole.role : 'user',
            last_sign_in_at: authUser.last_sign_in_at,
            created_at: authUser.created_at
          };
        });
        
        setUsers(usersList);
        setLoading(false);
      } else {
        // Fallback to using profiles table
        fetchUsersFromProfiles();
      }
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      // Fallback to using profiles table
      fetchUsersFromProfiles();
    }
  };
  
  // Fallback method to fetch users from profiles table
  const fetchUsersFromProfiles = async () => {
    try {
      // Get all users from profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, created_at');
      
      if (profilesError) throw profilesError;
      
      // Get user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;
      
      // Combine data
      const usersList = profiles.map(profile => {
        const userRole = roles?.find(role => role.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          role: userRole ? userRole.role : 'user',
          created_at: profile.created_at
        };
      });
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users from profiles:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPermissions = async (userId: string) => {
    try {
      // Use type assertion for the table name
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      
      // Type assertion to handle the conversion
      setPermissions(data as unknown as UserPermission);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      toast({
        title: "Error",
        description: "Failed to load user permissions",
        variant: "destructive"
      });
    }
  };

  const handlePermissionChange = async (permission: keyof UserPermission, value: boolean) => {
    if (!permissions || !selectedUser || !isAdmin) return;
    
    try {
      // Update local state first for responsive UI
      setPermissions({
        ...permissions,
        [permission]: value
      });
      
      // Update in database - using type assertion
      const { error } = await supabase
        .from('user_permissions')
        .update({ [permission]: value, updated_at: new Date().toISOString() })
        .eq('user_id', selectedUser.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "User permissions updated"
      });
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive"
      });
      
      // Revert local state if update fails
      fetchUserPermissions(selectedUser.id);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail || addingAdmin || !isAdmin) return;
    
    try {
      setAddingAdmin(true);
      
      // First check if user exists
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newAdminEmail)
        .single();
      
      if (userError) {
        toast({
          title: "Error",
          description: "User not found with this email",
          variant: "destructive"
        });
        return;
      }
      
      // Add admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userData.id, 
          role: 'admin' 
        }, { onConflict: 'user_id,role' });
      
      if (roleError) throw roleError;
      
      // Update permissions
      const { error: permError } = await supabase
        .from('user_permissions')
        .upsert({ 
          user_id: userData.id,
          can_edit_sales: true,
          can_delete_sales: true,
          can_add_sales: true,
          can_edit_sales_detail: true,
          can_delete_sales_detail: true,
          can_add_sales_detail: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      
      if (permError) throw permError;
      
      toast({
        title: "Success",
        description: `${newAdminEmail} is now an admin`
      });
      
      setNewAdminEmail('');
      fetchUsers();
    } catch (error) {
      console.error('Error adding admin:', error);
      toast({
        title: "Error",
        description: "Failed to add admin user",
        variant: "destructive"
      });
    } finally {
      setAddingAdmin(false);
    }
  };

  // New function to add a user
  const handleAddUser = async (values: AddUserFormValues) => {
    if (!isAdmin) return;
    
    try {
      setIsAddingUser(true);
      
      // Create the user in Supabase Auth
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true,
        user_metadata: {
          name: values.name,
        },
      });
      
      if (createError) throw createError;
      
      if (userData.user) {
        // Add user role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ 
            user_id: userData.user.id, 
            role: values.role 
          });
        
        if (roleError) throw roleError;
        
        // Setup default permissions based on role
        const isUserAdmin = values.role === 'admin';
        const { error: permError } = await supabase
          .from('user_permissions')
          .insert({ 
            user_id: userData.user.id,
            can_edit_sales: isUserAdmin,
            can_delete_sales: isUserAdmin,
            can_add_sales: isUserAdmin,
            can_edit_sales_detail: isUserAdmin,
            can_delete_sales_detail: isUserAdmin,
            can_add_sales_detail: isUserAdmin
          });
        
        if (permError) throw permError;
        
        toast({
          title: "Success",
          description: `User ${values.email} has been created`
        });
        
        // Reset form and close dialog
        addUserForm.reset();
        setAddUserOpen(false);
        
        // Refresh users list
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive"
      });
    } finally {
      setIsAddingUser(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader currentPath="/manage-users" />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Manage Users</h1>
            <p className="text-muted-foreground">Configure user roles and permissions</p>
          </div>
          
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              onClick={fetchUsers}
              className="flex items-center"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            
            {isAdmin && (
              <>
                <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account with specified role and permissions.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...addUserForm}>
                      <form onSubmit={addUserForm.handleSubmit(handleAddUser)} className="space-y-4 py-2">
                        <FormField
                          control={addUserForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <div className="flex items-center">
                                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                  <Input placeholder="John Doe" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={addUserForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <div className="flex items-center">
                                  <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                                  <Input placeholder="user@example.com" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={addUserForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="flex items-center">
                                  <Lock className="mr-2 h-4 w-4 text-muted-foreground" />
                                  <Input type="password" placeholder="******" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={addUserForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>User Role</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="user">Regular User</SelectItem>
                                  <SelectItem value="admin">Administrator</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Admins have full access to all functionality
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter className="mt-6">
                          <Button type="submit" disabled={isAddingUser}>
                            {isAddingUser ? 'Creating...' : 'Create User'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="flex items-center">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Admin</DialogTitle>
                      <DialogDescription>
                        Enter the email of the user you want to assign admin privileges.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Input
                        placeholder="user@example.com"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button 
                        onClick={handleAddAdmin} 
                        disabled={!newAdminEmail || addingAdmin}
                      >
                        {addingAdmin ? 'Adding...' : 'Add Admin'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="bg-card rounded-md shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {user.role === 'admin' ? (
                          <div className="flex items-center space-x-1 text-primary font-medium">
                            <Shield className="h-4 w-4" />
                            <span>Admin</span>
                          </div>
                        ) : (
                          <span>User</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              fetchUserPermissions(user.id);
                            }}
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Permissions
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>User Permissions</DialogTitle>
                            <DialogDescription>
                              {isAdmin 
                                ? `Configure permissions for ${selectedUser?.email}`
                                : `View permissions for ${selectedUser?.email}`
                              }
                            </DialogDescription>
                          </DialogHeader>
                          
                          {permissions ? (
                            <div className="space-y-4 py-4">
                              <h3 className="font-semibold mb-2">Sales Permissions</h3>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    id="add-sales" 
                                    checked={permissions.can_add_sales}
                                    onCheckedChange={(checked) => 
                                      isAdmin && handlePermissionChange('can_add_sales', checked === true)
                                    }
                                    disabled={!isAdmin}
                                  />
                                  <label htmlFor="add-sales">Can add sales</label>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    id="edit-sales" 
                                    checked={permissions.can_edit_sales}
                                    onCheckedChange={(checked) => 
                                      isAdmin && handlePermissionChange('can_edit_sales', checked === true)
                                    }
                                    disabled={!isAdmin}
                                  />
                                  <label htmlFor="edit-sales">Can edit sales</label>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    id="delete-sales" 
                                    checked={permissions.can_delete_sales}
                                    onCheckedChange={(checked) => 
                                      isAdmin && handlePermissionChange('can_delete_sales', checked === true)
                                    }
                                    disabled={!isAdmin}
                                  />
                                  <label htmlFor="delete-sales">Can delete sales</label>
                                </div>
                              </div>
                              
                              <h3 className="font-semibold mb-2 mt-4">Sales Detail Permissions</h3>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    id="add-sales-detail" 
                                    checked={permissions.can_add_sales_detail}
                                    onCheckedChange={(checked) => 
                                      isAdmin && handlePermissionChange('can_add_sales_detail', checked === true)
                                    }
                                    disabled={!isAdmin}
                                  />
                                  <label htmlFor="add-sales-detail">Can add sales details</label>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    id="edit-sales-detail" 
                                    checked={permissions.can_edit_sales_detail}
                                    onCheckedChange={(checked) => 
                                      isAdmin && handlePermissionChange('can_edit_sales_detail', checked === true)
                                    }
                                    disabled={!isAdmin}
                                  />
                                  <label htmlFor="edit-sales-detail">Can edit sales details</label>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    id="delete-sales-detail" 
                                    checked={permissions.can_delete_sales_detail}
                                    onCheckedChange={(checked) => 
                                      isAdmin && handlePermissionChange('can_delete_sales_detail', checked === true)
                                    }
                                    disabled={!isAdmin}
                                  />
                                  <label htmlFor="delete-sales-detail">Can delete sales details</label>
                                </div>
                              </div>
                              
                              {!isAdmin && (
                                <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                                  <p>You are viewing permissions in read-only mode. Only administrators can modify permissions.</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="py-4">
                              <Skeleton className="h-4 w-full mb-2" />
                              <Skeleton className="h-4 w-5/6 mb-4" />
                              <Skeleton className="h-4 w-full mb-2" />
                              <Skeleton className="h-4 w-4/6" />
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        <p>No users found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
};

export default ManageUsers;
