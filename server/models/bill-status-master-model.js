import connection from '../db/connect-db.js';

const BillStatusMaster = async () => {
    const query = `
            CREATE TABLE IF NOT EXISTS BILL_STATUS_MASTER(
            StatusID INT PRIMARY KEY AUTO_INCREMENT,
            StatusName VARCHAR(255)
        );
    `;
    
    await connection.query(query);
    console.log('Bill Status Master table created');
}

export default BillStatusMaster

