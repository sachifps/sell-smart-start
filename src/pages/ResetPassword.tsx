
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Check if we have a hash parameter in the URL
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (!hashParams.get('access_token')) {
      toast.error('Invalid or expired reset link');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      toast.success('Password updated successfully');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-700 to-blue-900">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo Circle */}
        <div className="bg-white rounded-full p-4 mb-4 shadow-lg z-10">
          <div className="flex items-center justify-center w-20 h-20">
            <img 
              src="/lovable-uploads/a53131dd-6f7a-482a-a2e0-2badaa547e39.png" 
              alt="SalesIndex Logo" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        
        {/* Form Card */}
        <div className="bg-blue-500/30 backdrop-blur-sm rounded-3xl w-full px-10 pt-16 pb-10 shadow-xl relative -mt-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="text-center">
              <div className="bg-blue-400/50 backdrop-blur-sm rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mt-4">Create New Password</h2>
              <p className="text-white/80 mt-2">
                Your new password must be different from previously used passwords
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-white mb-1">New Password:</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-transparent border-b border-white/70 focus:border-white outline-none text-white py-1 px-0"
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-white mb-1">Confirm Password:</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-transparent border-b border-white/70 focus:border-white outline-none text-white py-1 px-0"
                />
              </div>
            </div>
            
            <Button 
              type="submit"
              disabled={isSubmitting} 
              className="w-full bg-blue-400/50 backdrop-blur-sm hover:bg-blue-400/70 transition-colors text-white font-medium py-2 px-4 rounded-full shadow-lg text-lg h-auto"
            >
              {isSubmitting ? 'Updating...' : 'Reset Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
