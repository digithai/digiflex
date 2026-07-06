import { useSelector } from 'react-redux';
import AdminPage from './AdminPage';
import ApproverPage from './ApproverPage';
import UserPage from './UserPage';
import Wrapper from '../components/Wrapper';



const Dashboard = () => {
    const { user } = useSelector((state) => state.auth);  

  return (
    <Wrapper>

        {/* Role-Based Display */}
        {['tenant_admin'].includes(user.role) && (
            <AdminPage />
        )}

        {user.role === 'approver' && (
            <ApproverPage />
        )}

        {user.role === 'user' && (
            <UserPage />
        )}

        {['superadmin'].includes(user.role) && (
            <div>
              <h1>Superadmin Panel</h1>
              <p>Use the Tenants menu to manage tenant accounts.</p>
            </div>
        )}

    </Wrapper>
  );
};

export default Dashboard;
