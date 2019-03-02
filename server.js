const express = require('express')
// const joi = require('joi')
const app = express()

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static('./public'))

app.set('view', './views')
app.set('view engine', 'pug')

const portNum = 3000

app.get('*', (req, res) => {
    res.status(404).send('Invalid URL')
})
app.post('*', (req, res) => {
    res.status(404).send('Invalid URL')
})

app.listen(portNum)
console.log("Server is listening on port", portNum)
