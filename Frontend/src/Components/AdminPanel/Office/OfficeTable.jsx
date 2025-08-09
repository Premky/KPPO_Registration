import React, { useEffect, useState } from "react";
import axios from "axios";
import ReusableTable from "../../ReuseableComponents/ReuseTable";
import { useBaseURL } from "../../../Context/BaseURLProvider";

const OfficeTable = () => {
    // const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    // const BASE_URL = localStorage.getItem('BASE_URL');
    const BASE_URL = useBaseURL();
    const token = localStorage.getItem('token');
    const [formattedOptions, setFormattedOptions] = useState([]);
    const [loading, setLoading] = useState(true);

    const columns = [
        { field: "sn", headerName: "सि.नं." },
        { field: "name_np", headerName: "नाम नेपालीमा" },
        { field: "name_en", headerName: "नाम अंग्रेजीमा", hide:true },        
        { field: "state_id", headerName: "प्रदेश" },
        { field: "district_id", headerName: "जिल्ला" },
        { field: "municipality_id", headerName: "नगरपालिका" },
        { field: "ward", headerName: "वडा" },
        { field: "email", headerName: "Email" },
        { field: "contact", headerName: "समपर्क नं." },
        { field: "headoffice", headerName: "तालुक कार्यालय" },
    ];

    const fetchOffices = async () => {
        try {
            const url = `${BASE_URL}/admin/get_offices`;
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const { Status, Result, Error } = response.data;

            if (Status) {
                if (Array.isArray(Result) && Result.length > 0) {
                    const formatted = Result.map((opt, index) => ({
                        id: index + 1, // Adding a unique id property
                        sn: index + 1,
                        name_np: opt.name_np,
                        name_en: opt.name_en,
                        
                        state_id: opt.state_id,
                        district_id: opt.district_id,
                        municipality_id: opt.municipality_id,
                        ward: opt.ward,
                        email: opt.email,
                        contact: opt.contact,
                        headoffice: opt.headoffice,
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
    }

    useEffect(() => {
        fetchOffices();
    }, []);

    // Functions for edit and delete
    const handleEdit = (row) => {
        console.log("Editing row:", row);
        // Add edit logic here
    };

    const handleDelete = (id) => {
        console.log("Deleting row with id:", id);
        // Add delete logic here
    };

    return (
        <ReusableTable
            columns={columns}
            rows={formattedOptions}
            height="800"
            showEdit={true}
            showDelete={true}
            onEdit={handleEdit}
            onDelete={handleDelete}
        />
    );
};

export default OfficeTable;
