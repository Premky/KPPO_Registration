// services/bandiService.js

//गाडीका विवरणहरुः नाम सुची
// Promisify specific methods
import con from '../utils/db.js';
import pool from '../utils/db3.js';
import { promisify } from 'util';
const queryAsync = promisify( con.query ).bind( con );
const beginTransactionAsync = promisify( con.beginTransaction ).bind( con );
const commitAsync = promisify( con.commit ).bind( con );
const rollbackAsync = promisify( con.rollback ).bind( con );
const query = promisify( con.query ).bind( con );

import { bs2ad } from '../utils/bs2ad.js';
// let connection;
// connection = await pool.getConnection();

async function insertBandiPerson( data, connection ) {
  const dob_ad = await bs2ad( data.dob );
  const values = [
    data.bandi_type, data.office_bandi_id, data.lagat_no, data.nationality, data.bandi_name,
    data.gender, data.dob, dob_ad, data.age, data.married_status, data.photo_path,
    data.bandi_education, data.bandi_height, data.bandi_weight, data.bandi_huliya,
    data.bandi_remarks, data.user_id, data.user_id, data.office_id
  ];

  const sql = `INSERT INTO bandi_person (
    bandi_type, office_bandi_id,lagat_no, nationality, bandi_name, gender, dob, dob_ad, age, married_status, photo_path,
    bandi_education, height, weight, bandi_huliya, remarks, created_by, updated_by, current_office_id
  ) VALUES (?)`;

  // const result = await queryAsync( sql, [values] );
  const [result] = await connection.query( sql, [values] );
  return result.insertId;
}

async function insertKaidDetails( bandi_id, data, connection ) {

  // const defaultDate = '1950-01-01';

  const hirasatBs = data.hirasat_date_bs;
  const releaseBs = data.release_date_bs;

  let thunaAd;
  let releaseAd;
  if ( hirasatBs ) {
    // thunaAd = data.hirasatBs;
    thunaAd = data.hirasatBs && await bs2ad( data?.hirasat_date_bs );
  }
  if ( releaseBs ) {
    releaseAd = data.releaseBs && await bs2ad( data?.release_date_bs );
  }
  let is_life_time;
  if(data.is_life_time==undefined || data.is_life_time=="" || data.is_life_time==null){
    is_life_time=0;
  }else{
    is_life_time=data.is_life_time
  }

  const baseValues = [
    bandi_id,
    data.hirasat_years,
    data.hirasat_months,
    data.hirasat_days,
    hirasatBs,
    thunaAd
  ];

  const auditFields = [data.user_id, data.user_id, data.office_id];

  let values, sql;

  if ( releaseBs ) {
    values = [...baseValues, is_life_time, releaseBs, releaseAd, ...auditFields];
    sql = `INSERT INTO bandi_kaid_details (
    bandi_id, hirasat_years, hirasat_months, hirasat_days, thuna_date_bs,  thuna_date_ad, is_life_time,
    release_date_bs, release_date_ad,
    created_by, updated_by, current_office_id
  ) VALUES (?)`;
  } else {
    values = [...baseValues, ...auditFields];
    sql = `INSERT INTO bandi_kaid_details (
    bandi_id, hirasat_years, hirasat_months, hirasat_days, thuna_date_bs,  thuna_date_ad,
    created_by, updated_by, current_office_id
  ) VALUES (?)`;
  }
  // await queryAsync( sql, [values] );
  const [result] = await connection.query( sql, [values] );
}

async function insertCardDetails( bandi_id, data, connection ) {
  const values = [
    bandi_id, data.id_card_type, data.card_name, data.card_no,
    data.card_issue_district_id, data.card_issue_date, data.user_id, data.office_id
  ];
  const sql = `INSERT INTO bandi_id_card_details (
    bandi_id, card_type_id, card_name, card_no, card_issue_district, card_issue_date, created_by, current_office_id
  ) VALUES (?)`;
  // await queryAsync( sql, [values] );
  const [result] = await connection.query( sql, [values] );
}

