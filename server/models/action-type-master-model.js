import connection from '../db/connect-db.js';

const ActionType = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS ACTION_TYPE_MASTER(
            action_type_id INT AUTO_INCREMENT PRIMARY KEY ,
            action_type VARCHAR(255)
        );
    `;
    
    await connection.query(query);
    console.log('Action Type table created');
}

export default ActionType
