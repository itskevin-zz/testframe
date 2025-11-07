import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TestCases from './pages/TestCases';
import TestCaseForm from './pages/TestCaseForm';
import TestRuns from './pages/TestRuns';
import TestRunForm from './pages/TestRunForm';
import TestRunExecution from './pages/TestRunExecution';
import TestRunDetails from './pages/TestRunDetails';
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
            path="/test-runs"
            element={
              <ProtectedRoute>
                <TestRuns />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-runs/new"
            element={
              <ProtectedRoute>
                <TestRunForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-runs/:id/edit"
            element={
              <ProtectedRoute>
                <TestRunForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-runs/:id/execute"
            element={
              <ProtectedRoute>
                <TestRunExecution />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-runs/:id"
            element={
              <ProtectedRoute>
                <TestRunDetails />
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
