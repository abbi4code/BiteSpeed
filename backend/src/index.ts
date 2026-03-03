import "dotenv/config"
import express from "express"
import { findOrCreateContact } from "./identifyContact";


const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.post("/identify", async(req,res) => {
    try {
        let {email, phoneNumber} = req.body;


        if(!email && !phoneNumber){
            res.status(400).json({
                error: "Provide atleast one either phoneNumber or email"
            })
            return 
        }

        if(typeof phoneNumber === 'number'){
            phoneNumber = phoneNumber.toString()
        }

        const response = await findOrCreateContact(email, phoneNumber);

        return res.status(200).json(response)
    } catch (error ){
        console.log("error",error)
        res.status(500).json({error: "Internal Server Error"})

    }
})

app.get('/', (req,res) => {
    res.send("hi there")
})


app.listen(PORT, () => {
    console.log("server listening on port: ", PORT)
})


