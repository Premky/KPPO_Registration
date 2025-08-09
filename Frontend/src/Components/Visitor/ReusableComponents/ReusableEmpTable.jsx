import React, { useState, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Button, Box, TextField, TablePagination,
    Dialog, DialogTitle, DialogContent
} from '@mui/material';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useBaseURL } from '../../../Context/BaseURLProvider';

const ReusableEmpTable = ( {
    rows = [],
    columns = [],
    primaryMergeKey = 'bandi_id',
    title = '',
    showView = false,
    showEdit = false,
    showDelete = false,
    onView,
    onEdit,
    onDelete,
} ) => {
    const BASE_URL = useBaseURL() || '';
    const [page, setPage] = useState( 0 );
    const [rowsPerPage, setRowsPerPage] = useState( 10 );
    const [filterText, setFilterText] = useState( '' );
    const [photoPreviewOpen, setPhotoPreviewOpen] = useState( false );
    const [photoToPreview, setPhotoToPreview] = useState( '' );

    const filteredRows = useMemo( () => {
        if ( !filterText ) return rows;
        return rows.filter( bandi =>
            emp.current_office_np?.toLowerCase().includes( filterText.toLowerCase() )
        );
    }, [rows, filterText] );

    const paginatedRows = useMemo( () => {
        return filteredRows.slice( page * rowsPerPage, ( page + 1 ) * rowsPerPage );
    }, [filteredRows, page, rowsPerPage] );

    const handleChangePage = ( event, newPage ) => setPage( newPage );
    const handleChangeRowsPerPage = ( event ) => {
        setRowsPerPage( parseInt( event.target.value, 10 ) );
        setPage( 0 );
    };

    const handleExport = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet( 'बन्दी विवरण' );

        const bandiHeaders = columns.filter( c => c.field !== 'photo_path' ).map( c => c.headerName );
        worksheet.addRow( ['सि.नं.', ...bandiHeaders] );

        let excelRowIndex = 2;
        filteredRows.forEach( ( bandi, bandiIndex ) => {
            const muddaList = bandi.muddas?.length ? bandi.muddas : [{}];
            const muddaCount = muddaList.length;

            muddaList.forEach( ( mudda, idx ) => {
                const rowData = [
                    idx === 0 ? bandiIndex + 1 : '',
                    ...columns.filter( col => col.field !== 'photo_path' ).map( col => {
                        if ( col.field === 'bandi_address' ) {
                            if ( bandi.nationality === 'स्वदेशी' ) {
                                return `${ bandi.state_name_np || '' }, ${ bandi.district_name_np || '' }, ${ bandi.city_name_np || '' } - ${ bandi.wardno || '' }, ${ bandi.country_name_np || '' }`;
                            } else {
                                return `${ bandi.bidesh_nagarik_address_details || '' }, ${ bandi.country_name_np || '' }`;
                            }
                        }
                        return idx === 0 ? bandi[col.field] || '' : '';
                    } ),
                    mudda?.mudda_name || '',
                    mudda?.vadi || '0',
                    ( mudda?.mudda_phesala_antim_office || '' ) + ' ' + ( mudda?.mudda_phesala_antim_office_date || '' )
                ];
                worksheet.addRow( rowData );
            } );

            if ( muddaCount > 1 ) {
                worksheet.mergeCells( `A${ excelRowIndex }:A${ excelRowIndex + muddaCount - 1 }` );
                columns.filter( c => c.field !== 'photo_path' ).forEach( ( col, idx ) => {
                    const colNumber = idx + 2;
                    worksheet.mergeCells(
                        worksheet.getCell( excelRowIndex, colNumber ).address +
                        ':' +
                        worksheet.getCell( excelRowIndex + muddaCount - 1, colNumber ).address
                    );
                } );
            }

            excelRowIndex += muddaCount;
        } );

        worksheet.columns.forEach( column => {
            let maxLength = 10;
            column.eachCell( { includeEmpty: true }, cell => {
                const length = cell.value ? cell.value.toString().length : 0;
                if ( length > maxLength ) maxLength = length;
            } );
            column.width = maxLength + 2;
        } );

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob( [buffer], { type: 'application/octet-stream' } );
        saveAs( blob, 'employee_records.xlsx' );
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <h2>{title}</h2>
                <Button variant="outlined" onClick={handleExport}>एक्सेल निर्यात</Button>
            </Box>

            <Box mb={2}>
                <TextField
                    label="कर्मचारीको नाम खोज्नुहोस्"
                    variant="outlined"
                    size="small"
                    value={filterText}
                    onChange={( e ) => setFilterText( e.target.value )}
                />
            </Box>

            <Dialog open={photoPreviewOpen} onClose={() => setPhotoPreviewOpen( false )} maxWidth="sm" fullWidth>
                <DialogTitle>फोटो</DialogTitle>
                <DialogContent sx={{ textAlign: 'center' }}>
                    <img
                        src={photoToPreview}
                        alt="Preview"
                        style={{ width: '100%', maxWidth: '400px', borderRadius: '8px', objectFit: 'contain' }}
                    />
                </DialogContent>
            </Dialog>

            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell align="center">सि.नं.</TableCell>
                            {columns.map( col => (
                                <TableCell key={col.field} align="center">{col.headerName}</TableCell>
                            ) )}
                            <TableCell align="center">#</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {paginatedRows.map( ( bandi, bandiIndex ) => {
                            const muddaList = bandi.muddas?.length ? bandi.muddas : [{}];
                            const rowSpan = muddaList.length;

                            return muddaList.map( ( mudda, muddaIndex ) => (
                                <TableRow key={`${ bandi[primaryMergeKey] }-${ muddaIndex }`}>
                                    {muddaIndex === 0 && (
                                        <TableCell rowSpan={rowSpan} align="center">
                                            {page * rowsPerPage + bandiIndex + 1}
                                        </TableCell>
                                    )}

                                    {muddaIndex === 0 && columns.map( col => {
                                        const value = bandi[col.field];
                                        return (
                                            <TableCell key={col.field} rowSpan={rowSpan} align="center">
                                                {col.renderCell
                                                    ? col.renderCell( { value, row: bandi } )
                                                    : col.field === 'photo_path' && value ? (
                                                        <img
                                                            src={`${ BASE_URL }${ value }`}
                                                            alt="कर्मचारी फोटो"
                                                            onClick={() => {
                                                                setPhotoToPreview( `${ BASE_URL }${ value }` );
                                                                setPhotoPreviewOpen( true );
                                                            }}
                                                            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                                                        />
                                                    ) : (
                                                        value || ''
                                                    )}
                                            </TableCell>
                                        );
                                    } )}


                                    <TableCell rowSpan={rowSpan} align="center">
                                        {showView && <Button variant="outlined" size="small" color="primary" onClick={() => onView?.( bandi )} style={{ marginRight: '5px' }}>View</Button>}
                                        {showEdit && <Button variant="outlined" size="small" color="secondary" onClick={() => onEdit?.( bandi )} style={{ marginRight: '5px' }}>Edit</Button>}
                                        {showDelete && <Button variant="outlined" size="small" color="error" onClick={() => onDelete?.( bandi )}>Delete</Button>}
                                    </TableCell>

                                </TableRow>
                            ) );
                        } )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={filteredRows.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </Box>
    );
};

export default ReusableEmpTable;
