import { Request, Response, NextFunction } from "express"
import dotenv from "dotenv"
import jwt from "jsonwebtoken";

dotenv.config();

export interface AuthRequest extends Request{
    user? :any
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction)=>{
     try{

        const authHeader = req.header("Authorization");

        if(!authHeader){
            return res.status(401).send({msg: "Acccess Denied"});
        }

        const token:any = authHeader?.split(" ")[1];

        if(!token){
            return res.status(401).send({msg: "Acccess Denied"});
        }

        const SecretKey = process.env.JWT_Secret || "secretJWTKey";

        const verifiedUser = jwt.verify(token, SecretKey);

        req.user = verifiedUser;

        next();

     }catch(err){
        return res.status(403).send({msg: "Invalid or Expired Token"});
     }
};