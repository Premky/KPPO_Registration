import React, { useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { useAuth } from "../../Context/AuthContext";

const ResetPasswordDialog = ( { open, onClose, onSave, editingData } ) => {
    const {state:authState}=useAuth();
    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm( {
        defaultValues: {
            user_id: authState.id,
            old_password: "",
            password: "",
            repassword: "",
        },
    } );

    // Reset form when editingData or open changes
    useEffect( () => {
        if ( editingData && open ) {
            reset( {
                user_id: authState.user_id || "",
                old_password: "",
                password: "",
                repassword: "",
            } );
        } else {
            reset( {
                user_id: "",
                old_password: "",
                password: "",
                repassword: "",
            } );
        }
    }, [editingData, reset, open] );
    // console.log(authState.user)
    // Watch the new password and repassword to validate match
    const newPassword = watch( "password" );

    const onSubmit = ( data ) => {
        // console.log(data)
        onSave( data );
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>पासवर्ड परिवर्तन:</DialogTitle>
            <DialogContent>
                <Box mb={2}>
                    <TextField
                        fullWidth
                        label="प्रयोगकर्ता ID"
                        value={authState?.user || ""}
                        InputProps={{ readOnly: true }}
                    />
                </Box>

                <Controller
                    name="old_password"
                    control={control}
                    rules={{ required: "पुरानो पासवर्ड आवश्यक छ" }}
                    render={( { field } ) => (
                        <TextField
                            {...field}
                            type="password"
                            label="पुरानो पासवर्ड"
                            fullWidth
                            margin="normal"
                            error={!!errors.old_password}
                            helperText={errors.old_password?.message}
                        />
                    )}
                />

                <Controller
                    name="password"
                    control={control}
                    rules={{
                        required: "नयाँ पासवर्ड आवश्यक छ",
                        minLength: {
                            value: 6,
                            message: "पासवर्ड कम्तिमा ६ अक्षर लामो हुनुपर्छ",
                        },
                    }}
                    render={( { field } ) => (
                        <TextField
                            {...field}
                            type="password"
                            label="नयाँ पासवर्ड"
                            fullWidth
                            margin="normal"
                            error={!!errors.password}
                            helperText={errors.password?.message}
                        />
                    )}
                />

                <Controller
                    name="repassword"
                    control={control}
                    rules={{
                        required: "पुनः नयाँ पासवर्ड आवश्यक छ",
                        validate: ( value ) =>
                            value === newPassword || "पासवर्डहरू मेल खाँदैनन्",
                    }}
                    render={( { field } ) => (
                        <TextField
                            {...field}
                            type="password"
                            label="पुनः नयाँ पासवर्ड"
                            fullWidth
                            margin="normal"
                            error={!!errors.repassword}
                            helperText={errors.repassword?.message}
                        />
                    )}
                />
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} color="secondary">
                    रद्द गर्नुहोस्
                </Button>
                <Button
                    onClick={handleSubmit( onSubmit )}
                    variant="contained"
                    color="primary"
                >
                    पासवर्ड परिवर्तन गर्नुहोस्
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ResetPasswordDialog;
