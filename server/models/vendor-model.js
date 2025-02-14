import connection from '../db/connect-db.js';

const Vendor = async () => {
    const query = `
            CREATE TABLE IF NOT EXISTS VENDORS(
            vendor_id INT PRIMARY KEY AUTO_INCREMENT,
            vendor_name VARCHAR(500),
            tan VARCHAR(500),
            pan VARCHAR(500),
            compliance_id INT,
            email VARCHAR(500),
            FOREIGN KEY (compliance_id) REFERENCES COMPLIANCE_MASTER(compliance_id)
        );
    `;
    
    await connection.query(query);
    console.log('Vendors table created');
}

export default Vendor