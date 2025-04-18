import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))// this will set the limit of json data incoming
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

const app=express()

export {app}