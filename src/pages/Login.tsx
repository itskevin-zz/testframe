import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Login = () => {
  const { user, signInWithGoogle } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            TestFrame
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Simplify your test case management
          </p>
        </div>
        <button
          onClick={signInWithGoogle}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default Login;
