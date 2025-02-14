import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: 'aditSequel#23',
    database: process.env.SQL_DATABASE
});

connection.connect(function (err){
    if(err){
        console.log('Error connecting to database'+err);
    }
    else{
        console.log('Database connection established');
    }
});

export default connection;