async function insertAddress( bandi_id, data,connection ) {
  let sql, values;
  const isNepali = Number( data.nationality_id ) === 1;

  if ( isNepali ) {
    values = [
      bandi_id,
      data.nationality_id,
      data.state_id,
      data.district_id,
      data.municipality_id,
      data.wardno,
      data.user_id,
      data.user_id,
      data.office_id
    ];
    sql = `INSERT INTO bandi_address (
      bandi_id, nationality_id, province_id, district_id,
      gapa_napa_id, wardno,
      created_by, updated_by, current_office_id
    ) VALUES (?)`;
  } else {
    values = [
      bandi_id,
      data.nationality_id,
      data.bidesh_nagrik_address_details,
      data.user_id,
      data.user_id,
      data.office_id
    ];
    sql = `INSERT INTO bandi_address (
      bandi_id, nationality_id, bidesh_nagarik_address_details,
      created_by, updated_by, current_office_id
    ) VALUES (?)`;
  }

  // await queryAsync( sql, [values] );
  const [result] = await connection.query( sql, [values] );
}

async function insertMuddaDetails( bandi_id, muddas = [], user_id, office_id,connection ) {
  const sql = `INSERT INTO bandi_mudda_details (
    bandi_id, mudda_id, mudda_no, is_last_mudda, is_main_mudda,
    mudda_condition, mudda_phesala_antim_office_district,
    mudda_phesala_antim_office_id, mudda_phesala_antim_office_date, vadi, 
    hirasat_years, hirasat_months, hirasat_days, thuna_date_bs, release_date_bs, total_kaid, is_life_time,
    created_by, created_at, updated_by, updated_at, current_office_id
  ) VALUES (?)`;

  for ( const m of muddas ) {
    // 🛑 Skip this mudda if mudda_id is missing or empty
    if ( !m.mudda_id ) continue;
    let is_life_time
    if(m.is_life_time == null || m.is_life_time == undefined || m.is_life_time==''){
      is_life_time=0
    }else{
      is_life_time=m.is_life_time
    }
    const values = [
      bandi_id,
      m.mudda_id,
      m.mudda_no,
      m.is_last,
      m.is_main,
      m.condition,
      m.district,
      m.office,
      m.date,
      m.vadi,
      m.hirasat_years, m.hirasat_months, m.hirasat_days, m.thuna_date_bs, m.release_date_bs, m.total_kaid_duration, is_life_time,
      user_id, new Date(), user_id, new Date(), office_id
    ];
    // await queryAsync( sql, [values] );
    const [result] = await connection.query( sql, [values] );
  }
}

async function insertFineDetails( bandi_id, fines, user_id, office_id, connection ) {
  for ( const fine of fines ) {
    let sql, values;

    const isFixed = Number( fine.is_fine_fixed ) === 1;
    const isPaid = Number( fine.is_fine_paid ) === 1;

    let depositAmount = fine.fine_amt;
    if (
      depositAmount === undefined ||
      depositAmount === null ||
      depositAmount.toString().trim() === '' ||
      isNaN( Number( depositAmount ) )
    ) {
      depositAmount = 0;
    } else {
      depositAmount = Number( depositAmount );
    }
    if ( isFixed && isPaid ) {
      sql = `INSERT INTO bandi_fine_details (
        bandi_id, fine_type_id, amount_fixed, amount_deposited,
        deposit_office, deposit_district, deposit_ch_no,
        deposit_date, deposit_amount,
        created_by, updated_by, current_office_id
      ) VALUES (?)`;

      values = [
        bandi_id,
        fine.fine_type,
        fine.is_fine_fixed,
        fine.is_fine_paid,
        fine.fine_paid_office,
        fine.fine_paid_office_district,
        fine.fine_paid_cn,
        fine.fine_paid_date,
        depositAmount,
        user_id,
        user_id,
        office_id
      ];
      console.log( values,
        'isFixed:', isFixed, 'isPaid:', isPaid );
    } else if ( isFixed && isPaid == 0 ) {
      sql = `INSERT INTO bandi_fine_details(
      bandi_id, fine_type_id, amount_fixed, amount_deposited, deposit_amount,
      created_by, updated_by, current_office_id) VALUES(?)`;
      values = [
        bandi_id,
        fine.fine_type,
        fine.is_fine_fixed,
        fine.is_fine_paid,
        depositAmount,
        user_id,
        user_id,
        office_id
      ];
    }
    else {
      sql = `INSERT INTO bandi_fine_details (
        bandi_id, amount_fixed,
        created_by, updated_by, current_office_id
      ) VALUES (?)`;
      values = [
        bandi_id,
        isFixed,
        user_id,
        user_id,
        office_id
      ];
    }

    // await queryAsync( sql, [values] );
    const [result] = await connection.query( sql, [values] );
  }
}

