import React, { lazy, Suspense, useEffect, useState, useTransition } from 'react';
import axios from 'axios';
import { useForm, Controller } from 'react-hook-form';
import { Box, Button, Divider, Grid, TableContainer, Table, TableHead, TableBody, TableCell, TableRow } from '@mui/material';
import Swal from 'sweetalert2';
import NepaliDate from 'nepali-datetime';
import sha256 from "crypto-js/sha256";

import ReuseInput from '../../ReuseableComponents/ReuseInput';
import ReuseOffice from '../../ReuseableComponents/ReuseOffice';
import ReuseSelect from '../../ReuseableComponents/ReuseSelect';
import UserTable from './UserTable';
import ReusableTable from '../../ReuseableComponents/ReuseTable';
import ReuseBranch from '../../ReuseableComponents/ReuseBranch';
import { Navigate } from 'react-router-dom';
import { useBaseURL } from '../../../Context/BaseURLProvider';
// import ReuseKaragarOffice from '../../ReuseableComponents/ReuseKaragarOffice';
import ReuseKaragarOffice from '../../ReuseableComponents/ReuserKaragarOfficeForUserCreation';
import useRoles from '../FetchApis/useRoles';
import useBranches from '../FetchApis/useBranches';
import useAllEmployes from '../../Employee/APIs/useAllEmp';
import { useAuth } from '../../../Context/AuthContext';

