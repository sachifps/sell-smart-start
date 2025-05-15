
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, preregisterEmail, updateUserRole } from '@/integrations/supabase/client';
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
import { Shield, Settings, RefreshCcw, UserPlus, AlertCircle, Mail, UserCheck, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

type User = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  last_sign_in_at?: string | null;
  created_at?: string;
  isPreRegistered?: boolean;
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

// Define form schema for pre-registering an email
const addUserSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
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
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState(false);
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');

  // Initialize form for adding users
  const addUserForm = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      email: '',
      role: 'user',
    },
  });

  useEffect(() => {
    console.log('ManageUsers - Current user:', user);
    console.log('ManageUsers - Is admin:', isAdmin);
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('ManageUsers - Fetching users started');
      setLoading(true);
      
      // Fetch all users from profiles table with more detailed logging
      const profilesQuery = supabase.from('profiles').select('id, email, created_at');
      console.log('ManageUsers - Profiles query:', profilesQuery);
      
      const { data: profilesData, error: profilesError } = await profilesQuery;
      
      if (profilesError) {
        console.error('ManageUsers - Profiles error:', profilesError);
        throw profilesError;
      }
      
      console.log('ManageUsers - Profiles data:', profilesData);
      
      // Fetch user roles to determine admin status
      const rolesQuery = supabase.from('user_roles').select('user_id, role');
      console.log('ManageUsers - Roles query:', rolesQuery);
      
      const { data: rolesData, error: rolesError } = await rolesQuery;
        
      if (rolesError) {
        console.error('ManageUsers - Roles error:', rolesError);
        throw rolesError;
      }
      
      console.log('ManageUsers - Roles data:', rolesData);
      
      // Fetch pre-registered emails
      const { data: preregisteredData, error: preregisteredError } = await supabase
        .from('preregistered_emails')
        .select('email, role, created_at');
        
      if (preregisteredError) {
        console.error('ManageUsers - Preregistered emails error:', preregisteredError);
        throw preregisteredError;
      }
      
      console.log('ManageUsers - Preregistered emails data:', preregisteredData);
      
      // Map roles to users with proper typing
      const usersList: User[] = profilesData.map(profile => {
        const userRole = rolesData.find(role => role.user_id === profile.id);
        const roleValue = userRole?.role === 'admin' ? 'admin' : 'user';
        
        return {
          id: profile.id,
          email: profile.email || 'No email',
          role: roleValue as 'admin' | 'user',
          created_at: profile.created_at,
          isPreRegistered: false
        };
      });
      
      // Add pre-registered emails to the users list
      if (preregisteredData) {
        const preregisteredUsers = preregisteredData.map(preregistered => ({
          id: `pre-${preregistered.email}`, // Use a prefix to differentiate from real user IDs
          email: preregistered.email,
          role: preregistered.role as 'admin' | 'user',
          created_at: preregistered.created_at,
          isPreRegistered: true
        }));
        
        // Filter out pre-registered emails that already have accounts
        const filteredPreregistered = preregisteredUsers.filter(preUser => 
          !usersList.some(user => user.email === preUser.email)
        );
        
        usersList.push(...filteredPreregistered);
      }
      
      console.log('ManageUsers - Processed users list:', usersList);
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPermissions = async (userId: string) => {
    try {
      setEditingPermissions(false);
      
      // Check if this is a pre-registered user (has the "pre-" prefix)
      if (userId.startsWith('pre-')) {
        // For pre-registered users, fetch permissions from preregistered_emails table
        const email = userId.replace('pre-', '');
        const { data, error } = await supabase
          .from('preregistered_emails')
          .select('*')
          .eq('email', email)
          .single();
        
        if (error) throw error;
        
        // Map the preregistered email data to match the permissions structure
        setPermissions({
          id: data.id,
          user_id: userId,
          can_edit_sales: data.can_edit_sales,
          can_delete_sales: data.can_delete_sales,
          can_add_sales: data.can_add_sales,
          can_edit_sales_detail: data.can_edit_sales_detail,
          can_delete_sales_detail: data.can_delete_sales_detail,
          can_add_sales_detail: data.can_add_sales_detail
        });
      } else {
        // For regular users, fetch permissions from user_permissions table
        const { data, error } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (error) throw error;
        
        setPermissions(data as unknown as UserPermission);
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      toast({
        title: "Error",
        description: "Failed to load user permissions"
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
      
      // If it's a pre-registered user
      if (selectedUser.isPreRegistered) {
        const email = selectedUser.email;
        
        // Update in preregistered_emails table
        const { error } = await supabase
          .from('preregistered_emails')
          .update({ [permission]: value, updated_at: new Date().toISOString() })
          .eq('email', email);
          
        if (error) throw error;
      } else {
        // Update in user_permissions table
        const { error } = await supabase
          .from('user_permissions')
          .update({ [permission]: value, updated_at: new Date().toISOString() })
          .eq('user_id', selectedUser.id);
        
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "User permissions updated"
      });
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Error",
        description: "Failed to update permissions"
      });
      
      // Revert local state if update fails
      fetchUserPermissions(selectedUser.id);
    }
  };

  // Save all permissions at once
  const saveAllPermissions = async () => {
    if (!permissions || !selectedUser || !isAdmin) return;
    
    try {
      setEditingPermissions(false);
      
      const permissionData = { 
        can_edit_sales: permissions.can_edit_sales,
        can_delete_sales: permissions.can_delete_sales,
        can_add_sales: permissions.can_add_sales,
        can_edit_sales_detail: permissions.can_edit_sales_detail,
        can_delete_sales_detail: permissions.can_delete_sales_detail,
        can_add_sales_detail: permissions.can_add_sales_detail,
        updated_at: new Date().toISOString() 
      };
      
      // If it's a pre-registered user
      if (selectedUser.isPreRegistered) {
        const email = selectedUser.email;
        
        // Update in preregistered_emails table
        const { error } = await supabase
          .from('preregistered_emails')
          .update(permissionData)
          .eq('email', email);
          
        if (error) throw error;
      } else {
        // Update in user_permissions table
        const { error } = await supabase
          .from('user_permissions')
          .update(permissionData)
          .eq('user_id', selectedUser.id);
        
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "All user permissions updated"
      });
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Error",
        description: "Failed to update permissions"
      });
      
      // Revert local state if update fails
      fetchUserPermissions(selectedUser.id);
    }
  };

  // Function to pre-register an email with permissions
  const handleAddUser = async (values: AddUserFormValues) => {
    if (!isAdmin) return;
    
    try {
      setIsAddingUser(true);
      
      // Check if the email already exists in profiles
      const { data: existingProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', values.email);
      
      if (profileError) throw profileError;

      // If profile already exists, notify the user
      if (existingProfiles && existingProfiles.length > 0) {
        toast({
          title: "Error",
          description: "This email is already registered"
        });
        return;
      }

      // Set default permissions based on role
      const isUserAdmin = values.role === 'admin';
      
      // Use the preregisterEmail function to handle registration
      await preregisterEmail(values.email, values.role, {
        can_edit_sales: isUserAdmin,
        can_delete_sales: isUserAdmin,
        can_add_sales: isUserAdmin,
        can_edit_sales_detail: isUserAdmin,
        can_delete_sales_detail: isUserAdmin,
        can_add_sales_detail: isUserAdmin
      });
      
      toast({
        title: "Success",
        description: `Email ${values.email} has been pre-registered with ${values.role} permissions`
      });
      
      // Reset form and close dialog
      addUserForm.reset();
      setAddUserOpen(false);
      
      // Refresh users list to show the newly added pre-registered email
      fetchUsers();
    } catch (error: any) {
      console.error('Error pre-registering email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to pre-register email"
      });
    } finally {
      setIsAddingUser(false);
    }
  };
  
  // Toggle edit mode for permissions
  const toggleEditMode = () => {
    setEditingPermissions(!editingPermissions);
  };

  // Open the edit role dialog
  const openEditRole = (user: User) => {
    if (!isAdmin || user.id === undefined) return;
    
    setSelectedUser(user);
    setNewRole(user.role);
    setEditRoleOpen(true);
  };
  
  // Handle role update
  const handleRoleUpdate = async () => {
    if (!isAdmin || !selectedUser || selectedUser.id === undefined) return;
    
    try {
      setUpdatingRole(true);
      
      if (selectedUser.isPreRegistered) {
        // Update pre-registered user role
        const email = selectedUser.email;
        
        const { error } = await supabase
          .from('preregistered_emails')
          .update({ 
            role: newRole,
            updated_at: new Date().toISOString() 
          })
          .eq('email', email);
          
        if (error) throw error;
      } else {
        // Update registered user role
        await updateUserRole(selectedUser.id, newRole);
      }
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === selectedUser.id ? { ...u, role: newRole } : u
        )
      );
      
      toast({
        title: "Success",
        description: `User role has been updated to ${newRole}`
      });
      
      // Close dialog and refresh users
      setEditRoleOpen(false);
      fetchUsers();
      
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role"
      });
    } finally {
      setUpdatingRole(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader currentPath="/manage-users" />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Manage Users</h1>
            <p className="text-muted-foreground">All users and pre-registered emails</p>
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
              <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Pre-register Email
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Pre-register Email</DialogTitle>
                    <DialogDescription>
                      Add an email address with specified role and permissions. When this email is used for signup,
                      the assigned permissions will be automatically applied.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...addUserForm}>
                    <form onSubmit={addUserForm.handleSubmit(handleAddUser)} className="space-y-4 py-2">
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
                          {isAddingUser ? 'Saving...' : 'Save'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {!isAdmin && (
          <Alert className="mb-6 bg-blue-50 text-blue-800 border border-blue-200">
            <AlertDescription className="flex items-center">
              <Lock className="h-4 w-4 mr-2" />
              <span>You are in view-only mode. Only administrators can modify user permissions.</span>
            </AlertDescription>
          </Alert>
        )}
        
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
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
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
                          {isAdmin && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="ml-2 h-6 w-6" 
                              onClick={() => openEditRole(user)}
                            >
                              <Edit className="h-3 w-3" />
                              <span className="sr-only">Edit role</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.isPreRegistered ? (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                            <Mail className="h-3 w-3 mr-1" />
                            Pre-registered
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</TableCell>
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
                                {selectedUser?.isPreRegistered && (
                                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 mt-2">
                                    Pre-registered
                                  </Badge>
                                )}
                              </DialogDescription>
                            </DialogHeader>
                            
                            {permissions ? (
                              <div className="space-y-4 py-4">
                                {isAdmin && (
                                  <div className="flex justify-between items-center mb-4">
                                    <Label htmlFor="edit-mode" className="text-sm font-medium">
                                      Edit Mode
                                    </Label>
                                    <Switch 
                                      id="edit-mode"
                                      checked={editingPermissions}
                                      onCheckedChange={toggleEditMode}
                                      disabled={!isAdmin}
                                    />
                                  </div>
                                )}
                                
                                <h3 className="font-semibold mb-2">Sales Permissions</h3>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor="add-sales" className="flex-grow">Can add sales</Label>
                                    {editingPermissions ? (
                                      <Switch 
                                        id="add-sales" 
                                        checked={permissions.can_add_sales}
                                        onCheckedChange={(checked) => 
                                          setPermissions({...permissions, can_add_sales: checked})
                                        }
                                        disabled={!isAdmin || !editingPermissions}
                                      />
                                    ) : (
                                      <Checkbox 
                                        id="add-sales" 
                                        checked={permissions.can_add_sales}
                                        disabled={true}
                                      />
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor="edit-sales" className="flex-grow">Can edit sales</Label>
                                    {editingPermissions ? (
                                      <Switch 
                                        id="edit-sales" 
                                        checked={permissions.can_edit_sales}
                                        onCheckedChange={(checked) => 
                                          setPermissions({...permissions, can_edit_sales: checked})
                                        }
                                        disabled={!isAdmin || !editingPermissions}
                                      />
                                    ) : (
                                      <Checkbox 
                                        id="edit-sales" 
                                        checked={permissions.can_edit_sales}
                                        disabled={true}
                                      />
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor="delete-sales" className="flex-grow">Can delete sales</Label>
                                    {editingPermissions ? (
                                      <Switch 
                                        id="delete-sales" 
                                        checked={permissions.can_delete_sales}
                                        onCheckedChange={(checked) => 
                                          setPermissions({...permissions, can_delete_sales: checked})
                                        }
                                        disabled={!isAdmin || !editingPermissions}
                                      />
                                    ) : (
                                      <Checkbox 
                                        id="delete-sales" 
                                        checked={permissions.can_delete_sales}
                                        disabled={true}
                                      />
                                    )}
                                  </div>
                                </div>
                                
                                <h3 className="font-semibold mb-2 mt-4">Sales Detail Permissions</h3>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor="add-sales-detail" className="flex-grow">Can add sales details</Label>
                                    {editingPermissions ? (
                                      <Switch 
                                        id="add-sales-detail" 
                                        checked={permissions.can_add_sales_detail}
                                        onCheckedChange={(checked) => 
                                          setPermissions({...permissions, can_add_sales_detail: checked})
                                        }
                                        disabled={!isAdmin || !editingPermissions}
                                      />
                                    ) : (
                                      <Checkbox 
                                        id="add-sales-detail" 
                                        checked={permissions.can_add_sales_detail}
                                        disabled={true}
                                      />
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor="edit-sales-detail" className="flex-grow">Can edit sales details</Label>
                                    {editingPermissions ? (
                                      <Switch 
                                        id="edit-sales-detail" 
                                        checked={permissions.can_edit_sales_detail}
                                        onCheckedChange={(checked) => 
                                          setPermissions({...permissions, can_edit_sales_detail: checked})
                                        }
                                        disabled={!isAdmin || !editingPermissions}
                                      />
                                    ) : (
                                      <Checkbox 
                                        id="edit-sales-detail" 
                                        checked={permissions.can_edit_sales_detail}
                                        disabled={true}
                                      />
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor="delete-sales-detail" className="flex-grow">Can delete sales details</Label>
                                    {editingPermissions ? (
                                      <Switch 
                                        id="delete-sales-detail" 
                                        checked={permissions.can_delete_sales_detail}
                                        onCheckedChange={(checked) => 
                                          setPermissions({...permissions, can_delete_sales_detail: checked})
                                        }
                                        disabled={!isAdmin || !editingPermissions}
                                      />
                                    ) : (
                                      <Checkbox 
                                        id="delete-sales-detail" 
                                        checked={permissions.can_delete_sales_detail}
                                        disabled={true}
                                      />
                                    )}
                                  </div>
                                </div>
                                
                                {isAdmin && editingPermissions && (
                                  <div className="flex justify-end mt-4">
                                    <Button 
                                      onClick={saveAllPermissions}
                                      className="mr-2"
                                    >
                                      Save Permissions
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      onClick={() => {
                                        setEditingPermissions(false);
                                        fetchUserPermissions(selectedUser!.id);
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                )}
                                
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
                  ))
                ) : (
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

      {/* Edit Role Dialog */}
      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            <Label htmlFor="role">Select Role</Label>
            <Select 
              value={newRole} 
              onValueChange={(value) => setNewRole(value as 'admin' | 'user')}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Regular User</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="mt-2 text-sm text-muted-foreground">
              {newRole === 'admin' ? 
                'Administrators have full access to all functionality including user management.' : 
                'Regular users have limited access based on assigned permissions.'}
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setEditRoleOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleRoleUpdate} disabled={updatingRole}>
              {updatingRole ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageUsers;
