import AdminUserTable from '../components/AdminUserTable';
import { useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import Wrapper from "../components/Wrapper";
import CreateUserModal from '../components/CreateUserModal';
import styles from '../styles/MainPage.module.css';

const Team = () => {
    const { token } = useSelector(state => state.auth);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [users, setUsers] = useState([]);

    const url = `${import.meta.env.VITE_BASE_URL}/api/admin/users`;

    const fetchUsers = async () => {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();

      // Ensure data is array
      if (!Array.isArray(data)) {
        throw new Error("Expected array but got: " + JSON.stringify(data));
      }

      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err.message);
      setUsers([]); // fallback to empty array
    }
  };
 
  useEffect(() => {
    fetchUsers();
  }, []);

    return (
        <Wrapper>
        <div className={styles.MainPage}>
            <h1>Team</h1>
            <button 
                style={{ width: 'fit-content', padding: '8px 16px', color: 'white', backgroundColor: '#319400', border: 'none', cursor: 'pointer' }} 
                onClick={() => setIsModalOpen(true)}>Create User</button>
            <AdminUserTable users={users} refreshUsers={fetchUsers} />
            <CreateUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUserCreated={fetchUsers}
                token={token}
            />
        </div>
        </Wrapper>
    );
}
export default Team;