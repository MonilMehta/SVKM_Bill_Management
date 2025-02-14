import connection from '../db/connect-db.js';

const ComplianceMaster = async () => {
    const query = `
            CREATE TABLE IF NOT EXISTS COMPLIANCE_MASTER(
            compliance_id INT PRIMARY KEY AUTO_INCREMENT,
            compliance_status VARCHAR(255)
        );
    `;
    
    await connection.query(query);
    console.log('Compliance Master table created');
}

export default ComplianceMaster