import connection from '../db/connect-db.js';

const BillWorkflow = async () => {
    const query = `
            CREATE TABLE IF NOT EXISTS BILL_WORKFLOW(
            workflow_id INT PRIMARY KEY AUTO_INCREMENT,
            bill_id INT,
            from_user_id INT,
            to_user_id INT,
            action_date DATE,
            action_type_id INT,
            remarks VARCHAR(500),
            foreign key (bill_id) references BILLS(bill_id),
            foreign key (from_user_id) references USERS(user_id),
            foreign key (to_user_id) references USERS(user_id),
            foreign key (action_type_id) references ACTION_TYPE_MASTER(action_type_id)
        );
    `;
    
    await connection.query(query);
    console.log('Bill Workflow table created');
}

export default BillWorkflow