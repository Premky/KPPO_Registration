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
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReuseDatePickerBS from '../../ReuseableComponents/ReuseDatePickerBS';
import ReuseDateField from '../../ReuseableComponents/ReuseDateField';
import usePosts from '../APIs/usePosts';
import useChkEmpSanket from '../APIs/useChkEmpSanket';
import useSanketNoGeneratorForKarar from '../APIs/useSanketNoGeneratorForKarar';
import { bs2ad } from '../../../../Utils/bs2ad';
import ReuseOffice from '../../ReuseableComponents/ReuseOffice';

const EmployeeForm = () => {
    const BASE_URL = useBaseURL();
    const { state: authState } = useAuth();
    const {
        handleSubmit, watch, setValue, register, reset,
        control, formState: { errors }
    } = useForm( { mode: 'all' } );

    const [editing, setEditing] = useState( false );
    const onFormSubmit = async ( data ) => {
        if ( !data.photo ) {
            alert( 'कृपया फोटो अपलोड गर्नुहोस्।' );
            return;
        }

        try {
            const url = editing
                ? `${ BASE_URL }/emp/update_employee/${ currentData.id }`
                : `${ BASE_URL }/emp/create_employee`;
            const method = editing ? 'PUT' : 'POST';
            const formData = new FormData();
            for ( const key in data ) {
                if ( key === 'photo' && data[key]?.[0] ) {
                    formData.append( 'photo', data[key][0] );
                } else if ( Array.isArray( data[key] ) ) {
                    formData.append( key, JSON.stringify( data[key] ) );
                } else {
                    formData.append( key, data[key] );
                }
            }
            // console.log( 'Form Data:', data );
            const response = await axios( {
                method,
                url,
                data: formData,
                headers: { 'Content-Type': 'multipart/form-data' },
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
    const watchemp_type = watch( 'emp_type' );
    const [debouncedSanketNo, setDebouncedSanketNo] = useState( '' );
    const watchProvince = watch( 'province_id' );
    const watchDistrict = watch( 'district_id' );
    const watchDob = watch( 'dob' );
    // const watchDobAd = watch( 'dob_ad' );
    const watchAppointmentDateBs = watch( 'appointment_date_bs' );
    const watchhajir_miti_bs = watch( 'hajir_miti_bs' );
    const watchAppointmentDateAd = watch( 'appointment_date_ad' );

    const formHeadStyle = { color: 'blue', fontWeight: 'bold' };
    const { posts, optPosts, postsloading, level, optLevel, Levelloading, serviceGroups, optServiceGroups, serviceGroupsloading } = usePosts();
    const { exists: sanketExists, loading: sanketLoading } = useChkEmpSanket( { sanket_no: debouncedSanketNo } );
    const { sanketNo, loading: sankeNotLoading } = useSanketNoGeneratorForKarar( watchemp_type );

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
            setValue( 'sanket_no', sanketNo );
        }
    }, [sanketNo] );

    useEffect( () => {
        const convertDate = async () => {
            if ( watchAppointmentDateBs && typeof watchAppointmentDateBs === 'string' ) {
                const ad = await bs2ad( watchAppointmentDateBs );
                if ( ad ) setValue( "appointment_date_ad", ad );
            }
            if ( watchhajir_miti_bs && typeof watchhajir_miti_bs === 'string' ) {
                const ad = await bs2ad( watchhajir_miti_bs );
                if ( ad ) setValue( "hajir_miti_ad", ad );
            }
        };
        convertDate();
    }, [watchAppointmentDateBs, watchhajir_miti_bs] );

    return (
        <>
            <Box>
                <Grid container spacing={0}>
                    <form onSubmit={handleSubmit( onFormSubmit )}>
                        <Grid container spacing={2}>
                            <Grid item size={{ xs: 12 }} sx={formHeadStyle}>
                                कार्मचारीको विवरणः
                            </Grid>

                            <Grid item container size={{ xs: 9, sm: 8, md: 10 }}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseSelect
                                        name="emp_type"
                                        label="कर्मचारीको प्रकार"
                                        required={true}
                                        control={control}
                                        options={[{ label: 'स्थायी', value: 'स्थायी' },
                                        { label: 'करार', value: 'करार' },
                                        ]}
                                        error={errors.bandi_type}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name='sanket_no'
                                        label="कर्मचारी संकेत नम्बर"
                                        // defaultValue={band_rand_id}
                                        placeholder={"अंग्रेजीमा लेख्नुहोला"}
                                        required={true}
                                        control={control}
                                        error={errors.office_bandi_id}
                                        readonly={watchemp_type == 'करार'}
                                    />
                                    <span style={{ color: 'red' }}>
                                        {sanketLoading ? 'जाँच गर्दै...' : sanketExists ? 'यो संकेत नं. पहिले नै प्रयोगमा छ।' : ''}
                                    </span>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name="name_in_nepali"
                                        label="नाम(नेपालीमा)"
                                        required={true}
                                        control={control}
                                        error={errors.name_in_nepali}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name="name_in_english"
                                        label="नाम(अंग्रेजीमा)"
                                        required={true}
                                        control={control}
                                        error={errors.name_in_english}
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
                                <Grid container size={{ xs: 12, sm: 6, md: 3 }}>
                                    <Grid item size={{ xs: 10, sm: 9, md: 8 }}>
                                        {/* <ReuseDateField */}
                                        <ReuseDateField
                                            name="dob"
                                            label="जन्म मिति (वि.सं.)"
                                            readonly={true}
                                            required={true}
                                            control={control}
                                            error={errors.dob}
                                        />
                                    </Grid>
                                    <Grid item size={{ xs: 2, sm: 3, md: 4 }}>
                                        <ReuseInput
                                            name="age"
                                            label="उमेर"
                                            required={false}
                                            control={control}
                                            error={errors.age}
                                            type="number"
                                        />
                                    </Grid>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseSelect
                                        name="married_status"
                                        label="वैवाहिक अवस्था"
                                        required={true}
                                        control={control}
                                        error={errors.married_status}
                                        options={[
                                            { label: 'विवाहित', value: 'विवाहित' },
                                            { label: 'अविवाहित', value: 'अविवाहित' },
                                            { label: 'एकल', value: 'एकल' },
                                        ]}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name="mobile_no"
                                        label="सम्पर्क नं."
                                        onlyDigits={true}
                                        minLength={10}
                                        maxLength={10}
                                        control={control}
                                        required={true}
                                        error={errors.mobile_no}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name="email"
                                        label="इमेल"
                                        control={control}
                                        error={errors.mobile_no}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name="citizenship_no"
                                        label="नागरीकता प्रमाण पत्र नं."
                                        control={control}
                                        error={errors.citizenship_no}
                                        required={true}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseDistrict
                                        name="issue_district"
                                        label="नागरीकता जारी जिल्ला"
                                        control={control}
                                        error={errors.issue_district}
                                        required={true}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseDateField
                                        name="issue_date"
                                        label="नागरीकता जारी मिति"
                                        control={control}
                                        error={errors.issue_date}
                                        required={true}
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
                                        name="ward_no"
                                        label="वडा नं."
                                        type='number'
                                        control={control}
                                        error={errors.ward}
                                        required={true}
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
                            </Grid>
                            <Grid container size={{ xs: 3, sm: 4, md: 2 }}>
                                <ReusePhotoInput
                                    name="photo"
                                    label="फोटो"
                                    required={true}
                                    control={control}
                                    error={errors.photo}
                                />
                            </Grid>
                        </Grid>
                        <hr />
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }} sx={formHeadStyle}>
                                कर्मचारीको नियुक्ति विवरणः
                            </Grid>
                            <Grid container size={{ xs: 12 }}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseSelect
                                        name="jd"
                                        label="नयाँ नियुक्ति/कार्यालयमा सरुवा/पदस्थापन/काज"
                                        required={true}
                                        control={control}
                                        options={[
                                            { label: 'नयाँ नियुक्ती', value: 'नयाँ नियुक्ती' },
                                            { label: 'सरुवा', value: 'सरुवा' },
                                            { label: 'काज', value: 'काज' },
                                            { label: 'बढुवा', value: 'बढुवा' },
                                            { label: 'पदस्थापन', value: 'पदस्थापन' },
                                        ]}
                                        error={errors.appointment_type}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseDateField
                                        name="appointment_date_bs"
                                        label="मिति(वि.सं.)"
                                        control={control}
                                        error={errors.date_bs}
                                        required={true}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseDateField
                                        name="appointment_date_ad"
                                        label="मिति(ई.सं.)"
                                        control={control}
                                        error={errors.date_ad}
                                        readonly={true}
                                        required={true}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseDateField
                                        name="hajir_miti_bs"
                                        label="हाजिर मिति(वि.सं.)"
                                        control={control}
                                        error={errors.hajir_miti_bs}
                                        required={true}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseDateField
                                        name="hajir_miti_ad"
                                        label="हाजिर (ई.सं.)"
                                        control={control}
                                        error={errors.hajir_miti_ad}
                                        readonly={true}
                                        required={true}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseSelect
                                        name="appointment_type"
                                        label="नियुक्तीको प्रकार"
                                        required={true}
                                        control={control}
                                        options={[
                                            { label: 'स्थायी', value: 'स्थायी' },
                                            { label: 'करार', value: 'करार' },
                                            { label: 'अन्य', value: 'अन्य' }
                                        ]}
                                        error={errors.appointment_type}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseSelect
                                        name="emp_level"
                                        label="कर्मचारीको श्रेणी/तह"
                                        required={true}
                                        control={control}
                                        options={optLevel}
                                        error={errors.emp_post}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseSelect
                                        name="emp_group"
                                        label="सेवा समुह"
                                        required={true}
                                        control={control}
                                        options={optServiceGroups}
                                        error={errors.emp_post}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseSelect
                                        name="emp_post"
                                        label="कर्मचारीको पद"
                                        required={true}
                                        control={control}
                                        options={optPosts}
                                        error={errors.emp_post}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseOffice
                                        name="karagar_office"
                                        label="कारागार कार्यालय"
                                        control={control}
                                        error={errors.karagar_office}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseSelect
                                        name="is_chief"
                                        label="कार्यालय प्रमुख कर्मचारी हो?"
                                        required={true}
                                        control={control}
                                        options={[
                                            { label: 'हो', value: 'हो' },
                                            { label: 'निमित्त', value: 'निमित्त' },
                                            { label: 'होइन', value: 'होइन' }
                                        ]}
                                        error={errors.is_chief}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <ReuseInput
                                        name="remarks_post"
                                        label="कैफियत"
                                        required={false}
                                        control={control}
                                        error={errors.remarks_post}
                                    />
                                </Grid>

                                <Grid>
                                    <Button variant='contained' type='submit'
                                        disabled={sanketLoading || sanketExists}
                                    >Save</Button>
                                </Grid>
                            </Grid>
                        </Grid>
                    </form>
                </Grid>
            </Box>
        </>
    );
};

export default EmployeeForm;;