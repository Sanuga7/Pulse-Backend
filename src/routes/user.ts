import express from "express";
import pool from "../db";
import bcrypt from "bcrypt";


const router = express.Router();

interface User{
    fname: string,
    lname: string,
    mobile: string,
    password: string
}

router.post("/signUp", async (req, res): Promise<any> => {
    try{

        const Data = req.body as User;

        if(!Data.fname || !Data.lname || !Data.mobile || !Data.password){
            return res.status(400).send({msg: "Empty Fields"});
        }

        const userCheck = await pool.execute("SELECT COUNT(*) FROM user WHERE mobile = ?", [Data.mobile]);
        console.log(userCheck);

        if(userCheck.length > 0)
            return res.status(401).send({msg: "User Mobile Already Exist"});

        const saltRounds = 10;
        const hashedPwd = await bcrypt.hash(Data.password, saltRounds);

        await pool.execute("INSERT INTO user (fname,lname,mobile,password,created_at) VALUES (?,?,?,?,NOW())",
            [Data.fname, Data.lname, Data.mobile, hashedPwd,]
        );

        res.status(200).send({msg: "User Successfully Registered"});

    }catch(err){
        res.status(500).send({msg: "Something Went Wrong "+ err});
        console.log(err);
    }
});

export default router;