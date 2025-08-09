import pool from '../utils/db3.js';

async function insertTransferDetails( bandi_id, transfer_details = [], role_id,InitialStatus, user_id, active_office, connection ) {
    // console.log(transfer_details)
    const values = transfer_details.map( item => [
        bandi_id,
        item.transfer_reason_id,
        item.transfer_reason,
        item.recommended_to_office_id,
        item.is_thunuwa_permission,
        role_id,
        InitialStatus,
        user_id,
        user_id,
        new Date(),
        new Date(),
        active_office
    ] );

    try {
        if ( !transfer_details.length ) {
            console.warn( "⚠️ No contacts provided to insert." );
            return 0;
        }
        const filteredData = transfer_details.filter( c =>
            ( typeof c.transfer_reason_id === 'string' && c.transfer_reason_id.trim() !== '' ) ||
            ( typeof c.recommended_to_office_id === 'number' && !isNaN( c.recommended_to_office_id ) )
        );
        if ( !filteredData.length ) {
            console.warn( "⚠️ All contacts filtered out. Possibly missing 'relation_id'." );
            console.log( "🔍 Received contacts:", transfer_details );
            return 0;
        }

        const sql = `INSERT INTO bandi_transfer_history (
                bandi_id, transfer_reason_id, transfer_reason, recommended_to_office_id,
                is_thunuwa_permission,role_id, status_id,
                created_by, updated_by, created_at, updated_at, created_office_id
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

async function insertFinalTransferDetails( data, InitialStatus, user_id, active_office, connection ) {
    // console.log(data)
    const values = [
        data.bandi_id,
        active_office,  data.proposed_karagar_office,     
        data.decision_date, data.apply_date,
        // data.nirnay_officer,
        data.reason_id,
        data.reason_details,
        InitialStatus,
        data.remarks,
        user_id,
        user_id,
        new Date(),
        new Date(),
        active_office
    ] ;

    try {
        if ( !data.bandi_id || !data.proposed_karagar_office || !data.reason_id ) {
            console.warn( "⚠️ No data provided to insert.",data );
            return 0;
        }        
        const sql = `INSERT INTO bandi_transfer_history (
                bandi_id,
                transfer_from_office_id, recommended_to_office_id, 
                decision_date, transfer_from_date,
                transfer_reason_id, transfer_reason, 
                status_id, remarks,
                created_by, updated_by, created_at, updated_at, created_office_id
                ) VALUES (?)`;
        // const result = await queryAsync( sql, [values] );
        const [result] = await connection.query( sql, [values] );
        console.log( "✅ Insert result:", result );
        return result.affectedRows || 0;
    } catch ( err ) {
        console.error( "❌ SQL/Insert error:", err ); // <-- logs real SQL or DB issues
        throw err;
    }
}

async function getAllowedStatusesForRole(role_id) {
    
}
export {
    insertTransferDetails,
    insertFinalTransferDetails,

    getAllowedStatusesForRole
};