import express from "express";
import { AuthRequest, verifyToken } from "./authMiddleware";
import pool from "../db";
import { RowDataPacket } from "mysql2";

const router = express.Router();

router.get(
  "/chat",
  verifyToken,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const myId = req.user.id;
      const data: any = [];

      const [chats]: any = await pool.execute(
        "SELECT * FROM chat WHERE user1_id = ? or user2_id = ?",
        [myId, myId],
      );

      if (chats.length === 0) {
        return res.status(200).send([]);
      }

      for (const chat of chats) {
        const id = chat.id;
        const [msgs]: any = await pool.execute<RowDataPacket[]>(
          "SELECT * FROM message WHERE chat_id = ? ORDER by sent_at DESC LIMIT 1",
          [id],
        );

        const [users]: any = await pool.execute(
          "SELECT * FROM user WHERE id = ?",
          [chat.user1_id == myId ? chat.user2_id : chat.user1_id],
        );

        const otherUser = users[0];

        const [userImgs]: any = await pool.execute(
          "SELECT * FROM user_img WHERE user_id = ? ",
          [otherUser.id],
        );

        const latestMsg = msgs.length > 0 ? msgs[0] : null;
        const profilePic = userImgs.length > 0 ? userImgs[0].profile_pic : null;
        if (latestMsg) {
          data.push({
            chat_id: id,
            message: {
              msg: latestMsg.message,
              sent_at: latestMsg.sent_at,
            },
            user: {
              id: otherUser.id,
              fname: otherUser.fname,
              lname: otherUser.lname,
              mobile: otherUser.mobile,
            },
            userImg: {
              profile_pic: profilePic,
            },
          });
        }
      }

        return res.status(200).send(data);      
    } catch (err) {
      return res.status(400).send("Internal Server Error");
    }
  },
);

export default router;
