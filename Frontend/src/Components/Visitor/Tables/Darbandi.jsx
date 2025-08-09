import React, { useEffect, useState, useMemo } from 'react';
import { useBaseURL } from '../../../Context/BaseURLProvider';
import {
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, TableSortLabel,
    Button, Select, MenuItem, FormControl, InputLabel, CircularProgress, Box
} from "@mui/material";
import axios from "axios";

const Darbandi = () => {
    const BASE_URL = useBaseURL();

    const [records, setRecords] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
    const [empType, setempType] = useState('');
    const [type, setType] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const formattedDateNp = new Date().toISOString().split('T')[0];

    const fetchData = async (url, params = {}) => {
        try {
            setLoading(true);
            const response = await axios.get(url, {
                params,
                withCredentials: true,
            });
            const { Status, Result, Error } = response.data;
            if (Status) {
                return response.data || [];
            } else {
                console.error(Error || 'Failed to fetch records');
                return [];
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('An error occurred while fetching data.');
            return [];
        } finally {
            setLoading(false);
        }
    };

    const fetchDarbandi = async () => {
        const url = `${BASE_URL}/emp/get_darbandi`;
        const result = await fetchData(url);
        setRecords(result.Result || []);
        // console.log(result.Result)
    };

     
    useEffect(() => {
        fetchDarbandi();
        // fetchRanks();
        // fetchOffice();
    }, []);

    const filteredRecords = useMemo(() => {
        return records.filter(record =>
            (!empType || record.class_np === empType) &&
            (!type || record.post_np === type)
        );
    }, [records, empType, type]);

    // const filteredRecords = records;
    // console.log(filteredRecords)



    const sortedRecords = useMemo(() => {
        const sorted = [...filteredRecords].sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            if (sortConfig.key === 'release_date') {
                aVal = new Date(a.release_date) - new Date(formattedDateNp);
                bVal = new Date(b.release_date) - new Date(formattedDateNp);
            }

            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [filteredRecords, sortConfig, formattedDateNp]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const onEdit = (record) => {
        console.log('Edit record:', record);
    };

    const onDelete = (id) => {
        console.log('Delete record with ID:', id);
    };

    return (
        <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                {/* <FormControl size="small">
                    <InputLabel>Case</InputLabel>
                    <Select
                        value={empType}
                        label="Case"
                        onChange={(e) => setempType(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="काज">काज</MenuItem>
                        <MenuItem value="स्थायी">स्थायी</MenuItem>
                        
                    </Select>
                </FormControl> */}

                {/* <FormControl size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                        value={type}
                        label="Type"
                        onChange={(e) => setType(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                    {
                        ranks.map(v => <MenuItem value={v.id}>{v.name_in_nepali}</MenuItem>)
                    }
                 
                    </Select>
                </FormControl> */}
                {/* <FormControl size="small">
                    <InputLabel>Office:</InputLabel>
                    <Select
                        value={office}
                        label="Office"
                        onChange={(e) => setOffice(e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        {
                            office.map((v,i) => <MenuItem value={v.id} key={i}>{v.office_name_with_letter_address}</MenuItem>)
                        }

                    </Select>
                </FormControl> */}
            </Box>

            {error ? (
                <p style={{ color: 'red' }}>{error}</p>
            ) : loading ? (
                <CircularProgress />
            ) : (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>सि.नं.</TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortConfig.key === 'post_np'}
                                        direction={sortConfig.direction}
                                        onClick={() => handleSort('post_np')}
                                    >
                                        पद
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>दरबन्दी संख्या</TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortConfig.key === 'post_count'}
                                        direction={sortConfig.direction}
                                        onClick={() => handleSort('post_count')}
                                    >
                                        पदपूर्ति संख्या
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>काजमा आएको</TableCell>
                                <TableCell>करार</TableCell>
                                <TableCell>अध्ययनको लागि गएको</TableCell>
                                <TableCell colSpan={2}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedRecords.map((record, index) => (
                                <TableRow key={record.id || index}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{record.post_np}</TableCell>
                                    <TableCell>{record.darbandi}</TableCell>
                                    <TableCell>{record.post_count}</TableCell>
                                    <TableCell>{record.kaaj_count}</TableCell>
                                    <TableCell>{record.karar_count}</TableCell>
                                    <TableCell>{record.study_count}</TableCell>
                                    <TableCell>
                                        <Button size="small" onClick={() => onEdit(record)}>Edit</Button>
                                    </TableCell>
                                    <TableCell>
                                        <Button size="small" color="error" onClick={() => onDelete(record.id)}>Delete</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default Darbandi;