async function insertSingleFineDetails( bandi_id, data, user_id, office_id, connection ) {
  console.log( data );
  let sql, values;

  const isFixed = Number( data.amount_fixed ) === 1;
  const isPaid = Number( data.amount_deposited ) === 1;

  let depositAmount = data.deposit_amount;
  if (
    depositAmount === undefined ||
    depositAmount === null ||
    depositAmount.toString().trim() === '' ||
    isNaN( Number( depositAmount ) )
  ) {
    depositAmount = 0;
  } else {
    depositAmount = Number( depositAmount );
  }
  if ( isFixed && isPaid ) {
    sql = `INSERT INTO bandi_fine_details (
        bandi_id, fine_type_id, amount_fixed, amount_deposited,
        deposit_office, deposit_district, deposit_ch_no,
        deposit_date, deposit_amount,
        created_by, updated_by, current_office_id
      ) VALUES (?)`;

    values = [
      bandi_id,
      data.fine_type_id,
      data.amount_fixed,
      data.amount_deposited,
      data.deposit_office,
      data.deposit_district,
      data.deposit_ch_no,
      data.deposit_date,
      depositAmount,
      user_id,
      user_id,
      office_id
    ];
    console.log( values );
  } else if ( isFixed ) {
    sql = `INSERT INTO bandi_fine_details(
      bandi_id, fine_type_id, amount_fixed, amount_deposited, deposit_amount,
      created_by, updated_by, current_office_id) VALUES(?)`;
    values = [
      bandi_id,
      data.fine_type_id,
      data.amount_fixed,
      data.amount_deposited,
      depositAmount,
      user_id,
      user_id,
      office_id
    ];
  }
  else {
    sql = `INSERT INTO bandi_fine_details (
        bandi_id, fine_type_id,  amount_fixed,
        created_by, updated_by, current_office_id
      ) VALUES (?)`;
    values = [
      bandi_id,
      data.fine_type_id,
      data.amount_fixed,
      user_id,
      user_id,
      office_id
    ];
  }

  // await queryAsync( sql, [values] );
  const [result] = await connection.query( sql, [values] );
}

async function insertPunarabedan( bandi_id, data, connection ) {
  if ( !data.punarabedan_office_id && !data.punarabedan_office_district ) return;
  const values = [
    bandi_id, data.punarabedan_office_id, data.punarabedan_office_district,
    data.punarabedan_office_ch_no, data.punarabedan_office_date
  ];
  const sql = `INSERT INTO bandi_punarabedan_details (...) VALUES (?)`;
  // await queryAsync( sql, [values] );
  const [result] = await connection.query( sql, [values] );
}


async function insertFamily( bandi_id, family = [], user_id, office_id, connection ) {
  if ( !family.length ) return;

  // Filter out family members where relation_id is undefined or blank
  const validFamily = family.filter( f => f.bandi_relative_relation !== undefined && f.bandi_relative_relation !== '' );

  // If after filtering, there are no valid family members, don't insert anything
  if ( !validFamily.length ) return;

  const values = validFamily.map( f => [
    bandi_id,
    f.bandi_relative_name,
    f.bandi_relative_relation,
    f.bandi_relative_address,
    f.bandi_relative_dob,
    f.is_dependent,
    f.bandi_relative_contact_no,
    user_id,
    user_id,
    office_id
  ] );

  const sql = `INSERT INTO bandi_relative_info (
    bandi_id, relative_name, relation_id, relative_address, dob, is_dependent, contact_no,
    created_by, updated_by, current_office_id
  ) VALUES ?`;

  // await queryAsync( sql, [values] );
  const [result] = await connection.query( sql, [values] );
}

