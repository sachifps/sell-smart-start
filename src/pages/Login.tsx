
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      await login(email, password);
      // No need to navigate here, the useEffect will handle it
    } catch (error) {
      console.error('Login error:', error);
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
        
        {/* Login Form Card */}
        <div className="bg-blue-500/30 backdrop-blur-sm rounded-3xl w-full px-10 pt-16 pb-10 shadow-xl relative -mt-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
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
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="rememberMe" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="border-white data-[state=checked]:bg-white data-[state=checked]:text-blue-900"
                />
                <label htmlFor="rememberMe" className="text-white">Remember Me</label>
              </div>
              
              <Link to="/forgot-password" className="text-white hover:underline">
                Forgot Password?
              </Link>
            </div>
          </form>
        </div>
        
        {/* Login Button */}
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting} 
          className="bg-blue-400/50 backdrop-blur-sm hover:bg-blue-400/70 transition-colors text-white font-medium py-3 px-6 rounded-full w-3/4 shadow-lg -mt-6 text-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
              Signing in...
            </>
          ) : (
            'Log in'
          )}
        </button>
        
        {/* Sign Up Link */}
        <div className="mt-8 text-white">
          <span>New User? </span>
          <Link to="/signup" className="font-medium hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
