import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ShopProvider } from '@/contexts/ShopContext';
import { OrderProvider } from '@/contexts/OrderContext';
import { MembershipProvider } from '@/contexts/MembershipContext';
import { AdminProvider } from '@/contexts/AdminContext';

import HomePage from '@/pages/Home';
import Shop from '@/pages/Shop';
import ProductDetail from '@/pages/ProductDetail';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import Orders from '@/pages/Orders';
import Membership from '@/pages/Membership';
import SubscriptionPage from '@/pages/SubscriptionPage';

// Admin pages
import AdminLogin from '@/pages/admin/Login';
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminUsers from '@/pages/admin/Users';
import AdminAnchoring from '@/pages/admin/Anchoring';
import AdminDataProof from '@/pages/admin/DataProof';
import AdminTasks from '@/pages/admin/Tasks';
import AdminAnnouncements from '@/pages/admin/Announcements';
import AdminReports from '@/pages/admin/Reports';
import AdminSettings from '@/pages/admin/Settings';
import AdminSubscriptions from '@/pages/admin/Subscriptions';

export default function App() {
  return (
    <Router>
      <AdminProvider>
        <ShopProvider>
           <OrderProvider>
             <MembershipProvider>
               <div className="min-h-screen bg-gray-50">
                 <main>
                   <Routes>
                     {/* Public routes */}
                     <Route path="/" element={<HomePage />} />
                     <Route path="/shop" element={<Shop />} />
                     <Route path="/shop/product/:id" element={<ProductDetail />} />
                     <Route path="/cart" element={<Cart />} />
                     <Route path="/checkout" element={<Checkout />} />
                     <Route path="/orders" element={<Orders />} />
                     <Route path="/membership" element={<Membership />} />
                     <Route path="/subscription" element={<SubscriptionPage />} />
                     
                     {/* Admin routes */}
                     <Route path="/admin/login" element={<AdminLogin />} />
                     <Route path="/admin/dashboard" element={<AdminDashboard />} />
                     <Route path="/admin/users" element={<AdminUsers />} />
                     <Route path="/admin/anchoring" element={<AdminAnchoring />} />
                     <Route path="/admin/data-proof" element={<AdminDataProof />} />
                     <Route path="/admin/tasks" element={<AdminTasks />} />
                     <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                     <Route path="/admin/reports" element={<AdminReports />} />
                     <Route path="/admin/settings" element={<AdminSettings />} />
                     <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                   </Routes>
                 </main>
                 <Toaster />
               </div>
             </MembershipProvider>
           </OrderProvider>
         </ShopProvider>
      </AdminProvider>
    </Router>
  );
}
