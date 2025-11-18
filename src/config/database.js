const mysql = require('mysql2/promise');
const { db } = require('./config');
const logger = require('./logger');

const pool = mysql.createPool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(conn => {
    logger.info('MySQL conectado correctamente');
    conn.release();
  })
  .catch(err => {
    logger.error('Error conectando a MySQL:', err);
  });

module.exports = pool;
