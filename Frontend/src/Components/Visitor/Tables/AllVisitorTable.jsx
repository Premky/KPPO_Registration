import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid
} from '@mui/material';
import ReusableTable from '../../ReuseableComponents/ReuseTable';
import useAllVisitors from '../APIs/useAllVisitors';
import axios from 'axios';
import { useBaseURL } from '../../../Context/BaseURLProvider';
import { useForm } from 'react-hook-form';
import ReuseState from '../../ReuseableComponents/ReuseState';
import ReuseDistrict from '../../ReuseableComponents/ReuseDistrict';
import ReuseMunicipality from '../../ReuseableComponents/ReuseMunicipality';
import ReuseInput from '../../ReuseableComponents/ReuseInput';
import UpdateVisitorDialog from '../Dialogs/UpdateVisitorDialog';
import Swal from 'sweetalert2';

const AllVisitorTable = () => {
  const BASE_URL = useBaseURL();
  const {
    handleSubmit, watch, setValue, register, reset,
    control, formState: { errors }
  } = useForm( { mode: 'all' } );
  const columns = [
    { field: "office", headerName: "कार्यालय" },
    { field: "regd_no", headerName: "दर्ता नं." },
    { field: "regd_date", headerName: "दर्ता मिति" },
    { field: "time", headerName: "समय" },
    { field: "visitors_office", headerName: "पेशा" },
    { field: "name", headerName: "नामथर" },
    { field: "address", headerName: "वतन" },
    { field: "contact", headerName: "सम्पर्क नं." },
    { field: "age", headerName: "उमेर/लिङ्ग" },
    { field: "vehicle", headerName: "सवारीको प्रकार" },
    { field: "vehicle_no", headerName: "सवारीको नं." },
    { field: "branch", headerName: "सम्पर्क शाखा" },
    { field: "job", headerName: "प्रयोजन" },
    { field: "remarks", headerName: "कैफियत" },
  ];

  const { records: empRecords, loading } = useAllVisitors();
console.log(empRecords)
  const [rows, setRows] = useState(
    empRecords.map( ( emp ) => ( {
      ...emp,
      id: emp.id,
      address: emp.address
        ? `${ emp.address }`
        : `${ emp.tole_ward },${ emp.city_name_np },${ emp.district_name_np },${ emp.state_name_np }`,
    } ) )
  );
  const handleProvinceChange = ( value ) => {
    setProvinceId( value );
    setDistrictId( '' ); // reset district when province changes
    handleInputChange( 'state_id', value );
    handleInputChange( 'district_id', '' );
    handleInputChange( 'city_id', '' );
  };

  const handleDistrictChange = ( value ) => {
    setDistrictId( value );
    handleInputChange( 'district_id', value );
    handleInputChange( 'city_id', '' );
  };

  const handleMunicipalityChange = ( value ) => {
    handleInputChange( 'city_id', value );
  };

  // Sync rows when empRecords changes
  React.useEffect( () => {
    setRows( empRecords.map( ( emp ) => ( {
      ...emp,
      id: emp.id,
      address: emp.address
        ? `${ emp.address }`
        : `${ emp.tole_ward },${ emp.city_name_np },${ emp.district_name_np },${ emp.district_state_np }`,
    } ) ) );
  }, [empRecords] );

  // Edit dialog state
  const [openEditDialog, setOpenEditDialog] = useState( false );
  const [editingRow, setEditingRow] = useState( null );

  const handleEditClick = ( row ) => {
    console.log( row );
    setEditingRow( row );
    setOpenEditDialog( true );
  };

  const handleCloseDialog = () => {
    setOpenEditDialog( false );
    setEditingRow( null );
  };

  // Save edited data
  const handleSaveEdit = async ( updatedData ) => {
    try {
      // console.log(data)
      // Assuming your API endpoint for update is like this:
      const response = await axios.put(
        `${ BASE_URL }/visitor/update_visitor/${ updatedData.id }`,
        updatedData,
        { withCredentials: true }
      );
      const { Status, Result, Error } = response.data;
      setRows( ( prevRows ) =>
        prevRows.map( ( r ) => ( r.id === updatedData.id ? updatedData : r ) )
      );
      if ( Status ) {
        Swal.fire( 'परिमार्जित!', 'रिकर्ड सफलतापूर्वक परिमार्जित गरीयो!', 'success' );
        reset();
        setOpenEditDialog( false );
        setEditingRow( null );
      } else {
        Swal.fire( 'त्रुटि!', Error || 'रिकर्ड थप्न सकिएन', 'error' );
      }

    } catch ( error ) {
      console.error( "Failed to update visitor:", error );      
      Swal.fire( 'समस्या आयो!', 'कृपया पुनः प्रयास गर्नुहोस्।', 'error' );
    }
  };

  // Handle input change inside dialog
  const handleInputChange = ( field, value ) => {
    setEditingRow( ( prev ) => ( {
      ...prev,
      [field]: value,
    } ) );
  };

  return (
    <div>
      <ReusableTable
        columns={columns}
        rows={rows}
        loading={loading}
        showEdit
        onEdit={handleEditClick}
        enableExport
        includeSerial
        serialLabel="सि.नं."
      />
      <UpdateVisitorDialog
        open={openEditDialog}
        onClose={handleCloseDialog}
        onSave={handleSaveEdit}
        editingData={editingRow}
      />

    </div>
  );
};

export default AllVisitorTable;
