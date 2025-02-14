import connection from '../db/connect-db.js';

const NatureMaster = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS NATURE_MASTER (
            NATURE_ID INT AUTO_INCREMENT PRIMARY KEY,
            NATURE_NAME VARCHAR(500)
        );
    `;
    
    await connection.query(query);
    console.log('Nature Master table created');
}

export default NatureMaster