import React from 'react';
import useAllEmployes from '../APIs/useAllEmp';
import ReusableEmpTable from '../ReusableComponents/ReusableEmpTable';
import Darbandi from './Darbandi';

const AllEmpTable = () => {
  const columns = [
    { field: "current_office_np", headerName: "कार्यालय" },
    { field: "emp_type", headerName: "कर्मचारी प्रकार" },
    { field: "sanket_no", headerName: "क.स.नं." },
    { field: "level_name", headerName: "तह" },
    { field: "service_group", headerName: "सेवा समुह" },
    { field: "current_post", headerName: "पद" },
    { field: "name", headerName: "नाम (नेपाली)" },
    { field: "appointment_date_bs", headerName: "सुरु नियुक्ती मिति(वि.सं.)" },
    { field: "current_post_appointment_date_bs", headerName: "हालको पदको नियुक्ती मिति (वि.सं.)" },
    { field: "current_post_appointment_date_bs", headerName: "कार्यालयमा सरुवा/पदस्थापन भएको निर्णय मिति" },
    { field: "hajir_miti_bs", headerName: "कार्यालयमा हाजिर मिति" },
    { field: "jd", headerName: "दरबन्दी/काज/कामकाज" },
    { field: "kaaj_office", headerName: "काजमा भए पदाधिाकर रहेको निकाय" },
    { field: "approved_darbandi", headerName: "स्विकृत दरबन्दी" },
    { field: "working_count", headerName: "कार्यरत" },
    { field: "rikt", headerName: "रिक्त" },
    { field: "is_office_chief", headerName: "कारागार प्रशासक?" },
  ];

  const { records: empRecords, loading } = useAllEmployes();
  console.log(empRecords)
  const rows = empRecords.map((emp) => {
    const firstAppointment = emp.post_history?.find(
      (post) => post.jd_type === "नयाँ नियुक्ती"
    );

    // const lastPostEntry = emp.post_history?.[0]; // Assuming already sorted DESC by jd
    const lastPostEntry = emp.last_jd_entry; // Assuming already sorted DESC by jd

    const appointment_date_bs = firstAppointment?.appointment_date_bs || 'N/A';
    
    const current_post_appointment_date_bs = lastPostEntry?.appointment_date_bs || 'N/A';
    const hajir_miti_bs = lastPostEntry?.hajir_miti_bs || 'N/A';
    const current_post = lastPostEntry?.post_name_np || '' 
    const jd = lastPostEntry?.jd||''
    const kaaj_office_np = lastPostEntry?.kaaj_office_np||''
    const is_office_chief=lastPostEntry?.is_office_chief||''
    // const emp_type=lastPostEntry?.emp_type||''
    let kaaj_office
    if(jd=='काज'){ kaaj_office=kaaj_office_np}
    return {
      ...emp,
      id: emp.id,      
      appointment_date_bs,
      current_post_appointment_date_bs,
      hajir_miti_bs,
      jd,
      current_post,
      kaaj_office,
      is_office_chief,
      emp_type:emp.emp_type,
      
      
      service_group: emp.service_name_np && emp.group_name_np
        ? `${emp.service_name_np}/${emp.group_name_np}`
        : 'N/A',
      level_name: emp.level_name_np && emp.emp_rank_np
        ? `${emp.level_name_np}/${emp.emp_rank_np}`
        : emp.level_name_np
          ? emp.level_name_np
          : emp.emp_rank_np
            ? emp.emp_rank_np
            : 'N/A',
    };
  });

  return (
    <div>
      <ReusableEmpTable
        columns={columns}
        rows={rows}
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

export default AllEmpTable;
