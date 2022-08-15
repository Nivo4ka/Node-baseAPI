const { Sequelize } = require("sequelize");
require("dotenv").config();

module.exports = new Sequelize(
  "baseAPI", // Название БД
  "root", // Пользователь
  "password", // ПАРОЛЬ
  {
    dialect: "postgres",
    host: "localhost",
    port: "5432",
  }
);
