module.exports = {
  HOST: process.env.DB_HOST || "localhost",
  PORT: parseInt(process.env.DB_PORT) || 27017,
  DB: process.env.DB_NAME || "bezkoder_db"
};
