
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signup, user } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const validatePassword = () => {
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword() || !name || !email || !password) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      await signup(name, email, password);
      toast.success('Account created! You will be redirected to the login page.');
      // Redirect to login after successful signup
      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      console.error('Signup error:', error);
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
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-white mb-1">Full Name:</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-transparent border-b border-white/70 focus:border-white outline-none text-white py-1 px-0"
              />
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
            
            <div>
              <label htmlFor="password" className="block text-white mb-1">Password:</label>
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
              <label htmlFor="confirm-password" className="block text-white mb-1">Confirm Password:</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-transparent border-b border-white/70 focus:border-white outline-none text-white py-1 px-0"
              />
              {passwordError && (
                <p className="text-red-200 text-sm mt-1">{passwordError}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-blue-400/50 backdrop-blur-sm hover:bg-blue-400/70 transition-colors text-white font-medium py-2 px-4 rounded-full shadow-lg text-lg h-auto mt-8"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : 'Sign up'}
            </Button>
          </form>
          
          <div className="text-center mt-6">
            <p className="text-white">
              Already have an account?{' '}
              <Link to="/login" className="text-white hover:underline font-medium">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
