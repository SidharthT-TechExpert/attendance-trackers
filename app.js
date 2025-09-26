const express = require('express')
const app = express()
const path = require('path')
require('dotenv').config()

app.set('view engine','ejs')
app.set('views',[
    path.join(__dirname, 'views')
])

app.listen(process.env.PORT, () => {
    console.log('Server Running')
})