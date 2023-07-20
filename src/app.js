import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from "joi";


const app = express();

//Ferramentas
app.use(cors())
app.use(express.json())
dotenv.config()

//Mongo
const mongoClient = new MongoClient(process.env.DATABASE_URL)
try {
    await mongoClient.connect()
    console.log("Conectou")
}
catch (err) {
    console.log(err.message)
}

const db = mongoClient.db()

//Joi
//const pollSchema = joi.object({
   // title: joi.string().required(),
//})

//POST-poll
app.post("/poll", async (request, response) => {
    const poll = request.body

    //const validation = pollSchema.validate(request.body)
    //if (validation.error) {
    //  return response.status(422).send("Title required")
    // }

    if (poll.title === "") {
        return response.status(422).send("Title required")
    }

    try {
        const pollSaved = {
            title: poll.title,
            expireAt: !poll.expireAt ? dayjs().add(30, "day").format(`YYYY/MM/DD HH:mm`) : poll.expireAt,
        }

        await db.collection("poll").insertOne(pollSaved)
        console.log(pollSaved)
        response.status(201).send("Poll registered")

    } catch (err) {
        response.status(500).send(err.message)
    }
})


//Porta
const porta = 5000
app.listen(porta, () => console.log(`Servidor rodando na porta ${porta}`));