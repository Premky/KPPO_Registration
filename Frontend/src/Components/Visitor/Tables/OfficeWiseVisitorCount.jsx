import React from 'react';
import ReusableEmpTable from '../ReusableComponents/ReusableEmpTable';
import ReusableTable from '../../ReuseableComponents/ReuseTable';
import useAllVisitorsCount from '../APIs/useAllVisitorsCount';

const OfficeWiseVisitorCount = () => {
  const columns = [
    { field: "name", headerName: "कार्यालय" },
    { field: "male_count", headerName: "पुरुष" },
    { field: "female_count", headerName: "महिला" },
    { field: "otherscount", headerName: "अन्य" }, 
    { field: "total_count", headerName: "जम्मा" }, 
  ];

  const { records: empRecords, loading } = useAllVisitorsCount();

  const rows = empRecords.map((emp) => {
    return {
      ...emp,
      id: emp.id,      
    };
  });
  return (
    <div>
      <ReusableTable
        columns={columns}
        rows={empRecords}
        loading={loading}
        // showView
        // showEdit
        enableExport
        includeSerial
        serialLabel="सि.नं."
      />
      {/* <Darbandi/> */}
    </div>
  );
};

export default OfficeWiseVisitorCount;