async function insertContacts( bandi_id, contacts = [], user_id, office_id, connection ) {
  try {
    if ( !contacts.length ) {
      console.warn( "⚠️ No contacts provided to insert." );
      return 0;
    }

    const filteredContacts = contacts.filter( c =>
      ( typeof c.relation_id === 'string' && c.relation_id.trim() !== '' ) ||
      ( typeof c.relation_id === 'number' && !isNaN( c.relation_id ) )
    );

    if ( !filteredContacts.length ) {
      console.warn( "⚠️ All contacts filtered out. Possibly missing 'relation_id'." );
      console.log( "🔍 Received contacts:", contacts );
      return 0;
    }

    const values = filteredContacts.map( c => [
      bandi_id,
      c.relation_id,
      c.contact_name,
      c.contact_address,
      c.contact_contact_details,
      user_id,
      user_id,
      office_id
    ] );

    const sql = `INSERT INTO bandi_contact_person (
      bandi_id, relation_id, contact_name, contact_address,
      contact_contact_details, created_by, updated_by, current_office_id
    ) VALUES ?`;

    // const result = await queryAsync( sql, [values] );
    const [result] = await connection.query( sql, [values] );
    console.log( "✅ Insert result:", result );
    return result.affectedRows || 0;

  } catch ( err ) {
    console.error( "❌ SQL/Insert error:", err ); // <-- logs real SQL or DB issues
    throw err;
  }
}

async function updateContactPerson( contactId, contact, user_id, office_id, connection ) {
  if (
    !contact.contact_name ||
    !contact.contact_address ||
    !contact.contact_contact_details ||
    !contact.relation_id
  ) {
    console.warn( "⚠️ Missing required contact fields:", contact );
    return 0;
  }

  const sql = `
    UPDATE bandi_contact_person
    SET
      relation_id = ?,
      contact_name = ?,
      contact_address = ?,
      contact_contact_details = ?,
      updated_by = ?,
      current_office_id = ?
    WHERE id = ?
  `;

  const values = [
    contact.relation_id,
    contact.contact_name,
    contact.contact_address,
    contact.contact_contact_details,
    user_id,
    office_id,
    contactId
  ];

  try {
    // const result = await queryAsync( sql, values );
    const [result] = await connection.query( sql, values );
    console.log( "✅ Update result:", result );
    return result.affectedRows || 0;
  } catch ( error ) {
    console.error( "❌ SQL Update Error:", error );
    throw error;
  }
}

async function insertDiseasesDetails( bandi_id, diseases = [], user_id, office_id, connection ) {
  try {
    if ( !diseases.length ) {
      console.warn( "⚠️ No diseases provided to insert." );
      return 0;
    }

    const filteredDiseases = diseases.filter( c =>
      ( typeof c.disease_id === 'string' && c.disease_id.trim() !== '' ) ||
      ( typeof c.disease_id === 'number' && !isNaN( c.disease_id ) )
    );

    if ( !filteredDiseases.length ) {
      console.warn( "⚠️ All contacts filtered out. Possibly missing 'disease_id'." );
      console.log( "🔍 Received contacts:", diseases );
      return 0;
    }

    const values = filteredDiseases.map( c => [
      bandi_id,
      c.disease_id,
      c.disease_name,
      user_id,
      user_id,
      office_id
    ] );

    const sql = `INSERT INTO bandi_diseases_details(bandi_id, disease_id, disease_name, 
    created_by, updated_by, created_office_id) VALUES ?`;

    // const result = await queryAsync( sql, [values] );
    const [result] = await connection.query( sql, [values] );
    console.log( "✅ Insert result:", result );
    return result.affectedRows || 0;

  } catch ( err ) {
    console.error( "❌ SQL/Insert error:", err ); // <-- logs real SQL or DB issues
    throw err;
  }
}

