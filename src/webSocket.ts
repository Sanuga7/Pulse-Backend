import { Server } from "http";
import { RawData, WebSocketServer } from "ws";
import pool from "./db";
import jwt from "jsonwebtoken";

export function startWebSocket(server: Server) {
    const userConnections = new Map();
    const wsServer = new WebSocketServer({ server });

    wsServer.on("connection", (ws: any, req: any) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get("token");

        if (!token) {
            ws.close(1008);
            return;
        }

        try {
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
            ws.userId = String(decoded.id);
            userConnections.set(ws.userId, ws);
        } catch (err) {
            ws.close(1008);
            return;
        }

        ws.on("message", async (data: RawData) => {
            let msgData;

            try {
                msgData = JSON.parse(data.toString());
            } catch (error) {
                return;
            }

            if (msgData.type === "register") {
                const userId = String(msgData.data);
                userConnections.set(userId, ws);
                ws.userId = userId;
            } else if (msgData.type === "chat") {
                const { data: messageText, receiver, sender, chatId } = msgData;
                const receiverString = String(receiver);
                const receiverWs = userConnections.get(receiverString);
                let currentChatId = chatId;

                try {
                    if (!currentChatId) {
                        const [existingChats]: any = await pool.execute(
                            "SELECT id FROM chat WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)",
                            [sender, receiver, receiver, sender]
                        );

                        if (existingChats.length > 0) {
                            currentChatId = existingChats[0].id;
                        } else {
                            const [newChat]: any = await pool.execute(
                                "INSERT INTO chat (user1_id, user2_id) VALUES (?, ?)",
                                [sender, receiver]
                            );
                            currentChatId = newChat.insertId;
                        }
                    }

                    await pool.execute(
                        "INSERT INTO message (message, sent_at, sender_id, message_status_id, chat_id) VALUES (?,?,?,?,?)",
                        [messageText, new Date(), sender, 1, currentChatId]
                    );
                } catch (error) {
                    console.log(error);
                    return;
                }

                if (receiverWs) {
                    const outgoingMsg = {
                        message: messageText,
                        sent_at: new Date().toISOString(),
                        sender_id: sender,
                        chatId: currentChatId
                    };
                    receiverWs.send(JSON.stringify(outgoingMsg));
                }
            }
        });

        ws.on("close", () => {
            if (ws.userId) {
                userConnections.delete(ws.userId);
            }
        });
    });
}