import express from "express";
import pool from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import { verifyToken } from "./authMiddleware";
import { verify } from "node:crypto";

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },

  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;

    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage });

router.post("/update",verifyToken, upload.single("image"), async (req: any, res: any) => {
  const { fname, lname, password, mobile } = req.body;
  const userId = req.user.id;
  try {
    let query = "UPDATE user SET fname = ?, lname = ?";
    const params: any[] = [fname, lname];

    if (password && password.trim() !== "") {
      const saltRounds = 10;
      const hashedPwd = await bcrypt.hash(password, saltRounds);
      query += ", password = ?";
      params.push(hashedPwd);
    }
    query += " WHERE id = ?";
    params.push(userId);
    await pool.query(query, params);

    if (req.file) {
      const imagepath = "/uploads/" + req.file.filename;
      
      const [existing]: any = await pool.query("SELECT * FROM user_img WHERE user_id = ?", [userId]);
      
      if (existing.length > 0) {
        await pool.query("UPDATE user_img SET profile_pic = ? WHERE user_id = ?", [imagepath, userId]);
      } else {
        await pool.query("INSERT INTO user_img (profile_pic, user_id) VALUES (?, ?)", [imagepath, userId]);
      }
    }

    res.status(200).send({ msg: "Profile updated successfully" });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).send({ msg: "Internal Server Error", error: err });
  }
});

router.post("/send-code", async(req, res): Promise<any> => {
   try{
    const {mobile} = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000);
    const code = String(otp);
   await pool.execute("UPDATE user SET reset_code = ? WHERE mobile = ?", [code, mobile]);
   res.status(200).send({msg: "Reset Code Sent" + code});
   }catch(err){
    console.error("Server Error:", err);
    res.status(500).send({ msg: "Internal Server Error", error: err });
   }
});

router.post("/check-code", async (req, res): Promise<any> => {
  try{
    const {mobile, code} = req.body;
    const [results]: any = await pool.execute("SELECT * FROM user WHERE mobile = ? AND reset_code = ?", [mobile, code]);
    if(results.length === 0){
      return res.status(403).send({msg: "Aceess denied Invalid reset code"});
    }
    res.status(200).send({msg: "Valid Code"});
  }catch(err){
    console.error("Server Error:", err);
    res.status(500).send({ msg: "Internal Server Error", error: err });
  }
});

router.post("/reset-password", async (req, res): Promise<any> => {
  try{
    const {mobile, password} = req.body;
    if (!password || password.trim() === "") {
      return res.status(403).send({ msg: "Password cannot be empty" });
    }
    console.log("Resetting password for:", mobile);
    const saltRounds = 10;
    const hashedPwd = await bcrypt.hash(password, saltRounds);
    
    pool.execute("UPDATE user SET password = ?, reset_code = NULL WHERE mobile = ?",
      [hashedPwd, mobile]
    );

    res.status(200).send({msg: "Password Changed Successfully"});

  }catch(err){
    console.error("Server Error:", err);
    res.status(500).send({ msg: "Internal Server Error", error: err });
  }
});

export default router;