async function updateDiseasesDetails( diseasesId, diseases, user_id, office_id, connection ) {

  if (
    !diseasesId ||
    !diseases.disease_id
  ) {
    console.warn( "⚠️ Missing required diseases fields:", diseasesId, diseases );
    return 0;
  }

  const sql = `
    UPDATE bandi_diseases_details
    SET
      disease_id = ?,
      disease_name = ?,      
      updated_by = ?,
      created_office_id = ?
    WHERE id = ?
  `;

  const values = [
    diseases.disease_id,
    diseases.disease_name,
    user_id,
    office_id,
    diseasesId
  ];

  try {
    // const result = await queryAsync( sql, values );
    const [result] = await connection.query( sql, values );
    console.log( "✅ Update result:", result );
    return result.affectedRows || 0;
  } catch ( error ) {
    console.error( "❌ SQL Update Error:", error );
    throw error;
  }
}

async function insertDisablilityDetails1( bandi_id, disabilities = [], user_id, office_id ) {

  for ( const disability of disabilities ) {
    if ( Number( disability.is_disabled ) === 1 ) {
      const sql = `INSERT INTO bandi_disability_details(
      bandi_id, disability_id, disability_name, created_by, updated_by, created_office_id) VALUES (?)`;
      const values = [
        bandi_id,
        disability.disability_id || 0,
        disability.disability_name?.trim() || null,
        user_id, user_id, office_id
      ];
      await queryAsync( sql, [values] );
    }
  }
}

async function insertDisablilityDetails( bandi_id, disabilities = [], user_id, office_id, connection ) {
  try {
    if ( !disabilities.length ) {
      console.warn( "⚠️ No disabilities provided to insert." );
      return 0;
    }

    const filteredDisabilities = disabilities.filter( c =>
      ( typeof c.disability_id === 'string' && c.disability_id.trim() !== '' ) ||
      ( typeof c.disability_id === 'number' && !isNaN( c.disability_id ) )
    );

    console.log( 'filteredDiabities', filteredDisabilities );

    if ( !filteredDisabilities.length ) {
      console.warn( "⚠️ No disabilities marked as disabled (is_disabled !== 1)." );
      console.log( "🔍 Received disabilities:", disabilities );
      return 0;
    }

    const values = filteredDisabilities.map( d => [
      bandi_id,
      d.disability_id || 0,
      d.disability_name?.trim() || null,
      user_id,
      user_id,
      office_id,
    ] );

    const sql = `INSERT INTO bandi_disability_details (
      bandi_id, disability_id, disability_name, created_by, updated_by, created_office_id
    ) VALUES ?`;

    // const result = await queryAsync( sql, [values] );
    const [result] = await connection.query( sql, [values] );
    // console.log( "✅ Disabilities insert result:", result );
    console.log( "✅ Disabilities inserted" );

    return result.affectedRows || 0;

  } catch ( err ) {
    console.error( "❌ Disability insert error:", err );
    throw err;
  }
}


async function updateDisabilities( disabilityId, disability, user_id, office_id, connection ) {
  console.log( disability );
  if (
    !disabilityId ||
    !disability.disability_id
  ) {
    console.warn( "⚠️ Missing required disability fields:", disabilityId, disability );
    return 0;
  }

  const sql = `
    UPDATE bandi_disability_details
    SET
      disability_id = ?,
      disability_name = ?,      
      updated_by = ?,
      created_office_id = ?
    WHERE id = ?
  `;

  const values = [
    disability.disability_id,
    disability.disability_name,
    user_id,
    office_id,
    disabilityId
  ];

  try {
    // const result = await queryAsync( sql, values );
    const [result] = await connection.query( sql, values );
    console.log( "✅ Update result:", result );
    return result.affectedRows || 0;
  } catch ( error ) {
    console.error( "❌ SQL Update Error:", error );
    throw error;
  }
}

