import axios from 'axios'
import React, { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import ReusableTable from '../../ReuseableComponents/ReuseTable';

const UserTable = () => {
  // const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const BASE_URL = localStorage.getItem('BASE_URL');
  const token = localStorage.getItem('token');
  const [formattedOptions, setFormattedOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const columns = [
    { field: "id", headerName: "सि.नं." },
    { field: "name", headerName: "नाम" },
    { field: "username", headerName: "प्रयोगकर्ता नाम" },
    { field: "usertype", headerName: "प्रकार" },
    { field: "office_id", headerName: "कार्यालय" },
    { field: "mobile_no", headerName: "सम्पर्क नं." },
    { field: "branch_id", headerName: "शाखा" },
    { field: "is_active", headerName: "सक्रय" },
  ];

  const [tableValues, setTableValues] = useState([]);

  // Fetch users data
  const fetchUsers = async () => {
    try {
      const url = `${BASE_URL}/auth/get_users`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { Status, Result, Error } = response.data;

      if (Status) {
        if (Array.isArray(Result) && Result.length > 0) {
          const formatted = Result.map((opt, index) => ({
            sn: index + 1,
            name: opt.name,
            username: opt.username,
            usertype: opt.en_usertype,
            office_id: opt.office,
            mobile_no: opt.mobile_no,
            branch_id: opt.branch,
            is_active: opt.is_active ? 'छ' : 'छैन',
          }));
          setFormattedOptions(formatted);
        } else {
          console.log('No records found.');
        }
      } else {
        console.log(Error || 'Failed to fetch.');
      }
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit action
  const handleEdit = (row) => {
    console.log("Editing user:", row);
    // You can navigate to a different page or open a modal to edit the user
    // Example: You can pass the row data to a form for editing
  };

  // Handle delete action
  const handleDelete = async (id) => {
    console.log("Deleting user with id:", id);
    try {
      const url = `${BASE_URL}/auth/delete_user/${id}`;
      const response = await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { Status, Error } = response.data;
      if (Status) {
        Swal.fire({
          title: "Deleted!",
          text: "User has been deleted.",
          icon: "success"
        });
        // Refresh the table data after successful deletion
        fetchUsers();
      } else {
        alert(Error || 'Failed to delete the user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  };


  const deleteDialog = async (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then((result) => {
      if (result.isConfirmed) {
        handleDelete(id);
      }
    });
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <>
      <ReusableTable
        columns={columns}
        rows={formattedOptions}
        height="800"
        showEdit={true}
        // showDelete={true}
        onEdit={handleEdit}
        // onDelete={deleteDialog}
      />
    </>
  );
};

export default UserTable;
