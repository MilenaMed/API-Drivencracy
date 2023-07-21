import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
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
const pollSchema = joi.object({
    title: joi.string().required(),
    expireAt: joi.string()
})

const choiceSchema = joi.object({
    title: joi.string().required(),
    pollId: joi.string().required(),
})

//POST-poll
app.post("/poll", async (request, response) => {
    const poll = request.body

    console.log(request.body)

    const validation = pollSchema.validate(request.body)
    if (validation.error) {
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

//GET- poll
app.get("/poll", async (request, response) => {

    try {
        const polls = await db.collection("poll").find().toArray()
        response.status(200).send(polls)
    } catch (err) {
        return response.status(500).send(err.message)
    }
})

//POST - choice
app.post("/choice", async (request, response) => {
    const choice = request.body
    const poll = await db.collection("poll").findOne({ _id: new ObjectId(choice.pollId) });
    const choiceMaked = await db.collection("choice").findOne({ title: choice.title });
    const isExpired = dayjs().isAfter(dayjs(poll.expireAt));

    try {
        const validationChoice = choiceSchema.validate(request.body)
        if (validationChoice.error) {
            return response.status(422).send("All fields are required")
        }

        if (!poll) {
            return response.status(404).send("This poll does not exist");
        } else if (choiceMaked) {
            return response.status(409).send("Repeated choice");
        } else if (isExpired) {
            return response.status(403).send("Poll ended");
        } else {
            await db.collection("choice").insertOne(choice);
            console.log(choice)
            return response.status(201).send("Choice registered");
        }

    } catch (err) {
        return response.status(500).send(err.message);
    }
});

//GET - Choice
app.get("/poll/:id/choice", async (request, response) => {
    const pollId = request.params.id
    try {
        const votes = await db.collection("choice").find({ pollId: pollId }).toArray()
        response.status(200).send(votes)
    } catch (err) {
        return response.status(500).send(err.message)
    }
})

//POST - Vote
app.post("/choice/:id/vote", async (request, response) => {

    const choiceMaked = await db.collection("choice").findOne({ pollId: request.params.id })
    const poll = await db.collection("poll").findOne({ _id: new ObjectId(request.params.id) });
    const isExpired = dayjs().isAfter(dayjs(poll.expireAt));


    try {
        if (!choiceMaked) {
            return response.status(404).send("This poll does not exist");
        }
        else if (isExpired) {
            return response.status(403).send("Poll ended");
        }

        const vote = {
            createdAt: dayjs().format("YYYY-MM-DD HH:MM"),
            choiceId: request.params.id
        }

        await db.collection("votes").insertOne(vote)
        console.log(vote)
        response.status(201).send("Vote registered")
    } catch (error) {
        return response.status(500).send(err.message)
    }
})

//Porta
const porta = 5000
app.listen(porta, () => console.log(`Servidor rodando na porta ${porta}`));