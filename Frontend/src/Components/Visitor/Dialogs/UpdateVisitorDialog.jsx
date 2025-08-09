import React, { useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import ReuseCountry from "../../ReuseableComponents/ReuseCountry";
import ReuseState from "../../ReuseableComponents/ReuseState";
import ReuseDistrict from "../../ReuseableComponents/ReuseDistrict";
import ReuseMunicipality from "../../ReuseableComponents/ReuseMunicipality";
import ReuseInput from "../../ReuseableComponents/ReuseInput";
import { Grid } from "@mui/system";
import ReuseDateField from "../../ReuseableComponents/ReuseDateField";
import ReuseSelect from "../../ReuseableComponents/ReuseSelect";

const UpdateVisitorModal = ( { open, onClose, onSave, editingData } ) => {
    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm( {
        defaultValues: {
            id: "",
            regd_date: "", time: "", name: "", visitors_office: "",
            state_id: "", district_id: "", gapa_napa_id: "", tole_ward: "",
            age: "", gender: "", vehicle: "", vehicle_no: "", contact: "",
            branch: "", job: "", remarks: ""
        },
    } );

    // Reset form whenever editingData changes
    useEffect( () => {
        if ( editingData ) {
            reset( {
                id: editingData.id || "",
                regd_date: editingData.regd_date || "",
                time: editingData.time || "",
                name: editingData.name || "",
                visitors_office: editingData.visitors_office || "",
                state_id: editingData.state_id || "",
                district_id: editingData.district_id || "",
                gapa_napa_id: editingData.gapa_napa_id || editingData.city_id || "",
                tole_ward: editingData.tole_ward || "",
                age: editingData.age || "",
                gender: editingData.gender || "",
                vehicle: editingData.vehicle || "",
                vehicle_no: editingData.vehicle_no || "",
                contact: editingData.contact || "",
                branch: editingData.branch || "",
                job: editingData.job || "",
                remarks: editingData.remarks || "",
            } );
        } else {
            reset( {
                id: "",
                regd_date: "", time: "", name: "", visitors_office: "",
                state_id: "", district_id: "", gapa_napa_id: "", tole_ward: "",
                age: "", gender: "", vehicle: "", vehcile_no: "", contact: "",
                branch: "", job: "", remarks: ""
            } );
        }
    }, [editingData, reset] );

    // Watch dependent dropdowns for cascading
    const stateId = watch( "state_id" );
    const districtId = watch( "district_id" );

    const onSubmit = ( data ) => {
        // console.log(data)
        onSave( data, editingData?.id );
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle>{editingData ? "रेकर्ड सम्पादन गर्नुहोस्" : "नयाँ थप्नुहोस्"}</DialogTitle>
            <DialogContent dividers>
                {/* Hidden fields */}
                <Controller
                    name="id"
                    control={control}
                    render={( { field } ) => <input type="hidden" {...field} />}
                />
                <Controller
                    name="bandi_id"
                    control={control}
                    render={( { field } ) => <input type="hidden" {...field} />}
                />
                <Grid container size={{ xs: 12 }}>
                    <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
                        {/* <ReuseDateField */}
                        <ReuseDateField
                            name="regd_date"
                            label="दर्ता मिति(वर्ष-महिना-दिन) (वि.सं.)"
                            placeholder={'YYYY-MM-DD'}
                            required={true}
                            control={control}
                            error={errors.regd_date}
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
                            label="नाम(नेपालीमा)"
                            required={true}
                            control={control}
                            error={errors.name}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <ReuseInput
                            name="visitors_office"
                            label="पेशा"
                            control={control}
                            error={errors.visitors_office}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <ReuseState
                            name="state_id"
                            label="प्रदेश"
                            control={control}
                            error={!!errors.state_id}
                            helperText={errors.state_id && "प्रदेश अनिवार्य छ।"}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <ReuseDistrict
                            name="district_id"
                            label="जिल्ला"
                            control={control}
                            error={!!errors.district_id}
                            helperText={errors.district_id && "जिल्ला अनिवार्य छ।"}
                            selectedState={stateId}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <ReuseMunicipality
                            name="gapa_napa_id"
                            label="गा.पा./न.पा."
                            control={control}
                            error={!!errors.gapa_napa_id}
                            helperText={errors.gapa_napa_id && "गा.पा./न.पा. अनिवार्य छ।"}
                            selectedDistrict={districtId}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <ReuseInput
                            name="tole_ward"
                            label="टोल/वडा नं."
                            control={control}
                            error={!!errors.tole_ward}
                            helperText={errors.tole_ward && "टोल/वडा नं. अनिवार्य छ।"}
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
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} color="secondary">
                    रद्द गर्नुहोस्
                </Button>
                <Button onClick={handleSubmit( onSubmit )} variant="contained" color="primary">
                    {editingData ? "अपडेट गर्नुहोस्" : "थप्नुहोस्"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UpdateVisitorModal;
