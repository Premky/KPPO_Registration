import React, { useState } from "react";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import ExcelJS from "exceljs";
// import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Button, Paper } from "@mui/material";
import Swal from "sweetalert2";


const ReusableTable = ( {
  columns,
  rows,
  height = 500,
  width = "100%",
  showView = false,
  showEdit = false,
  showDelete = false,
  onView,
  onEdit,
  onDelete,
  enableExport = false,
  includeSerial = true,
  serialLabel = "S.No", // or "सि.नं."
  onPageChange,
  onRowsPerPageChange,
  pageSizeOptions,
  page
} ) => {
  // console.log(rows)
  // const [pageSize, setPageSize] = useState(10);
  const defaultPageSize = parseInt( localStorage.getItem( "pageSize" ) ) || 25;;
  const [paginationModel, setPaginationModel] = useState( {
    pageSize: defaultPageSize,
    page: 0,
  } );

  const handlePaginationChange = ( newModel ) => {
    setPaginationModel( newModel );
    localStorage.setItem( "pageSize", newModel.pageSize );
  };

  // Remove duplicates of serial number column
  const cleanedColumns = columns.filter(
    ( col ) =>
      col.field !== "sn" &&
      col.headerName !== "S.No" &&
      col.headerName !== "सि.नं."
  );

  // Add serial column if enabled
  const updatedColumns = [
    ...( includeSerial
      ? [
        {
          field: "sn",
          headerName: serialLabel,
          width: 70,
          sortable: false,
          filterable: false,
          renderCell: ( params ) => {
            const index = rows.findIndex( ( row ) => row.id === params.row.id );
            return index + 1;
          },
        },
      ]
      : [] ),
    ...cleanedColumns.map( ( col ) => ( {
      ...col,
      flex: 1,
      minWidth: col.minWidth || 150,
      sortable: true,
      hideable: true,
      hide: col.hide || false,
      renderCell:
        col.field === "photo_path"
          ? ( params ) =>
            params.value ? (
              <img
                src={params.value}
                alt="photo"
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 5,
                  objectFit: "cover",
                  cursor: "pointer",
                }}
                onClick={() => previewImage( params.value )}
              />
            ) : (
              "No Image"
            )
          : col.renderCell || ( ( params ) => params.value ?? "" ), // fallback to value
    } ) ),
  ];

  const handleExportExcel = async () => {
    const { saveAs } = await import( "file-saver" );
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet( "Data" );

    worksheet.addRow( updatedColumns.map( ( col ) => col.headerName ) );
    rows.forEach( ( row, rowIndex ) => {
      worksheet.addRow(
        updatedColumns.map( ( col ) =>
          col.field === "sn" ? rowIndex + 1 : row[col.field]
        )
      );
    } );

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs( new Blob( [buffer] ), "table_data.xlsx" );
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const headers = updatedColumns.map( ( col ) => col.headerName );
    const data = rows.map( ( row, index ) =>
      updatedColumns.map( ( col ) =>
        col.field === "sn" ? index + 1 : row[col.field]
      )
    );

    doc.autoTable( {
      head: [headers],
      body: data,
    } );

    doc.save( "table_data.pdf" );
  };

  const previewImage = ( url ) => {
    Swal.fire( {
      imageUrl: url || "https://placeholder.pics/svg/300x1500",
      imageWidth: "100%",
      imageHeight: "100%",
      imageAlt: "Preview Image",
      showConfirmButton: false,
    } );
  };

  return (
    <div style={{ height, width }}>
      {enableExport && (
        <div style={{ marginBottom: 10 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleExportExcel}
            style={{ marginRight: 10 }}
          >
            Export to Excel
          </Button>
          {/* Optional PDF Export */}
          {/* <Button variant="contained" color="secondary" onClick={handleExportPDF}>
            Export to PDF
          </Button> */}
        </div>
      )}

      <Paper sx={{ height, width }} style={{ overflowX: "auto" }}>
        <DataGrid
          sx={{
            border: 0,
            '& .MuiDataGrid-cell': {
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              lineHeight: '1.5rem',
            }
          }}
          columns={[
            ...updatedColumns,
            {
              field: "actions",
              headerName: "Actions",
              minWidth: 150,
              flex: 1,
              sortable: false,
              filterable: false,
              renderCell: ( params ) => (
                <div style={{ display: "flex", gap: 8 }}>
                  {showView && (
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      onClick={() => onView?.( params.row )}
                    >
                      View
                    </Button>
                  )}

                  {showEdit && (
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => onEdit?.( params.row )}
                    >
                      Edit
                    </Button>
                  )}

                  {showDelete && (
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      onClick={() => onDelete?.( params.row.id )}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={rows}
          pagination
          paginationMode="client"
          // pageSize={pageSize}
          // onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
          getRowId={( row ) => row.id}
          components={{ Toolbar: GridToolbar }}  // <-- This enables toolbar with page size selector, filter etc.
          paginationModel={paginationModel}
          // onPaginationModelChange={( newModel ) => setPaginationModel( newModel )}
          onPaginationModelChange={handlePaginationChange}
          // pageSizeOptions={[25, 50, 100, 200, 500]}
          pageSizeOptions={pageSizeOptions || [25, 50, 100 ]}
          onPageChange={onPageChange}

          initialState={{

            columns: {
              columnVisibilityModel: Object.fromEntries(
                cleanedColumns.map( ( col ) => [col.field, !col.hide] )
              ),
            },
          }}
        />
      </Paper>
    </div>
  );
};

export default ReusableTable;
