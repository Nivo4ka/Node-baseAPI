const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User } = require("../models/models");
require("dotenv").config();

const generateJwt = (id, email) => {
  return jwt.sign({ id, email }, process.env.SECRET_KEY, { expiresIn: "24h" });
};

const parseJwt = (token) => {
  return jwt.verify(token, process.env.SECRET_KEY);
};

const comparePasswors = (possible, hashPassword) => {
  const hash = crypto
    .pbkdf2Sync(possible, process.env.SECRET_KEY, 100000, 64, `sha512`)
    .toString(`hex`);
  return hash === hashPassword;
};

class UserController {
  async registration(req, res, next) {
    const { fullName, email, password, birthDay } = req.body;

    if (!email || !password || !fullName || !birthDay) {
      return next(
        res.status(404).send({
          message: "Некорректный email, password, birthDay или fullName",
        })
      );
    }

    const dateBirth = Date.parse(birthDay);

    if (!dateBirth) {
      return next(res.status(404).send({ message: "Некорректная birthDay" }));
    }
    const candidate = await User.findOne({ where: { email } });

    if (candidate) {
      return next(
        res.status(404).send({
          message: "Пользователь с таким email уже существует",
        })
      );
    }
    const hashPassword = crypto
      .pbkdf2Sync(password, process.env.SECRET_KEY, 100000, 64, `sha512`)
      .toString(`hex`);
    const user = await User.create({
      fullName,
      password: hashPassword,
      email,
      birthDay: dateBirth,
    });
    const token = generateJwt(user.id, user.email);
    return res.json({ token });
  }

  async login(req, res, next) {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return next(res.status(500).send({ message: "Пользователь не найден" }));
    }
    let comparePassword = comparePasswors(password, user.password);
    if (!comparePassword) {
      return next(res.status(500).send({ message: "Указан неверный пароль" }));
    }
    const token = generateJwt(user.id, user.email);
    return res.json({ token });
  }

  async check(req, res, next) {
    try {
      const { headers } = req;
      if (headers && headers.token) {
        const { token } = headers;
        var decoded = parseJwt(headers.token);
        return res.json({ token });
      } else
        return next(
          res.status(500).send({ message: "Пользователь не авторизирован" })
        );
    } catch (err) {
      return next(res.status(500).send({ err }));
    }
  }

  async read(req, res, next) {
    const { headers } = req;
    if (headers && headers.token) {
      const { id, email } = parseJwt(headers.token);
      const user = await User.findOne({ where: [{ id }, { email }] });
      return next(res.send({ user }));
    } else
      return next(
        res.status(500).send({ message: "Пользователь не авторизирован" })
      );
  }

  async change(req, res, next) {
    const { headers, body } = req;
    const { fullName, birthDay } = body;
    if (headers && headers.token) {
      const { id, email } = parseJwt(headers.token);
      const user = await User.findOne({ where: [{ id }, { email }] });
      if (fullName) user.fullName = fullName;

      if (birthDay) {
        const dateBirth = Date.parse(birthDay);
        if (!dateBirth) {
          return next(
            res.status(404).send({ message: "Некорректная birthDay" })
          );
        }
        user.birthDay = dateBirth;
      }
      await user.save();
      return next(res.send({ user }));
    } else
      return next(
        res.status(500).send({ message: "Пользователь не авторизирован" })
      );
  }

  async delete(req, res, next) {
    const { headers } = req;
    if (headers && headers.token) {
      const { id, email } = parseJwt(headers.token);
      const user = await User.findOne({ where: [{ id }, { email }] });
      await user.destroy();
      return next(res.send({ user: "deleted" }));
    } else
      return next(
        res.status(500).send({ message: "Пользователь не авторизирован" })
      );
  }
}

module.exports = new UserController();