async function insertHealthInsurance( bandi_id, health_insurance = [], user_id, office_id, connection ) {
  if ( !health_insurance.length ) return;
  const values = health_insurance.map( c => [
    bandi_id, c.is_active, c.insurance_from, c.insurance_to, user_id, office_id
  ] );
  const sql = `INSERT INTO bandi_health_insurance (
    bandi_id, is_active, insurance_from, insurance_to,
    created_by, current_office_id
  ) VALUES ?`;
  // await queryAsync( sql, [values] );
  const [result] = await connection.query( sql, [values] );
}

async function insertTransferDetails( bandi_id, data = [],status_id, user_id, active_office, connection ) {
  if ( !data.length ) return 0;

  const values = data.map( item => [
    bandi_id,
    item.transfer_from_office_id,
    item.transfer_to_office_id,
    item.transfer_from_date,
    item.transfer_to_date,
    item.transfer_reason_id,
    item.transfer_reason,
    status_id,
    item.remarks,
    user_id,
    user_id,
    new Date(),
    new Date(),
    active_office
  ] );

  const sql = `
    INSERT INTO bandi_transfer_history (
      bandi_id, transfer_from_office_id, final_to_office_id,
      transfer_from_date, transfer_to_date,
      transfer_reason_id, transfer_reason, status_id, remarks,
      created_by, updated_by, created_at, updated_at, created_office_id
    ) VALUES ?
  `;

  const [result] = await connection.query( sql, [values] );
  return result.affectedRows || 0; // Always return a number
}

async function insertTransferRequest( bandi_id, data = [], user_id, active_office, connection ) {
  if ( !data.length ) return 0;
  console.log(data)
  const values = data.map( item => [
    bandi_id,
    item.transfer_from_office_id,
    item.transfer_to_office_id,
    item.transfer_from_date,
    item.transfer_to_date,
    item.transfer_reason_id,
    item.transfer_reason,
    item.remarks,
    user_id,
    user_id,
    new Date(),
    new Date(),
    active_office
  ] );

  const sql = `
    INSERT INTO bandi_transfer_history (
      bandi_id, transfer_from_office_id, transfer_to_office_id,
      transfer_from_date, transfer_to_date,
      transfer_reason_id, transfer_reason, remarks,
      created_by, updated_by, created_at, updated_at, created_office_id
    ) VALUES ?
  `;

  const [result] = await connection.query( sql, [values] );
  return result.affectedRows || 0; // Always return a number
}

async function updateTransferDetails(transfer_id, data, user_id, active_office, connection) {
  const sql = `
    UPDATE bandi_transfer_history
    SET 
      transfer_from_office_id = ?,
      transfer_to_office_id = ?,
      transfer_from_date = ?,
      transfer_to_date = ?,
      transfer_reason_id = ?,
      transfer_reason = ?,
      remarks = ?,
      updated_by = ?,
      updated_at = ?,
      created_office_id = ?
    WHERE id = ?
  `;

  const values = [
    data.transfer_from_office_id,
    data.transfer_to_office_id,
    data.transfer_from_date,
    data.transfer_to_date,
    data.transfer_reason_id,
    data.transfer_reason,
    data.remarks,
    user_id,
    new Date(),
    active_office,
    transfer_id,
  ];

  const [result] = await connection.query(sql, values);
  return result.affectedRows || 0;
}


export {
  insertBandiPerson,
  insertKaidDetails,
  insertCardDetails,
  insertAddress,
  insertMuddaDetails,
  insertFineDetails,
  insertSingleFineDetails,
  insertPunarabedan,
  insertFamily,
  insertContacts,
  updateContactPerson,
  insertDiseasesDetails,
  updateDiseasesDetails,
  insertDisablilityDetails,
  updateDisabilities,
  insertHealthInsurance,
  insertTransferDetails,
  insertTransferRequest,
  updateTransferDetails
};