import React, { useEffect, useState } from 'react';
import { useBaseURL } from '../../../Context/BaseURLProvider';
import { useAuth } from '../../../Context/AuthContext';
import { useForm } from 'react-hook-form';
import { Box, Button, Grid } from '@mui/material';
import debounce from 'lodash/debounce';
import ReuseCountry from '../../ReuseableComponents/ReuseCountry';
import ReuseState from '../../ReuseableComponents/ReuseState';
import ReuseDistrict from '../../ReuseableComponents/ReuseDistrict';
import ReuseMunicipality from '../../ReuseableComponents/ReuseMunicipality';
import ReuseInput from '../../ReuseableComponents/ReuseInput';
import ReusePhotoInput from '../../ReuseableComponents/ReusePhotoInput';
import ReuseSelect from '../../ReuseableComponents/ReuseSelect';
import Swal from 'sweetalert2';
import axios from 'axios';
import ReuseDatePickerBS from '../../ReuseableComponents/ReuseDatePickerBS';
import ReuseDateField from '../../ReuseableComponents/ReuseDateField';
import usePosts from '../APIs/usePosts';
import useChkEmpSanket from '../APIs/useChkEmpSanket';
import useSanketNoGeneratorForKarar from '../APIs/useSanketNoGeneratorForKarar';
import { bs2ad } from '../../../../Utils/bs2ad';
import ReuseOffice from '../../ReuseableComponents/ReuseOffice';

