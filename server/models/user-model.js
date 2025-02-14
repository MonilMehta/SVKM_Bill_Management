import connection from '../db/connect-db.js';

const User = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS USERS(
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(500),
            email VARCHAR(500) UNIQUE,
            contact_number VARCHAR(13),
            sap_id VARCHAR(500),
            username VARCHAR(500) UNIQUE,
            password VARCHAR(500)
        );
    `;
    
    await connection.query(query);
    console.log('Users table created');
}

export default User
