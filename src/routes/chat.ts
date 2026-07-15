import express from "express";
import { AuthRequest, verifyToken } from "./authMiddleware";
import pool from "../db";
import { RowDataPacket } from "mysql2";

const router = express.Router();

router.get(
  "/get-chat",
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

      data.sort((a: any, b: any) => {
        const dateA = new Date(a.message.sent_at).getTime();
        const dateB = new Date(b.message.sent_at).getTime();
        return dateB - dateA;
      });

        return res.status(200).send(data);      
    } catch (err) {
      return res.status(400).send({msg : "Internal Server Error"});
    }
  },
);

router.get("/getUser-img", verifyToken,
  async (req: AuthRequest, res): Promise<any> => {
    try{
      const myId = req.user.id;
      const [userImg]:any = await pool.execute("SELECT * FROM user_img WHERE user_id = ? ",
      [myId]
      );
      return res.status(200).send(userImg);
    }catch(err){
      return res.status(400).send({msg : "Internal Server Error"});
    }
  }
)

router.get("/search-contact", verifyToken,
  async (req: AuthRequest, res): Promise<any> => {
     try{
       const mobile:string = req.query.mobile as string;
       const Data:any = [];
       const [contacts]:any = await pool.execute("SELECT id,fname,lname,mobile FROM user WHERE mobile = ?",
       [mobile]
       );
       for(const contact of contacts){
        const id = contact.id;
         const [userImg]:any = await pool.execute("SELECT * FROM user_img WHERE user_id = ?",
          [id]);
          Data.push({
            user: {
              id: contact.id,
              fname: contact.fname,
              lname: contact.lname,
              mobile: contact.mobile,
            },
            userImg: {
              profile_pic: userImg[0]?.profile_pic || null,
            }
          });
       }
       return res.status(200).send(Data);
     }catch(err){
      return res.status(400).send({msg : "Internal Server Error"});
     }
  }
);

router.get("/load-chat", verifyToken, async (req: AuthRequest, res): Promise<any> => {
  const id = req.query.id;
  const myId = req.user.id;

  const [chats]: any = await pool.execute(
    "SELECT * FROM chat WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)",
    [myId, id, id, myId]
  );

  if (chats.length === 0) {
    return res.status(200).send([]);
  }

  const chatId = chats[0].id;

  const [messages]: any = await pool.execute(
    "SELECT * FROM message WHERE chat_id = ? ORDER BY sent_at DESC",
    [chatId]
  );

  res.status(200).send({ msg: messages, chatId: chatId });
});

export default router;