const CreateUser = () => {
    // const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    // const BASE_URL = localStorage.getItem('BASE_URL');
    const BASE_URL = useBaseURL();
    const { state: authState } = useAuth();

    const token = localStorage.getItem( 'token' );
    const npToday = new NepaliDate();
    const formattedDateNp = npToday.format( 'YYYY-MM-DD' );

    //Required Variables 
    const [loading, setLoading] = useState( false );
    const [editing, setEditing] = useState( false );

    const { register, handleSubmit, reset, setValue, watch, formState: { errors }, control } = useForm();
    const defaultOptions = [
        { code: '', label: 'छ', phone: '', value: '1' },
        { code: '', label: 'छैन', phone: '', value: '0' }
    ];
    const [usertypes, setUsertypes] = useState( [] );

    const fetchUsertype = async () => {
        try {
            const response = await axios.get( `${ BASE_URL }/public/get_usertypes` );
            const { Status, Result, Error } = response.data;
            if ( Status ) {
                const formatted = Result.map( ( opt ) => ( {
                    label: opt.usertype_en, // Use Nepali name
                    value: opt.id, // Use ID as value
                } ) );
                setUsertypes( formatted );
                // console.log(formatted)
            } else {
                console.log( Error );
            }
        } catch ( error ) {
            console.error( "Error fetching user types:", error );
        }
    };


    const onFormSubmit = async ( data ) => {
        // console.log(data)
        setLoading( true );
        try {
            if ( !data.password || !data.repassword || data.password !== data.repassword ) {
                Swal.fire( {
                    icon: "error",
                    title: "ओहो...",
                    text: "पासवर्ड मिलेन",
                } );
                return;
            }

            const userData = {
                name_np: data.name_np, usertype: data.usertype, username: data.username, userrole: data.userrole, password: data.password, repassword: data.repassword,
                office: data.office, branch: data.branch, is_active: data.is_active
            };
            const url = editing ? `${ BASE_URL }/auth/update_user/${ userData.username }` : `${ BASE_URL }/auth/create_user`;
            const method = editing ? 'PUT' : 'POST';
            const response = await axios( {
                method, url, data: userData,
                headers: {
                    Authorization: `Bearer ${ token }`,
                    "Content-Type": "application/json",
                },
                withCredentials: true
            } );
            const { Status, Result, Error } = response.data;
            if ( Status ) {
                // Swal.fire( {
                //     title: `User ${ editing ? 'updated' : 'created' } successfully!`,
                //     icon: "success",
                //     draggable: true
                // } );

                Swal.fire( {
                    title: 'आहा!',
                    text: 'रेकर्ड सफलतापूर्वक थपियो',
                    imageUrl: `/gif/piaboys-kaatraj.gif`,
                    // imageUrl: `/gif/funnySuccesslogo.gif`,
                    // imageUrl: `/gif/clap.gif`,
                    // imageUrl: `${ BASE_URL }/gif/funnySuccesslogo.gif`, // Use your custom GIF here
                    imageWidth: 200, // optional
                    imageHeight: 200, // optional
                    imageAlt: 'Custom success image',
                } );

                // Swal.fire( {
                //     // imageUrl: `http://localhost:5173/gif/funnySuccesslogo.gif`,
                //     imageUrl: `/gif/funnySuccesslogo.gif`,
                //     imageHeight: 800,
                //     imageAlt: "A tall image"
                // } );

                reset();
                setEditing( false );
                fetchUsers();
                Navigate( '/sadmin/users' );
            }
        } catch ( err ) {
            console.error( err );
            Swal.fire( {
                title: err.response.data.message,
                icon: 'error',
                draggable: true
            } );
        } finally {
            setLoading( false );
        }
    };

    const [formattedOptions, setFormattedOptions] = useState( [] );
    const fetchUsers = async () => {
        try {
            const url = `${ BASE_URL }/auth/get_users`;
            const response = await axios.get( url, {
                headers: {
                    Authorization: `Bearer ${ token }`
                },
                withCredentials: true
            } );


            const { Status, Result, Error } = response.data;

            if ( Status ) {
                // console.log( "Result typeof:", typeof Result );
                // console.log( "Result is array:", Array.isArray( Result ) );
                // console.log( "Result content:", Result );

                if ( Array.isArray( Result ) && Result.length > 0 ) {
                    // console.log( Result );
                    // const formatted = Result.map( ( opt, index ) => {
                    //     console.log( 'Mapping user:', opt );
                    //     return {
                    //         sn: `${ opt.id ?? `branch-${ index }` }`,
                    //         id: index + 1,
                    //         user_name: opt.user_name,
                    //         user_login_id: opt.user_login_id,
                    //         usertype: opt.usertype,
                    //         usertype_en: opt.usertype_en,
                    //         office_id: opt.office_id,
                    //         office_np: opt.office_name_with_letter_address,
                    //         branch_id: opt.branch_id,
                    //         branch_np: opt.branch_np,
                    //         is_active: opt.is_active ? 'छ' : 'छैन',
                    //         lastpwchanged: opt.last_password_changed
                    //             ? ( 90 - Math.ceil( Math.abs( new Date() - new Date( opt.last_password_changed ) ) / ( 1000 * 60 * 60 * 24 ) ) ) + ' days'
                    //             : 'N/A',
                    //     };
                    // } );
                    // // console.log(formatted)

                    const formatted = Result[0].map( ( opt, index ) => ( {
                        id: opt.id ?? opt.user_id ?? opt.branch_id ?? opt.id ?? `user-${ index }`,
                        sn: index + 1,
                        user_name: opt.user_name,
                        user_login_id: opt.user_login_id,
                        usertype: opt.usertype,
                        usertype_en: opt.usertype_en,
                        office_id: opt.office_id,
                        office_np: opt.office_name_with_letter_address,
                        mobile_no: opt.mobile_no,
                        branch_id: opt.branch_id,
                        branch_np: opt.branch_np,
                        is_active: opt.is_active ? "छ" : "छैन",
                        lastpwchanged: opt.last_password_changed
                            ? ( 90 - Math.ceil( Math.abs( new Date() - new Date( opt.last_password_changed ) ) / ( 1000 * 60 * 60 * 24 ) ) ) + " days"
                            : "N/A",
                    } ) );

                    // console.log( "Formatted:", formatted );
                    // console.log(Result[0])
                    setFormattedOptions( formatted );
                } else {
                    console.log( 'No records found.' );
                }
            } else {
                console.log( Error || 'Failed to fetch.' );
            }
        } catch ( error ) {
            console.error( 'Error fetching records:', error );
        } finally {
            setLoading( false );
        }
    };

    // Handle edit action
    const handleEdit = ( row ) => {
        // console.log("Editing user:", row);
        // You can navigate to a different page or open a modal to edit the user        
        setValue( 'name_np', row.user_name );
        setValue( 'username', row.user_login_id );
        const matchedUsertype = usertypes.find( ut => ut.label === row.usertype_en );
        setValue( 'usertype', matchedUsertype );
        if ( matchedUsertype ) {
            console.log( matchedUsertype );
        }
        setValue( 'usertype', row.usertype );
        // setValue('usertype', row.usertype);
        setValue( 'office', row.office_id );
        setValue( 'branch', row.branch_id );
        setValue( 'is_active', row.is_active === 'छ' ? '1' : '0' );
        setEditing( true );
        // Example: You can pass the row data to a form for editing
    };

    // Handle delete action
    const handleDelete = async ( id ) => {
        console.log( "Deleting user with id:", id );
        try {
            const url = `${ BASE_URL }/auth/delete_user/${ id }`;
            const response = await axios.delete( url, {
                headers: { Authorization: `Bearer ${ token }` },
            } );

            const { Status, Error } = response.data;
            if ( Status ) {
                Swal.fire( {
                    title: "Deleted!",
                    text: "User has been deleted.",
                    icon: "success"
                } );
                // Refresh the table data after successful deletion
                fetchUsers();
            } else {
                Swal.fire( {
                    title: "Failed to delete the user",
                    text: Error,
                    icon: "error"
                } );

            }
        } catch ( error ) {
            console.error( 'Error deleting user:', error );
            alert( 'Error deleting user' );
        }
    };

    const deleteDialog = async ( id ) => {
        Swal.fire( {
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        } ).then( ( result ) => {
            if ( result.isConfirmed ) {
                handleDelete( id );
            }
        } );
    };

    const clear = () => {
        reset( {
            name_np: "",
            username: "",
            password: "",
            repassword: "",
            office: "",
            branch: "",
            is_active: "",
            usertype: "",
        } );

    };
    const columns = [
        { field: "id", headerName: "सि.नं." },
        { field: "user_name", headerName: "नाम" },
        { field: "user_login_id", headerName: "प्रयोगकर्ता नाम" },
        { field: "usertype_en", headerName: "प्रकार" },
        { field: "office_np", headerName: "कार्यालय" },
        { field: "mobile_no", headerName: "सम्पर्क नं." },
        { field: "branch_np", headerName: "शाखा" },
        { field: "is_active", headerName: "सक्रय" },
        { field: "lastpwchanged", headerName: "पासवर्ड परिवर्तन गर्न" },
    ];

    useEffect( () => {
        fetchUsertype();
        fetchUsers();
    }, [] );

    const username = watch( 'username' );
    const optUserRolesforJailor = [
        { label: 'कारागार प्रशासक(office_admin)', value: '2' },
        { label: 'Clerk(Operator)', value: '1' },
    ];
    const { records: userRoles, optrecords: optUserRoles, loading: userRolesLoading, refetch: fetchRecords } = useRoles();
    const { records: branches, optrecords: optBranches, loading: branchesLoading, refetch: fetchBranches } = useBranches();
    const { records: employees, optrecords: optEmployees, loading: employeesLoading } = useAllEmployes();

    let userRoleOptions;
    // console.log(authState.role_name)
    if ( authState.role_name === 'office_superadmin' ) {
        userRoleOptions = optUserRolesforJailor;
    } else if ( authState.role_name === 'superadmin' ) {
        userRoleOptions = optUserRoles;
    }


    useEffect( () => {
        if ( username ) {
            const matchedEmployee = employees.find( emp => emp.sanket_no === username );
            console.log( matchedEmployee );
            if ( matchedEmployee ) {
                setValue( 'name_np', matchedEmployee.name ); // or name_np if the field is named so
            }
        }
    }, [username, employees, setValue] );

    return (
        <>
            <Box sx={{ flexGrow: 1 }}>
                <form onSubmit={handleSubmit( onFormSubmit )}>
                    <Grid container spacing={1}>
                        <Grid size={{ xs: 12 }}>प्रयोगकर्ता </Grid>

                        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                            {/* <ReuseInput
                                name='username'
                                label='Username'
                                length={10}
                                control={control}
                                error={errors.username}
                                required
                            /> */}
                            <ReuseSelect
                                name='username'
                                label='username'
                                options={optEmployees}
                                length={10}
                                control={control}
                                error={errors.username}
                                required={true}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                            <ReuseInput
                                name='name_np'
                                label='दर्जा नामथर नेपालीमा'
                                control={control}
                                error={errors.name_np}
                                required
                            />
                        </Grid>
                        {/* <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                            <ReuseSelect
                                name='usertype'
                                label='प्रयोगकर्ताको प्रकार'
                                //     options= [
                                // {label: 'Admin', value: 'admin' },
                                // {label: 'User', value: 'user' },
                                // {label: 'Moderator', value: 'moderator' }
                                // ];
                                control={control}
                                error={errors.usertype}
                                required
                                options={usertypes}
                            />
                        </Grid> */}
                        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                            <ReuseSelect
                                name='userrole'
                                label='अधिकार'
                                control={control}
                                error={errors.userrole}
                                required
                                options={userRoleOptions}
                            />
                        </Grid>
                        {authState.role_name === 'superadmin' && (
                            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                                <ReuseKaragarOffice
                                    name='office'
                                    label='कार्यालय'
                                    control={control}
                                    error={errors.office}
                                    required
                                />
                            </Grid>
                        )}                        
                        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                            <ReuseSelect
                                name='branch'
                                label='शाखा'
                                control={control}
                                error={errors.branch}
                                required
                                options={optBranches}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                            <ReuseInput
                                name='password'
                                type='password'
                                label='Password'
                                control={control}
                                error={errors.password}
                                required
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                            <ReuseInput
                                name='repassword'
                                type='password'
                                label='Re-Password'
                                control={control}
                                error={errors.repassword}
                                required
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                            <ReuseSelect
                                name='is_active'
                                label='सक्रिय छ/छैन'
                                control={control}
                                error={errors.is_active}
                                options={defaultOptions}
                                required
                            />
                        </Grid>
                        <Grid container size={{ xs: 12 }}>
                            <Grid size={{ xs: 3 }}>
                                <Button variant='contained' type='submit'>Save</Button>
                            </Grid>
                            <Grid size={{ xs: 3 }}>
                                <Button variant='contained' color='error' onClick={clear}>Clear</Button>
                            </Grid>
                        </Grid>
                    </Grid>
                </form>
            </Box>
            <Box>
                <ReusableTable
                    columns={columns}
                    rows={formattedOptions}
                    height="800"
                    showEdit={true}
                    // showDelete={true}
                    onEdit={handleEdit}
                // onDelete={deleteDialog}
                />

                {/* <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>सि.नं.</TableCell>
                                <TableCell>कार्यालय</TableCell>
                                <TableCell>नाम</TableCell>
                                <TableCell>प्रकार</TableCell>
                                <TableCell>शाखा</TableCell>
                                <TableCell>सक्रय</TableCell>
                                <TableCell>पासवर्ड परिवर्तन गर्न(बाँकी दिन)</TableCell>
                                <TableCell>#</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>

                            {formattedOptions.map( ( cb, index ) => (
                                <TableRow>
                                    <TableCell></TableCell>
                                </TableRow>
                            ) )}
                        </TableBody>
                    </Table>
                </TableContainer> */}
            </Box>
        </>
    );
};

export default CreateUser;