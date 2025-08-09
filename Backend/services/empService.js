import { bs2ad } from '../utils/bs2ad.js';
import pool from '../utils/db3.js';

async function insertEmpRoute( data, connection ) {
  console.log( data );
  const dob_ad = await bs2ad( data.dob );
  // let connection = data.connection;    
  try {
    if ( !data ) {
      console.warn( "⚠️ No emp data provided to insert." );
      return 0;
    }
    const filteredData = ( typeof data.sanket_no === 'string' && data.sanket_no.trim() !== '' ) ||
      ( typeof data.emp_type === 'number' && !isNaN( data.emp_type ) );

    if ( !filteredData ) {
      console.warn( "⚠️ All contacts filtered out. Possibly missing 'sanket_no'." );
      // console.log( "🔍 Received contacts:", data );
      return 0;
    }

    const sql = `INSERT INTO employees (
                emp_type, sanket_no, name_in_nepali, name_in_english,
                gender, dob, dob_ad, married_status, mobile_no, email, 
                citizenship_no, issue_date, issue_district_id, 
                province_id, district_id, municipality_id, ward_no,
                is_active, photo_path, remarks,
                created_by, updated_by, created_at, updated_at, current_office_id
                ) VALUES (?)`;
    const values = [
      data.emp_type, data.sanket_no, data.name_in_nepali, data.name_in_english,
      data.gender, data.dob, dob_ad, data.married_status, data.mobile_no, data.email,
      data.citizenship_no, data.issue_date, data.issue_district,
      data.province_id, data.district_id, data.city_id, data.ward_no,
      1, data.photo_path, data.remarks,
      data.user_id, data.user_id, new Date(), new Date(),
      data.active_office
    ];
    // const result = await queryAsync( sql, [values] );
    const [result] = await connection.query( sql, [values] );
    console.log( "✅ Insert result:", result );
    return result.insertId || 0;
  } catch ( err ) {
    console.error( "❌ SQL/Insert error:", err ); // <-- logs real SQL or DB issues
    throw err;
  }
}

async function insertJd( emp_id, data, user_id, active_office, connection ) {

  const baseValues = [
    emp_id,
    data.appointment_date_bs,
    data.appointment_date_ad,
    data.hajir_miti_bs,
    data.hajir_miti_ad,
    data.jd,
    data.appointment_type,
    data.emp_level, data.emp_group, data.emp_post,     
    data.karagar_office,
    data.is_chief,
    data.remarks_post
  ];

  const auditFields = [user_id, new Date(), active_office];

  let values, sql;
  try {
    values = [...baseValues, ...auditFields];
    sql = `INSERT INTO employee_post_history(
      employee_id, appointment_date_bs, appointment_date_ad, hajir_miti_bs,hajir_miti_ad, jd, appointment_type,
      level_id, service_group_id, post_id, 
      office_id, is_office_chief, remarks, updated_by, updated_at,current_office_id ) VALUES (?)`;
    const [result] = await connection.query( sql, [values] );
  } catch ( err ) {
    console.error( "❌ Error preparing SQL for insertJd:", err );
    throw err;
  } 
  // await queryAsync( sql, [values] );
}

export {
  insertEmpRoute,
  insertJd
};