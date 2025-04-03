
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/login");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sales-50 to-sales-100">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-sales-800">SellSmart</h1>
        <p className="text-xl text-sales-600 mb-4">Your sales management solution</p>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sales-600 mx-auto"></div>
      </div>
    </div>
  );
};

export default Index;
