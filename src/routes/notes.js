const express = require("express")
const { PrismaClient } = require("@prisma/client")
const authenticateToken = require("../middleware/auth")

const router = express.Router()
const prisma = new PrismaClient()

async function hasBoardAccess(userId, boardId) {
  const access = await prisma.boardUser.findUnique({
    where: {
      userId_boardId: {
        userId,
        boardId
      }
    }
  })

  return access !== null
}

// GET all notes
router.get("/", authenticateToken, async (req, res) => {
  try {
    const boardId = Number(req.query.boardId)
    const userId = Number(req.user.sub)

    if (!boardId) {
      return res.status(400).json({
        message: "boardId is required"
      })
    }

    const allowed = await hasBoardAccess(userId, boardId)

    if (!allowed) {
      return res.status(403).json({
        message: "You do not have access to this board"
      })
    }

    const notes = await prisma.note.findMany({
      where: {
        boardId
      }
    })

    res.json(notes)
  } catch (error) {
    res.status(500).json({
      message: "Could not get notes"
    })
  }
})

// POST new note
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { text, color, positionX, positionY, boardId } = req.body

    if (!text || !boardId) {
      return res.status(400).json({
        message: "Text and boardId are required"
      })
    }

    const userId = Number(req.user.sub)

    const allowed = await hasBoardAccess(userId, boardId)

    if (!allowed) {
    return res.status(403).json({
        message: "You do not have access to this board"
    })
    }

    const note = await prisma.note.create({
      data: {
        text,
        color: color || "#fff59d",
        positionX: positionX || 0,
        positionY: positionY || 0,
        boardId
      }
    })

    res.status(201).json(note)
  } catch (error) {
    res.status(500).json({
      message: "Could not create note"
    })
  }
})

// PATCH note
// PATCH note
router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const userId = Number(req.user.sub)

    const oldNote = await prisma.note.findUnique({
      where: { id }
    })

    if (!oldNote) {
      return res.status(404).json({
        message: "Note not found"
      })
    }

    const allowed = await hasBoardAccess(userId, oldNote.boardId)

    if (!allowed) {
      return res.status(403).json({
        message: "You do not have access to this board"
      })
    }

    const note = await prisma.note.update({
      where: { id },
      data: req.body
    })

    res.json(note)
  } catch (error) {
    res.status(500).json({
      message: "Could not update note"
    })
  }
})

// DELETE note
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const userId = Number(req.user.sub)

    const note = await prisma.note.findUnique({
      where: { id }
    })

    if (!note) {
      return res.status(404).json({
        message: "Note not found"
      })
    }

    const allowed = await hasBoardAccess(userId, note.boardId)

    if (!allowed) {
      return res.status(403).json({
        message: "You do not have access to this board"
      })
    }

    await prisma.note.delete({
      where: { id }
    })

    res.status(204).send()
  } catch (error) {
    res.status(500).json({
      message: "Could not delete note"
    })
  }
})

module.exports = router