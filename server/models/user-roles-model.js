import connection from '../db/connect-db.js';

const UserRole = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS USER_ROLES(
            USER_ID INT PRIMARY KEY,
            ROLE_ID INT,
            REGION_IND INT,
            foreign key (user_id) references USERS(user_id),
            foreign key (user_id) references ROLES(role_id),
            foreign key (user_id) references REGIONS(region_id)
        );
    `;
    
    await connection.query(query);
    console.log('User Roles table created');
}

export default UserRole