
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      
      if (error) throw error;
      
      setIsSuccess(true);
      toast.success('Password reset link sent to your email');
    } catch (error) {
      console.error('Error sending reset password email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send reset email');
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
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="bg-blue-400/50 backdrop-blur-sm rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mt-4">Check Your Email</h2>
              <p className="text-white/90">
                We've sent a password reset link to <span className="font-medium">{email}</span>
              </p>
              <div className="mt-6">
                <Link to="/login" className="text-white hover:underline">
                  Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                <p className="text-white/80 mt-2">
                  Enter your email address and we'll send you a link to reset your password
                </p>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-white mb-1">Email:</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-transparent border-b border-white/70 focus:border-white outline-none text-white py-1 px-0"
                />
              </div>
              
              <Button 
                type="submit"
                disabled={isSubmitting} 
                className="w-full bg-blue-400/50 backdrop-blur-sm hover:bg-blue-400/70 transition-colors text-white font-medium py-2 px-4 rounded-full shadow-lg text-lg h-auto"
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
              
              <div className="text-center">
                <Link to="/login" className="text-white hover:underline">
                  Return to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
