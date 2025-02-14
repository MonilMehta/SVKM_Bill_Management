import connection from '../db/connect-db.js';

const Region = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS REGIONS(
            region_id INT AUTO_INCREMENT PRIMARY KEY,
            region_name VARCHAR(500) UNIQUE
        );
    `;
    
    await connection.query(query);
    console.log('Regions table created');
}

export default Region