const VisitorForm = () => {
    const BASE_URL = useBaseURL();
    const { state: authState } = useAuth();
    const {
        handleSubmit, watch, setValue, register, reset,
        control, formState: { errors }
    } = useForm( { mode: 'all' } );

    const [editing, setEditing] = useState( false );
    const onFormSubmit = async ( data ) => {

        try {
            const url = editing
                ? `${ BASE_URL }/visitor/update_visitor/${ currentData.id }`
                : `${ BASE_URL }/visitor/create_visitor`;
            const method = editing ? 'PUT' : 'POST';
            // console.log( 'Form Data:', data );
            const response = await axios( {
                method,
                url,
                data,
                withCredentials: true
            } );
            const { Status, Result, Error } = response.data;
            if ( Status ) {
                Swal.fire( 'थपियो!', 'रिकर्ड सफलतापूर्वक थपियो', 'success' );
                const emp_id = Result;
                // navigate( `/emp/view_saved_record/${ emp_id }` );
                reset();
                setEditing( false );
            } else {
                Swal.fire( 'त्रुटि!', Error || 'रिकर्ड थप्न सकिएन', 'error' );
            }
        } catch ( error ) {
            console.log( 'Error submitting form', error );
            Swal.fire( 'त्रुटि!', 'डेटा बुझाउँदा समस्या आयो।', 'error' );
        }
    };

    const watchsanket_no = watch( 'sanket_no' );
    const [debouncedSanketNo, setDebouncedSanketNo] = useState( '' );
    const watchProvince = watch( 'province_id' );
    const watchDistrict = watch( 'district_id' );

    const formHeadStyle = { color: 'blue', fontWeight: 'bold' };    
    const { exists: sanketExists, loading: sanketLoading } = useChkEmpSanket( { sanket_no: debouncedSanketNo } );
    const { sanketNo, loading: sankeNotLoading } = useSanketNoGeneratorForKarar( );

    useEffect( () => {
        const handler = debounce( ( value ) => {
            setDebouncedSanketNo( value );
        }, 500 );
        handler( watchsanket_no );
        return () => {
            handler.cancel();
        };
    }, [watchsanket_no] );

    useEffect( () => {
        if ( sanketExists ) {
            Swal.fire( "सूचना!", "यो संकेत नं. पहिले नै प्रयोगमा छ।", "warning" );
        }
    }, [sanketExists] );

    useEffect( () => {
        if ( sanketNo ) {
            setValue( 'regd_no', sanketNo );
        }
    }, [sanketNo] );

    return (
        <>
            <Box>
                <Grid container spacing={0}>
                    <form onSubmit={handleSubmit( onFormSubmit )}>
                        <Grid container spacing={2}>
                            <Grid item size={{ xs: 12 }} sx={formHeadStyle}>
                                आगन्तुक विवरणः
                            </Grid>

                            <Grid item container size={{ xs: 12 }}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name='regd_no'
                                        label="दर्ता नं."
                                        // defaultValue={band_rand_id}
                                        placeholder={"अंग्रेजीमा लेख्नुहोला"}
                                        readonly={true}
                                        required={true}
                                        control={control}
                                        error={errors.regd_no}                                        
                                    />
                                    <span style={{ color: 'red' }}>
                                        {sanketLoading ? 'जाँच गर्दै...' : sanketExists ? 'यो संकेत नं. पहिले नै प्रयोगमा छ।' : ''}
                                    </span>
                                </Grid>
                                <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
                                    {/* <ReuseDateField */}
                                    <ReuseDateField
                                        name="regd_date"
                                        label="दर्ता मिति(वर्ष-महिना-दिन) (वि.सं.)"
                                        placeholder={'YYYY-MM-DD'}
                                        required={true}
                                        control={control}
                                        error={errors.date_bs}
                                    />
                                </Grid>
                                <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
                                    {/* <ReuseDateField */}
                                    <ReuseInput
                                        name="time"
                                        label="समय"
                                        type='time'
                                        required={true}
                                        control={control}
                                        error={errors.time}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name="name"
                                        label="नामथर(नेपालीमा)"
                                        required={true}
                                        control={control}
                                        error={errors.name_in_nepali}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name="visitors_office"
                                        label="पेशा"
                                        control={control}
                                        error={errors.mobile_no}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseState
                                        name="province_id"
                                        label="प्रदेश"
                                        control={control}
                                        error={errors.province_id}
                                        required={true}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseDistrict
                                        name="district_id"
                                        label="जिल्ला"
                                        control={control}
                                        error={errors.district_id}
                                        required={true}
                                        selectedState={watchProvince}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseMunicipality
                                        name="city_id"
                                        label="गा.पा./न.पा."
                                        control={control}
                                        error={errors.city_id}
                                        required={true}
                                        selectedDistrict={watchDistrict}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name="tole_ward"
                                        label="टोल/वडा"
                                        control={control}
                                        error={errors.tole_ward}
                                        required={true}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name="age"
                                        label="उमेर"
                                        required={false}
                                        control={control}
                                        error={errors.age}
                                        type="number"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseSelect
                                        name="gender"
                                        label="लिङ्ग"
                                        required={true}
                                        control={control}
                                        error={errors.gender}
                                        options={[
                                            { label: 'पुरुष', value: 'पुरुष' },
                                            { label: 'महिला', value: 'महिला' },
                                            { label: 'अन्य', value: 'अन्य' }
                                        ]}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name="vehicle"
                                        label="सवारीको प्रकार"
                                        required={false}
                                        control={control}
                                        error={errors.vehicle}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name="vehicle_no"
                                        label="सवारी नं."
                                        required={false}
                                        control={control}
                                        error={errors.vehicle_no}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name="contact"
                                        label="सम्पर्क नं."
                                        onlyDigits={true}
                                        minLength={10}
                                        maxLength={10}
                                        control={control}
                                        required={true}
                                        error={errors.contact}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name="branch"
                                        label="सम्पर्क गर्ने शाखा"
                                        required={false}
                                        control={control}
                                        error={errors.branch}
                                    />
                                </Grid>


                                <Grid item size={{ xs: 12 }} >
                                    <ReuseInput
                                        name="job"
                                        label="प्रयोजन"
                                        required={false}
                                        control={control}
                                        error={errors.job}
                                    />
                                </Grid>
                                <Grid item size={{ xs: 12 }} >
                                    <ReuseInput
                                        name="remarks"
                                        label="कैफियत"
                                        required={false}
                                        control={control}
                                        error={errors.remarks}
                                    />
                                </Grid>
                                <Grid item size={{ xs: 6 }} >
                                    <Button type='submit' variant='contained'> Save</Button>
                                </Grid>
                            </Grid>
                        </Grid>
                    </form>
                </Grid>
            </Box>
        </>
    );
};

export default VisitorForm;;