import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import AgentLayout from '@/components/AgentLayout';
import { AgentOnlyRoute, StaffOnlyRoute } from '@/components/AgentRouteGuards';
import Dashboard from '@/pages/Dashboard';
import Customers from '@/pages/Customers';
import CustomerDetail from '@/pages/CustomerDetail';
import AllFilings from '@/pages/AllFilings';
import NewFiling from '@/pages/NewFiling';
import EditFiling from '@/pages/EditFiling';
import FilingDetail from '@/pages/FilingDetail';
import Agents from '@/pages/Agents';
import Commissions from '@/pages/Commissions';
import AgentView from '@/pages/AgentView';
import AgentPortal from '@/pages/AgentPortal';
import Invoices from '@/pages/Invoices';
import InvoiceDetail from '@/pages/InvoiceDetail';
import NewInvoice from '@/pages/NewInvoice';
import Wallets from '@/pages/Wallets';
import ProductsServices from '@/pages/ProductsServices';
import DocumentTracker from '@/pages/DocumentTracker';
import CompanySetup from '@/pages/CompanySetup';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<StaffOnlyRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/filings" element={<AllFilings />} />
          <Route path="/filings/new" element={<NewFiling />} />
          <Route path="/filings/:id/edit" element={<EditFiling />} />
          <Route path="/filings/:id" element={<FilingDetail />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/commissions" element={<Commissions />} />
          <Route path="/agent-view" element={<AgentView />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/new" element={<NewInvoice />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/wallets" element={<Wallets />} />
          <Route path="/masters/products" element={<ProductsServices />} />
          <Route path="/document-tracker" element={<DocumentTracker />} />
          <Route path="/company-setup" element={<CompanySetup />} />
        </Route>
      </Route>
      <Route element={<AgentOnlyRoute />}>
        <Route element={<AgentLayout />}>
          <Route path="/agent-portal" element={<AgentPortal />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App