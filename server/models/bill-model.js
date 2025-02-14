import connection from '../db/connect-db.js';

const Bill = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS BILLS (
            bill_id INT AUTO_INCREMENT PRIMARY KEY,
            bill_number VARCHAR(500),
            bill_date DATE,
            vendor_id INT,
            region_id INT,
            amount FLOAT,
            bill_image VARCHAR(500),
            status_id INT,
            current_handler_id INT,
            last_updated DATE,
            remarks VARCHAR(500),
            nature_id INT,
            project_description VARCHAR(500),
            po_created BOOLEAN,
            po_number VARCHAR(500),
            po_date DATE,
            invoice_number VARCHAR(500),
            invoice_date DATE,
            invoice_amount FLOAT,
            migo_number VARCHAR(500),
            migo_amount VARCHAR(500),
            migo_date DATE,
            miro_number VARCHAR(500),
            miro_amount FLOAT,
            miro_date DATE,
            payment_date DATE,
            foreign key (vendor_id) references Vendors(vendor_id),
            foreign key (region_id) references Regions(REGION_ID),
            foreign key (current_handler_id) references Users(user_id),
            foreign key (nature_id) references Nature_Master(nature_id)
        );
    `;
    
    await connection.query(query);
    console.log('Bill table created');
}

export default Bill