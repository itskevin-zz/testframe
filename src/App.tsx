import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TestCases from './pages/TestCases';
import TestCaseForm from './pages/TestCaseForm';
import TestRunForm from './pages/TestRunForm';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-cases"
            element={
              <ProtectedRoute>
                <TestCases />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-cases/new"
            element={
              <ProtectedRoute>
                <TestCaseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-cases/:id/edit"
            element={
              <ProtectedRoute>
                <TestCaseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-cases/:id/run"
            element={
              <ProtectedRoute>
                <TestRunForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
