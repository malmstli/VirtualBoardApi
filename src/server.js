const express = require("express")
const cors = require("cors")
require("dotenv").config()

const notesRouter = require("./routes/notes")

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.json({
    message: "Virtual Board API is running"
  })
})

app.use("/notes", notesRouter)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})