import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import user from "./routes/user";
import chat from "./routes/chat";
import http from "http";
import { startWebSocket } from "./webSocket";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.API_Port;

app.get("/", (req,res) => {
    res.send("Welcome to Pulse.");
});

app.use("/user", user);
app.use("/chat", chat);
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

const server = http.createServer(app);
startWebSocket(server);

server.listen(port, ()=> {
    console.log(`"API Running on http://localhost:${port}"`);
})