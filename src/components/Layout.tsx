import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center">
                <img 
                  src="https://i.imgur.com/nEpYFLo.png" 
                  alt="Hub Environnement" 
                  className="h-10 w-auto"
                />
              </Link>
            </div>
            
            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-gray-700">{user?.full_name}</span>
              <button
                onClick={() => navigate('/settings')}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] rounded-full p-2 hover:bg-gray-100"
                aria-label="Paramètres"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] rounded-full p-2 hover:bg-gray-100"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#34519e]"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <div className="px-4 py-2 text-gray-700">
                {user?.full_name}
              </div>
              <button
                onClick={() => {
                  navigate('/settings');
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100"
              >
                <Settings className="h-5 w-5 mr-2" />
                Paramètres
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}