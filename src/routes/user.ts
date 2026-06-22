import express from "express";
import pool from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

interface User {
  fname: string;
  lname: string;
  mobile: string;
  password: string;
}

router.post("/signUp", async (req, res): Promise<any> => {
  try {
    const Data = req.body as User;

    if (
      Data.fname == "" ||
      Data.lname == "" ||
      Data.mobile == "" ||
      Data.password == ""
    ) {
      return res.status(400).send({ msg: "Empty Fields" });
    }

    const [userCheck]: any = await pool.execute(
      "SELECT * FROM user WHERE mobile = ?",
      [Data.mobile],
    );
    console.log(userCheck);

    if (userCheck.length > 0)
      return res.status(401).send({ msg: "User Mobile Already Exist" });

    const saltRounds = 10;
    const hashedPwd = await bcrypt.hash(Data.password, saltRounds);

    await pool.execute(
      "INSERT INTO user (fname,lname,mobile,password,created_at) VALUES (?,?,?,?,NOW())",
      [Data.fname, Data.lname, Data.mobile, hashedPwd],
    );

    res.status(200).send({ msg: "User Successfully Registered" });
  } catch (err) {
    res.status(500).send({ msg: "Internal Server Error " + err });
    console.log(err);
  }
});

router.post("/signIn", async (req, res): Promise<any> => {
  try {
    const { mobile, password } = req.body;

    if (mobile == "" || password == "") {
      return res.status(400).send({ msg: "Empty Fields" });
    }

    const [Data]: any = await pool.execute(
      "SELECT * FROM user WHERE mobile = ?",
      [mobile],
    );

    if (Data.length === 0) {
      return res.status(401).send({ msg: "Invalid Mobile Or Password" });
    }

    const user = Data[0];

    const checkHash = await bcrypt.compare(password, user.password);

    if (!checkHash)
      return res.status(401).send({ msg: "Invalid Mobile Or Password" });

    const secretJwt = process.env.JWT_Secret || "JWTSecretKey";
    const token = jwt.sign(
      {
        id: user.id,
        mobile: user.mobile,
        fname: user.fname,
      },
      secretJwt,
      { expiresIn: "7d" },
    );

    res.status(200).send({
      msg: "User Logged In",
      token: token,
      user: {
        id: user.id,
        fname: user.fname,
        lname: user.lname,
        mobile: user.mobile,
      },
    });

  } catch (err) {
    res.status(500).send({ msg: "Internal Server Error " + err });
    console.log(err);
  }
});

export default router;
