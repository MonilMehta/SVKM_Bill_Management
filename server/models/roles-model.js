import connection from '../db/connect-db.js';

const Role = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS ROLES(
            role_id INT AUTO_INCREMENT PRIMARY KEY,
            role_name VARCHAR(500)
        );
    `;
    
    await connection.query(query);
    console.log('Roles table created');
}

export default Role